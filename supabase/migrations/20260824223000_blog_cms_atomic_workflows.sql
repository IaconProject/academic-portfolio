-- Atomic editorial workflows for the advanced Blog CMS.
-- These functions run as the authenticated caller and therefore continue to
-- honor the role-aware RLS policies introduced by the base blog migration.

CREATE OR REPLACE FUNCTION public.current_blog_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.capture_blog_post_revision()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  next_revision INTEGER;
  summary TEXT;
  snapshot JSONB;
BEGIN
  SELECT coalesce(max(revision.revision_number), 0) + 1
  INTO next_revision
  FROM public.blog_post_revisions AS revision
  WHERE revision.post_id = OLD.id;

  summary := left(
    coalesce(
      nullif(current_setting('app.blog_change_summary', TRUE), ''),
      'Otomatik sürüm'
    ),
    500
  );

  snapshot := (to_jsonb(OLD) - 'search_vector') || jsonb_build_object(
    '_tag_ids',
    coalesce(
      (
        SELECT jsonb_agg(link.tag_id ORDER BY link.tag_id)
        FROM public.blog_post_tags AS link
        WHERE link.post_id = OLD.id
      ),
      '[]'::JSONB
    ),
    '_sources',
    coalesce(
      (
        SELECT jsonb_agg(to_jsonb(source) ORDER BY source.sort_order, source.id)
        FROM public.blog_post_sources AS source
        WHERE source.post_id = OLD.id
      ),
      '[]'::JSONB
    )
  );

  INSERT INTO public.blog_post_revisions (
    post_id,
    revision_number,
    snapshot,
    change_summary,
    created_by
  )
  VALUES (
    OLD.id,
    next_revision,
    snapshot,
    summary,
    auth.uid()
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_blog_post(payload JSONB)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  target_id UUID;
  requested_status public.blog_post_status;
  source_item JSONB;
  actor_role public.blog_role;
BEGIN
  IF payload IS NULL OR jsonb_typeof(payload) <> 'object' THEN
    RAISE EXCEPTION 'Post payload must be a JSON object' USING ERRCODE = '22023';
  END IF;

  actor_role := public.current_blog_role();
  IF actor_role IS NULL OR actor_role = 'viewer' THEN
    RAISE EXCEPTION 'Editorial membership required' USING ERRCODE = '42501';
  END IF;

  target_id := nullif(payload->>'id', '')::UUID;
  requested_status := coalesce(
    nullif(payload->>'status', '')::public.blog_post_status,
    'draft'::public.blog_post_status
  );

  IF target_id IS NULL THEN
    INSERT INTO public.blog_posts (
      slug,
      locale,
      title,
      subtitle,
      excerpt,
      content_json,
      content_html,
      content_text,
      table_of_contents,
      status,
      author_id,
      author_name,
      category_id,
      series_id,
      series_order,
      cover_asset_id,
      cover_image_url,
      cover_image_alt,
      canonical_url,
      seo_title,
      seo_description,
      focus_keyword,
      related_keywords,
      is_featured,
      is_pinned,
      sort_order,
      allow_indexing,
      word_count,
      reading_minutes,
      published_at,
      scheduled_for,
      archived_at
    )
    VALUES (
      payload->>'slug',
      coalesce(nullif(payload->>'locale', ''), 'tr'),
      payload->>'title',
      coalesce(payload->>'subtitle', ''),
      coalesce(payload->>'excerpt', ''),
      coalesce(payload->'content_json', '{"type":"doc","content":[]}'::JSONB),
      coalesce(payload->>'content_html', ''),
      coalesce(payload->>'content_text', ''),
      coalesce(payload->'table_of_contents', '[]'::JSONB),
      requested_status,
      public.current_blog_user_id(),
      coalesce(nullif(payload->>'author_name', ''), 'Muhammed Akan'),
      nullif(payload->>'category_id', '')::UUID,
      nullif(payload->>'series_id', '')::UUID,
      nullif(payload->>'series_order', '')::INTEGER,
      nullif(payload->>'cover_asset_id', '')::UUID,
      coalesce(payload->>'cover_image_url', ''),
      coalesce(payload->>'cover_image_alt', ''),
      nullif(payload->>'canonical_url', ''),
      nullif(payload->>'seo_title', ''),
      nullif(payload->>'seo_description', ''),
      nullif(payload->>'focus_keyword', ''),
      ARRAY(
        SELECT jsonb_array_elements_text(
          coalesce(payload->'related_keywords', '[]'::JSONB)
        )
      ),
      coalesce((payload->>'is_featured')::BOOLEAN, FALSE),
      coalesce((payload->>'is_pinned')::BOOLEAN, FALSE),
      coalesce((payload->>'sort_order')::INTEGER, 0),
      coalesce((payload->>'allow_indexing')::BOOLEAN, TRUE),
      coalesce((payload->>'word_count')::INTEGER, 0),
      greatest(1, coalesce((payload->>'reading_minutes')::INTEGER, 1)),
      CASE
        WHEN requested_status = 'published'
          THEN coalesce(nullif(payload->>'published_at', '')::TIMESTAMPTZ, NOW())
        ELSE nullif(payload->>'published_at', '')::TIMESTAMPTZ
      END,
      CASE
        WHEN requested_status = 'scheduled'
          THEN nullif(payload->>'scheduled_for', '')::TIMESTAMPTZ
        ELSE NULL
      END,
      CASE WHEN requested_status = 'archived' THEN NOW() ELSE NULL END
    )
    RETURNING id INTO target_id;
  ELSE
    PERFORM set_config(
      'app.blog_change_summary',
      left(coalesce(nullif(payload->>'change_summary', ''), 'İçerik güncellendi'), 500),
      TRUE
    );

    UPDATE public.blog_posts
    SET
      slug = payload->>'slug',
      locale = coalesce(nullif(payload->>'locale', ''), 'tr'),
      title = payload->>'title',
      subtitle = coalesce(payload->>'subtitle', ''),
      excerpt = coalesce(payload->>'excerpt', ''),
      content_json = coalesce(payload->'content_json', content_json),
      content_html = coalesce(payload->>'content_html', ''),
      content_text = coalesce(payload->>'content_text', ''),
      table_of_contents = coalesce(payload->'table_of_contents', '[]'::JSONB),
      status = requested_status,
      author_name = coalesce(nullif(payload->>'author_name', ''), author_name),
      category_id = nullif(payload->>'category_id', '')::UUID,
      series_id = nullif(payload->>'series_id', '')::UUID,
      series_order = nullif(payload->>'series_order', '')::INTEGER,
      cover_asset_id = nullif(payload->>'cover_asset_id', '')::UUID,
      cover_image_url = coalesce(payload->>'cover_image_url', ''),
      cover_image_alt = coalesce(payload->>'cover_image_alt', ''),
      canonical_url = nullif(payload->>'canonical_url', ''),
      seo_title = nullif(payload->>'seo_title', ''),
      seo_description = nullif(payload->>'seo_description', ''),
      focus_keyword = nullif(payload->>'focus_keyword', ''),
      related_keywords = ARRAY(
        SELECT jsonb_array_elements_text(
          coalesce(payload->'related_keywords', '[]'::JSONB)
        )
      ),
      is_featured = coalesce((payload->>'is_featured')::BOOLEAN, FALSE),
      is_pinned = coalesce((payload->>'is_pinned')::BOOLEAN, FALSE),
      sort_order = coalesce((payload->>'sort_order')::INTEGER, 0),
      allow_indexing = coalesce((payload->>'allow_indexing')::BOOLEAN, TRUE),
      word_count = coalesce((payload->>'word_count')::INTEGER, 0),
      reading_minutes = greatest(1, coalesce((payload->>'reading_minutes')::INTEGER, 1)),
      published_at = CASE
        WHEN requested_status = 'published'
          THEN coalesce(
            nullif(payload->>'published_at', '')::TIMESTAMPTZ,
            published_at,
            NOW()
          )
        ELSE nullif(payload->>'published_at', '')::TIMESTAMPTZ
      END,
      scheduled_for = CASE
        WHEN requested_status = 'scheduled'
          THEN nullif(payload->>'scheduled_for', '')::TIMESTAMPTZ
        ELSE NULL
      END,
      archived_at = CASE
        WHEN requested_status = 'archived' THEN coalesce(archived_at, NOW())
        ELSE NULL
      END
    WHERE id = target_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Blog post not found or not editable' USING ERRCODE = '42501';
    END IF;
  END IF;

  DELETE FROM public.blog_post_tags WHERE post_id = target_id;
  INSERT INTO public.blog_post_tags (post_id, tag_id)
  SELECT target_id, value::UUID
  FROM jsonb_array_elements_text(coalesce(payload->'tag_ids', '[]'::JSONB))
  ON CONFLICT DO NOTHING;

  DELETE FROM public.blog_post_sources WHERE post_id = target_id;
  FOR source_item IN
    SELECT value
    FROM jsonb_array_elements(coalesce(payload->'sources', '[]'::JSONB))
  LOOP
    INSERT INTO public.blog_post_sources (
      post_id,
      citation_key,
      title,
      authors,
      publisher,
      publication_year,
      url,
      doi,
      accessed_at,
      sort_order
    )
    VALUES (
      target_id,
      coalesce(nullif(source_item->>'citation_key', ''), gen_random_uuid()::TEXT),
      source_item->>'title',
      ARRAY(
        SELECT jsonb_array_elements_text(
          coalesce(source_item->'authors', '[]'::JSONB)
        )
      ),
      coalesce(source_item->>'publisher', ''),
      nullif(source_item->>'publication_year', '')::SMALLINT,
      nullif(source_item->>'url', ''),
      nullif(source_item->>'doi', ''),
      nullif(source_item->>'accessed_at', '')::DATE,
      coalesce((source_item->>'sort_order')::INTEGER, 0)
    );
  END LOOP;

  RETURN target_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.restore_blog_post_revision(revision_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  revision_row public.blog_post_revisions%ROWTYPE;
  source_item JSONB;
  snapshot JSONB;
BEGIN
  SELECT * INTO revision_row
  FROM public.blog_post_revisions
  WHERE id = revision_id;

  IF NOT FOUND OR NOT public.can_manage_blog_post(revision_row.post_id) THEN
    RAISE EXCEPTION 'Revision not found or not editable' USING ERRCODE = '42501';
  END IF;

  snapshot := revision_row.snapshot;
  PERFORM set_config(
    'app.blog_change_summary',
    'Sürüm ' || revision_row.revision_number || ' geri yüklenmeden önceki durum',
    TRUE
  );

  UPDATE public.blog_posts
  SET
    slug = snapshot->>'slug',
    locale = snapshot->>'locale',
    title = snapshot->>'title',
    subtitle = coalesce(snapshot->>'subtitle', ''),
    excerpt = coalesce(snapshot->>'excerpt', ''),
    content_json = snapshot->'content_json',
    content_html = coalesce(snapshot->>'content_html', ''),
    content_text = coalesce(snapshot->>'content_text', ''),
    table_of_contents = coalesce(snapshot->'table_of_contents', '[]'::JSONB),
    status = (snapshot->>'status')::public.blog_post_status,
    author_name = coalesce(snapshot->>'author_name', author_name),
    category_id = nullif(snapshot->>'category_id', '')::UUID,
    series_id = nullif(snapshot->>'series_id', '')::UUID,
    series_order = nullif(snapshot->>'series_order', '')::INTEGER,
    cover_asset_id = nullif(snapshot->>'cover_asset_id', '')::UUID,
    cover_image_url = coalesce(snapshot->>'cover_image_url', ''),
    cover_image_alt = coalesce(snapshot->>'cover_image_alt', ''),
    canonical_url = nullif(snapshot->>'canonical_url', ''),
    seo_title = nullif(snapshot->>'seo_title', ''),
    seo_description = nullif(snapshot->>'seo_description', ''),
    focus_keyword = nullif(snapshot->>'focus_keyword', ''),
    related_keywords = ARRAY(
      SELECT jsonb_array_elements_text(
        coalesce(snapshot->'related_keywords', '[]'::JSONB)
      )
    ),
    is_featured = coalesce((snapshot->>'is_featured')::BOOLEAN, FALSE),
    is_pinned = coalesce((snapshot->>'is_pinned')::BOOLEAN, FALSE),
    sort_order = coalesce((snapshot->>'sort_order')::INTEGER, 0),
    allow_indexing = coalesce((snapshot->>'allow_indexing')::BOOLEAN, TRUE),
    word_count = coalesce((snapshot->>'word_count')::INTEGER, 0),
    reading_minutes = greatest(1, coalesce((snapshot->>'reading_minutes')::INTEGER, 1)),
    published_at = nullif(snapshot->>'published_at', '')::TIMESTAMPTZ,
    scheduled_for = nullif(snapshot->>'scheduled_for', '')::TIMESTAMPTZ,
    archived_at = nullif(snapshot->>'archived_at', '')::TIMESTAMPTZ
  WHERE id = revision_row.post_id;

  IF snapshot ? '_tag_ids' THEN
    DELETE FROM public.blog_post_tags WHERE post_id = revision_row.post_id;
    INSERT INTO public.blog_post_tags (post_id, tag_id)
    SELECT revision_row.post_id, value::UUID
    FROM jsonb_array_elements_text(snapshot->'_tag_ids')
    ON CONFLICT DO NOTHING;
  END IF;

  IF snapshot ? '_sources' THEN
    DELETE FROM public.blog_post_sources WHERE post_id = revision_row.post_id;
    FOR source_item IN SELECT value FROM jsonb_array_elements(snapshot->'_sources')
    LOOP
      INSERT INTO public.blog_post_sources (
        post_id,
        citation_key,
        title,
        authors,
        publisher,
        publication_year,
        url,
        doi,
        accessed_at,
        sort_order
      )
      VALUES (
        revision_row.post_id,
        source_item->>'citation_key',
        source_item->>'title',
        ARRAY(
          SELECT jsonb_array_elements_text(
            coalesce(source_item->'authors', '[]'::JSONB)
          )
        ),
        coalesce(source_item->>'publisher', ''),
        nullif(source_item->>'publication_year', '')::SMALLINT,
        nullif(source_item->>'url', ''),
        nullif(source_item->>'doi', ''),
        nullif(source_item->>'accessed_at', '')::DATE,
        coalesce((source_item->>'sort_order')::INTEGER, 0)
      );
    END LOOP;
  END IF;

  RETURN revision_row.post_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_blog_home_sections(
  sections JSONB,
  change_summary TEXT DEFAULT 'Ana sayfa düzeni güncellendi'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  section_item JSONB;
  section_id UUID;
  retained_ids UUID[] := ARRAY[]::UUID[];
  current_snapshot JSONB;
  result JSONB;
BEGIN
  IF NOT public.is_blog_editor() THEN
    RAISE EXCEPTION 'Editor role required' USING ERRCODE = '42501';
  END IF;
  IF sections IS NULL OR jsonb_typeof(sections) <> 'array' OR jsonb_array_length(sections) = 0 THEN
    RAISE EXCEPTION 'At least one home section is required' USING ERRCODE = '22023';
  END IF;

  SELECT coalesce(jsonb_agg(to_jsonb(section) ORDER BY section.sort_order), '[]'::JSONB)
  INTO current_snapshot
  FROM public.blog_home_sections AS section;

  INSERT INTO public.blog_home_revisions (snapshot, change_summary, created_by)
  VALUES (
    current_snapshot,
    left(coalesce(nullif(change_summary, ''), 'Ana sayfa düzeni güncellendi'), 500),
    public.current_blog_user_id()
  );

  FOR section_item IN SELECT value FROM jsonb_array_elements(sections)
  LOOP
    section_id := coalesce(nullif(section_item->>'id', '')::UUID, gen_random_uuid());
    retained_ids := array_append(retained_ids, section_id);

    INSERT INTO public.blog_home_sections (
      id,
      section_type,
      internal_name,
      heading,
      subheading,
      is_enabled,
      sort_order,
      config,
      updated_by
    )
    VALUES (
      section_id,
      section_item->>'section_type',
      coalesce(nullif(section_item->>'internal_name', ''), section_item->>'section_type'),
      coalesce(section_item->>'heading', ''),
      coalesce(section_item->>'subheading', ''),
      coalesce((section_item->>'is_enabled')::BOOLEAN, TRUE),
      coalesce((section_item->>'sort_order')::INTEGER, 0),
      coalesce(section_item->'config', '{}'::JSONB),
      public.current_blog_user_id()
    )
    ON CONFLICT (id) DO UPDATE SET
      section_type = EXCLUDED.section_type,
      internal_name = EXCLUDED.internal_name,
      heading = EXCLUDED.heading,
      subheading = EXCLUDED.subheading,
      is_enabled = EXCLUDED.is_enabled,
      sort_order = EXCLUDED.sort_order,
      config = EXCLUDED.config,
      updated_by = public.current_blog_user_id();
  END LOOP;

  DELETE FROM public.blog_home_sections
  WHERE NOT (id = ANY(retained_ids));

  SELECT coalesce(jsonb_agg(to_jsonb(section) ORDER BY section.sort_order), '[]'::JSONB)
  INTO result
  FROM public.blog_home_sections AS section;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.restore_blog_home_revision(revision_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  saved_snapshot JSONB;
  current_snapshot JSONB;
  section_item JSONB;
BEGIN
  IF NOT public.is_blog_editor() THEN
    RAISE EXCEPTION 'Editor role required' USING ERRCODE = '42501';
  END IF;

  SELECT revision.snapshot INTO saved_snapshot
  FROM public.blog_home_revisions AS revision
  WHERE revision.id = revision_id;
  IF saved_snapshot IS NULL THEN
    RAISE EXCEPTION 'Home revision not found' USING ERRCODE = '22023';
  END IF;

  SELECT coalesce(jsonb_agg(to_jsonb(section) ORDER BY section.sort_order), '[]'::JSONB)
  INTO current_snapshot
  FROM public.blog_home_sections AS section;
  INSERT INTO public.blog_home_revisions (snapshot, change_summary, created_by)
  VALUES (
    current_snapshot,
    'Geri yüklemeden önceki ana sayfa düzeni',
    public.current_blog_user_id()
  );

  DELETE FROM public.blog_home_sections;
  FOR section_item IN SELECT value FROM jsonb_array_elements(saved_snapshot)
  LOOP
    INSERT INTO public.blog_home_sections (
      id,
      section_type,
      internal_name,
      heading,
      subheading,
      is_enabled,
      sort_order,
      config,
      updated_by,
      created_at
    )
    VALUES (
      (section_item->>'id')::UUID,
      section_item->>'section_type',
      section_item->>'internal_name',
      coalesce(section_item->>'heading', ''),
      coalesce(section_item->>'subheading', ''),
      coalesce((section_item->>'is_enabled')::BOOLEAN, TRUE),
      coalesce((section_item->>'sort_order')::INTEGER, 0),
      coalesce(section_item->'config', '{}'::JSONB),
      public.current_blog_user_id(),
      coalesce(nullif(section_item->>'created_at', '')::TIMESTAMPTZ, NOW())
    );
  END LOOP;

  RETURN saved_snapshot;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_blog_navigation(items JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  nav_item JSONB;
  nav_id UUID;
  retained_ids UUID[] := ARRAY[]::UUID[];
  result JSONB;
BEGIN
  IF NOT public.is_blog_editor() THEN
    RAISE EXCEPTION 'Editor role required' USING ERRCODE = '42501';
  END IF;
  IF items IS NULL OR jsonb_typeof(items) <> 'array' THEN
    RAISE EXCEPTION 'Navigation payload must be an array' USING ERRCODE = '22023';
  END IF;

  FOR nav_item IN SELECT value FROM jsonb_array_elements(items)
  LOOP
    nav_id := coalesce(nullif(nav_item->>'id', '')::UUID, gen_random_uuid());
    retained_ids := array_append(retained_ids, nav_id);
    INSERT INTO public.blog_navigation_items (
      id,
      location,
      parent_id,
      label,
      href,
      open_in_new_tab,
      is_visible,
      sort_order
    )
    VALUES (
      nav_id,
      nav_item->>'location',
      NULL,
      nav_item->>'label',
      nav_item->>'href',
      coalesce((nav_item->>'open_in_new_tab')::BOOLEAN, FALSE),
      coalesce((nav_item->>'is_visible')::BOOLEAN, TRUE),
      coalesce((nav_item->>'sort_order')::INTEGER, 0)
    )
    ON CONFLICT (id) DO UPDATE SET
      location = EXCLUDED.location,
      parent_id = NULL,
      label = EXCLUDED.label,
      href = EXCLUDED.href,
      open_in_new_tab = EXCLUDED.open_in_new_tab,
      is_visible = EXCLUDED.is_visible,
      sort_order = EXCLUDED.sort_order;
  END LOOP;

  IF cardinality(retained_ids) = 0 THEN
    DELETE FROM public.blog_navigation_items;
  ELSE
    DELETE FROM public.blog_navigation_items
    WHERE NOT (id = ANY(retained_ids));
  END IF;

  SELECT coalesce(jsonb_agg(to_jsonb(item) ORDER BY item.location, item.sort_order), '[]'::JSONB)
  INTO result
  FROM public.blog_navigation_items AS item;
  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.save_blog_post(JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_blog_user_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.restore_blog_post_revision(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_blog_home_sections(JSONB, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.restore_blog_home_revision(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_blog_navigation(JSONB) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.save_blog_post(JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_blog_user_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.restore_blog_post_revision(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.save_blog_home_sections(JSONB, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.restore_blog_home_revision(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.save_blog_navigation(JSONB) TO authenticated, service_role;

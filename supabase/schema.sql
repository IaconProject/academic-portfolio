-- Academic Portfolio Supabase Schema Setup

-- 1. Create Public Profile Table
CREATE TABLE IF NOT EXISTS public.public_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  bio TEXT NOT NULL,
  avatar_url TEXT NOT NULL,
  email TEXT NOT NULL,
  location TEXT,
  cv_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Education Table
CREATE TABLE IF NOT EXISTS public.education (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  degree TEXT NOT NULL,
  institution TEXT NOT NULL,
  years TEXT NOT NULL,
  status TEXT DEFAULT 'Tamamlandı',
  description TEXT,
  is_current BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create Publications Table
CREATE TABLE IF NOT EXISTS public.publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  publisher TEXT,
  year TEXT NOT NULL,
  url TEXT,
  doi TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create Projects Table
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  years TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create Conferences Table
CREATE TABLE IF NOT EXISTS public.conferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  event_name TEXT NOT NULL,
  location TEXT,
  year TEXT NOT NULL,
  role TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create Activities Table
CREATE TABLE IF NOT EXISTS public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  organization TEXT NOT NULL,
  years TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Create References Table
CREATE TABLE IF NOT EXISTS public.references_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  institution TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  is_featured BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Create Social Links Table
CREATE TABLE IF NOT EXISTS public.social_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,
  url TEXT NOT NULL,
  icon_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Create SEO Settings Table
CREATE TABLE IF NOT EXISTS public.seo_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meta_title TEXT NOT NULL,
  meta_description TEXT NOT NULL,
  keywords TEXT NOT NULL,
  og_image_url TEXT NOT NULL,
  canonical_url TEXT NOT NULL,
  author_name TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Create Admin Credentials Table
CREATE TABLE IF NOT EXISTS public.admin_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  password TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. Enable Row Level Security (RLS) & Full Write Policies
ALTER TABLE public.public_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.references_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_credentials ENABLE ROW LEVEL SECURITY;

-- Read & Write Policies for All Public Tables
DROP POLICY IF EXISTS "Allow public read profile" ON public.public_profile;
DROP POLICY IF EXISTS "Allow write public_profile" ON public.public_profile;
CREATE POLICY "Allow write public_profile" ON public.public_profile FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read education" ON public.education;
DROP POLICY IF EXISTS "Allow write education" ON public.education;
CREATE POLICY "Allow write education" ON public.education FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read publications" ON public.publications;
DROP POLICY IF EXISTS "Allow write publications" ON public.publications;
CREATE POLICY "Allow write publications" ON public.publications FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read projects" ON public.projects;
DROP POLICY IF EXISTS "Allow write projects" ON public.projects;
CREATE POLICY "Allow write projects" ON public.projects FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read conferences" ON public.conferences;
DROP POLICY IF EXISTS "Allow write conferences" ON public.conferences;
CREATE POLICY "Allow write conferences" ON public.conferences FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read activities" ON public.activities;
DROP POLICY IF EXISTS "Allow write activities" ON public.activities;
CREATE POLICY "Allow write activities" ON public.activities FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read references" ON public.references_list;
DROP POLICY IF EXISTS "Allow write references_list" ON public.references_list;
CREATE POLICY "Allow write references_list" ON public.references_list FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read social_links" ON public.social_links;
DROP POLICY IF EXISTS "Allow write social_links" ON public.social_links;
CREATE POLICY "Allow write social_links" ON public.social_links FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read seo_settings" ON public.seo_settings;
DROP POLICY IF EXISTS "Allow write seo_settings" ON public.seo_settings;
CREATE POLICY "Allow write seo_settings" ON public.seo_settings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow write admin_credentials" ON public.admin_credentials;
CREATE POLICY "Allow write admin_credentials" ON public.admin_credentials FOR ALL USING (true) WITH CHECK (true);

-- 12. Storage Bucket Creation for Profile Avatars
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Read Avatars" ON storage.objects;
DROP POLICY IF EXISTS "Admin Upload Avatars" ON storage.objects;
CREATE POLICY "Public Read Avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Admin Upload Avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars');

-- 13. Visitor Logs Table for Traffic & Device Analytics
CREATE TABLE IF NOT EXISTS public.visitor_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address TEXT NOT NULL,
  country TEXT DEFAULT 'Bilinmiyor',
  country_code TEXT DEFAULT 'TR',
  city TEXT DEFAULT 'Bilinmiyor',
  region TEXT DEFAULT 'Bilinmiyor',
  isp TEXT DEFAULT 'Bilinmiyor',
  is_mobile_network BOOLEAN DEFAULT false,
  device_type TEXT DEFAULT 'Desktop',
  device_brand TEXT DEFAULT 'Bilinmiyor',
  device_model TEXT DEFAULT 'Bilinmiyor',
  os_name TEXT DEFAULT 'Bilinmiyor',
  os_version TEXT DEFAULT '',
  browser_name TEXT DEFAULT 'Bilinmiyor',
  browser_version TEXT DEFAULT '',
  screen_resolution TEXT DEFAULT '',
  language TEXT DEFAULT '',
  page_path TEXT DEFAULT '/',
  referrer TEXT DEFAULT '',
  user_agent TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.visitor_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public insert visitor_logs" ON public.visitor_logs;
DROP POLICY IF EXISTS "Allow public select visitor_logs" ON public.visitor_logs;
DROP POLICY IF EXISTS "Allow admin delete visitor_logs" ON public.visitor_logs;
CREATE POLICY "Allow public insert visitor_logs" ON public.visitor_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public select visitor_logs" ON public.visitor_logs FOR SELECT USING (true);
CREATE POLICY "Allow admin delete visitor_logs" ON public.visitor_logs FOR DELETE USING (true);

-- 14. Contact Messages Table for Visitor Inquiries
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  phone TEXT DEFAULT '',
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  is_starred BOOLEAN DEFAULT false,
  ip_address TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow write contact_messages" ON public.contact_messages;
CREATE POLICY "Allow write contact_messages" ON public.contact_messages FOR ALL USING (true) WITH CHECK (true);


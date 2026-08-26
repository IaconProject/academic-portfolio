import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { BlogAuthError, requireBlogIdentity } from '@/lib/blog-auth';
import { validateAdminSession } from '@/lib/auth-helpers';
import {
  hasSupabaseServiceRole,
  isServerSupabaseConfigured,
  serverSupabase,
} from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const IMAGE_MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
};

const BLOG_MIME_EXTENSIONS: Record<string, string> = {
  ...IMAGE_MIME_EXTENSIONS,
  'image/gif': 'gif',
  'application/pdf': 'pdf',
};

function textField(formData: FormData, key: string, maxLength: number) {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function safeOriginalName(file: File) {
  return file.name
    .normalize('NFKC')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .slice(0, 180) || 'media';
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const fileValue = formData.get('file');
    const purposeValue = formData.get('purpose');
    const purpose =
      purposeValue === 'blog'
        ? 'blog'
        : purposeValue === 'content'
          ? 'content'
          : 'avatar';

    if (!(fileValue instanceof File) || fileValue.size === 0) {
      return NextResponse.json({ error: 'Dosya seçilmedi.' }, { status: 400 });
    }

    let blogUserId: string | null = null;
    if (purpose === 'blog') {
      try {
        const identity = await requireBlogIdentity({
          roles: ['owner', 'editor', 'author'],
        });
        blogUserId = identity.userId;
      } catch (error) {
        if (error instanceof BlogAuthError) {
          return NextResponse.json(
            { error: error.message, code: error.code },
            { status: error.status }
          );
        }
        throw error;
      }
    } else if (!validateAdminSession(request)) {
      return NextResponse.json(
        { error: 'Yetkisiz erişim. Lütfen giriş yapın.' },
        { status: 401 }
      );
    }

    const allowedTypes =
      purpose === 'blog' ? BLOG_MIME_EXTENSIONS : IMAGE_MIME_EXTENSIONS;
    if (!allowedTypes[fileValue.type]) {
      return NextResponse.json(
        {
          error:
            purpose === 'blog'
              ? 'JPEG, PNG, WebP, AVIF, GIF veya PDF yükleyebilirsiniz.'
              : 'Yalnız JPEG, PNG, WebP veya AVIF görseller yüklenebilir.',
        },
        { status: 415 }
      );
    }

    const maxBytes = purpose === 'blog' ? 15 * 1024 * 1024 : 5 * 1024 * 1024;
    if (fileValue.size > maxBytes) {
      return NextResponse.json(
        {
          error: `Dosya boyutu ${purpose === 'blog' ? '15 MB' : '5 MB'} sınırını aşamaz.`,
        },
        { status: 413 }
      );
    }

    if (purpose === 'blog' && (!hasSupabaseServiceRole || !serverSupabase)) {
      return NextResponse.json(
        { error: 'Blog medya deposu kullanılamıyor.' },
        { status: 503 }
      );
    }

    if (isServerSupabaseConfigured && serverSupabase) {
      const extension = allowedTypes[fileValue.type];
      const now = new Date();
      const bucket = purpose === 'blog' ? 'blog-media' : 'avatars';
      const objectPath =
        purpose === 'blog'
          ? `${blogUserId}/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${randomUUID()}.${extension}`
          : `${purpose === 'content' ? 'content' : 'avatars'}/${purpose}-${Date.now()}-${randomUUID()}.${extension}`;

      const buffer = Buffer.from(await fileValue.arrayBuffer());
      const { error: uploadError } = await serverSupabase.storage
        .from(bucket)
        .upload(objectPath, buffer, {
          contentType: fileValue.type,
          cacheControl: '31536000',
          upsert: false,
        });

      if (uploadError) {
        console.error('[upload] storage write failed', {
          bucket,
          message: uploadError.message,
        });
        return NextResponse.json(
          { error: 'Dosya kalıcı depoya yüklenemedi.' },
          { status: 502 }
        );
      }

      const { data: publicUrlData } = serverSupabase.storage
        .from(bucket)
        .getPublicUrl(objectPath);
      const publicUrl = publicUrlData.publicUrl;

      if (purpose === 'blog') {
        const { data: asset, error: assetError } = await serverSupabase
          .from('blog_assets')
          .insert({
            bucket_id: bucket,
            object_path: objectPath,
            original_name: safeOriginalName(fileValue),
            mime_type: fileValue.type,
            byte_size: fileValue.size,
            alt_text: textField(formData, 'altText', 500),
            caption: textField(formData, 'caption', 1000),
            credit: textField(formData, 'credit', 500),
            uploaded_by: blogUserId,
          })
          .select(
            'id, object_path, original_name, mime_type, byte_size, alt_text, caption, credit, created_at'
          )
          .single();

        if (assetError || !asset) {
          await serverSupabase.storage.from(bucket).remove([objectPath]);
          console.error('[upload] asset metadata write failed', {
            message: assetError?.message,
          });
          return NextResponse.json(
            { error: 'Medya bilgileri kaydedilemedi.' },
            { status: 502 }
          );
        }

        return NextResponse.json(
          {
            success: true,
            url: publicUrl,
            asset: {
              id: asset.id,
              objectPath: asset.object_path,
              originalName: asset.original_name,
              mimeType: asset.mime_type,
              byteSize: asset.byte_size,
              altText: asset.alt_text,
              caption: asset.caption,
              credit: asset.credit,
              createdAt: asset.created_at,
              url: publicUrl,
            },
          },
          { headers: { 'Cache-Control': 'no-store' } }
        );
      }

      return NextResponse.json({ url: publicUrl });
    }

    if (process.env.NODE_ENV === 'production' || purpose !== 'avatar') {
      return NextResponse.json(
        { error: 'Kalıcı görsel depolama bağlantısı kullanılamıyor.' },
        { status: 503 }
      );
    }

    // Development-only avatar fallback. Blog and long-form content must always
    // use persistent storage so published URLs cannot disappear on redeploy.
    const dataUrl = `data:${fileValue.type};base64,${Buffer.from(
      await fileValue.arrayBuffer()
    ).toString('base64')}`;
    return NextResponse.json({ url: dataUrl });
  } catch (error) {
    console.error('[upload] unexpected failure', error);
    return NextResponse.json(
      { error: 'Dosya yüklenirken beklenmeyen bir hata oluştu.' },
      { status: 500 }
    );
  }
}

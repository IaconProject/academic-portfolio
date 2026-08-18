import { NextResponse } from 'next/server';
import {
  serverSupabase as supabase,
  isServerSupabaseConfigured as isSupabaseConfigured,
} from '@/lib/supabase/server';
import { validateAdminSession } from '@/lib/auth-helpers';

export async function POST(request: Request) {
  try {
    if (!validateAdminSession(request)) {
      return NextResponse.json({ error: 'Yetkisiz erişim. Lütfen giriş yapın.' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Dosya seçilmedi.' }, { status: 400 });
    }
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type)) {
      return NextResponse.json({ error: 'Yalnız JPEG, PNG, WebP veya AVIF görseller yüklenebilir.' }, { status: 415 });
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Görsel boyutu 5 MB sınırını aşamaz.' }, { status: 413 });
    }

    if (isSupabaseConfigured && supabase) {
      const fileExt = file.name.split('.').pop();
      const fileName = `avatar-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, buffer, {
          contentType: file.type,
          upsert: true,
        });

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        if (urlData?.publicUrl) {
          return NextResponse.json({ url: urlData.publicUrl });
        }
      }
    }

    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Kalıcı görsel depolama bağlantısı kullanılamıyor.' },
        { status: 503 }
      );
    }

    // Development-only fallback.
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const dataUrl = `data:${file.type};base64,${base64}`;

    return NextResponse.json({ url: dataUrl });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

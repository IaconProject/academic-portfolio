'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { ImagePlus, Loader2, Trash2, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { readSessionItem } from '@/lib/admin-session-storage';
import { isOptimizableContentImage } from '@/lib/content-images';

interface ContentImageUploaderProps {
  value: string;
  alt: string;
  onChange: (url: string) => void;
}

export function ContentImageUploader({
  value,
  alt,
  onChange,
}: ContentImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function upload(file?: File) {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type)) {
      toast.error('JPEG, PNG, WebP veya AVIF biçiminde bir görsel seçin.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Kapak görseli 5 MB sınırını aşamaz.');
      return;
    }

    setUploading(true);
    try {
      const body = new FormData();
      body.append('file', file);
      body.append('purpose', 'content');
      const token = readSessionItem('admin_token') || '';
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: token ? { 'X-Admin-Token': token } : {},
        body,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.url) {
        throw new Error(payload?.error || 'Kapak görseli yüklenemedi.');
      }
      onChange(payload.url);
      toast.success('Kapak görseli yüklendi. Kaydettiğinizde içerikle eşleşecek.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Kapak görseli yüklenemedi.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="md:col-span-2 rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-900">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex aspect-[16/9] w-full shrink-0 items-center justify-center overflow-hidden rounded-xl border border-stone-200 bg-stone-100 sm:w-48 dark:border-stone-700 dark:bg-stone-800">
          {isOptimizableContentImage(value) ? (
            <Image src={value} alt={alt || 'Kapak görseli önizlemesi'} fill sizes="(max-width: 640px) 100vw, 192px" className="object-cover" unoptimized />
          ) : (
            <div className="flex flex-col items-center gap-1.5 px-3 text-center text-[10px] text-stone-500">
              <ImagePlus className="h-7 w-7 text-stone-400" />
              {value && <span>Bu alan adı için önizleme kapalı</span>}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black uppercase tracking-wider text-stone-700 dark:text-stone-300">Kapak görseli</p>
          <p className="mt-1 text-xs leading-5 text-stone-500">16:9 oranında, en az 1200×675 px; JPEG, PNG, WebP veya AVIF. Görsel kullanırsanız açıklayıcı alt metin zorunludur.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading} className="seo-secondary-button">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? 'Yükleniyor…' : 'Görsel yükle'}
            </button>
            {value && (
              <button type="button" onClick={() => onChange('')} disabled={uploading} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-50 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
                <Trash2 className="h-4 w-4" /> Kaldır
              </button>
            )}
          </div>
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(event) => upload(event.target.files?.[0])} className="hidden" />
        </div>
      </div>
    </div>
  );
}

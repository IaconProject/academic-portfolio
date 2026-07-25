'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { Upload, Camera, Trash2, CheckCircle, AlertCircle, RefreshCw, User } from 'lucide-react';
import { uploadAvatarImage } from '@/lib/cms-store';

interface ImageUploaderProps {
  currentUrl: string;
  onImageUploaded: (url: string) => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ currentUrl, onImageUploaded }) => {
  const [previewUrl, setPreviewUrl] = useState<string>(currentUrl);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Lütfen geçerli bir resim dosyası seçin (PNG, JPG, WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Resim boyutu 5 MB\'dan küçük olmalıdır.');
      return;
    }

    setErrorMsg(null);
    setIsUploading(true);
    setUploadSuccess(false);

    try {
      const uploadedUrl = await uploadAvatarImage(file);
      setPreviewUrl(uploadedUrl);
      onImageUploaded(uploadedUrl);
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3500);
    } catch (err) {
      console.error('Avatar upload error:', err);
      setErrorMsg('Resim yüklenirken hata oluştu.');
    } finally {
      setIsUploading(false);
    }
  };

  const triggerSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="bg-stone-50 dark:bg-stone-800/80 p-6 rounded-2xl border border-stone-200/80 dark:border-stone-700 shadow-sm transition-colors duration-300">
      <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-4 flex items-center gap-2">
        <User className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        <span>Profil Fotoğrafı Yükle & Değiştir</span>
      </label>

      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* Avatar Preview */}
        <div className="relative w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-white dark:border-stone-700 shadow-md shrink-0 bg-stone-200 dark:bg-stone-900 flex items-center justify-center">
          {previewUrl ? (
            <Image
              src={previewUrl}
              alt="Profil Önizleme"
              fill
              sizes="128px"
              className="object-cover rounded-full"
              unoptimized
            />
          ) : (
            <div className="w-full h-full bg-stone-200 dark:bg-stone-800 text-stone-400 flex items-center justify-center">
              <Camera className="w-8 h-8 text-stone-400" />
            </div>
          )}

          {isUploading && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center text-white">
              <RefreshCw className="w-7 h-7 animate-spin text-white" />
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex-1 space-y-3 text-center sm:text-left">
          <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
            Akademik görünüm için dairesel kırpılan 1:1 oranında net vesikalık veya portre fotoğrafı yükleyin. PNG, JPG veya WEBP. Max 5MB.
          </p>

          <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
            <button
              type="button"
              onClick={triggerSelect}
              disabled={isUploading}
              className="inline-flex items-center gap-2 py-2.5 px-4 bg-stone-900 hover:bg-stone-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-stone-50 dark:text-stone-950 text-xs font-bold rounded-xl transition-all shadow-md disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              <span>Yeni Fotoğraf Seç</span>
            </button>

            {previewUrl && (
              <button
                type="button"
                onClick={() => {
                  setPreviewUrl('');
                  onImageUploaded('');
                }}
                className="inline-flex items-center gap-1.5 py-2.5 px-3.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-semibold rounded-xl border border-rose-200 dark:border-rose-900/50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Kaldır</span>
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          {uploadSuccess && (
            <div className="inline-flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 rounded-lg shadow-sm">
              <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Fotoğraf başarıyla yüklendi.</span>
            </div>
          )}

          {errorMsg && (
            <div className="inline-flex items-center gap-1.5 text-xs text-rose-700 dark:text-rose-400 font-semibold bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 px-3 py-1.5 rounded-lg shadow-sm">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

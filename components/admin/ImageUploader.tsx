'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { Upload, Camera, Trash2, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
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
      setErrorMsg('Lütfen sadece resim dosyası seçin (PNG, JPG, WEBP).');
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
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (err) {
      console.error('Avatar upload failed:', err);
      setErrorMsg('Resim yüklenirken hata oluştu.');
    } finally {
      setIsUploading(false);
    }
  };

  const triggerSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
      <label className="block text-sm font-semibold text-slate-800 mb-3">
        Profil Fotoğrafı Yükle & Değiştir
      </label>

      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* Avatar Preview */}
        <div className="relative w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-white shadow-md ring-2 ring-slate-200 shrink-0">
          {previewUrl ? (
            <Image
              src={previewUrl}
              alt="Profil Önizleme"
              fill
              sizes="128px"
              className="object-cover"
              unoptimized={previewUrl.startsWith('data:')}
            />
          ) : (
            <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-400">
              <Camera className="w-8 h-8" />
            </div>
          )}

          {isUploading && (
            <div className="absolute inset-0 bg-academic-navy/60 backdrop-blur-xs flex items-center justify-center text-white">
              <RefreshCw className="w-6 h-6 animate-spin" />
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex-1 space-y-3 text-center sm:text-left">
          <p className="text-xs text-slate-500 leading-relaxed">
            Kare oranlı (1:1), en az 400x400 piksel çözünürlükte net bir vesikalık veya akademik fotoğraf önerilir. PNG, JPG veya WEBP. Max 5MB.
          </p>

          <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
            <button
              type="button"
              onClick={triggerSelect}
              disabled={isUploading}
              className="inline-flex items-center gap-2 py-2 px-4 bg-academic-navy text-white text-xs font-semibold rounded-lg hover:bg-academic-blue transition-colors shadow-sm disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Yeni Fotoğraf Seç</span>
            </button>

            {previewUrl && (
              <button
                type="button"
                onClick={() => {
                  setPreviewUrl('');
                  onImageUploaded('');
                }}
                className="inline-flex items-center gap-1.5 py-2 px-3 bg-red-50 text-red-600 hover:bg-red-100 text-xs font-semibold rounded-lg transition-colors"
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
            <div className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-semibold bg-emerald-50 px-3 py-1 rounded-md">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Fotoğraf başarıyla yüklendi ve güncellendi.</span>
            </div>
          )}

          {errorMsg && (
            <div className="inline-flex items-center gap-1.5 text-xs text-red-600 font-semibold bg-red-50 px-3 py-1 rounded-md">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

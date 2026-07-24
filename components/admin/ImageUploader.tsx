'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { Upload, Camera, Trash2, CheckCircle, AlertCircle, RefreshCw, Sparkles } from 'lucide-react';
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
    <div className="bg-slate-900/90 p-6 rounded-2xl border border-cyan-500/30 shadow-xl backdrop-blur-md">
      <label className="block text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 mb-4 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-cyan-400" />
        <span>PROFİL FOTOĞRAFI YÜKLE & DEĞİŞTİR // AVATAR_NODE</span>
      </label>

      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* Avatar Preview */}
        <div className="relative w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-cyan-500/40 shadow-xl ring-2 ring-cyan-500/20 shrink-0 bg-slate-950 flex items-center justify-center">
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
            <div className="w-full h-full bg-slate-950 text-slate-500 flex items-center justify-center">
              <Camera className="w-8 h-8 text-cyan-500/60" />
            </div>
          )}

          {isUploading && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center text-cyan-400">
              <RefreshCw className="w-7 h-7 animate-spin text-cyan-400" />
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex-1 space-y-3 text-center sm:text-left">
          <p className="text-xs font-mono text-slate-400 leading-relaxed">
            Akademik görünüm için dairesel kırpılan 1:1 oranında net vesikalık veya portre fotoğrafı yükleyin. PNG, JPG veya WEBP. Max 5MB.
          </p>

          <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
            <button
              type="button"
              onClick={triggerSelect}
              disabled={isUploading}
              className="inline-flex items-center gap-2 py-2.5 px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono text-xs font-extrabold rounded-xl transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              <span>YENİ FOTOĞRAFA GÖZ AT</span>
            </button>

            {previewUrl && (
              <button
                type="button"
                onClick={() => {
                  setPreviewUrl('');
                  onImageUploaded('');
                }}
                className="inline-flex items-center gap-1.5 py-2.5 px-3.5 bg-red-950/40 hover:bg-red-900/60 text-red-300 font-mono text-xs font-semibold rounded-xl border border-red-500/30 transition-colors"
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
            <div className="inline-flex items-center gap-1.5 text-xs font-mono text-emerald-400 font-semibold bg-emerald-950/60 border border-emerald-500/40 px-3 py-1.5 rounded-lg shadow-sm">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>Fotoğraf başarıyla yüklendi ve senkronize edildi.</span>
            </div>
          )}

          {errorMsg && (
            <div className="inline-flex items-center gap-1.5 text-xs font-mono text-red-400 font-semibold bg-red-950/60 border border-red-500/40 px-3 py-1.5 rounded-lg shadow-sm">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

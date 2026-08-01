'use client';

import React, { useState } from 'react';
import { Profile } from '@/lib/types';
import { ImageUploader } from './ImageUploader';
import { Save, User, Mail, MapPin, Briefcase } from 'lucide-react';

interface ProfileFormProps {
  profile: Profile;
  onSave: (updatedProfile: Profile) => void;
}

export const ProfileForm: React.FC<ProfileFormProps> = ({ profile, onSave }) => {
  const [formData, setFormData] = useState<Profile>(profile);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleAvatarUpdate = (url: string) => {
    const updated = { ...formData, avatarUrl: url };
    setFormData(updated);
    onSave(updated);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white/90 dark:bg-stone-900/90 p-6 md:p-8 rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-md backdrop-blur-md transition-colors duration-300">
      <div className="border-b border-stone-100 dark:border-stone-800 pb-4 mb-6">
        <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100 tracking-tight flex items-center gap-2">
          <User className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          <span>Profil & Biyografi Ayarları</span>
        </h2>
        <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
          Ad soyad ana sayfanın tek H1 başlığıdır; akademik unvan hemen
          altında görünür ve kişi yapılandırılmış verisini besler. Bu alanlar
          kaydedildiğinde ana sayfa, mobil profil alanı ve SEO entity bilgisi
          birlikte güncellenir.
        </p>
      </div>

      {/* Avatar Image Uploader */}
      <ImageUploader
        currentUrl={formData.avatarUrl}
        onImageUploaded={handleAvatarUpdate}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-2">
            Ad Soyad (Ana sayfa H1)
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              required
              value={formData.fullName}
              onChange={(e) => setFormData((prev) => ({ ...prev, fullName: e.target.value }))}
              className="w-full pl-11 pr-4 py-3 bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-stone-100 focus:border-stone-900 dark:focus:border-amber-400 focus:ring-1 focus:ring-stone-900 dark:focus:ring-amber-400 outline-none transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-2">
            Akademik Unvan / Görev (H1 alt başlığı)
          </label>
          <div className="relative">
            <Briefcase className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              className="w-full pl-11 pr-4 py-3 bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-stone-100 focus:border-stone-900 dark:focus:border-amber-400 focus:ring-1 focus:ring-stone-900 dark:focus:ring-amber-400 outline-none transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-2">
            E-posta Adresi
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
              className="w-full pl-11 pr-4 py-3 bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-stone-100 focus:border-stone-900 dark:focus:border-amber-400 focus:ring-1 focus:ring-stone-900 dark:focus:ring-amber-400 outline-none transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-2">
            Konum / Şehir
          </label>
          <div className="relative">
            <MapPin className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={formData.location || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
              className="w-full pl-11 pr-4 py-3 bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-stone-100 focus:border-stone-900 dark:focus:border-amber-400 focus:ring-1 focus:ring-stone-900 dark:focus:ring-amber-400 outline-none transition-colors"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-2">
          Biyografi & Özgeçmiş Özeti
        </label>
        <textarea
          rows={5}
          required
          value={formData.bio}
          onChange={(e) => setFormData((prev) => ({ ...prev, bio: e.target.value }))}
          className="w-full p-4 bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-stone-100 leading-relaxed focus:border-stone-900 dark:focus:border-amber-400 focus:ring-1 focus:ring-stone-900 dark:focus:ring-amber-400 outline-none transition-colors"
        />
      </div>

      <div className="pt-4 border-t border-stone-100 dark:border-stone-800 flex justify-end">
        <button
          type="submit"
          className="inline-flex items-center gap-2 py-3 px-6 bg-stone-900 hover:bg-stone-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-stone-50 dark:text-stone-950 font-bold rounded-xl transition-all shadow-md active:scale-95 text-sm"
        >
          <Save className="w-4 h-4" />
          <span>Profil Değişikliklerini Kaydet</span>
        </button>
      </div>
    </form>
  );
};

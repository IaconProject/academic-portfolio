'use client';

import React, { useState } from 'react';
import { Profile } from '@/lib/types';
import { ImageUploader } from './ImageUploader';
import { Save, User, Mail, MapPin, Briefcase, FileText } from 'lucide-react';

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

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 md:p-8 rounded-xl border border-slate-200 shadow-sm">
      <div className="border-b border-slate-100 pb-4 mb-6">
        <h2 className="text-xl font-serif font-bold text-academic-navy">
          Profil & Biyografi Ayarları
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Kişisel bilgilerinizi, akademik unvanınızı, profil fotoğrafınızı ve biyografinizi buradan güncelleyebilirsiniz.
        </p>
      </div>

      {/* Avatar Image Uploader */}
      <ImageUploader
        currentUrl={formData.avatarUrl}
        onImageUploaded={(url) => setFormData((prev) => ({ ...prev, avatarUrl: url }))}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            Ad Soyad
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              required
              value={formData.fullName}
              onChange={(e) => setFormData((prev) => ({ ...prev, fullName: e.target.value }))}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-academic-navy focus:border-academic-navy outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            Akademik Unvan / Görev
          </label>
          <div className="relative">
            <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-academic-navy focus:border-academic-navy outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            E-posta Adresi
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-academic-navy focus:border-academic-navy outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            Konum / Şehir
          </label>
          <div className="relative">
            <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-academic-navy focus:border-academic-navy outline-none"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
          Biyografi & Özgeçmiş Özeti
        </label>
        <textarea
          rows={5}
          required
          value={formData.bio}
          onChange={(e) => setFormData((prev) => ({ ...prev, bio: e.target.value }))}
          className="w-full p-4 bg-slate-50 border border-slate-300 rounded-lg text-sm leading-relaxed focus:ring-2 focus:ring-academic-navy focus:border-academic-navy outline-none"
        />
      </div>

      <div className="pt-4 border-t border-slate-100 flex justify-end">
        <button
          type="submit"
          className="inline-flex items-center gap-2 py-3 px-6 bg-academic-navy text-white font-bold rounded-lg hover:bg-academic-blue transition-all shadow-md active:scale-95 text-sm"
        >
          <Save className="w-4 h-4" />
          <span>Profil Değişikliklerini Kaydet</span>
        </button>
      </div>
    </form>
  );
};

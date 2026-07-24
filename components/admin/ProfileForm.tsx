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
    <form onSubmit={handleSubmit} className="space-y-6 bg-slate-950/80 p-6 md:p-8 rounded-2xl border border-cyan-500/20 shadow-2xl backdrop-blur-md">
      <div className="border-b border-slate-800 pb-4 mb-6">
        <h2 className="text-xl font-mono font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
          <User className="w-5 h-5 text-cyan-400" />
          <span>Profil & Biyografi Ayarları</span>
        </h2>
        <p className="text-xs font-mono text-slate-400 mt-1">
          Kişisel akademik kimliğinizi, unvanınızı, profil fotoğrafınızı ve özet biyografinizi güncelleyin.
        </p>
      </div>

      {/* Avatar Image Uploader */}
      <ImageUploader
        currentUrl={formData.avatarUrl}
        onImageUploaded={handleAvatarUpdate}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 mb-2">
            Ad Soyad
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
            <input
              type="text"
              required
              value={formData.fullName}
              onChange={(e) => setFormData((prev) => ({ ...prev, fullName: e.target.value }))}
              className="w-full pl-11 pr-4 py-3 bg-slate-900/90 border border-slate-800 rounded-xl text-sm font-mono text-slate-100 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 mb-2">
            Akademik Unvan / Görev
          </label>
          <div className="relative">
            <Briefcase className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              className="w-full pl-11 pr-4 py-3 bg-slate-900/90 border border-slate-800 rounded-xl text-sm font-mono text-slate-100 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 mb-2">
            E-posta Adresi
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
              className="w-full pl-11 pr-4 py-3 bg-slate-900/90 border border-slate-800 rounded-xl text-sm font-mono text-slate-100 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 mb-2">
            Konum / Şehir
          </label>
          <div className="relative">
            <MapPin className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
              className="w-full pl-11 pr-4 py-3 bg-slate-900/90 border border-slate-800 rounded-xl text-sm font-mono text-slate-100 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none transition-colors"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 mb-2">
          Biyografi & Özgeçmiş Özeti
        </label>
        <textarea
          rows={5}
          required
          value={formData.bio}
          onChange={(e) => setFormData((prev) => ({ ...prev, bio: e.target.value }))}
          className="w-full p-4 bg-slate-900/90 border border-slate-800 rounded-xl text-sm font-mono text-slate-100 leading-relaxed focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none transition-colors"
        />
      </div>

      <div className="pt-4 border-t border-slate-800 flex justify-end">
        <button
          type="submit"
          className="inline-flex items-center gap-2 py-3.5 px-6 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-extrabold rounded-xl transition-all shadow-lg shadow-cyan-500/20 active:scale-95 text-sm"
        >
          <Save className="w-4 h-4" />
          <span>PROFİL DEĞİŞİKLİKLERİNİ KAYDET</span>
        </button>
      </div>
    </form>
  );
};

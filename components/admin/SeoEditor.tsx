'use client';

import React, { useState } from 'react';
import { SeoSettings } from '@/lib/types';
import { Save, Search, Globe, Image as ImageIcon, Share2 } from 'lucide-react';

interface SeoEditorProps {
  seoSettings: SeoSettings;
  onSave: (updatedSeo: SeoSettings) => void;
}

export const SeoEditor: React.FC<SeoEditorProps> = ({ seoSettings, onSave }) => {
  const [formData, setFormData] = useState<SeoSettings>(seoSettings);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-slate-950/80 p-6 md:p-8 rounded-2xl border border-cyan-500/20 shadow-2xl backdrop-blur-md">
      <div className="border-b border-slate-800 pb-4 mb-6">
        <h2 className="text-xl font-mono font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
          <Search className="w-5 h-5 text-cyan-400" />
          <span>SEO & Sosyal Medya (OpenGraph) Ayarları</span>
        </h2>
        <p className="text-xs font-mono text-slate-400 mt-1">
          Google arama motoru optimizasyonu, meta etiketler ve sosyal medya paylaşım kartlarını yönetin.
        </p>
      </div>

      {/* Google Snippet Live Preview */}
      <div className="p-5 bg-slate-900/90 rounded-xl border border-cyan-500/30 space-y-1.5 font-mono">
        <div className="text-xs text-slate-400 flex items-center gap-1.5 mb-1">
          <Search className="w-3.5 h-3.5 text-cyan-400" />
          <span>GOOGLE // ARAMA PREVIEW</span>
        </div>
        <div className="text-xs text-emerald-400 font-mono tracking-tight truncate">
          {formData.canonicalUrl || 'https://muhammedakan.vercel.app'}
        </div>
        <div className="text-base font-serif font-bold text-cyan-300 hover:underline cursor-pointer">
          {formData.metaTitle || 'MUHAMMED AKAN | Akademik Portfolyo'}
        </div>
        <div className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
          {formData.metaDescription || 'Akademik portfolyo ve araştırmalar...'}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 mb-2">
            Meta Başlık (SEO Title)
          </label>
          <input
            type="text"
            required
            value={formData.metaTitle}
            onChange={(e) => setFormData((prev) => ({ ...prev, metaTitle: e.target.value }))}
            className="w-full px-4 py-3 bg-slate-900/90 border border-slate-800 rounded-xl text-sm font-mono text-slate-100 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 mb-2">
            Meta Açıklama (SEO Description)
          </label>
          <textarea
            rows={3}
            required
            value={formData.metaDescription}
            onChange={(e) => setFormData((prev) => ({ ...prev, metaDescription: e.target.value }))}
            className="w-full p-4 bg-slate-900/90 border border-slate-800 rounded-xl text-sm font-mono text-slate-100 leading-relaxed focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 mb-2">
            Anahtar Kelimeler (Virgülle Ayrılmış Keywords)
          </label>
          <input
            type="text"
            value={formData.keywords}
            onChange={(e) => setFormData((prev) => ({ ...prev, keywords: e.target.value }))}
            className="w-full px-4 py-3 bg-slate-900/90 border border-slate-800 rounded-xl text-sm font-mono text-slate-100 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 mb-2">
            OpenGraph Paylaşım Görseli URL (OG Image)
          </label>
          <input
            type="url"
            value={formData.ogImageUrl}
            onChange={(e) => setFormData((prev) => ({ ...prev, ogImageUrl: e.target.value }))}
            className="w-full px-4 py-3 bg-slate-900/90 border border-slate-800 rounded-xl text-sm font-mono text-slate-100 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none transition-colors"
          />
        </div>
      </div>

      <div className="pt-4 border-t border-slate-800 flex justify-end">
        <button
          type="submit"
          className="inline-flex items-center gap-2 py-3.5 px-6 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-extrabold rounded-xl transition-all shadow-lg shadow-cyan-500/20 active:scale-95 text-sm"
        >
          <Save className="w-4 h-4" />
          <span>SEO AYARLARINI KAYDET</span>
        </button>
      </div>
    </form>
  );
};

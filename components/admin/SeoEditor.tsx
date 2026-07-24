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
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 md:p-8 rounded-xl border border-slate-200 shadow-sm">
      <div className="border-b border-slate-100 pb-4 mb-6">
        <h2 className="text-xl font-serif font-bold text-academic-navy">
          SEO & Sosyal Medya (OpenGraph) Ayarları
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Google arama motoru optimizasyonu, meta etiketler ve sosyal medya (LinkedIn, WhatsApp, X) paylaşım görsellerini buradan yönetebilirsiniz.
        </p>
      </div>

      {/* Google Snippet Live Preview */}
      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
        <div className="text-xs text-slate-500 flex items-center gap-1">
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <span>Google Arama Önizlemesi</span>
        </div>
        <div className="text-xs text-emerald-700 font-mono tracking-tight truncate">
          {formData.canonicalUrl || 'https://muhammedakan.vercel.app'}
        </div>
        <div className="text-base font-serif font-bold text-blue-800 hover:underline cursor-pointer">
          {formData.metaTitle || 'MUHAMMED AKAN | Akademik Portfolyo'}
        </div>
        <div className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
          {formData.metaDescription || 'Akademik portfolyo ve araştırmalar...'}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            Meta Başlık (SEO Title)
          </label>
          <input
            type="text"
            required
            value={formData.metaTitle}
            onChange={(e) => setFormData((prev) => ({ ...prev, metaTitle: e.target.value }))}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-academic-navy focus:border-academic-navy outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            Meta Açıklama (SEO Description)
          </label>
          <textarea
            rows={3}
            required
            value={formData.metaDescription}
            onChange={(e) => setFormData((prev) => ({ ...prev, metaDescription: e.target.value }))}
            className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-sm leading-relaxed focus:ring-2 focus:ring-academic-navy focus:border-academic-navy outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            Anahtar Kelimeler (Virgülle Ayrılmış Keywords)
          </label>
          <input
            type="text"
            value={formData.keywords}
            onChange={(e) => setFormData((prev) => ({ ...prev, keywords: e.target.value }))}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-academic-navy focus:border-academic-navy outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            OpenGraph Paylaşım Görseli URL (OG Image)
          </label>
          <input
            type="url"
            value={formData.ogImageUrl}
            onChange={(e) => setFormData((prev) => ({ ...prev, ogImageUrl: e.target.value }))}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-academic-navy focus:border-academic-navy outline-none"
          />
        </div>
      </div>

      <div className="pt-4 border-t border-slate-100 flex justify-end">
        <button
          type="submit"
          className="inline-flex items-center gap-2 py-3 px-6 bg-academic-navy text-white font-bold rounded-lg hover:bg-academic-blue transition-all shadow-md active:scale-95 text-sm"
        >
          <Save className="w-4 h-4" />
          <span>SEO Ayarlarını Kaydet</span>
        </button>
      </div>
    </form>
  );
};

'use client';

import React, { useState } from 'react';
import { SeoSettings } from '@/lib/types';
import { Save, Search, Globe, Image as ImageIcon } from 'lucide-react';

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
    <form onSubmit={handleSubmit} className="space-y-6 bg-white/90 dark:bg-stone-900/90 p-6 md:p-8 rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-md backdrop-blur-md transition-colors duration-300">
      <div className="border-b border-stone-100 dark:border-stone-800 pb-4 mb-6">
        <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100 tracking-tight flex items-center gap-2">
          <Search className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          <span>SEO & Arama Motoru Ayarları</span>
        </h2>
        <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
          Google arama sonuçlarında görünen meta başlık, açıklama ve sosyal kart önizleme ayarlarını yapılandırın.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-2">
            Sayfa Meta Başlığı (Meta Title)
          </label>
          <input
            type="text"
            required
            value={formData.metaTitle}
            onChange={(e) => setFormData((prev) => ({ ...prev, metaTitle: e.target.value }))}
            className="w-full px-4 py-3 bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-stone-100 focus:border-stone-900 dark:focus:border-amber-400 outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-2">
            Meta Açıklama (Meta Description)
          </label>
          <textarea
            rows={3}
            required
            value={formData.metaDescription}
            onChange={(e) => setFormData((prev) => ({ ...prev, metaDescription: e.target.value }))}
            className="w-full p-4 bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-stone-100 focus:border-stone-900 dark:focus:border-amber-400 outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-2">
            Anahtar Kelimeler (Virgülle Ayırın)
          </label>
          <input
            type="text"
            required
            value={formData.keywords}
            onChange={(e) => setFormData((prev) => ({ ...prev, keywords: e.target.value }))}
            className="w-full px-4 py-3 bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-stone-100 focus:border-stone-900 dark:focus:border-amber-400 outline-none"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-2">
              Canonical URL
            </label>
            <div className="relative">
              <Globe className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
              <input
                type="url"
                required
                value={formData.canonicalUrl}
                onChange={(e) => setFormData((prev) => ({ ...prev, canonicalUrl: e.target.value }))}
                className="w-full pl-11 pr-4 py-3 bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-stone-100 focus:border-stone-900 dark:focus:border-amber-400 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-2">
              Yazar Adı
            </label>
            <input
              type="text"
              required
              value={formData.authorName}
              onChange={(e) => setFormData((prev) => ({ ...prev, authorName: e.target.value }))}
              className="w-full px-4 py-3 bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-stone-100 focus:border-stone-900 dark:focus:border-amber-400 outline-none"
            />
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-stone-100 dark:border-stone-800 flex justify-end">
        <button
          type="submit"
          className="inline-flex items-center gap-2 py-3 px-6 bg-stone-900 hover:bg-stone-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-stone-50 dark:text-stone-950 font-bold rounded-xl transition-all shadow-md active:scale-95 text-sm"
        >
          <Save className="w-4 h-4" />
          <span>SEO Ayarlarını Kaydet</span>
        </button>
      </div>
    </form>
  );
};

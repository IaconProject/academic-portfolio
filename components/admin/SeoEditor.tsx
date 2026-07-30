'use client';

import React, { useState } from 'react';
import { SeoSettings } from '@/lib/types';
import { Save, Search, Globe, Image as ImageIcon, ExternalLink, Sparkles } from 'lucide-react';

interface SeoEditorProps {
  seoSettings: SeoSettings;
  onSave: (updatedSeo: SeoSettings) => void;
}

export const SeoEditor: React.FC<SeoEditorProps> = ({ seoSettings, onSave }) => {
  const [formData, setFormData] = useState<SeoSettings>(seoSettings);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const titleLength = formData.metaTitle?.length || 0;
  const descLength = formData.metaDescription?.length || 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white/90 dark:bg-stone-900/90 p-6 md:p-8 rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-md backdrop-blur-md transition-colors duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-4 mb-6 gap-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100 tracking-tight flex items-center gap-2">
            <Search className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <span>SEO & Arama Motoru Yönetim Paneli</span>
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Google arama sonuçları ve sosyal medya kartları için meta verilerinizi yapılandırın ve canlı önizleyin.
          </p>
        </div>

        <div className="flex items-center bg-stone-100 dark:bg-stone-800 p-1 rounded-xl self-start md:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('editor')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'editor'
                ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-sm'
                : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            Düzenleyici
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'preview'
                ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-sm'
                : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Canlı Önizleme</span>
          </button>
        </div>
      </div>

      {activeTab === 'editor' ? (
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                Sayfa Meta Başlığı (Meta Title)
              </label>
              <span className={`text-[11px] font-mono font-medium ${titleLength > 60 ? 'text-amber-600 dark:text-amber-400' : 'text-stone-400'}`}>
                {titleLength} / 60 karakter
              </span>
            </div>
            <input
              type="text"
              required
              value={formData.metaTitle}
              onChange={(e) => setFormData((prev) => ({ ...prev, metaTitle: e.target.value }))}
              placeholder="Örn: Muhammed Akan | Akademik Portfolyo"
              className="w-full px-4 py-3 bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-stone-100 focus:border-stone-900 dark:focus:border-amber-400 outline-none"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                Meta Açıklama (Meta Description)
              </label>
              <span className={`text-[11px] font-mono font-medium ${descLength > 160 ? 'text-amber-600 dark:text-amber-400' : 'text-stone-400'}`}>
                {descLength} / 160 karakter
              </span>
            </div>
            <textarea
              rows={3}
              required
              value={formData.metaDescription}
              onChange={(e) => setFormData((prev) => ({ ...prev, metaDescription: e.target.value }))}
              placeholder="Arama sonuçlarında siteniz altında görüntülenecek özet metin..."
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
              placeholder="İslam Hukuku, Blok Zincir, Yapay Zeka Etiği, Akademik Portfolyo"
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
                  placeholder="https://muhammedakan.com"
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
                placeholder="Muhammed Akan"
                className="w-full px-4 py-3 bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-stone-100 focus:border-stone-900 dark:focus:border-amber-400 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-2">
              Sosyal Kart Görsel URL (OpenGraph Image)
            </label>
            <div className="relative">
              <ImageIcon className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={formData.ogImageUrl || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, ogImageUrl: e.target.value }))}
                placeholder="https://muhammedakan.com/og-image.jpg"
                className="w-full pl-11 pr-4 py-3 bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-stone-100 focus:border-stone-900 dark:focus:border-amber-400 outline-none"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-fadeIn">
          {/* Google Search Live Preview */}
          <div className="p-5 bg-stone-50 dark:bg-stone-800/60 rounded-xl border border-stone-200 dark:border-stone-700 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block mb-3">
              Google Arama Sonucu Önizlemesi
            </span>
            <div className="space-y-1 font-sans">
              <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 truncate">
                <Globe className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-500" />
                <span className="truncate">{formData.canonicalUrl || 'https://muhammedakan.com'}</span>
              </div>
              <h3 className="text-lg font-medium text-blue-700 dark:text-blue-400 hover:underline cursor-pointer truncate">
                {formData.metaTitle || 'Başlık Girilmedi'}
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-300 line-clamp-2 leading-relaxed">
                {formData.metaDescription || 'Açıklama girilmedi.'}
              </p>
            </div>
          </div>

          {/* Social Media Card Live Preview */}
          <div className="p-5 bg-stone-50 dark:bg-stone-800/60 rounded-xl border border-stone-200 dark:border-stone-700 space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block">
              Sosyal Medya Paylaşım Kartı Önizlemesi (OpenGraph / Twitter)
            </span>
            <div className="border border-stone-200 dark:border-stone-700 rounded-xl overflow-hidden bg-white dark:bg-stone-900 shadow-sm max-w-lg">
              {formData.ogImageUrl ? (
                <div className="h-44 bg-stone-200 dark:bg-stone-800 overflow-hidden relative">
                  <img
                    src={formData.ogImageUrl}
                    alt="OG Card Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
              ) : (
                <div className="h-32 bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-400 gap-2">
                  <ImageIcon className="w-6 h-6" />
                  <span className="text-xs">Özel Görsel URL'si Belirtilmedi</span>
                </div>
              )}
              <div className="p-4 space-y-1">
                <span className="text-[10px] uppercase font-semibold text-stone-400 tracking-wider block">
                  {new URL(formData.canonicalUrl || 'https://muhammedakan.com').hostname}
                </span>
                <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100 line-clamp-1">
                  {formData.metaTitle || 'Başlık'}
                </h4>
                <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-2">
                  {formData.metaDescription || 'Açıklama'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

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

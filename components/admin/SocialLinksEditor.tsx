'use client';

import React, { useState } from 'react';
import { SocialLink } from '@/lib/types';
import {
  Share2,
  Plus,
  Trash2,
  Save,
  Instagram,
  Linkedin,
  Github,
  Twitter,
  Youtube,
  Globe,
  FileText,
  BookOpen,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface SocialLinksEditorProps {
  socialLinks: SocialLink[];
  onSave: (updated: SocialLink[]) => void;
}

const PLATFORM_PRESETS = [
  { name: 'Instagram', icon: 'Instagram' },
  { name: 'LinkedIn', icon: 'Linkedin' },
  { name: 'X (Twitter)', icon: 'Twitter' },
  { name: 'YouTube', icon: 'Youtube' },
  { name: 'GitHub', icon: 'Github' },
  { name: 'ORCID', icon: 'FileText' },
  { name: 'Google Scholar', icon: 'BookOpen' },
  { name: 'ResearchGate', icon: 'Share2' },
  { name: 'Kişisel Web Sitesi', icon: 'Globe' },
];

export const SocialLinksEditor: React.FC<SocialLinksEditorProps> = ({
  socialLinks: initialLinks,
  onSave,
}) => {
  const [links, setLinks] = useState<SocialLink[]>(initialLinks || []);
  const [newPlatform, setNewPlatform] = useState<string>('Instagram');
  const [newUrl, setNewUrl] = useState<string>('');
  const [newIconName, setNewIconName] = useState<string>('Instagram');

  const handleAddLink = () => {
    if (!newUrl.trim()) {
      toast.error('Lütfen geçerli bir URL adresi girin.');
      return;
    }

    const newEntry: SocialLink = {
      id: `soc-${Date.now()}`,
      platform: newPlatform as any,
      url: newUrl.trim(),
      iconName: newIconName || newPlatform,
    };

    setLinks([...links, newEntry]);
    setNewUrl('');
    toast.success(`${newPlatform} hesabı listeye eklendi.`);
  };

  const handleDeleteLink = (id: string) => {
    setLinks(links.filter((l) => l.id !== id));
    toast.success('Sosyal medya hesabı silindi.');
  };

  const handleUpdateLink = (id: string, field: keyof SocialLink, value: string) => {
    setLinks(
      links.map((l) => (l.id === id ? { ...l, [field]: value } : l))
    );
  };

  const handleSaveAll = () => {
    onSave(links);
  };

  const renderIcon = (iconName: string, platform: string) => {
    const name = (iconName || platform).toLowerCase();
    if (name.includes('instagram')) return <Instagram className="w-4 h-4 text-pink-500" />;
    if (name.includes('linkedin')) return <Linkedin className="w-4 h-4 text-blue-400" />;
    if (name.includes('github')) return <Github className="w-4 h-4 text-slate-200" />;
    if (name.includes('twitter') || name.includes('x')) return <Twitter className="w-4 h-4 text-cyan-400" />;
    if (name.includes('youtube')) return <Youtube className="w-4 h-4 text-red-500" />;
    if (name.includes('orcid') || name.includes('filetext')) return <FileText className="w-4 h-4 text-emerald-400" />;
    if (name.includes('scholar') || name.includes('book')) return <BookOpen className="w-4 h-4 text-amber-400" />;
    if (name.includes('globe') || name.includes('site') || name.includes('web')) return <Globe className="w-4 h-4 text-cyan-300" />;
    return <Share2 className="w-4 h-4 text-cyan-400" />;
  };

  return (
    <div className="bg-slate-900/90 border border-cyan-500/30 p-6 rounded-2xl shadow-2xl backdrop-blur-md space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-cyan-500/20 pb-4">
        <div>
          <label className="block text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 mb-1 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>SOSYAL MEDYA & AKADEMİK PROFİLLER // SOCIAL_NODE</span>
          </label>
          <h2 className="text-xl font-bold font-sans text-white">Sosyal Medya Yönetimi</h2>
          <p className="text-xs font-mono text-slate-400 mt-1">
            Instagram, LinkedIn, X, YouTube, Academic hesaplarınızı ekleyin ve ziyaretçilerinizle paylaşın.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSaveAll}
          className="inline-flex items-center gap-2 py-2.5 px-5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono text-xs font-extrabold rounded-xl transition-all shadow-lg shadow-cyan-500/20"
        >
          <Save className="w-4 h-4" />
          <span>DEĞİŞİKLİKLERİ KAYDET</span>
        </button>
      </div>

      {/* Add New Link Card */}
      <div className="bg-slate-950/80 border border-cyan-500/20 p-4 rounded-xl space-y-4">
        <h3 className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-2">
          <Plus className="w-4 h-4 text-cyan-400" />
          <span>YENİ SOSYAL MEDYA HESABI EKLE</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Preset Selection */}
          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1">Platform Seçin</label>
            <select
              value={newPlatform}
              onChange={(e) => {
                const val = e.target.value;
                setNewPlatform(val);
                const matched = PLATFORM_PRESETS.find((p) => p.name === val);
                if (matched) setNewIconName(matched.icon);
              }}
              className="w-full bg-slate-900 border border-slate-700 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none"
            >
              {PLATFORM_PRESETS.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
              <option value="Diğer">Diğer / Özel Platform</option>
            </select>
          </div>

          {/* URL Input */}
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-mono text-slate-400 mb-1">Profil / Hesap URL Adresi</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="Örn: https://instagram.com/kullaniciadi"
                className="flex-1 bg-slate-900 border border-slate-700 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none placeholder-slate-500"
              />
              <button
                type="button"
                onClick={handleAddLink}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-mono text-xs font-extrabold rounded-xl shrink-0 transition-colors shadow-md"
              >
                Ekle
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Existing Social Links Table / List */}
      <div className="space-y-3">
        <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
          EKLENMİŞ SOSYAL MEDYA HESAPLARI ({links.length})
        </h3>

        {links.length === 0 ? (
          <div className="p-8 text-center bg-slate-950/60 border border-slate-800 rounded-xl text-slate-500 font-mono text-xs">
            Henüz eklenmiş bir sosyal medya hesabı yok. Yukarıdaki formdan ekleyebilirsiniz.
          </div>
        ) : (
          <div className="space-y-2.5">
            {links.map((link) => (
              <div
                key={link.id}
                className="bg-slate-950/90 border border-slate-800 hover:border-cyan-500/30 p-3.5 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 w-full sm:w-auto">
                  <div className="p-2 bg-slate-900 border border-slate-800 rounded-lg shrink-0">
                    {renderIcon(link.iconName, link.platform)}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1">
                    <input
                      type="text"
                      value={link.platform}
                      onChange={(e) => handleUpdateLink(link.id, 'platform', e.target.value)}
                      placeholder="Platform İsmi"
                      className="bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-lg px-2.5 py-1.5 text-xs font-mono text-cyan-300 font-bold focus:outline-none"
                    />

                    <input
                      type="text"
                      value={link.url}
                      onChange={(e) => handleUpdateLink(link.id, 'url', e.target.value)}
                      placeholder="https://..."
                      className="bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-300 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg border border-slate-800 transition-colors"
                    title="Önizle"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <button
                    type="button"
                    onClick={() => handleDeleteLink(link.id)}
                    className="p-2 bg-red-950/40 hover:bg-red-900 text-red-300 rounded-lg border border-red-500/30 transition-colors"
                    title="Sil"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

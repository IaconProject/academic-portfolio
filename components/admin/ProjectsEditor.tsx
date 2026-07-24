'use client';

import React, { useState } from 'react';
import { ProjectItem } from '@/lib/types';
import { Plus, Trash2, Edit2, Save, GitBranch, Tag, Link } from 'lucide-react';

interface ProjectsEditorProps {
  projects: ProjectItem[];
  onSave: (updated: ProjectItem[]) => void;
}

export const ProjectsEditor: React.FC<ProjectsEditorProps> = ({ projects: initialItems, onSave }) => {
  const [items, setItems] = useState<ProjectItem[]>(initialItems || []);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<Partial<ProjectItem>>({});
  const [tagsInput, setTagsInput] = useState<string>('');

  const startAdd = () => {
    setEditingId('new');
    setFormState({
      title: '',
      description: '',
      years: '',
      tags: [],
      url: '',
    });
    setTagsInput('');
  };

  const startEdit = (item: ProjectItem) => {
    setEditingId(item.id);
    setFormState({ ...item });
    setTagsInput((item.tags || []).join(', '));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormState({});
    setTagsInput('');
  };

  const handleSaveItem = () => {
    if (!formState.title || !formState.description || !formState.years) return;

    const parsedTags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    if (editingId === 'new') {
      const newItem: ProjectItem = {
        id: `proj-${Date.now()}`,
        title: formState.title || '',
        description: formState.description || '',
        years: formState.years || '',
        tags: parsedTags,
        url: formState.url || '#',
      };
      const updated = [...items, newItem];
      setItems(updated);
      onSave(updated);
    } else if (editingId) {
      const updated = items.map((item) =>
        item.id === editingId ? ({ ...item, ...formState, tags: parsedTags } as ProjectItem) : item
      );
      setItems(updated);
      onSave(updated);
    }
    cancelEdit();
  };

  const handleDelete = (id: string) => {
    const updated = items.filter((item) => item.id !== id);
    setItems(updated);
    onSave(updated);
  };

  return (
    <div className="bg-slate-950/80 p-6 md:p-8 rounded-2xl border border-cyan-500/20 shadow-2xl backdrop-blur-md space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-mono font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-cyan-400" />
            <span>Projeler & Araştırmalar Yönetimi</span>
          </h2>
          <p className="text-xs font-mono text-slate-400 mt-1">
            Yürüttüğünüz veya katkı sunduğunuz akademik projeleri, araştırmaları ve teknolojileri ekleyin.
          </p>
        </div>
        <button
          onClick={startAdd}
          disabled={editingId !== null}
          className="inline-flex items-center gap-1.5 py-2.5 px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-mono font-extrabold rounded-xl transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          <span>YENİ PROJE EKLE</span>
        </button>
      </div>

      {/* Editing Form */}
      {editingId && (
        <div className="p-5 bg-slate-900/90 border border-cyan-500/30 rounded-xl space-y-4 font-mono">
          <h3 className="text-xs font-mono font-bold uppercase text-cyan-400 border-b border-slate-800 pb-2">
            {editingId === 'new' ? '// YENİ PROJE KAYDI' : '// PROJE KAYDINI DÜZENLE'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase text-slate-300 mb-1">Proje / Araştırma Başlığı</label>
              <input
                type="text"
                placeholder="Örn: Akıllı Sözleşmeler ve İslami Hukuk Uyumu"
                value={formState.title || ''}
                onChange={(e) => setFormState({ ...formState, title: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-slate-100 focus:border-cyan-400 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-300 mb-1">Tarih / Yıllar</label>
              <input
                type="text"
                placeholder="Örn: 2022 - 2023"
                value={formState.years || ''}
                onChange={(e) => setFormState({ ...formState, years: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-slate-100 focus:border-cyan-400 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-300 mb-1">Proje Detay Bağlantısı (URL)</label>
              <input
                type="text"
                placeholder="Örn: https://github.com/..."
                value={formState.url || ''}
                onChange={(e) => setFormState({ ...formState, url: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-slate-100 focus:border-cyan-400 outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase text-slate-300 mb-1">Etiketler / Teknolojiler (Virgülle Ayırın)</label>
              <input
                type="text"
                placeholder="Örn: Blok Zincir, İslam Hukuku, Smart Contracts, Fintech"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-slate-100 focus:border-cyan-400 outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase text-slate-300 mb-1">Proje Açıklaması</label>
              <textarea
                rows={3}
                placeholder="Projenin amacı, yöntemi ve çıktıları hakkında açıklama yazın..."
                value={formState.description || ''}
                onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-slate-100 focus:border-cyan-400 outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={cancelEdit}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-semibold rounded-xl"
            >
              İptal
            </button>
            <button
              onClick={handleSaveItem}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-mono font-extrabold rounded-xl"
            >
              <Save className="w-3.5 h-3.5" />
              <span>KAYDET</span>
            </button>
          </div>
        </div>
      )}

      {/* Item List */}
      <div className="space-y-3 font-mono">
        {items.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/40 border border-slate-800 rounded-xl text-slate-500 text-xs">
            Henüz proje eklenmedi. Yukarıdaki butona tıklayarak yeni proje ekleyebilirsiniz.
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-xl hover:border-cyan-500/30 transition-colors space-y-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-100 text-sm">{item.title}</h4>
                    <span className="text-[10px] font-bold bg-cyan-950 text-cyan-400 px-2 py-0.5 border border-cyan-500/30 rounded">
                      {item.years}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">{item.description}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => startEdit(item)}
                    className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition-colors"
                    title="Düzenle"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-lg transition-colors"
                    title="Sil"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {item.tags && item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {item.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] bg-slate-950 text-slate-400 border border-slate-800 px-2 py-0.5 rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

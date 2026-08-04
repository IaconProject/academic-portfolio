'use client';

import React, { useState } from 'react';
import { ProjectItem } from '@/lib/types';
import { Plus, Trash2, Edit2, Save, GitBranch } from 'lucide-react';

interface ProjectsEditorProps {
  projects: ProjectItem[];
  onSave: (updatedProjects: ProjectItem[]) => void;
}

export const ProjectsEditor: React.FC<ProjectsEditorProps> = ({ projects, onSave }) => {
  const [items, setItems] = useState<ProjectItem[]>(projects);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<Partial<ProjectItem>>({});
  const [tagsInput, setTagsInput] = useState<string>('');

  const startAdd = () => {
    setEditingId('new');
    setFormState({
      title: '',
      description: '',
      years: new Date().getFullYear().toString(),
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
    if (!formState.title || !formState.years) return;

    const parsedTags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    if (editingId === 'new') {
      const newItem: ProjectItem = {
        id: `proj-${Date.now()}`,
        title: formState.title || '',
        description: formState.description || '',
        years: formState.years || '',
        tags: parsedTags,
        url: formState.url || '',
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
    <div className="admin-panel-card space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 dark:border-stone-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100 tracking-tight flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <span>Akademik Projeler Yönetimi</span>
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Yapay zeka, fıkıh ve dijital teknolojiler odağındaki araştırma projelerinizi yönetin.
          </p>
        </div>
        <button
          onClick={startAdd}
          disabled={editingId !== null}
          className="inline-flex items-center gap-1.5 py-2.5 px-4 bg-stone-900 hover:bg-stone-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-stone-50 dark:text-stone-950 text-xs font-bold rounded-xl transition-all shadow-md disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          <span>Yeni Proje Ekle</span>
        </button>
      </div>

      {editingId && (
        <div className="p-5 bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-xl space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 border-b border-stone-200 dark:border-stone-700 pb-2">
            {editingId === 'new' ? 'Yeni Proje Kaydı' : 'Proje Kaydını Düzenle'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-1">Proje Başlığı</label>
              <input
                type="text"
                placeholder="Örn: Yapay Zekâ Etiği & İslam Hukuku"
                value={formState.title || ''}
                onChange={(e) => setFormState({ ...formState, title: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-stone-100 focus:border-stone-900 dark:focus:border-amber-400 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-1">Tarih / Yıllar</label>
              <input
                type="text"
                placeholder="Örn: 2023 - Devam Ediyor"
                value={formState.years || ''}
                onChange={(e) => setFormState({ ...formState, years: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-stone-100 focus:border-stone-900 dark:focus:border-amber-400 outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-1">Etiketler (Virgülle ayırın)</label>
              <input
                type="text"
                placeholder="İslam Hukuku, Yapay Zeka, Blok Zincir, Etik"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-stone-100 focus:border-stone-900 dark:focus:border-amber-400 outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-1">Proje Detayları & Özeti</label>
              <textarea
                rows={3}
                value={formState.description || ''}
                onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                className="w-full p-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-stone-100 focus:border-stone-900 dark:focus:border-amber-400 outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={cancelEdit}
              className="px-3.5 py-2 bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 text-stone-800 dark:text-stone-200 text-xs font-semibold rounded-xl"
            >
              İptal
            </button>
            <button
              onClick={handleSaveItem}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-stone-900 hover:bg-stone-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-stone-50 dark:text-stone-950 text-xs font-bold rounded-xl"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Kaydet</span>
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between p-4 bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-700/80 rounded-xl hover:border-stone-400 dark:hover:border-stone-600 transition-colors"
          >
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-stone-900 dark:text-stone-100 text-sm">{item.title}</h4>
                <span className="text-[10px] font-bold bg-stone-200 dark:bg-stone-700 text-stone-800 dark:text-stone-200 px-2 py-0.5 rounded">
                  {item.years}
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">{item.description}</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => startEdit(item)}
                className="p-2 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-lg transition-colors"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(item.id)}
                className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

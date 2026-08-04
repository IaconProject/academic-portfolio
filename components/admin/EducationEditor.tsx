'use client';

import React, { useState } from 'react';
import { EducationItem } from '@/lib/types';
import { Plus, Trash2, Edit2, Save, School } from 'lucide-react';

interface EducationEditorProps {
  education: EducationItem[];
  onSave: (updatedEducation: EducationItem[]) => void;
}

export const EducationEditor: React.FC<EducationEditorProps> = ({ education, onSave }) => {
  const [items, setItems] = useState<EducationItem[]>(education);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<Partial<EducationItem>>({});

  const startAdd = () => {
    setEditingId('new');
    setFormState({
      degree: '',
      institution: '',
      years: '',
      status: 'Tamamlandı',
      description: '',
      isCurrent: false,
    });
  };

  const startEdit = (item: EducationItem) => {
    setEditingId(item.id);
    setFormState({ ...item });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormState({});
  };

  const handleSaveItem = () => {
    if (!formState.degree || !formState.institution || !formState.years) return;

    if (editingId === 'new') {
      const newItem: EducationItem = {
        id: `edu-${Date.now()}`,
        degree: formState.degree || '',
        institution: formState.institution || '',
        years: formState.years || '',
        status: formState.status || 'Tamamlandı',
        description: formState.description || '',
        isCurrent: formState.isCurrent || false,
      };
      const updated = [...items, newItem];
      setItems(updated);
      onSave(updated);
    } else if (editingId) {
      const updated = items.map((item) =>
        item.id === editingId ? ({ ...item, ...formState } as EducationItem) : item
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
            <School className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <span>Eğitim Geçmişi Yönetimi</span>
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Lisans, lisansüstü ve akademik öğrenim bilgilerinizi ekleyin.
          </p>
        </div>
        <button
          onClick={startAdd}
          disabled={editingId !== null}
          className="inline-flex items-center gap-1.5 py-2.5 px-4 bg-stone-900 hover:bg-stone-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-stone-50 dark:text-stone-950 text-xs font-bold rounded-xl transition-all shadow-md disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          <span>Yeni Eğitim Ekle</span>
        </button>
      </div>

      {/* Editing Form */}
      {editingId && (
        <div className="p-5 bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-xl space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 border-b border-stone-200 dark:border-stone-700 pb-2">
            {editingId === 'new' ? 'Yeni Eğitim Kaydı' : 'Eğitim Kaydını Düzenle'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-1">Derece / Unvan</label>
              <input
                type="text"
                placeholder="Örn: Lisans (Devam Ediyor)"
                value={formState.degree || ''}
                onChange={(e) => setFormState({ ...formState, degree: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-stone-100 focus:border-stone-900 dark:focus:border-amber-400 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-1">Üniversite / Fakülte</label>
              <input
                type="text"
                placeholder="Örn: Eskişehir Osmangazi Üniversitesi"
                value={formState.institution || ''}
                onChange={(e) => setFormState({ ...formState, institution: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-stone-100 focus:border-stone-900 dark:focus:border-amber-400 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-1">Tarih / Yıllar</label>
              <input
                type="text"
                placeholder="Örn: 2020 - Devam Ediyor"
                value={formState.years || ''}
                onChange={(e) => setFormState({ ...formState, years: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-stone-100 focus:border-stone-900 dark:focus:border-amber-400 outline-none"
              />
            </div>
            <div className="flex items-center gap-4 pt-6">
              <label className="flex items-center gap-2 text-xs font-bold text-stone-700 dark:text-stone-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formState.isCurrent || false}
                  onChange={(e) => setFormState({ ...formState, isCurrent: e.target.checked })}
                  className="rounded border-stone-300 dark:border-stone-700 text-stone-900 dark:text-amber-500 focus:ring-stone-900"
                />
                <span>Aktif Öğrenim (Devam Ediyor)</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-1">Açıklama (Opsiyonel)</label>
            <textarea
              rows={2}
              value={formState.description || ''}
              onChange={(e) => setFormState({ ...formState, description: e.target.value })}
              className="w-full p-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-stone-100 focus:border-stone-900 dark:focus:border-amber-400 outline-none"
            />
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

      {/* Item List */}
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between p-4 bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-700/80 rounded-xl hover:border-stone-400 dark:hover:border-stone-600 transition-colors"
          >
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-stone-900 dark:text-stone-100 text-sm">{item.degree}</h4>
                <span className="text-[10px] font-bold bg-stone-200 dark:bg-stone-700 text-stone-800 dark:text-stone-200 px-2 py-0.5 rounded">
                  {item.years}
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">{item.institution}</p>
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

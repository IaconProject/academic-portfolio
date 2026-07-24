'use client';

import React, { useState } from 'react';
import { EducationItem } from '@/lib/types';
import { Plus, Trash2, Edit2, Save, School, Check, X } from 'lucide-react';

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
    <div className="bg-white p-6 md:p-8 rounded-xl border border-slate-200 shadow-sm space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-xl font-serif font-bold text-academic-navy">
            Eğitim Geçmişi Yönetimi
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Lisans, lisansüstü ve akademik eğitim aşamalarınızı ekleyip düzenleyebilirsiniz.
          </p>
        </div>
        <button
          onClick={startAdd}
          disabled={editingId !== null}
          className="inline-flex items-center gap-1.5 py-2 px-4 bg-academic-navy text-white text-xs font-bold rounded-lg hover:bg-academic-blue transition-colors shadow-sm disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          <span>Yeni Eğitim Ekle</span>
        </button>
      </div>

      {/* Editing / Adding Form */}
      {editingId && (
        <div className="p-5 bg-slate-50 border border-slate-300 rounded-xl space-y-4">
          <h3 className="text-sm font-bold text-academic-navy border-b border-slate-200 pb-2">
            {editingId === 'new' ? 'Yeni Eğitim Kaydı Ekle' : 'Eğitim Kaydını Düzenle'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Derece / Unvan</label>
              <input
                type="text"
                placeholder="Örn: Lisans (Devam Ediyor)"
                value={formState.degree || ''}
                onChange={(e) => setFormState({ ...formState, degree: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Üniversite / Fakülte</label>
              <input
                type="text"
                placeholder="Örn: Eskişehir Osmangazi Üniversitesi"
                value={formState.institution || ''}
                onChange={(e) => setFormState({ ...formState, institution: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tarih / Yıllar</label>
              <input
                type="text"
                placeholder="Örn: 2020 - Devam Ediyor"
                value={formState.years || ''}
                onChange={(e) => setFormState({ ...formState, years: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div className="flex items-center gap-4 pt-6">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formState.isCurrent || false}
                  onChange={(e) => setFormState({ ...formState, isCurrent: e.target.checked })}
                  className="rounded border-slate-300 text-academic-navy focus:ring-academic-navy"
                />
                <span>Aktif Öğrenim (Devam Ediyor)</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Açıklama (Opsiyonel)</label>
            <textarea
              rows={2}
              value={formState.description || ''}
              onChange={(e) => setFormState({ ...formState, description: e.target.value })}
              className="w-full p-3 bg-white border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={cancelEdit}
              className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-lg"
            >
              İptal
            </button>
            <button
              onClick={handleSaveItem}
              className="inline-flex items-center gap-1 px-4 py-1.5 bg-academic-navy text-white text-xs font-bold rounded-lg hover:bg-academic-blue"
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
            className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl"
          >
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-academic-navy text-sm">{item.degree}</h4>
                <span className="text-[10px] font-bold bg-white px-2 py-0.5 border rounded text-slate-500">
                  {item.years}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">{item.institution}</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => startEdit(item)}
                className="p-1.5 text-slate-600 hover:text-academic-navy hover:bg-white rounded-lg transition-colors"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(item.id)}
                className="p-1.5 text-red-500 hover:text-red-700 hover:bg-white rounded-lg transition-colors"
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

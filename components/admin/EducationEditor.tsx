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
    <div className="bg-slate-950/80 p-6 md:p-8 rounded-2xl border border-cyan-500/20 shadow-2xl backdrop-blur-md space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-mono font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <School className="w-5 h-5 text-cyan-400" />
            <span>Eğitim Geçmişi Yönetimi</span>
          </h2>
          <p className="text-xs font-mono text-slate-400 mt-1">
            Lisans, lisansüstü ve akademik öğrenim bilgilerinizi ekleyin.
          </p>
        </div>
        <button
          onClick={startAdd}
          disabled={editingId !== null}
          className="inline-flex items-center gap-1.5 py-2.5 px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-mono font-extrabold rounded-xl transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          <span>YENİ EĞİTİM EKLE</span>
        </button>
      </div>

      {/* Editing Form */}
      {editingId && (
        <div className="p-5 bg-slate-900/90 border border-cyan-500/30 rounded-xl space-y-4">
          <h3 className="text-xs font-mono font-bold uppercase text-cyan-400 border-b border-slate-800 pb-2">
            {editingId === 'new' ? '// YENİ EĞİTİM KAYDI' : '// EĞİTİM KAYDINI DÜZENLE'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono font-bold uppercase text-slate-300 mb-1">Derece / Unvan</label>
              <input
                type="text"
                placeholder="Örn: Lisans (Devam Ediyor)"
                value={formState.degree || ''}
                onChange={(e) => setFormState({ ...formState, degree: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-slate-100 focus:border-cyan-400 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-mono font-bold uppercase text-slate-300 mb-1">Üniversite / Fakülte</label>
              <input
                type="text"
                placeholder="Örn: Eskişehir Osmangazi Üniversitesi"
                value={formState.institution || ''}
                onChange={(e) => setFormState({ ...formState, institution: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-slate-100 focus:border-cyan-400 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-mono font-bold uppercase text-slate-300 mb-1">Tarih / Yıllar</label>
              <input
                type="text"
                placeholder="Örn: 2020 - Devam Ediyor"
                value={formState.years || ''}
                onChange={(e) => setFormState({ ...formState, years: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-slate-100 focus:border-cyan-400 outline-none"
              />
            </div>
            <div className="flex items-center gap-4 pt-6">
              <label className="flex items-center gap-2 text-xs font-mono font-bold text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formState.isCurrent || false}
                  onChange={(e) => setFormState({ ...formState, isCurrent: e.target.checked })}
                  className="rounded bg-slate-950 border-slate-700 text-cyan-400 focus:ring-cyan-400"
                />
                <span>Aktif Öğrenim (Devam Ediyor)</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono font-bold uppercase text-slate-300 mb-1">Açıklama (Opsiyonel)</label>
            <textarea
              rows={2}
              value={formState.description || ''}
              onChange={(e) => setFormState({ ...formState, description: e.target.value })}
              className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-slate-100 focus:border-cyan-400 outline-none"
            />
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
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between p-4 bg-slate-900/60 border border-slate-800/80 rounded-xl hover:border-cyan-500/30 transition-colors"
          >
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-mono font-bold text-slate-100 text-sm">{item.degree}</h4>
                <span className="text-[10px] font-mono font-bold bg-cyan-950 text-cyan-400 px-2 py-0.5 border border-cyan-500/30 rounded">
                  {item.years}
                </span>
              </div>
              <p className="text-xs font-mono text-slate-400 mt-1">{item.institution}</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => startEdit(item)}
                className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(item.id)}
                className="p-2 text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-lg transition-colors"
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

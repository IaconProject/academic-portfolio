'use client';

import React, { useState } from 'react';
import { ActivityItem } from '@/lib/types';
import { Plus, Trash2, Edit2, Save, ListOrdered, Building2 } from 'lucide-react';

interface ActivitiesEditorProps {
  activities: ActivityItem[];
  onSave: (updated: ActivityItem[]) => void;
}

export const ActivitiesEditor: React.FC<ActivitiesEditorProps> = ({ activities: initialItems, onSave }) => {
  const [items, setItems] = useState<ActivityItem[]>(initialItems || []);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<Partial<ActivityItem>>({});

  const startAdd = () => {
    setEditingId('new');
    setFormState({
      title: '',
      organization: '',
      years: '',
      description: '',
    });
  };

  const startEdit = (item: ActivityItem) => {
    setEditingId(item.id);
    setFormState({ ...item });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormState({});
  };

  const handleSaveItem = () => {
    if (!formState.title || !formState.organization || !formState.years) return;

    if (editingId === 'new') {
      const newItem: ActivityItem = {
        id: `act-${Date.now()}`,
        title: formState.title || '',
        organization: formState.organization || '',
        years: formState.years || '',
        description: formState.description || '',
      };
      const updated = [...items, newItem];
      setItems(updated);
      onSave(updated);
    } else if (editingId) {
      const updated = items.map((item) =>
        item.id === editingId ? ({ ...item, ...formState } as ActivityItem) : item
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
            <ListOrdered className="w-5 h-5 text-cyan-400" />
            <span>Faaliyetler & Deneyim Yönetimi</span>
          </h2>
          <p className="text-xs font-mono text-slate-400 mt-1">
            Akademik kulüp, topluluk koordinatörlükleri ve profesyonel eğitmenlik deneyimlerinizi ekleyin.
          </p>
        </div>
        <button
          onClick={startAdd}
          disabled={editingId !== null}
          className="inline-flex items-center gap-1.5 py-2.5 px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-mono font-extrabold rounded-xl transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          <span>YENİ FAALİYET EKLE</span>
        </button>
      </div>

      {/* Editing Form */}
      {editingId && (
        <div className="p-5 bg-slate-900/90 border border-cyan-500/30 rounded-xl space-y-4 font-mono">
          <h3 className="text-xs font-mono font-bold uppercase text-cyan-400 border-b border-slate-800 pb-2">
            {editingId === 'new' ? '// YENİ FAALİYET KAYDI' : '// FAALİYET KAYDINI DÜZENLE'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase text-slate-300 mb-1">Faaliyet / Görev Başlığı</label>
              <input
                type="text"
                placeholder="Örn: Google Siber Güvenlik Eğitmenliği / Fıkıh Atölyesi Coordinatörlüğü"
                value={formState.title || ''}
                onChange={(e) => setFormState({ ...formState, title: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-slate-100 focus:border-cyan-400 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-300 mb-1">Kurum / Organizasyon</label>
              <input
                type="text"
                placeholder="Örn: Google Kamu İlişkileri Ekibi"
                value={formState.organization || ''}
                onChange={(e) => setFormState({ ...formState, organization: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-slate-100 focus:border-cyan-400 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-300 mb-1">Tarih / Yıllar</label>
              <input
                type="text"
                placeholder="Örn: 2016 - 2020"
                value={formState.years || ''}
                onChange={(e) => setFormState({ ...formState, years: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-slate-100 focus:border-cyan-400 outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase text-slate-300 mb-1">Açıklama (Opsiyonel)</label>
              <textarea
                rows={3}
                placeholder="Faaliyetin kapsamı ve üstlenilen sorumluluklar..."
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
            Henüz faaliyet veya deneyim kaydı eklenmedi.
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-4 bg-slate-900/60 border border-slate-800/80 rounded-xl hover:border-cyan-500/30 transition-colors"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-slate-100 text-sm">{item.title}</h4>
                  <span className="text-[10px] font-bold bg-cyan-950 text-cyan-400 px-2 py-0.5 border border-cyan-500/30 rounded">
                    {item.years}
                  </span>
                </div>
                <p className="text-xs text-amber-400">{item.organization}</p>
                {item.description && <p className="text-xs text-slate-400 pt-0.5">{item.description}</p>}
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
          ))
        )}
      </div>
    </div>
  );
};

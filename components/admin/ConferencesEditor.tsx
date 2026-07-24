'use client';

import React, { useState } from 'react';
import { ConferenceItem } from '@/lib/types';
import { Plus, Trash2, Edit2, Save, Mic, MapPin, Calendar, UserCheck } from 'lucide-react';

interface ConferencesEditorProps {
  conferences: ConferenceItem[];
  onSave: (updated: ConferenceItem[]) => void;
}

export const ConferencesEditor: React.FC<ConferencesEditorProps> = ({ conferences: initialItems, onSave }) => {
  const [items, setItems] = useState<ConferenceItem[]>(initialItems || []);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<Partial<ConferenceItem>>({});

  const startAdd = () => {
    setEditingId('new');
    setFormState({
      title: '',
      eventName: '',
      location: '',
      year: '',
      role: 'Konuşmacı / Bildiri Sunumu',
    });
  };

  const startEdit = (item: ConferenceItem) => {
    setEditingId(item.id);
    setFormState({ ...item });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormState({});
  };

  const handleSaveItem = () => {
    if (!formState.title || !formState.eventName || !formState.year) return;

    if (editingId === 'new') {
      const newItem: ConferenceItem = {
        id: `conf-${Date.now()}`,
        title: formState.title || '',
        eventName: formState.eventName || '',
        location: formState.location || '',
        year: formState.year || '',
        role: formState.role || 'Konuşmacı',
      };
      const updated = [...items, newItem];
      setItems(updated);
      onSave(updated);
    } else if (editingId) {
      const updated = items.map((item) =>
        item.id === editingId ? ({ ...item, ...formState } as ConferenceItem) : item
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
            <Mic className="w-5 h-5 text-cyan-400" />
            <span>Sempozyum & Konferans Yönetimi</span>
          </h2>
          <p className="text-xs font-mono text-slate-400 mt-1">
            Sunum yaptığınız veya katıldığınız akademik sempozyum, panel ve kongre bilgilerini ekleyin.
          </p>
        </div>
        <button
          onClick={startAdd}
          disabled={editingId !== null}
          className="inline-flex items-center gap-1.5 py-2.5 px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-mono font-extrabold rounded-xl transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          <span>YENİ ETKİNLİK EKLE</span>
        </button>
      </div>

      {/* Editing Form */}
      {editingId && (
        <div className="p-5 bg-slate-900/90 border border-cyan-500/30 rounded-xl space-y-4 font-mono">
          <h3 className="text-xs font-mono font-bold uppercase text-cyan-400 border-b border-slate-800 pb-2">
            {editingId === 'new' ? '// YENİ ETKİNLİK KAYDI' : '// ETKİNLİK KAYDINI DÜZENLE'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase text-slate-300 mb-1">Bildiri / Sunum Başlığı</label>
              <input
                type="text"
                placeholder="Örn: Dijitalleşen Dünyada Fıkıh ve Teknoloji Sempozyumu"
                value={formState.title || ''}
                onChange={(e) => setFormState({ ...formState, title: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-slate-100 focus:border-cyan-400 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-300 mb-1">Kongre / Sempozyum Adı</label>
              <input
                type="text"
                placeholder="Örn: Ulusal İlahiyat Araştırmaları Kongresi"
                value={formState.eventName || ''}
                onChange={(e) => setFormState({ ...formState, eventName: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-slate-100 focus:border-cyan-400 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-300 mb-1">Rolünüz / Göreviniz</label>
              <input
                type="text"
                placeholder="Örn: Konuşmacı / Bildiri Sunumu"
                value={formState.role || ''}
                onChange={(e) => setFormState({ ...formState, role: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-slate-100 focus:border-cyan-400 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-300 mb-1">Konum / Şehir</label>
              <input
                type="text"
                placeholder="Örn: Eskişehir"
                value={formState.location || ''}
                onChange={(e) => setFormState({ ...formState, location: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-slate-100 focus:border-cyan-400 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-300 mb-1">Yıl</label>
              <input
                type="text"
                placeholder="Örn: 2023"
                value={formState.year || ''}
                onChange={(e) => setFormState({ ...formState, year: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-slate-100 focus:border-cyan-400 outline-none"
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
            Henüz sempozyum veya konferans kaydı eklenmedi.
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
                    {item.year}
                  </span>
                </div>
                <p className="text-xs text-slate-300">{item.eventName}</p>
                <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-0.5">
                  <span>📍 {item.location || 'Bilinmiyor'}</span>
                  <span>•</span>
                  <span className="text-amber-400">{item.role}</span>
                </div>
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

'use client';

import React, { useState } from 'react';
import { ReferenceItem } from '@/lib/types';
import { Plus, Trash2, Edit2, Save, Users, Star, Mail, Phone, Building } from 'lucide-react';

interface ReferencesEditorProps {
  references: ReferenceItem[];
  onSave: (updated: ReferenceItem[]) => void;
}

export const ReferencesEditor: React.FC<ReferencesEditorProps> = ({ references: initialItems, onSave }) => {
  const [items, setItems] = useState<ReferenceItem[]>(initialItems || []);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<Partial<ReferenceItem>>({});

  const startAdd = () => {
    setEditingId('new');
    setFormState({
      name: '',
      title: '',
      institution: '',
      email: '',
      phone: '',
      isFeatured: true,
    });
  };

  const startEdit = (item: ReferenceItem) => {
    setEditingId(item.id);
    setFormState({ ...item });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormState({});
  };

  const handleSaveItem = () => {
    if (!formState.name || !formState.title || !formState.institution) return;

    if (editingId === 'new') {
      const newItem: ReferenceItem = {
        id: `ref-${Date.now()}`,
        name: formState.name || '',
        title: formState.title || '',
        institution: formState.institution || '',
        email: formState.email || '',
        phone: formState.phone || '',
        isFeatured: formState.isFeatured ?? true,
      };
      const updated = [...items, newItem];
      setItems(updated);
      onSave(updated);
    } else if (editingId) {
      const updated = items.map((item) =>
        item.id === editingId ? ({ ...item, ...formState } as ReferenceItem) : item
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
            <Users className="w-5 h-5 text-cyan-400" />
            <span>Akademik Referanslar Yönetimi</span>
          </h2>
          <p className="text-xs font-mono text-slate-400 mt-1">
            Akademik çalışmalarınızı ve yetkinliğinizi teyit eden referans hocaları ve unvanlarını ekleyin.
          </p>
        </div>
        <button
          onClick={startAdd}
          disabled={editingId !== null}
          className="inline-flex items-center gap-1.5 py-2.5 px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-mono font-extrabold rounded-xl transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          <span>YENİ REFERANS EKLE</span>
        </button>
      </div>

      {/* Editing Form */}
      {editingId && (
        <div className="p-5 bg-slate-900/90 border border-cyan-500/30 rounded-xl space-y-4 font-mono">
          <h3 className="text-xs font-mono font-bold uppercase text-cyan-400 border-b border-slate-800 pb-2">
            {editingId === 'new' ? '// YENİ REFERANS KAYDI' : '// REFERANS KAYDINI DÜZENLE'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-300 mb-1">Hoca / İsim Unvan</label>
              <input
                type="text"
                placeholder="Örn: Prof. Dr. Mustafa YILDIRIM"
                value={formState.name || ''}
                onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-slate-100 focus:border-cyan-400 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-300 mb-1">Görevi / Pozisyon</label>
              <input
                type="text"
                placeholder="Örn: Emekli Dekan / Anabilim Dalı Başkanı"
                value={formState.title || ''}
                onChange={(e) => setFormState({ ...formState, title: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-slate-100 focus:border-cyan-400 outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase text-slate-300 mb-1">Üniversite / Fakülte / Kurum</label>
              <input
                type="text"
                placeholder="Örn: Eskişehir Osmangazi Üniversitesi, İlahiyat Fakültesi"
                value={formState.institution || ''}
                onChange={(e) => setFormState({ ...formState, institution: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-slate-100 focus:border-cyan-400 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-300 mb-1">E-posta (İsteğe Bağlı)</label>
              <input
                type="email"
                placeholder="Örn: hoca@ogu.edu.tr"
                value={formState.email || ''}
                onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-slate-100 focus:border-cyan-400 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-300 mb-1">Telefon (İsteğe Bağlı)</label>
              <input
                type="text"
                placeholder="Örn: +90 222 123 45 67"
                value={formState.phone || ''}
                onChange={(e) => setFormState({ ...formState, phone: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-slate-100 focus:border-cyan-400 outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-4 pt-2">
            <label className="flex items-center gap-2 text-xs font-mono font-bold text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={formState.isFeatured ?? true}
                onChange={(e) => setFormState({ ...formState, isFeatured: e.target.checked })}
                className="rounded bg-slate-950 border-slate-700 text-cyan-400 focus:ring-cyan-400"
              />
              <span>Ana Sayfada Öne Çıkar (Vitrin Referansı)</span>
            </label>
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
            Henüz referans eklenmedi. Yukarıdaki butona tıklayarak referans hoca ekleyebilirsiniz.
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-4 bg-slate-900/60 border border-slate-800/80 rounded-xl hover:border-cyan-500/30 transition-colors"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-slate-100 text-sm">{item.name}</h4>
                  {item.isFeatured && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-950 text-amber-300 px-2 py-0.5 border border-amber-500/30 rounded">
                      <Star className="w-3 h-3 text-amber-400" />
                      <span>Öne Çıkarıldı</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-cyan-300 font-semibold">{item.title}</p>
                <p className="text-xs text-slate-400">{item.institution}</p>
              </div>

              <div className="flex items-center gap-2">
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

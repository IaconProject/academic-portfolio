'use client';

import React, { useState } from 'react';
import { PublicationItem } from '@/lib/types';
import { Plus, Trash2, Edit2, Save, BookOpen } from 'lucide-react';

interface PublicationsEditorProps {
  publications: PublicationItem[];
  onSave: (updatedPublications: PublicationItem[]) => void;
}

export const PublicationsEditor: React.FC<PublicationsEditorProps> = ({ publications, onSave }) => {
  const [items, setItems] = useState<PublicationItem[]>(publications);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<Partial<PublicationItem>>({});

  const startAdd = () => {
    setEditingId('new');
    setFormState({
      type: 'Akademik Makale',
      title: '',
      publisher: '',
      year: new Date().getFullYear().toString(),
      url: '',
    });
  };

  const startEdit = (item: PublicationItem) => {
    setEditingId(item.id);
    setFormState({ ...item });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormState({});
  };

  const handleSaveItem = () => {
    if (!formState.title || !formState.type || !formState.year) return;

    if (editingId === 'new') {
      const newItem: PublicationItem = {
        id: `pub-${Date.now()}`,
        type: formState.type || 'Akademik Makale',
        title: formState.title || '',
        publisher: formState.publisher || '',
        year: formState.year || '',
        url: formState.url || '',
      };
      const updated = [...items, newItem];
      setItems(updated);
      onSave(updated);
    } else if (editingId) {
      const updated = items.map((item) =>
        item.id === editingId ? ({ ...item, ...formState } as PublicationItem) : item
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
            <BookOpen className="w-5 h-5 text-cyan-400" />
            <span>Yayınlar & Makaleler Yönetimi</span>
          </h2>
          <p className="text-xs font-mono text-slate-400 mt-1">
            Akademik makalelerinizi, kitap bölümlerinizi ve tebliğlerinizi yönetin.
          </p>
        </div>
        <button
          onClick={startAdd}
          disabled={editingId !== null}
          className="inline-flex items-center gap-1.5 py-2.5 px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-mono font-extrabold rounded-xl transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          <span>YENİ YAYIN EKLE</span>
        </button>
      </div>

      {/* Editing Form */}
      {editingId && (
        <div className="p-5 bg-slate-900/90 border border-cyan-500/30 rounded-xl space-y-4">
          <h3 className="text-xs font-mono font-bold uppercase text-cyan-400 border-b border-slate-800 pb-2">
            {editingId === 'new' ? '// YENİ YAYIN EKLE' : '// YAYIN BİLGİSİNİ DÜZENLE'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono font-bold uppercase text-slate-300 mb-1">Yayın Türü</label>
              <select
                value={formState.type || 'Akademik Makale'}
                onChange={(e) => setFormState({ ...formState, type: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-slate-100 focus:border-cyan-400 outline-none"
              >
                <option value="Akademik Makale">Akademik Makale</option>
                <option value="Kitap Bölümü">Kitap Bölümü</option>
                <option value="Bildiri / Tebliğ">Bildiri / Tebliğ</option>
                <option value="Tez">Tez</option>
                <option value="Makale / Araştırma">Makale / Araştırma</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono font-bold uppercase text-slate-300 mb-1">Yayın Yılı</label>
              <input
                type="text"
                value={formState.year || ''}
                onChange={(e) => setFormState({ ...formState, year: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-slate-100 focus:border-cyan-400 outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-mono font-bold uppercase text-slate-300 mb-1">Yayın Başlığı</label>
              <input
                type="text"
                placeholder="Örn: Din ve Yapay Zeka Kapsamında Yapay Zeka Etiği"
                value={formState.title || ''}
                onChange={(e) => setFormState({ ...formState, title: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-slate-100 focus:border-cyan-400 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-mono font-bold uppercase text-slate-300 mb-1">Yayınevi / Dergi</label>
              <input
                type="text"
                placeholder="Örn: Dijital Çağda İslami Finans Yayınları"
                value={formState.publisher || ''}
                onChange={(e) => setFormState({ ...formState, publisher: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-slate-100 focus:border-cyan-400 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-mono font-bold uppercase text-slate-300 mb-1">Erişim Linki / DOI (Opsiyonel)</label>
              <input
                type="url"
                placeholder="https://doi.org/..."
                value={formState.url || ''}
                onChange={(e) => setFormState({ ...formState, url: e.target.value })}
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
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between p-4 bg-slate-900/60 border border-slate-800/80 rounded-xl hover:border-cyan-500/30 transition-colors"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase bg-cyan-950 text-cyan-400 px-2 py-0.5 border border-cyan-500/30 rounded">
                  {item.type}
                </span>
                <span className="text-xs font-mono text-slate-400">{item.year}</span>
              </div>
              <h4 className="font-serif font-bold text-slate-100 text-sm mt-1">&quot;{item.title}&quot;</h4>
              {item.publisher && <p className="text-xs font-mono text-slate-400 italic mt-0.5">{item.publisher}</p>}
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

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
    <div className="bg-white p-6 md:p-8 rounded-xl border border-slate-200 shadow-sm space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-xl font-serif font-bold text-academic-navy">
            Yayınlar & Makaleler Yönetimi
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Akademik makalelerinizi, kitap bölümlerinizi ve tebliğlerinizi yönetebilirsiniz.
          </p>
        </div>
        <button
          onClick={startAdd}
          disabled={editingId !== null}
          className="inline-flex items-center gap-1.5 py-2 px-4 bg-academic-navy text-white text-xs font-bold rounded-lg hover:bg-academic-blue transition-colors shadow-sm disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          <span>Yeni Yayın Ekle</span>
        </button>
      </div>

      {/* Editing Form */}
      {editingId && (
        <div className="p-5 bg-slate-50 border border-slate-300 rounded-xl space-y-4">
          <h3 className="text-sm font-bold text-academic-navy border-b border-slate-200 pb-2">
            {editingId === 'new' ? 'Yeni Yayın Ekle' : 'Yayın Bilgisini Düzenle'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Yayın Türü</label>
              <select
                value={formState.type || 'Akademik Makale'}
                onChange={(e) => setFormState({ ...formState, type: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
              >
                <option value="Akademik Makale">Akademik Makale</option>
                <option value="Kitap Bölümü">Kitap Bölümü</option>
                <option value="Bildiri / Tebliğ">Bildiri / Tebliğ</option>
                <option value="Tez">Tez</option>
                <option value="Makale / Araştırma">Makale / Araştırma</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Yayın Yılı</label>
              <input
                type="text"
                value={formState.year || ''}
                onChange={(e) => setFormState({ ...formState, year: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Yayın Başlığı</label>
              <input
                type="text"
                placeholder="Örn: Din ve Yapay Zeka Kapsamında Yapay Zeka Etiği"
                value={formState.title || ''}
                onChange={(e) => setFormState({ ...formState, title: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Yayınevi / Dergi</label>
              <input
                type="text"
                placeholder="Örn: Dijital Çağda İslami Finans Yayınları"
                value={formState.publisher || ''}
                onChange={(e) => setFormState({ ...formState, publisher: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Erişim Linki / DOI (Opsiyonel)</label>
              <input
                type="url"
                placeholder="https://doi.org/..."
                value={formState.url || ''}
                onChange={(e) => setFormState({ ...formState, url: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
              />
            </div>
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
                <span className="text-[10px] font-bold uppercase bg-white px-2 py-0.5 border rounded text-slate-600">
                  {item.type}
                </span>
                <span className="text-xs font-semibold text-slate-500">{item.year}</span>
              </div>
              <h4 className="font-bold text-academic-navy text-sm mt-1">&quot;{item.title}&quot;</h4>
              {item.publisher && <p className="text-xs text-slate-500 italic">{item.publisher}</p>}
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

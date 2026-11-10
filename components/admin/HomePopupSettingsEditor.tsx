'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Check, Image, ImagePlus, Loader2, Megaphone, Save, Trash2, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import type { HomePopupSettings } from '@/lib/types';
import { normalizeHomePopupSettings } from '@/lib/home-popup';
import { readSessionItem } from '@/lib/admin-session-storage';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block space-y-1.5"><span className="text-xs font-bold text-stone-700 dark:text-stone-300">{label}</span>{children}</label>;
}

const inputClass = 'w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100';

function PopupPhotoUploader({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const upload = async (file?: File) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type)) {
      toast.error('JPEG, PNG, WebP veya AVIF biçiminde bir fotoğraf seçin.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Fotoğraf 5 MB sınırını aşamaz.');
      return;
    }

    setUploading(true);
    try {
      const body = new FormData();
      body.append('file', file);
      body.append('purpose', 'content');
      const token = readSessionItem('admin_token') || '';
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: token ? { 'X-Admin-Token': token } : {},
        body,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || typeof payload?.url !== 'string') {
        throw new Error(payload?.error || 'Fotoğraf yüklenemedi.');
      }
      onChange(payload.url);
      toast.success('Fotoğraf düzenlenmeden yüklendi.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Fotoğraf yüklenemedi.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 dark:border-stone-700 dark:bg-stone-950">
      <div className="flex min-h-44 items-center justify-center overflow-hidden rounded-xl border border-dashed border-stone-300 bg-white p-3 dark:border-stone-700 dark:bg-stone-900">
        {value ? <img src={value} alt="Pop-up fotoğrafının kırpılmamış önizlemesi" className="block max-h-72 max-w-full object-contain" /> : <div className="flex flex-col items-center gap-2 text-center text-xs text-stone-500"><ImagePlus className="h-8 w-8 text-stone-400" />Fotoğraf seçilmedi</div>}
      </div>
      <p className="mt-3 text-[11px] leading-5 text-stone-500">Fotoğraf dosyası değiştirilmeden saklanır ve pop-up içinde en-boy oranı korunarak gösterilir. JPEG, PNG, WebP veya AVIF · en fazla 5 MB.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-stone-900 px-4 text-xs font-bold text-white disabled:opacity-50 dark:bg-amber-500 dark:text-stone-950">{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}{uploading ? 'Yükleniyor…' : value ? 'Fotoğrafı değiştir' : 'Fotoğraf yükle'}</button>
        {value && <button type="button" onClick={() => onChange('')} disabled={uploading} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-rose-200 px-4 text-xs font-bold text-rose-700 disabled:opacity-50 dark:border-rose-900 dark:text-rose-300"><Trash2 className="h-4 w-4" />Kaldır</button>}
      </div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(event) => upload(event.target.files?.[0])} className="hidden" />
    </div>
  );
}

export function HomePopupSettingsEditor({
  settings,
  isSaving,
  onSave,
}: {
  settings?: HomePopupSettings;
  isSaving: boolean;
  onSave: (settings: HomePopupSettings) => void;
}) {
  const [draft, setDraft] = useState(() => normalizeHomePopupSettings(settings));
  useEffect(() => setDraft(normalizeHomePopupSettings(settings)), [settings]);
  const update = <K extends keyof HomePopupSettings>(key: K, value: HomePopupSettings[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  return (
    <section className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <div className="flex flex-col gap-4 border-b border-stone-100 bg-gradient-to-br from-amber-50 via-white to-stone-50 p-5 dark:border-stone-800 dark:from-stone-900 dark:via-stone-900 dark:to-stone-950 sm:flex-row sm:items-center sm:justify-between sm:p-7">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-stone-900 text-amber-300 dark:bg-amber-500 dark:text-stone-950"><Megaphone className="h-5 w-5" /></span>
          <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700 dark:text-amber-400">Ana sayfa deneyimi</p><h2 className="mt-1 text-xl font-black text-stone-900 dark:text-white">Duyuru pop-up’ı</h2><p className="mt-1 max-w-2xl text-xs leading-5 text-stone-600 dark:text-stone-400">Ana sayfada zarif bir duyuru penceresi gösterin. Önizleme, aşağıdaki ayarlarla anında güncellenir.</p></div>
        </div>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-stone-200 bg-white px-3.5 dark:border-stone-700 dark:bg-stone-950">
          <span className="text-xs font-bold text-stone-700 dark:text-stone-300">{draft.enabled ? 'Yayında' : 'Kapalı'}</span>
          <input type="checkbox" role="switch" aria-label="Ana sayfa pop-up’ını aç" checked={draft.enabled} onChange={(e) => update('enabled', e.target.checked)} className="peer sr-only" />
          <span className={`relative h-6 w-11 rounded-full transition ${draft.enabled ? 'bg-stone-900 dark:bg-amber-500' : 'bg-stone-300 dark:bg-stone-700'}`}><span className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition ${draft.enabled ? 'translate-x-5 dark:bg-stone-950' : ''}`} /></span>
        </label>
      </div>

      <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_minmax(250px,0.8fr)]">
        <div className="space-y-4">
          <Field label="Pop-up türü"><select className={inputClass} value={draft.displayMode} onChange={(e) => update('displayMode', e.target.value as HomePopupSettings['displayMode'])}><option value="content">Metin ve isteğe bağlı görsel</option><option value="image">Yalnızca fotoğraf</option></select></Field>
          {draft.displayMode === 'image' ? (
            <>
              <PopupPhotoUploader value={draft.imageUrl} onChange={(imageUrl) => update('imageUrl', imageUrl)} />
              <Field label="Fotoğraf açıklaması"><input className={inputClass} maxLength={160} value={draft.imageAlt} onChange={(e) => update('imageAlt', e.target.value)} placeholder="Ekran okuyucular için kısa açıklama" /></Field>
              <Field label="Fotoğrafa tıklanınca açılacak bağlantı (isteğe bağlı)"><input className={inputClass} maxLength={500} type="text" value={draft.buttonUrl} onChange={(e) => update('buttonUrl', e.target.value)} placeholder="/yazilar veya https://…" /></Field>
            </>
          ) : (
            <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Üst etiket"><input className={inputClass} maxLength={60} value={draft.eyebrow} onChange={(e) => update('eyebrow', e.target.value)} placeholder="DUYURU" /></Field>
            <Field label="Başlık"><input className={inputClass} maxLength={120} value={draft.title} onChange={(e) => update('title', e.target.value)} /></Field>
          </div>
          <Field label="Açıklama"><textarea className={`${inputClass} min-h-28 resize-y`} maxLength={600} value={draft.message} onChange={(e) => update('message', e.target.value)} /></Field>
          <Field label="Görsel URL’si (isteğe bağlı)"><span className="relative block"><Image className="absolute left-3 top-3 h-4 w-4 text-stone-400" /><input className={`${inputClass} pl-9`} maxLength={500} type="url" value={draft.imageUrl} onChange={(e) => update('imageUrl', e.target.value)} placeholder="https://…" /></span></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Buton metni"><input className={inputClass} maxLength={60} value={draft.buttonLabel} onChange={(e) => update('buttonLabel', e.target.value)} /></Field>
            <Field label="Buton bağlantısı"><input className={inputClass} maxLength={500} type="text" value={draft.buttonUrl} onChange={(e) => update('buttonUrl', e.target.value)} placeholder="/yazilar veya https://…" /></Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={`Gösterim gecikmesi · ${draft.delaySeconds} sn`}><input className="w-full accent-amber-600" type="range" min={0} max={30} step={1} value={draft.delaySeconds} onChange={(e) => update('delaySeconds', Number(e.target.value))} /></Field>
            <Field label="Tekrar gösterim"><select className={inputClass} value={draft.frequency} onChange={(e) => update('frequency', e.target.value as HomePopupSettings['frequency'])}><option value="session">Ziyaret başına bir kez</option><option value="always">Her ana sayfa ziyaretinde</option></select></Field>
          </div>
            </>
          )}
          {draft.displayMode === 'image' && <div className="grid gap-4 sm:grid-cols-2"><Field label={`Gösterim gecikmesi · ${draft.delaySeconds} sn`}><input className="w-full accent-amber-600" type="range" min={0} max={30} step={1} value={draft.delaySeconds} onChange={(e) => update('delaySeconds', Number(e.target.value))} /></Field><Field label="Tekrar gösterim"><select className={inputClass} value={draft.frequency} onChange={(e) => update('frequency', e.target.value as HomePopupSettings['frequency'])}><option value="session">Ziyaret başına bir kez</option><option value="always">Her ana sayfa ziyaretinde</option></select></Field></div>}
        </div>

        <aside className="rounded-2xl border border-stone-200 bg-[#f5f1e8] p-4 dark:border-stone-700 dark:bg-stone-950">
          <div className="mb-3 flex items-center justify-between"><span className="text-[10px] font-black uppercase tracking-[0.16em] text-stone-500">Canlı önizleme</span><span className="rounded-full bg-white/80 px-2 py-1 text-[9px] font-bold text-stone-500 dark:bg-stone-900">Ana sayfa</span></div>
          <div className="relative flex min-h-48 items-center justify-center overflow-hidden rounded-2xl border border-stone-200/80 bg-white p-3 shadow-xl dark:border-stone-700 dark:bg-stone-900">
            {draft.displayMode === 'image' ? (draft.imageUrl ? <img src={draft.imageUrl} alt="" className="block max-h-72 max-w-full object-contain" /> : <div className="text-center text-xs text-stone-500"><Image className="mx-auto mb-2 h-7 w-7" />Fotoğraf seçildiğinde burada kırpılmadan gösterilir.</div>) : <div className="w-full">{draft.imageUrl && <img src={draft.imageUrl} alt="" className="h-32 w-full rounded-xl object-cover" />}<div className="p-2"><p className="text-[9px] font-black tracking-[0.2em] text-amber-700 dark:text-amber-400">{draft.eyebrow || 'DUYURU'}</p><h3 className="mt-2 text-lg font-black leading-tight text-stone-900 dark:text-white">{draft.title || 'Pop-up başlığı'}</h3><p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-stone-600 dark:text-stone-300">{draft.message || 'Duyuru metni burada görüntülenir.'}</p>{draft.buttonLabel && <span className="mt-4 inline-flex items-center gap-2 rounded-xl bg-stone-900 px-3.5 py-2.5 text-[11px] font-bold text-white dark:bg-amber-500 dark:text-stone-950">{draft.buttonLabel}<Check className="h-3 w-3" /></span>}</div></div>}
          </div>
          <p className="mt-3 text-[10px] leading-4 text-stone-500">Pop-up, başlık ve profil alanlarıyla uyumlu sıcak nötr tonları kullanır.</p>
        </aside>
      </div>

      <div className="flex flex-col gap-3 border-t border-stone-100 bg-stone-50/70 px-5 py-4 dark:border-stone-800 dark:bg-stone-950/50 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <p className="text-[11px] text-stone-500">Gecikme 0–30 saniye arasında ayarlanabilir.</p>
        <button type="button" disabled={isSaving} onClick={() => onSave(normalizeHomePopupSettings(draft))} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-stone-900 px-5 text-xs font-black text-white shadow-sm transition hover:bg-stone-700 disabled:cursor-wait disabled:opacity-60 dark:bg-amber-500 dark:text-stone-950 dark:hover:bg-amber-400"><Save className="h-4 w-4" />{isSaving ? 'Kaydediliyor…' : 'Pop-up ayarlarını kaydet'}</button>
      </div>
    </section>
  );
}

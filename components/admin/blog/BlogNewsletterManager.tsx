'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  Edit3,
  Loader2,
  Mail,
  MailCheck,
  Plus,
  RefreshCw,
  Save,
  Send,
  ShieldCheck,
  UserMinus,
  Users,
} from 'lucide-react';
import {
  BlogRichTextEditor,
  RichEditorValue,
} from './BlogRichTextEditor';

interface Broadcast {
  id: string;
  title: string;
  subject: string;
  preview_text: string;
  content_json: Record<string, unknown>;
  content_html: string;
  content_text: string;
  status: string;
  scheduled_for?: string | null;
  sent_at?: string | null;
  recipient_count: number;
  error_message: string;
  created_at: string;
  delivery_stats: Record<string, number>;
}

interface Subscriber {
  id: string;
  email: string;
  status: string;
  source: string;
  consent_version: string;
  confirmed_at?: string | null;
  created_at: string;
}

interface NewsletterData {
  stats: Record<string, number>;
  broadcasts: Broadcast[];
  subscribers: Subscriber[];
  configuration: {
    resend: boolean;
    sender: boolean;
    tokenSecret: boolean;
    webhook: boolean;
    engagementTracking: boolean;
  };
}

interface EditorForm {
  id: string;
  title: string;
  subject: string;
  previewText: string;
  contentJson: Record<string, unknown>;
  contentHtml: string;
  contentText: string;
  scheduledFor: string;
}

const emptyDocument = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
};

const emptyForm: EditorForm = {
  id: '',
  title: '',
  subject: '',
  previewText: '',
  contentJson: emptyDocument,
  contentHtml: '',
  contentText: '',
  scheduledFor: '',
};

const statusLabels: Record<string, string> = {
  draft: 'Taslak',
  scheduled: 'Zamanlandı',
  sending: 'Gönderiliyor',
  sent: 'Gönderildi',
  canceled: 'İptal',
  pending: 'Onay bekliyor',
  active: 'Aktif',
  unsubscribed: 'Ayrıldı',
  bounced: 'Bounce',
  complained: 'Şikâyet',
};

function localDateTimeValue(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function fieldClass() {
  return 'mt-1.5 h-11 w-full rounded-xl border border-stone-300 bg-stone-50 px-3 text-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 dark:border-stone-700 dark:bg-stone-950';
}

export function BlogNewsletterManager() {
  const [data, setData] = useState<NewsletterData | null>(null);
  const [form, setForm] = useState<EditorForm>(emptyForm);
  const [editorKey, setEditorKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/blog/admin/newsletter', {
        cache: 'no-store',
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload?.error?.message || 'Bülten verileri alınamadı.');
      }
      setData(payload.data);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Bülten verileri alınamadı.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  function update<K extends keyof EditorForm>(key: K, value: EditorForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function newBroadcast() {
    setForm({ ...emptyForm, contentJson: { ...emptyDocument } });
    setEditorKey((value) => value + 1);
    setError('');
    setNotice('Yeni bülten taslağı açıldı.');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function editBroadcast(broadcast: Broadcast) {
    if (!['draft', 'scheduled'].includes(broadcast.status)) return;
    setForm({
      id: broadcast.id,
      title: broadcast.title,
      subject: broadcast.subject,
      previewText: broadcast.preview_text,
      contentJson: broadcast.content_json || emptyDocument,
      contentHtml: broadcast.content_html,
      contentText: broadcast.content_text,
      scheduledFor: localDateTimeValue(broadcast.scheduled_for),
    });
    setEditorKey((value) => value + 1);
    setError('');
    setNotice(`“${broadcast.title}” düzenlemeye açıldı.`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function editorChanged(value: RichEditorValue) {
    setForm((current) => ({
      ...current,
      contentJson: value.json,
      contentHtml: value.html,
      contentText: value.text,
    }));
  }

  async function save(status: 'draft' | 'scheduled') {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const scheduledFor =
        status === 'scheduled' && form.scheduledFor
          ? new Date(form.scheduledFor).toISOString()
          : '';
      const response = await fetch('/api/blog/admin/newsletter', {
        method: form.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: form.id,
          title: form.title,
          subject: form.subject,
          previewText: form.previewText,
          contentJson: form.contentJson,
          contentHtml: form.contentHtml,
          status,
          scheduledFor,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error?.message || 'Bülten kaydedilemedi.');
      }
      setForm((current) => ({
        ...current,
        id: payload.data.broadcast.id,
        scheduledFor: localDateTimeValue(
          payload.data.broadcast.scheduled_for
        ),
      }));
      setNotice(
        status === 'scheduled'
          ? 'Bülten gönderim için zamanlandı.'
          : 'Bülten taslağı kaydedildi.'
      );
      await load();
      return payload.data.broadcast.id as string;
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Bülten kaydedilemedi.'
      );
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function sendNow() {
    if (
      !window.confirm(
        `Bu bülten ${data?.stats.active || 0} aktif aboneye şimdi gönderilsin mi? Bu işlem e-posta gönderir ve geri alınamaz.`
      )
    ) {
      return;
    }
    const id = await save('draft');
    if (!id) return;
    setSending(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch(`/api/blog/admin/newsletter/${id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error?.message || 'Bülten gönderilemedi.');
      }
      setNotice(
        `Bülten ${payload.data.recipientCount} alıcıya gönderim kuyruğuna alındı.`
      );
      setForm({ ...emptyForm, contentJson: { ...emptyDocument } });
      setEditorKey((value) => value + 1);
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Bülten gönderilemedi.'
      );
      await load();
    } finally {
      setSending(false);
    }
  }

  async function unsubscribe(subscriber: Subscriber) {
    if (
      !window.confirm(
        `${subscriber.email} adresinin aboneliği yönetici tarafından sonlandırılsın mı?`
      )
    ) {
      return;
    }
    const response = await fetch('/api/blog/admin/newsletter', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: subscriber.id, action: 'unsubscribe' }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.success) {
      setError(payload?.error?.message || 'Abonelik güncellenemedi.');
      return;
    }
    setNotice('Abonelik sonlandırıldı.');
    await load();
  }

  return (
    <main className="mx-auto max-w-7xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700 dark:text-amber-400">
            İzinli iletişim merkezi
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
            Bülten
          </h1>
          <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">
            Çift onay, kişisel ayrılma bağlantısı, zamanlama ve teslimat durumu.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => void load()} className="flex h-11 items-center gap-2 rounded-xl border border-stone-300 bg-white px-4 text-xs font-black dark:border-stone-700 dark:bg-stone-900">
            <RefreshCw className="h-4 w-4" /> Yenile
          </button>
          <button type="button" onClick={newBroadcast} className="flex h-11 items-center gap-2 rounded-xl bg-stone-950 px-4 text-xs font-black text-white dark:bg-amber-400 dark:text-stone-950">
            <Plus className="h-4 w-4" /> Yeni bülten
          </button>
        </div>
      </div>

      {error ? <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">{error}</p> : null}
      {notice ? <p className="mt-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-900"><CheckCircle2 className="h-4 w-4" /> {notice}</p> : null}

      {loading && !data ? (
        <div className="mt-8 flex min-h-64 items-center justify-center rounded-2xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900"><Loader2 className="h-6 w-6 animate-spin text-amber-600" /></div>
      ) : data ? (
        <>
          <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Aktif abone', value: data.stats.active || 0, icon: Users },
              { label: 'Onay bekliyor', value: data.stats.pending || 0, icon: Clock3 },
              { label: 'Ayrılan', value: data.stats.unsubscribed || 0, icon: UserMinus },
              { label: 'Teslimat engeli', value: (data.stats.bounced || 0) + (data.stats.complained || 0), icon: ShieldCheck },
            ].map((card) => {
              const Icon = card.icon;
              return <article key={card.label} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900"><Icon className="h-5 w-5 text-amber-600" /><p className="mt-4 text-2xl font-black">{card.value.toLocaleString('tr-TR')}</p><p className="mt-1 text-xs font-bold text-stone-500">{card.label}</p></article>;
            })}
          </section>

          <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-black">Gönderim yapılandırması</h2><p className="mt-1 text-xs text-stone-500">Sırlar gösterilmez; yalnızca hazır olma durumu okunur.</p></div><span className="text-[10px] font-black uppercase tracking-[0.12em] text-stone-500">Açılma/tıklama takibi {data.configuration.engagementTracking ? 'açık' : 'kapalı'}</span></div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ['Resend API', data.configuration.resend],
                ['Gönderici adresi', data.configuration.sender],
                ['Token sırrı', data.configuration.tokenSecret],
                ['İmzalı webhook', data.configuration.webhook],
              ].map(([label, ready]) => <div key={String(label)} className={`rounded-xl border p-3 text-xs font-black ${ready ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-300' : 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300'}`}>{ready ? 'Hazır' : 'Eksik'} · {label}</div>)}
            </div>
          </section>

          <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
            <div className="flex items-center justify-between"><div><h2 className="text-xl font-black">{form.id ? 'Bülteni düzenle' : 'Yeni bülten'}</h2><p className="mt-1 text-xs text-stone-500">Kayıt, zamanlama ve gönderim birbirinden ayrı işlemlerdir.</p></div><Mail className="h-6 w-6 text-amber-600" /></div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label><span className="editor-label">İç başlık</span><input value={form.title} onChange={(event) => update('title', event.target.value)} className={fieldClass()} placeholder="Haftalık teknoloji notları" /></label>
              <label><span className="editor-label">E-posta konusu</span><input value={form.subject} onChange={(event) => update('subject', event.target.value)} className={fieldClass()} placeholder="Bitcoin neden kıt olabilir?" /></label>
              <label className="md:col-span-2"><span className="editor-label">Ön izleme metni</span><input value={form.previewText} onChange={(event) => update('previewText', event.target.value)} className={fieldClass()} maxLength={300} placeholder="Gelen kutusunda konu satırının yanında görünür." /></label>
            </div>
            <div className="mt-5"><BlogRichTextEditor key={editorKey} initialContent={form.contentJson} onChange={editorChanged} /></div>
            <div className="mt-5 grid items-end gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
              <label><span className="editor-label">Zamanlanmış gönderim</span><input type="datetime-local" value={form.scheduledFor} onChange={(event) => update('scheduledFor', event.target.value)} className={fieldClass()} /></label>
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={saving || sending} onClick={() => void save('draft')} className="inline-flex h-11 items-center gap-2 rounded-xl border border-stone-300 px-4 text-xs font-black disabled:opacity-50 dark:border-stone-700"><Save className="h-4 w-4" /> Taslağı kaydet</button>
                <button type="button" disabled={saving || sending || !form.scheduledFor} onClick={() => void save('scheduled')} className="inline-flex h-11 items-center gap-2 rounded-xl border border-violet-300 bg-violet-50 px-4 text-xs font-black text-violet-900 disabled:opacity-50 dark:border-violet-900 dark:bg-violet-950/30 dark:text-violet-300"><CalendarClock className="h-4 w-4" /> Zamanla</button>
                <button type="button" disabled={saving || sending} onClick={() => void sendNow()} className="inline-flex h-11 items-center gap-2 rounded-xl bg-amber-400 px-5 text-xs font-black text-stone-950 disabled:opacity-50">{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Şimdi gönder</button>
              </div>
            </div>
          </section>

          <section className="mt-6 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900">
            <div className="flex items-center justify-between border-b border-stone-200 p-5 dark:border-stone-800"><div><h2 className="text-lg font-black">Bülten geçmişi</h2><p className="mt-1 text-xs text-stone-500">Son 50 kayıt</p></div><MailCheck className="h-5 w-5 text-amber-600" /></div>
            {data.broadcasts.length ? <div className="divide-y divide-stone-100 dark:divide-stone-800">{data.broadcasts.map((broadcast) => <article key={broadcast.id} className="grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-stone-100 px-2.5 py-1 text-[10px] font-black uppercase dark:bg-stone-800">{statusLabels[broadcast.status] || broadcast.status}</span><span className="text-[11px] font-bold text-stone-500">{broadcast.recipient_count} alıcı · {broadcast.delivery_stats.delivered || 0} teslim · {broadcast.delivery_stats.bounced || 0} bounce</span></div><h3 className="mt-2 truncate font-black">{broadcast.title}</h3><p className="mt-1 truncate text-xs text-stone-500">{broadcast.subject}</p>{broadcast.error_message ? <p className="mt-2 text-xs font-bold text-red-700">Son hata: {broadcast.error_message}</p> : null}</div>{['draft', 'scheduled'].includes(broadcast.status) ? <button type="button" onClick={() => editBroadcast(broadcast)} className="inline-flex h-10 items-center gap-2 rounded-xl border border-stone-300 px-4 text-xs font-black dark:border-stone-700"><Edit3 className="h-4 w-4" /> Düzenle</button> : <time className="text-xs font-bold text-stone-500">{new Date(broadcast.sent_at || broadcast.created_at).toLocaleString('tr-TR')}</time>}</article>)}</div> : <p className="p-10 text-center text-sm text-stone-500">Henüz bülten yok.</p>}
          </section>

          <section className="mt-6 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900">
            <div className="border-b border-stone-200 p-5 dark:border-stone-800"><h2 className="text-lg font-black">Aboneler</h2><p className="mt-1 text-xs text-stone-500">En yeni 200 kayıt · yalnızca blog sahibi erişebilir</p></div>
            {data.subscribers.length ? <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-stone-50 text-[10px] font-black uppercase tracking-[0.12em] text-stone-500 dark:bg-stone-950"><tr><th className="px-5 py-3">E-posta</th><th className="px-4 py-3">Durum</th><th className="px-4 py-3">Kaynak / rıza</th><th className="px-4 py-3">Tarih</th><th className="px-4 py-3"><span className="sr-only">İşlem</span></th></tr></thead><tbody className="divide-y divide-stone-100 dark:divide-stone-800">{data.subscribers.map((subscriber) => <tr key={subscriber.id}><td className="px-5 py-4 font-bold">{subscriber.email}</td><td className="px-4 py-4"><span className="rounded-full bg-stone-100 px-2.5 py-1 text-[10px] font-black uppercase dark:bg-stone-800">{statusLabels[subscriber.status] || subscriber.status}</span></td><td className="px-4 py-4 text-xs text-stone-500">{subscriber.source} · {subscriber.consent_version}</td><td className="px-4 py-4 text-xs">{new Date(subscriber.created_at).toLocaleDateString('tr-TR')}</td><td className="px-4 py-4 text-right">{['active', 'pending'].includes(subscriber.status) ? <button type="button" onClick={() => void unsubscribe(subscriber)} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 text-[11px] font-black text-red-700"><UserMinus className="h-3.5 w-3.5" /> Sonlandır</button> : null}</td></tr>)}</tbody></table></div> : <p className="p-10 text-center text-sm text-stone-500">Henüz abone yok.</p>}
          </section>
        </>
      ) : null}
    </main>
  );
}

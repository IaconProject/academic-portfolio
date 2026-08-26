'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import {
  Loader2,
  MailPlus,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2,
  Users,
} from 'lucide-react';

type ManagedRole = 'editor' | 'author' | 'viewer';

interface Member {
  user_id: string;
  role: 'owner' | ManagedRole;
  display_name: string;
  email: string;
  created_at: string;
  invited_at?: string | null;
  last_sign_in_at?: string | null;
}

const roleLabels = {
  owner: 'Sahip',
  editor: 'Editör',
  author: 'Yazar',
  viewer: 'Görüntüleyici',
};

const roleDescriptions = {
  editor: 'Tüm içerik, ana sayfa, taksonomi, medya ve analitiği yönetir.',
  author: 'Kendi taslaklarını yazar ve incelemeye gönderir.',
  viewer: 'Yönetim içeriğini yalnız görüntüler.',
};

function fieldClass() {
  return 'mt-1.5 h-11 w-full rounded-xl border border-stone-300 bg-stone-50 px-3 text-sm outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 dark:border-stone-700 dark:bg-stone-950';
}

export function BlogTeamManager() {
  const [members, setMembers] = useState<Member[]>([]);
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<ManagedRole>('author');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/blog/admin/members', {
        cache: 'no-store',
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload?.error?.message || 'Ekip yüklenemedi.');
      }
      setMembers(payload.data.members);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Ekip yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/blog/admin/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, displayName, role }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error?.message || 'Davet tamamlanamadı.');
      }
      setNotice(
        payload.data.invited
          ? 'Davet e-postası gönderildi ve rol hazırlandı.'
          : 'Mevcut Supabase hesabı blog ekibine eklendi.'
      );
      setEmail('');
      setDisplayName('');
      setRole('author');
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Davet tamamlanamadı.'
      );
    } finally {
      setSaving(false);
    }
  }

  function updateLocal(
    userId: string,
    patch: Partial<Pick<Member, 'role' | 'display_name'>>
  ) {
    setMembers((current) =>
      current.map((member) =>
        member.user_id === userId ? { ...member, ...patch } : member
      )
    );
  }

  async function saveMember(member: Member) {
    setError('');
    setNotice('');
    const response = await fetch('/api/blog/admin/members', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: member.user_id,
        displayName: member.display_name,
        role: member.role,
      }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.success) {
      setError(payload?.error?.message || 'Üye güncellenemedi.');
      await load();
      return;
    }
    setNotice('Üye rolü güncellendi.');
  }

  async function removeMember(member: Member) {
    if (
      !window.confirm(
        `${member.email || member.display_name} blog ekibinden çıkarılsın mı? Supabase hesabı silinmez.`
      )
    ) {
      return;
    }
    const response = await fetch(
      `/api/blog/admin/members?userId=${encodeURIComponent(member.user_id)}`,
      { method: 'DELETE' }
    );
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.success) {
      setError(payload?.error?.message || 'Üye çıkarılamadı.');
      return;
    }
    setMembers((current) =>
      current.filter((item) => item.user_id !== member.user_id)
    );
    setNotice('Üye blog ekibinden çıkarıldı; kimlik hesabı korundu.');
  }

  return (
    <main className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700 dark:text-amber-400">
            Yetki ve erişim
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
            Blog ekibi
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600 dark:text-stone-300">
            Davetler Supabase Auth üzerinden gönderilir. Her yönetici girişte
            MFA doğrulamasını tamamlar; sahip rolü bu ekrandan devredilemez.
          </p>
        </div>
        <button type="button" onClick={() => void load()} className="inline-flex h-11 items-center gap-2 rounded-xl border border-stone-300 bg-white px-4 text-xs font-black dark:border-stone-700 dark:bg-stone-900">
          <RefreshCw className="h-4 w-4" /> Yenile
        </button>
      </div>

      {error ? <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">{error}</p> : null}
      {notice ? <p className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-900">{notice}</p> : null}

      <section className="mt-7 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900 sm:p-6">
        <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"><MailPlus className="h-5 w-5" /></span><div><h2 className="text-lg font-black">Üye davet et</h2><p className="text-xs text-stone-500">Mevcut hesap varsa e-posta göndermeden rol eklenir.</p></div></div>
        <form onSubmit={invite} className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_13rem_auto] xl:items-end">
          <label><span className="editor-label">E-posta</span><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className={fieldClass()} placeholder="yazar@example.com" /></label>
          <label><span className="editor-label">Görünen ad</span><input value={displayName} onChange={(event) => setDisplayName(event.target.value)} className={fieldClass()} placeholder="Ad Soyad" /></label>
          <label><span className="editor-label">Rol</span><select value={role} onChange={(event) => setRole(event.target.value as ManagedRole)} className={fieldClass()}><option value="editor">Editör</option><option value="author">Yazar</option><option value="viewer">Görüntüleyici</option></select></label>
          <button type="submit" disabled={saving} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-stone-950 px-5 text-xs font-black text-white disabled:opacity-50 dark:bg-amber-400 dark:text-stone-950">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <MailPlus className="h-4 w-4" />} Davet gönder</button>
        </form>
        <p className="mt-3 text-xs leading-5 text-stone-500">{roleDescriptions[role]}</p>
      </section>

      <section className="mt-6 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <div className="flex items-center justify-between border-b border-stone-200 p-5 dark:border-stone-800"><div><h2 className="text-lg font-black">Üyeler</h2><p className="mt-1 text-xs text-stone-500">{members.length} yetkili hesap</p></div><Users className="h-5 w-5 text-amber-600" /></div>
        {loading ? <div className="flex min-h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-amber-600" /></div> : <div className="divide-y divide-stone-100 dark:divide-stone-800">{members.map((member) => {
          const owner = member.role === 'owner';
          return <article key={member.user_id} className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_14rem_auto] lg:items-end"><div className="min-w-0"><div className="flex items-center gap-2"><p className="truncate font-black">{member.email || 'E-posta bulunamadı'}</p>{owner ? <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black uppercase text-amber-900 dark:bg-amber-500/15 dark:text-amber-300"><ShieldCheck className="h-3 w-3" /> Sahip</span> : null}</div><input value={member.display_name} disabled={owner} onChange={(event) => updateLocal(member.user_id, { display_name: event.target.value })} className={`${fieldClass()} max-w-md disabled:opacity-60`} placeholder="Görünen ad" /><p className="mt-2 text-[11px] text-stone-500">{member.last_sign_in_at ? `Son giriş: ${new Date(member.last_sign_in_at).toLocaleString('tr-TR')}` : member.invited_at ? 'Davet gönderildi, ilk giriş bekleniyor.' : 'Henüz giriş kaydı yok.'}</p></div><label><span className="editor-label">Rol</span><select value={member.role} disabled={owner} onChange={(event) => updateLocal(member.user_id, { role: event.target.value as ManagedRole })} className={`${fieldClass()} disabled:opacity-60`}>{owner ? <option value="owner">Sahip</option> : null}<option value="editor">Editör</option><option value="author">Yazar</option><option value="viewer">Görüntüleyici</option></select></label><div className="flex gap-2">{owner ? null : <><button type="button" onClick={() => void saveMember(member)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-950 text-white dark:bg-amber-400 dark:text-stone-950" aria-label="Üye değişikliklerini kaydet"><Save className="h-4 w-4" /></button><button type="button" onClick={() => void removeMember(member)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-700" aria-label="Üyeyi çıkar"><Trash2 className="h-4 w-4" /></button></>}</div></article>;
        })}</div>}
      </section>
    </main>
  );
}

'use client';

import { FormEvent, useState } from 'react';
import { ArrowRight, CheckCircle2, Loader2, Mail } from 'lucide-react';
import Link from 'next/link';

export function BlogNewsletterForm({
  compact = false,
  source = 'blog-home',
  postId,
}: {
  compact?: boolean;
  source?: string;
  postId?: string;
}) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>(
    'idle'
  );
  const [message, setMessage] = useState('');

  async function subscribe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState('loading');
    setMessage('');
    try {
      const response = await fetch('/api/blog/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source, ...(postId ? { postId } : {}) }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || payload?.success !== true) {
        throw new Error(
          payload?.error?.message || 'Kayıt şu anda tamamlanamadı.'
        );
      }
      setState('success');
      setMessage(
        payload.data?.message ||
          'Adres kayıt için uygunsa doğrulama bağlantısı gönderildi.'
      );
      setEmail('');
    } catch (error) {
      setState('error');
      setMessage(
        error instanceof Error ? error.message : 'Kayıt tamamlanamadı.'
      );
    }
  }

  if (state === 'success') {
    return (
      <div
        className="flex items-start gap-3 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm font-semibold text-emerald-950 dark:text-emerald-200"
        role="status"
      >
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
        {message}
      </div>
    );
  }

  return (
    <form onSubmit={subscribe} className={compact ? 'space-y-2' : 'space-y-3'}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="min-w-0 flex-1">
          <span className="mb-2 block text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-stone-400">
            E-posta adresiniz
          </span>
          <span className="relative block">
            <Mail className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-stone-600 dark:text-stone-400" />
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="eposta@adresiniz.com"
              className="blog-focus-ring h-12 w-full rounded-xl border border-stone-300 bg-white pl-11 pr-4 text-sm font-medium text-stone-950 outline-none transition-colors placeholder:text-stone-600 focus:border-amber-500 dark:border-stone-700 dark:bg-stone-950 dark:text-white dark:placeholder:text-stone-400"
            />
          </span>
        </label>
        <button
          type="submit"
          disabled={state === 'loading'}
          className="blog-focus-ring inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 text-sm font-bold text-stone-950 transition-colors hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {state === 'loading' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowRight className="h-4 w-4" />
          )}
          Bültene katıl
        </button>
      </div>
      <p className="text-[11px] leading-5 text-stone-400">
        Kaydı e-postanızdaki bağlantıyla doğrularsınız. İstediğiniz anda tek
        tıkla ayrılabilirsiniz.{' '}
        <Link href="/gizlilik" className="blog-focus-ring rounded font-bold text-stone-200 underline underline-offset-2">
          Gizlilik
        </Link>
      </p>
      {state === 'error' ? (
        <p className="text-xs font-semibold text-red-700 dark:text-red-300" role="alert">
          {message}
        </p>
      ) : null}
    </form>
  );
}

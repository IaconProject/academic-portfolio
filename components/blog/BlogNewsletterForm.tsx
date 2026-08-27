'use client';

import { FormEvent, useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
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
        className="flex items-start gap-3 border border-emerald-700/30 bg-emerald-50 p-4 text-sm font-semibold text-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-200"
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
          <span className="mb-2 block text-sm text-stone-600 dark:text-stone-400">
            E-posta adresiniz
          </span>
          <span className="block">
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="eposta@adresiniz.com"
              className="blog-focus-ring h-12 w-full border border-stone-400 bg-[#fffdf8] px-4 text-sm text-stone-950 outline-none transition-colors placeholder:text-stone-500 focus:border-stone-900 dark:border-stone-700 dark:bg-stone-950 dark:text-white dark:placeholder:text-stone-500"
            />
          </span>
        </label>
        <button
          type="submit"
          disabled={state === 'loading'}
          className="blog-focus-ring inline-flex h-12 shrink-0 items-center justify-center gap-2 bg-stone-900 px-6 text-sm font-semibold text-white transition-colors hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-stone-100 dark:text-stone-950 dark:hover:bg-amber-300"
        >
          {state === 'loading' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : null}
          Bültene katıl
        </button>
      </div>
      <p className="text-[11px] leading-5 text-stone-500 dark:text-stone-500">
        Kaydı e-postanızdaki bağlantıyla doğrularsınız. İstediğiniz anda tek
        tıkla ayrılabilirsiniz.{' '}
        <Link href="/gizlilik" className="blog-focus-ring font-semibold text-stone-700 underline underline-offset-2 dark:text-stone-300">
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

import type { Metadata } from 'next';
import Link from 'next/link';
import { MailX, ShieldAlert } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Bülten aboneliğinden ayrıl',
  robots: { index: false, follow: false, noarchive: true },
};

export default async function NewsletterUnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = '' } = await searchParams;
  const validToken = /^[A-Za-z0-9_-]{40,100}$/.test(token);

  return (
    <main id="blog-content" className="flex flex-1 items-center justify-center px-4 py-20 sm:px-6">
      <section className="w-full max-w-xl rounded-[2rem] border border-stone-200 bg-white p-8 text-center shadow-xl shadow-stone-950/5 dark:border-stone-800 dark:bg-stone-900 sm:p-12">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
          {validToken ? (
            <MailX className="h-8 w-8" />
          ) : (
            <ShieldAlert className="h-8 w-8" />
          )}
        </span>
        <h1 className="mt-6 text-3xl font-black tracking-tight">
          {validToken
            ? 'Bülten aboneliğinden ayrılın'
            : 'Bağlantı geçerli değil'}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-stone-600 dark:text-stone-300">
          {validToken
            ? 'Onayladığınızda bu adrese yeni bülten gönderilmeyecek. Daha sonra aynı formdan yeniden katılabilirsiniz.'
            : 'E-postadaki abonelikten ayrılma bağlantısını eksiksiz açtığınızdan emin olun.'}
        </p>
        {validToken ? (
          <form
            method="post"
            action="/api/blog/newsletter/unsubscribe"
            className="mt-7"
          >
            <input type="hidden" name="token" value={token} />
            <button
              type="submit"
              className="inline-flex rounded-xl bg-stone-950 px-5 py-3 text-sm font-black text-white transition hover:bg-stone-800 dark:bg-amber-400 dark:text-stone-950 dark:hover:bg-amber-300"
            >
              Aboneliğimi sonlandır
            </button>
          </form>
        ) : null}
        <Link
          href="/blog"
          className="mt-5 block text-sm font-bold text-stone-500 hover:text-amber-700 dark:hover:text-amber-400"
        >
          Bloga dön
        </Link>
      </section>
    </main>
  );
}

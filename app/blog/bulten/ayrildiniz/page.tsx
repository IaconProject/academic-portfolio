import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, ShieldAlert } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Bülten aboneliği',
  robots: { index: false, follow: false, noarchive: true },
};

export default async function NewsletterUnsubscribedPage({
  searchParams,
}: {
  searchParams: Promise<{ durum?: string }>;
}) {
  const { durum } = await searchParams;
  const success = durum === 'basarili';
  const Icon = success ? CheckCircle2 : ShieldAlert;

  return (
    <main id="blog-content" className="flex flex-1 items-center justify-center px-4 py-20 sm:px-6">
      <section className="w-full max-w-xl rounded-[2rem] border border-stone-200 bg-white p-8 text-center shadow-xl shadow-stone-950/5 dark:border-stone-800 dark:bg-stone-900 sm:p-12">
        <span
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ${
            success
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
              : 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300'
          }`}
        >
          <Icon className="h-8 w-8" />
        </span>
        <h1 className="mt-6 text-3xl font-black tracking-tight">
          {success
            ? 'Bülten aboneliğiniz sonlandırıldı'
            : 'Abonelik bağlantısı doğrulanamadı'}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-stone-600 dark:text-stone-300">
          {success
            ? 'Bu adrese yeni bülten gönderilmeyecek. Fikrinizi değiştirirseniz yeniden katılabilirsiniz.'
            : 'İşlem tamamlanmadı. Sorun devam ederse site iletişim kanalını kullanabilirsiniz.'}
        </p>
        <Link
          href="/blog"
          className="mt-7 inline-flex rounded-xl bg-amber-400 px-5 py-3 text-sm font-black text-stone-950 transition hover:bg-amber-300"
        >
          Blog ana sayfasına dön
        </Link>
      </section>
    </main>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { Check, Share2 } from 'lucide-react';

export function BlogReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const update = () => {
      const article = document.querySelector<HTMLElement>('[data-blog-article]');
      if (!article) return;
      const rect = article.getBoundingClientRect();
      const start = window.scrollY + rect.top;
      const distance = Math.max(1, article.offsetHeight - window.innerHeight);
      const next = Math.min(1, Math.max(0, (window.scrollY - start) / distance));
      setProgress(next * 100);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 bg-transparent"
      aria-hidden="true"
    >
      <div
        className="h-full bg-amber-500 transition-[width] duration-100 motion-reduce:transition-none"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

export function BlogShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button
      type="button"
      onClick={share}
      className="blog-focus-ring inline-flex h-11 items-center gap-2 rounded-xl border border-stone-300 bg-white px-3 text-xs font-bold text-stone-700 transition-colors hover:border-stone-500 hover:text-stone-950 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:border-stone-500"
      aria-live="polite"
    >
      {copied ? (
        <Check className="h-4 w-4 text-emerald-600" />
      ) : (
        <Share2 className="h-4 w-4" />
      )}
      {copied ? 'Bağlantı kopyalandı' : 'Paylaş'}
    </button>
  );
}

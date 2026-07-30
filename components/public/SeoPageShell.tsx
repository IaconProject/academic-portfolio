import Link from 'next/link';
import { ArrowLeft, Home } from 'lucide-react';
import { PortfolioData } from '@/lib/types';

interface SeoPageShellProps {
  data: PortfolioData;
  title: string;
  description?: string;
  eyebrow?: string;
  breadcrumbs?: Array<{ label: string; href: string }>;
  children: React.ReactNode;
}

export function StructuredData({ value }: { value: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(value).replace(/</g, '\\u003c'),
      }}
    />
  );
}

export function SeoPageShell({
  data,
  title,
  description,
  eyebrow,
  breadcrumbs = [],
  children,
}: SeoPageShellProps) {
  return (
    <div className="min-h-screen bg-[#f7f5f0] text-[#24211e]">
      <header className="border-b border-[#ded9cb] bg-[#1c2128] text-[#f0ebe1]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-5 px-5 py-5 md:px-8">
          <Link href="/" className="group min-w-0">
            <span className="block truncate font-serif text-lg font-bold tracking-tight">
              {data.profile.fullName}
            </span>
            <span className="block truncate text-xs text-[#adbac7]">
              {data.profile.title}
            </span>
          </Link>
          <nav aria-label="Ana menü" className="flex items-center gap-1 text-xs font-semibold">
            <Link className="rounded-lg px-3 py-2 hover:bg-white/10" href="/yayinlar">
              Yayınlar
            </Link>
            <Link className="rounded-lg px-3 py-2 hover:bg-white/10" href="/projeler">
              Projeler
            </Link>
            <Link className="rounded-lg px-3 py-2 hover:bg-white/10" href="/yazilar">
              Yazılar
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-10 md:px-8 md:py-14">
        <nav aria-label="İçerik yolu" className="mb-8 flex flex-wrap items-center gap-2 text-xs text-[#78716c]">
          <Link href="/" className="inline-flex items-center gap-1 hover:text-[#24211e]">
            <Home className="h-3.5 w-3.5" />
            Ana Sayfa
          </Link>
          {breadcrumbs.map((item) => (
            <span key={item.href} className="inline-flex items-center gap-2">
              <span aria-hidden="true">/</span>
              <Link href={item.href} className="hover:text-[#24211e]">
                {item.label}
              </Link>
            </span>
          ))}
        </nav>

        <header className="mb-10 max-w-3xl">
          {eyebrow && (
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-amber-700">
              {eyebrow}
            </p>
          )}
          <h1 className="font-serif text-4xl font-bold leading-tight tracking-tight md:text-5xl">
            {title}
          </h1>
          {description && (
            <p className="mt-5 text-base leading-8 text-[#57534e] md:text-lg">
              {description}
            </p>
          )}
        </header>

        {children}

        <div className="mt-12 border-t border-[#ded9cb] pt-7">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-bold text-[#24211e] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Akademik özgeçmişe dön
          </Link>
        </div>
      </main>

      <footer className="border-t border-[#ded9cb] px-5 py-8 text-center text-xs text-[#78716c]">
        © {new Date().getFullYear()} {data.profile.fullName}
        <span aria-hidden="true"> · </span>
        <Link href="/gizlilik" className="underline underline-offset-2">Gizlilik ve çerezler</Link>
      </footer>
    </div>
  );
}

export function RichText({ content }: { content?: string }) {
  const blocks = (content || '')
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (!blocks.length) return null;

  return (
    <div className="space-y-5 text-[15px] leading-8 text-[#45403b] md:text-base">
      {blocks.map((block, index) => {
        if (block.startsWith('### ')) {
          return (
            <h3 key={index} className="pt-3 font-serif text-xl font-bold text-[#24211e]">
              {block.slice(4)}
            </h3>
          );
        }
        if (block.startsWith('## ')) {
          return (
            <h2 key={index} className="pt-4 font-serif text-2xl font-bold text-[#24211e]">
              {block.slice(3)}
            </h2>
          );
        }
        if (block.split('\n').every((line) => line.startsWith('- '))) {
          return (
            <ul key={index} className="list-disc space-y-2 pl-6">
              {block.split('\n').map((line) => (
                <li key={line}>{line.slice(2)}</li>
              ))}
            </ul>
          );
        }
        return <p key={index}>{block}</p>;
      })}
    </div>
  );
}

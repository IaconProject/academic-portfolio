import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowLeft, Home } from 'lucide-react';
import { PortfolioData } from '@/lib/types';
import { DesktopSidebar } from '@/components/public/DesktopSidebar';
import { MobileHeader } from '@/components/public/MobileHeader';

interface SeoPageShellProps {
  data: PortfolioData;
  title: string;
  description?: string;
  eyebrow?: string;
  breadcrumbs?: Array<{ label: string; href: string }>;
  currentArchive?: '/yayinlar' | '/projeler' | '/yazilar';
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
  currentArchive,
  children,
}: SeoPageShellProps) {
  const isArchiveIndex = breadcrumbs.length === 0;

  return (
    <div className="flex min-h-screen flex-col bg-academic-bg font-sans text-academic-ink antialiased transition-colors duration-300 selection:bg-academic-accent-soft">
      <DesktopSidebar
        profile={data.profile}
        pageContext="subpage"
        currentArchive={currentArchive}
      />
      <MobileHeader
        pageContext="subpage"
        currentArchive={currentArchive}
      />

      <div className="flex w-full flex-1 flex-col items-center lg:pl-72">
        <main className="w-full max-w-4xl px-4 pb-32 pt-20 sm:px-6 md:px-8 lg:px-12 lg:pt-16">
          <nav
            aria-label="İçerik yolu"
            className="mb-6 flex flex-wrap items-center gap-2 text-xs font-semibold text-academic-slate"
          >
            <Link href="/" className="inline-flex items-center gap-1 hover:text-academic-ink">
              <Home className="h-3.5 w-3.5" />
              Ana Sayfa
            </Link>
            {breadcrumbs.map((item) => (
              <span key={item.href} className="inline-flex items-center gap-2">
                <span aria-hidden="true">/</span>
                <Link href={item.href} className="hover:text-academic-ink">
                  {item.label}
                </Link>
              </span>
            ))}
          </nav>

          <header
            className={
              'mb-8 rounded-2xl border border-academic-border bg-academic-surface p-6 shadow-sm md:p-8 ' +
              (isArchiveIndex ? 'text-center' : 'text-left')
            }
          >
            <div className={isArchiveIndex ? 'mx-auto max-w-2xl' : 'max-w-3xl'}>
              {eyebrow && (
                <p className="mb-3 text-[11px] font-black uppercase tracking-[0.22em] text-academic-accent">
                  {eyebrow}
                </p>
              )}
              <h1 className="text-balance font-serif text-3xl font-bold leading-tight tracking-tight text-academic-ink sm:text-4xl md:text-[2.75rem]">
                {title}
              </h1>
              {description && (
                <p className="mt-4 text-sm leading-7 text-academic-slate sm:text-base sm:leading-8">
                  {description}
                </p>
              )}
            </div>
          </header>

          {children}

          <div className="mt-12 border-t border-academic-border pt-7">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-bold text-academic-ink hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Akademik özgeçmişe dön
            </Link>
          </div>

          <footer className="mt-12 border-t border-academic-border py-6 text-center text-xs font-medium text-academic-slate">
            © {new Date().getFullYear()} {data.profile.fullName}
            <span aria-hidden="true"> · </span>
            <Link href="/gizlilik" className="underline underline-offset-2">
              Gizlilik ve çerezler
            </Link>
          </footer>
        </main>
      </div>
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
    <div className="space-y-5 text-[15px] leading-8 text-academic-slate md:text-base">
      {blocks.map((block, index) => {
        if (block.startsWith('```') && block.endsWith('```')) {
          const code = block.replace(/^```[^\n]*\n?/, '').replace(/```$/, '').trim();
          return (
            <pre key={index} className="overflow-x-auto rounded-2xl bg-[#1c2128] p-4 text-sm leading-6 text-[#e6edf3] shadow-inner">
              <code>{code}</code>
            </pre>
          );
        }
        if (block.startsWith('### ')) {
          return (
            <h3 key={index} className="pt-3 font-serif text-xl font-bold text-academic-ink">
              {renderInline(block.slice(4), `h3-${index}`)}
            </h3>
          );
        }
        if (block.startsWith('## ')) {
          return (
            <h2 key={index} className="pt-4 font-serif text-2xl font-bold text-academic-ink">
              {renderInline(block.slice(3), `h2-${index}`)}
            </h2>
          );
        }
        if (block.split('\n').every((line) => /^\d+\.\s+/.test(line))) {
          return (
            <ol key={index} className="list-decimal space-y-2 pl-6 marker:font-bold marker:text-academic-accent">
              {block.split('\n').map((line, lineIndex) => (
                <li key={`${line}-${lineIndex}`}>{renderInline(line.replace(/^\d+\.\s+/, ''), `ol-${index}-${lineIndex}`)}</li>
              ))}
            </ol>
          );
        }
        if (block.split('\n').every((line) => line.startsWith('- '))) {
          return (
            <ul key={index} className="list-disc space-y-2 pl-6">
              {block.split('\n').map((line) => (
                <li key={line}>{renderInline(line.slice(2), `ul-${index}-${line}`)}</li>
              ))}
            </ul>
          );
        }
        if (block.split('\n').every((line) => line.startsWith('> '))) {
          return (
            <blockquote key={index} className="rounded-r-2xl border-l-4 border-academic-accent bg-academic-surface-muted px-5 py-4 font-serif text-[1.05em] italic text-academic-ink">
              {renderInline(block.replace(/^> /gm, ''), `quote-${index}`)}
            </blockquote>
          );
        }
        if (/^(-{3,}|\*{3,})$/.test(block)) {
          return <hr key={index} className="my-8 border-academic-border" />;
        }
        return <p key={index}>{renderInline(block, `p-${index}`)}</p>;
      })}
    </div>
  );
}

function renderInline(value: string, keyPrefix: string): ReactNode[] {
  const tokenPattern = /(\[([^\]]+)\]\(((?:https?:\/\/|\/)[^)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`)/g;
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  let part = 0;

  while ((match = tokenPattern.exec(value)) !== null) {
    if (match.index > cursor) {
      nodes.push(withLineBreaks(value.slice(cursor, match.index), `${keyPrefix}-text-${part++}`));
    }
    if (match[2] && match[3]) {
      const external = /^https?:\/\//i.test(match[3]);
      nodes.push(
        external ? (
          <a key={`${keyPrefix}-link-${part++}`} href={match[3]} target="_blank" rel="noopener noreferrer" className="font-semibold underline decoration-academic-accent/50 underline-offset-4 hover:decoration-academic-accent">{match[2]}</a>
        ) : (
          <Link key={`${keyPrefix}-link-${part++}`} href={match[3]} className="font-semibold underline decoration-academic-accent/50 underline-offset-4 hover:decoration-academic-accent">{match[2]}</Link>
        )
      );
    } else if (match[4]) {
      nodes.push(<strong key={`${keyPrefix}-strong-${part++}`} className="font-bold text-academic-ink">{match[4]}</strong>);
    } else if (match[5]) {
      nodes.push(<em key={`${keyPrefix}-em-${part++}`}>{match[5]}</em>);
    } else if (match[6]) {
      nodes.push(<code key={`${keyPrefix}-code-${part++}`} className="rounded bg-academic-surface-muted px-1.5 py-0.5 font-mono text-[0.9em] text-academic-ink">{match[6]}</code>);
    }
    cursor = match.index + match[0].length;
  }
  if (cursor < value.length) {
    nodes.push(withLineBreaks(value.slice(cursor), `${keyPrefix}-text-${part}`));
  }
  return nodes;
}

function withLineBreaks(value: string, key: string): ReactNode {
  const lines = value.split('\n');
  if (lines.length === 1) return value;
  return lines.flatMap((line, index) => [
    index > 0 ? <br key={`${key}-br-${index}`} /> : null,
    line,
  ]);
}

import Image from 'next/image';
import type { ReactNode } from 'react';
import { isOptimizableContentImage } from '@/lib/content-images';

interface AcademicContentDetailProps {
  coverImageUrl?: string;
  coverImageAlt?: string;
  meta: string[];
  children: ReactNode;
  footer?: ReactNode;
}

export function AcademicContentDetail({
  coverImageUrl,
  coverImageAlt,
  meta,
  children,
  footer,
}: AcademicContentDetailProps) {
  return (
    <article className="overflow-hidden rounded-3xl border border-academic-border bg-academic-surface shadow-sm">
      {isOptimizableContentImage(coverImageUrl) && (
        <div className="relative aspect-[16/8] w-full overflow-hidden border-b border-academic-border bg-academic-surface-muted sm:aspect-[16/7]">
          <Image
            src={coverImageUrl!}
            alt={coverImageAlt || ''}
            fill
            priority
            sizes="(max-width: 1280px) 100vw, 1152px"
            className="object-cover"
          />
        </div>
      )}
      <div className="p-5 sm:p-8 md:p-10 lg:p-12">
        {!!meta.length && (
          <ul aria-label="İçerik bilgileri" className="mb-8 flex flex-wrap gap-2 border-b border-academic-border pb-6 text-xs font-bold text-academic-slate">
            {meta.filter(Boolean).map((item) => (
              <li key={item} className="rounded-full border border-academic-border bg-academic-surface-muted px-3 py-1.5">{item}</li>
            ))}
          </ul>
        )}
        <div className="mx-auto max-w-3xl">{children}</div>
        {footer && (
          <div className="mx-auto mt-10 max-w-3xl border-t border-academic-border pt-7">{footer}</div>
        )}
      </div>
    </article>
  );
}

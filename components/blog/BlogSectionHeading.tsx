import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function BlogSectionHeading({
  eyebrow,
  heading,
  description,
  href,
  linkLabel = 'Tümünü gör',
}: {
  eyebrow?: string;
  heading: string;
  description?: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-8 border-t border-stone-300 pt-5 dark:border-stone-700 sm:mb-10 sm:flex sm:items-end sm:justify-between sm:gap-8">
      <div className="max-w-2xl">
        {eyebrow ? (
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.17em] text-amber-800 dark:text-amber-300">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-2 text-3xl font-bold tracking-[-0.035em] text-stone-950 text-balance dark:text-white sm:text-4xl">
          {heading}
        </h2>
        {description ? (
          <p className="mt-3 text-sm leading-6 text-stone-600 dark:text-stone-300 sm:text-base sm:leading-7">
            {description}
          </p>
        ) : null}
      </div>
      {href ? (
        <Link
          href={href}
          className="blog-focus-ring mt-5 inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg text-sm font-bold text-stone-700 transition-colors hover:text-stone-950 dark:text-stone-300 dark:hover:text-white sm:mt-0"
        >
          {linkLabel}
          <ArrowRight className="h-4 w-4" />
        </Link>
      ) : null}
    </div>
  );
}

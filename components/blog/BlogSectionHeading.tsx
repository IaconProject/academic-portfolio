import Link from 'next/link';

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
    <div className="mb-9 border-t border-stone-400 pt-5 dark:border-stone-700 sm:mb-12 sm:flex sm:items-end sm:justify-between sm:gap-10">
      <div className="max-w-2xl">
        {eyebrow ? (
          <p className="text-sm text-amber-800 dark:text-amber-300">{eyebrow}</p>
        ) : null}
        <h2 className="blog-article-title mt-2 text-3xl font-medium tracking-[-0.03em] text-stone-950 text-balance dark:text-white sm:text-[2.6rem]">
          {heading}
        </h2>
        {description ? (
          <p className="mt-3 text-sm leading-7 text-stone-600 dark:text-stone-300 sm:text-base">
            {description}
          </p>
        ) : null}
      </div>
      {href ? (
        <Link
          href={href}
          className="blog-focus-ring mt-5 inline-block shrink-0 border-b border-stone-500 pb-1 text-sm font-semibold text-stone-800 transition-colors hover:border-amber-700 hover:text-amber-800 dark:text-stone-200 dark:hover:text-amber-300 sm:mt-0"
        >
          {linkLabel} →
        </Link>
      ) : null}
    </div>
  );
}

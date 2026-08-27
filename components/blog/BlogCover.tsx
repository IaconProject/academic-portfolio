import Image from 'next/image';

function supportedRemoteImage(url: string) {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === 'https:' &&
      (parsed.hostname.endsWith('.supabase.co') ||
        parsed.hostname === 'images.unsplash.com' ||
        parsed.hostname === 'www.muhammedakan.com' ||
        parsed.hostname === 'muhammedakan.com' ||
        parsed.hostname === 'lh3.googleusercontent.com')
    );
  } catch {
    return url.startsWith('/');
  }
}

export function BlogCover({
  src,
  alt,
  priority = false,
  sizes = '(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 700px',
  className = '',
}: {
  src: string;
  alt: string;
  priority?: boolean;
  sizes?: string;
  className?: string;
}) {
  if (src && supportedRemoteImage(src)) {
    return (
      <div className={`relative overflow-hidden bg-stone-200 dark:bg-stone-800 ${className}`}>
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes={sizes}
          className="object-cover transition duration-700 group-hover:scale-[1.015]"
        />
      </div>
    );
  }

  return (
    <div
      className={`relative flex overflow-hidden bg-[#d7ccb9] p-6 text-stone-800 dark:bg-[#292622] dark:text-stone-200 ${className}`}
      role="img"
      aria-label={alt}
    >
      <span className="absolute inset-4 border border-stone-700/20 dark:border-stone-100/15" aria-hidden="true" />
      <p className="blog-article-title relative mt-auto max-w-[18ch] text-xl font-medium leading-tight sm:text-2xl">
        {alt}
      </p>
    </div>
  );
}

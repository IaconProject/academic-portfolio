import Image from 'next/image';
import { Binary, BrainCircuit } from 'lucide-react';

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
          className="object-cover transition duration-700 group-hover:scale-[1.025]"
        />
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden bg-[radial-gradient(circle_at_20%_20%,rgba(245,158,11,0.35),transparent_32%),radial-gradient(circle_at_82%_78%,rgba(14,116,144,0.3),transparent_34%),linear-gradient(135deg,#171717,#292524)] ${className}`}
      role="img"
      aria-label={alt}
    >
      <Binary className="absolute -right-4 -top-4 h-36 w-36 rotate-12 text-white/[0.06]" />
      <BrainCircuit className="absolute bottom-5 left-5 h-12 w-12 text-amber-300/80" />
    </div>
  );
}

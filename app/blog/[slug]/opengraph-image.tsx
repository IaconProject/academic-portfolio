import { ImageResponse } from 'next/og';
import { getBlogPostBySlug } from '@/lib/blog/repository';

export const alt = 'Muhammed Akan Blog yazısı';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);
  const title = post?.title || 'Teknolojiyi temelden anlayın';
  const category = post?.category?.name || 'Blok zinciri · Yapay zekâ';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          overflow: 'hidden',
          background: '#171717',
          color: '#fff',
          padding: '74px 82px',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            position: 'absolute',
            width: 520,
            height: 520,
            borderRadius: 999,
            background: 'rgba(245, 158, 11, 0.22)',
            filter: 'blur(2px)',
            right: -170,
            top: -220,
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: 400,
            height: 400,
            borderRadius: 999,
            border: '2px solid rgba(34, 211, 238, 0.18)',
            left: -180,
            bottom: -240,
          }}
        />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            width: '100%',
            zIndex: 1,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              color: '#fcd34d',
              fontSize: 24,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: 3,
            }}
          >
            <span
              style={{
                display: 'flex',
                width: 16,
                height: 16,
                borderRadius: 999,
                background: '#f59e0b',
              }}
            />
            {category}
          </div>
          <div
            style={{
              display: 'flex',
              maxWidth: 980,
              fontSize: title.length > 70 ? 54 : 66,
              lineHeight: 1.04,
              fontWeight: 900,
              letterSpacing: -2.5,
            }}
          >
            {title}
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              color: '#d6d3d1',
              fontSize: 24,
              fontWeight: 700,
            }}
          >
            <span>Muhammed Akan Blog</span>
            <span style={{ color: '#fbbf24' }}>muhammedakan.com/blog</span>
          </div>
        </div>
      </div>
    ),
    size
  );
}

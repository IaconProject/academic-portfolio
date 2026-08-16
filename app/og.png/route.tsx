import { ImageResponse } from 'next/og';

export const revalidate = 300;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const title =
    url.searchParams.get('title') ||
    'Muhammed Akan';
  const subtitle =
    url.searchParams.get('subtitle') ||
    'İslam Hukuku, Yapay Zekâ ve Dijital Dönüşüm';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#1c2128',
          color: '#f4efe6',
          padding: '72px 82px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            width: 520,
            height: 520,
            right: -120,
            top: -170,
            border: '2px solid rgba(217, 119, 6, .28)',
            borderRadius: 999,
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: 390,
            height: 390,
            right: -40,
            bottom: -235,
            background: 'rgba(217, 119, 6, .13)',
            borderRadius: 999,
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 5, background: '#d97706' }} />
          <div style={{ fontSize: 23, letterSpacing: 5, textTransform: 'uppercase', color: '#d7cfc1' }}>
            Akademik Portfolyo
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 920 }}>
          <div style={{ fontFamily: 'serif', fontSize: title.length > 62 ? 56 : 70, lineHeight: 1.08, fontWeight: 700, letterSpacing: -2 }}>
            {title}
          </div>
          <div style={{ marginTop: 28, fontSize: 28, lineHeight: 1.35, color: '#c8c1b5' }}>
            {subtitle}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 20, color: '#aaa298' }}>
          <span>muhammedakan.com</span>
          <span style={{ color: '#d97706' }}>İslam Hukuku · Yapay Zekâ · Dijital Dönüşüm</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400',
      },
    }
  );
}

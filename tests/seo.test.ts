import { beforeEach, describe, expect, it } from 'vitest';
import { initialPortfolioData } from '../lib/initial-data';
import { buildSeoMetadata } from '../lib/seo-metadata';
import {
  absoluteUrl,
  buildPublicationJsonLd,
  createsRedirectLoop,
  findSeoPage,
  getSiteUrl,
  isContentPublished,
  normalizePath,
  normalizeSiteUrl,
  runDataSeoAudit,
  slugifyTurkish,
  validSameAs,
} from '../lib/seo';

beforeEach(() => {
  process.env.SITE_URL = 'https://www.muhammedakan.com';
  delete process.env.VERCEL_ENV;
});

describe('canonical URL sözleşmesi', () => {
  it('origin ve yolları normalize eder', () => {
    expect(normalizeSiteUrl('http://www.muhammedakan.com///')).toBe(
      'https://www.muhammedakan.com'
    );
    expect(getSiteUrl()).toBe('https://www.muhammedakan.com');
    expect(absoluteUrl('/yayinlar')).toBe(
      'https://www.muhammedakan.com/yayinlar'
    );
    expect(normalizePath('https://example.com/eski//yol/')).toBe('/eski/yol');
  });
});

describe('Türkçe slug', () => {
  it('Türkçe karakterleri kararlı ve URL güvenli biçime çevirir', () => {
    expect(slugifyTurkish('İslâm Hukuku, Yapay Zekâ ve Fıkıh')).toBe(
      'islam-hukuku-yapay-zeka-ve-fikih'
    );
  });

  it('aynı başlığın aynı slugı üretmesini garanti eder', () => {
    const title = 'Akıllı Sözleşmeler ve Fıkıh';
    expect(slugifyTurkish(title)).toBe(slugifyTurkish(title));
  });
});

describe('metadata önceliği ve indeksleme', () => {
  it('sayfa overrideını içerik ve site varsayılanından önce kullanır', () => {
    const data = {
      ...initialPortfolioData,
      seoPages: [
        {
          routeKey: 'article:test',
          path: '/yazilar/test',
          locale: 'tr' as const,
          title: 'Özel SEO Başlığı',
          description: 'Özel sayfa açıklaması arama sonucu için yeterince açıklayıcıdır.',
          relatedKeywords: [],
          index: true,
          follow: true,
          includeInSitemap: true,
        },
      ],
    };
    const metadata = buildSeoMetadata({
      data,
      routeKey: 'article:test',
      path: '/yazilar/test',
      title: 'İçerik Başlığı',
      description: 'İçerik açıklaması',
      type: 'article',
    });
    expect(metadata.title).toBe('Özel SEO Başlığı');
    expect(metadata.description).toContain('Özel sayfa açıklaması');
    expect(metadata.alternates?.canonical).toBe(
      'https://www.muhammedakan.com/yazilar/test'
    );
  });

  it('detay başlığında site başlık şablonunu uygular', () => {
    const metadata = buildSeoMetadata({
      data: initialPortfolioData,
      routeKey: 'article:unknown',
      path: '/yazilar/ornek',
      title: 'Örnek İçerik',
      description: 'Örnek içerik açıklaması.',
      type: 'article',
    });
    expect(metadata.title).toBe('Örnek İçerik | Muhammed Akan');
  });

  it('preview ortamını noindex yapar', () => {
    process.env.VERCEL_ENV = 'preview';
    const metadata = buildSeoMetadata({
      data: initialPortfolioData,
      routeKey: 'home',
      path: '/',
    });
    expect((metadata.robots as Record<string, unknown>).index).toBe(false);
  });
});

describe('yayın durumu, sayfa ve redirect kuralları', () => {
  it('yalnız zamanı gelen scheduled içeriği yayınlanmış kabul eder', () => {
    expect(
      isContentPublished(
        'scheduled',
        new Date(Date.now() - 60_000).toISOString()
      )
    ).toBe(true);
    expect(
      isContentPublished(
        'scheduled',
        new Date(Date.now() + 60_000).toISOString()
      )
    ).toBe(false);
  });

  it('sayfa kaydı fallback değerlerini override eder', () => {
    const page = findSeoPage(
      [
        {
          routeKey: 'publications:index',
          path: '/yayinlar',
          locale: 'tr',
          title: 'CMS Başlığı',
          relatedKeywords: [],
          index: false,
          follow: false,
          includeInSitemap: false,
        },
      ],
      'publications:index'
    );
    expect(page.title).toBe('CMS Başlığı');
    expect(page.index).toBe(false);
  });

  it('doğrudan ve dolaylı redirect döngülerini reddeder', () => {
    expect(
      createsRedirectLoop([], { fromPath: '/a', toPath: '/a' })
    ).toBe(true);
    expect(
      createsRedirectLoop(
        [
          { fromPath: '/a', toPath: '/b' },
          { fromPath: '/b', toPath: '/c' },
        ],
        { fromPath: '/c', toPath: '/a' }
      )
    ).toBe(true);
    expect(
      createsRedirectLoop([{ fromPath: '/a', toPath: '/b' }], {
        fromPath: '/c',
        toPath: '/a',
      })
    ).toBe(false);
  });
});

describe('schema ve entity güvenliği', () => {
  it('yayın türünü bibliyografik kayda göre seçer', () => {
    const chapter = buildPublicationJsonLd(
      {
        id: '1',
        type: 'Kitap Bölümü',
        title: 'Örnek Bölüm',
        year: '2026',
      },
      initialPortfolioData
    );
    expect(chapter['@type']).toBe('Chapter');
  });

  it('sameAs içine platform ana sayfası ve # eklemez', () => {
    const data = {
      ...initialPortfolioData,
      socialLinks: [
        {
          id: '1',
          platform: 'LinkedIn' as const,
          iconName: 'LinkedIn',
          url: 'https://www.linkedin.com/',
        },
        {
          id: '2',
          platform: 'ORCID' as const,
          iconName: 'ORCID',
          url: 'https://orcid.org/0000-0000-0000-0001',
        },
      ],
    };
    expect(validSameAs(data)).toEqual([
      'https://orcid.org/0000-0000-0000-0001',
    ]);
  });

  it('sağlık skorunu 40/20/20/10/10 kategorilerinden üretir', () => {
    const audit = runDataSeoAudit(initialPortfolioData);
    expect(audit.categoryScores).toBeDefined();
    expect(
      Object.values(audit.categoryScores || {}).reduce(
        (sum, value) => sum + value,
        0
      )
    ).toBe(audit.score);
  });
});

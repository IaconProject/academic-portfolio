import { describe, expect, it } from 'vitest';
import {
  looksLikeMarkdown,
  markdownToBlogHtml,
  renderBlogContentHtml,
  unwrapMarkdownDocument,
} from '../lib/blog/content';
import { prepareBlogDocument } from '../lib/blog/document';

const markdown = `# Ana bölüm

Bu metin **kalın**, *italik* ve [bağlantılı](https://example.com).

## İkinci bölüm

> Önemli bir alıntı

- Birinci madde
- İkinci madde

\`\`\`ts
const answer = 42;
\`\`\`

| Ağ | Amaç |
| --- | --- |
| Bitcoin | Mutabakat |
`;

describe('Blog Markdown içerik işleme', () => {
  it('Markdown yapısını güvenli, zengin blog HTML çıktısına dönüştürür', () => {
    const html = markdownToBlogHtml(markdown);

    expect(html).toContain('<h2>Ana bölüm</h2>');
    expect(html).toContain('<strong>kalın</strong>');
    expect(html).toContain('<em>italik</em>');
    expect(html).toContain('<blockquote>');
    expect(html).toContain('<ul>');
    expect(html).toContain('<pre><code class="language-ts">');
    expect(html).toContain('<table>');
    expect(html).toContain('target="_blank"');
  });

  it('Tiptap tarafından düz paragraf olarak kaydedilmiş Markdown içeriğini geriye dönük render eder', () => {
    const legacyHtml =
      '<p>## Blok zinciri</p><p>Bu içerik **kalın** olmalı ve [kaynağa](<a href="https://example.com">https://example.com</a>) gitmeli.</p><p>- Bitcoin<br>- Ethereum</p>';
    const legacyText =
      '## Blok zinciri\n\nBu içerik **kalın** olmalı ve [kaynağa](https://example.com) gitmeli.\n\n- Bitcoin\n- Ethereum';
    const html = renderBlogContentHtml(legacyHtml, legacyText);

    expect(html).toContain('<h2>Blok zinciri</h2>');
    expect(html).toContain('<strong>kalın</strong>');
    expect(html).toContain('<a href="https://example.com"');
    expect(html).toContain('<ul>');
    expect(html).not.toContain('## Blok zinciri');
  });

  it('kayıt sırasında Markdown başlıklarından içerik tablosu üretir', () => {
    const prepared = prepareBlogDocument(
      '<p>## Bitcoin nasıl çalışır?</p><p>Metin</p><p>### Bloklar</p>'
    );

    expect(prepared.html).toContain(
      '<h2 id="bitcoin-nasil-calisir">Bitcoin nasıl çalışır?</h2>'
    );
    expect(prepared.tableOfContents).toEqual([
      { id: 'bitcoin-nasil-calisir', text: 'Bitcoin nasıl çalışır?', level: 2 },
      { id: 'bloklar', text: 'Bloklar', level: 3 },
    ]);
  });

  it('mevcut zengin HTML içeriğini Markdown sanıp yeniden işlemez', () => {
    const html = renderBlogContentHtml(
      '<h2>Gerçek başlık</h2><p># işareti metnin bir parçası.</p>',
      'Gerçek başlık\n\n# işareti metnin bir parçası.'
    );

    expect(html).toContain('<h2>Gerçek başlık</h2>');
    expect(html).toContain('<p># işareti metnin bir parçası.</p>');
  });

  it('Markdown içindeki tehlikeli HTML ve URL şemalarını temizler', () => {
    const html = markdownToBlogHtml(
      '# Güvenli\n\n<script>alert(1)</script>\n\n[x](javascript:alert(1))'
    );

    expect(html).not.toContain('<script');
    expect(html).not.toContain('javascript:');
  });

  it('blok ve satır içi Markdown işaretlerini ayırt eder', () => {
    expect(looksLikeMarkdown('## Başlık\n\n- madde')).toBe(true);
    expect(looksLikeMarkdown('Bu **kalın** bir metin.')).toBe(true);
    expect(looksLikeMarkdown('Sade bir paragraf.')).toBe(false);
  });

  it('tamamı markdown kod çiti içinde kopyalanan belgeyi kod bloğu yerine zengin içerik yapar', () => {
    const fenced = `\`\`\`markdown
# Dış çit başlığı

Bu metin **zengin** görünmeli.
\`\`\``;
    const html = markdownToBlogHtml(fenced);

    expect(unwrapMarkdownDocument(fenced)).toBe(
      '# Dış çit başlığı\n\nBu metin **zengin** görünmeli.'
    );
    expect(html).toContain('<h2>Dış çit başlığı</h2>');
    expect(html).toContain('<strong>zengin</strong>');
    expect(html).not.toContain('<pre>');
  });

  it('önceden language-markdown kod bloğu olarak kaydedilmiş belgeyi geriye dönük dönüştürür', () => {
    const html = renderBlogContentHtml(
      '<pre><code class="language-markdown">## Eski kayıt\n\n- Bir\n- İki</code></pre>',
      '## Eski kayıt\n\n- Bir\n- İki'
    );

    expect(html).toContain('<h2>Eski kayıt</h2>');
    expect(html).toContain('<ul>');
    expect(html).not.toContain('language-markdown');
  });
});

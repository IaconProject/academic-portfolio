import sanitizeHtml from 'sanitize-html';
import { normalizeBlogContentHtml } from './content';
import { blogSlug } from './slug';

export interface PreparedBlogDocument {
  html: string;
  text: string;
  tableOfContents: Array<{ id: string; text: string; level: number }>;
  wordCount: number;
  readingMinutes: number;
}

function textFromHtml(value: string) {
  return sanitizeHtml(value, {
    allowedTags: [],
    allowedAttributes: {},
  })
    .replace(/\s+/g, ' ')
    .trim();
}

export function prepareBlogDocument(inputHtml: string): PreparedBlogDocument {
  const safeHtml = normalizeBlogContentHtml(inputHtml.slice(0, 2_000_000));
  const usedIds = new Set<string>();
  const tableOfContents: PreparedBlogDocument['tableOfContents'] = [];
  const html = safeHtml.replace(
    /<h([2-4])([^>]*)>([\s\S]*?)<\/h\1>/gi,
    (_full, rawLevel: string, rawAttributes: string, innerHtml: string) => {
      const level = Number(rawLevel);
      const headingText = textFromHtml(innerHtml).slice(0, 240);
      const existingId = rawAttributes.match(/\sid=["']([^"']+)["']/i)?.[1];
      const baseId =
        existingId && /^[a-z][a-z0-9:_-]{0,119}$/i.test(existingId)
          ? existingId
          : blogSlug(headingText) || `bolum-${tableOfContents.length + 1}`;
      let id = baseId;
      let suffix = 2;
      while (usedIds.has(id)) {
        id = `${baseId}-${suffix}`;
        suffix += 1;
      }
      usedIds.add(id);
      tableOfContents.push({ id, text: headingText, level });
      const attributesWithoutId = rawAttributes.replace(
        /\sid=["'][^"']*["']/gi,
        ''
      );
      return `<h${level}${attributesWithoutId} id="${id}">${innerHtml}</h${level}>`;
    }
  );
  const text = textFromHtml(html);
  const words = text.match(/\S+/g) || [];
  const wordCount = words.length;

  return {
    html,
    text,
    tableOfContents,
    wordCount,
    readingMinutes: Math.max(1, Math.ceil(wordCount / 200)),
  };
}

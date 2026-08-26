import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

const markdownBlockPattern =
  /(^|\n)\s{0,3}(?:#{1,6}\s+\S|>\s+\S|(?:[-+*]|\d+[.)])\s+\S|```|~~~|\|[^\n]+\|\s*\n\s*\|?\s*:?-{3,})/m;
const markdownInlinePattern =
  /(?:\*\*[^*\n]+\*\*|__[^_\n]+__|~~[^~\n]+~~|`[^`\n]+`|\[[^\]\n]+\]\((?:https?:\/\/|mailto:)[^)\s]+\))/;
const richHtmlPattern =
  /<(?:h[1-6]|blockquote|ul|ol|li|pre|table|figure|img|strong|em|s|del|details|hr)\b/i;
const markdownFencePattern =
  /^(?:```|~~~)\s*(?:markdown|md|mdx)\s*\n([\s\S]*?)\n(?:```|~~~)\s*$/i;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function plainTextToBlogHtml(value: string) {
  return value
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

export function looksLikeMarkdown(value: string) {
  const source = unwrapMarkdownDocument(value);
  return Boolean(source && (markdownBlockPattern.test(source) || markdownInlinePattern.test(source)));
}

export function unwrapMarkdownDocument(value: string) {
  const source = value.trim();
  return source.match(markdownFencePattern)?.[1]?.trim() || source;
}

function isMarkdownCodeBlockHtml(value: string) {
  const match = value.match(
    /^<pre\b[^>]*>\s*<code\b([^>]*)>[\s\S]*<\/code>\s*<\/pre>$/i
  );
  if (!match) return false;
  return /(?:class=["'][^"']*\blanguage-(?:markdown|md|mdx)\b|data-language=["'](?:markdown|md|mdx)["'])/i.test(
    match[1]
  );
}

function markdownCandidateFromHtml(value: string) {
  return sanitizeHtml(
    value
      .replace(/<br\s*\/?\s*>/gi, '\n')
      .replace(/<\/(?:p|div|h[1-6]|blockquote|li|pre|tr)>/gi, '\n\n'),
    { allowedTags: [], allowedAttributes: {} }
  )
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function sanitizeBlogHtml(value: string) {
  return sanitizeHtml(value, {
    allowedTags: [
      'p',
      'br',
      'h2',
      'h3',
      'h4',
      'h5',
      'strong',
      'em',
      's',
      'u',
      'mark',
      'blockquote',
      'ul',
      'ol',
      'li',
      'hr',
      'pre',
      'code',
      'a',
      'figure',
      'figcaption',
      'img',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
      'sup',
      'sub',
      'span',
      'div',
      'details',
      'summary',
      'label',
      'input',
    ],
    allowedAttributes: {
      '*': [
        'id',
        'class',
        'title',
        'style',
        'data-language',
        'data-type',
        'data-latex',
        'data-checked',
      ],
      a: ['href', 'target', 'rel', 'aria-label'],
      img: [
        'src',
        'alt',
        'width',
        'height',
        'loading',
        'decoding',
      ],
      th: ['scope', 'colspan', 'rowspan'],
      td: ['colspan', 'rowspan'],
      ol: ['start'],
      input: ['type', 'checked', 'disabled'],
    },
    allowedStyles: {
      '*': {
        'text-align': [/^(left|right|center|justify)$/],
      },
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: {
      img: ['https'],
    },
    allowProtocolRelative: false,
    transformTags: {
      h1: 'h2',
      del: 's',
      a: (_tagName, attributes) => {
        const href = attributes.href || '';
        const external = /^https?:\/\//i.test(href);
        return {
          tagName: 'a',
          attribs: {
            ...attributes,
            ...(external
              ? { target: '_blank', rel: 'noopener noreferrer' }
              : {}),
          },
        };
      },
      img: (_tagName, attributes) => ({
        tagName: 'img',
        attribs: {
          ...attributes,
          loading: attributes.loading || 'lazy',
          decoding: 'async',
        },
      }),
    },
  });
}

export function markdownToBlogHtml(value: string) {
  const rendered = marked.parse(unwrapMarkdownDocument(value), {
    async: false,
    breaks: false,
    gfm: true,
  });
  return sanitizeBlogHtml(rendered);
}

export function normalizeBlogContentHtml(value: string, fallbackText = '') {
  const source = value.trim();
  if (!source) {
    return fallbackText.trim()
      ? looksLikeMarkdown(fallbackText)
        ? markdownToBlogHtml(fallbackText)
        : plainTextToBlogHtml(fallbackText)
      : '';
  }

  if (!richHtmlPattern.test(source) || isMarkdownCodeBlockHtml(source)) {
    const markdownCandidate = fallbackText.trim() || markdownCandidateFromHtml(source);
    if (looksLikeMarkdown(markdownCandidate)) {
      return markdownToBlogHtml(markdownCandidate);
    }
  }

  return sanitizeBlogHtml(source);
}

export function renderBlogContentHtml(contentHtml: string, contentText: string) {
  return normalizeBlogContentHtml(contentHtml, contentText);
}

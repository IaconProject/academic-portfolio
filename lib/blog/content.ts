import sanitizeHtml from 'sanitize-html';

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

export function renderBlogContentHtml(contentHtml: string, contentText: string) {
  const source = contentHtml.trim()
    ? contentHtml
    : plainTextToBlogHtml(contentText);
  return sanitizeBlogHtml(source);
}

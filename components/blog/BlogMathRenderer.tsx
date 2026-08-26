'use client';

import { useEffect } from 'react';
import katex from 'katex';

export function BlogMathRenderer() {
  useEffect(() => {
    document
      .querySelectorAll<HTMLElement>('[data-blog-article] [data-latex]')
      .forEach((element) => {
        const latex = element.dataset.latex;
        if (!latex || element.dataset.mathRendered === 'true') return;
        try {
          katex.render(latex, element, {
            displayMode: element.dataset.type === 'block-math',
            throwOnError: false,
            strict: 'warn',
          });
          element.dataset.mathRendered = 'true';
          element.classList.add('tiptap-mathematics-render');
        } catch {
          element.textContent = latex;
        }
      });
  }, []);

  return null;
}

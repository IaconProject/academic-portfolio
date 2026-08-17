import { z } from 'zod';
import { normalizeOptionalUrl } from './admin-content-utils';
import { safeHttpUrl } from './url-security';

export const optionalUrlSchema = z.preprocess(
  normalizeOptionalUrl,
  z.union([
    z.literal(''),
    z
      .string()
      .url('Geçerli bir http/https URL girin veya alanı boş bırakın.')
      .refine((value) => Boolean(safeHttpUrl(value)), {
        message: 'Yalnızca http veya https ile başlayan güvenli bir URL girin.',
      }),
  ])
);

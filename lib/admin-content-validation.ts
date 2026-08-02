import { z } from 'zod';
import { normalizeOptionalUrl } from './admin-content-utils';

export const optionalUrlSchema = z.preprocess(
  normalizeOptionalUrl,
  z.union([
    z.literal(''),
    z.string().url('Geçerli bir http/https URL girin veya alanı boş bırakın.'),
  ])
);

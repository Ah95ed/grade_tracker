import { z } from 'zod';
import { LIMITS } from '../config/constants';

export const safeIdSchema = z
  .string()
  .trim()
  .min(1, 'المعرف مطلوب')
  .max(128, 'المعرف طويل جداً')
  .regex(/^[\w\-.:@]+$/, 'المعرف يحتوي على أحرف غير مسموح بها');

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(LIMITS.MAX_PAGE_LIMIT).default(LIMITS.DEFAULT_PAGE_LIMIT),
  offset: z.coerce.number().int().min(0).default(0),
});

export const syncQuerySchema = z.object({
  since: z.string().trim().max(64).optional(),
  includeDeleted: z
    .enum(['true', 'false', '1', '0'])
    .optional()
    .transform((v) => v !== 'false' && v !== '0'),
});

export const ROUNDING_MODES = ['none', 'half_up', 'any_fraction', 'custom_threshold'] as const;
export const roundingModeSchema = z.enum(ROUNDING_MODES);

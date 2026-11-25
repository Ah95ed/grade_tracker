import { z } from 'zod';
import { LIMITS } from '../config/constants';
import { roundingModeSchema, safeIdSchema } from './common';

export const termUpsertSchema = z.object({
  id: safeIdSchema.optional(),
  name: z.string().trim().min(1, 'اسم الفصل مطلوب').max(200),
  subject: z.string().trim().max(200).optional().default(''),
  gradeLevel: z.string().trim().max(100).optional().default(''),
  teacherName: z.string().trim().max(200).optional().default(''),
  assignedSections: z.array(z.string().trim().max(50)).max(100).nullable().optional(),
  calculationMode: z.enum(['average', 'single', 'sum']).default('average'),
  notes: z.string().trim().max(2000).optional().default(''),
  roundingMode: roundingModeSchema.nullable().optional(),
  roundingThreshold: z.number().min(0).max(1).nullable().optional(),
  sourceType: z.enum(['models', 'terms']).optional().default('models'),
  selectedModelIds: z.array(safeIdSchema).max(LIMITS.MAX_MODELS).optional().default([]),
  selectedTermIds: z.array(safeIdSchema).max(LIMITS.MAX_TERMS).nullable().optional(),
  version: z.number().int().min(1).optional(),
  updatedAt: z.string().trim().max(64).optional(),
});

export const termPatchSchema = termUpsertSchema.partial();

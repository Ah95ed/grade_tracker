import { z } from 'zod';
import { LIMITS } from '../config/constants';
import { safeIdSchema } from './common';

export const studentUpsertSchema = z.object({
  id: safeIdSchema.optional(),
  name: z.string().trim().min(1, 'اسم الطالب مطلوب').max(300),
  gradeLevel: z.string().trim().max(100).optional().default(''),
  section: z.string().trim().max(50).optional().default(''),
  version: z.number().int().min(1).optional(),
  updatedAt: z.string().trim().max(64).optional(),
});

export const studentPatchSchema = studentUpsertSchema.partial();

export const studentBulkUpsertSchema = z.object({
  students: z
    .array(
      studentUpsertSchema.extend({
        id: safeIdSchema,
      })
    )
    .min(1)
    .max(LIMITS.MAX_STUDENTS_PER_REQUEST),
});

import { z } from 'zod';
import { LIMITS } from '../config/constants';
import { safeIdSchema } from './common';
import { monthlyModelUpsertSchema } from './model.schema';
import { teacherProfileUpsertSchema } from './profile.schema';
import { studentRecordUpsertSchema } from './record.schema';
import { studentUpsertSchema } from './student.schema';
import { termUpsertSchema } from './term.schema';

export const syncPushSchema = z.object({
  clientSyncTime: z.string().trim().max(64).optional(),
  profile: teacherProfileUpsertSchema.nullable().optional(),
  models: z
    .array(
      monthlyModelUpsertSchema.extend({
        id: safeIdSchema,
      })
    )
    .max(LIMITS.MAX_MODELS)
    .optional()
    .default([]),
  students: z
    .array(
      studentUpsertSchema.extend({
        id: safeIdSchema,
      })
    )
    .max(LIMITS.MAX_STUDENTS_PER_REQUEST)
    .optional()
    .default([]),
  records: z.array(studentRecordUpsertSchema).max(LIMITS.MAX_RECORDS_PER_REQUEST).optional().default([]),
  terms: z
    .array(
      termUpsertSchema.extend({
        id: safeIdSchema,
      })
    )
    .max(LIMITS.MAX_TERMS)
    .optional()
    .default([]),
  deletes: z
    .object({
      modelIds: z.array(safeIdSchema).max(LIMITS.MAX_MODELS).optional().default([]),
      studentIds: z.array(safeIdSchema).max(LIMITS.MAX_STUDENTS_PER_REQUEST).optional().default([]),
      termIds: z.array(safeIdSchema).max(LIMITS.MAX_TERMS).optional().default([]),
      columnIds: z.array(safeIdSchema).max(LIMITS.MAX_MODELS * LIMITS.MAX_COLUMNS).optional().default([]),
      records: z
        .array(
          z.object({
            studentId: safeIdSchema,
            modelId: safeIdSchema,
          })
        )
        .max(LIMITS.MAX_RECORDS_PER_REQUEST)
        .optional()
        .default([]),
    })
    .optional()
    .default({}),
});

export const legacySnapshotSchema = z.object({
  profile: teacherProfileUpsertSchema.nullable().optional(),
  models: z
    .array(
      monthlyModelUpsertSchema.extend({
        id: safeIdSchema,
        students: z
          .array(
            z.object({
              id: safeIdSchema,
              name: z.string().trim().max(300),
              gradeLevel: z.string().trim().max(100).optional().default(''),
              section: z.string().trim().max(50).optional().default(''),
              writtenRawScore: z.number().min(-100000).max(100000).nullable().optional().default(null),
              scores: z.record(z.string().max(128), z.number().min(-100000).max(100000).nullable()).default({}),
              notes: z.string().trim().max(2000).optional().default(''),
              participationHistory: z.record(z.string().max(128), z.array(z.any())).nullable().optional(),
              attendanceRecords: z.record(z.string().max(128), z.array(z.any())).nullable().optional(),
            })
          )
          .max(LIMITS.MAX_STUDENTS_PER_REQUEST)
          .optional()
          .default([]),
      })
    )
    .max(LIMITS.MAX_MODELS)
    .optional()
    .default([]),
  terms: z
    .array(
      termUpsertSchema.extend({
        id: safeIdSchema,
      })
    )
    .max(LIMITS.MAX_TERMS)
    .optional()
    .default([]),
});

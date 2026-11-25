import { z } from 'zod';
import { LIMITS } from '../config/constants';
import { roundingModeSchema, safeIdSchema } from './common';

export const attendanceStatusRuleSchema = z.object({
  action: z.enum(['none', 'add', 'deduct']),
  points: z.number().min(0).max(1000),
});

export const attendanceColumnConfigSchema = z.object({
  affectsGrade: z.boolean(),
  present: attendanceStatusRuleSchema,
  excused: attendanceStatusRuleSchema,
  absent: attendanceStatusRuleSchema,
  importedFromModelIds: z.array(safeIdSchema).max(50).optional(),
});

export const customColumnSchema = z.object({
  id: safeIdSchema,
  name: z.string().trim().min(1).max(200),
  maxScore: z.number().min(0).max(100000).default(10),
  orderIndex: z.number().int().min(0).max(1000).optional(),
  isAttendance: z.boolean().optional(),
  attendanceConfig: attendanceColumnConfigSchema.nullable().optional(),
});

export const finalScoreOperationSchema = z.object({
  type: z.enum(['none', 'divide', 'multiply', 'add', 'subtract']),
  value: z.number().min(-100000).max(100000),
});

export const columnLabelsSchema = z.object({
  studentName: z.string().trim().max(100).optional(),
  gradeLevel: z.string().trim().max(100).optional(),
  section: z.string().trim().max(100).optional(),
  writtenExam: z.string().trim().max(100).optional(),
  finalScore: z.string().trim().max(100).optional(),
  rating: z.string().trim().max(100).optional(),
});

export const monthlyModelUpsertSchema = z.object({
  id: safeIdSchema.optional(),
  name: z.string().trim().min(1).max(200),
  subject: z.string().trim().max(200).default(''),
  gradeLevel: z.string().trim().max(100).optional().default(''),
  teacherName: z.string().trim().max(200).optional().default(''),
  assignedSections: z.array(z.string().trim().max(50)).max(100).nullable().optional(),
  academicYear: z.string().trim().max(50).default(''),
  totalMaxScore: z.number().min(0).max(100000).default(100),
  writtenWeight: z.number().min(0).max(100).nullable().optional(),
  writtenMaxScore: z.number().min(0).max(100000).default(100),
  writtenScoreMode: z.enum(['relative', 'raw']).nullable().optional(),
  roundingMode: roundingModeSchema.nullable().optional(),
  roundingThreshold: z.number().min(0).max(1).nullable().optional(),
  finalScoreOperation: finalScoreOperationSchema.nullable().optional(),
  columnLabels: columnLabelsSchema.nullable().optional(),
  customColumns: z.array(customColumnSchema).max(LIMITS.MAX_COLUMNS).optional(),
  version: z.number().int().min(1).optional(),
  updatedAt: z.string().trim().max(64).optional(),
});

export const monthlyModelPatchSchema = monthlyModelUpsertSchema.partial();

export const replaceModelColumnsSchema = z.object({
  columns: z.array(customColumnSchema).max(LIMITS.MAX_COLUMNS),
});

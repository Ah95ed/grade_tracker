import { z } from 'zod';
import { LIMITS } from '../config/constants';
import { safeIdSchema } from './common';

export const participationRecordSchema = z.object({
  date: z.string().trim().max(40),
  percentage: z.number().min(0).max(100),
  answersCount: z.number().int().min(0).max(1000).optional(),
  totalQuestions: z.number().int().min(0).max(1000).optional(),
  lessonTitle: z.string().trim().max(200).optional(),
});

export const attendanceRecordSchema = z.object({
  id: safeIdSchema,
  date: z.string().trim().max(40),
  dayName: z.string().trim().max(40),
  status: z.enum(['present', 'excused', 'absent']),
  note: z.string().trim().max(500).optional(),
  createdAt: z.string().trim().max(64).optional(),
  modelId: safeIdSchema.optional(),
  modelName: z.string().trim().max(200).optional(),
});

export const studentRecordUpsertSchema = z.object({
  studentId: safeIdSchema,
  modelId: safeIdSchema,
  writtenRawScore: z.number().min(-100000).max(100000).nullable().optional().default(null),
  scores: z.record(z.string().max(128), z.number().min(-100000).max(100000).nullable()).default({}),
  notes: z.string().trim().max(2000).optional().default(''),
  participationHistory: z.record(z.string().max(128), z.array(participationRecordSchema)).nullable().optional(),
  attendanceRecords: z.record(z.string().max(128), z.array(attendanceRecordSchema)).nullable().optional(),
  version: z.number().int().min(1).optional(),
  updatedAt: z.string().trim().max(64).optional(),
});

export const studentRecordBulkSchema = z.object({
  records: z.array(studentRecordUpsertSchema).min(1).max(LIMITS.MAX_RECORDS_PER_REQUEST),
});

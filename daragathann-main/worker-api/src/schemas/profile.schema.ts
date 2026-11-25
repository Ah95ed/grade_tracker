import { z } from 'zod';
import { INSTITUTION_TYPES } from '../config/constants';

export const teacherProfileUpsertSchema = z.object({
  teacherName: z.string().trim().max(200).default(''),
  schoolName: z.string().trim().max(200).default(''),
  subject: z.string().trim().max(200).default(''),
  academicYear: z.string().trim().max(50).default(''),
  governorate: z.string().trim().max(100).optional().default(''),
  institutionType: z.enum(INSTITUTION_TYPES).optional().default('school'),
  universityName: z.string().trim().max(200).optional().default(''),
  collegeName: z.string().trim().max(200).optional().default(''),
  departmentName: z.string().trim().max(200).optional().default(''),
});

export type TeacherProfileInput = z.infer<typeof teacherProfileUpsertSchema>;

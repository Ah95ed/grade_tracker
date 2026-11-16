import { relations } from 'drizzle-orm';
import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  doublePrecision,
  timestamp,
  jsonb,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// Users table (mapped from Firebase Auth UID)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  userRole: text('user_role').default('teacher'),
  institutionType: text('institution_type').default('school').notNull(),
  isAdmin: boolean('is_admin').default(false).notNull(),
  subscriptionType: text('subscription_type').default('monthly').notNull(),
  subscriptionStatus: text('subscription_status').default('active').notNull(),
  expiresAt: timestamp('expires_at'),
  lastActiveAt: timestamp('last_active_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Teacher Profile table
export const teacherProfiles = pgTable('teacher_profiles', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid')
    .notNull()
    .references(() => users.uid, { onDelete: 'cascade' }),
  teacherName: text('teacher_name').notNull(),
  schoolName: text('school_name').notNull(),
  subject: text('subject').notNull(),
  academicYear: text('academic_year').notNull(),
  governorate: text('governorate'),
  institutionType: text('institution_type').default('school'),
  universityName: text('university_name'),
  collegeName: text('college_name'),
  departmentName: text('department_name'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Monthly Models table
export const monthlyModels = pgTable('monthly_models', {
  id: text('id').primaryKey(), // e.g. "month-1728000000"
  userUid: text('user_uid')
    .notNull()
    .references(() => users.uid, { onDelete: 'cascade' }),
  name: text('name').notNull(), // e.g. "الشهر الأول"
  subject: text('subject').notNull(),
  academicYear: text('academic_year').notNull(),
  totalMaxScore: integer('total_max_score').notNull().default(100),
  writtenWeight: integer('written_weight'), // Nullable; null defaults to 100%
  writtenMaxScore: integer('written_max_score').notNull().default(100),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Custom Columns for Monthly Models (Oral, Behavior, Homework, etc.)
export const customColumns = pgTable('custom_columns', {
  id: text('id').primaryKey(), // e.g. "col-1"
  modelId: text('model_id')
    .notNull()
    .references(() => monthlyModels.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  maxScore: integer('max_score').notNull().default(10),
  orderIndex: integer('order_index').notNull().default(0),
});

// Students table
export const students = pgTable('students', {
  id: text('id').primaryKey(), // e.g. "st-1728000000"
  userUid: text('user_uid')
    .notNull()
    .references(() => users.uid, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  gradeLevel: text('grade_level').notNull().default('الأول متوسط'),
  section: text('section').notNull().default('أ'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Student Monthly Scores and Record
export const studentMonthlyRecords = pgTable(
  'student_monthly_records',
  {
    id: serial('id').primaryKey(),
    studentId: text('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    modelId: text('model_id')
      .notNull()
      .references(() => monthlyModels.id, { onDelete: 'cascade' }),
    writtenRawScore: doublePrecision('written_raw_score'),
    scores: jsonb('scores').default({}), // maps custom column id -> numeric score
    notes: text('notes').default(''),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => [
    uniqueIndex('student_model_idx').on(table.studentId, table.modelId),
  ]
);

// Terms table
export const terms = pgTable('terms', {
  id: text('id').primaryKey(), // e.g. "term-1728000000"
  userUid: text('user_uid')
    .notNull()
    .references(() => users.uid, { onDelete: 'cascade' }),
  name: text('name').notNull(), // e.g. "الفصل الأول"
  calculationMode: text('calculation_mode').notNull().default('average'), // 'average' | 'single' | 'sum'
  notes: text('notes').default(''),
  createdAt: timestamp('created_at').defaultNow(),
});

// Term Selected Models Association
export const termSelectedModels = pgTable(
  'term_selected_models',
  {
    id: serial('id').primaryKey(),
    termId: text('term_id')
      .notNull()
      .references(() => terms.id, { onDelete: 'cascade' }),
    modelId: text('model_id')
      .notNull()
      .references(() => monthlyModels.id, { onDelete: 'cascade' }),
    orderIndex: integer('order_index').notNull().default(0),
  },
  (table) => [
    uniqueIndex('term_model_idx').on(table.termId, table.modelId),
  ]
);

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  profile: one(teacherProfiles, {
    fields: [users.uid],
    references: [teacherProfiles.userUid],
  }),
  monthlyModels: many(monthlyModels),
  students: many(students),
  terms: many(terms),
}));

export const monthlyModelsRelations = relations(monthlyModels, ({ one, many }) => ({
  user: one(users, {
    fields: [monthlyModels.userUid],
    references: [users.uid],
  }),
  customColumns: many(customColumns),
  studentRecords: many(studentMonthlyRecords),
  termAssociations: many(termSelectedModels),
}));

export const customColumnsRelations = relations(customColumns, ({ one }) => ({
  model: one(monthlyModels, {
    fields: [customColumns.modelId],
    references: [monthlyModels.id],
  }),
}));

export const studentsRelations = relations(students, ({ one, many }) => ({
  user: one(users, {
    fields: [students.userUid],
    references: [users.uid],
  }),
  monthlyRecords: many(studentMonthlyRecords),
}));

export const studentMonthlyRecordsRelations = relations(
  studentMonthlyRecords,
  ({ one }) => ({
    student: one(students, {
      fields: [studentMonthlyRecords.studentId],
      references: [students.id],
    }),
    model: one(monthlyModels, {
      fields: [studentMonthlyRecords.modelId],
      references: [monthlyModels.id],
    }),
  })
);

export const termsRelations = relations(terms, ({ one, many }) => ({
  user: one(users, {
    fields: [terms.userUid],
    references: [users.uid],
  }),
  selectedModels: many(termSelectedModels),
}));

export const termSelectedModelsRelations = relations(termSelectedModels, ({ one }) => ({
  term: one(terms, {
    fields: [termSelectedModels.termId],
    references: [terms.id],
  }),
  model: one(monthlyModels, {
    fields: [termSelectedModels.modelId],
    references: [monthlyModels.id],
  }),
}));

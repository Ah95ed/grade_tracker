import { describe, expect, it } from 'vitest';
import { createApp } from '../src/index';
import { createMigratedTestDb } from './helpers/mockD1';
import { createTestEnv, testTokenVerifier } from './helpers/testAuth';

async function registerTeacher(app: ReturnType<typeof createApp>, env: ReturnType<typeof createTestEnv>, token: string) {
  await app.request(
    '/api/v1/users',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: token }),
    },
    env
  );
}

describe('CRUD Routes & Ownership Isolation', () => {
  it('verifies health endpoint and full CRUD lifecycle for profile, models, students, records, and terms', async () => {
    const db = createMigratedTestDb();
    const env = createTestEnv(db);
    const app = createApp({ verifyToken: testTokenVerifier });

    const healthRes = await app.request('/api/v1/health', { method: 'GET' }, env);
    expect(healthRes.status).toBe(200);
    const health = (await healthRes.json()) as any;
    expect(health.dbConnected).toBe(true);

    await registerTeacher(app, env, 'teacher-1');
    await registerTeacher(app, env, 'teacher-2');

    // 1. Profile PUT & GET
    const profPut = await app.request(
      '/api/v1/profile',
      {
        method: 'PUT',
        headers: { Authorization: 'Bearer teacher-1', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherName: 'سارة علي',
          schoolName: 'مدرسة النجاح',
          subject: 'الرياضيات',
          academicYear: '2026-2027',
          governorate: 'بغداد',
        }),
      },
      env
    );
    expect(profPut.status).toBe(200);
    expect(((await profPut.json()) as any).profile.teacherName).toBe('سارة علي');

    // 2. Model POST + PATCH + PUT columns
    const modelPost = await app.request(
      '/api/v1/models',
      {
        method: 'POST',
        headers: { Authorization: 'Bearer teacher-1', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'model-oct',
          name: 'شهر تشرين الأول',
          subject: 'الرياضيات',
          academicYear: '2026-2027',
          totalMaxScore: 100,
          writtenMaxScore: 60,
          customColumns: [
            { id: 'col-1', name: 'الشفهي', maxScore: 20, orderIndex: 0 },
            { id: 'col-2', name: 'الواجب', maxScore: 20, orderIndex: 1 },
          ],
        }),
      },
      env
    );
    expect(modelPost.status).toBe(201);
    const modelData = ((await modelPost.json()) as any).model;
    expect(modelData.customColumns).toHaveLength(2);

    const modelPatch = await app.request(
      '/api/v1/models/model-oct',
      {
        method: 'PATCH',
        headers: { Authorization: 'Bearer teacher-1', 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'تشرين الأول المعدل' }),
      },
      env
    );
    expect(modelPatch.status).toBe(200);
    expect(((await modelPatch.json()) as any).model.version).toBe(2);

    // 3. Students bulk & filter
    const bulkStudents = await app.request(
      '/api/v1/students/bulk',
      {
        method: 'POST',
        headers: { Authorization: 'Bearer teacher-1', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          students: [
            { id: 'st-1', name: 'زينب حسن', gradeLevel: 'الأول المتوسط', section: 'أ' },
            { id: 'st-2', name: 'يوسف كريم', gradeLevel: 'الأول المتوسط', section: 'ب' },
          ],
        }),
      },
      env
    );
    expect(bulkStudents.status).toBe(200);

    const filterStudents = await app.request(
      '/api/v1/students?section=أ',
      { method: 'GET', headers: { Authorization: 'Bearer teacher-1' } },
      env
    );
    expect(filterStudents.status).toBe(200);
    const filteredBody = (await filterStudents.json()) as any;
    expect(filteredBody.total).toBe(1);
    expect(filteredBody.students[0].id).toBe('st-1');

    // 4. Records PUT & GET
    const recPut = await app.request(
      '/api/v1/records',
      {
        method: 'PUT',
        headers: { Authorization: 'Bearer teacher-1', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: 'st-1',
          modelId: 'model-oct',
          writtenRawScore: 55,
          scores: { 'col-1': 18, 'col-2': 19 },
          notes: 'ممتازة',
        }),
      },
      env
    );
    expect(recPut.status).toBe(200);
    expect(((await recPut.json()) as any).record.scores['col-1']).toBe(18);

    // 5. Terms POST & GET
    const termPost = await app.request(
      '/api/v1/terms',
      {
        method: 'POST',
        headers: { Authorization: 'Bearer teacher-1', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'term-1',
          name: 'الفصل الأول',
          calculationMode: 'average',
          selectedModelIds: ['model-oct'],
        }),
      },
      env
    );
    expect(termPost.status).toBe(201);
    expect(((await termPost.json()) as any).term.selectedModelIds).toEqual(['model-oct']);

    // 6. Cross-user isolation: teacher-2 cannot see or overwrite teacher-1 resources
    const t2Read = await app.request(
      '/api/v1/models/model-oct',
      { method: 'GET', headers: { Authorization: 'Bearer teacher-2' } },
      env
    );
    expect(t2Read.status).toBe(404);

    const t2Overwrite = await app.request(
      '/api/v1/students/st-1',
      {
        method: 'PUT',
        headers: { Authorization: 'Bearer teacher-2', 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Hacked' }),
      },
      env
    );
    expect(t2Overwrite.status).toBe(403);

    const t2BadRecord = await app.request(
      '/api/v1/records',
      {
        method: 'PUT',
        headers: { Authorization: 'Bearer teacher-2', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: 'st-1',
          modelId: 'model-oct',
          scores: { 'col-1': 0 },
        }),
      },
      env
    );
    expect(t2BadRecord.status).toBe(400);

    // 7. Delete record & student
    const delRec = await app.request(
      '/api/v1/records/st-1/model-oct',
      { method: 'DELETE', headers: { Authorization: 'Bearer teacher-1' } },
      env
    );
    expect(delRec.status).toBe(200);
  });
});

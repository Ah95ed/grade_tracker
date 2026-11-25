import { describe, expect, it } from 'vitest';
import { createApp } from '../src/index';
import { createMigratedTestDb } from './helpers/mockD1';
import { createTestEnv, testTokenVerifier } from './helpers/testAuth';

describe('Offline-First Sync & Legacy Snapshot Routes', () => {
  it('supports delta sync push, incremental pull by timestamp, and tombstone propagation', async () => {
    const db = createMigratedTestDb();
    const env = createTestEnv(db);
    const app = createApp({ verifyToken: testTokenVerifier });

    await app.request(
      '/api/v1/users',
      {
        method: 'POST',
        headers: { Authorization: 'Bearer teacher-1', 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: 'Sync Teacher' }),
      },
      env
    );

    // Push initial offline batch
    const push1 = await app.request(
      '/api/v1/sync',
      {
        method: 'POST',
        headers: { Authorization: 'Bearer teacher-1', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: {
            teacherName: 'خالد',
            schoolName: 'ثانوية بغداد',
            subject: 'الفيزياء',
            academicYear: '2026-2027',
          },
          models: [
            {
              id: 'm1',
              name: 'الشهر الأول',
              subject: 'الفيزياء',
              academicYear: '2026-2027',
              totalMaxScore: 100,
              writtenMaxScore: 70,
              customColumns: [{ id: 'c1', name: 'المختبر', maxScore: 30 }],
            },
          ],
          students: [
            { id: 's1', name: 'طالب 1', gradeLevel: 'الخامس', section: 'أ' },
            { id: 's2', name: 'طالب 2', gradeLevel: 'الخامس', section: 'أ' },
          ],
          records: [
            { studentId: 's1', modelId: 'm1', writtenRawScore: 60, scores: { c1: 28 }, notes: '' },
          ],
          terms: [
            { id: 't1', name: 'نصف السنة', calculationMode: 'average', selectedModelIds: ['m1'] },
          ],
        }),
      },
      env
    );
    expect(push1.status).toBe(200);
    const push1Body = (await push1.json()) as any;
    expect(push1Body.applied.modelsUpserted).toBe(1);
    expect(push1Body.applied.studentsUpserted).toBe(2);
    expect(push1Body.applied.recordsUpserted).toBe(1);
    expect(push1Body.applied.termsUpserted).toBe(1);

    const checkpoint1 = push1Body.serverSyncTime;

    // Wait 5ms so updated_at/deleted_at is strictly after checkpoint1
    await new Promise((r) => setTimeout(r, 5));

    // Push incremental update to s1 and delete s2
    const push2 = await app.request(
      '/api/v1/sync',
      {
        method: 'POST',
        headers: { Authorization: 'Bearer teacher-1', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          students: [{ id: 's1', name: 'طالب 1 المعدل', gradeLevel: 'الخامس', section: 'ب' }],
          deletes: {
            studentIds: ['s2'],
          },
        }),
      },
      env
    );
    expect(push2.status).toBe(200);

    // Pull delta since checkpoint1 -> should only return s1 and tombstone for s2
    const pullDelta = await app.request(
      `/api/v1/sync?since=${encodeURIComponent(checkpoint1)}`,
      { method: 'GET', headers: { Authorization: 'Bearer teacher-1' } },
      env
    );
    expect(pullDelta.status).toBe(200);
    const deltaBody = (await pullDelta.json()) as any;
    expect(deltaBody.changes.models).toHaveLength(0);
    expect(deltaBody.changes.students).toHaveLength(1);
    expect(deltaBody.changes.students[0].id).toBe('s1');
    expect(deltaBody.changes.students[0].version).toBe(2);
    expect(deltaBody.tombstones).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ entityType: 'student', entityId: 's2' }),
      ])
    );
  });

  it('round-trips full snapshot via legacy /api/v1/data compatibility endpoint', async () => {
    const db = createMigratedTestDb();
    const env = createTestEnv(db);
    const app = createApp({ verifyToken: testTokenVerifier });

    await app.request(
      '/api/v1/users',
      {
        method: 'POST',
        headers: { Authorization: 'Bearer teacher-1', 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: 'Legacy Snapshot' }),
      },
      env
    );

    const saveRes = await app.request(
      '/api/v1/data',
      {
        method: 'POST',
        headers: { Authorization: 'Bearer teacher-1', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: {
            teacherName: 'أستاذ',
            schoolName: 'مدرسة',
            subject: 'كيمياء',
            academicYear: '2026-2027',
          },
          models: [
            {
              id: 'snap-m1',
              name: 'شهر 1',
              subject: 'كيمياء',
              academicYear: '2026-2027',
              totalMaxScore: 100,
              writtenMaxScore: 50,
              customColumns: [{ id: 'snap-c1', name: 'يومي', maxScore: 50 }],
              students: [
                {
                  id: 'snap-s1',
                  name: 'عمر',
                  gradeLevel: 'الرابع',
                  section: 'أ',
                  writtenRawScore: 45,
                  scores: { 'snap-c1': 48 },
                },
              ],
            },
          ],
          terms: [
            { id: 'snap-t1', name: 'الفصل', calculationMode: 'average', selectedModelIds: ['snap-m1'] },
          ],
        }),
      },
      env
    );
    expect(saveRes.status).toBe(200);

    const getRes = await app.request(
      '/api/v1/data',
      { method: 'GET', headers: { Authorization: 'Bearer teacher-1' } },
      env
    );
    expect(getRes.status).toBe(200);
    const snap = (await getRes.json()) as any;
    expect(snap.profile.teacherName).toBe('أستاذ');
    expect(snap.models).toHaveLength(1);
    expect(snap.models[0].students).toHaveLength(1);
    expect(snap.models[0].students[0].scores['snap-c1']).toBe(48);
    expect(snap.terms).toHaveLength(1);
  });
});

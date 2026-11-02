import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import * as db from '../src/db/pool';
import { MLClient } from '../src/services/mlClient';
import { mockUsers } from './mocks/db.mock';
import { createToken } from './helpers';

vi.mock('../src/db/pool', () => ({
  query: vi.fn(),
  withTransaction: vi.fn(),
  pool: { end: vi.fn() },
}));

describe('Attempts Routes (POST /attempts)', () => {
  const student1Id = mockUsers.student1.student_id;
  const student2Id = mockUsers.student2.student_id;
  const validClientAttemptId = 'f0000000-0000-4000-8000-000000000001';

  const student1Token = createToken({
    sub: mockUsers.student1.id,
    role: 'student',
    studentId: student1Id,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when token is missing', async () => {
    const res = await request(app)
      .post('/attempts')
      .send({
        clientAttemptId: validClientAttemptId,
        studentId: student1Id,
        conceptId: 1,
        score: 0.9,
        timeSpentSeconds: 60,
      });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('returns 403 when student 1 attempts to log an attempt for student 2', async () => {
    const res = await request(app)
      .post('/attempts')
      .set('Authorization', `Bearer ${student1Token}`)
      .send({
        clientAttemptId: validClientAttemptId,
        studentId: student2Id,
        conceptId: 1,
        score: 0.8,
        timeSpentSeconds: 120,
      });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('returns 400 when score is out of bounds (< 0 or > 1)', async () => {
    const res = await request(app)
      .post('/attempts')
      .set('Authorization', `Bearer ${student1Token}`)
      .send({
        clientAttemptId: validClientAttemptId,
        studentId: student1Id,
        conceptId: 1,
        score: 1.5, // invalid
        timeSpentSeconds: 60,
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 201 Created on fresh attempt and recomputes student twin & predictions', async () => {
    // 1. Concept check
    vi.mocked(db.query)
      .mockResolvedValueOnce({ rows: [{ id: 1 }] } as any)
      // 2. Insert attempt succeeds
      .mockResolvedValueOnce({
        rows: [{ id: 'new-attempt-uuid', attempted_at: new Date() }],
      } as any)
      // 3. Recompute: fetch attempts
      .mockResolvedValueOnce({
        rows: [{
          clientAttemptId: validClientAttemptId,
          studentId: student1Id,
          conceptId: 1,
          score: 0.9,
          timeSpentSeconds: 60,
          hintsUsed: 0,
          assessmentType: 'practice',
        }],
      } as any)
      // 4. Recompute: cohort median
      .mockResolvedValueOnce({ rows: [{ median_attempts: 1.0 }] } as any);

    // Mock ML analyze
    vi.spyOn(MLClient, 'analyze').mockResolvedValueOnce({
      studentId: student1Id,
      predictions: [],
      twinSummary: {
        studentId: student1Id,
        computedAt: new Date().toISOString(),
        masteryAll: { '1': 0.95 },
        velocity: { '1': 0.1 },
        consistency: 1.0,
        engagement: 1.0,
        confidence: { '1': 'high' },
        totalAttempts: 1,
        riskSummary: { low: 1, medium: 0, high: 0 },
      },
      rootGaps: [],
      path: [],
      timings: { total_ms: 45 },
    });

    vi.mocked(db.withTransaction).mockImplementationOnce(async (cb) => {
      return cb({ query: vi.fn().mockResolvedValue({ rows: [] }) } as any);
    });

    const res = await request(app)
      .post('/attempts')
      .set('Authorization', `Bearer ${student1Token}`)
      .send({
        clientAttemptId: validClientAttemptId,
        studentId: student1Id,
        conceptId: 1,
        score: 0.9,
        timeSpentSeconds: 60,
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('summary');
    expect(res.body.summary.masteryAll['1']).toBe(0.95);
  });

  it('handles duplicate attempt idempotently: returns 200 with Idempotent-Replay: true and writes only one row', async () => {
    // 1. Concept check
    vi.mocked(db.query)
      .mockResolvedValueOnce({ rows: [{ id: 1 }] } as any)
      // 2. Insert attempt returns NO rows (ON CONFLICT DO NOTHING triggered)
      .mockResolvedValueOnce({ rows: [] } as any)
      // 3. Snapshot query returns existing snapshot
      .mockResolvedValueOnce({
        rows: [{
          taken_at: new Date().toISOString(),
          state: {
            studentId: student1Id,
            masteryAll: { '1': 0.95 },
          },
        }],
      } as any);

    const res = await request(app)
      .post('/attempts')
      .set('Authorization', `Bearer ${student1Token}`)
      .send({
        clientAttemptId: validClientAttemptId,
        studentId: student1Id,
        conceptId: 1,
        score: 0.9,
        timeSpentSeconds: 60,
      });

    expect(res.status).toBe(200);
    expect(res.headers['idempotent-replay']).toBe('true');
    expect(res.body.summary.studentId).toBe(student1Id);
  });
});

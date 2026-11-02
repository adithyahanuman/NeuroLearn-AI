import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import * as db from '../src/db/pool';
import { MLClient } from '../src/services/mlClient';
import { mockUsers } from './mocks/db.mock';
import { createToken, createExpiredToken } from './helpers';

vi.mock('../src/db/pool', () => ({
  query: vi.fn(),
  withTransaction: vi.fn(),
  pool: { end: vi.fn() },
}));

describe('Students Routes (/students)', () => {
  const student1Id = mockUsers.student1.student_id;
  const student2Id = mockUsers.student2.student_id;
  const nonExistentId = '90000000-0000-4000-8000-000000000009';

  const student1Token = createToken({
    sub: mockUsers.student1.id,
    role: 'student',
    studentId: student1Id,
  });

  const facultyToken = createToken({
    sub: mockUsers.faculty1.id,
    role: 'faculty',
    studentId: null,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /students/:id/twin', () => {
    it('returns 401 when token is missing', async () => {
      const res = await request(app).get(`/students/${student1Id}/twin`);
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('returns 401 when token has expired', async () => {
      const expToken = createExpiredToken({
        sub: mockUsers.student1.id,
        role: 'student',
        studentId: student1Id,
      });

      const res = await request(app)
        .get(`/students/${student1Id}/twin`)
        .set('Authorization', `Bearer ${expToken}`);

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('TOKEN_EXPIRED');
    });

    it('returns 400 when student ID is not a valid UUID', async () => {
      const res = await request(app)
        .get('/students/not-a-valid-uuid/twin')
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INVALID_UUID');
    });

    it('returns 403 when student 1 attempts to access student 2 twin', async () => {
      const res = await request(app)
        .get(`/students/${student2Id}/twin`)
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });

    it('returns 404 when student record does not exist', async () => {
      // For faculty accessing non-existent student:
      vi.mocked(db.query).mockResolvedValueOnce({ rows: [] } as any); // exists check

      const res = await request(app)
        .get(`/students/${nonExistentId}/twin`)
        .set('Authorization', `Bearer ${facultyToken}`);

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('NOT_FOUND');
    });

    it('returns 200 and twin snapshot on own data', async () => {
      // 1. canAccessStudent verification check: student exists
      vi.mocked(db.query)
        .mockResolvedValueOnce({ rows: [{ id: student1Id }] } as any)
        // 2. Twin snapshot query
        .mockResolvedValueOnce({
          rows: [{
            taken_at: new Date().toISOString(),
            state: {
              studentId: student1Id,
              computedAt: new Date().toISOString(),
              masteryAll: { '1': 0.85, '2': 0.45 },
              velocity: { '1': 0.1 },
              consistency: 0.9,
              engagement: 1.2,
              confidence: { '1': 'high' },
              riskSummary: { low: 1, medium: 0, high: 1 },
            },
          }],
        } as any);

      const res = await request(app)
        .get(`/students/${student1Id}/twin`)
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.studentId).toBe(student1Id);
      expect(res.body.masteryAll['1']).toBe(0.85);
    });
  });

  describe('GET /students/:id/risks (Cache & Fallback logic)', () => {
    it('returns fresh stored predictions with stale: false', async () => {
      const now = new Date();
      vi.mocked(db.query)
        .mockResolvedValueOnce({ rows: [{ id: student1Id }] } as any) // canAccessStudent
        .mockResolvedValueOnce({
          rows: [
            {
              conceptId: 1,
              conceptCode: 'DSA-01',
              conceptName: 'Time Complexity',
              risk: 0.15,
              band: 'low',
              reasons: [],
              rootGaps: [],
              computedAt: now.toISOString(),
            },
          ],
        } as any);

      const res = await request(app)
        .get(`/students/${student1Id}/risks`)
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].stale).toBe(false);
      expect(res.body[0].conceptCode).toBe('DSA-01');
    });

    it('returns stored predictions with stale: true when predictions are old and ML service is DOWN', async () => {
      const oldDate = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago (> 15 min cache)
      vi.mocked(db.query)
        .mockResolvedValueOnce({ rows: [{ id: student1Id }] } as any) // canAccessStudent
        .mockResolvedValueOnce({
          rows: [
            {
              conceptId: 2,
              conceptCode: 'DSA-02',
              conceptName: 'Arrays',
              risk: 0.85,
              band: 'high',
              reasons: ['Arrays are weak'],
              rootGaps: [],
              computedAt: oldDate.toISOString(),
            },
          ],
        } as any)
        // Recompute attempt begins:
        .mockResolvedValueOnce({ rows: [] } as any) // attempts history
        .mockResolvedValueOnce({ rows: [{ median_attempts: 2.0 }] } as any); // cohort median

      // ML client fails (ML service down)
      vi.spyOn(MLClient, 'analyze').mockRejectedValueOnce(new Error('Connection refused'));

      const res = await request(app)
        .get(`/students/${student1Id}/risks`)
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].stale).toBe(true);
      expect(res.body[0].band).toBe('high');
    });

    it('returns 503 Service Unavailable when NO stored predictions exist and ML service is DOWN', async () => {
      vi.mocked(db.query)
        .mockResolvedValueOnce({ rows: [{ id: student1Id }] } as any) // canAccessStudent
        .mockResolvedValueOnce({ rows: [] } as any) // no stored predictions
        .mockResolvedValueOnce({ rows: [] } as any) // attempts history
        .mockResolvedValueOnce({ rows: [{ median_attempts: 1.0 }] } as any); // cohort median

      vi.spyOn(MLClient, 'analyze').mockRejectedValueOnce(new Error('Service down'));

      const res = await request(app)
        .get(`/students/${student1Id}/risks`)
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(503);
      expect(res.body.code).toBe('SERVICE_UNAVAILABLE');
    });

    it('recovers and returns fresh predictions when ML service is back online', async () => {
      const oldDate = new Date(Date.now() - 60 * 60 * 1000);
      const freshDate = new Date().toISOString();

      vi.mocked(db.query)
        .mockResolvedValueOnce({ rows: [{ id: student1Id }] } as any) // canAccessStudent
        .mockResolvedValueOnce({
          rows: [{
            conceptId: 1,
            conceptCode: 'DSA-01',
            conceptName: 'Time Complexity',
            risk: 0.75,
            band: 'high',
            reasons: [],
            rootGaps: [],
            computedAt: oldDate.toISOString(),
          }],
        } as any)
        .mockResolvedValueOnce({ rows: [] } as any) // attempts
        .mockResolvedValueOnce({ rows: [{ median_attempts: 1.0 }] } as any); // cohort median

      vi.spyOn(MLClient, 'analyze').mockResolvedValueOnce({
        studentId: student1Id,
        predictions: [
          {
            conceptId: 1,
            conceptCode: 'DSA-01',
            conceptName: 'Time Complexity',
            risk: 0.20,
            band: 'low',
            confidence: 'high',
            reasons: [],
            rootGaps: [],
            computedAt: freshDate,
          },
        ],
        twinSummary: {
          studentId: student1Id,
          computedAt: freshDate,
          masteryAll: { '1': 0.8 },
          velocity: { '1': 0.0 },
          consistency: 1.0,
          engagement: 1.0,
          confidence: { '1': 'high' },
          totalAttempts: 5,
          riskSummary: { low: 1, medium: 0, high: 0 },
        },
        rootGaps: [],
        path: [],
        timings: { total_ms: 50 },
      });

      vi.mocked(db.withTransaction).mockImplementationOnce(async (cb) => {
        return cb({ query: vi.fn().mockResolvedValue({ rows: [] }) } as any);
      });

      const res = await request(app)
        .get(`/students/${student1Id}/risks`)
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      expect(res.body[0].stale).toBe(false);
      expect(res.body[0].risk).toBe(0.20);
      expect(res.body[0].band).toBe('low');
    });
  });

  describe('GET /students/:id/root-gaps and /path', () => {
    it('returns 200 and root gaps array for student', async () => {
      vi.mocked(db.query)
        .mockResolvedValueOnce({ rows: [{ id: student1Id }] } as any) // canAccessStudent
        .mockResolvedValueOnce({
          rows: [
            {
              concept_id: 3,
              root_gaps: [
                {
                  conceptId: 3,
                  rootGapId: 2,
                  code: 'DSA-02',
                  name: 'Arrays',
                  mastery: 0.35,
                  chain: [2, 3],
                  blockedDescendants: 2,
                  score: 0.35,
                  isTargetItself: false,
                },
              ],
            },
          ],
        } as any);

      const res = await request(app)
        .get(`/students/${student1Id}/root-gaps`)
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].code).toBe('DSA-02');
      expect(res.body[0].chain).toEqual([2, 3]);
    });

    it('returns 200 and path steps with done status', async () => {
      vi.mocked(db.query)
        .mockResolvedValueOnce({ rows: [{ id: student1Id }] } as any) // canAccessStudent
        .mockResolvedValueOnce({
          rows: [{
            id: 'rec-1234',
            generated_at: new Date().toISOString(),
            status: 'active',
            path: [
              { conceptId: 2, resourceId: 1, minutes: 15, reason: 'Master prerequisite arrays' },
            ],
          }],
        } as any)
        .mockResolvedValueOnce({
          rows: [{ step_index: 0 }], // Step 0 completed
        } as any);

      const res = await request(app)
        .get(`/students/${student1Id}/path`)
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.steps).toHaveLength(1);
      expect(res.body.steps[0].done).toBe(true);
      expect(res.body.steps[0].reason).toBe('Master prerequisite arrays');
    });
  });
});

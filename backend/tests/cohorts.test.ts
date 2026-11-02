import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import * as db from '../src/db/pool';
import { mockUsers, mockCohort } from './mocks/db.mock';
import { createToken } from './helpers';

vi.mock('../src/db/pool', () => ({
  query: vi.fn(),
  withTransaction: vi.fn(),
  pool: { end: vi.fn() },
}));

describe('Cohorts Routes (/cohorts)', () => {
  const cohortId = mockCohort.id;
  const nonExistentCohortId = '80000000-0000-4000-8000-000000000008';

  const faculty1Token = createToken({
    sub: mockUsers.faculty1.id,
    role: 'faculty',
    studentId: null,
  });

  const faculty2Token = createToken({
    sub: mockUsers.faculty2.id,
    role: 'faculty',
    studentId: null,
  });

  const studentToken = createToken({
    sub: mockUsers.student1.id,
    role: 'student',
    studentId: mockUsers.student1.student_id,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /cohorts', () => {
    it('returns 401 when token is missing', async () => {
      const res = await request(app).get('/cohorts');
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('returns 403 for student role', async () => {
      const res = await request(app)
        .get('/cohorts')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });

    it('returns 200 and assigned cohorts for faculty', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ id: cohortId, name: 'Cohort A', studentCount: 25 }],
      } as any);

      const res = await request(app)
        .get('/cohorts')
        .set('Authorization', `Bearer ${faculty1Token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].name).toBe('Cohort A');
    });
  });

  describe('GET /cohorts/:id/summary', () => {
    it('returns 400 on invalid UUID', async () => {
      const res = await request(app)
        .get('/cohorts/not-uuid/summary')
        .set('Authorization', `Bearer ${faculty1Token}`);

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INVALID_UUID');
    });

    it('returns 404 when cohort does not exist', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({ rows: [] } as any);

      const res = await request(app)
        .get(`/cohorts/${nonExistentCohortId}/summary`)
        .set('Authorization', `Bearer ${faculty1Token}`);

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('NOT_FOUND');
    });

    it('returns 403 when faculty 2 tries to access faculty 1 cohort', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ id: cohortId, faculty_id: mockUsers.faculty1.id }],
      } as any);

      const res = await request(app)
        .get(`/cohorts/${cohortId}/summary`)
        .set('Authorization', `Bearer ${faculty2Token}`);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });

    it('returns 200 with summary counts for owning faculty', async () => {
      vi.mocked(db.query)
        // 1. verifyCohortAccess
        .mockResolvedValueOnce({
          rows: [{ id: cohortId, faculty_id: mockUsers.faculty1.id }],
        } as any)
        // 2. bandRes
        .mockResolvedValueOnce({
          rows: [{ low: 18, medium: 5, high: 2 }],
        } as any)
        // 3. scoreRes
        .mockResolvedValueOnce({
          rows: [{ avgScore: 0.74 }],
        } as any);

      const res = await request(app)
        .get(`/cohorts/${cohortId}/summary`)
        .set('Authorization', `Bearer ${faculty1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.bandCounts).toEqual({ low: 18, medium: 5, high: 2 });
      expect(res.body.averageMastery).toBe(0.74);
    });
  });

  describe('GET /cohorts/:id/students', () => {
    it('returns 200 with student ranking and top root gap', async () => {
      vi.mocked(db.query)
        .mockResolvedValueOnce({
          rows: [{ id: cohortId, faculty_id: mockUsers.faculty1.id }],
        } as any)
        .mockResolvedValueOnce({
          rows: [
            {
              studentId: mockUsers.student1.student_id,
              name: 'Student One',
              email: 'student1@example.com',
              riskScore: 0.82,
              trend: 'rising',
              topRootGap: 'Arrays',
            },
          ],
        } as any);

      const res = await request(app)
        .get(`/cohorts/${cohortId}/students`)
        .set('Authorization', `Bearer ${faculty1Token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].riskScore).toBe(0.82);
      expect(res.body[0].topRootGap).toBe('Arrays');
    });
  });

  describe('GET /cohorts/:id/alerts and /gaps', () => {
    it('returns 200 with alerts for risk delta >= 0.20', async () => {
      vi.mocked(db.query)
        .mockResolvedValueOnce({
          rows: [{ id: cohortId, faculty_id: mockUsers.faculty1.id }],
        } as any)
        .mockResolvedValueOnce({
          rows: [
            {
              studentId: mockUsers.student1.student_id,
              conceptId: 3,
              conceptName: 'Binary Search Trees',
              riskDelta: 0.25,
              detectedAt: new Date().toISOString(),
            },
          ],
        } as any);

      const res = await request(app)
        .get(`/cohorts/${cohortId}/alerts`)
        .set('Authorization', `Bearer ${faculty1Token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].riskDelta).toBe(0.25);
    });

    it('returns 200 with common gaps distribution', async () => {
      vi.mocked(db.query)
        .mockResolvedValueOnce({
          rows: [{ id: cohortId, faculty_id: mockUsers.faculty1.id }],
        } as any)
        .mockResolvedValueOnce({
          rows: [
            { conceptId: 2, conceptName: 'Arrays', studentCount: 14 },
            { conceptId: 4, conceptName: 'Recursion', studentCount: 8 },
          ],
        } as any);

      const res = await request(app)
        .get(`/cohorts/${cohortId}/gaps`)
        .set('Authorization', `Bearer ${faculty1Token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].studentCount).toBe(14);
    });
  });
});

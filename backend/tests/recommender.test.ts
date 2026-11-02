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

describe('Learning Path Progression & Regeneration (/students/:id/path & /path-steps/:id)', () => {
  const student1Id = mockUsers.student1.student_id;
  const student1Token = createToken({
    sub: mockUsers.student1.id,
    role: 'student',
    studentId: student1Id,
  });

  const recommendationId = 'd0000000-0000-4000-8000-000000000001';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('POST /students/:id/path/regenerate triggers recompute and returns updated active path', async () => {
    // 1. canAccessStudent
    vi.mocked(db.query)
      .mockResolvedValueOnce({ rows: [{ id: student1Id }] } as any)
      // 2. Recompute attempts history query
      .mockResolvedValueOnce({ rows: [] } as any)
      // 3. Cohort median query
      .mockResolvedValueOnce({ rows: [{ median_attempts: 1.0 }] } as any);

    // Mock ML analyze with path
    vi.spyOn(MLClient, 'analyze').mockResolvedValueOnce({
      studentId: student1Id,
      predictions: [],
      twinSummary: {
        studentId: student1Id,
        computedAt: new Date().toISOString(),
        masteryAll: { '7': 0.35, '12': 0.40 },
        velocity: {},
        consistency: 1.0,
        engagement: 1.0,
        confidence: {},
        totalAttempts: 5,
        riskSummary: { low: 0, medium: 0, high: 2 },
      },
      rootGaps: [],
      path: [
        {
          id: 'step_1',
          stepIndex: 0,
          conceptId: 7,
          conceptName: 'Arrays',
          resourceTitle: 'Arrays Practice',
          minutes: 30,
          reason: 'Arrays is blocking Linked Lists',
        },
      ],
      timings: { total_ms: 60 },
    });

    // Mock transaction for recompute storage
    vi.mocked(db.withTransaction).mockImplementationOnce(async (cb) => {
      return cb({ query: vi.fn().mockResolvedValue({ rows: [] }) } as any);
    });

    // Mock query for newly created recommendation
    vi.mocked(db.query).mockResolvedValueOnce({
      rows: [
        {
          id: recommendationId,
          generated_at: new Date().toISOString(),
          status: 'active',
          path: [
            {
              id: 'step_1',
              stepIndex: 0,
              conceptId: 7,
              conceptName: 'Arrays',
              resourceTitle: 'Arrays Practice',
              minutes: 30,
              reason: 'Arrays is blocking Linked Lists',
            },
          ],
        },
      ],
    } as any);

    const res = await request(app)
      .post(`/students/${student1Id}/path/regenerate`)
      .set('Authorization', `Bearer ${student1Token}`);

    expect(res.status).toBe(201);
    expect(res.body.recommendationId).toBe(recommendationId);
    expect(res.body.status).toBe('active');
    expect(res.body.steps).toHaveLength(1);
    expect(res.body.steps[0].conceptName).toBe('Arrays');
    expect(res.body.steps[0].done).toBe(false);
  });

  it('PATCH /path-steps/:id marks a step done once and returns updated path with done=true', async () => {
    // 1. Recommendation lookup
    vi.mocked(db.query)
      .mockResolvedValueOnce({
        rows: [
          {
            id: recommendationId,
            student_id: student1Id,
            generated_at: new Date().toISOString(),
            status: 'active',
            path: [
              { id: `${recommendationId}_step_0`, stepIndex: 0, conceptId: 7, conceptName: 'Arrays' },
              { id: `${recommendationId}_step_1`, stepIndex: 1, conceptId: 12, conceptName: 'Linked Lists' },
            ],
          },
        ],
      } as any)
      // 2. Insert progress: ON CONFLICT DO NOTHING
      .mockResolvedValueOnce({ rows: [] } as any)
      // 3. Query completed steps: returns step 0
      .mockResolvedValueOnce({
        rows: [{ step_index: 0 }],
      } as any);

    const res = await request(app)
      .patch(`/path-steps/${recommendationId}_step_0`)
      .set('Authorization', `Bearer ${student1Token}`)
      .send({ done: true });

    expect(res.status).toBe(200);
    expect(res.body.steps[0].done).toBe(true);
    expect(res.body.steps[1].done).toBe(false);
  });

  it('PATCH /path-steps/:id handles ticking a step twice idempotently', async () => {
    // Ticking already-completed step again
    vi.mocked(db.query)
      .mockResolvedValueOnce({
        rows: [
          {
            id: recommendationId,
            student_id: student1Id,
            generated_at: new Date().toISOString(),
            status: 'active',
            path: [
              { id: `${recommendationId}_step_0`, stepIndex: 0, conceptId: 7, conceptName: 'Arrays' },
            ],
          },
        ],
      } as any)
      // Insert with ON CONFLICT DO NOTHING returns 0 rows
      .mockResolvedValueOnce({ rows: [] } as any)
      // Query completed steps: still returns step 0
      .mockResolvedValueOnce({
        rows: [{ step_index: 0 }],
      } as any);

    const res = await request(app)
      .patch(`/path-steps/${recommendationId}_step_0`)
      .set('Authorization', `Bearer ${student1Token}`)
      .send({ done: true });

    expect(res.status).toBe(200);
    expect(res.body.steps[0].done).toBe(true);
  });
});

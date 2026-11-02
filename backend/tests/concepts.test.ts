import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import * as db from '../src/db/pool';
import { mockUsers } from './mocks/db.mock';
import { createToken } from './helpers';

vi.mock('../src/db/pool', () => ({
  query: vi.fn(),
  withTransaction: vi.fn(),
  pool: { end: vi.fn() },
}));

describe('Concepts Routes (/concepts)', () => {
  const studentToken = createToken({
    sub: mockUsers.student1.id,
    role: 'student',
    studentId: mockUsers.student1.student_id,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /concepts', () => {
    it('returns 401 when token is missing', async () => {
      const res = await request(app).get('/concepts');
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('returns 200 and list of concepts when authenticated', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [
          { id: 1, code: 'DSA-01', name: 'Time Complexity', level: 1, difficulty: 1, description: 'Big-O' },
          { id: 2, code: 'DSA-02', name: 'Arrays', level: 1, difficulty: 1, description: 'Static arrays' },
        ],
      } as any);

      const res = await request(app)
        .get('/concepts')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].code).toBe('DSA-01');
    });
  });

  describe('GET /concepts/graph', () => {
    it('returns 401 when token is missing', async () => {
      const res = await request(app).get('/concepts/graph');
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('returns 200 with nodes and edges when authenticated', async () => {
      vi.mocked(db.query)
        .mockResolvedValueOnce({
          rows: [
            { id: 1, code: 'DSA-01', name: 'Time Complexity', level: 1, difficulty: 1 },
            { id: 2, code: 'DSA-02', name: 'Arrays', level: 1, difficulty: 1 },
          ],
        } as any)
        .mockResolvedValueOnce({
          rows: [{ from: 1, to: 2, strength: 1.0 }],
        } as any);

      const res = await request(app)
        .get('/concepts/graph')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('nodes');
      expect(res.body).toHaveProperty('edges');
      expect(res.body.nodes).toHaveLength(2);
      expect(res.body.edges).toHaveLength(1);
      expect(res.body.edges[0]).toEqual({ from: 1, to: 2, strength: 1.0 });
    });
  });
});

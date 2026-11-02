import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { app } from '../src/app';
import * as db from '../src/db/pool';
import { mockUsers, mockCohort } from './mocks/db.mock';
import { createToken, createExpiredToken } from './helpers';

vi.mock('../src/db/pool', () => ({
  query: vi.fn(),
  withTransaction: vi.fn(),
  pool: { end: vi.fn() },
}));

describe('Auth Routes (/auth)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /auth/login', () => {
    it('returns 200 and token on valid credentials', async () => {
      const hashed = await bcrypt.hash('secret123', 10);
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{
          id: mockUsers.student1.id,
          email: mockUsers.student1.email,
          password_hash: hashed,
          name: mockUsers.student1.name,
          role: 'student',
          student_id: mockUsers.student1.student_id,
        }],
      } as any);

      const res = await request(app)
        .post('/auth/login')
        .send({ email: mockUsers.student1.email, password: 'secret123' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toEqual({
        id: mockUsers.student1.id,
        email: mockUsers.student1.email,
        name: mockUsers.student1.name,
        role: 'student',
        studentId: mockUsers.student1.student_id,
      });
    });

    it('returns 401 with identical message for non-existent user', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({ rows: [] } as any);

      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'unknown@example.com', password: 'secret123' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid email or password');
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('returns 401 with identical message for wrong password', async () => {
      const hashed = await bcrypt.hash('realpassword', 10);
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{
          id: mockUsers.student1.id,
          email: mockUsers.student1.email,
          password_hash: hashed,
          name: mockUsers.student1.name,
          role: 'student',
          student_id: mockUsers.student1.student_id,
        }],
      } as any);

      const res = await request(app)
        .post('/auth/login')
        .send({ email: mockUsers.student1.email, password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid email or password');
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('returns 400 on malformed body (missing email or password)', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'invalid-email' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /auth/register', () => {
    it('returns 201 and student user on successful registration', async () => {
      // 1. Check existing email -> none
      vi.mocked(db.query).mockResolvedValueOnce({ rows: [] } as any);

      // 2. Transaction callback execution
      vi.mocked(db.withTransaction).mockImplementationOnce(async (callback) => {
        const mockClient = {
          query: vi.fn()
            // 2a. Cohort lookup
            .mockResolvedValueOnce({ rows: [{ id: mockCohort.id }] })
            // 2b. User insert
            .mockResolvedValueOnce({
              rows: [{
                id: 'new-user-id',
                email: 'newstudent@example.com',
                name: 'New Student',
                role: 'student',
              }],
            })
            // 2c. Student insert
            .mockResolvedValueOnce({
              rows: [{ id: 'new-student-id' }],
            }),
        };
        return callback(mockClient as any);
      });

      const res = await request(app)
        .post('/auth/register')
        .send({
          email: 'newstudent@example.com',
          password: 'password123',
          name: 'New Student',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toEqual({
        id: 'new-user-id',
        email: 'newstudent@example.com',
        name: 'New Student',
        role: 'student',
        studentId: 'new-student-id',
      });
    });

    it('returns 409 conflict when email is already in use', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ id: 'existing-id' }],
      } as any);

      const res = await request(app)
        .post('/auth/register')
        .send({
          email: mockUsers.student1.email,
          password: 'password123',
          name: 'Existing',
        });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('EMAIL_ALREADY_EXISTS');
    });

    it('returns 400 when password is too short', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: '123', // less than 6 chars
          name: 'Short Pass',
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /auth/me', () => {
    it('returns current user profile when valid token provided', async () => {
      const token = createToken({
        sub: mockUsers.student1.id,
        role: 'student',
        studentId: mockUsers.student1.student_id,
      });

      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{
          id: mockUsers.student1.id,
          email: mockUsers.student1.email,
          name: mockUsers.student1.name,
          role: 'student',
          student_id: mockUsers.student1.student_id,
        }],
      } as any);

      const res = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(mockUsers.student1.id);
      expect(res.body.role).toBe('student');
    });

    it('returns 401 when Authorization header is missing', async () => {
      const res = await request(app).get('/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('returns 401 when token has expired', async () => {
      const expiredToken = createExpiredToken({
        sub: mockUsers.student1.id,
        role: 'student',
        studentId: mockUsers.student1.student_id,
      });

      const res = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('TOKEN_EXPIRED');
    });

    it('returns 401 when token is invalid/tampered', async () => {
      const res = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid.tampered.token');

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });
  });
});

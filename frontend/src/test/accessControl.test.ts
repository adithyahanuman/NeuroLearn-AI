import { describe, it, expect, beforeEach } from 'vitest';
import { api, setAuthSession, clearAuthSession, ClientError } from '@/api/client';
import { USERS } from '@/api/mocks/mockDb';

describe('Access Control and Ownership Enforcement', () => {
  beforeEach(() => {
    clearAuthSession();
  });

  it('unauthenticated request throws 401 Unauthorized', async () => {
    await expect(api.getStudentTwin()).rejects.toThrow(ClientError);
    try {
      await api.getStudentTwin();
    } catch (e: any) {
      expect(e.status).toBe(401);
      expect(e.code).toBe('UNAUTHORIZED');
    }
  });

  it('student cannot load another student (403 Forbidden)', async () => {
    // Authenticate as Student 1 (Asha Demo)
    const student1 = USERS.find((u) => u.email === 'demo1@neurolearn.ai')!;
    setAuthSession('token-s1', student1);

    // Asha can load her own twin
    const myTwin = await api.getStudentTwin();
    expect(myTwin.studentId).toBe(student1.studentId);

    // Asha attempts to load student 2's twin -> must fail with 403
    await expect(
      api.getStudentTwin('00000000-0000-0000-0000-000000000002')
    ).rejects.toThrow(ClientError);

    try {
      await api.getStudentTwin('00000000-0000-0000-0000-000000000002');
    } catch (e: any) {
      expect(e.status).toBe(403);
      expect(e.code).toBe('FORBIDDEN');
    }
  });

  it('faculty cannot load another faculty cohort or student outside assigned cohorts (403)', async () => {
    // Authenticate as faculty@neurolearn.ai (owns cohort A, B, C)
    const faculty = USERS.find((u) => u.email === 'faculty@neurolearn.ai')!;
    setAuthSession('token-faculty', faculty);

    // Faculty can access student in Cohort A (Asha Demo)
    const studentAsha = await api.getStudentTwin('00000000-0000-0000-0000-000000000001');
    expect(studentAsha.studentId).toBe('00000000-0000-0000-0000-000000000001');

    // Faculty tries to load Cohort D (not owned) -> 403
    await expect(api.getCohortStudents('cohort-d-outside')).rejects.toThrow(ClientError);
    try {
      await api.getCohortStudents('cohort-d-outside');
    } catch (e: any) {
      expect(e.status).toBe(403);
    }

    // Faculty tries to load outside student -> 403
    await expect(api.getStudentTwin('outside-student-uuid')).rejects.toThrow(ClientError);
  });

  it('student role cannot access faculty cohort endpoints (403)', async () => {
    const student = USERS.find((u) => u.email === 'demo1@neurolearn.ai')!;
    setAuthSession('token-s1', student);

    await expect(api.getFacultyCohorts()).rejects.toThrow(ClientError);
    try {
      await api.getFacultyCohorts();
    } catch (e: any) {
      expect(e.status).toBe(403);
    }
  });

  it('login with invalid credentials fails with 401', async () => {
    await expect(api.login('wrong@example.com', 'demo')).rejects.toThrow('Invalid email or password');
    await expect(api.login('demo1@neurolearn.ai', 'wrongpassword')).rejects.toThrow('Invalid email or password');
  });

  it('register a new student successfully initializes session, twin, and learning path', async () => {
    const uniqueEmail = `newstudent_${Date.now()}@domain.edu`;
    const res = await api.register('New Learner', uniqueEmail, 'password123', 'cohort-a');

    expect(res.token).toBeDefined();
    expect(res.user.email).toBe(uniqueEmail);
    expect(res.user.role).toBe('student');
    expect(res.user.studentId).toBeDefined();

    // Verify newly registered student can immediately fetch their own digital twin
    const twin = await api.getStudentTwin();
    expect(twin.studentId).toBe(res.user.studentId);
    expect(twin.velocity).toBeDefined();

    // Verify risks and path are initialized
    const risks = await api.getStudentRisks();
    expect(risks.risks.length).toBeGreaterThan(0);

    const path = await api.getStudentPath();
    expect(path.steps.length).toBeGreaterThan(0);
  });

  it('register with existing email throws 409 conflict', async () => {
    await expect(
      api.register('Duplicate User', 'demo1@neurolearn.ai', 'password123')
    ).rejects.toThrow(ClientError);

    try {
      await api.register('Duplicate User', 'demo1@neurolearn.ai', 'password123');
    } catch (e: any) {
      expect(e.status).toBe(409);
      expect(e.code).toBe('EMAIL_ALREADY_EXISTS');
    }
  });
});

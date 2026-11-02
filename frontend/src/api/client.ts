import {
  User,
  AuthResponse,
  Concept,
  ConceptGraph,
  DigitalTwin,
  TwinHistoryPoint,
  RisksResponse,
  RootGapItem,
  LearningPath,
  PathStep,
  AttemptPayload,
  AttemptResponse,
  AttemptHistoryItem,
  StudentSummary,
  Cohort,
  AlertItem,
  CommonGapItem,
  ModelMetrics,
  ApiError,
} from '@/api/types';
import {
  GRAPH,
  METRICS,
  USERS,
  verifyStudentAccess,
  verifyCohortAccess,
  getStudentTwin,
  getStudentTwinHistory,
  getStudentRisks,
  getStudentRootGaps,
  getStudentPath,
  togglePathStep,
  updateStudentPathInMock,
  recordAttempt,
  getStudentAttempts,
  getFacultyCohorts,
  getCohortStudents,
  getFacultyAlerts,
  getFacultyCommonGaps,
  getCohortMasterySummary,
  createDefaultStudentStore,
} from './mocks/mockDb';
import { getRecommendedVideo, getRecommendedVideos } from '@/lib/videoRecommender';

const TOKEN_KEY = 'neurolearn_auth_token';
const USER_KEY = 'neurolearn_auth_user';

export const getApiBase = (): string => {
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:3001`;
  }
  return 'http://127.0.0.1:3001';
};

export class ClientError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(status: number, message: string, code: string, details?: unknown) {
    super(message);
    this.name = 'ClientError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const getStoredToken = (): string | null => {
  return sessionStorage.getItem(TOKEN_KEY);
};

export const getStoredUser = (): User | null => {
  const json = sessionStorage.getItem(USER_KEY);
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
};

export const setAuthSession = (token: string, user: User): void => {
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const clearAuthSession = (): void => {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
};

// Simulate token decoding
function getCurrentUser(): User {
  const user = getStoredUser();
  const token = getStoredToken();
  if (!token || !user) {
    throw new ClientError(401, 'Authentication token missing or invalid', 'UNAUTHORIZED');
  }
  return user;
}

// Mock API Client implementing real ownership rules
export const api = {
  // Auth
  async login(email: string, password: string): Promise<AuthResponse> {
    // Rate limiting simulation check: 429
    if (email.includes('ratelimit')) {
      throw new ClientError(429, 'Too many login attempts. Please wait a minute.', 'RATE_LIMITED');
    }

    // Attempt live backend authentication first
    try {
      const resp = await fetch(`${getApiBase()}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (resp.ok) {
        const data = await resp.json();
        const matched = USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
        const finalUser: User = {
          id: data.user?.id || matched?.id || 'user-unknown',
          email: data.user?.email || email,
          name: data.user?.name || matched?.name || 'User',
          role: data.user?.role || matched?.role || 'student',
          studentId: data.user?.studentId || matched?.studentId,
          cohortIds: matched?.cohortIds || ['cohort-a'],
        };
        setAuthSession(data.token, finalUser);
        return { token: data.token, user: finalUser };
      }
    } catch {
      // Live backend offline or unreachable; fall back seamlessly to local mock store
    }

    await new Promise((r) => setTimeout(r, 150));
    const matched = USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
    // Single error message for wrong email or wrong password as specified in Section 6.2
    if (!matched || password !== 'demo') {
      throw new ClientError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
    }

    const token = `fake-jwt-${matched.id}-${Date.now()}`;
    setAuthSession(token, matched);
    return { token, user: matched };
  },

  // Register
  async register(name: string, email: string, password: string, cohortId?: string): Promise<AuthResponse> {
    // Attempt live backend registration first
    try {
      const resp = await fetch(`${getApiBase()}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, cohortId }),
      });
      if (resp.ok) {
        const data = await resp.json();
        const finalUser: User = {
          id: data.user?.id || `user-${Date.now()}`,
          email: data.user?.email || email,
          name: data.user?.name || name,
          role: data.user?.role || 'student',
          studentId: data.user?.studentId,
          cohortIds: cohortId ? [cohortId] : ['cohort-a'],
        };
        USERS.push(finalUser);
        if (finalUser.studentId) {
          createDefaultStudentStore(finalUser.studentId, finalUser.name);
        }
        setAuthSession(data.token, finalUser);
        return { token: data.token, user: finalUser };
      } else {
        const errJson = await resp.json().catch(() => ({}));
        if (resp.status === 409 || errJson.error?.includes('already in use') || errJson.code === 'EMAIL_ALREADY_EXISTS') {
          throw new ClientError(409, errJson.error || 'Email already in use', 'EMAIL_ALREADY_EXISTS');
        }
        throw new ClientError(resp.status, errJson.error || 'Registration failed', errJson.code || 'REGISTRATION_FAILED');
      }
    } catch (err: any) {
      if (err instanceof ClientError) {
        throw err;
      }
      // Live backend offline or unreachable; fall back seamlessly to local mock store
    }

    // Offline / Mock registration
    await new Promise((r) => setTimeout(r, 150));
    const matched = USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (matched) {
      throw new ClientError(409, 'Email already in use', 'EMAIL_ALREADY_EXISTS');
    }

    const newStudentId = `00000000-0000-0000-0000-${Date.now().toString().slice(-12).padStart(12, '0')}`;
    const newUserId = `user-${Date.now()}`;
    const newUser: User = {
      id: newUserId,
      email,
      name,
      role: 'student',
      studentId: newStudentId,
      cohortIds: [cohortId || 'cohort-a'],
    };

    USERS.push(newUser);
    createDefaultStudentStore(newStudentId, name);

    const token = `fake-jwt-${newUserId}-${Date.now()}`;
    setAuthSession(token, newUser);
    return { token, user: newUser };
  },

  logout(): void {
    clearAuthSession();
  },

  async getMe(): Promise<User> {
    return getCurrentUser();
  },

  // Concepts
  async getConcepts(): Promise<Concept[]> {
    getCurrentUser();
    return GRAPH.nodes;
  },

  async getConceptGraph(): Promise<ConceptGraph> {
    getCurrentUser();
    return GRAPH;
  },

  // Student Endpoints
  async getStudentTwin(targetStudentId?: string): Promise<DigitalTwin> {
    const user = getCurrentUser();
    if (user.role === 'student' && targetStudentId && targetStudentId !== user.studentId) {
      throw new ClientError(403, 'Access denied: You do not have permission to view other student data', 'FORBIDDEN');
    }
    const studentId = targetStudentId || (user.role === 'student' ? user.studentId! : undefined);

    if (!studentId) {
      throw new ClientError(400, 'Student ID required', 'BAD_REQUEST');
    }

    if (!verifyStudentAccess(user, studentId)) {
      throw new ClientError(403, 'Access denied: You do not have permission to view this student data', 'FORBIDDEN');
    }

    const token = getStoredToken();
    if (token) {
      try {
        const resp = await fetch(`${getApiBase()}/students/${studentId}/twin`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (resp.ok) {
          const data = await resp.json();
          const masteryAll: Record<number, number> = {};
          if (data.masteryAll) {
            for (const [k, v] of Object.entries(data.masteryAll)) {
              masteryAll[Number(k)] = Number(v);
            }
          }
          const velocity = typeof data.velocity === 'number' ? data.velocity : 0.85;
          const confidence = typeof data.confidence === 'number' ? data.confidence : 0.94;

          return {
            studentId,
            computedAt: data.computedAt || new Date().toISOString(),
            masteryAll,
            velocity,
            consistency: typeof data.consistency === 'number' ? data.consistency : 0.78,
            engagement: typeof data.engagement === 'number' ? data.engagement : 0.85,
            confidence,
            totalAttempts: Number(data.totalAttempts || 48),
            lastAttemptAt: data.lastAttemptAt || data.computedAt,
          };
        }
      } catch {
        // Fall back to in-memory store
      }
    }

    const twin = getStudentTwin(studentId);
    if (!twin) {
      throw new ClientError(404, 'Student twin record not found', 'NOT_FOUND');
    }
    return twin;
  },

  async getStudentTwinHistory(targetStudentId?: string): Promise<TwinHistoryPoint[]> {
    const user = getCurrentUser();
    if (user.role === 'student' && targetStudentId && targetStudentId !== user.studentId) {
      throw new ClientError(403, 'Access denied: You do not have permission to view other student data', 'FORBIDDEN');
    }
    const studentId = targetStudentId || (user.role === 'student' ? user.studentId! : undefined);

    if (!studentId || !verifyStudentAccess(user, studentId)) {
      throw new ClientError(403, 'Access denied', 'FORBIDDEN');
    }

    const token = getStoredToken();
    if (token) {
      try {
        const resp = await fetch(`${getApiBase()}/students/${studentId}/twin/history`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (resp.ok) {
          const list = await resp.json();
          if (Array.isArray(list)) {
            if (list.length === 0) {
              return [
                {
                  date: new Date().toISOString().split('T')[0],
                  averageMastery: 0.5,
                  averageRisk: 0.2,
                  velocity: 0.8,
                  consistency: 0.8,
                },
              ];
            }
            return list.map((item: any) => {
              const masteries = Object.values((item.masteryAll || {}) as Record<string, number>);
              const avgMastery = masteries.length > 0
                ? Number((masteries.reduce((a, b) => a + b, 0) / masteries.length).toFixed(2))
                : 0.5;
              const high = item.riskSummary?.high || 0;
              const med = item.riskSummary?.medium || 0;
              const low = item.riskSummary?.low || 0;
              const total = Math.max(1, high + med + low);
              const avgRisk = Number(((high * 0.8 + med * 0.5 + low * 0.1) / total).toFixed(2));

              return {
                date: item.computedAt ? item.computedAt.split('T')[0] : new Date().toISOString().split('T')[0],
                averageMastery: avgMastery,
                averageRisk: avgRisk,
                velocity: typeof item.velocity === 'number' ? item.velocity : 0.82,
                consistency: typeof item.consistency === 'number' ? item.consistency : 0.85,
              };
            });
          }
        }
      } catch {
        // Fall back to in-memory store
      }
    }

    return getStudentTwinHistory(studentId);
  },

  async getStudentRisks(targetStudentId?: string): Promise<RisksResponse> {
    const user = getCurrentUser();
    if (user.role === 'student' && targetStudentId && targetStudentId !== user.studentId) {
      throw new ClientError(403, 'Access denied: You do not have permission to view other student data', 'FORBIDDEN');
    }
    const studentId = targetStudentId || (user.role === 'student' ? user.studentId! : undefined);

    if (!studentId) {
      throw new ClientError(400, 'Student ID required', 'BAD_REQUEST');
    }

    if (!verifyStudentAccess(user, studentId)) {
      throw new ClientError(403, 'Access denied: You do not have permission to view this student data', 'FORBIDDEN');
    }

    const token = getStoredToken();
    if (token) {
      try {
        const resp = await fetch(`${getApiBase()}/students/${studentId}/risks`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (resp.ok) {
          const list = await resp.json();
          if (Array.isArray(list)) {
            return {
              studentId,
              modelVersion: '1.0.0',
              stale: false,
              generatedAt: new Date().toISOString(),
              risks: list.map((r: any) => ({
                conceptId: r.conceptId,
                conceptName: r.conceptName || `Concept ${r.conceptId}`,
                risk: Number(r.risk),
                band: r.band,
                reasons: Array.isArray(r.reasons) ? r.reasons : (typeof r.reasons === 'string' ? JSON.parse(r.reasons) : []),
                stale: false,
                computedAt: r.computedAt || new Date().toISOString(),
                confidence: r.risk > 0.8 ? 'high' : r.risk > 0.4 ? 'medium' : 'low',
                trend: 'steady',
                attemptsCount: 3,
              })),
            };
          }
        }
      } catch {
        // Fall back to in-memory store
      }
    }

    const risks = getStudentRisks(studentId);
    if (!risks) {
      throw new ClientError(404, 'Risks prediction not found for student', 'NOT_FOUND');
    }
    return risks;
  },

  async getStudentRootGaps(targetStudentId?: string): Promise<RootGapItem[]> {
    const user = getCurrentUser();
    if (user.role === 'student' && targetStudentId && targetStudentId !== user.studentId) {
      throw new ClientError(403, 'Access denied: You do not have permission to view other student data', 'FORBIDDEN');
    }
    const studentId = targetStudentId || (user.role === 'student' ? user.studentId! : undefined);

    if (!studentId || !verifyStudentAccess(user, studentId)) {
      throw new ClientError(403, 'Access denied', 'FORBIDDEN');
    }

    const token = getStoredToken();
    if (token) {
      try {
        const resp = await fetch(`${getApiBase()}/students/${studentId}/root-gaps`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (resp.ok) {
          const list = await resp.json();
          if (Array.isArray(list)) {
            return list.map((g: any) => ({
              conceptId: g.conceptId,
              conceptName: g.name || `Concept ${g.conceptId}`,
              rootGapId: g.rootGapId,
              rootGapName: g.name || `Concept ${g.rootGapId}`,
              chain: g.chain || [g.rootGapId, g.conceptId],
              chainDetails: (g.chain || [g.rootGapId, g.conceptId]).map((cid: number) => {
                const node = GRAPH.nodes.find((n) => n.id === cid);
                return {
                  id: cid,
                  name: node?.name || `Concept ${cid}`,
                  mastery: Number(g.mastery || 0.4),
                };
              }),
              blockedCount: g.blockedDescendants || 2,
              currentMastery: Number(g.mastery || 0.4),
            }));
          }
        }
      } catch {
        // Fall back to in-memory store
      }
    }

    return getStudentRootGaps(studentId);
  },

  async getStudentPath(targetStudentId?: string): Promise<LearningPath> {
    const user = getCurrentUser();
    if (user.role === 'student' && targetStudentId && targetStudentId !== user.studentId) {
      throw new ClientError(403, 'Access denied: You do not have permission to view other student data', 'FORBIDDEN');
    }
    const studentId = targetStudentId || (user.role === 'student' ? user.studentId! : undefined);

    if (!studentId || !verifyStudentAccess(user, studentId)) {
      throw new ClientError(403, 'Access denied', 'FORBIDDEN');
    }

    const token = getStoredToken();
    if (token) {
      try {
        const resp = await fetch(`${getApiBase()}/students/${studentId}/path`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (resp.ok) {
          const data = await resp.json();
          if (Array.isArray(data.steps) && data.steps.length > 0) {
            const steps: PathStep[] = data.steps.map((s: any, idx: number) => ({
              id: s.id || `step_${idx + 1}`,
              conceptId: s.conceptId,
              conceptName: s.conceptName || `Concept ${s.conceptId}`,
              resourceId: s.resourceId || 1,
              resourceTitle: s.resourceTitle || `Resource for ${s.conceptName}`,
              resourceType: s.resourceType || 'practice',
              url: s.resourceUrl || 'https://leetcode.com',
              minutes: s.minutes || 30,
              reason: s.reason || 'Core remediation step',
              done: Boolean(s.done),
            }));
            const totalMinutes = data.totalMinutes || steps.reduce((sum: number, s: any) => sum + s.minutes, 0);
            const remainingMinutes =
              data.remainingMinutes !== undefined
                ? data.remainingMinutes
                : steps.filter((s) => !s.done).reduce((sum, s) => sum + s.minutes, 0);

            updateStudentPathInMock(studentId, steps, totalMinutes, remainingMinutes);

            return {
              studentId,
              steps,
              totalMinutes,
              remainingMinutes,
            };
          }
        }
      } catch {
        // Fall back to in-memory store
      }
    }

    const path = getStudentPath(studentId);
    if (!path) {
      throw new ClientError(404, 'Learning path not generated yet', 'NOT_FOUND');
    }
    return path;
  },

  async togglePathStep(stepId: string, done?: boolean, stepIndex?: number): Promise<LearningPath> {
    const user = getCurrentUser();
    if (user.role !== 'student' || !user.studentId) {
      throw new ClientError(403, 'Only students can modify their own learning path', 'FORBIDDEN');
    }

    const token = getStoredToken();
    if (token) {
      try {
        const resp = await fetch(`${getApiBase()}/path-steps/${stepId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ done, stepIndex }),
        });
        if (resp.ok) {
          const data = await resp.json();
          if (Array.isArray(data.steps) && data.steps.length > 0) {
            const steps: PathStep[] = data.steps.map((s: any, idx: number) => ({
              id: s.id || `step_${idx + 1}`,
              conceptId: s.conceptId,
              conceptName: s.conceptName || `Concept ${s.conceptId}`,
              resourceId: s.resourceId || 1,
              resourceTitle: s.resourceTitle || `Resource for ${s.conceptName}`,
              resourceType: s.resourceType || 'practice',
              url: s.resourceUrl || 'https://leetcode.com',
              minutes: s.minutes || 30,
              reason: s.reason || 'Core remediation step',
              done: Boolean(s.done),
            }));
            const totalMinutes = data.totalMinutes || steps.reduce((sum, s) => sum + s.minutes, 0);
            const remainingMinutes =
              data.remainingMinutes !== undefined
                ? data.remainingMinutes
                : steps.filter((s) => !s.done).reduce((sum, s) => sum + s.minutes, 0);

            updateStudentPathInMock(user.studentId, steps, totalMinutes, remainingMinutes);

            return {
              studentId: user.studentId,
              steps,
              totalMinutes,
              remainingMinutes,
            };
          }
        }
      } catch {
        // Backend offline, local state fallback
      }
    }

    // Update in-memory / local storage immediately
    const path = togglePathStep(user.studentId, stepId, done);
    if (!path) {
      throw new ClientError(404, 'Path not found', 'NOT_FOUND');
    }
    return path;
  },

  async submitAttempt(payload: AttemptPayload): Promise<AttemptResponse> {
    const user = getCurrentUser();
    if (user.role !== 'student' || !user.studentId) {
      throw new ClientError(403, 'Only students can submit exercise attempts', 'FORBIDDEN');
    }

    // 1. Immediately update reactive in-memory state so UI updates in real-time
    const res = recordAttempt(user.studentId, payload);

    // 2. Dispatch to live backend and PostgreSQL database if available
    const token = getStoredToken();
    if (token) {
      try {
        const scoreRatio = payload.score > 1 ? Number((payload.score / 100).toFixed(4)) : payload.score;
        await fetch(`${getApiBase()}/attempts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            clientAttemptId: payload.clientAttemptId,
            studentId: user.studentId,
            conceptId: payload.conceptId,
            score: scoreRatio,
            timeSpentSeconds: payload.timeSpentSeconds || 600,
            hintsUsed: payload.hintsUsed || 0,
            assessmentType: payload.attemptType === 'homework' ? 'assignment' : payload.attemptType,
          }),
        });
      } catch {
        // Backend sync silent fail - in-memory reactive update already succeeded
      }
    }

    await new Promise((r) => setTimeout(r, 200));
    return res;
  },

  async getStudentAttempts(targetStudentId?: string): Promise<AttemptHistoryItem[]> {
    const user = getCurrentUser();
    if (user.role === 'student' && targetStudentId && targetStudentId !== user.studentId) {
      throw new ClientError(403, 'Access denied: You do not have permission to view other student data', 'FORBIDDEN');
    }
    const studentId = targetStudentId || (user.role === 'student' ? user.studentId! : undefined);
    if (!studentId || !verifyStudentAccess(user, studentId)) {
      throw new ClientError(403, 'Access denied', 'FORBIDDEN');
    }

    const token = getStoredToken();
    if (token) {
      try {
        const resp = await fetch(`${getApiBase()}/students/${studentId}/attempts`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (resp.ok) {
          const rows = await resp.json();
          if (Array.isArray(rows)) {
            return rows.map((r: any) => ({
              id: r.id,
              clientAttemptId: r.clientAttemptId || r.id,
              studentId: r.studentId,
              conceptId: r.conceptId,
              conceptName: r.conceptName,
              conceptCode: r.conceptCode,
              score: Number(r.score),
              timeSpentSeconds: r.timeSpentSeconds || 600,
              hintsUsed: r.hintsUsed || 0,
              attemptType: r.attemptType || 'practice',
              attemptedAt: r.attemptedAt,
              recommendedVideo: getRecommendedVideo(r.conceptId, r.conceptName, Number(r.score)),
              recommendedVideos: getRecommendedVideos(r.conceptId, r.conceptName, Number(r.score)),
            }));
          }
        }
      } catch {
        // Fall back to in-memory store
      }
    }

    return getStudentAttempts(studentId);
  },

  // Faculty Endpoints
  async getFacultyCohorts(): Promise<Cohort[]> {
    const user = getCurrentUser();
    if (user.role !== 'faculty') {
      throw new ClientError(403, 'Access denied: Faculty role required', 'FORBIDDEN');
    }

    return getFacultyCohorts(user.id);
  },

  async getCohortStudents(cohortId: string): Promise<StudentSummary[]> {
    const user = getCurrentUser();
    if (user.role !== 'faculty') {
      throw new ClientError(403, 'Access denied: Faculty role required', 'FORBIDDEN');
    }

    if (!verifyCohortAccess(user, cohortId)) {
      throw new ClientError(403, 'Access denied: You do not own this cohort', 'FORBIDDEN');
    }

    return getCohortStudents(cohortId);
  },

  async getFacultyAlerts(cohortId?: string): Promise<AlertItem[]> {
    const user = getCurrentUser();
    if (user.role !== 'faculty') {
      throw new ClientError(403, 'Access denied: Faculty role required', 'FORBIDDEN');
    }

    if (cohortId && !verifyCohortAccess(user, cohortId)) {
      throw new ClientError(403, 'Access denied: You do not own this cohort', 'FORBIDDEN');
    }

    return getFacultyAlerts(cohortId);
  },

  async getFacultyCommonGaps(cohortId?: string): Promise<CommonGapItem[]> {
    const user = getCurrentUser();
    if (user.role !== 'faculty') {
      throw new ClientError(403, 'Access denied: Faculty role required', 'FORBIDDEN');
    }

    if (cohortId && !verifyCohortAccess(user, cohortId)) {
      throw new ClientError(403, 'Access denied: You do not own this cohort', 'FORBIDDEN');
    }

    return getFacultyCommonGaps(cohortId);
  },

  async getCohortMasterySummary(cohortId: string): Promise<Record<number, number>> {
    const user = getCurrentUser();
    if (user.role !== 'faculty') {
      throw new ClientError(403, 'Access denied: Faculty role required', 'FORBIDDEN');
    }

    if (!verifyCohortAccess(user, cohortId)) {
      throw new ClientError(403, 'Access denied: You do not own this cohort', 'FORBIDDEN');
    }

    return getCohortMasterySummary(cohortId);
  },

  // Model Metrics (for Landing Page and Faculty Model page)
  async getModelMetrics(): Promise<ModelMetrics> {
    return METRICS as unknown as ModelMetrics;
  },
};

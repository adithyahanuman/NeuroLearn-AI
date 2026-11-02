import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { query } from '../db/pool';
import { HttpError } from '../errors/HttpError';
import { authenticate, canAccessStudent } from '../middleware/auth';
import { RecomputeService } from '../services/recompute.service';

export const studentsRouter = Router();

const uuidPattern = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const studentIdSchema = z.string().regex(uuidPattern, 'Invalid student ID: must be a valid UUID');

const validateId = (req: Request, _res: Response, next: NextFunction) => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const result = studentIdSchema.safeParse(rawId);
  if (!result.success) {
    throw HttpError.badRequest('Invalid student ID: must be a valid UUID', 'INVALID_UUID');
  }
  next();
};

// GET /students/:id/twin (Latest twin snapshot)
studentsRouter.get(
  '/:id/twin',
  authenticate,
  validateId,
  canAccessStudent,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studentId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const snapRes = await query(
        `SELECT state, taken_at
         FROM twin_snapshots
         WHERE student_id = $1
         ORDER BY taken_at DESC
         LIMIT 1`,
        [studentId]
      );

      if (snapRes.rows.length === 0) {
        try {
          const mlResult = await RecomputeService.recompute(studentId, true);
          return res.status(200).json(mlResult.twinSummary);
        } catch {
          return res.status(200).json({
            studentId,
            globalMastery: 0.0,
            engagementScore: 0.0,
            burnoutScore: 0.0,
            dropoutRisk: 0.0,
            examReadiness: 0.0,
            riskBands: { low: 0, medium: 0, high: 0 },
            strengths: [],
            weaknesses: [],
            computedAt: new Date().toISOString(),
          });
        }
      }

      res.status(200).json(snapRes.rows[0].state);
    } catch (err) {
      next(err);
    }
  }
);

// GET /students/:id/twin/history (?weeks=12)
studentsRouter.get(
  '/:id/twin/history',
  authenticate,
  validateId,
  canAccessStudent,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studentId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const weeks = Math.max(1, Math.min(52, parseInt((req.query.weeks as string) || '12', 10)));

      const historyRes = await query(
        `SELECT id, student_id AS "studentId", taken_at AS "takenAt", state
         FROM twin_snapshots
         WHERE student_id = $1
           AND taken_at >= NOW() - ($2 || ' weeks')::interval
         ORDER BY taken_at ASC`,
        [studentId, weeks]
      );

      res.status(200).json(historyRes.rows.map((r) => r.state));
    } catch (err) {
      next(err);
    }
  }
);

// GET /students/:id/risks (Cached with stale fallback & DISTINCT ON)
studentsRouter.get(
  '/:id/risks',
  authenticate,
  validateId,
  canAccessStudent,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studentId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const risks = await RecomputeService.getRisksWithFallback(studentId);
      res.status(200).json(risks);
    } catch (err) {
      next(err);
    }
  }
);

// GET /students/:id/root-gaps
studentsRouter.get(
  '/:id/root-gaps',
  authenticate,
  validateId,
  canAccessStudent,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studentId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      // Extract all active root gaps across the latest concept predictions
      const resPred = await query(
        `SELECT DISTINCT ON (concept_id) concept_id, root_gaps
         FROM predictions
         WHERE student_id = $1
         ORDER BY concept_id, created_at DESC`,
        [studentId]
      );

      const allGaps: any[] = [];
      const seenGapKeys = new Set<string>();

      for (const row of resPred.rows) {
        const gaps = Array.isArray(row.root_gaps) ? row.root_gaps : [];
        for (const gap of gaps) {
          const key = `${gap.conceptId || row.concept_id}-${gap.rootGapId}`;
          if (!seenGapKeys.has(key)) {
            seenGapKeys.add(key);
            allGaps.push({
              conceptId: gap.conceptId || row.concept_id,
              rootGapId: gap.rootGapId,
              code: gap.code,
              name: gap.name,
              mastery: gap.mastery,
              chain: gap.chain,
              blockedDescendants: gap.blockedDescendants,
              score: gap.score,
              isTargetItself: gap.isTargetItself,
            });
          }
        }
      }

      res.status(200).json(allGaps);
    } catch (err) {
      next(err);
    }
  }
);

// GET /students/:id/path
studentsRouter.get(
  '/:id/path',
  authenticate,
  validateId,
  canAccessStudent,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studentId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      const recRes = await query(
        `SELECT id, generated_at, status, path
         FROM recommendations
         WHERE student_id = $1 AND status = 'active'
         ORDER BY generated_at DESC
         LIMIT 1`,
        [studentId]
      );

      if (recRes.rows.length === 0) {
        res.status(200).json({ steps: [] });
        return;
      }

      const recommendation = recRes.rows[0];
      const progRes = await query(
        `SELECT step_index FROM path_progress WHERE recommendation_id = $1`,
        [recommendation.id]
      );

      const completedSteps = new Set(progRes.rows.map((r) => r.step_index));
      const steps = (Array.isArray(recommendation.path) ? recommendation.path : []).map(
        (step: any, index: number) => ({
          ...step,
          id: step.id || `${recommendation.id}_step_${index}`,
          stepIndex: index,
          done: completedSteps.has(index),
        })
      );

      res.status(200).json({
        recommendationId: recommendation.id,
        status: recommendation.status,
        generatedAt: new Date(recommendation.generated_at).toISOString(),
        steps,
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /students/:id/path/regenerate
studentsRouter.post(
  '/:id/path/regenerate',
  authenticate,
  validateId,
  canAccessStudent,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studentId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const mlResult = await RecomputeService.recompute(studentId, true);

      // Fetch newly created active recommendation
      const recRes = await query(
        `SELECT id, generated_at, status, path
         FROM recommendations
         WHERE student_id = $1 AND status = 'active'
         ORDER BY generated_at DESC
         LIMIT 1`,
        [studentId]
      );

      const rec = recRes.rows[0] || {
        id: null,
        generated_at: new Date(),
        status: 'active',
        path: mlResult.path || [],
      };

      const steps = (Array.isArray(rec.path) ? rec.path : []).map((step: any, index: number) => ({
        ...step,
        id: step.id || `${rec.id}_step_${index}`,
        stepIndex: index,
        done: false,
      }));

      res.status(201).json({
        recommendationId: rec.id,
        status: rec.status,
        generatedAt: new Date(rec.generated_at).toISOString(),
        steps,
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /students/:id/attempts (Log attempts history)
studentsRouter.get(
  '/:id/attempts',
  authenticate,
  validateId,
  canAccessStudent,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studentId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const limit = Math.max(1, Math.min(100, parseInt((req.query.limit as string) || '50', 10)));

      const attemptsRes = await query(
        `SELECT a.id, a.student_id AS "studentId", a.concept_id AS "conceptId",
                c.name AS "conceptName", c.code AS "conceptCode",
                a.score::float AS score, a.time_spent_sec AS "timeSpentSeconds",
                a.hints_used AS "hintsUsed", a.assessment_type AS "attemptType",
                a.attempted_at AS "attemptedAt", a.client_attempt_id AS "clientAttemptId"
         FROM attempts a
         JOIN concepts c ON a.concept_id = c.id
         WHERE a.student_id = $1
         ORDER BY a.attempted_at DESC
         LIMIT $2`,
        [studentId, limit]
      );

      res.status(200).json(attemptsRes.rows);
    } catch (err) {
      next(err);
    }
  }
);

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { query } from '../db/pool';
import { HttpError } from '../errors/HttpError';
import { authenticate, requireRole } from '../middleware/auth';

export const cohortsRouter = Router();

const cohortIdSchema = z.string().uuid('Invalid cohort ID format');

const verifyCohortAccess = async (req: Request, _res: Response, next: NextFunction) => {
  const cohortId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const valid = cohortIdSchema.safeParse(cohortId);
  if (!valid.success) {
    throw HttpError.badRequest('Invalid cohort ID format', 'INVALID_UUID');
  }

  // Check if cohort exists
  const cohortRes = await query('SELECT id, faculty_id FROM cohorts WHERE id = $1', [cohortId]);
  if (cohortRes.rows.length === 0) {
    throw HttpError.notFound('Cohort not found', 'NOT_FOUND');
  }

  // Check if current faculty user owns this cohort
  if (cohortRes.rows[0].faculty_id !== req.user!.sub) {
    throw HttpError.forbidden('Access denied to cohorts managed by other faculty', 'FORBIDDEN');
  }

  next();
};

// GET /cohorts (Faculty only)
cohortsRouter.get('/', authenticate, requireRole('faculty'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await query(
      `SELECT c.id, c.name, COUNT(s.id)::int AS "studentCount"
       FROM cohorts c
       LEFT JOIN students s ON s.cohort_id = c.id
       WHERE c.faculty_id = $1
       GROUP BY c.id, c.name
       ORDER BY c.name ASC`,
      [req.user!.sub]
    );

    res.status(200).json(result.rows);
  } catch (err) {
    next(err);
  }
});

// GET /cohorts/:id/summary
cohortsRouter.get(
  '/:id/summary',
  authenticate,
  requireRole('faculty'),
  verifyCohortAccess,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const cohortId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      // Compute band counts and average mastery from latest predictions and snapshots
      const bandRes = await query(
        `WITH latest_preds AS (
           SELECT DISTINCT ON (p.student_id, p.concept_id) p.band
           FROM predictions p
           JOIN students s ON s.id = p.student_id
           WHERE s.cohort_id = $1
           ORDER BY p.student_id, p.concept_id, p.created_at DESC
         )
         SELECT 
           COUNT(*) FILTER (WHERE band = 'low')::int AS low,
           COUNT(*) FILTER (WHERE band = 'medium')::int AS medium,
           COUNT(*) FILTER (WHERE band = 'high')::int AS high
         FROM latest_preds`,
        [cohortId]
      );

      const bandCounts = bandRes.rows[0] || { low: 0, medium: 0, high: 0 };

      // Compute average student score/mastery across cohort
      const scoreRes = await query(
        `SELECT COALESCE(AVG(a.score), 0.70)::float AS "avgScore"
         FROM attempts a
         JOIN students s ON s.id = a.student_id
         WHERE s.cohort_id = $1`,
        [cohortId]
      );

      res.status(200).json({
        bandCounts,
        averageMastery: Number(scoreRes.rows[0]?.avgScore || 0.7),
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /cohorts/:id/students
cohortsRouter.get(
  '/:id/students',
  authenticate,
  requireRole('faculty'),
  verifyCohortAccess,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const cohortId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      // Risk score is mean of top 5 concept risks per student
      const studentsRes = await query(
        `WITH latest_preds AS (
           SELECT DISTINCT ON (p.student_id, p.concept_id)
             p.student_id,
             p.concept_id,
             p.risk::float AS risk,
             p.root_gaps
           FROM predictions p
           JOIN students s ON s.id = p.student_id
           WHERE s.cohort_id = $1
           ORDER BY p.student_id, p.concept_id, p.created_at DESC
         ),
         ranked_preds AS (
           SELECT 
             student_id,
             risk,
             root_gaps,
             ROW_NUMBER() OVER (PARTITION BY student_id ORDER BY risk DESC) as rn
           FROM latest_preds
         ),
         student_agg AS (
           SELECT 
             student_id,
             AVG(risk) FILTER (WHERE rn <= 5) AS risk_score,
             (ARRAY_AGG(root_gaps) FILTER (WHERE jsonb_array_length(root_gaps) > 0))[1] AS top_gaps
           FROM ranked_preds
           GROUP BY student_id
         )
         SELECT 
           s.id AS "studentId",
           u.name,
           u.email,
           COALESCE(ROUND(sa.risk_score::numeric, 3)::float, 0.250) AS "riskScore",
           'steady' AS trend,
           COALESCE(sa.top_gaps->0->>'name', 'None') AS "topRootGap"
         FROM students s
         JOIN users u ON u.id = s.user_id
         LEFT JOIN student_agg sa ON sa.student_id = s.id
         WHERE s.cohort_id = $1
         ORDER BY "riskScore" DESC, u.name ASC`,
        [cohortId]
      );

      res.status(200).json(studentsRes.rows);
    } catch (err) {
      next(err);
    }
  }
);

// GET /cohorts/:id/alerts (Rises >= 0.2 in 7 days)
cohortsRouter.get(
  '/:id/alerts',
  authenticate,
  requireRole('faculty'),
  verifyCohortAccess,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const cohortId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      // Query for predictions where risk delta rose by >= 0.20 in 7 days
      const alertsRes = await query(
        `WITH recent_preds AS (
           SELECT 
             p.student_id,
             p.concept_id,
             p.risk::float AS risk,
             p.created_at,
             ROW_NUMBER() OVER (PARTITION BY p.student_id, p.concept_id ORDER BY p.created_at DESC) as rn
           FROM predictions p
           JOIN students s ON s.id = p.student_id
           WHERE s.cohort_id = $1
             AND p.created_at >= NOW() - INTERVAL '14 days'
         ),
         p_latest AS (
           SELECT student_id, concept_id, risk, created_at FROM recent_preds WHERE rn = 1
         ),
         p_prev AS (
           SELECT student_id, concept_id, risk FROM recent_preds WHERE rn = 2
         )
         SELECT 
           l.student_id AS "studentId",
           c.name AS "conceptName",
           l.concept_id AS "conceptId",
           ROUND((l.risk - p.risk)::numeric, 3)::float AS "riskDelta",
           l.created_at AS "detectedAt"
         FROM p_latest l
         JOIN p_prev p ON p.student_id = l.student_id AND p.concept_id = l.concept_id
         JOIN concepts c ON c.id = l.concept_id
         WHERE (l.risk - p.risk) >= 0.20
         ORDER BY "riskDelta" DESC, l.created_at DESC`,
        [cohortId]
      );

      res.status(200).json(alertsRes.rows);
    } catch (err) {
      next(err);
    }
  }
);

// GET /cohorts/:id/gaps (Distinct students per root gap among concepts with risk >= 0.5)
cohortsRouter.get(
  '/:id/gaps',
  authenticate,
  requireRole('faculty'),
  verifyCohortAccess,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const cohortId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      const gapsRes = await query(
        `WITH latest_risky AS (
           SELECT DISTINCT ON (p.student_id, p.concept_id)
             p.student_id,
             p.concept_id,
             p.risk,
             p.root_gaps
           FROM predictions p
           JOIN students s ON s.id = p.student_id
           WHERE s.cohort_id = $1
             AND p.risk >= 0.50
           ORDER BY p.student_id, p.concept_id, p.created_at DESC
         ),
         extracted_gaps AS (
           SELECT 
             lr.student_id,
             (g->>'rootGapId')::int AS root_gap_id,
             g->>'name' AS gap_name
           FROM latest_risky lr,
           jsonb_array_elements(lr.root_gaps) AS g
         )
         SELECT 
           root_gap_id AS "conceptId",
           gap_name AS "conceptName",
           COUNT(DISTINCT student_id)::int AS "studentCount"
         FROM extracted_gaps
         GROUP BY root_gap_id, gap_name
         ORDER BY "studentCount" DESC, gap_name ASC`,
        [cohortId]
      );

      res.status(200).json(gapsRes.rows);
    } catch (err) {
      next(err);
    }
  }
);

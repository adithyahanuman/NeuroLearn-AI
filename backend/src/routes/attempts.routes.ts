import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { query } from '../db/pool';
import { HttpError } from '../errors/HttpError';
import { authenticate } from '../middleware/auth';
import { RecomputeService } from '../services/recompute.service';

export const attemptsRouter = Router();

const uuidPattern = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

const attemptSchema = z.object({
  clientAttemptId: z.string().regex(uuidPattern, 'clientAttemptId must be a valid UUID'),
  studentId: z.string().regex(uuidPattern, 'studentId must be a valid UUID'),
  conceptId: z.union([z.number().int().positive(), z.string().min(1)]),
  score: z.number().min(0).max(1),
  timeSpentSeconds: z.number().int().min(0),
  hintsUsed: z.number().int().min(0).default(0),
  assessmentType: z.enum(['practice', 'quiz', 'assignment']).default('practice'),
});

// POST /attempts (Role: student, own data only)
attemptsRouter.post('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = attemptSchema.parse(req.body);

    // Ownership check: must be student role and own studentId
    if (req.user!.role !== 'student' || req.user!.studentId !== data.studentId) {
      throw HttpError.forbidden('Students may only log attempts for their own account', 'FORBIDDEN');
    }

    // Resolve conceptId if code string was provided
    let conceptId: number;
    if (typeof data.conceptId === 'number') {
      conceptId = data.conceptId;
    } else {
      const conceptRes = await query('SELECT id FROM concepts WHERE code = $1', [data.conceptId]);
      if (conceptRes.rows.length === 0) {
        throw HttpError.badRequest('Invalid concept code or ID', 'INVALID_CONCEPT');
      }
      conceptId = conceptRes.rows[0].id;
    }

    // Check that concept exists
    const conceptCheck = await query('SELECT id FROM concepts WHERE id = $1', [conceptId]);
    if (conceptCheck.rows.length === 0) {
      throw HttpError.badRequest('Concept does not exist', 'INVALID_CONCEPT');
    }

    // Attempt INSERT with ON CONFLICT DO NOTHING (idempotency key: student_id + client_attempt_id)
    const insertRes = await query(
      `INSERT INTO attempts (
         student_id, concept_id, score, time_spent_sec, hints_used, 
         assessment_type, client_attempt_id, attempted_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (student_id, client_attempt_id) DO NOTHING
       RETURNING id, attempted_at`,
      [
        data.studentId,
        conceptId,
        data.score,
        data.timeSpentSeconds,
        data.hintsUsed,
        data.assessmentType,
        data.clientAttemptId,
      ]
    );

    // If no row returned, this is an idempotent duplicate
    if (insertRes.rows.length === 0) {
      const snapRes = await query(
        `SELECT state, taken_at
         FROM twin_snapshots
         WHERE student_id = $1
         ORDER BY taken_at DESC
         LIMIT 1`,
        [data.studentId]
      );

      res.setHeader('Idempotent-Replay', 'true');
      if (snapRes.rows.length > 0) {
        res.status(200).json({
          summary: snapRes.rows[0].state,
          computedAt: new Date(snapRes.rows[0].taken_at).toISOString(),
        });
        return;
      }

      res.status(200).json({
        message: 'Attempt already recorded',
        clientAttemptId: data.clientAttemptId,
      });
      return;
    }

    // Recompute outside transaction
    const recomputeRes = await RecomputeService.recompute(data.studentId, true);

    res.status(201).json({
      summary: recomputeRes.twinSummary,
      computedAt: recomputeRes.twinSummary.computedAt,
    });
  } catch (err) {
    next(err);
  }
});

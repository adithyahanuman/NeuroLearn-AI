import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { query } from '../db/pool';
import { HttpError } from '../errors/HttpError';
import { authenticate } from '../middleware/auth';

export const pathStepsRouter = Router();

const patchStepSchema = z.object({
  done: z.boolean().optional(),
  recommendationId: z.string().uuid().optional(),
  stepIndex: z.number().int().min(0).optional(),
});

// PATCH /path-steps/:id (Marks a step completed/incomplete and returns the updated path)
pathStepsRouter.patch('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const body = patchStepSchema.parse(req.body);

    let recommendationId = body.recommendationId;
    let stepIndex = body.stepIndex;

    // If ID formatted as "<recId>_step_<index>"
    if (rawId && rawId.includes('_step_')) {
      const parts = rawId.split('_step_');
      recommendationId = parts[0];
      stepIndex = parseInt(parts[1], 10);
    } else if (rawId && typeof rawId === 'string' && rawId.startsWith('step_') && stepIndex === undefined) {
      const num = parseInt(rawId.substring(5), 10);
      if (!isNaN(num)) {
        stepIndex = num - 1; // 1-based "step_1" -> index 0
      }
    } else if (rawId && !isNaN(parseInt(rawId, 10)) && stepIndex === undefined) {
      stepIndex = parseInt(rawId, 10);
    }

    // If recommendationId still not known, find student's active recommendation
    if (!recommendationId) {
      if (!req.user?.studentId) {
        throw HttpError.badRequest('Could not resolve active recommendation for user', 'BAD_REQUEST');
      }
      const recRes = await query(
        `SELECT id FROM recommendations WHERE student_id = $1 AND status = 'active' ORDER BY generated_at DESC LIMIT 1`,
        [req.user.studentId]
      );
      if (recRes.rows.length === 0) {
        throw HttpError.notFound('No active recommendation found', 'RECOMMENDATION_NOT_FOUND');
      }
      recommendationId = recRes.rows[0].id;
    }

    if (stepIndex === undefined || isNaN(stepIndex)) {
      throw HttpError.badRequest('Invalid or missing step index', 'BAD_REQUEST');
    }

    // Verify recommendation exists
    const recCheck = await query(`SELECT id, student_id, path, generated_at, status FROM recommendations WHERE id = $1`, [
      recommendationId,
    ]);
    if (recCheck.rows.length === 0) {
      throw HttpError.notFound('Recommendation not found', 'RECOMMENDATION_NOT_FOUND');
    }

    const rec = recCheck.rows[0];

    // Ownership check: if user is student, must own recommendation
    if (req.user?.role === 'student' && req.user.studentId !== rec.student_id) {
      throw HttpError.forbidden('Access denied to update path for another student', 'FORBIDDEN');
    }

    // Determine target 'done' status (toggle if not specified)
    let targetDone = body.done;
    if (targetDone === undefined) {
      const existing = await query(
        `SELECT 1 FROM path_progress WHERE recommendation_id = $1 AND step_index = $2`,
        [recommendationId, stepIndex]
      );
      targetDone = existing.rows.length === 0;
    }

    if (targetDone) {
      await query(
        `INSERT INTO path_progress (recommendation_id, step_index, completed_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (recommendation_id, step_index) DO NOTHING`,
        [recommendationId, stepIndex]
      );
    } else {
      await query(
        `DELETE FROM path_progress WHERE recommendation_id = $1 AND step_index = $2`,
        [recommendationId, stepIndex]
      );
    }

    // Fetch updated completion states
    const progRes = await query(
      `SELECT step_index FROM path_progress WHERE recommendation_id = $1`,
      [recommendationId]
    );
    const completedIndexes = new Set(progRes.rows.map((r) => r.step_index));

    const steps = (Array.isArray(rec.path) ? rec.path : []).map((step: any, index: number) => ({
      ...step,
      id: step.id || `${recommendationId}_step_${index}`,
      stepIndex: index,
      done: completedIndexes.has(index),
    }));

    const totalMinutes = steps.reduce((sum: number, s: any) => sum + (s.minutes || 0), 0);
    const remainingMinutes = steps
      .filter((s: any) => !s.done)
      .reduce((sum: number, s: any) => sum + (s.minutes || 0), 0);

    res.status(200).json({
      recommendationId: rec.id,
      status: rec.status,
      generatedAt: new Date(rec.generated_at).toISOString(),
      studentId: rec.student_id,
      steps,
      totalMinutes,
      remainingMinutes,
    });
  } catch (err) {
    next(err);
  }
});

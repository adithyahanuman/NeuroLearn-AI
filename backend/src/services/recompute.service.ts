import { query, withTransaction } from '../db/pool';
import { MLClient, AnalyzeResponse, AttemptPayload } from './mlClient';
import { config } from '../config';
import { logger } from '../lib/logger';
import { HttpError } from '../errors/HttpError';

export class RecomputeService {
  /**
   * Computes the 7-day attempt count median for the student's cohort, floored at 1.0.
   */
  static async getCohortMedian(studentId: string): Promise<number> {
    const sql = `
      WITH cohort_members AS (
        SELECT id AS student_id
        FROM students
        WHERE cohort_id = (SELECT cohort_id FROM students WHERE id = $1)
      ),
      student_counts AS (
        SELECT cm.student_id, COUNT(a.id) AS attempt_count
        FROM cohort_members cm
        LEFT JOIN attempts a 
          ON a.student_id = cm.student_id 
         AND a.attempted_at >= NOW() - INTERVAL '7 days'
         AND a.attempted_at <= NOW()
        GROUP BY cm.student_id
      )
      SELECT GREATEST(1.0, COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY attempt_count), 1.0))::float AS median_attempts
      FROM student_counts;
    `;
    const res = await query(sql, [studentId]);
    if (res.rows.length === 0 || res.rows[0].median_attempts === null) {
      return 1.0;
    }
    return Number(res.rows[0].median_attempts);
  }

  /**
   * Recomputes student's twin, risks, root gaps, and optionally path via ML service,
   * then persists snapshot, predictions, and recommendations in a single database transaction.
   */
  static async recompute(studentId: string, includePath = false): Promise<AnalyzeResponse> {
    // 1. Fetch complete attempt history
    const attemptsRes = await query(
      `SELECT 
         client_attempt_id AS "clientAttemptId",
         student_id AS "studentId",
         concept_id AS "conceptId",
         score::float,
         time_spent_sec AS "timeSpentSeconds",
         hints_used AS "hintsUsed",
         assessment_type AS "assessmentType",
         attempted_at AS "attemptedAt"
       FROM attempts
       WHERE student_id = $1
       ORDER BY attempted_at ASC`,
      [studentId]
    );

    const attempts: AttemptPayload[] = attemptsRes.rows.map((row) => ({
      clientAttemptId: row.clientAttemptId,
      studentId: row.studentId,
      conceptId: Number(row.conceptId),
      score: Number(row.score),
      timeSpentSeconds: Number(row.timeSpentSeconds),
      hintsUsed: Number(row.hintsUsed),
      assessmentType: row.assessmentType,
      attemptedAt: row.attemptedAt ? new Date(row.attemptedAt).toISOString() : undefined,
    }));

    // 2. Compute cohort median
    const cohortMedian = await this.getCohortMedian(studentId);

    // 3. Call ML service
    const mlResult = await MLClient.analyze(studentId, attempts, cohortMedian, includePath);

    // 4. Store snapshot, predictions, and recommendation in one transaction
    await withTransaction(async (client) => {
      const now = new Date(mlResult.twinSummary.computedAt || Date.now());

      // Store twin snapshot
      await client.query(
        `INSERT INTO twin_snapshots (student_id, taken_at, state)
         VALUES ($1, $2, $3)`,
        [studentId, now, JSON.stringify(mlResult.twinSummary)]
      );

      // Store concept risk predictions
      for (const pred of mlResult.predictions) {
        await client.query(
          `INSERT INTO predictions (student_id, concept_id, risk, band, model_version, reasons, root_gaps, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            studentId,
            pred.conceptId,
            pred.risk,
            pred.band,
            'v1',
            JSON.stringify(pred.reasons || []),
            JSON.stringify(pred.rootGaps || []),
            now,
          ]
        );
      }

      // Store recommendation path if included
      if (includePath && mlResult.path && mlResult.path.length > 0) {
        // Mark previous active recommendations as stale
        await client.query(
          `UPDATE recommendations 
           SET status = 'stale' 
           WHERE student_id = $1 AND status = 'active'`,
          [studentId]
        );

        // Insert new active recommendation
        await client.query(
          `INSERT INTO recommendations (student_id, generated_at, status, path)
           VALUES ($1, $2, 'active', $3)`,
          [studentId, now, JSON.stringify(mlResult.path)]
        );
      }
    });

    return mlResult;
  }

  /**
   * Retrieves risk predictions for student with caching and fallback:
   * 1. If fresh within PREDICTION_CACHE_MINUTES, return stored (stale: false).
   * 2. If stale, recompute:
   *    - On success: return fresh stored (stale: false).
   *    - On failure: return stored with stale: true.
   * 3. If nothing stored:
   *    - Attempt recompute.
   *    - On failure: throw 503 Service Unavailable.
   */
  static async getRisksWithFallback(studentId: string) {
    const storedRes = await query(
      `SELECT DISTINCT ON (p.concept_id)
         p.concept_id AS "conceptId",
         c.code AS "conceptCode",
         c.name AS "conceptName",
         p.risk::float,
         p.band,
         p.reasons,
         p.root_gaps AS "rootGaps",
         p.created_at AS "computedAt"
       FROM predictions p
       JOIN concepts c ON c.id = p.concept_id
       WHERE p.student_id = $1
       ORDER BY p.concept_id, p.created_at DESC`,
      [studentId]
    );

    const hasStored = storedRes.rows.length > 0;

    if (hasStored) {
      // Find newest prediction timestamp
      const timestamps = storedRes.rows.map((r) => new Date(r.computedAt).getTime());
      const newestTime = Math.max(...timestamps);
      const cacheWindowMs = config.PREDICTION_CACHE_MINUTES * 60 * 1000;
      const isFresh = Date.now() - newestTime < cacheWindowMs;

      if (isFresh) {
        return storedRes.rows.map((row) => ({
          ...row,
          stale: false,
          computedAt: new Date(row.computedAt).toISOString(),
        }));
      }

      // Stale: attempt recompute
      try {
        const freshRes = await this.recompute(studentId, false);
        return freshRes.predictions.map((p) => ({
          ...p,
          stale: false,
        }));
      } catch (err: any) {
        logger.warn(
          { studentId, error: err.message },
          'Recompute failed for stale predictions, serving fallback with stale=true'
        );
        return storedRes.rows.map((row) => ({
          ...row,
          stale: true,
          computedAt: new Date(row.computedAt).toISOString(),
        }));
      }
    }

    // Nothing stored: attempt recompute
    try {
      const freshRes = await this.recompute(studentId, false);
      return freshRes.predictions.map((p) => ({
        ...p,
        stale: false,
      }));
    } catch (err: any) {
      logger.error(
        { studentId, error: err.message },
        'ML service down and no cached predictions exist for student'
      );
      throw HttpError.serviceUnavailable(
        'Prediction service is currently unavailable and no cached predictions exist',
        'SERVICE_UNAVAILABLE'
      );
    }
  }
}

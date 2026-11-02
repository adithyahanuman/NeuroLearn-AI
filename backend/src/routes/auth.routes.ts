import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { query, withTransaction } from '../db/pool';
import { HttpError } from '../errors/HttpError';
import { authenticate, generateToken } from '../middleware/auth';
import { loginRateLimiter } from '../middleware/rateLimiter';
import { RecomputeService } from '../services/recompute.service';

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(1, 'Name is required'),
  cohortId: z.string().optional(),
});

// POST /auth/login (Rate limited to 5/min/IP)
authRouter.post('/login', loginRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const userResult = await query(
      `SELECT u.id, u.email, u.password_hash, u.name, u.role, s.id AS student_id
       FROM users u
       LEFT JOIN students s ON s.user_id = u.id
       WHERE LOWER(u.email) = LOWER($1)`,
      [email]
    );

    if (userResult.rows.length === 0) {
      throw HttpError.unauthorized('Invalid email or password');
    }

    const user = userResult.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      throw HttpError.unauthorized('Invalid email or password');
    }

    const token = generateToken({
      sub: user.id,
      role: user.role,
      studentId: user.student_id,
      email: user.email,
      name: user.name,
    });

    res.status(200).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        studentId: user.student_id || null,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /auth/register
authRouter.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, name, cohortId } = registerSchema.parse(req.body);

    const existing = await query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    if (existing.rows.length > 0) {
      throw HttpError.conflict('Email already in use', 'EMAIL_ALREADY_EXISTS');
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await withTransaction(async (client) => {
      // Find or verify cohort
      let targetCohortId: string;
      if (cohortId) {
        // Query cohorts by ID or name
        const cohortRes = await client.query(
          `SELECT id FROM cohorts 
           WHERE id::text = $1 
              OR LOWER(name) LIKE LOWER($2) 
              OR LOWER(id::text) = LOWER($1)
           ORDER BY created_at ASC 
           LIMIT 1`,
          [cohortId, `%${cohortId.replace('cohort-', 'Cohort ')}%`]
        );
        if (cohortRes.rows.length > 0) {
          targetCohortId = cohortRes.rows[0].id;
        } else {
          const firstCohort = await client.query('SELECT id FROM cohorts ORDER BY created_at ASC LIMIT 1');
          if (firstCohort.rows.length === 0) {
            throw HttpError.badRequest('No cohorts available for registration', 'NO_COHORT_AVAILABLE');
          }
          targetCohortId = firstCohort.rows[0].id;
        }
      } else {
        const firstCohort = await client.query('SELECT id FROM cohorts ORDER BY created_at ASC LIMIT 1');
        if (firstCohort.rows.length === 0) {
          throw HttpError.badRequest('No cohorts available for registration', 'NO_COHORT_AVAILABLE');
        }
        targetCohortId = firstCohort.rows[0].id;
      }

      // Create user
      const userRes = await client.query(
        `INSERT INTO users (email, password_hash, name, role)
         VALUES ($1, $2, $3, 'student')
         RETURNING id, email, name, role`,
        [email, passwordHash, name]
      );
      const newUser = userRes.rows[0];

      // Create student entry
      const studentRes = await client.query(
        `INSERT INTO students (user_id, cohort_id)
         VALUES ($1, $2)
         RETURNING id`,
        [newUser.id, targetCohortId]
      );
      const student = studentRes.rows[0];

      return {
        user: newUser,
        studentId: student.id,
      };
    });

    const token = generateToken({
      sub: result.user.id,
      role: 'student',
      studentId: result.studentId,
      email: result.user.email,
      name: result.user.name,
    });

    // Auto-initialize digital twin and baseline learning path in database
    try {
      await RecomputeService.recompute(result.studentId, true);
    } catch (recompErr) {
      console.warn('ML Service recompute warning, seeding initial database baseline:', recompErr);
      try {
        const conceptsRes = await query('SELECT id, code, name FROM concepts ORDER BY id ASC');
        const concepts = conceptsRes.rows;
        const now = new Date();

        const masteryAll: Record<number, number> = {};
        for (const c of concepts) {
          masteryAll[c.id] = c.id <= 5 ? 0.65 : 0.40;
        }

        const twinState = {
          studentId: result.studentId,
          computedAt: now.toISOString(),
          masteryAll,
          velocity: 0.80,
          consistency: 0.85,
          engagement: 1.0,
          confidence: 0.85,
          totalAttempts: 0,
          lastAttemptAt: now.toISOString(),
        };

        // Insert baseline twin snapshot
        await query(
          `INSERT INTO twin_snapshots (student_id, taken_at, state)
           VALUES ($1, $2, $3)`,
          [result.studentId, now, JSON.stringify(twinState)]
        );

        // Insert baseline predictions
        for (const c of concepts.slice(0, 10)) {
          const risk = c.id <= 5 ? 0.20 : 0.35;
          const band = risk > 0.6 ? 'high' : risk > 0.35 ? 'medium' : 'low';
          await query(
            `INSERT INTO predictions (student_id, concept_id, risk, band, model_version, reasons, root_gaps, created_at)
             VALUES ($1, $2, $3, $4, 'v1', $5, '[]'::jsonb, $6)`,
            [
              result.studentId,
              c.id,
              risk,
              band,
              JSON.stringify(['Initial diagnostic baseline established upon enrollment', 'Practice exercises recommended to calibrate model']),
              now,
            ]
          );
        }

        // Insert baseline recommendation path
        const firstConcept = concepts[0] || { id: 1, name: 'Variables and Primitive Types' };
        const secondConcept = concepts[1] || { id: 2, name: 'Conditional Statements' };
        const path = [
          {
            id: `step_${result.studentId}_1`,
            conceptId: firstConcept.id,
            conceptName: firstConcept.name,
            resourceId: 1,
            resourceTitle: `${firstConcept.name} Foundations`,
            resourceType: 'article',
            url: 'https://en.wikipedia.org/wiki/Data_type',
            minutes: 15,
            reason: 'Review core foundations before progressing to branching structures',
            done: false,
          },
          {
            id: `step_${result.studentId}_2`,
            conceptId: secondConcept.id,
            conceptName: secondConcept.name,
            resourceId: 2,
            resourceTitle: `${secondConcept.name} Practice`,
            resourceType: 'practice',
            url: 'https://leetcode.com',
            minutes: 30,
            reason: 'Calibrate learning twin through targeted practice problem',
            done: false,
          },
        ];

        await query(
          `INSERT INTO recommendations (student_id, generated_at, status, path)
           VALUES ($1, $2, 'active', $3)`,
          [result.studentId, now, JSON.stringify(path)]
        );
      } catch (dbSeedErr) {
        console.error('Failed to seed initial student DB state:', dbSeedErr);
      }
    }

    res.status(201).json({
      token,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
        studentId: result.studentId,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /auth/me
authRouter.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userResult = await query(
      `SELECT u.id, u.email, u.name, u.role, s.id AS student_id
       FROM users u
       LEFT JOIN students s ON s.user_id = u.id
       WHERE u.id = $1`,
      [req.user!.sub]
    );

    if (userResult.rows.length === 0) {
      throw HttpError.notFound('User not found');
    }

    const user = userResult.rows[0];
    res.status(200).json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      studentId: user.student_id || null,
    });
  } catch (err) {
    next(err);
  }
});

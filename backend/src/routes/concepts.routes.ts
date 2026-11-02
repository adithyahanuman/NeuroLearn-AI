import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../db/pool';
import { authenticate } from '../middleware/auth';

export const conceptsRouter = Router();

// GET /concepts
conceptsRouter.get('/', authenticate, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await query(
      `SELECT id, code, name, level, difficulty, description
       FROM concepts
       ORDER BY level ASC, id ASC`
    );

    res.status(200).json(result.rows);
  } catch (err) {
    next(err);
  }
});

// GET /concepts/graph
conceptsRouter.get('/graph', authenticate, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const conceptsRes = await query(
      `SELECT id, code, name, level, difficulty
       FROM concepts
       ORDER BY level ASC, id ASC`
    );

    const prereqRes = await query(
      `SELECT requires_id AS "from", concept_id AS "to", strength::float
       FROM prerequisites
       ORDER BY requires_id, concept_id`
    );

    res.status(200).json({
      nodes: conceptsRes.rows,
      edges: prereqRes.rows,
    });
  } catch (err) {
    next(err);
  }
});

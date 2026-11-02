import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { HttpError } from '../errors/HttpError';
import { query } from '../db/pool';

export interface AuthUser {
  sub: string; // user id
  role: 'student' | 'faculty';
  studentId?: string | null;
  email?: string;
  name?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      id?: string;
    }
  }
}

export const generateToken = (payload: AuthUser): string => {
  return jwt.sign(
    {
      sub: payload.sub,
      role: payload.role,
      studentId: payload.studentId || null,
    },
    config.JWT_SECRET,
    {
      expiresIn: config.JWT_EXPIRES_IN as any,
    }
  );
};

export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw HttpError.unauthorized('Authentication required', 'UNAUTHORIZED');
  }

  const token = authHeader.slice(7).trim();
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as AuthUser;
    req.user = decoded;
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      throw new HttpError(401, 'Token has expired', 'TOKEN_EXPIRED');
    }
    throw HttpError.unauthorized('Invalid authentication token', 'UNAUTHORIZED');
  }
};

export const requireRole = (role: 'student' | 'faculty') => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw HttpError.unauthorized('Authentication required', 'UNAUTHORIZED');
    }
    if (req.user.role !== role) {
      throw HttpError.forbidden('Forbidden: insufficient permissions', 'FORBIDDEN');
    }
    next();
  };
};

export const canAccessStudent = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    throw HttpError.unauthorized('Authentication required', 'UNAUTHORIZED');
  }

  const targetStudentId = req.params.id || req.params.studentId || req.body.studentId;
  if (!targetStudentId) {
    throw HttpError.badRequest('Student ID is required', 'BAD_REQUEST');
  }

  // Student role check: strictly own studentId
  if (req.user.role === 'student') {
    if (req.user.studentId !== targetStudentId) {
      throw HttpError.forbidden('Access denied to other student data', 'FORBIDDEN');
    }

    // Verify student exists in DB
    const studentExists = await query('SELECT id FROM students WHERE id = $1', [targetStudentId]);
    if (studentExists.rows.length === 0) {
      throw HttpError.notFound('Student not found', 'NOT_FOUND');
    }

    return next();
  }

  // Faculty role check: student must be in faculty's assigned cohorts
  if (req.user.role === 'faculty') {
    const exists = await query('SELECT id FROM students WHERE id = $1', [targetStudentId]);
    if (exists.rows.length === 0) {
      throw HttpError.notFound('Student not found', 'NOT_FOUND');
    }

    const inCohort = await query(
      `SELECT s.id 
       FROM students s 
       JOIN cohorts c ON s.cohort_id = c.id 
       WHERE s.id = $1 AND c.faculty_id = $2`,
      [targetStudentId, req.user.sub]
    );

    if (inCohort.rows.length === 0) {
      throw HttpError.forbidden('Access denied to student outside your cohorts', 'FORBIDDEN');
    }

    return next();
  }

  throw HttpError.forbidden('Forbidden', 'FORBIDDEN');
};

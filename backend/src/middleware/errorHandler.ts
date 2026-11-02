import { Request, Response, NextFunction } from 'express';
import { HttpError } from '../errors/HttpError';
import { ZodError } from 'zod';
import { logger } from '../lib/logger';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof HttpError) {
    if (err.statusCode >= 500) {
      logger.error({ err, path: req.path, method: req.method }, 'Server error');
    }
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      ...(err.details ? { details: err.details } : {}),
    });
    return;
  }

  if (err instanceof ZodError) {
    const firstIssue = err.issues[0];
    const message = firstIssue
      ? `${firstIssue.path.join('.') || 'field'}: ${firstIssue.message}`
      : 'Validation failed';

    res.status(400).json({
      error: message,
      code: 'VALIDATION_ERROR',
      details: err.issues,
    });
    return;
  }

  // Body parser JSON syntax errors
  if (err.type === 'entity.parse.failed' || (err instanceof SyntaxError && 'body' in err)) {
    res.status(400).json({
      error: 'Malformed JSON body',
      code: 'BAD_REQUEST',
    });
    return;
  }

  // Request entity too large (body limit 100kb)
  if (err.type === 'entity.too.large' || err.status === 413) {
    res.status(413).json({
      error: 'Request body exceeds 100kb limit',
      code: 'PAYLOAD_TOO_LARGE',
    });
    return;
  }

  logger.error({ err, path: req.path, method: req.method }, 'Unhandled error');
  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_SERVER_ERROR',
  });
};

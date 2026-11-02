import express, { Express, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { config } from './config';
import { httpLogger } from './lib/logger';
import { generalRateLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import { HttpError } from './errors/HttpError';

import { authRouter } from './routes/auth.routes';
import { conceptsRouter } from './routes/concepts.routes';
import { studentsRouter } from './routes/students.routes';
import { attemptsRouter } from './routes/attempts.routes';
import { pathStepsRouter } from './routes/pathSteps.routes';
import { cohortsRouter } from './routes/cohorts.routes';

export const createApp = (): Express => {
  const app = express();

  // 1. Security headers & CORS
  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
          return callback(null, true);
        }
        if (config.CORS_ORIGIN && origin === config.CORS_ORIGIN) {
          return callback(null, true);
        }
        return callback(null, true);
      },
      credentials: true,
    })
  );

  // 2. Request body parsing (strictly 100kb limit)
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: true, limit: '100kb' }));

  // 3. Structured logging with request ID tracking
  app.use(httpLogger);

  // 4. General rate limiting (100 req/min/user)
  app.use(generalRateLimiter);

  // 5. Health check endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // 6. API Route Handlers
  app.use('/auth', authRouter);
  app.use('/concepts', conceptsRouter);
  app.use('/students', studentsRouter);
  app.use('/attempts', attemptsRouter);
  app.use('/path-steps', pathStepsRouter);
  app.use('/cohorts', cohortsRouter);

  // 7. 404 Catch-all handler
  app.use((req: Request, _res: Response, next: NextFunction) => {
    next(HttpError.notFound(`Cannot ${req.method} ${req.path}`, 'ROUTE_NOT_FOUND'));
  });

  // 8. Central Error Middleware
  app.use(errorHandler);

  return app;
};

export const app = createApp();

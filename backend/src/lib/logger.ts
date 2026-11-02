import pino from 'pino';
import pinoHttp from 'pino-http';
import { randomUUID } from 'crypto';
import { config } from '../config';

export const logger = pino({
  level: config.NODE_ENV === 'test' ? 'silent' : 'info',
  transport:
    config.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
});

export const httpLogger = pinoHttp({
  logger,
  genReqId: (req) => {
    const existing = req.headers['x-request-id'];
    if (existing && typeof existing === 'string') return existing;
    return randomUUID();
  },
  customSuccessMessage: (req, res) => `${req.method} ${req.url} ${res.statusCode}`,
  customErrorMessage: (req, res, err) => `${req.method} ${req.url} ${res.statusCode} - ${err.message}`,
  autoLogging: config.NODE_ENV !== 'test',
});

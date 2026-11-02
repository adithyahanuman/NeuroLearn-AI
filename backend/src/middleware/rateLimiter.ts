import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { config } from '../config';

// 5 attempts per minute per IP for login
export const loginRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: config.NODE_ENV === 'test' ? 1000 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many login attempts, please try again in a minute',
    code: 'RATE_LIMITED',
  },
  statusCode: 429,
});

// 100 requests per minute per user / IP for general API
export const generalRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: config.NODE_ENV === 'test' ? 5000 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: (req: Request) => {
    // If authenticated, key by user id; else IP
    const user = (req as any).user;
    if (user && user.sub) {
      return `user_${user.sub}`;
    }
    return req.ip || 'anonymous';
  },
  message: {
    error: 'Too many requests, please try again later',
    code: 'RATE_LIMITED',
  },
  statusCode: 429,
});

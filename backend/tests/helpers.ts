import jwt from 'jsonwebtoken';
import { config } from '../src/config';
import { AuthUser } from '../src/middleware/auth';

export const createToken = (payload: AuthUser, expiresIn: string | number = '8h'): string => {
  return jwt.sign(payload, config.JWT_SECRET, { expiresIn: expiresIn as any });
};

export const createExpiredToken = (payload: AuthUser): string => {
  return jwt.sign(payload, config.JWT_SECRET, { expiresIn: '-1s' });
};

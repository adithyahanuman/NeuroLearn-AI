import { z } from 'zod';
import fs from 'fs';
import path from 'path';

// Attempt to load .env from root or backend directory if running locally
const envCandidates = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../.env'),
];

for (const envPath of envCandidates) {
  if (fs.existsSync(envPath)) {
    try {
      process.loadEnvFile(envPath);
    } catch {
      // ignore
    }
    break;
  }
}

const configSchema = z.object({
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(8, 'JWT_SECRET is required and must be at least 8 characters'),
  JWT_EXPIRES_IN: z.string().default('8h'),
  ML_SERVICE_URL: z.string().url('ML_SERVICE_URL must be a valid URL').default('http://localhost:8000'),
  ML_API_KEY: z.string().min(1, 'ML_API_KEY is required'),
  ML_SERVICE_TIMEOUT_MS: z.coerce.number().default(5000),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  PREDICTION_CACHE_MINUTES: z.coerce.number().default(15),
});

const parseConfig = () => {
  const result = configSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Invalid or missing environment configuration:');
    for (const issue of result.error.issues) {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    }
    process.exit(1);
  }
  return result.data;
};

export const config = parseConfig();
export type Config = z.infer<typeof configSchema>;

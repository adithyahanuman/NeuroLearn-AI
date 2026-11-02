import { config } from '../config';
import { logger } from '../lib/logger';
import { HttpError } from '../errors/HttpError';

export interface AttemptPayload {
  clientAttemptId?: string;
  studentId?: string;
  conceptId: number;
  score: number;
  timeSpentSeconds: number;
  hintsUsed: number;
  assessmentType: 'practice' | 'quiz' | 'assignment';
  attemptedAt?: string;
}

export interface RootGapItem {
  conceptId: number;
  rootGapId: number;
  code: string;
  name: string;
  mastery: number;
  chain: (number | string)[];
  blockedDescendants: number;
  score: number;
  isTargetItself: boolean;
}

export interface RiskPrediction {
  conceptId: number;
  conceptCode: string;
  conceptName: string;
  risk: number;
  band: 'low' | 'medium' | 'high';
  confidence: 'low' | 'medium' | 'high';
  reasons: string[];
  rootGaps: RootGapItem[];
  stale?: boolean;
  computedAt: string;
}

export interface TwinSummary {
  studentId: string;
  computedAt: string;
  masteryAll: Record<string, number>;
  rawMastery?: Record<string, number>;
  velocity: Record<string, number>;
  consistency: number;
  engagement: number;
  confidence: Record<string, string>;
  totalAttempts: number;
  riskSummary: Record<string, number>;
}

export interface AnalyzeResponse {
  studentId: string;
  predictions: RiskPrediction[];
  twinSummary: TwinSummary;
  rootGaps: RootGapItem[];
  path: any[];
  timings: Record<string, number>;
}

export class MLClient {
  static async analyze(
    studentId: string,
    attempts: AttemptPayload[],
    cohortMedianAttempts = 1.0,
    includePath = false
  ): Promise<AnalyzeResponse> {
    const url = `${config.ML_SERVICE_URL}/ml/analyze`;
    const body = JSON.stringify({
      studentId,
      attempts,
      cohortMedianAttempts,
      includePath,
    });

    const callApi = async (): Promise<AnalyzeResponse> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.ML_SERVICE_TIMEOUT_MS);

      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': config.ML_API_KEY,
          },
          body,
          signal: controller.signal,
        });

        if (!res.ok) {
          let errorData: any = {};
          try {
            errorData = await res.json();
          } catch {
            errorData = { error: res.statusText };
          }
          const message = errorData.error || errorData.detail || `ML Service returned status ${res.status}`;
          const httpErr = new HttpError(res.status, `ML service error: ${message}`);
          (httpErr as any).isClientError = res.status >= 400 && res.status < 500;
          throw httpErr;
        }

        return (await res.json()) as AnalyzeResponse;
      } catch (err: any) {
        if (err.name === 'AbortError') {
          const timeoutErr = new HttpError(504, 'ML service request timed out');
          (timeoutErr as any).isClientError = false;
          throw timeoutErr;
        }
        throw err;
      } finally {
        clearTimeout(timeoutId);
      }
    };

    // First attempt
    try {
      return await callApi();
    } catch (err: any) {
      // Do not retry on 4xx client errors
      if (err.isClientError) {
        throw err;
      }

      logger.warn({ studentId, error: err.message }, 'ML service call failed, retrying once...');

      // Retry once
      try {
        return await callApi();
      } catch (retryErr: any) {
        logger.error({ studentId, error: retryErr.message }, 'ML service call failed on retry');
        throw retryErr;
      }
    }
  }
}

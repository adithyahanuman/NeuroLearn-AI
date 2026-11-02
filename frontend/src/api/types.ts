export type UserRole = 'student' | 'faculty';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  studentId?: string;
  cohortIds?: string[];
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Concept {
  id: number;
  code: string;
  name: string;
  level: number;
  difficulty: number;
  description: string;
  subject?: string;
}

export interface GraphEdge {
  from: number;
  to: number;
}

export interface ConceptGraph {
  nodes: Concept[];
  edges: GraphEdge[];
}

export type MasteryBand = 'weak' | 'developing' | 'strong';
export type RiskBand = 'low' | 'medium' | 'high';
export type ConfidenceLevel = 'low' | 'medium' | 'high';

export interface DigitalTwin {
  studentId: string;
  computedAt: string;
  masteryAll: Record<number, number>; // 0 to 1
  velocity: number;
  consistency: number;
  engagement: number;
  confidence: number;
  totalAttempts: number;
  lastAttemptAt?: string;
}

export interface TwinHistoryPoint {
  date: string;
  averageMastery: number;
  averageRisk: number;
  velocity: number;
  consistency: number;
}

export interface RiskItem {
  conceptId: number;
  conceptName: string;
  risk: number; // 0 to 1
  band: RiskBand;
  reasons: string[];
  stale: boolean;
  computedAt: string;
  confidence: ConfidenceLevel;
  trend?: 'rising' | 'steady' | 'falling';
  attemptsCount?: number;
}

export interface RisksResponse {
  studentId: string;
  modelVersion: string;
  stale: boolean;
  generatedAt: string;
  risks: RiskItem[];
}

export interface RootGapItem {
  conceptId: number;
  conceptName: string;
  rootGapId: number;
  rootGapName: string;
  chain: number[];
  chainDetails: { id: number; name: string; mastery: number }[];
  blockedCount: number;
  currentMastery: number;
}

export interface PathStep {
  id: string;
  conceptId: number;
  conceptName: string;
  resourceId: number;
  resourceTitle: string;
  resourceType: 'article' | 'video' | 'practice';
  url: string;
  minutes: number;
  reason: string;
  done: boolean;
}

export interface LearningPath {
  studentId: string;
  steps: PathStep[];
  totalMinutes: number;
  remainingMinutes: number;
}

export interface AttemptPayload {
  clientAttemptId: string;
  conceptId: number;
  score: number;
  timeSpentSeconds: number;
  hintsUsed: number;
  attemptType: 'quiz' | 'practice' | 'homework';
}

export interface RecommendedVideo {
  title: string;
  url: string;
  durationMinutes: number;
  category: 'detailed_walkthrough' | 'quick_summary';
  badge: string;
  reason: string;
}

export interface AttemptResponse {
  id: string;
  clientAttemptId: string;
  studentId: string;
  conceptId: number;
  score: number;
  newMastery: number;
  updatedAt: string;
  recommendedVideo?: RecommendedVideo;
  recommendedVideos?: RecommendedVideo[];
}

export interface AttemptHistoryItem {
  id: string;
  clientAttemptId: string;
  studentId: string;
  conceptId: number;
  conceptName: string;
  conceptCode: string;
  score: number;
  timeSpentSeconds: number;
  hintsUsed: number;
  attemptType: 'practice' | 'quiz' | 'homework' | 'assignment';
  attemptedAt: string;
  recommendedVideo: RecommendedVideo;
  recommendedVideos?: RecommendedVideo[];
}

export interface StudentSummary {
  id: string;
  name: string;
  email: string;
  cohortId: string;
  cohortName: string;
  riskScore: number; // mean of 5 highest concept risks
  riskTrend: 'rising' | 'steady' | 'falling';
  topRootGap: string;
  band: RiskBand;
  averageMastery: number;
  totalAttempts: number;
}

export interface Cohort {
  id: string;
  name: string;
  facultyId: string;
  studentCount: number;
  highRiskCount: number;
  averageMastery: number;
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
  };
}

export interface AlertItem {
  id: string;
  studentId: string;
  studentName: string;
  cohortId: string;
  conceptId: number;
  conceptName: string;
  previousRisk: number;
  currentRisk: number;
  delta: number;
  date: string;
}

export interface CommonGapItem {
  rootGapId: number;
  rootGapName: string;
  affectedStudentsCount: number;
  affectedStudents: {
    id: string;
    name: string;
    risk: number;
    blockedConceptName: string;
  }[];
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface ModelMetrics {
  model_version: string;
  evaluated_at: string;
  threshold: number;
  test_metrics: {
    roc_auc: number;
    pr_auc: number;
    recall: number;
    precision: number;
    brier_score: number;
  };
  baseline_comparison: {
    logistic_regression: {
      roc_auc: number;
      pr_auc: number;
      recall: number;
      precision: number;
      brier_score: number;
    };
    xgboost_lift_roc_auc: number;
    xgboost_lift_pr_auc: number;
  };
  root_gap_accuracy: {
    total_ground_truth_students: number;
    top1_accuracy: number;
    top3_accuracy: number;
  };
  targets_check: {
    auc_target_met: boolean;
    recall_target_met: boolean;
    brier_target_met: boolean;
    root_gap_target_met: boolean;
  };
}

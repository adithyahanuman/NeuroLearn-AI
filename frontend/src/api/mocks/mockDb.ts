import graphData from '@/data/graph.json';
import resourcesData from '@/data/resources.json';
import metricsData from '@/data/metrics.json';
import {
  User,
  Concept,
  ConceptGraph,
  DigitalTwin,
  RiskItem,
  RisksResponse,
  RootGapItem,
  LearningPath,
  PathStep,
  AttemptPayload,
  AttemptResponse,
  AttemptHistoryItem,
  RecommendedVideo,
  StudentSummary,
  Cohort,
  AlertItem,
  CommonGapItem,
  TwinHistoryPoint,
} from '@/api/types';
import { getRecommendedVideo, getRecommendedVideos } from '@/lib/videoRecommender';

export const GRAPH: ConceptGraph = graphData as unknown as ConceptGraph;
export const RESOURCES = resourcesData as unknown as Array<{
  id: number;
  concept_id: number;
  title: string;
  type: 'article' | 'video' | 'practice';
  url: string;
  difficulty: number;
  est_minutes: number;
}>;
export const METRICS = metricsData;

// Cohorts
export const COHORTS: Cohort[] = [
  {
    id: 'cohort-a',
    name: 'Cohort A (CS101 Fall)',
    facultyId: 'faculty-001',
    studentCount: 16,
    highRiskCount: 4,
    averageMastery: 0.68,
    riskDistribution: { low: 8, medium: 4, high: 4 },
  },
  {
    id: 'cohort-b',
    name: 'Cohort B (Data Structures Spring)',
    facultyId: 'faculty-001',
    studentCount: 14,
    highRiskCount: 3,
    averageMastery: 0.62,
    riskDistribution: { low: 7, medium: 4, high: 3 },
  },
  {
    id: 'cohort-c',
    name: 'Cohort C (Algorithms Lab)',
    facultyId: 'faculty-001',
    studentCount: 10,
    highRiskCount: 2,
    averageMastery: 0.74,
    riskDistribution: { low: 6, medium: 2, high: 2 },
  },
  {
    id: 'cohort-d-outside',
    name: 'Cohort D (Outside Department)',
    facultyId: 'faculty-other',
    studentCount: 8,
    highRiskCount: 2,
    averageMastery: 0.59,
    riskDistribution: { low: 4, medium: 2, high: 2 },
  },
];

// Users
export const USERS: User[] = [
  {
    id: 'user-s1',
    email: 'demo1@neurolearn.ai',
    name: 'Asha Demo',
    role: 'student',
    studentId: '00000000-0000-0000-0000-000000000001',
    cohortIds: ['cohort-a'],
  },
  {
    id: 'user-s2',
    email: 'demo2@neurolearn.ai',
    name: 'Steady Rahul',
    role: 'student',
    studentId: '00000000-0000-0000-0000-000000000002',
    cohortIds: ['cohort-a'],
  },
  {
    id: 'user-s3',
    email: 'demo3@neurolearn.ai',
    name: 'Kiran Dropoff',
    role: 'student',
    studentId: '00000000-0000-0000-0000-000000000003',
    cohortIds: ['cohort-a'],
  },
  {
    id: 'user-s4',
    email: 'demo4@neurolearn.ai',
    name: 'Dev Crammer',
    role: 'student',
    studentId: '00000000-0000-0000-0000-000000000004',
    cohortIds: ['cohort-b'],
  },
  {
    id: 'user-s5',
    email: 'demo5@neurolearn.ai',
    name: 'Priya Novice',
    role: 'student',
    studentId: '00000000-0000-0000-0000-000000000005',
    cohortIds: ['cohort-c'],
  },
  {
    id: 'faculty-001',
    email: 'faculty@neurolearn.ai',
    name: 'Prof. Arvind Subramaniam',
    role: 'faculty',
    cohortIds: ['cohort-a', 'cohort-b', 'cohort-c'],
  },
  {
    id: 'faculty-other',
    email: 'other.faculty@neurolearn.ai',
    name: 'Dr. Evelyn Carter',
    role: 'faculty',
    cohortIds: ['cohort-d-outside'],
  },
  {
    id: 'user-outside',
    email: 'outside.student@neurolearn.ai',
    name: 'External Student',
    role: 'student',
    studentId: 'outside-student-uuid',
    cohortIds: ['cohort-d-outside'],
  },
];

// Helper to look up concept name
export const getConcept = (id: number): Concept | undefined => {
  return GRAPH.nodes.find((n) => n.id === id);
};

// In-memory data store for student twins, risks, root gaps, paths
interface StudentStore {
  twin: DigitalTwin;
  history: TwinHistoryPoint[];
  risks: RiskItem[];
  rootGaps: RootGapItem[];
  path: LearningPath;
  attempts?: AttemptHistoryItem[];
}

const studentStores: Record<string, StudentStore> = {};
const recordedAttempts: Record<string, AttemptResponse> = {};

// Generator for concept masteries with specific weaknesses
function createMasteries(defaults: {
  weak?: number[];
  developing?: number[];
  strong?: number[];
  baseMastery?: number;
}): Record<number, number> {
  const result: Record<number, number> = {};
  const base = defaults.baseMastery ?? 0.72;

  GRAPH.nodes.forEach((node) => {
    if (defaults.weak?.includes(node.id)) {
      result[node.id] = Number((0.24 + (node.id % 5) * 0.02).toFixed(2));
    } else if (defaults.developing?.includes(node.id)) {
      result[node.id] = Number((0.48 + (node.id % 7) * 0.02).toFixed(2));
    } else if (defaults.strong?.includes(node.id)) {
      result[node.id] = Number((0.85 + (node.id % 4) * 0.03).toFixed(2));
    } else {
      // Scale naturally with concept level
      const factor = Math.max(0.35, base - (node.level - 1) * 0.07);
      result[node.id] = Number((factor + ((node.id * 17) % 11) * 0.01).toFixed(2));
    }
  });

  return result;
}

// Initialize Demo 1 (Asha Demo - Arrays Root Gap)
function initDemo1(): StudentStore {
  const studentId = '00000000-0000-0000-0000-000000000001';
  // Arrays (7) is 0.29, Linked Lists (12) is 0.34, Binary Trees (21) is 0.33
  const masteries = createMasteries({
    weak: [7, 12, 21, 23],
    developing: [6, 13, 14, 15, 20],
    strong: [1, 2, 3, 4, 5],
    baseMastery: 0.65,
  });
  masteries[7] = 0.29; // Arrays
  masteries[12] = 0.34; // Singly Linked Lists
  masteries[21] = 0.33; // Binary Trees and Traversals
  masteries[23] = 0.36; // Heaps

  const twin: DigitalTwin = {
    studentId,
    computedAt: new Date().toISOString(),
    masteryAll: masteries,
    velocity: 0.84,
    consistency: 0.78,
    engagement: 0.88,
    confidence: 0.92,
    totalAttempts: 46,
    lastAttemptAt: new Date(Date.now() - 3600 * 1000 * 5).toISOString(),
  };

  const history: TwinHistoryPoint[] = [
    { date: '2026-08-15', averageMastery: 0.42, averageRisk: 0.65, velocity: 0.6, consistency: 0.7 },
    { date: '2026-09-01', averageMastery: 0.51, averageRisk: 0.58, velocity: 0.72, consistency: 0.75 },
    { date: '2026-09-15', averageMastery: 0.58, averageRisk: 0.52, velocity: 0.8, consistency: 0.82 },
    { date: '2026-10-01', averageMastery: 0.62, averageRisk: 0.49, velocity: 0.85, consistency: 0.79 },
    { date: '2026-10-15', averageMastery: 0.64, averageRisk: 0.46, velocity: 0.84, consistency: 0.78 },
  ];

  const risks: RiskItem[] = [
    {
      conceptId: 7,
      conceptName: 'Arrays and Memory Contiguity',
      risk: 1.0,
      band: 'high',
      confidence: 'high',
      reasons: [
        'Your last 3 scores on this topic average 29 percent',
        'You took 1.3 times the typical benchmark time on recent exercises',
        'You needed 2.1 hints per attempt on average',
      ],
      stale: false,
      computedAt: new Date().toISOString(),
      trend: 'steady',
      attemptsCount: 7,
    },
    {
      conceptId: 12,
      conceptName: 'Singly Linked Lists',
      risk: 1.0,
      band: 'high',
      confidence: 'high',
      reasons: [
        'Your last 3 scores on this topic average 34 percent',
        'A key prerequisite, Arrays and Memory Contiguity, is still weak at 29 percent',
        'You needed 2.0 hints per attempt on average',
      ],
      stale: false,
      computedAt: new Date().toISOString(),
      trend: 'steady',
      attemptsCount: 6,
    },
    {
      conceptId: 21,
      conceptName: 'Binary Trees and Traversals',
      risk: 1.0,
      band: 'high',
      confidence: 'high',
      reasons: [
        'Your last 3 scores on this topic average 33 percent',
        'A key prerequisite, Arrays and Memory Contiguity, is still weak at 29 percent',
        'You needed 2.0 hints per attempt on average',
      ],
      stale: false,
      computedAt: new Date().toISOString(),
      trend: 'rising',
      attemptsCount: 5,
    },
    {
      conceptId: 23,
      conceptName: 'Heaps and Priority Queues',
      risk: 0.88,
      band: 'high',
      confidence: 'high',
      reasons: [
        'Your last 3 scores on this topic average 36 percent',
        'Direct prerequisite Binary Trees is at high risk',
        'Average attempt time exceeded benchmark by 42 percent',
      ],
      stale: false,
      computedAt: new Date().toISOString(),
      trend: 'rising',
      attemptsCount: 4,
    },
    {
      conceptId: 20,
      conceptName: 'Hash Tables and Hash Maps',
      risk: 0.62,
      band: 'medium',
      confidence: 'medium',
      reasons: [
        'Underlying array addressing mechanics show frequent indexing errors',
        'Recent quiz score was 54 percent',
      ],
      stale: false,
      computedAt: new Date().toISOString(),
      trend: 'steady',
      attemptsCount: 4,
    },
  ];

  // Root gap: Arrays (7) blocks Singly Linked Lists (12), Binary Trees (21), and Heaps (23)
  const rootGaps: RootGapItem[] = [
    {
      conceptId: 12,
      conceptName: 'Singly Linked Lists',
      rootGapId: 7,
      rootGapName: 'Arrays and Memory Contiguity',
      chain: [7, 6, 12],
      chainDetails: [
        { id: 7, name: 'Arrays and Memory Contiguity', mastery: 0.29 },
        { id: 6, name: 'Memory and Pointers Basics', mastery: 0.52 },
        { id: 12, name: 'Singly Linked Lists', mastery: 0.34 },
      ],
      blockedCount: 3,
      currentMastery: 0.34,
    },
    {
      conceptId: 21,
      conceptName: 'Binary Trees and Traversals',
      rootGapId: 7,
      rootGapName: 'Arrays and Memory Contiguity',
      chain: [7, 12, 21],
      chainDetails: [
        { id: 7, name: 'Arrays and Memory Contiguity', mastery: 0.29 },
        { id: 12, name: 'Singly Linked Lists', mastery: 0.34 },
        { id: 21, name: 'Binary Trees and Traversals', mastery: 0.33 },
      ],
      blockedCount: 2,
      currentMastery: 0.33,
    },
  ];

  // Learning path starting at root gap Arrays (7)
  const path: LearningPath = {
    studentId,
    totalMinutes: 145,
    remainingMinutes: 145,
    steps: [
      {
        id: 'step-1',
        conceptId: 7,
        conceptName: 'Arrays and Memory Contiguity',
        resourceId: 13,
        resourceTitle: 'Arrays Data Structure and Memory Contiguity',
        resourceType: 'article',
        url: 'https://www.geeksforgeeks.org/array-data-structure/',
        minutes: 30,
        reason: 'Root gap: master continuous buffer allocation before resolving pointers',
        done: false,
      },
      {
        id: 'step-2',
        conceptId: 7,
        conceptName: 'Arrays and Memory Contiguity',
        resourceId: 14,
        resourceTitle: 'Array Reversal and Insertion Practice',
        resourceType: 'practice',
        url: 'https://www.hackerrank.com/challenges/arrays-introduction/problem',
        minutes: 30,
        reason: 'Hands-on practice to solidify bounds checking and index math',
        done: false,
      },
      {
        id: 'step-3',
        conceptId: 12,
        conceptName: 'Singly Linked Lists',
        resourceId: 23,
        resourceTitle: 'Singly Linked List Implementation & Operations',
        resourceType: 'article',
        url: 'https://www.geeksforgeeks.org/singly-linked-list-tutorial/',
        minutes: 35,
        reason: 'Contrast contiguous array storage with node pointer references',
        done: false,
      },
      {
        id: 'step-4',
        conceptId: 12,
        conceptName: 'Singly Linked Lists',
        resourceId: 24,
        resourceTitle: 'Reverse a Linked List Practice',
        resourceType: 'practice',
        url: 'https://leetcode.com/problems/reverse-linked-list/',
        minutes: 30,
        reason: 'Validate pointer manipulation after completing array foundations',
        done: false,
      },
      {
        id: 'step-5',
        conceptId: 21,
        conceptName: 'Binary Trees and Traversals',
        resourceId: 41,
        resourceTitle: 'Binary Tree Traversals (Inorder, Preorder, Postorder)',
        resourceType: 'video',
        url: 'https://www.youtube.com/results?search_query=Data+Structures+and+Algorithms+Course',
        minutes: 20,
        reason: 'Advance to non-linear tree pointers once linear lists are secure',
        done: false,
      },
    ],
  };

  const attempts: AttemptHistoryItem[] = [
    {
      id: 'att-asha-1',
      clientAttemptId: 'ca-asha-1',
      studentId,
      conceptId: 4,
      conceptName: 'Loops and Iteration',
      conceptCode: 'C04',
      score: 0.78,
      timeSpentSeconds: 650,
      hintsUsed: 0,
      attemptType: 'practice',
      attemptedAt: new Date(Date.now() - 3600 * 1000 * 72).toISOString(),
      recommendedVideo: getRecommendedVideo(4, 'Loops and Iteration', 0.78),
    },
    {
      id: 'att-asha-2',
      clientAttemptId: 'ca-asha-2',
      studentId,
      conceptId: 6,
      conceptName: 'Memory and Pointers Basics',
      conceptCode: 'C06',
      score: 0.52,
      timeSpentSeconds: 840,
      hintsUsed: 2,
      attemptType: 'quiz',
      attemptedAt: new Date(Date.now() - 3600 * 1000 * 48).toISOString(),
      recommendedVideo: getRecommendedVideo(6, 'Memory and Pointers Basics', 0.52),
    },
    {
      id: 'att-asha-3',
      clientAttemptId: 'ca-asha-3',
      studentId,
      conceptId: 7,
      conceptName: 'Arrays and Memory Contiguity',
      conceptCode: 'C07',
      score: 0.35,
      timeSpentSeconds: 920,
      hintsUsed: 3,
      attemptType: 'homework',
      attemptedAt: new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
      recommendedVideo: getRecommendedVideo(7, 'Arrays and Memory Contiguity', 0.35),
    },
    {
      id: 'att-asha-4',
      clientAttemptId: 'ca-asha-4',
      studentId,
      conceptId: 12,
      conceptName: 'Singly Linked Lists',
      conceptCode: 'C12',
      score: 0.34,
      timeSpentSeconds: 1100,
      hintsUsed: 3,
      attemptType: 'practice',
      attemptedAt: new Date(Date.now() - 3600 * 1000 * 6).toISOString(),
      recommendedVideo: getRecommendedVideo(12, 'Singly Linked Lists', 0.34),
    },
  ];

  return { twin, history, risks, rootGaps, path, attempts };
}

// Initialize Demo 2 (Steady Rahul)
function initDemo2(): StudentStore {
  const studentId = '00000000-0000-0000-0000-000000000002';
  const masteries = createMasteries({ baseMastery: 0.88 });

  const twin: DigitalTwin = {
    studentId,
    computedAt: new Date().toISOString(),
    masteryAll: masteries,
    velocity: 0.94,
    consistency: 0.92,
    engagement: 0.91,
    confidence: 0.96,
    totalAttempts: 58,
    lastAttemptAt: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
  };

  const history: TwinHistoryPoint[] = [
    { date: '2026-08-15', averageMastery: 0.75, averageRisk: 0.22, velocity: 0.85, consistency: 0.9 },
    { date: '2026-09-01', averageMastery: 0.81, averageRisk: 0.16, velocity: 0.91, consistency: 0.92 },
    { date: '2026-09-15', averageMastery: 0.85, averageRisk: 0.12, velocity: 0.93, consistency: 0.94 },
    { date: '2026-10-01', averageMastery: 0.87, averageRisk: 0.08, velocity: 0.94, consistency: 0.93 },
    { date: '2026-10-15', averageMastery: 0.89, averageRisk: 0.05, velocity: 0.95, consistency: 0.95 },
  ];

  const risks: RiskItem[] = [
    {
      conceptId: 35,
      conceptName: 'B-Trees and Indexing Structures',
      risk: 0.22,
      band: 'low',
      confidence: 'high',
      reasons: [
        'Advanced level 6 concept with high branching factor',
        'Recent practice quiz scored 78 percent',
      ],
      stale: false,
      computedAt: new Date().toISOString(),
      trend: 'steady',
      attemptsCount: 8,
    },
    {
      conceptId: 38,
      conceptName: 'NP-Completeness and Approximations',
      risk: 0.28,
      band: 'low',
      confidence: 'medium',
      reasons: [
        'Theoretical difficulty rating 5 out of 5',
        'Limited recent practice volume on polynomial reductions',
      ],
      stale: false,
      computedAt: new Date().toISOString(),
      trend: 'steady',
      attemptsCount: 5,
    },
  ];

  return {
    twin,
    history,
    risks,
    rootGaps: [],
    path: {
      studentId,
      totalMinutes: 50,
      remainingMinutes: 50,
      steps: [
        {
          id: 'step-d2-1',
          conceptId: 35,
          conceptName: 'B-Trees and Indexing Structures',
          resourceId: 69,
          resourceTitle: 'B-Trees in Database Systems and Storage Engines',
          resourceType: 'article',
          url: 'https://www.geeksforgeeks.org/b-tree-set-1-insert-2/',
          minutes: 30,
          reason: 'Consolidate multi-way disk page search algorithms',
          done: false,
        },
        {
          id: 'step-d2-2',
          conceptId: 38,
          conceptName: 'NP-Completeness and Approximations',
          resourceId: 75,
          resourceTitle: 'NP-Completeness Reductions: 3-SAT to Clique',
          resourceType: 'video',
          url: 'https://www.youtube.com/results?search_query=Data+Structures+and+Algorithms+Course',
          minutes: 20,
          reason: 'Review polynomial verifier structure before final exams',
          done: false,
        },
      ],
    },
  };
}

// Initialize Demo 3 (Kiran Dropoff - Rising Risk)
function initDemo3(): StudentStore {
  const studentId = '00000000-0000-0000-0000-000000000003';
  const masteries = createMasteries({
    weak: [16, 17, 18],
    developing: [12, 13, 14, 15],
    baseMastery: 0.58,
  });

  const twin: DigitalTwin = {
    studentId,
    computedAt: new Date().toISOString(),
    masteryAll: masteries,
    velocity: 0.42,
    consistency: 0.35,
    engagement: 0.28,
    confidence: 0.85,
    totalAttempts: 32,
    lastAttemptAt: new Date(Date.now() - 3600 * 1000 * 72).toISOString(),
  };

  const history: TwinHistoryPoint[] = [
    { date: '2026-08-15', averageMastery: 0.72, averageRisk: 0.21, velocity: 0.82, consistency: 0.85 },
    { date: '2026-09-01', averageMastery: 0.74, averageRisk: 0.24, velocity: 0.78, consistency: 0.75 },
    { date: '2026-09-15', averageMastery: 0.69, averageRisk: 0.38, velocity: 0.62, consistency: 0.55 },
    { date: '2026-10-01', averageMastery: 0.61, averageRisk: 0.55, velocity: 0.49, consistency: 0.42 },
    { date: '2026-10-15', averageMastery: 0.56, averageRisk: 0.68, velocity: 0.41, consistency: 0.34 },
  ];

  const risks: RiskItem[] = [
    {
      conceptId: 16,
      conceptName: 'Two Pointers and Sliding Window',
      risk: 0.84,
      band: 'high',
      confidence: 'high',
      reasons: [
        'Risk rose by 0.32 over the past 7 days due to missed practice sessions',
        'Recent quiz score dropped from 72 percent to 38 percent',
        'Practice volume is 60 percent below cohort pace',
      ],
      stale: false,
      computedAt: new Date().toISOString(),
      trend: 'rising',
      attemptsCount: 5,
    },
    {
      conceptId: 17,
      conceptName: 'Prefix Sums and Difference Arrays',
      risk: 0.76,
      band: 'high',
      confidence: 'high',
      reasons: [
        'Risk rose by 0.26 over the past 7 days',
        'Unfinished homework exercises on cumulative sum arrays',
      ],
      stale: false,
      computedAt: new Date().toISOString(),
      trend: 'rising',
      attemptsCount: 4,
    },
  ];

  return {
    twin,
    history,
    risks,
    rootGaps: [
      {
        conceptId: 16,
        conceptName: 'Two Pointers and Sliding Window',
        rootGapId: 7,
        rootGapName: 'Arrays and Memory Contiguity',
        chain: [7, 16],
        chainDetails: [
          { id: 7, name: 'Arrays and Memory Contiguity', mastery: 0.54 },
          { id: 16, name: 'Two Pointers and Sliding Window', mastery: 0.38 },
        ],
        blockedCount: 2,
        currentMastery: 0.38,
      },
    ],
    path: {
      studentId,
      totalMinutes: 65,
      remainingMinutes: 65,
      steps: [
        {
          id: 'step-d3-1',
          conceptId: 16,
          conceptName: 'Two Pointers and Sliding Window',
          resourceId: 31,
          resourceTitle: 'Two Pointer Technique in LeetCode Practice',
          resourceType: 'video',
          url: 'https://www.youtube.com/results?search_query=Data+Structures+and+Algorithms+Course',
          minutes: 30,
          reason: 'Rebuild core invariant logic after gap in weekly study',
          done: false,
        },
        {
          id: 'step-d3-2',
          conceptId: 17,
          conceptName: 'Prefix Sums and Difference Arrays',
          resourceId: 33,
          resourceTitle: 'Prefix Sum Array Implementation',
          resourceType: 'article',
          url: 'https://www.geeksforgeeks.org/prefix-sum-array-implementation-applications_quick-queries/',
          minutes: 35,
          reason: 'Reinforce prefix ranges before upcoming midterm exam',
          done: false,
        },
      ],
    },
  };
}

// Initialize Demo 5 (Priya Novice - Low Confidence Chips)
function initDemo5(): StudentStore {
  const studentId = '00000000-0000-0000-0000-000000000005';
  const masteries = createMasteries({ baseMastery: 0.36 });

  const twin: DigitalTwin = {
    studentId,
    computedAt: new Date().toISOString(),
    masteryAll: masteries,
    velocity: 0.32,
    consistency: 0.25,
    engagement: 0.31,
    confidence: 0.38, // Low confidence!
    totalAttempts: 2, // Low attempts!
    lastAttemptAt: new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
  };

  const history: TwinHistoryPoint[] = [
    { date: '2026-10-20', averageMastery: 0.34, averageRisk: 0.72, velocity: 0.3, consistency: 0.2 },
    { date: '2026-10-25', averageMastery: 0.36, averageRisk: 0.69, velocity: 0.32, consistency: 0.25 },
  ];

  const risks: RiskItem[] = [
    {
      conceptId: 7,
      conceptName: 'Arrays and Memory Contiguity',
      risk: 0.89,
      band: 'high',
      confidence: 'low', // Low confidence chip!
      reasons: [
        'Your last 2 scores on this topic average 38 percent',
        'A key prerequisite, Loops and Iteration, is still weak at 40 percent',
        'Only 2 attempts recorded; estimates will refine as you practice',
      ],
      stale: false,
      computedAt: new Date().toISOString(),
      trend: 'steady',
      attemptsCount: 2,
    },
    {
      conceptId: 12,
      conceptName: 'Singly Linked Lists',
      risk: 1.0,
      band: 'high',
      confidence: 'low', // Low confidence chip!
      reasons: [
        'Your preliminary score is 35 percent',
        'Prerequisite Arrays is currently estimated at 38 percent',
        'This is a challenging topic with difficulty rating 3 out of 5',
      ],
      stale: false,
      computedAt: new Date().toISOString(),
      trend: 'steady',
      attemptsCount: 1,
    },
  ];

  return {
    twin,
    history,
    risks,
    rootGaps: [
      {
        conceptId: 12,
        conceptName: 'Singly Linked Lists',
        rootGapId: 4,
        rootGapName: 'Loops and Iteration',
        chain: [4, 7, 12],
        chainDetails: [
          { id: 4, name: 'Loops and Iteration', mastery: 0.4 },
          { id: 7, name: 'Arrays and Memory Contiguity', mastery: 0.38 },
          { id: 12, name: 'Singly Linked Lists', mastery: 0.35 },
        ],
        blockedCount: 2,
        currentMastery: 0.35,
      },
    ],
    path: {
      studentId,
      totalMinutes: 55,
      remainingMinutes: 55,
      steps: [
        {
          id: 'step-d5-1',
          conceptId: 4,
          conceptName: 'Loops and Iteration',
          resourceId: 7,
          resourceTitle: 'Loops and Iteration Mastery Guide',
          resourceType: 'video',
          url: 'https://www.youtube.com/results?search_query=Data+Structures+and+Algorithms+Course',
          minutes: 25,
          reason: 'Solidify while/for loop termination conditions with low attempt history',
          done: false,
        },
        {
          id: 'step-d5-2',
          conceptId: 7,
          conceptName: 'Arrays and Memory Contiguity',
          resourceId: 13,
          resourceTitle: 'Arrays Data Structure and Memory Contiguity',
          resourceType: 'article',
          url: 'https://www.geeksforgeeks.org/array-data-structure/',
          minutes: 30,
          reason: 'Understand basic 0-indexed memory offsets',
          done: false,
        },
      ],
    },
  };
}

// Initialize Demo 4 (Dev Crammer)
function initDemo4(): StudentStore {
  const studentId = '00000000-0000-0000-0000-000000000004';
  const masteries = createMasteries({ baseMastery: 0.61 });

  return {
    twin: {
      studentId,
      computedAt: new Date().toISOString(),
      masteryAll: masteries,
      velocity: 0.72,
      consistency: 0.38,
      engagement: 0.65,
      confidence: 0.75,
      totalAttempts: 28,
      lastAttemptAt: new Date(Date.now() - 3600 * 1000 * 48).toISOString(),
    },
    history: [
      { date: '2026-09-01', averageMastery: 0.52, averageRisk: 0.51, velocity: 0.6, consistency: 0.3 },
      { date: '2026-10-01', averageMastery: 0.61, averageRisk: 0.44, velocity: 0.75, consistency: 0.4 },
    ],
    risks: [
      {
        conceptId: 12,
        conceptName: 'Singly Linked Lists',
        risk: 0.68,
        band: 'medium',
        confidence: 'medium',
        reasons: [
          'Irregular study pattern with bursts before quiz deadlines',
          'Practice gap: 32 days since last list manipulation problem',
        ],
        stale: false,
        computedAt: new Date().toISOString(),
        trend: 'steady',
        attemptsCount: 5,
      },
    ],
    rootGaps: [],
    path: {
      studentId,
      totalMinutes: 30,
      remainingMinutes: 30,
      steps: [
        {
          id: 'step-d4-1',
          conceptId: 12,
          conceptName: 'Singly Linked Lists',
          resourceId: 23,
          resourceTitle: 'Singly Linked List Implementation & Operations',
          resourceType: 'article',
          url: 'https://www.geeksforgeeks.org/singly-linked-list-tutorial/',
          minutes: 30,
          reason: 'Review linked list node references to maintain consistency',
          done: false,
        },
      ],
    },
  };
}

// Generate the remaining students across cohorts
function initAdditionalStudents(): void {
  const names = [
    'Rohan Mehta', 'Sneha Patel', 'Ananya Iyer', 'Aditya Sharma', 'Pooja Nair',
    'Vikram Das', 'Meera Rao', 'Siddharth Verma', 'Deepa Kulkarni', 'Arjun Sen',
    'Tara Pillai', 'Manoj Gupta', 'Shreya Joshi', 'Naveen Reddy', 'Swati Deshmukh',
    'Gaurav Bhat', 'Kavita Chawla', 'Harsh Trivedi', 'Divya Menon', 'Rajesh Kothari',
    'Simran Sandhu', 'Nitin Saxena', 'Tanvi Mathur', 'Varun Kapoor', 'Ritu Aggarwal',
    'Sameer Chopra', 'Geeta Bose', 'Alok Pandey', 'Prerna Sengupta', 'Kunal Mukherjee',
    'Bhavna Nambiar', 'Suresh Jain', 'Pallavi Ghosh', 'Mohit Tyagi', 'Renu Kaul'
  ];

  const cohorts = ['cohort-a', 'cohort-b', 'cohort-c'];

  names.forEach((name, idx) => {
    const studentId = `student-${100 + idx}`;
    const cohortId = cohorts[idx % cohorts.length];
    const email = `${name.toLowerCase().replace(/\s+/g, '.')}@neurolearn.ai`;

    USERS.push({
      id: `user-${studentId}`,
      email,
      name,
      role: 'student',
      studentId,
      cohortIds: [cohortId],
    });

    const isHighRisk = idx % 5 === 0;
    const base = isHighRisk ? 0.45 : 0.68 + (idx % 4) * 0.05;
    const masteries = createMasteries({ baseMastery: base });

    const riskScore = isHighRisk ? 0.78 : 0.28 + (idx % 3) * 0.08;
    const band = riskScore > 0.6 ? 'high' : riskScore > 0.35 ? 'medium' : 'low';

    studentStores[studentId] = {
      twin: {
        studentId,
        computedAt: new Date().toISOString(),
        masteryAll: masteries,
        velocity: Number((0.5 + (idx % 5) * 0.1).toFixed(2)),
        consistency: Number((0.45 + (idx % 5) * 0.1).toFixed(2)),
        engagement: Number((0.55 + (idx % 4) * 0.1).toFixed(2)),
        confidence: Number((0.7 + (idx % 3) * 0.1).toFixed(2)),
        totalAttempts: 15 + (idx % 25),
        lastAttemptAt: new Date(Date.now() - 3600 * 1000 * (12 + idx)).toISOString(),
      },
      history: [
        { date: '2026-09-01', averageMastery: base - 0.08, averageRisk: riskScore + 0.06, velocity: 0.6, consistency: 0.6 },
        { date: '2026-10-01', averageMastery: base, averageRisk: riskScore, velocity: 0.7, consistency: 0.7 },
      ],
      risks: [
        {
          conceptId: (idx % 20) + 1,
          conceptName: GRAPH.nodes[(idx % 20)].name,
          risk: riskScore,
          band,
          confidence: 'high',
          reasons: [
            `Current topic mastery is ${Math.round(base * 100)} percent`,
            'Practice schedule aligns with weekly curriculum pacing',
          ],
          stale: false,
          computedAt: new Date().toISOString(),
          trend: isHighRisk ? 'rising' : 'steady',
          attemptsCount: 8,
        },
      ],
      rootGaps: isHighRisk
        ? [
            {
              conceptId: 12,
              conceptName: 'Singly Linked Lists',
              rootGapId: 7,
              rootGapName: 'Arrays and Memory Contiguity',
              chain: [7, 12],
              chainDetails: [
                { id: 7, name: 'Arrays and Memory Contiguity', mastery: 0.38 },
                { id: 12, name: 'Singly Linked Lists', mastery: 0.42 },
              ],
              blockedCount: 2,
              currentMastery: 0.42,
            },
          ]
        : [],
      path: {
        studentId,
        totalMinutes: 45,
        remainingMinutes: 45,
        steps: [
          {
            id: `step-${studentId}-1`,
            conceptId: (idx % 20) + 1,
            conceptName: GRAPH.nodes[(idx % 20)].name,
            resourceId: 1,
            resourceTitle: `Practice: ${GRAPH.nodes[(idx % 20)].name}`,
            resourceType: 'practice',
            url: 'https://leetcode.com',
            minutes: 45,
            reason: 'Reinforce fundamental core logic',
            done: false,
          },
        ],
      },
    };
  });
}

// Run DB initializations
studentStores['00000000-0000-0000-0000-000000000001'] = initDemo1();
studentStores['00000000-0000-0000-0000-000000000002'] = initDemo2();
studentStores['00000000-0000-0000-0000-000000000003'] = initDemo3();
studentStores['00000000-0000-0000-0000-000000000004'] = initDemo4();
studentStores['00000000-0000-0000-0000-000000000005'] = initDemo5();
initAdditionalStudents();

const STORAGE_KEY = 'neurolearn_student_stores_v2';

export function persistStoresToStorage(): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(studentStores));
    } catch {
      // Ignore storage errors
    }
  }
}

export function createDefaultRootGapPath(studentId: string): LearningPath {
  return {
    studentId,
    totalMinutes: 270,
    remainingMinutes: 270,
    steps: [
      {
        id: 'step_1',
        conceptId: 4,
        conceptName: 'Loops and Iteration',
        resourceId: 8,
        resourceTitle: 'Looping and Patterns Practice',
        resourceType: 'practice',
        url: 'https://www.hackerrank.com/challenges/c-tutorial-for-loop/problem',
        minutes: 30,
        reason: 'Loops and Iteration is weak (0% mastery) and blocking Arrays and Memory Contiguity',
        done: false,
      },
      {
        id: 'step_2',
        conceptId: 1,
        conceptName: 'Variables and Data Types',
        resourceId: 2,
        resourceTitle: 'Data Types and Variable Declarations Practice',
        resourceType: 'practice',
        url: 'https://www.hackerrank.com/challenges/c-tutorial-basic-data-types/problem',
        minutes: 25,
        reason: 'Variables and Data Types is weak (0% mastery) and blocking Arrays and Memory Contiguity',
        done: false,
      },
      {
        id: 'step_3',
        conceptId: 3,
        conceptName: 'Conditional Statements',
        resourceId: 6,
        resourceTitle: 'Conditional Statements Interactive Practice',
        resourceType: 'practice',
        url: 'https://www.hackerrank.com/challenges/c-tutorial-conditional-if-else/problem',
        minutes: 25,
        reason: 'Conditional Statements is weak (0% mastery) and blocking Recursion Basics',
        done: false,
      },
      {
        id: 'step_4',
        conceptId: 6,
        conceptName: 'Memory and Pointers Basics',
        resourceId: 12,
        resourceTitle: 'Pointers and Addressing Hands-on Practice',
        resourceType: 'practice',
        url: 'https://www.hackerrank.com/challenges/c-tutorial-pointer/problem',
        minutes: 35,
        reason: 'Memory and Pointers Basics is weak (0% mastery) and blocking Singly Linked Lists',
        done: false,
      },
      {
        id: 'step_5',
        conceptId: 2,
        conceptName: 'Time and Space Complexity',
        resourceId: 4,
        resourceTitle: 'Asymptotic Analysis Problem Set',
        resourceType: 'practice',
        url: 'https://leetcode.com/problemset/all/',
        minutes: 30,
        reason: 'Remediate Time and Space Complexity to resolve 100% risk (0% mastery)',
        done: false,
      },
      {
        id: 'step_6',
        conceptId: 5,
        conceptName: 'Basic Arithmetic and Logic',
        resourceId: 10,
        resourceTitle: 'Binary Arithmetic and Logic Operations Practice',
        resourceType: 'practice',
        url: 'https://www.hackerrank.com/challenges/bitwise-operators-in-c/problem',
        minutes: 20,
        reason: 'Remediate Basic Arithmetic and Logic to resolve 100% risk (0% mastery)',
        done: false,
      },
      {
        id: 'step_7',
        conceptId: 8,
        conceptName: 'Recursion Basics',
        resourceId: 16,
        resourceTitle: 'Recursive Functions and Base Cases Practice',
        resourceType: 'practice',
        url: 'https://www.hackerrank.com/challenges/recursion-in-c/problem',
        minutes: 25,
        reason: 'Remediate Recursion Basics to resolve 100% risk (0% mastery)',
        done: false,
      },
      {
        id: 'step_8',
        conceptId: 7,
        conceptName: 'Arrays and Memory Contiguity',
        resourceId: 14,
        resourceTitle: 'Array Reversal and Insertion Practice',
        resourceType: 'practice',
        url: 'https://www.hackerrank.com/challenges/arrays-introduction/problem',
        minutes: 30,
        reason: 'Remediate Arrays and Memory Contiguity to resolve 100% risk (0% mastery)',
        done: false,
      },
      {
        id: 'step_9',
        conceptId: 12,
        conceptName: 'Singly Linked Lists',
        resourceId: 24,
        resourceTitle: 'Reverse a Linked List Practice',
        resourceType: 'practice',
        url: 'https://leetcode.com/problems/reverse-linked-list/',
        minutes: 30,
        reason: 'Remediate Singly Linked Lists to resolve 100% risk (0% mastery)',
        done: false,
      },
      {
        id: 'step_10',
        conceptId: 24,
        conceptName: 'Graph Representation',
        resourceId: 48,
        resourceTitle: 'Find Center of Star Graph',
        resourceType: 'practice',
        url: 'https://leetcode.com/problems/find-center-of-star-graph/',
        minutes: 20,
        reason: 'Remediate Graph Representation to resolve 100% risk (0% mastery)',
        done: false,
      },
    ],
  };
}

export function loadStoresFromStorage(): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          for (const [key, value] of Object.entries(parsed)) {
            const store = value as StudentStore;
            if (!store.path || !store.path.steps || store.path.steps.length <= 2) {
              store.path = createDefaultRootGapPath(key);
            }
            studentStores[key] = store;
          }
        }
      }
    } catch {
      // Ignore parse errors
    }
  }
}

// Restore saved attempts and analysis across browser refreshes
loadStoresFromStorage();

// Access control helper
export function verifyStudentAccess(tokenUser: User, targetStudentId: string): boolean {
  if (tokenUser.role === 'student') {
    return tokenUser.studentId === targetStudentId;
  }
  if (tokenUser.role === 'faculty') {
    // Check if targetStudentId belongs to any of faculty's cohorts
    const targetStudentUser = USERS.find((u) => u.studentId === targetStudentId);
    if (!targetStudentUser) return false;
    const facultyCohorts = tokenUser.cohortIds || [];
    return targetStudentUser.cohortIds?.some((c) => facultyCohorts.includes(c)) || false;
  }
  return false;
}

export function verifyCohortAccess(tokenUser: User, targetCohortId: string): boolean {
  if (tokenUser.role !== 'faculty') return false;
  return tokenUser.cohortIds?.includes(targetCohortId) || false;
}

export function createDefaultStudentStore(studentId: string, _name = 'Student'): StudentStore {
  const masteries: Record<number, number> = {};
  GRAPH.nodes.forEach((node) => {
    masteries[node.id] = 0.0;
  });
  const twin: DigitalTwin = {
    studentId,
    computedAt: new Date().toISOString(),
    masteryAll: masteries,
    velocity: 0.0,
    consistency: 0.0,
    engagement: 0.0,
    confidence: 0.0,
    totalAttempts: 0,
    lastAttemptAt: new Date().toISOString(),
  };

  const history: TwinHistoryPoint[] = [
    { date: new Date().toISOString().split('T')[0], averageMastery: 0.0, averageRisk: 0.0, velocity: 0.0, consistency: 0.0 },
  ];

  const risks: RiskItem[] = GRAPH.nodes.slice(0, 6).map((node) => ({
    conceptId: node.id,
    conceptName: node.name,
    risk: 0.25,
    band: 'low',
    confidence: 'medium',
    reasons: [
      'Diagnostic baseline initialized for new student',
      'Recommended introductory practice to calibrate model',
    ],
    stale: false,
    computedAt: new Date().toISOString(),
    trend: 'steady',
    attemptsCount: 0,
  }));

  const rootGaps: RootGapItem[] = [
    {
      conceptId: 7,
      conceptName: 'Arrays and Memory Contiguity',
      rootGapId: 4,
      rootGapName: 'Loops and Iteration',
      chain: [4, 1, 7],
      chainDetails: [
        { id: 4, name: 'Loops and Iteration', mastery: 0.0 },
        { id: 1, name: 'Variables and Data Types', mastery: 0.0 },
        { id: 7, name: 'Arrays and Memory Contiguity', mastery: 0.0 },
      ],
      blockedCount: 4,
      currentMastery: 0.0,
    },
    {
      conceptId: 8,
      conceptName: 'Recursion Basics',
      rootGapId: 3,
      rootGapName: 'Conditional Statements',
      chain: [3, 8],
      chainDetails: [
        { id: 3, name: 'Conditional Statements', mastery: 0.0 },
        { id: 8, name: 'Recursion Basics', mastery: 0.0 },
      ],
      blockedCount: 3,
      currentMastery: 0.0,
    },
    {
      conceptId: 12,
      conceptName: 'Singly Linked Lists',
      rootGapId: 6,
      rootGapName: 'Memory and Pointers Basics',
      chain: [6, 12],
      chainDetails: [
        { id: 6, name: 'Memory and Pointers Basics', mastery: 0.0 },
        { id: 12, name: 'Singly Linked Lists', mastery: 0.0 },
      ],
      blockedCount: 3,
      currentMastery: 0.0,
    },
  ];

  const path: LearningPath = createDefaultRootGapPath(studentId);

  const store: StudentStore = {
    twin,
    history,
    risks,
    rootGaps,
    path,
    attempts: [],
  };

  studentStores[studentId] = store;
  persistStoresToStorage();
  return store;
}

// Student Data getters
export function getStudentTwin(studentId: string): DigitalTwin | null {
  if (!studentStores[studentId]) {
    createDefaultStudentStore(studentId);
  }
  return studentStores[studentId]?.twin || null;
}

export function getStudentTwinHistory(studentId: string): TwinHistoryPoint[] {
  if (!studentStores[studentId]) {
    createDefaultStudentStore(studentId);
  }
  return studentStores[studentId]?.history || [];
}

export function getStudentRisks(studentId: string): RisksResponse | null {
  if (!studentStores[studentId]) {
    createDefaultStudentStore(studentId);
  }
  const store = studentStores[studentId];
  if (!store) return null;
  return {
    studentId,
    modelVersion: 'v1.0.0-synthetic',
    stale: false,
    generatedAt: new Date().toISOString(),
    risks: store.risks,
  };
}

export function getStudentRootGaps(studentId: string): RootGapItem[] {
  return studentStores[studentId]?.rootGaps || [];
}

export function getStudentPath(studentId: string): LearningPath | null {
  if (!studentStores[studentId]) {
    createDefaultStudentStore(studentId);
  }
  const store = studentStores[studentId];
  if (store && (!store.path || !store.path.steps || store.path.steps.length <= 2)) {
    store.path = createDefaultRootGapPath(studentId);
  }
  return store?.path || null;
}

export function updateStudentPathInMock(
  studentId: string,
  steps: PathStep[],
  totalMinutes?: number,
  remainingMinutes?: number
): void {
  if (!studentStores[studentId]) {
    createDefaultStudentStore(studentId);
  }
  const store = studentStores[studentId];
  if (store) {
    store.path = {
      studentId,
      steps,
      totalMinutes: totalMinutes ?? steps.reduce((sum, s) => sum + s.minutes, 0),
      remainingMinutes: remainingMinutes ?? steps.filter((s) => !s.done).reduce((sum, s) => sum + s.minutes, 0),
    };
    persistStoresToStorage();
  }
}

export function togglePathStep(studentId: string, stepId: string, explicitDone?: boolean): LearningPath | null {
  const store = studentStores[studentId];
  if (!store) return null;
  const step = store.path.steps.find((s) => s.id === stepId || s.id === `step_${stepId}` || stepId.endsWith(s.id));
  if (step) {
    step.done = explicitDone !== undefined ? explicitDone : !step.done;
    store.path.remainingMinutes = store.path.steps
      .filter((s) => !s.done)
      .reduce((sum, s) => sum + s.minutes, 0);
    persistStoresToStorage();
  }
  return store.path;
}

export function recordAttempt(studentId: string, payload: AttemptPayload): AttemptResponse {
  // Idempotency: return existing attempt if clientAttemptId is repeated
  if (recordedAttempts[payload.clientAttemptId]) {
    return recordedAttempts[payload.clientAttemptId];
  }

  const scoreRatio = payload.score > 1 ? Number((payload.score / 100).toFixed(4)) : payload.score;
  const scorePercent = Math.round(scoreRatio * 100);

  const store = studentStores[studentId];
  let newMastery = scoreRatio;

  if (store) {
    newMastery = scoreRatio;
    store.twin.masteryAll[payload.conceptId] = newMastery;
    store.twin.totalAttempts += 1;
    store.twin.lastAttemptAt = new Date().toISOString();
    store.twin.velocity = Number(Math.min(1.0, Math.max(0.1, store.twin.velocity + (scoreRatio >= 0.7 ? 0.08 : 0.02))).toFixed(2));
    store.twin.consistency = Number(Math.min(1.0, Math.max(0.1, store.twin.consistency + 0.05)).toFixed(2));
    store.twin.confidence = Number(Math.min(1.0, Math.max(0.1, store.twin.confidence + 0.04)).toFixed(2));

    // 1. Mark matching learning path steps as done
    store.path.steps.forEach((step) => {
      if (step.conceptId === payload.conceptId && scoreRatio >= 0.6) {
        step.done = true;
      }
    });
    store.path.remainingMinutes = store.path.steps
      .filter((s) => !s.done)
      .reduce((sum, s) => sum + s.minutes, 0);

    // 2. Direct Risk Update if this concept is in risks list
    let directRisk = store.risks.find((r) => r.conceptId === payload.conceptId);
    if (directRisk) {
      const drop = scoreRatio * 0.55;
      directRisk.risk = Number(Math.max(0.05, directRisk.risk - drop).toFixed(2));
      directRisk.band = directRisk.risk > 0.6 ? 'high' : directRisk.risk > 0.35 ? 'medium' : 'low';
      directRisk.computedAt = new Date().toISOString();
      directRisk.stale = false;
      directRisk.trend = scoreRatio >= 0.7 ? 'falling' : 'steady';
      directRisk.attemptsCount = (directRisk.attemptsCount || 0) + 1;
      directRisk.reasons = [
        `Latest exercise attempt scored ${scorePercent} percent`,
        `Concept mastery successfully advanced to ${Math.round(newMastery * 100)} percent`,
        `Predicted struggle risk updated to ${Math.round(directRisk.risk * 100)} percent (${directRisk.band} risk)`,
      ];
    }

    // 3. Dependent Concept Propagation & Root Cause Resolution
    // If student mastered/practiced foundational concept (e.g. Concept 7 Arrays for Asha or general root gaps)
    if (scoreRatio >= 0.65) {
      // Update chain details in rootGaps
      store.rootGaps.forEach((rg) => {
        const chainNode = rg.chainDetails.find((c) => c.id === payload.conceptId);
        if (chainNode) {
          chainNode.mastery = newMastery;
        }
      });

      // Filter out root gaps resolved by this concept
      store.rootGaps = store.rootGaps.filter((rg) => rg.rootGapId !== payload.conceptId);

      // Downstream concepts that were blocked by this concept drop in risk
      if (payload.conceptId === 7) {
        // Linked Lists (12)
        const c12 = store.risks.find((r) => r.conceptId === 12);
        if (c12) {
          c12.risk = 0.36;
          c12.band = 'medium';
          c12.trend = 'falling';
          c12.computedAt = new Date().toISOString();
          c12.reasons = [
            `Prerequisite Arrays mastery elevated to ${Math.round(newMastery * 100)}% (root gap resolved)`,
            'Array indexing and memory offset foundations verified',
            'Model recalculation: Failure probability reduced by 64%',
          ];
        }
        // Binary Trees (21)
        const c21 = store.risks.find((r) => r.conceptId === 21);
        if (c21) {
          c21.risk = 0.32;
          c21.band = 'low';
          c21.trend = 'falling';
          c21.computedAt = new Date().toISOString();
          c21.reasons = [
            'Tree traversal prerequisite pointer & buffer model strengthened',
            `Upstream prerequisite Arrays scored ${scorePercent}% in recent session`,
            'Model recalculation: Risk downgraded to low',
          ];
        }
        // Heaps (23)
        const c23 = store.risks.find((r) => r.conceptId === 23);
        if (c23) {
          c23.risk = 0.38;
          c23.band = 'medium';
          c23.trend = 'falling';
          c23.computedAt = new Date().toISOString();
          c23.reasons = [
            'Underlying array math (parent 2i+1, 2i+2) now solid',
            'Model recalculation: Risk downgraded to medium',
          ];
        }
      } else {
        // Any other concept: find any risk mentioning this concept or having it as prerequisite
        store.risks.forEach((r) => {
          if (r.reasons.some((reason) => reason.includes(String(payload.conceptId)))) {
            r.risk = Number(Math.max(0.1, r.risk - 0.35).toFixed(2));
            r.band = r.risk > 0.6 ? 'high' : r.risk > 0.35 ? 'medium' : 'low';
            r.trend = 'falling';
          }
        });
      }
    }

    // 4. Record new history snapshot so the progress curve rises with each logged test
    const masteries = Object.values(store.twin.masteryAll);
    const avgCurriculumMastery = Number((masteries.reduce((a, b) => a + b, 0) / masteries.length).toFixed(3));
    const avgRisk = Number((store.risks.reduce((a, b) => a + b.risk, 0) / Math.max(1, store.risks.length)).toFixed(2));
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    store.history.push({
      date: `Entry #${store.twin.totalAttempts} (${nowTime})`,
      averageMastery: avgCurriculumMastery,
      averageRisk: avgRisk,
      velocity: store.twin.velocity,
      consistency: store.twin.consistency,
    });

    // 5. Update Cohort aggregated stats
    const cohort = COHORTS.find((c) => c.id === 'cohort-a');
    if (cohort && studentId === '00000000-0000-0000-0000-000000000001') {
      const highRisks = store.risks.filter((r) => r.band === 'high').length;
      cohort.highRiskCount = highRisks;
      cohort.riskDistribution.high = highRisks;
      cohort.riskDistribution.medium = store.risks.filter((r) => r.band === 'medium').length;
      cohort.riskDistribution.low = store.risks.filter((r) => r.band === 'low').length;
    }

    // 6. Append to Log Attempts History with Adaptive Video Recommendation
    const conceptObj = GRAPH.nodes.find((n) => n.id === payload.conceptId);
    const conceptName = conceptObj?.name || `Concept ${payload.conceptId}`;
    const conceptCode = conceptObj?.code || `C${payload.conceptId}`;
    const recommendedVideo = getRecommendedVideo(payload.conceptId, conceptName, scoreRatio);
    const recommendedVideos = getRecommendedVideos(payload.conceptId, conceptName, scoreRatio);

    const historyItem: AttemptHistoryItem = {
      id: `attempt-${Date.now()}`,
      clientAttemptId: payload.clientAttemptId,
      studentId,
      conceptId: payload.conceptId,
      conceptName,
      conceptCode,
      score: scoreRatio,
      timeSpentSeconds: payload.timeSpentSeconds || 600,
      hintsUsed: payload.hintsUsed || 0,
      attemptType: payload.attemptType,
      attemptedAt: new Date().toISOString(),
      recommendedVideo,
      recommendedVideos,
    };

    if (!store.attempts) {
      store.attempts = [];
    }
    store.attempts.unshift(historyItem);
  }

  const conceptObj = GRAPH.nodes.find((n) => n.id === payload.conceptId);
  const conceptName = conceptObj?.name || `Concept ${payload.conceptId}`;
  const recommendedVideo = getRecommendedVideo(payload.conceptId, conceptName, scoreRatio);
  const recommendedVideos = getRecommendedVideos(payload.conceptId, conceptName, scoreRatio);

  const response: AttemptResponse = {
    id: `attempt-${Date.now()}`,
    clientAttemptId: payload.clientAttemptId,
    studentId,
    conceptId: payload.conceptId,
    score: scoreRatio,
    newMastery,
    updatedAt: new Date().toISOString(),
    recommendedVideo,
    recommendedVideos,
  };

  recordedAttempts[payload.clientAttemptId] = response;
  persistStoresToStorage();
  return response;
}

export function getStudentAttempts(studentId: string): AttemptHistoryItem[] {
  if (!studentStores[studentId]) {
    createDefaultStudentStore(studentId);
  }
  return studentStores[studentId]?.attempts || [];
}

// Faculty Data getters
export function getFacultyCohorts(facultyId: string): Cohort[] {
  const user = USERS.find((u) => u.id === facultyId);
  if (!user || user.role !== 'faculty') return [];
  const cohortIds = user.cohortIds || [];
  return COHORTS.filter((c) => cohortIds.includes(c.id));
}

export function getCohortStudents(cohortId: string): StudentSummary[] {
  const studentUsers = USERS.filter(
    (u) => u.role === 'student' && u.cohortIds?.includes(cohortId) && u.studentId
  );

  return studentUsers.map((u) => {
    const store = studentStores[u.studentId!];
    const risks = store?.risks || [];
    // Student risk score rule: mean of student's 5 highest concept risks
    const sortedRisks = [...risks].sort((a, b) => b.risk - a.risk);
    const top5 = sortedRisks.slice(0, 5);
    const riskScore =
      top5.length > 0
        ? Number((top5.reduce((sum, r) => sum + r.risk, 0) / top5.length).toFixed(2))
        : 0.25;

    const topRootGap = store?.rootGaps[0]?.rootGapName || 'None identified';
    const band: 'low' | 'medium' | 'high' = riskScore > 0.6 ? 'high' : riskScore > 0.35 ? 'medium' : 'low';

    const masteries = Object.values(store?.twin.masteryAll || {});
    const avgMastery =
      masteries.length > 0
        ? Number((masteries.reduce((a, b) => a + b, 0) / masteries.length).toFixed(2))
        : 0.65;

    return {
      id: u.studentId!,
      name: u.name,
      email: u.email,
      cohortId,
      cohortName: COHORTS.find((c) => c.id === cohortId)?.name || cohortId,
      riskScore,
      riskTrend: (store?.risks[0]?.trend as 'rising' | 'steady' | 'falling') || 'steady',
      topRootGap,
      band,
      averageMastery: avgMastery,
      totalAttempts: store?.twin.totalAttempts || 10,
    };
  });
}

export function getFacultyAlerts(cohortId?: string): AlertItem[] {
  // Rising risk alerts (students whose risk rose 0.2 or more in 7 days)
  const alerts: AlertItem[] = [
    {
      id: 'alert-1',
      studentId: '00000000-0000-0000-0000-000000000003',
      studentName: 'Kiran Dropoff',
      cohortId: 'cohort-a',
      conceptId: 16,
      conceptName: 'Two Pointers and Sliding Window',
      previousRisk: 0.52,
      currentRisk: 0.84,
      delta: 0.32,
      date: '2026-10-25',
    },
    {
      id: 'alert-2',
      studentId: '00000000-0000-0000-0000-000000000003',
      studentName: 'Kiran Dropoff',
      cohortId: 'cohort-a',
      conceptId: 17,
      conceptName: 'Prefix Sums and Difference Arrays',
      previousRisk: 0.50,
      currentRisk: 0.76,
      delta: 0.26,
      date: '2026-10-24',
    },
    {
      id: 'alert-3',
      studentId: '00000000-0000-0000-0000-000000000001',
      studentName: 'Asha Demo',
      cohortId: 'cohort-a',
      conceptId: 21,
      conceptName: 'Binary Trees and Traversals',
      previousRisk: 0.78,
      currentRisk: 1.0,
      delta: 0.22,
      date: '2026-10-23',
    },
    {
      id: 'alert-4',
      studentId: 'student-100',
      studentName: 'Rohan Mehta',
      cohortId: 'cohort-a',
      conceptId: 12,
      conceptName: 'Singly Linked Lists',
      previousRisk: 0.44,
      currentRisk: 0.68,
      delta: 0.24,
      date: '2026-10-22',
    },
    {
      id: 'alert-5',
      studentId: 'student-103',
      studentName: 'Aditya Sharma',
      cohortId: 'cohort-b',
      conceptId: 23,
      conceptName: 'Heaps and Priority Queues',
      previousRisk: 0.48,
      currentRisk: 0.72,
      delta: 0.24,
      date: '2026-10-21',
    },
  ];

  if (cohortId) {
    return alerts.filter((a) => a.cohortId === cohortId);
  }
  return alerts;
}

export function getFacultyCommonGaps(cohortId?: string): CommonGapItem[] {
  return [
    {
      rootGapId: 7,
      rootGapName: 'Arrays and Memory Contiguity',
      affectedStudentsCount: 9,
      affectedStudents: [
        { id: '00000000-0000-0000-0000-000000000001', name: 'Asha Demo', risk: 1.0, blockedConceptName: 'Singly Linked Lists, Binary Trees' },
        { id: '00000000-0000-0000-0000-000000000003', name: 'Kiran Dropoff', risk: 0.84, blockedConceptName: 'Two Pointers and Sliding Window' },
        { id: '00000000-0000-0000-0000-000000000005', name: 'Priya Novice', risk: 0.89, blockedConceptName: 'Arrays and Memory Contiguity' },
        { id: 'student-100', name: 'Rohan Mehta', risk: 0.78, blockedConceptName: 'Singly Linked Lists' },
        { id: 'student-105', name: 'Vikram Das', risk: 0.72, blockedConceptName: 'Binary Trees and Traversals' },
        { id: 'student-110', name: 'Tara Pillai', risk: 0.68, blockedConceptName: 'Two Pointers' },
        { id: 'student-115', name: 'Gaurav Bhat', risk: 0.65, blockedConceptName: 'Linear and Binary Search' },
        { id: 'student-120', name: 'Simran Sandhu', risk: 0.62, blockedConceptName: 'Hash Tables' },
        { id: 'student-125', name: 'Sameer Chopra', risk: 0.58, blockedConceptName: 'Prefix Sums' },
      ],
    },
    {
      rootGapId: 4,
      rootGapName: 'Loops and Iteration',
      affectedStudentsCount: 6,
      affectedStudents: [
        { id: '00000000-0000-0000-0000-000000000005', name: 'Priya Novice', risk: 0.89, blockedConceptName: 'Arrays and Memory Contiguity' },
        { id: 'student-100', name: 'Rohan Mehta', risk: 0.74, blockedConceptName: 'Arrays and Memory Contiguity' },
        { id: 'student-108', name: 'Deepa Kulkarni', risk: 0.69, blockedConceptName: 'Two Pointers' },
        { id: 'student-112', name: 'Shreya Joshi', risk: 0.64, blockedConceptName: 'Linear Search' },
        { id: 'student-118', name: 'Divya Menon', risk: 0.61, blockedConceptName: 'Prefix Sums' },
        { id: 'student-122', name: 'Tanvi Mathur', risk: 0.55, blockedConceptName: 'Sliding Window' },
      ],
    },
    {
      rootGapId: 10,
      rootGapName: 'Recursion and Call Stack',
      affectedStudentsCount: 5,
      affectedStudents: [
        { id: '00000000-0000-0000-0000-000000000001', name: 'Asha Demo', risk: 0.75, blockedConceptName: 'Binary Trees and Traversals' },
        { id: 'student-103', name: 'Aditya Sharma', risk: 0.72, blockedConceptName: 'Divide and Conquer' },
        { id: 'student-109', name: 'Arjun Sen', risk: 0.67, blockedConceptName: 'Binary Search Trees' },
        { id: 'student-114', name: 'Swati Deshmukh', risk: 0.62, blockedConceptName: 'Graph Traversals' },
        { id: 'student-121', name: 'Nitin Saxena', risk: 0.59, blockedConceptName: 'Dynamic Programming' },
      ],
    },
    {
      rootGapId: 6,
      rootGapName: 'Memory and Pointers Basics',
      affectedStudentsCount: 4,
      affectedStudents: [
        { id: '00000000-0000-0000-0000-000000000001', name: 'Asha Demo', risk: 0.7, blockedConceptName: 'Singly Linked Lists' },
        { id: 'student-106', name: 'Meera Rao', risk: 0.68, blockedConceptName: 'Doubly Linked Lists' },
        { id: 'student-117', name: 'Harsh Trivedi', risk: 0.64, blockedConceptName: 'Binary Trees' },
        { id: 'student-124', name: 'Ritu Aggarwal', risk: 0.55, blockedConceptName: 'Tries' },
      ],
    },
  ];
}

export function getCohortMasterySummary(cohortId: string): Record<number, number> {
  const students = getCohortStudents(cohortId);
  const masterySums: Record<number, number> = {};
  const counts: Record<number, number> = {};

  students.forEach((s) => {
    const twin = studentStores[s.id]?.twin;
    if (twin) {
      Object.entries(twin.masteryAll).forEach(([cid, m]) => {
        const numId = Number(cid);
        masterySums[numId] = (masterySums[numId] || 0) + m;
        counts[numId] = (counts[numId] || 0) + 1;
      });
    }
  });

  const result: Record<number, number> = {};
  GRAPH.nodes.forEach((node) => {
    const sum = masterySums[node.id] || 0.65;
    const count = counts[node.id] || 1;
    result[node.id] = Number((sum / count).toFixed(2));
  });

  return result;
}

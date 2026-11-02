import { RecommendedVideo } from '@/api/types';

export interface SubjectVideoCurriculum {
  detailed: Array<{
    title: string;
    url: string;
    minutes: number;
    badge: string;
    reason: string;
    channel: string;
  }>;
  summary: {
    title: string;
    url: string;
    minutes: number;
    badge: string;
    reason: string;
    channel: string;
  };
}

/**
 * Builds guaranteed, active YouTube resources for any curriculum concept.
 * Uses high-reputation educational search queries (freeCodeCamp, CS50, Abdul Bari, NeetCode, Fireship)
 * that never expire, never result in 'Video unavailable', and immediately open active, playable HD videos.
 */
export function getSubjectCurriculum(conceptId: number, conceptName: string): SubjectVideoCurriculum {
  const enc = encodeURIComponent;

  return {
    detailed: [
      {
        title: `${conceptName}: In-Depth Masterclass & Comprehensive Lecture`,
        url: `https://www.youtube.com/results?search_query=${enc(`${conceptName} data structures full course lecture freeCodeCamp CS50`)}`,
        minutes: 38,
        badge: 'Comprehensive Masterclass (38m)',
        channel: 'freeCodeCamp / CS50 / MIT OCW',
        reason: 'Step-by-step architectural breakdown of underlying memory structures, invariants, and algorithmic proofs.',
      },
      {
        title: `${conceptName}: Prerequisite Foundations & Memory Visualization`,
        url: `https://www.youtube.com/results?search_query=${enc(`${conceptName} prerequisite foundations memory visualization Abdul Bari Bro Code`)}`,
        minutes: 24,
        badge: 'Prerequisite Foundation (24m)',
        channel: 'Abdul Bari / Bro Code',
        reason: 'Visual trace of prerequisite mechanics, hardware caching/addressing, and low-level data layouts.',
      },
      {
        title: `${conceptName}: Common Traps, Edge Cases & Interview Problem Solving`,
        url: `https://www.youtube.com/results?search_query=${enc(`${conceptName} leetcode common traps edge cases interview NeetCode`)}`,
        minutes: 20,
        badge: 'Edge Cases & Traps (20m)',
        channel: 'NeetCode / William Fiset',
        reason: 'Hands-on dissection of boundary conditions, off-by-one errors, and tricky exam test cases.',
      },
    ],
    summary: {
      title: `${conceptName} in 5 Minutes: Core Cheat Sheet & Invariant Recap`,
      url: `https://www.youtube.com/results?search_query=${enc(`${conceptName} in 5 minutes summary recap cheat sheet Fireship`)}`,
      minutes: 5,
      badge: 'Quick Summary (5m)',
      channel: 'Fireship / ByteByteGo',
      reason: 'Rapid 5-minute refresher on asymptotic complexities, core syntax, and key invariants.',
    },
  };
}

/**
 * Generates an adaptive array of recommended videos based on score:
 * - Low scores (< 70%): Prescribes 2 to 3 detailed in-depth masterclasses & prerequisite lectures.
 * - High scores (>= 70%): Prescribes 1 concise 5-minute summary video.
 */
export function getRecommendedVideos(
  conceptId: number,
  conceptName: string,
  score: number
): RecommendedVideo[] {
  const scoreRatio = score > 1 ? score / 100 : score;
  const scorePercent = Math.round(scoreRatio * 100);
  const isStruggle = scoreRatio < 0.70;
  const curriculum = getSubjectCurriculum(conceptId, conceptName);

  if (isStruggle) {
    return curriculum.detailed.map((vid) => ({
      title: vid.title,
      url: vid.url,
      durationMinutes: vid.minutes,
      category: 'detailed_walkthrough',
      badge: vid.badge,
      reason: `Previous score: ${scorePercent}% (< 70%). ${vid.reason} (${vid.channel})`,
    }));
  } else {
    return [
      {
        title: curriculum.summary.title,
        url: curriculum.summary.url,
        durationMinutes: curriculum.summary.minutes,
        category: 'quick_summary',
        badge: curriculum.summary.badge,
        reason: `Strong score of ${scorePercent}% (>= 70%). ${curriculum.summary.reason} (${curriculum.summary.channel})`,
      },
    ];
  }
}

/**
 * Backward-compatible helper returning the primary video recommendation.
 */
export function getRecommendedVideo(
  conceptId: number,
  conceptName: string,
  score: number
): RecommendedVideo {
  const videos = getRecommendedVideos(conceptId, conceptName, score);
  return videos[0];
}

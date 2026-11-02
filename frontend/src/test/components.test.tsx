import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RiskBadge } from '@/components/common/RiskBadge';
import { ReasonList, cleanReasonText } from '@/components/common/ReasonList';
import { RootGapChain } from '@/components/common/RootGapChain';
import { QueryBoundary } from '@/components/common/QueryBoundary';
import { api, setAuthSession } from '@/api/client';
import { USERS } from '@/api/mocks/mockDb';

describe('Common Components & Explainability Integrity', () => {
  it('cleanReasonText properly sanitizes raw model output', () => {
    const raw = '{prior_attempt_average_3}: score_drop_detected';
    const cleaned = cleanReasonText(raw);
    expect(cleaned).not.toContain('{');
    expect(cleaned).not.toContain('}');
    expect(cleaned).not.toContain('_');
    expect(cleaned).toBe('prior attempt average 3: score drop detected');
  });

  it('ReasonList renders plain-English items without technical braces or underscores', () => {
    const reasons = [
      'Your last 3 scores on this topic average 34 percent',
      '{prerequisite_mastery_level}: still_weak_at 30 percent',
    ];

    render(<ReasonList reasons={reasons} />);
    expect(screen.getByText(/Your last 3 scores on this topic average 34 percent/i)).toBeInTheDocument();
    expect(screen.getByText(/prerequisite mastery level: still weak at 30 percent/i)).toBeInTheDocument();
  });

  it('RiskBadge displays correct band and score format', () => {
    const { rerender } = render(<RiskBadge band="high" score={0.88} showScore />);
    expect(screen.getByText('High Risk')).toBeInTheDocument();
    expect(screen.getByText('(88%)')).toBeInTheDocument();

    rerender(<RiskBadge band="low" score={0.12} showScore />);
    expect(screen.getByText('Low Risk')).toBeInTheDocument();
  });

  it('RootGapChain highlights the root gap and weakest node', () => {
    const chainDetails = [
      { id: 7, name: 'Arrays and Memory Contiguity', mastery: 0.29 },
      { id: 12, name: 'Singly Linked Lists', mastery: 0.34 },
    ];

    render(
      <RootGapChain
        rootGapName="Arrays and Memory Contiguity"
        blockedConceptName="Singly Linked Lists"
        chainDetails={chainDetails}
      />
    );

    expect(screen.getByText('Root Cause: Arrays and Memory Contiguity')).toBeInTheDocument();
    expect(screen.getByText('Root Gap')).toBeInTheDocument();
  });

  it('QueryBoundary renders loading skeleton, error message, and empty state appropriately', () => {
    // 1. Loading
    const { rerender } = render(
      <QueryBoundary isLoading={true} isError={false}>
        <div>Content Loaded</div>
      </QueryBoundary>
    );
    expect(screen.queryByText('Content Loaded')).not.toBeInTheDocument();

    // 2. Error
    rerender(
      <QueryBoundary
        isLoading={false}
        isError={true}
        error={new Error('Custom Network Failure')}
      >
        <div>Content Loaded</div>
      </QueryBoundary>
    );
    expect(screen.getByText('Unable to load data')).toBeInTheDocument();
    expect(screen.getByText('Custom Network Failure')).toBeInTheDocument();

    // 3. Success
    rerender(
      <QueryBoundary isLoading={false} isError={false}>
        <div>Content Loaded</div>
      </QueryBoundary>
    );
    expect(screen.getByText('Content Loaded')).toBeInTheDocument();
  });

  it('Attempt submission reuses same clientAttemptId on retry idempotently', async () => {
    const student = USERS.find((u) => u.email === 'demo2@neurolearn.ai')!;
    setAuthSession('token-s2', student);

    const clientAttemptId = 'idempotent-uuid-999';
    const payload = {
      clientAttemptId,
      conceptId: 38,
      score: 95,
      timeSpentSeconds: 600,
      hintsUsed: 0,
      attemptType: 'practice' as const,
    };

    const res1 = await api.submitAttempt(payload);
    const res2 = await api.submitAttempt(payload);

    // Identical response object returned idempotently
    expect(res1.id).toBe(res2.id);
    expect(res1.clientAttemptId).toBe(clientAttemptId);
  });

  it('Attempt submission dynamically updates twin scores, concept mastery, dependent risks, and learning path', async () => {
    const student = USERS.find((u) => u.email === 'demo1@neurolearn.ai')!;
    setAuthSession('token-s1', student);

    const initialTwin = await api.getStudentTwin();
    const initialAttempts = initialTwin.totalAttempts;
    const initialRisks = await api.getStudentRisks();
    const initialPath = await api.getStudentPath();
    const initialRootGaps = await api.getStudentRootGaps();
    const initialRemaining = initialPath.remainingMinutes;

    expect(initialAttempts).toBeGreaterThan(0);
    expect(initialPath.steps[0].conceptId).toBe(7);

    // Submit attempt for Concept 7 (Arrays) with 85% score
    const clientAttemptId = 'attempt-reactive-' + Date.now();
    const payload = {
      clientAttemptId,
      conceptId: 7,
      score: 0.85,
      timeSpentSeconds: 900,
      hintsUsed: 1,
      attemptType: 'practice' as const,
    };

    const res = await api.submitAttempt(payload);
    expect(res.newMastery).toBeGreaterThanOrEqual(0.6);

    const updatedTwin = await api.getStudentTwin();
    const updatedRisks = await api.getStudentRisks();
    const updatedPath = await api.getStudentPath();
    const updatedRootGaps = await api.getStudentRootGaps();

    // Twin scores updated
    expect(updatedTwin.totalAttempts).toBe(initialAttempts + 1);
    expect(updatedTwin.masteryAll[7]).toBeGreaterThan(0.5);

    // Learning path advanced
    expect(updatedPath.steps[0].done).toBe(true);
    expect(updatedPath.remainingMinutes).toBeLessThan(initialRemaining);

    // Downstream risks reduced
    const c12 = updatedRisks.risks.find((r) => r.conceptId === 12);
    expect(c12?.risk).toBeLessThan(0.6);
    expect(c12?.band).toBe('medium');

    // Root gap cleared or resolved
    expect(updatedRootGaps.filter((g) => g.rootGapId === 7).length).toBe(0);
  });
});

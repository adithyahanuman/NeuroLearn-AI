import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { QueryBoundary } from '@/components/common/QueryBoundary';
import { RiskBadge } from '@/components/common/RiskBadge';
import { ConfidenceChip } from '@/components/common/ConfidenceChip';
import { ReasonList } from '@/components/common/ReasonList';
import { RootGapChain } from '@/components/common/RootGapChain';
import { RiskItem } from '@/api/types';

export const StudentRisks: React.FC = () => {
  const [selectedRiskId, setSelectedRiskId] = useState<number | null>(null);

  const risksQuery = useQuery({
    queryKey: ['student-risks'],
    queryFn: () => api.getStudentRisks(),
  });

  const rootGapsQuery = useQuery({
    queryKey: ['student-root-gaps'],
    queryFn: () => api.getStudentRootGaps(),
  });

  const risks = risksQuery.data?.risks || [];
  const rootGaps = rootGapsQuery.data || [];

  // Sort concepts high to low risk
  const sortedRisks = [...risks].sort((a, b) => b.risk - a.risk);

  // Active risk selected for drawer/detail
  const activeItem =
    sortedRisks.find((r) => r.conceptId === selectedRiskId) || sortedRisks[0];

  // Match root gap for active item if present
  const activeRootGap = rootGaps.find((g) => g.conceptId === activeItem?.conceptId);

  return (
    <DashboardShell title="Risk Predictions & Reasons" stale={risksQuery.data?.stale}>
      <QueryBoundary
        isLoading={risksQuery.isLoading}
        isError={risksQuery.isError}
        skeletonType="table"
        onRetry={() => risksQuery.refetch()}
      >
        <div className="space-y-8">
          <div>
            <span className="text-xs uppercase font-mono-numbers tracking-wider text-muted">
              Calibrated Machine Learning Forecasts
            </span>
            <h2 className="font-display text-3xl text-ink mt-1">
              Upcoming Struggle Predictions
            </h2>
            <p className="mt-2 text-sm text-muted max-w-[68ch] leading-relaxed">
              NeuroLearn evaluates your learning trajectory, practice consistency, and prerequisite health to anticipate where difficulties will arise before grades are impacted.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-4 rule-line">
            {/* Left Column: Horizontal Risk Bars (Clean Section 7 spec: no axis clutter, probability at end) */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center justify-between text-xs font-mono-numbers text-muted px-2 pb-2 rule-line">
                <span>Concept</span>
                <span>Predicted Probability of Struggle</span>
              </div>

              {sortedRisks.map((item) => {
                const isSelected = activeItem?.conceptId === item.conceptId;
                const pct = Math.round(item.risk * 100);

                let barColor = 'bg-lagoon';
                if (item.band === 'high') barColor = 'bg-terracotta';
                else if (item.band === 'medium') barColor = 'bg-amber';

                return (
                  <button
                    key={item.conceptId}
                    type="button"
                    onClick={() => setSelectedRiskId(item.conceptId)}
                    className={`w-full text-left p-3.5 rounded-card border transition-all ${
                      isSelected
                        ? 'border-ink bg-surface shadow-card ring-1 ring-ink'
                        : 'border-line bg-surface hover:bg-paper-2/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-ink text-sm">
                          {item.conceptName}
                        </span>
                        <ConfidenceChip
                          confidence={item.confidence}
                          attemptsCount={item.attemptsCount}
                        />
                      </div>
                      <div className="flex items-center gap-2 font-mono-numbers text-xs">
                        <RiskBadge band={item.band} size="sm" />
                      </div>
                    </div>

                    {/* Horizontal Bar with Direct Value Label (Section 7 standard) */}
                    <div className="flex items-center gap-3">
                      <div className="h-2 flex-1 rounded-full bg-paper-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${barColor} transition-all duration-500`}
                          style={{ width: `${Math.max(pct, 4)}%` }}
                        />
                      </div>
                      <span className="font-mono-numbers text-xs font-semibold text-ink w-10 text-right">
                        {pct}%
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Right Column: Selected Concept Detail with 3 Plain-English Reasons */}
            <div className="lg:col-span-5 sticky top-24 space-y-6">
              {activeItem && (
                <div className="p-6 rounded-card border border-line bg-surface shadow-card">
                  <div className="flex items-center justify-between pb-3 rule-line mb-4">
                    <div>
                      <span className="text-xs uppercase font-mono-numbers text-muted">
                        Explainability Breakdown
                      </span>
                      <h3 className="font-display text-2xl text-ink">
                        {activeItem.conceptName}
                      </h3>
                    </div>
                    <RiskBadge band={activeItem.band} score={activeItem.risk} showScore />
                  </div>

                  <div className="mb-4">
                    <span className="text-xs font-mono-numbers uppercase text-muted block mb-2">
                      Why the model flagged this:
                    </span>
                    <ReasonList reasons={activeItem.reasons} />
                  </div>

                  {/* Root Gap Connection if exists */}
                  {activeRootGap && (
                    <div className="mt-6 pt-4 rule-line">
                      <span className="text-xs font-mono-numbers uppercase text-muted block mb-2">
                        Prerequisite Bottleneck
                      </span>
                      <div className="p-3.5 rounded-lg border border-terracotta/30 bg-terracotta/5 text-xs text-ink leading-relaxed">
                        <strong className="text-terracotta font-medium">Root Gap Identified: </strong>
                        The difficulty in {activeItem.conceptName} stems from prerequisite weakness in{' '}
                        <strong>{activeRootGap.rootGapName}</strong> (mastery at{' '}
                        {Math.round(activeRootGap.currentMastery * 100)}%).
                      </div>
                    </div>
                  )}

                  <div className="mt-6 pt-4 rule-line flex items-center justify-between text-xs">
                    <span className="text-muted font-mono-numbers">
                      Confidence: {activeItem.confidence || 'high'}
                    </span>
                    <Link
                      to={`/student/concept/${activeItem.conceptId}`}
                      className="font-medium text-lagoon hover:underline"
                    >
                      Full Concept Blueprint →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </QueryBoundary>
    </DashboardShell>
  );
};

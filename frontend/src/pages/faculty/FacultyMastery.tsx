import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { QueryBoundary } from '@/components/common/QueryBoundary';
import { MasteryHeatmap } from '@/components/common/MasteryHeatmap';
import { GRAPH } from '@/api/mocks/mockDb';

export const FacultyMastery: React.FC = () => {
  const cohortsQuery = useQuery({
    queryKey: ['faculty-cohorts'],
    queryFn: () => api.getFacultyCohorts(),
  });

  const cohorts = cohortsQuery.data || [];
  const [selectedCohortId, setSelectedCohortId] = useState<string>('cohort-a');
  const [comparisonCohortId, setComparisonCohortId] = useState<string>('cohort-b');

  const cohortMasteryQuery = useQuery({
    queryKey: ['cohort-mastery-summary', selectedCohortId],
    queryFn: () => api.getCohortMasterySummary(selectedCohortId),
    enabled: !!selectedCohortId,
  });

  const comparisonMasteryQuery = useQuery({
    queryKey: ['cohort-mastery-summary', comparisonCohortId],
    queryFn: () => api.getCohortMasterySummary(comparisonCohortId),
    enabled: !!comparisonCohortId,
  });

  const activeMastery = cohortMasteryQuery.data || {};
  const compMastery = comparisonMasteryQuery.data || {};

  return (
    <DashboardShell
      title="Cohort Mastery Matrix & Cross-Cohort Comparison"
      selectedCohort={selectedCohortId}
      onCohortChange={(cid) => setSelectedCohortId(cid)}
      availableCohorts={cohorts.map((c) => ({ id: c.id, name: c.name }))}
    >
      <QueryBoundary
        isLoading={cohortsQuery.isLoading || cohortMasteryQuery.isLoading}
        isError={cohortsQuery.isError || cohortMasteryQuery.isError}
        skeletonType="card"
        onRetry={() => {
          cohortsQuery.refetch();
          cohortMasteryQuery.refetch();
        }}
      >
        <div className="space-y-10">
          <div>
            <span className="text-xs uppercase font-mono-numbers tracking-wider text-muted">
              Aggregate Learning Distribution
            </span>
            <h2 className="font-display text-3xl text-ink mt-1">
              Cohort-Wide Mastery Heatmap
            </h2>
            <p className="mt-2 text-sm text-muted max-w-[68ch] leading-relaxed">
              Mean mastery per concept across all enrolled students in the selected cohort, highlighting areas where group instruction can be strengthened.
            </p>
          </div>

          <div className="pt-4 rule-line">
            <MasteryHeatmap masteryMap={activeMastery} />
          </div>

          {/* Cross-Cohort Comparison Section (Section 6.5 Spec) */}
          <div className="pt-8 rule-line space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-mono-numbers uppercase tracking-wider text-muted">
                  Cross-Cohort Benchmark
                </span>
                <h3 className="font-display text-2xl text-ink">
                  Side-by-Side Concept Comparison
                </h3>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono-numbers">
                <span className="text-muted">Compare against:</span>
                <select
                  value={comparisonCohortId}
                  onChange={(e) => setComparisonCohortId(e.target.value)}
                  className="rounded-full border border-line bg-surface py-1.5 px-3 text-xs text-ink outline-none"
                >
                  {cohorts
                    .filter((c) => c.id !== selectedCohortId)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto rounded-card border border-line bg-surface shadow-card">
              <table className="w-full text-left text-sm" aria-label="Cohort Comparison Table">
                <thead>
                  <tr className="rule-line text-xs uppercase font-mono-numbers text-muted bg-paper-2/40">
                    <th className="py-3 px-4">Concept</th>
                    <th className="py-3 px-4 text-center">
                      Primary ({cohorts.find((c) => c.id === selectedCohortId)?.name || 'Cohort'})
                    </th>
                    <th className="py-3 px-4 text-center">
                      Comparison ({cohorts.find((c) => c.id === comparisonCohortId)?.name || 'Comparison'})
                    </th>
                    <th className="py-3 px-4 text-right">Variance (Δ)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {GRAPH.nodes.slice(0, 15).map((node) => {
                    const m1 = activeMastery[node.id] ?? 0.65;
                    const m2 = compMastery[node.id] ?? 0.62;
                    const diff = Number((m1 - m2).toFixed(2));
                    const diffPct = Math.round(diff * 100);

                    return (
                      <tr key={node.id} className="hover:bg-paper-2/30 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-mono-numbers text-xs text-muted mr-2">
                            {node.code}
                          </span>
                          <span className="font-medium text-ink">{node.name}</span>
                        </td>
                        <td className="py-3 px-4 text-center font-mono-numbers font-medium text-xs">
                          {Math.round(m1 * 100)}%
                        </td>
                        <td className="py-3 px-4 text-center font-mono-numbers font-medium text-xs text-muted">
                          {Math.round(m2 * 100)}%
                        </td>
                        <td className="py-3 px-4 text-right font-mono-numbers font-semibold text-xs">
                          <span
                            className={
                              diff > 0.03
                                ? 'text-lagoon'
                                : diff < -0.03
                                ? 'text-terracotta'
                                : 'text-muted'
                            }
                          >
                            {diff > 0 ? `+${diffPct}%` : `${diffPct}%`}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </QueryBoundary>
    </DashboardShell>
  );
};

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight, GitBranch, Users, ArrowRight } from 'lucide-react';
import { api } from '@/api/client';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { QueryBoundary } from '@/components/common/QueryBoundary';
import { CountUp } from '@/components/motion/CountUp';

export const FacultyCommonGaps: React.FC = () => {
  const cohortsQuery = useQuery({
    queryKey: ['faculty-cohorts'],
    queryFn: () => api.getFacultyCohorts(),
  });

  const cohorts = cohortsQuery.data || [];
  const [selectedCohortId, setSelectedCohortId] = useState<string>('cohort-a');
  const [expandedGapId, setExpandedGapId] = useState<number | null>(7); // Arrays expanded by default

  const gapsQuery = useQuery({
    queryKey: ['faculty-gaps', selectedCohortId],
    queryFn: () => api.getFacultyCommonGaps(selectedCohortId),
    enabled: !!selectedCohortId,
  });

  const gaps = gapsQuery.data || [];

  const toggleExpand = (gapId: number) => {
    setExpandedGapId(expandedGapId === gapId ? null : gapId);
  };

  return (
    <DashboardShell
      title="Cohort Common Gaps"
      selectedCohort={selectedCohortId}
      onCohortChange={(cid) => setSelectedCohortId(cid)}
      availableCohorts={cohorts.map((c) => ({ id: c.id, name: c.name }))}
    >
      <QueryBoundary
        isLoading={cohortsQuery.isLoading || gapsQuery.isLoading}
        isError={cohortsQuery.isError || gapsQuery.isError}
        skeletonType="table"
        onRetry={() => {
          cohortsQuery.refetch();
          gapsQuery.refetch();
        }}
      >
        <div className="space-y-8">
          <div>
            <span className="text-xs uppercase font-mono-numbers tracking-wider text-muted">
              Curricular Bottleneck Ranking
            </span>
            <h2 className="font-display text-3xl text-ink mt-1">
              Ranked Prerequisite Root Gaps
            </h2>
            <p className="mt-2 text-sm text-muted max-w-[68ch] leading-relaxed">
              These are the foundational concepts causing downstream struggle (risk ≥ 0.50) across multiple students. Addressing these topics in class review sessions will lift performance across several subsequent modules.
            </p>
          </div>

          <div className="space-y-4 pt-4 rule-line">
            {gaps.map((gap, index) => {
              const isExpanded = expandedGapId === gap.rootGapId;

              return (
                <div
                  key={gap.rootGapId}
                  className="rounded-card border border-line bg-surface overflow-hidden shadow-card transition-all"
                >
                  {/* Summary Bar */}
                  <button
                    type="button"
                    onClick={() => toggleExpand(gap.rootGapId)}
                    className="w-full p-5 flex items-center justify-between text-left hover:bg-paper-2/30 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-paper-2 text-xs font-mono-numbers font-semibold text-ink">
                        {index + 1}
                      </span>
                      <div>
                        <h3 className="font-medium text-base text-ink">
                          {gap.rootGapName}
                        </h3>
                        <p className="text-xs text-muted mt-0.5 font-mono-numbers">
                          Root Gap ID #{gap.rootGapId} · Impedes downstream DSA progression
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <span className="font-display text-2xl text-ink">
                          <CountUp value={gap.affectedStudentsCount} />
                        </span>
                        <span className="text-[11px] font-mono-numbers text-muted block">
                          Students Affected
                        </span>
                      </div>
                      <div className="text-muted p-1">
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5" />
                        ) : (
                          <ChevronRight className="h-5 w-5" />
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Expanded List of Affected Students */}
                  {isExpanded && (
                    <div className="border-t border-line bg-paper-2/20 p-5 space-y-3">
                      <div className="text-xs uppercase font-mono-numbers text-muted pb-1 rule-line">
                        Students Impeded by {gap.rootGapName}:
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {gap.affectedStudents.map((st) => (
                          <div
                            key={st.id}
                            className="p-3 rounded-lg border border-line bg-surface flex items-center justify-between"
                          >
                            <div>
                              <Link
                                to={`/faculty/students/${st.id}`}
                                className="font-medium text-sm text-ink hover:underline hover:text-lagoon"
                              >
                                {st.name}
                              </Link>
                              <div className="text-xs text-muted mt-0.5">
                                Blocked in: <span className="text-ink">{st.blockedConceptName}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="font-mono-numbers font-semibold text-xs text-terracotta">
                                {Math.round(st.risk * 100)}% Risk
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </QueryBoundary>
    </DashboardShell>
  );
};

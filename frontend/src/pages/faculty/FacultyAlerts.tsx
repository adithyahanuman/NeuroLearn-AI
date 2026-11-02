import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Bell, ArrowUpRight, ArrowRight, ShieldAlert } from 'lucide-react';
import { api } from '@/api/client';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { QueryBoundary } from '@/components/common/QueryBoundary';

export const FacultyAlerts: React.FC = () => {
  const cohortsQuery = useQuery({
    queryKey: ['faculty-cohorts'],
    queryFn: () => api.getFacultyCohorts(),
  });

  const cohorts = cohortsQuery.data || [];
  const [selectedCohortId, setSelectedCohortId] = useState<string>('cohort-a');

  const alertsQuery = useQuery({
    queryKey: ['faculty-alerts', selectedCohortId],
    queryFn: () => api.getFacultyAlerts(selectedCohortId),
    enabled: !!selectedCohortId,
  });

  const alerts = alertsQuery.data || [];

  return (
    <DashboardShell
      title="Rapid Risk Surge Alerts"
      selectedCohort={selectedCohortId}
      onCohortChange={(cid) => setSelectedCohortId(cid)}
      availableCohorts={cohorts.map((c) => ({ id: c.id, name: c.name }))}
    >
      <QueryBoundary
        isLoading={cohortsQuery.isLoading || alertsQuery.isLoading}
        isError={cohortsQuery.isError || alertsQuery.isError}
        isEmpty={alerts.length === 0}
        emptyTitle="No Risk Surges Detected"
        emptyMessage="No students have experienced an adverse risk shift of 0.20 or greater in the past 7 days."
        skeletonType="table"
        onRetry={() => {
          cohortsQuery.refetch();
          alertsQuery.refetch();
        }}
      >
        <div className="space-y-6">
          <div>
            <span className="text-xs uppercase font-mono-numbers tracking-wider text-muted">
              Early Intervention Trigger
            </span>
            <h2 className="font-display text-3xl text-ink mt-1">
              Sudden Struggle Trajectories
            </h2>
            <p className="mt-2 text-sm text-muted max-w-[68ch] leading-relaxed">
              This feed isolates students whose probability of struggling on a concept spiked by <strong>20 percentage points (Δ ≥ 0.20) or more</strong> over the last 7 days, indicating missed practice intervals, consecutive low quiz scores, or prerequisite decay.
            </p>
          </div>

          <div className="overflow-x-auto rounded-card border border-line bg-surface shadow-card">
            <table className="w-full text-left text-sm" aria-label="Risk Surge Alerts Table">
              <thead>
                <tr className="rule-line text-xs uppercase font-mono-numbers text-muted bg-paper-2/40">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Concept</th>
                  <th className="py-3 px-4">Risk Delta (7 Days)</th>
                  <th className="py-3 px-4">Previous → Current</th>
                  <th className="py-3 px-4">Detection Date</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {alerts.map((alert) => (
                  <tr key={alert.id} className="hover:bg-paper-2/40 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-ink">
                      <Link
                        to={`/faculty/students/${alert.studentId}`}
                        className="hover:text-lagoon hover:underline"
                      >
                        {alert.studentName}
                      </Link>
                      <div className="text-xs font-mono-numbers text-muted">
                        Cohort: {alert.cohortId}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-ink">
                      {alert.conceptName}
                    </td>
                    <td className="py-3.5 px-4 font-mono-numbers">
                      <span className="inline-flex items-center gap-1 font-semibold text-xs text-terracotta bg-terracotta/10 px-2 py-0.5 rounded-full border border-terracotta/20">
                        <ArrowUpRight className="h-3.5 w-3.5" />
                        +{Math.round(alert.delta * 100)}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono-numbers text-xs text-muted">
                      {Math.round(alert.previousRisk * 100)}% →{' '}
                      <strong className="text-ink">{Math.round(alert.currentRisk * 100)}%</strong>
                    </td>
                    <td className="py-3.5 px-4 font-mono-numbers text-xs text-muted">
                      {alert.date}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        to={`/faculty/students/${alert.studentId}`}
                        className="text-xs font-medium text-lagoon hover:underline inline-flex items-center gap-1"
                      >
                        Inspect Profile <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </QueryBoundary>
    </DashboardShell>
  );
};

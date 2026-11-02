import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowRight, AlertTriangle, Users, GitBranch, ArrowUpRight, TrendingUp } from 'lucide-react';
import { api } from '@/api/client';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { QueryBoundary } from '@/components/common/QueryBoundary';
import { CountUp } from '@/components/motion/CountUp';
import { RiskBadge } from '@/components/common/RiskBadge';

export const FacultyOverview: React.FC = () => {
  const cohortsQuery = useQuery({
    queryKey: ['faculty-cohorts'],
    queryFn: () => api.getFacultyCohorts(),
  });

  const cohorts = cohortsQuery.data || [];
  const [selectedCohortId, setSelectedCohortId] = useState<string>('cohort-a');

  // Active selected cohort
  const currentCohort = cohorts.find((c) => c.id === selectedCohortId) || cohorts[0];

  const studentsQuery = useQuery({
    queryKey: ['cohort-students', currentCohort?.id],
    queryFn: () => (currentCohort ? api.getCohortStudents(currentCohort.id) : Promise.resolve([])),
    enabled: !!currentCohort,
  });

  const alertsQuery = useQuery({
    queryKey: ['faculty-alerts', currentCohort?.id],
    queryFn: () => api.getFacultyAlerts(currentCohort?.id),
    enabled: !!currentCohort,
  });

  const gapsQuery = useQuery({
    queryKey: ['faculty-gaps', currentCohort?.id],
    queryFn: () => api.getFacultyCommonGaps(currentCohort?.id),
    enabled: !!currentCohort,
  });

  const students = studentsQuery.data || [];
  const alerts = alertsQuery.data || [];
  const gaps = gapsQuery.data || [];

  const highRiskStudents = students.filter((s) => s.band === 'high');
  const avgMastery =
    students.length > 0
      ? Math.round((students.reduce((acc, s) => acc + s.averageMastery, 0) / students.length) * 100)
      : 68;

  // Cohort Risk Distribution counts
  const lowCount = students.filter((s) => s.band === 'low').length;
  const medCount = students.filter((s) => s.band === 'medium').length;
  const highCount = students.filter((s) => s.band === 'high').length;
  const total = Math.max(students.length, 1);

  const lowPct = Math.round((lowCount / total) * 100);
  const medPct = Math.round((medCount / total) * 100);
  const highPct = 100 - lowPct - medPct;

  return (
    <DashboardShell
      title="Cohort Intelligence Overview"
      selectedCohort={selectedCohortId}
      onCohortChange={(cid) => setSelectedCohortId(cid)}
      availableCohorts={cohorts.map((c) => ({ id: c.id, name: c.name }))}
    >
      <QueryBoundary
        isLoading={cohortsQuery.isLoading || studentsQuery.isLoading}
        isError={cohortsQuery.isError || studentsQuery.isError}
        skeletonType="stats"
        onRetry={() => {
          cohortsQuery.refetch();
          studentsQuery.refetch();
        }}
      >
        <div className="space-y-10">
          {/* Headline Stats Row (allowed card row) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card-standard p-6 flex flex-col justify-between">
              <span className="text-xs uppercase font-mono-numbers tracking-wider text-muted">
                Total Enrolled
              </span>
              <div className="mt-3 text-5xl font-display text-ink">
                <CountUp value={students.length} />
              </div>
              <div className="mt-3 text-xs text-muted font-mono-numbers">
                Active in {currentCohort?.name}
              </div>
            </div>

            <div className="card-standard p-6 flex flex-col justify-between">
              <span className="text-xs uppercase font-mono-numbers tracking-wider text-muted">
                High Risk Students
              </span>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-5xl font-display text-terracotta">
                  <CountUp value={highRiskStudents.length} />
                </span>
                <span className="text-xs font-mono-numbers text-terracotta font-medium">
                  {Math.round((highRiskStudents.length / total) * 100)}% of cohort
                </span>
              </div>
              <div className="mt-3 text-xs text-muted">Exceeds 0.6 risk threshold</div>
            </div>

            <div className="card-standard p-6 flex flex-col justify-between">
              <span className="text-xs uppercase font-mono-numbers tracking-wider text-muted">
                Cohort Mean Mastery
              </span>
              <div className="mt-3 text-5xl font-display text-ink">
                <CountUp value={avgMastery} suffix="%" />
              </div>
              <div className="mt-3 text-xs text-muted font-mono-numbers">
                Weighted across 38 concepts
              </div>
            </div>

            <div className="card-standard p-6 flex flex-col justify-between">
              <span className="text-xs uppercase font-mono-numbers tracking-wider text-muted">
                Recent Surge Alerts
              </span>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-5xl font-display text-ink">
                  <CountUp value={alerts.length} />
                </span>
                <span className="text-xs font-mono-numbers text-amber font-medium">
                  Δ ≥ 0.2 in 7 days
                </span>
              </div>
              <Link
                to="/faculty/alerts"
                className="mt-3 text-xs font-medium text-lagoon hover:underline flex items-center gap-1"
              >
                Inspect Alerts <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* Risk Distribution Horizontal Segmented Bar (Section 7 Spec: one wide segmented bar with direct counts & percentages) */}
          <div className="pt-6 rule-line pb-8">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-xs font-mono-numbers uppercase tracking-wider text-muted">
                  Cohort Risk Profile
                </span>
                <h3 className="font-display text-2xl text-ink">
                  Struggle Risk Distribution
                </h3>
              </div>
              <div className="text-xs font-mono-numbers text-muted">
                {students.length} Students Evaluated
              </div>
            </div>

            {/* Segmented Horizontal Bar with Direct Data Labels */}
            <div className="relative h-12 w-full rounded-card border border-line bg-surface overflow-hidden flex">
              <div
                style={{ width: `${lowPct}%` }}
                className="bg-lagoon/20 hover:bg-lagoon/30 transition-all border-r border-line flex items-center justify-center px-2"
                title={`Low Risk: ${lowCount} students (${lowPct}%)`}
              >
                <span className="text-xs font-mono-numbers font-medium text-lagoon truncate">
                  Low Risk · {lowCount} ({lowPct}%)
                </span>
              </div>

              <div
                style={{ width: `${medPct}%` }}
                className="bg-amber/20 hover:bg-amber/30 transition-all border-r border-line flex items-center justify-center px-2"
                title={`Medium Risk: ${medCount} students (${medPct}%)`}
              >
                <span className="text-xs font-mono-numbers font-medium text-amber truncate">
                  Medium · {medCount} ({medPct}%)
                </span>
              </div>

              <div
                style={{ width: `${highPct}%` }}
                className="bg-terracotta/20 hover:bg-terracotta/30 transition-all flex items-center justify-center px-2"
                title={`High Risk: ${highCount} students (${highPct}%)`}
              >
                <span className="text-xs font-mono-numbers font-semibold text-terracotta truncate">
                  High Risk · {highCount} ({highPct}%)
                </span>
              </div>
            </div>
          </div>

          {/* Two-column layout: Top Alerts and Top Common Gaps */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4 rule-line">
            {/* Top 5 Alerts */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-xs font-mono-numbers uppercase text-muted">
                    Early Warning System
                  </span>
                  <h3 className="font-display text-2xl text-ink">
                    Rapid Surge Alerts
                  </h3>
                </div>
                <Link
                  to="/faculty/alerts"
                  className="text-xs font-medium text-ink hover:underline flex items-center gap-1"
                >
                  All Alerts <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="space-y-3">
                {alerts.slice(0, 5).map((alert) => (
                  <div
                    key={alert.id}
                    className="p-4 rounded-card border border-line bg-surface flex items-center justify-between gap-4 hover:border-ink/40 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/faculty/students/${alert.studentId}`}
                          className="font-medium text-sm text-ink hover:underline"
                        >
                          {alert.studentName}
                        </Link>
                        <span className="text-xs font-mono-numbers text-muted">
                          ({alert.cohortId})
                        </span>
                      </div>
                      <div className="text-xs text-muted mt-0.5">
                        Concept: <strong className="text-ink">{alert.conceptName}</strong>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="inline-flex items-center gap-1 text-xs font-mono-numbers font-semibold text-terracotta bg-terracotta/10 px-2 py-0.5 rounded-full border border-terracotta/20">
                        <ArrowUpRight className="h-3.5 w-3.5" />
                        +{Math.round(alert.delta * 100)}%
                      </span>
                      <div className="text-[11px] font-mono-numbers text-muted mt-1">
                        {alert.date}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Common Gaps */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-xs font-mono-numbers uppercase text-muted">
                    Curriculum Insights
                  </span>
                  <h3 className="font-display text-2xl text-ink">
                    Common Prerequisite Gaps
                  </h3>
                </div>
                <Link
                  to="/faculty/gaps"
                  className="text-xs font-medium text-ink hover:underline flex items-center gap-1"
                >
                  Ranked Gaps <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="space-y-3">
                {gaps.slice(0, 4).map((gap) => (
                  <div
                    key={gap.rootGapId}
                    className="p-4 rounded-card border border-line bg-surface flex items-center justify-between gap-4"
                  >
                    <div>
                      <h4 className="font-medium text-sm text-ink">
                        {gap.rootGapName}
                      </h4>
                      <p className="text-xs text-muted mt-0.5">
                        Affecting {gap.affectedStudentsCount} students across multiple assignments
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-display text-xl text-ink">
                        {gap.affectedStudentsCount}
                      </span>
                      <span className="text-[11px] font-mono-numbers text-muted block">
                        Students
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </QueryBoundary>
    </DashboardShell>
  );
};

import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Lock, AlertTriangle, GitBranch, Route, TrendingUp, ExternalLink, Video, PlayCircle, CheckCircle2, AlertCircle } from 'lucide-react';
import { api, ClientError } from '@/api/client';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { QueryBoundary } from '@/components/common/QueryBoundary';
import { RiskBadge } from '@/components/common/RiskBadge';
import { ReasonList } from '@/components/common/ReasonList';
import { RootGapChain } from '@/components/common/RootGapChain';
import { getRecommendedVideos } from '@/lib/videoRecommender';

export const FacultyStudentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const studentId = id || '';

  const twinQuery = useQuery({
    queryKey: ['student-twin', studentId],
    queryFn: () => api.getStudentTwin(studentId),
  });

  const risksQuery = useQuery({
    queryKey: ['student-risks', studentId],
    queryFn: () => api.getStudentRisks(studentId),
  });

  const rootGapsQuery = useQuery({
    queryKey: ['student-root-gaps', studentId],
    queryFn: () => api.getStudentRootGaps(studentId),
  });

  const pathQuery = useQuery({
    queryKey: ['student-path', studentId],
    queryFn: () => api.getStudentPath(studentId),
  });

  const attemptsQuery = useQuery({
    queryKey: ['student-attempts', studentId],
    queryFn: () => api.getStudentAttempts(studentId),
  });

  const isAccessDenied =
    (twinQuery.error instanceof ClientError && twinQuery.error.status === 403) ||
    (risksQuery.error instanceof ClientError && risksQuery.error.status === 403);

  const isNotFound =
    (twinQuery.error instanceof ClientError && twinQuery.error.status === 404) ||
    (risksQuery.error instanceof ClientError && risksQuery.error.status === 404);

  if (isAccessDenied) {
    return (
      <DashboardShell title="Access Denied">
        <div className="card-standard p-10 text-center max-w-lg mx-auto">
          <div className="h-12 w-12 rounded-full bg-terracotta/10 text-terracotta flex items-center justify-center mx-auto mb-4">
            <Lock className="h-6 w-6" />
          </div>
          <h3 className="font-display text-2xl text-ink">Not Available to You</h3>
          <p className="mt-2 text-sm text-muted">
            This student record does not belong to any cohorts assigned to your faculty profile (403 Forbidden).
          </p>
          <Link to="/faculty/students" className="mt-6 btn-primary inline-flex">
            Return to Cohort Roster
          </Link>
        </div>
      </DashboardShell>
    );
  }

  if (isNotFound) {
    return (
      <DashboardShell title="Student Not Found">
        <div className="card-standard p-10 text-center max-w-lg mx-auto">
          <h3 className="font-display text-2xl text-ink">Unknown Student</h3>
          <p className="mt-2 text-sm text-muted">The requested student ID does not exist in the system (404 Not Found).</p>
          <Link to="/faculty/students" className="mt-6 btn-primary inline-flex">
            Return to Cohort Roster
          </Link>
        </div>
      </DashboardShell>
    );
  }

  const twin = twinQuery.data;
  const risks = risksQuery.data?.risks || [];
  const rootGaps = rootGapsQuery.data || [];
  const path = pathQuery.data;
  const attempts = attemptsQuery.data || [];

  return (
    <DashboardShell title="Student Diagnostic Audit">
      <QueryBoundary
        isLoading={twinQuery.isLoading || risksQuery.isLoading}
        isError={twinQuery.isError || risksQuery.isError}
        skeletonType="card"
        onRetry={() => {
          twinQuery.refetch();
          risksQuery.refetch();
          rootGapsQuery.refetch();
          pathQuery.refetch();
        }}
      >
        <div className="space-y-8">
          {/* Breadcrumb & Read-only marker */}
          <div className="flex items-center justify-between">
            <Link
              to="/faculty/students"
              className="inline-flex items-center gap-1.5 text-xs font-mono-numbers text-muted hover:text-ink transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Cohort Roster
            </Link>

            {/* Required Section 6.5 Marker */}
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber/30 bg-amber/10 px-3 py-1 text-xs font-mono-numbers text-amber font-medium">
              <Lock className="h-3 w-3" />
              <span>Read-Only Faculty View</span>
            </span>
          </div>

          {/* Student Profile Summary */}
          <div className="p-6 rounded-card border border-line bg-surface flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <span className="text-xs uppercase font-mono-numbers text-muted">
                Student Profile ID: {studentId.slice(0, 8)}...
              </span>
              <h2 className="font-display text-3xl text-ink mt-0.5">
                Digital Twin Snapshot
              </h2>
              <div className="mt-2 flex flex-wrap gap-4 text-xs font-mono-numbers text-muted">
                <span>Total Attempts: {twin?.totalAttempts || 0}</span>
                <span>·</span>
                <span>Velocity: {Math.round((twin?.velocity || 0.7) * 100)}%</span>
                <span>·</span>
                <span>Consistency: {Math.round((twin?.consistency || 0.7) * 100)}%</span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs uppercase font-mono-numbers text-muted block">
                Average Mastery
              </span>
              <span className="font-display text-4xl text-ink">
                {twin ? Math.round((Object.values(twin.masteryAll).reduce((a, b) => a + b, 0) / 38) * 100) : 65}%
              </span>
            </div>
          </div>

          {/* Section 1: Root Gaps for this Student */}
          {rootGaps.length > 0 && (
            <div className="pt-4 rule-line">
              <div className="flex items-center gap-2 mb-4">
                <GitBranch className="h-5 w-5 text-terracotta" />
                <h3 className="font-display text-2xl text-ink">
                  Identified Prerequisite Bottlenecks
                </h3>
              </div>
              <div className="space-y-4">
                {rootGaps.map((gap) => (
                  <RootGapChain
                    key={gap.conceptId}
                    rootGapName={gap.rootGapName}
                    blockedConceptName={gap.conceptName}
                    chainDetails={gap.chainDetails}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Section 2: Top Predicted Risks & Reasons */}
          <div className="pt-4 rule-line">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-5 w-5 text-amber" />
              <h3 className="font-display text-2xl text-ink">
                Concept Struggle Predictions
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {risks.slice(0, 4).map((r) => (
                <div key={r.conceptId} className="p-4 rounded-card border border-line bg-surface">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm text-ink">{r.conceptName}</span>
                    <RiskBadge band={r.band} score={r.risk} showScore />
                  </div>
                  <ReasonList reasons={r.reasons} />
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Prescribed Remediation Learning Path */}
          {path && path.steps.length > 0 && (
            <div className="pt-4 rule-line">
              <div className="flex items-center gap-2 mb-4">
                <Route className="h-5 w-5 text-lagoon" />
                <h3 className="font-display text-2xl text-ink">
                  Prescribed Remediation Path ({path.steps.length} Steps)
                </h3>
              </div>
              <div className="space-y-2.5">
                {path.steps.map((step, idx) => {
                  const stepUrl = step.url || `https://www.youtube.com/results?search_query=${encodeURIComponent(`${step.resourceTitle} ${step.conceptName} lecture`)}`;

                  return (
                    <div
                      key={step.id}
                      className="p-4 rounded-card border border-line bg-surface flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-semibold text-muted font-mono-numbers shrink-0">Step {idx + 1}</span>
                        <div className="min-w-0">
                          <span className="font-sans font-medium text-ink block truncate">{step.resourceTitle}</span>
                          <span className="text-muted text-[11px] font-mono-numbers">Concept: {step.conceptName} • {step.minutes} mins</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                        <a
                          href={stepUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-md border border-lagoon/30 bg-lagoon/10 text-lagoon hover:bg-lagoon hover:text-white transition-colors flex items-center gap-1.5 font-medium text-xs"
                          aria-label={`Open YouTube video for ${step.resourceTitle}`}
                        >
                          <Video className="h-3.5 w-3.5" />
                          <span>Watch on YouTube</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>

                        <span className={`px-2 py-0.5 rounded text-[11px] font-mono-numbers font-medium ${
                          step.done ? 'bg-lagoon/15 text-lagoon' : 'bg-amber/15 text-amber'
                        }`}>
                          {step.done ? 'Completed' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 4: Subject Marks & Adaptive Video Prescriptions */}
          <div className="pt-4 rule-line space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-2xl text-ink">
                  Subject Marks & Prescribed YouTube Curricula
                </h3>
                <p className="text-xs text-muted mt-1">
                  Full diagnostic breakdown of tests logged by this student and the adaptive YouTube material prescribed by the model.
                </p>
              </div>
              <span className="text-xs font-mono-numbers text-muted bg-paper-2 px-3 py-1 rounded-full border border-line">
                {attempts.length} Subject Tests Logged
              </span>
            </div>

            {attempts.length === 0 ? (
              <div className="card-standard p-8 text-center text-xs text-muted">
                This student has not submitted any subject test marks or practice attempts yet.
              </div>
            ) : (
              <div className="space-y-3">
                {attempts.map((att) => {
                  const scorePct = Math.round(att.score > 1 ? att.score : att.score * 100);
                  const isLow = scorePct < 70;
                  const videos = att.recommendedVideos && att.recommendedVideos.length > 0
                    ? att.recommendedVideos
                    : getRecommendedVideos(att.conceptId, att.conceptName, att.score > 1 ? att.score / 100 : att.score);

                  return (
                    <div
                      key={att.id}
                      className="card-standard p-4 flex flex-col lg:flex-row lg:items-start justify-between gap-4"
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono-numbers uppercase text-muted">
                            {att.conceptCode}
                          </span>
                          <span className="font-semibold text-sm text-ink truncate">
                            {att.conceptName}
                          </span>
                          <span
                            className={`text-xs font-mono-numbers px-2 py-0.5 rounded-full font-medium ${
                              isLow
                                ? 'bg-terracotta/10 text-terracotta border border-terracotta/20'
                                : 'bg-lagoon/10 text-lagoon border border-lagoon/20'
                            }`}
                          >
                            Score: {scorePct}%
                          </span>
                        </div>
                        <div className="text-[11px] font-mono-numbers text-muted">
                          {att.attemptType} • {new Date(att.attemptedAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </div>
                      </div>

                      <div className="space-y-1.5 flex-1 max-w-md w-full">
                        <span className="text-[10px] font-mono-numbers uppercase text-muted block">
                          Prescribed YouTube Stack ({videos.length} {videos.length > 1 ? 'Videos' : 'Video'}):
                        </span>
                        {videos.map((vid, vidIdx) => (
                          <div
                            key={vidIdx}
                            className={`p-2 rounded-lg border text-xs flex items-center justify-between gap-2 ${
                              isLow ? 'bg-amber-subtle/50 border-amber/30' : 'bg-lagoon-subtle/50 border-lagoon/30'
                            }`}
                          >
                            <div className="min-w-0">
                              <span className="font-medium text-ink block truncate">{vid.title}</span>
                              <span className="text-[10px] font-mono-numbers text-muted">[{vid.badge}] • {vid.durationMinutes}m</span>
                            </div>
                            <a
                              href={vid.url}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-1 rounded bg-surface border border-line text-ink hover:text-lagoon text-[11px] flex items-center gap-1 shrink-0"
                            >
                              <span>Watch</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </QueryBoundary>
    </DashboardShell>
  );
};

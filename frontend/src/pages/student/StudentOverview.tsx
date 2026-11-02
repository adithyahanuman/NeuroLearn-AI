import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowRight, AlertTriangle, Route, Flame, Sparkles, Video, ExternalLink, Award, Plus } from 'lucide-react';
import { api } from '@/api/client';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { CountUp } from '@/components/motion/CountUp';
import { QueryBoundary } from '@/components/common/QueryBoundary';
import { MasteryHeatmap } from '@/components/common/MasteryHeatmap';
import { RiskBadge } from '@/components/common/RiskBadge';
import { ConfidenceChip } from '@/components/common/ConfidenceChip';
import { ReasonList } from '@/components/common/ReasonList';
import { RootGapChain } from '@/components/common/RootGapChain';
import { PreviousMarksModal } from '@/components/student/PreviousMarksModal';

export const StudentOverview: React.FC = () => {
  const [isMarksModalOpen, setIsMarksModalOpen] = useState(false);

  const twinQuery = useQuery({
    queryKey: ['student-twin'],
    queryFn: () => api.getStudentTwin(),
  });

  const risksQuery = useQuery({
    queryKey: ['student-risks'],
    queryFn: () => api.getStudentRisks(),
  });

  const rootGapsQuery = useQuery({
    queryKey: ['student-root-gaps'],
    queryFn: () => api.getStudentRootGaps(),
  });

  const pathQuery = useQuery({
    queryKey: ['student-path'],
    queryFn: () => api.getStudentPath(),
  });

  const attemptsQuery = useQuery({
    queryKey: ['student-attempts'],
    queryFn: () => api.getStudentAttempts(),
  });

  const isLoading =
    twinQuery.isLoading || risksQuery.isLoading || rootGapsQuery.isLoading || pathQuery.isLoading;
  const isError =
    twinQuery.isError || risksQuery.isError || rootGapsQuery.isError || pathQuery.isError;

  const twin = twinQuery.data;
  const risks = risksQuery.data?.risks || [];
  const rootGaps = rootGapsQuery.data || [];
  const path = pathQuery.data;
  const attempts = attemptsQuery.data || [];
  const latestAttempt = attempts[0];

  // Compute headline numbers
  const totalAttempts = attempts.length > 0 ? attempts.length : (twin?.totalAttempts || 0);
  const masteries = Object.values(twin?.masteryAll || {});
  // At starting, data is strictly 0% when no marks/attempts are added.
  // Adding subject marks increases overall curriculum mastery progressively.
  const avgMastery =
    totalAttempts === 0
      ? 0
      : masteries.length > 0
      ? (masteries.reduce((a, b) => a + b, 0) / masteries.length) * 100
      : 0;

  const highRiskCount = risks.filter((r) => r.band === 'high').length;
  const nextStep = path?.steps.find((s) => !s.done);

  return (
    <DashboardShell title="Student Learning Twin" stale={risksQuery.data?.stale}>
      <QueryBoundary
        isLoading={isLoading}
        isError={isError}
        skeletonType="stats"
        onRetry={() => {
          twinQuery.refetch();
          risksQuery.refetch();
          rootGapsQuery.refetch();
          pathQuery.refetch();
        }}
      >
        <div className="space-y-12">
          {/* New Student Onboarding Banner when no marks are entered yet */}
          {attempts.length === 0 && (
            <div className="card-standard p-6 bg-gradient-to-r from-amber-subtle/80 to-paper-2 border-amber/40 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono-numbers bg-amber/20 text-amber border border-amber/30">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Cognitive Model Calibration Required</span>
                  </div>
                  <h3 className="font-display text-2xl text-ink">
                    Welcome! Enter Your Subject Marks
                  </h3>
                  <p className="text-xs text-muted max-w-2xl leading-relaxed">
                    You have not added any subject marks or test results yet. Enter your scores for subjects like Arrays, Loops, Trees, or Recursion to train your Digital Learning Twin and generate personalized YouTube video recommendations.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    id="overview-add-marks-btn"
                    onClick={() => setIsMarksModalOpen(true)}
                    className="btn-primary flex items-center gap-2 text-xs py-2 px-4 shadow-sm"
                  >
                    <Plus className="h-4 w-4" />
                    <span>+ Add Subject Marks</span>
                  </button>

                  <Link
                    to="/student/marks"
                    className="btn-secondary flex items-center gap-2 text-xs py-2 px-3 border-line"
                  >
                    <Award className="h-4 w-4 text-lagoon" />
                    <span>Marks & Videos Hub</span>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Row of 4 headline stats (the one allowed card row) */}
          <section aria-labelledby="stats-heading">
            <h2 id="stats-heading" className="sr-only">Learning Stats Overview</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Stat 1: Overall Mastery */}
              <div className="card-standard p-6 flex flex-col justify-between">
                <span className="text-xs uppercase font-mono-numbers tracking-wider text-muted">
                  Overall Curriculum Mastery
                </span>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-5xl font-display text-ink">
                    <CountUp value={Math.round(avgMastery)} suffix="%" />
                  </span>
                  <span className="text-xs font-mono-numbers text-lagoon font-medium">
                    {totalAttempts === 0 ? 'Baseline (0%)' : `+${Math.max(1, Math.round(avgMastery))}% calibrated`}
                  </span>
                </div>
                <div className="mt-3 text-xs text-muted">Across 38 core concepts</div>
              </div>

              {/* Stat 2: High Risk Concepts */}
              <div className="card-standard p-6 flex flex-col justify-between">
                <span className="text-xs uppercase font-mono-numbers tracking-wider text-muted">
                  Predicted High Risk
                </span>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-5xl font-display text-ink">
                    <CountUp value={totalAttempts === 0 ? 0 : highRiskCount} />
                  </span>
                  <span className="text-xs font-mono-numbers text-terracotta font-medium">
                    {totalAttempts === 0 ? 'No gaps logged' : highRiskCount > 0 ? 'Requires attention' : 'On track'}
                  </span>
                </div>
                <div className="mt-3 text-xs text-muted">
                  {totalAttempts === 0 ? 'Calibrate by adding subject marks' : highRiskCount > 0 ? 'Root gap remediation active' : 'No bottlenecks identified'}
                </div>
              </div>

              {/* Stat 3: Current Streak & Velocity */}
              <div className="card-standard p-6 flex flex-col justify-between">
                <span className="text-xs uppercase font-mono-numbers tracking-wider text-muted">
                  Learning Velocity
                </span>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-5xl font-display text-ink">
                    <CountUp value={totalAttempts === 0 ? 0 : (twin?.velocity ? Math.round(twin.velocity * 10) : 1)} suffix="x" />
                  </span>
                  <span className="text-xs font-mono-numbers text-lagoon font-medium flex items-center gap-1">
                    <Flame className="h-3.5 w-3.5 text-amber" /> {totalAttempts === 0 ? '0-day streak' : 'Active streak'}
                  </span>
                </div>
                <div className="mt-3 text-xs text-muted font-mono-numbers">
                  {totalAttempts} total attempts logged
                </div>
              </div>

              {/* Stat 4: Next Prescribed Step */}
              <div className="card-standard p-6 flex flex-col justify-between">
                <span className="text-xs uppercase font-mono-numbers tracking-wider text-muted">
                  Prescribed Next Step
                </span>
                <div className="mt-2 min-w-0">
                  <div className="text-sm font-semibold text-ink line-clamp-1">
                    {nextStep?.resourceTitle || 'Review Array Indexing'}
                  </div>
                  <div className="text-xs text-muted mt-1 font-mono-numbers">
                    {nextStep?.minutes || 30} mins · {nextStep?.resourceType || 'practice'}
                  </div>
                </div>
                <Link
                  to="/student/path"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-lagoon hover:underline"
                >
                  Go to Learning Path <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </section>

          {/* Latest Attempt Prescription Banner */}
          {latestAttempt && (
            <section aria-label="Latest Exercise Attempt & Recommendation">
              <div className="card-standard p-4 bg-paper-2/60 border border-line flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-full bg-lagoon/10 text-lagoon flex items-center justify-center shrink-0">
                    <Video className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-mono-numbers uppercase text-muted">Latest Practice Session</span>
                      <span className="h-1 w-1 rounded-full bg-line" />
                      <span className="text-xs font-semibold text-ink">{latestAttempt.conceptCode} – {latestAttempt.conceptName}</span>
                      <span className={`text-[10px] font-mono-numbers px-2 py-0.5 rounded-full ${latestAttempt.score >= 0.7 ? 'bg-lagoon/15 text-lagoon' : 'bg-terracotta/15 text-terracotta'}`}>
                        Score: {Math.round(latestAttempt.score > 1 ? latestAttempt.score : latestAttempt.score * 100)}%
                      </span>
                    </div>
                    <p className="text-xs text-muted mt-1 truncate">
                      Adaptive recommendation ({latestAttempt.recommendedVideo.durationMinutes}m):{' '}
                      <span className="font-medium text-ink">{latestAttempt.recommendedVideo.title}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                  <a
                    href={latestAttempt.recommendedVideo.url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 shadow-sm"
                  >
                    <span>Watch Video</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <Link
                    to="/student/progress"
                    className="text-xs text-muted hover:text-ink font-medium"
                  >
                    Attempt History →
                  </Link>
                </div>
              </div>
            </section>
          )}

          {/* Signature Moment: Root Gap Prerequisite Chain (sits directly on page with 1px line) */}
          {rootGaps.length > 0 && (
            <section className="pt-6 rule-line pb-10">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-xs uppercase font-mono-numbers tracking-wider text-muted">
                    Root Cause Diagnosis
                  </span>
                  <h3 className="font-display text-2xl text-ink">
                    Primary Knowledge Bottleneck
                  </h3>
                </div>
                <Link
                  to="/student/root-gaps"
                  className="text-xs font-medium text-ink hover:underline flex items-center gap-1"
                >
                  View all root gaps <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <RootGapChain
                rootGapName={rootGaps[0].rootGapName}
                blockedConceptName={rootGaps[0].conceptName}
                chainDetails={rootGaps[0].chainDetails}
              />
            </section>
          )}

          {/* Top Risks and Plain-English Reasons */}
          <section className="pt-6 rule-line pb-10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <span className="text-xs uppercase font-mono-numbers tracking-wider text-muted">
                  ML Predictions & Explainability
                </span>
                <h3 className="font-display text-2xl text-ink">
                  Top At-Risk Concepts
                </h3>
              </div>
              <Link
                to="/student/risks"
                className="text-xs font-medium text-ink hover:underline flex items-center gap-1"
              >
                Inspect all risks <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {risks.slice(0, 3).map((item) => (
                <div
                  key={item.conceptId}
                  className="p-5 rounded-card border border-line bg-surface flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-mono-numbers text-muted">
                        Concept {item.conceptId}
                      </span>
                      <div className="flex items-center gap-2">
                        <ConfidenceChip
                          confidence={item.confidence}
                          attemptsCount={item.attemptsCount}
                        />
                        <RiskBadge band={item.band} score={item.risk} showScore />
                      </div>
                    </div>
                    <h4 className="font-medium text-ink text-base mb-3">
                      {item.conceptName}
                    </h4>
                    <ReasonList reasons={item.reasons} />
                  </div>
                  <div className="mt-4 pt-3 rule-line flex items-center justify-between text-xs">
                    <span className="text-muted font-mono-numbers">
                      Trend: {item.trend || 'steady'}
                    </span>
                    <Link
                      to={`/student/concept/${item.conceptId}`}
                      className="text-lagoon hover:underline font-medium"
                    >
                      View concept analytics →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Mastery Heatmap */}
          <section className="pt-6 rule-line pb-10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <span className="text-xs uppercase font-mono-numbers tracking-wider text-muted">
                  Knowledge Graph Matrix
                </span>
                <h3 className="font-display text-2xl text-ink">
                  Curriculum Mastery Heatmap
                </h3>
              </div>
              <Link
                to="/student/mastery"
                className="text-xs font-medium text-ink hover:underline flex items-center gap-1"
              >
                Detailed Mastery View <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <MasteryHeatmap masteryMap={twin?.masteryAll || {}} />
          </section>
        </div>

        {/* Previous Marks Entry Modal */}
        <PreviousMarksModal
          isOpen={isMarksModalOpen}
          onClose={() => setIsMarksModalOpen(false)}
        />
      </QueryBoundary>
    </DashboardShell>
  );
};

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Video, ExternalLink, History, PlayCircle, BookOpen, Plus, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '@/api/client';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { QueryBoundary } from '@/components/common/QueryBoundary';
import { CountUp } from '@/components/motion/CountUp';
import { PreviousMarksModal } from '@/components/student/PreviousMarksModal';
import { getRecommendedVideos } from '@/lib/videoRecommender';

export const StudentProgress: React.FC = () => {
  const [isMarksModalOpen, setIsMarksModalOpen] = useState(false);

  const twinQuery = useQuery({
    queryKey: ['student-twin'],
    queryFn: () => api.getStudentTwin(),
  });

  const historyQuery = useQuery({
    queryKey: ['student-twin-history'],
    queryFn: () => api.getStudentTwinHistory(),
  });

  const attemptsQuery = useQuery({
    queryKey: ['student-attempts'],
    queryFn: () => api.getStudentAttempts(),
  });

  const twin = twinQuery.data;
  const history = historyQuery.data || [];
  const attempts = attemptsQuery.data || [];

  // SVG Chart Dimensions
  const svgWidth = 800;
  const svgHeight = 240;
  const paddingX = 40;
  const paddingY = 30;

  const hasAttempts = attempts.length > 0;

  // Build effective history: if 0 attempts logged, baseline starts strictly at 0%
  // Adding subject marks increases the points and trajectory progressively upwards.
  const effectiveHistory = !hasAttempts
    ? [{ date: new Date().toISOString().split('T')[0], averageMastery: 0.0 }]
    : history.length > 0
    ? history
    : [{ date: new Date().toISOString().split('T')[0], averageMastery: 0.0 }];

  // Build smooth path for mastery history
  const points = effectiveHistory.map((pt, idx) => {
    const x = paddingX + (idx / Math.max(effectiveHistory.length - 1, 1)) * (svgWidth - paddingX * 2);
    // Y inverted: 0% at bottom (svgHeight - paddingY), 100% at top (paddingY)
    const val = pt.averageMastery || 0;
    const y = svgHeight - paddingY - val * (svgHeight - paddingY * 2);
    return { x, y, val, date: pt.date };
  });

  const pathD = points.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = points[i - 1];
    const cpX = (prev.x + p.x) / 2;
    return `${acc} C ${cpX} ${prev.y}, ${cpX} ${p.y}, ${p.x} ${p.y}`;
  }, '');

  const areaD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x} ${svgHeight - paddingY} L ${points[0].x} ${svgHeight - paddingY} Z`
    : '';

  return (
    <DashboardShell title="Progress & Digital Learning Twin">
      <QueryBoundary
        isLoading={twinQuery.isLoading || historyQuery.isLoading}
        isError={twinQuery.isError || historyQuery.isError}
        skeletonType="card"
        onRetry={() => {
          twinQuery.refetch();
          historyQuery.refetch();
        }}
      >
        <div className="space-y-10">
          <div>
            <span className="text-xs uppercase font-mono-numbers tracking-wider text-muted">
              Cognitive Trajectory Model
            </span>
            <h2 className="font-display text-3xl text-ink mt-1">
              Digital Twin Evolution
            </h2>
            <p className="mt-2 text-sm text-muted max-w-[68ch] leading-relaxed">
              Your Digital Learning Twin maintains an active representation of your learning velocity, practice consistency, and concept retention over time.
            </p>
          </div>

          {/* Allowed standard stats row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card-standard p-5">
              <span className="text-xs uppercase font-mono-numbers text-muted">Velocity Index</span>
              <div className="mt-2 text-4xl font-display text-ink">
                <CountUp value={twin ? Math.round(twin.velocity * 100) : 80} suffix="%" />
              </div>
              <div className="mt-2 text-xs text-muted">Speed of concept absorption</div>
            </div>

            <div className="card-standard p-5">
              <span className="text-xs uppercase font-mono-numbers text-muted">Study Consistency</span>
              <div className="mt-2 text-4xl font-display text-ink">
                <CountUp value={twin ? Math.round(twin.consistency * 100) : 75} suffix="%" />
              </div>
              <div className="mt-2 text-xs text-muted">Weekly interval regularity</div>
            </div>

            <div className="card-standard p-5">
              <span className="text-xs uppercase font-mono-numbers text-muted">Platform Engagement</span>
              <div className="mt-2 text-4xl font-display text-ink">
                <CountUp value={twin ? Math.round(twin.engagement * 100) : 85} suffix="%" />
              </div>
              <div className="mt-2 text-xs text-muted">Interactive exercise depth</div>
            </div>

            <div className="card-standard p-5">
              <span className="text-xs uppercase font-mono-numbers text-muted">Twin Confidence</span>
              <div className="mt-2 text-4xl font-display text-ink">
                <CountUp value={twin ? Math.round(twin.confidence * 100) : 90} suffix="%" />
              </div>
              <div className="mt-2 text-xs text-muted">Model certainty metric</div>
            </div>
          </div>

          {/* Mastery Timeline SVG Chart (Section 7 standard: smooth line, soft gradient, labelled dotted thresholds) */}
          <div className="pt-6 rule-line">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-xs font-mono-numbers uppercase tracking-wider text-muted">
                  Historical Trajectory
                </span>
                <h3 className="font-display text-2xl text-ink">
                  Average Curriculum Mastery over Time
                </h3>
              </div>
              <div className="text-xs font-mono-numbers text-muted">
                12-Week Longitudinal Evaluation
              </div>
            </div>

            <div className="w-full overflow-x-auto">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full min-w-[640px] h-60 overflow-visible"
              >
                <defs>
                  <linearGradient id="masteryGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1D6B66" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#1D6B66" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Dotted threshold line at 70% (Strong mastery threshold) */}
                <line
                  x1={paddingX}
                  y1={svgHeight - paddingY - 0.7 * (svgHeight - paddingY * 2)}
                  x2={svgWidth - paddingX}
                  y2={svgHeight - paddingY - 0.7 * (svgHeight - paddingY * 2)}
                  stroke="#1D6B66"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  opacity="0.6"
                />
                <text
                  x={svgWidth - paddingX + 6}
                  y={svgHeight - paddingY - 0.7 * (svgHeight - paddingY * 2) + 3}
                  fontSize="10"
                  fontFamily="Geist Mono"
                  fill="#1D6B66"
                >
                  70% Mastery Target
                </text>

                {/* Dotted threshold line at 40% (Weak mastery boundary) */}
                <line
                  x1={paddingX}
                  y1={svgHeight - paddingY - 0.4 * (svgHeight - paddingY * 2)}
                  x2={svgWidth - paddingX}
                  y2={svgHeight - paddingY - 0.4 * (svgHeight - paddingY * 2)}
                  stroke="#C8452F"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  opacity="0.6"
                />
                <text
                  x={svgWidth - paddingX + 6}
                  y={svgHeight - paddingY - 0.4 * (svgHeight - paddingY * 2) + 3}
                  fontSize="10"
                  fontFamily="Geist Mono"
                  fill="#C8452F"
                >
                  40% Warning Level
                </text>

                {/* Area under curve */}
                {areaD && <path d={areaD} fill="url(#masteryGradient)" />}

                {/* Smooth Curve */}
                {pathD && (
                  <path
                    d={pathD}
                    fill="none"
                    stroke="#1D6B66"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                )}

                {/* Data Points and Direct Last-Point Marker */}
                {points.map((pt, i) => {
                  const isLast = i === points.length - 1;
                  return (
                    <g key={i}>
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isLast ? 5 : 3.5}
                        fill="#FFFFFF"
                        stroke="#1D6B66"
                        strokeWidth="2"
                      />
                      {isLast && (
                        <g>
                          <rect
                            x={pt.x - 22}
                            y={pt.y - 28}
                            width="44"
                            height="20"
                            rx="4"
                            fill="#1D6B66"
                          />
                          <text
                            x={pt.x}
                            y={pt.y - 14}
                            textAnchor="middle"
                            fontSize="11"
                            fontFamily="Geist Mono"
                            fill="#FFFFFF"
                            fontWeight="600"
                          >
                            {Math.round(pt.val * 100)}%
                          </text>
                        </g>
                      )}
                      <text
                        x={pt.x}
                        y={svgHeight - 10}
                        textAnchor="middle"
                        fontSize="10"
                        fontFamily="Geist Mono"
                        fill="#6B665C"
                      >
                        {pt.date.slice(5)}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Exercise Attempt History & Adaptive Video Recommendations */}
          <div className="pt-8 rule-line space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-mono-numbers uppercase tracking-wider text-muted">
                  Practice Log & Adaptive Video Prescription
                </span>
                <h3 className="font-display text-2xl text-ink mt-0.5">
                  Exercise Attempts History
                </h3>
                <p className="text-xs text-muted mt-1 max-w-[65ch]">
                  The adaptive model reviews your exercise scores: scoring under 70% generates an in-depth video lecture to rebuild foundational mechanics, while scoring 70% or higher generates a fast 5-minute summary video to refresh key invariants.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono-numbers text-muted bg-paper-2 px-3 py-1.5 rounded-full border border-line">
                <History className="h-4 w-4 text-lagoon" />
                <span>{attempts.length} attempts recorded</span>
              </div>
            </div>

            {attempts.length === 0 ? (
              <div className="card-standard p-8 text-center text-muted text-sm">
                No exercise attempts logged yet. Click "Log Attempt" in the header to submit your first practice session.
              </div>
            ) : (
              <div className="space-y-3" id="attempts-history-list">
                {attempts.map((att) => {
                  const scorePct = Math.round(att.score > 1 ? att.score : att.score * 100);
                  const isLow = scorePct < 70;
                  const video = att.recommendedVideo;

                  return (
                    <div
                      key={att.id}
                      className="card-standard p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-5 hover:border-ink/30 transition-all"
                    >
                      {/* Attempt Metadata */}
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-mono-numbers text-muted uppercase">
                            {att.conceptCode}
                          </span>
                          <span className="h-1 w-1 rounded-full bg-line" />
                          <span className="text-sm font-semibold text-ink">
                            {att.conceptName}
                          </span>
                          <span
                            className={`text-xs font-mono-numbers px-2.5 py-0.5 rounded-full font-medium ${
                              isLow
                                ? 'bg-terracotta/10 text-terracotta border border-terracotta/20'
                                : 'bg-lagoon/10 text-lagoon border border-lagoon/20'
                            }`}
                          >
                            Score: {scorePct}%
                          </span>
                          <span className="text-xs font-mono-numbers text-muted capitalize">
                            • {att.attemptType}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-xs font-mono-numbers text-muted">
                          <span>
                            {new Date(att.attemptedAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          <span>• {Math.round(att.timeSpentSeconds / 60)} mins</span>
                          {att.hintsUsed > 0 && (
                            <span>
                              • {att.hintsUsed} hint{att.hintsUsed > 1 ? 's' : ''} used
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Adaptive Video Recommendation Card */}
                      {video && (
                        <div
                          className={`p-3.5 rounded-xl border max-w-lg w-full flex items-start gap-3 transition-colors ${
                            isLow
                              ? 'bg-amber-subtle/50 border-amber/30 text-ink'
                              : 'bg-lagoon-subtle/50 border-lagoon/30 text-ink'
                          }`}
                        >
                          <div
                            className={`p-2 rounded-lg shrink-0 ${
                              isLow ? 'bg-amber/10 text-amber' : 'bg-lagoon/10 text-lagoon'
                            }`}
                          >
                            <Video className="h-4 w-4" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[10px] font-mono-numbers uppercase tracking-wider px-2 py-0.5 rounded-full font-medium ${
                                  isLow
                                    ? 'bg-amber/20 text-amber'
                                    : 'bg-lagoon/20 text-lagoon'
                                }`}
                              >
                                {video.badge}
                              </span>
                              <span className="text-xs font-mono-numbers text-muted">
                                {video.durationMinutes}m duration
                              </span>
                            </div>

                            <a
                              href={video.url}
                              target="_blank"
                              rel="noreferrer"
                              className="font-medium text-xs text-ink hover:text-lagoon flex items-center gap-1.5 mt-1.5 group"
                              aria-label={`Watch video: ${video.title}`}
                            >
                              <span className="truncate group-hover:underline">
                                {video.title}
                              </span>
                              <ExternalLink className="h-3 w-3 shrink-0 opacity-70 group-hover:opacity-100" />
                            </a>

                            <p className="text-[11px] text-muted mt-1 leading-snug line-clamp-2">
                              {video.reason}
                            </p>
                          </div>
                        </div>
                      )}
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

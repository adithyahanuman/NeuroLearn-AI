import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Check, Clock, BookOpen, Video, Code2 } from 'lucide-react';
import { api } from '@/api/client';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { QueryBoundary } from '@/components/common/QueryBoundary';
import { CountUp } from '@/components/motion/CountUp';
import { PathStep } from '@/api/types';

export const StudentPath: React.FC = () => {
  const queryClient = useQueryClient();

  const pathQuery = useQuery({
    queryKey: ['student-path'],
    queryFn: () => api.getStudentPath(),
  });

  const toggleMutation = useMutation({
    mutationFn: (variables: { stepId: string; done?: boolean; stepIndex?: number }) =>
      api.togglePathStep(variables.stepId, variables.done, variables.stepIndex),
    onSuccess: (updatedPath) => {
      queryClient.setQueryData(['student-path'], updatedPath);
      queryClient.invalidateQueries({ queryKey: ['student-root-gaps'] });
    },
  });

  const path = pathQuery.data;
  const steps = path?.steps || [];
  const completedCount = steps.filter((s) => s.done).length;
  const progressPercent =
    steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0;

  const getTypeIcon = (type: PathStep['resourceType']) => {
    switch (type) {
      case 'video':
        return <Video className="h-4 w-4 text-lagoon" />;
      case 'practice':
        return <Code2 className="h-4 w-4 text-amber" />;
      case 'article':
      default:
        return <BookOpen className="h-4 w-4 text-muted" />;
    }
  };

  return (
    <DashboardShell title="Personalised Learning Path">
      <QueryBoundary
        isLoading={pathQuery.isLoading}
        isError={pathQuery.isError}
        isEmpty={steps.length === 0}
        emptyTitle="Learning Path In Progress"
        emptyMessage="Your customized path will be automatically assembled once diagnostic results are processed."
        skeletonType="table"
        onRetry={() => pathQuery.refetch()}
      >
        <div className="space-y-8">
          {/* Header Summary */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 rule-line">
            <div>
              <span className="text-xs uppercase font-mono-numbers tracking-wider text-muted">
                Adaptive Study Prescription
              </span>
              <h2 className="font-display text-3xl text-ink mt-1">
                Root-Gap-First Remediation Path
              </h2>
              <p className="mt-2 text-sm text-muted max-w-[68ch] leading-relaxed">
                This sequenced curriculum fixes underlying prerequisite weaknesses before asking you to practice downstream complex topics.
              </p>
            </div>

            {/* Time & Completion Summary Cards (Allowed standard card) */}
            <div className="card-standard p-4 min-w-[240px] flex items-center justify-between">
              <div>
                <span className="text-[11px] font-mono-numbers uppercase text-muted block">
                  Time Remaining
                </span>
                <span className="font-display text-2xl text-ink">
                  <CountUp value={path?.remainingMinutes || 0} suffix=" mins" />
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-mono-numbers uppercase text-muted block">
                  Progress
                </span>
                <span className="font-mono-numbers font-semibold text-sm text-lagoon">
                  {completedCount} / {steps.length} ({progressPercent}%)
                </span>
              </div>
            </div>
          </div>

          {/* Stepped Checklist */}
          <div className="space-y-3">
            {steps.map((step, idx) => (
              <div
                key={step.id}
                className={`p-4 rounded-card border transition-all ${
                  step.done
                    ? 'border-line/60 bg-paper-2/30 opacity-70'
                    : 'border-line bg-surface hover:border-ink/40 shadow-card'
                } flex flex-col sm:flex-row sm:items-center justify-between gap-4`}
              >
                <div className="flex items-start gap-4 flex-1">
                  {/* Clean checkbox with rounded corners */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleMutation.mutate({
                        stepId: step.id,
                        done: !step.done,
                        stepIndex: idx,
                      });
                    }}
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-all cursor-pointer ${
                      step.done
                        ? 'border-lagoon bg-lagoon text-white shadow-sm'
                        : 'border-line bg-surface hover:border-ink text-transparent'
                    }`}
                    aria-label={`Mark step ${idx + 1} as ${step.done ? 'incomplete' : 'complete'}`}
                  >
                    <Check className={`h-4 w-4 stroke-[3] transition-opacity ${step.done ? 'opacity-100' : 'opacity-0'}`} />
                  </button>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono-numbers text-muted uppercase">
                        Step {idx + 1}
                      </span>
                      <span className="h-1 w-1 rounded-full bg-line" />
                      <span className="text-xs font-medium text-ink">
                        {step.conceptName}
                      </span>
                    </div>

                    <h4
                      className={`font-semibold text-sm ${
                        step.done ? 'line-through text-muted' : 'text-ink'
                      }`}
                    >
                      {step.resourceTitle}
                    </h4>

                    <p className="mt-1 text-xs text-muted leading-relaxed">
                      {step.reason}
                    </p>
                  </div>
                </div>

                {/* Resource Metadata (No redirecting external links) */}
                <div className="flex items-center gap-4 self-end sm:self-center shrink-0">
                  {step.resourceType === 'video' && (
                    <span
                      className={`text-[10px] font-mono-numbers px-2 py-0.5 rounded-full font-medium ${
                        step.minutes > 15
                          ? 'bg-amber/15 text-amber'
                          : 'bg-lagoon/15 text-lagoon'
                      }`}
                    >
                      {step.minutes > 15 ? 'Detailed Walkthrough' : 'Quick Summary'}
                    </span>
                  )}

                  <div className="flex items-center gap-1.5 text-xs font-mono-numbers text-muted">
                    {getTypeIcon(step.resourceType)}
                    <span className="capitalize">{step.resourceType}</span>
                  </div>

                  <div className="flex items-center gap-1 text-xs font-mono-numbers text-muted">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{step.minutes}m</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </QueryBoundary>
    </DashboardShell>
  );
};

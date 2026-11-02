import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ExternalLink, BookOpen, Sparkles } from 'lucide-react';
import { api } from '@/api/client';
import { GRAPH, RESOURCES } from '@/api/mocks/mockDb';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { QueryBoundary } from '@/components/common/QueryBoundary';
import { RiskBadge } from '@/components/common/RiskBadge';
import { ReasonList } from '@/components/common/ReasonList';
import { RootGapChain } from '@/components/common/RootGapChain';

export const StudentConceptDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const conceptId = Number(id);
  const concept = GRAPH.nodes.find((n) => n.id === conceptId);

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

  const twin = twinQuery.data;
  const mastery = twin?.masteryAll[conceptId] ?? 0.65;
  const riskItem = risksQuery.data?.risks.find((r) => r.conceptId === conceptId);
  const rootGap = rootGapsQuery.data?.find((r) => r.conceptId === conceptId);
  const resources = RESOURCES.filter((r) => r.concept_id === conceptId);

  if (!concept) {
    return (
      <DashboardShell title="Concept Not Found">
        <div className="card-standard p-8 text-center">
          <h3 className="font-display text-2xl text-ink">Unknown Concept ID</h3>
          <p className="mt-2 text-sm text-muted">The requested concept could not be found in the knowledge graph.</p>
          <Link to="/student/mastery" className="mt-4 btn-primary inline-flex">
            Return to Mastery
          </Link>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title={`Concept: ${concept.name}`}>
      <QueryBoundary
        isLoading={twinQuery.isLoading || risksQuery.isLoading}
        isError={twinQuery.isError || risksQuery.isError}
        skeletonType="card"
        onRetry={() => {
          twinQuery.refetch();
          risksQuery.refetch();
        }}
      >
        <div className="space-y-8">
          {/* Back breadcrumb */}
          <div>
            <Link
              to="/student/mastery"
              className="inline-flex items-center gap-1.5 text-xs font-mono-numbers text-muted hover:text-ink transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Mastery Matrix
            </Link>
          </div>

          {/* Header Title block */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 rule-line">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono-numbers text-muted uppercase">
                <span>{concept.code}</span>
                <span>·</span>
                <span>Level {concept.level}</span>
                <span>·</span>
                <span>Difficulty {concept.difficulty}/5</span>
              </div>
              <h2 className="font-display text-3xl sm:text-4xl text-ink mt-1">
                {concept.name}
              </h2>
              <p className="mt-2 text-sm text-muted max-w-[68ch]">
                {concept.description}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="text-[11px] font-mono-numbers uppercase text-muted block">
                  Current Mastery
                </span>
                <span className="font-display text-3xl text-ink">
                  {Math.round(mastery * 100)}%
                </span>
              </div>
              {riskItem && <RiskBadge band={riskItem.band} score={riskItem.risk} showScore />}
            </div>
          </div>

          {/* Explainability Section */}
          {riskItem && (
            <div className="p-6 rounded-card border border-line bg-surface">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-amber" />
                <h3 className="font-display text-xl text-ink">
                  Diagnostic Reasoning Breakdown
                </h3>
              </div>
              <ReasonList reasons={riskItem.reasons} />
            </div>
          )}

          {/* Prerequisite Root Gap Chain if applicable */}
          {rootGap && (
            <div className="pt-2">
              <RootGapChain
                rootGapName={rootGap.rootGapName}
                blockedConceptName={concept.name}
                chainDetails={rootGap.chainDetails}
              />
            </div>
          )}

          {/* Recommended Resources */}
          <div className="pt-6 rule-line">
            <h3 className="font-display text-2xl text-ink mb-4">
              Curated Remediation Material
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {resources.map((res) => (
                <div
                  key={res.id}
                  className="p-4 rounded-card border border-line bg-surface flex items-center justify-between gap-4 hover:border-ink transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-paper-2 flex items-center justify-center text-muted">
                      <BookOpen className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-ink">{res.title}</h4>
                      <div className="text-xs font-mono-numbers text-muted mt-0.5 capitalize">
                        {res.type} · ~{res.est_minutes} mins
                      </div>
                    </div>
                  </div>
                  <a
                    href={res.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-full text-muted hover:text-ink hover:bg-paper-2 transition-colors"
                    aria-label={`Open external resource: ${res.title}`}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      </QueryBoundary>
    </DashboardShell>
  );
};

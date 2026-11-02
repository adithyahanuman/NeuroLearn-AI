import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/client';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { QueryBoundary } from '@/components/common/QueryBoundary';
import { MasteryHeatmap } from '@/components/common/MasteryHeatmap';
import { GRAPH } from '@/api/mocks/mockDb';

export const StudentMastery: React.FC = () => {
  const navigate = useNavigate();

  const twinQuery = useQuery({
    queryKey: ['student-twin'],
    queryFn: () => api.getStudentTwin(),
  });

  const masteryMap = twinQuery.data?.masteryAll || {};

  return (
    <DashboardShell title="Concept Mastery Matrix">
      <QueryBoundary
        isLoading={twinQuery.isLoading}
        isError={twinQuery.isError}
        skeletonType="card"
        onRetry={() => twinQuery.refetch()}
      >
        <div className="space-y-8">
          <div>
            <span className="text-xs uppercase font-mono-numbers tracking-wider text-muted">
              Diagnostic Knowledge Map
            </span>
            <h2 className="font-display text-3xl text-ink mt-1">
              All 38 Curricular Concepts
            </h2>
            <p className="mt-2 text-sm text-muted max-w-[68ch] leading-relaxed">
              Mastery scores range from 0 to 100% and are continuously computed by your Digital Learning Twin from practice time, hint decay, score history, and prerequisite health.
            </p>
          </div>

          <div className="pt-4 rule-line">
            <MasteryHeatmap
              masteryMap={masteryMap}
              onConceptClick={(conceptId) => navigate(`/student/concept/${conceptId}`)}
            />
          </div>
        </div>
      </QueryBoundary>
    </DashboardShell>
  );
};

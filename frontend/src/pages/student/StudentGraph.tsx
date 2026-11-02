import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Network, Orbit, ListFilter } from 'lucide-react';
import { api } from '@/api/client';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { QueryBoundary } from '@/components/common/QueryBoundary';
import { ConstellationGraph } from '@/components/3d/ConstellationGraph';
import { FlatGraph } from '@/components/graph/FlatGraph';
import { GRAPH } from '@/api/mocks/mockDb';

export const StudentGraph: React.FC = () => {
  const navigate = useNavigate();
  const [graphMode, setGraphMode] = useState<'3d' | 'flat' | 'list'>('3d');

  const twinQuery = useQuery({
    queryKey: ['student-twin'],
    queryFn: () => api.getStudentTwin(),
  });

  const masteryMap = twinQuery.data?.masteryAll || {};

  return (
    <DashboardShell title="Knowledge Graph Constellation">
      <QueryBoundary
        isLoading={twinQuery.isLoading}
        isError={twinQuery.isError}
        skeletonType="card"
        onRetry={() => twinQuery.refetch()}
      >
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs uppercase font-mono-numbers tracking-wider text-muted">
                Multi-Dimensional Graph Topology
              </span>
              <h2 className="font-display text-3xl text-ink mt-1">
                38-Node Prerequisite Constellation
              </h2>
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center gap-1 rounded-full border border-line bg-paper-2 p-1 text-xs">
              <button
                type="button"
                onClick={() => setGraphMode('3d')}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 font-medium transition-colors ${
                  graphMode === '3d'
                    ? 'bg-ink text-paper shadow-sm'
                    : 'text-muted hover:text-ink'
                }`}
              >
                <Orbit className="h-3.5 w-3.5" /> 3D Constellation
              </button>
              <button
                type="button"
                onClick={() => setGraphMode('flat')}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 font-medium transition-colors ${
                  graphMode === 'flat'
                    ? 'bg-ink text-paper shadow-sm'
                    : 'text-muted hover:text-ink'
                }`}
              >
                <Network className="h-3.5 w-3.5" /> Flat Dagre
              </button>
              <button
                type="button"
                onClick={() => setGraphMode('list')}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 font-medium transition-colors ${
                  graphMode === 'list'
                    ? 'bg-ink text-paper shadow-sm'
                    : 'text-muted hover:text-ink'
                }`}
              >
                <ListFilter className="h-3.5 w-3.5" /> Hierarchy List
              </button>
            </div>
          </div>

          <div className="pt-2">
            {graphMode === '3d' && (
              <ConstellationGraph
                height="620px"
                masteryMap={masteryMap}
                onNodeClick={(cid) => navigate(`/student/concept/${cid}`)}
              />
            )}

            {graphMode === 'flat' && (
              <FlatGraph
                height="620px"
                masteryMap={masteryMap}
                onNodeClick={(cid) => navigate(`/student/concept/${cid}`)}
              />
            )}

            {graphMode === 'list' && (
              <div className="rounded-card border border-line bg-surface p-6 overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {GRAPH.nodes.map((node) => {
                    const mastery = masteryMap[node.id] ?? 0.65;
                    const pct = Math.round(mastery * 100);
                    return (
                      <div
                        key={node.id}
                        onClick={() => navigate(`/student/concept/${node.id}`)}
                        className="p-3.5 rounded-lg border border-line hover:border-ink cursor-pointer bg-paper-2/30 transition-all flex items-center justify-between"
                      >
                        <div>
                          <div className="text-[11px] font-mono-numbers text-muted">
                            {node.code} · Level {node.level}
                          </div>
                          <div className="font-medium text-sm text-ink line-clamp-1">
                            {node.name}
                          </div>
                        </div>
                        <div className="font-mono-numbers text-xs font-semibold">
                          {pct}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </QueryBoundary>
    </DashboardShell>
  );
};

import React, { useState } from 'react';
import { Video, ExternalLink, Search, Sparkles, BookOpen, CheckCircle2, AlertCircle } from 'lucide-react';
import { GRAPH } from '@/api/mocks/mockDb';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { getSubjectCurriculum } from '@/lib/videoRecommender';

export const FacultyResources: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<number | 'all'>('all');

  const filteredConcepts = GRAPH.nodes.filter((node) => {
    const matchesQuery =
      node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      node.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      node.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLevel = selectedLevel === 'all' || node.level === selectedLevel;
    return matchesQuery && matchesLevel;
  });

  return (
    <DashboardShell title="Curriculum Video Prescriptions & Resources">
      <div className="space-y-8">
        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 rule-line">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono-numbers bg-lagoon/10 text-lagoon border border-lagoon/20 mb-2">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Adaptive YouTube Educational Catalog</span>
            </div>
            <h2 className="font-display text-3xl text-ink">
              Subject Videos & Remediation Library
            </h2>
            <p className="text-xs text-muted mt-1 max-w-[75ch] leading-relaxed">
              Explore the complete library of YouTube educational material across all 38 concepts. The cognitive model dynamically assigns these videos based on student assessment performance: <strong>1 summary recap</strong> for high scores (&ge;70%) and <strong>2–3 detailed masterclasses</strong> for low scores (&lt;70%).
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono-numbers text-muted bg-paper-2 px-4 py-2 rounded-full border border-line shrink-0">
            <Video className="h-4 w-4 text-lagoon" />
            <span>38 Subjects · 150+ Video Curricula</span>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:max-w-md">
            <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Search concepts (e.g. Arrays, Recursion, Trees, DP)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-standard pl-10 text-xs font-sans w-full"
            />
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <span className="text-xs font-mono-numbers text-muted">Level:</span>
            {['all', 1, 2, 3, 4, 5].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setSelectedLevel(lvl as any)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono-numbers transition-colors ${
                  selectedLevel === lvl
                    ? 'bg-ink text-paper font-semibold'
                    : 'bg-paper-2 text-muted hover:text-ink border border-line'
                }`}
              >
                {lvl === 'all' ? 'All' : `L${lvl}`}
              </button>
            ))}
          </div>
        </div>

        {/* Concept Video Cards Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {filteredConcepts.map((node) => {
            const curriculum = getSubjectCurriculum(node.id, node.name);

            return (
              <div
                key={node.id}
                className="card-standard p-6 flex flex-col justify-between space-y-5 hover:border-ink/40 transition-colors"
              >
                {/* Concept Header */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono-numbers px-2 py-0.5 rounded bg-paper-2 text-muted uppercase font-medium border border-line">
                        {node.code}
                      </span>
                      <span className="text-xs font-mono-numbers text-muted">
                        Level {node.level} • Difficulty {node.difficulty}/5
                      </span>
                    </div>
                    <span className="text-[11px] font-mono-numbers text-lagoon font-medium bg-lagoon/10 px-2 py-0.5 rounded-full">
                      Concept #{node.id}
                    </span>
                  </div>

                  <h3 className="font-display text-xl text-ink">
                    {node.name}
                  </h3>
                  <p className="text-xs text-muted mt-1 leading-relaxed">
                    {node.description}
                  </p>
                </div>

                {/* Video Prescriptions Breakdown */}
                <div className="space-y-4 pt-4 border-t border-line/60">
                  {/* Detailed Low-Score Prescription (2-3 Videos) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono-numbers">
                      <span className="inline-flex items-center gap-1 font-semibold text-amber">
                        <AlertCircle className="h-3.5 w-3.5" />
                        <span>Low Score (&lt;70%): {curriculum.detailed.length} Detailed Masterclasses</span>
                      </span>
                      <span className="text-[10px] text-muted">Remediation Stack</span>
                    </div>

                    <div className="space-y-1.5">
                      {curriculum.detailed.map((vid, vIdx) => (
                        <div
                          key={vIdx}
                          className="p-2.5 rounded-lg border border-amber/20 bg-amber-subtle/30 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-mono-numbers font-semibold text-ink">
                                [{vid.badge}]
                              </span>
                              <span className="text-[10px] font-mono-numbers text-muted">
                                • {vid.channel}
                              </span>
                            </div>
                            <span className="font-medium text-ink block truncate mt-0.5">
                              {vid.title}
                            </span>
                          </div>

                          <a
                            href={vid.url}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1 rounded bg-surface border border-line hover:border-amber text-ink hover:text-amber text-xs font-medium flex items-center gap-1.5 shrink-0 transition-colors"
                            aria-label={`Open YouTube video for ${vid.title}`}
                          >
                            <Video className="h-3.5 w-3.5 text-amber" />
                            <span>Watch</span>
                            <ExternalLink className="h-3 w-3 opacity-70" />
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* High-Score Quick Summary Video (1 Video) */}
                  <div className="space-y-2 pt-2 border-t border-line/40">
                    <div className="flex items-center justify-between text-xs font-mono-numbers">
                      <span className="inline-flex items-center gap-1 font-semibold text-lagoon">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>High Score (&ge;70%): 1 Concise Summary Video</span>
                      </span>
                      <span className="text-[10px] text-muted">5m Invariant Recap</span>
                    </div>

                    <div className="p-2.5 rounded-lg border border-lagoon/20 bg-lagoon-subtle/30 flex items-center justify-between gap-3 text-xs">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono-numbers font-semibold text-ink">
                            [{curriculum.summary.badge}]
                          </span>
                          <span className="text-[10px] font-mono-numbers text-muted">
                            • {curriculum.summary.channel}
                          </span>
                        </div>
                        <span className="font-medium text-ink block truncate mt-0.5">
                          {curriculum.summary.title}
                        </span>
                      </div>

                      <a
                        href={curriculum.summary.url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded bg-surface border border-line hover:border-lagoon text-ink hover:text-lagoon text-xs font-medium flex items-center gap-1.5 shrink-0 transition-colors"
                        aria-label={`Open YouTube video for ${curriculum.summary.title}`}
                      >
                        <Video className="h-3.5 w-3.5 text-lagoon" />
                        <span>Watch</span>
                        <ExternalLink className="h-3 w-3 opacity-70" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardShell>
  );
};


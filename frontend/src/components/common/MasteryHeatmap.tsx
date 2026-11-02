import React, { useState } from 'react';
import { GRAPH } from '@/api/mocks/mockDb';
import { Concept } from '@/api/types';

interface MasteryHeatmapProps {
  masteryMap: Record<number, number>;
  onConceptClick?: (conceptId: number) => void;
  selectedConceptId?: number;
}

export const MasteryHeatmap: React.FC<MasteryHeatmapProps> = ({
  masteryMap,
  onConceptClick,
  selectedConceptId,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [filterBand, setFilterBand] = useState<'all' | 'strong' | 'developing' | 'weak'>('all');
  const [hoveredConcept, setHoveredConcept] = useState<{
    concept: Concept;
    mastery: number;
    band: string;
  } | null>(null);

  // Group concepts by level (1 to 6)
  const levels = [1, 2, 3, 4, 5, 6];

  const getBand = (score: number) => {
    if (score < 0.4) return 'weak';
    if (score < 0.7) return 'developing';
    return 'strong';
  };

  const getBandStyles = (score: number) => {
    const band = getBand(score);
    if (band === 'weak') {
      return {
        bg: 'bg-terracotta/20 hover:bg-terracotta/30',
        border: 'border-terracotta/40',
        text: 'text-terracotta',
        dot: 'bg-terracotta',
      };
    }
    if (band === 'developing') {
      return {
        bg: 'bg-amber/20 hover:bg-amber/30',
        border: 'border-amber/40',
        text: 'text-amber',
        dot: 'bg-amber',
      };
    }
    return {
      bg: 'bg-lagoon/20 hover:bg-lagoon/30',
      border: 'border-lagoon/40',
      text: 'text-lagoon',
      dot: 'bg-lagoon',
    };
  };

  return (
    <div className="w-full">
      {/* Controls & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 rule-line mb-6">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-muted font-mono-numbers">
            Filter:
          </span>
          <div className="flex items-center gap-1 rounded-full border border-line bg-paper-2/50 p-1 text-xs">
            {(['all', 'strong', 'developing', 'weak'] as const).map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setFilterBand(b)}
                className={`rounded-full px-3 py-1 font-medium capitalize transition-colors ${
                  filterBand === b
                    ? 'bg-ink text-paper shadow-sm'
                    : 'text-muted hover:text-ink'
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        </div>

        {/* View Toggle (Grid / Table alternative) */}
        <div className="flex items-center gap-1 rounded-full border border-line bg-paper-2/50 p-1 text-xs">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`rounded-full px-3 py-1 font-medium transition-colors ${
              viewMode === 'grid' ? 'bg-ink text-paper' : 'text-muted hover:text-ink'
            }`}
          >
            Heatmap Grid
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`rounded-full px-3 py-1 font-medium transition-colors ${
              viewMode === 'table' ? 'bg-ink text-paper' : 'text-muted hover:text-ink'
            }`}
          >
            Accessible Table
          </button>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="space-y-4">
          {levels.map((lvl) => {
            const concepts = GRAPH.nodes.filter((n) => n.level === lvl);
            const filtered = concepts.filter((n) => {
              if (filterBand === 'all') return true;
              const mastery = masteryMap[n.id] ?? 0.65;
              return getBand(mastery) === filterBand;
            });

            if (filtered.length === 0) return null;

            return (
              <div key={lvl} className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="w-20 shrink-0 text-xs font-mono-numbers uppercase tracking-wider text-muted">
                  Level {lvl}
                </div>
                <div className="flex flex-wrap gap-2.5 flex-1">
                  {filtered.map((node) => {
                    const mastery = masteryMap[node.id] ?? 0.65;
                    const styles = getBandStyles(mastery);
                    const isSelected = selectedConceptId === node.id;

                    return (
                      <button
                        key={node.id}
                        type="button"
                        onClick={() => onConceptClick && onConceptClick(node.id)}
                        onMouseEnter={() =>
                          setHoveredConcept({
                            concept: node,
                            mastery,
                            band: getBand(mastery),
                          })
                        }
                        onMouseLeave={() => setHoveredConcept(null)}
                        className={`group relative flex h-14 w-14 sm:h-16 sm:w-16 flex-col items-center justify-center rounded-xl border transition-all ${
                          styles.bg
                        } ${styles.border} ${
                          isSelected ? 'ring-2 ring-ink ring-offset-2' : ''
                        }`}
                        aria-label={`${node.name}, Mastery: ${Math.round(mastery * 100)}%`}
                      >
                        <span className="text-[10px] font-mono-numbers text-muted font-medium">
                          {node.code}
                        </span>
                        <span
                          className={`text-sm sm:text-base font-semibold font-mono-numbers ${styles.text}`}
                        >
                          {Math.round(mastery * 100)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Hover Details Panel */}
          <div className="mt-6 min-h-[50px] rounded-card border border-line bg-surface p-3.5 flex items-center justify-between text-sm">
            {hoveredConcept ? (
              <div className="flex items-center justify-between w-full">
                <div>
                  <span className="text-xs uppercase font-mono-numbers text-muted mr-2">
                    {hoveredConcept.concept.code}
                  </span>
                  <strong className="text-ink font-medium">
                    {hoveredConcept.concept.name}
                  </strong>
                  <span className="text-muted text-xs ml-3">
                    (Level {hoveredConcept.concept.level} · Difficulty {hoveredConcept.concept.difficulty}/5)
                  </span>
                </div>
                <div className="flex items-center gap-3 font-mono-numbers text-xs">
                  <span className="capitalize text-muted">{hoveredConcept.band}</span>
                  <span className="font-semibold text-sm">
                    {Math.round(hoveredConcept.mastery * 100)}%
                  </span>
                </div>
              </div>
            ) : (
              <span className="text-xs text-muted">
                Hover over any concept node to inspect title, curriculum level, and mastery score. Click to view detailed analytics.
              </span>
            )}
          </div>
        </div>
      )}

      {/* Accessible Table View */}
      {viewMode === 'table' && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm" aria-label="Curriculum Concept Mastery Table">
            <thead>
              <tr className="rule-line text-xs uppercase font-mono-numbers text-muted">
                <th className="py-2.5 px-3">Code</th>
                <th className="py-2.5 px-3">Concept Name</th>
                <th className="py-2.5 px-3">Level</th>
                <th className="py-2.5 px-3">Difficulty</th>
                <th className="py-2.5 px-3 text-right">Mastery Score</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {GRAPH.nodes
                .filter((n) => {
                  if (filterBand === 'all') return true;
                  const m = masteryMap[n.id] ?? 0.65;
                  return getBand(m) === filterBand;
                })
                .map((node) => {
                  const mastery = masteryMap[node.id] ?? 0.65;
                  const band = getBand(mastery);
                  return (
                    <tr
                      key={node.id}
                      className="hover:bg-paper-2/40 cursor-pointer transition-colors"
                      onClick={() => onConceptClick && onConceptClick(node.id)}
                    >
                      <td className="py-2.5 px-3 font-mono-numbers font-medium text-xs text-muted">
                        {node.code}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-ink">{node.name}</td>
                      <td className="py-2.5 px-3 font-mono-numbers text-xs">Level {node.level}</td>
                      <td className="py-2.5 px-3 font-mono-numbers text-xs">{node.difficulty}/5</td>
                      <td className="py-2.5 px-3 font-mono-numbers text-right font-semibold">
                        {Math.round(mastery * 100)}%
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                            band === 'strong'
                              ? 'bg-lagoon/10 text-lagoon'
                              : band === 'developing'
                              ? 'bg-amber/10 text-amber'
                              : 'bg-terracotta/10 text-terracotta'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              band === 'strong'
                                ? 'bg-lagoon'
                                : band === 'developing'
                                ? 'bg-amber'
                                : 'bg-terracotta'
                            }`}
                          />
                          {band}
                        </span>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend */}
      <div className="mt-6 flex flex-wrap items-center gap-6 text-xs font-mono-numbers text-muted pt-4 rule-line">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded bg-lagoon/30 border border-lagoon/50" />
          <span>Strong Mastery (≥70%)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded bg-amber/30 border border-amber/50" />
          <span>Developing (40% - 69%)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded bg-terracotta/30 border border-terracotta/50" />
          <span>Weak (&lt;40%)</span>
        </div>
      </div>
    </div>
  );
};

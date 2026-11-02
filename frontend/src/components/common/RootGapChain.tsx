import React from 'react';
import { ArrowRight } from 'lucide-react';

interface ChainNode {
  id: number;
  name: string;
  mastery: number;
}

interface RootGapChainProps {
  rootGapName: string;
  blockedConceptName: string;
  chainDetails: ChainNode[];
  className?: string;
}

export const RootGapChain: React.FC<RootGapChainProps> = ({
  rootGapName,
  blockedConceptName,
  chainDetails,
  className = '',
}) => {
  if (!chainDetails || chainDetails.length === 0) {
    return (
      <div className={`p-4 rounded-card border border-line bg-surface ${className}`}>
        <p className="text-sm text-muted">No prerequisite bottleneck detected.</p>
      </div>
    );
  }

  // Find the weakest node in chain
  const weakestMastery = Math.min(...chainDetails.map((n) => n.mastery));

  return (
    <div className={`p-5 rounded-card border border-line bg-surface ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 rule-line mb-4">
        <div>
          <span className="text-xs uppercase tracking-wider text-muted font-mono-numbers">
            Prerequisite Root Gap Analysis
          </span>
          <h4 className="font-display text-lg text-ink">
            {blockedConceptName} <span className="text-muted font-normal text-sm">is blocked by</span> {rootGapName}
          </h4>
        </div>
        <span className="rounded-full bg-terracotta/10 px-3 py-1 text-xs font-medium text-terracotta border border-terracotta/20">
          Root Cause: {rootGapName}
        </span>
      </div>

      {/* Visual Chain Representation */}
      <div className="relative flex flex-wrap items-center gap-3 py-2 overflow-x-auto">
        {chainDetails.map((node, index) => {
          const isWeakest = node.mastery === weakestMastery;
          const isLast = index === chainDetails.length - 1;
          const pct = Math.round(node.mastery * 100);

          let bandColor = 'border-lagoon text-lagoon bg-lagoon/5';
          if (node.mastery < 0.4) {
            bandColor = 'border-terracotta text-terracotta bg-terracotta/5';
          } else if (node.mastery < 0.7) {
            bandColor = 'border-amber text-amber bg-amber/5';
          }

          return (
            <React.Fragment key={node.id}>
              <div
                className={`relative flex flex-col p-3 rounded-card border ${
                  isWeakest
                    ? 'ring-2 ring-terracotta/50 border-terracotta bg-terracotta/10 shadow-card'
                    : 'border-line bg-paper-2/40'
                } min-w-[160px]`}
              >
                {isWeakest && (
                  <span className="absolute -top-2.5 left-3 rounded bg-terracotta px-1.5 py-0.5 text-[10px] font-mono-numbers font-medium text-white uppercase">
                    Root Gap
                  </span>
                )}
                <span className="text-[11px] text-muted font-mono-numbers uppercase">
                  Step {index + 1}
                </span>
                <span className="font-medium text-ink text-sm line-clamp-1 mt-0.5" title={node.name}>
                  {node.name}
                </span>
                <div className="mt-2 flex items-center justify-between text-xs font-mono-numbers">
                  <span className="text-muted">Mastery:</span>
                  <span className={`font-semibold px-1.5 py-0.5 rounded border ${bandColor}`}>
                    {pct}%
                  </span>
                </div>
              </div>

              {!isLast && (
                <div className="flex items-center text-muted px-1">
                  <ArrowRight className="h-4 w-4 shrink-0 text-line stroke-[2.5]" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-muted max-w-[68ch] leading-relaxed">
        <strong className="font-medium text-ink">Remediation Insight:</strong> Instead of repeatedly attempting exercises on {blockedConceptName}, review and practice {rootGapName} first to eliminate the fundamental prerequisite barrier.
      </p>
    </div>
  );
};

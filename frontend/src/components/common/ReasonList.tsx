import React from 'react';

interface ReasonListProps {
  reasons: string[];
  className?: string;
}

export function cleanReasonText(text: string): string {
  if (!text) return '';
  return text
    .replace(/[{}\[\]"]/g, '') // remove curly braces, brackets, quotes
    .replace(/_/g, ' ') // replace underscores with spaces
    .replace(/\s+/g, ' ') // collapse multi-spaces
    .trim();
}

export const ReasonList: React.FC<ReasonListProps> = ({ reasons, className = '' }) => {
  if (!reasons || reasons.length === 0) {
    return (
      <p className="text-sm text-muted italic">
        No specific risk factors flagged. Practice regularly to maintain performance.
      </p>
    );
  }

  return (
    <ol className={`space-y-2.5 text-sm text-ink ${className}`}>
      {reasons.map((rawReason, idx) => {
        const cleaned = cleanReasonText(rawReason);
        return (
          <li key={idx} className="flex items-start gap-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-paper-2 text-[11px] font-mono-numbers font-medium text-muted">
              {idx + 1}
            </span>
            <span className="leading-relaxed">{cleaned}</span>
          </li>
        );
      })}
    </ol>
  );
};

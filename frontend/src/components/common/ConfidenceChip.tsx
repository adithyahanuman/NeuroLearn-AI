import React from 'react';
import { ConfidenceLevel } from '@/api/types';

interface ConfidenceChipProps {
  confidence?: ConfidenceLevel;
  attemptsCount?: number;
}

export const ConfidenceChip: React.FC<ConfidenceChipProps> = ({
  confidence = 'high',
  attemptsCount,
}) => {
  if (confidence === 'high' && (!attemptsCount || attemptsCount >= 3)) {
    return null; // Only show prominently for low/medium confidence or <3 attempts as required
  }

  const isLow = confidence === 'low' || (attemptsCount !== undefined && attemptsCount < 3);

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-mono-numbers border ${
        isLow
          ? 'bg-amber/10 border-amber/30 text-amber'
          : 'bg-muted/10 border-muted/20 text-muted'
      }`}
      title={
        isLow
          ? 'Prediction based on fewer than 3 attempts; confidence will refine with more practice'
          : 'Moderate confidence prediction'
      }
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      <span>
        {isLow ? 'Low confidence' : 'Moderate confidence'}
        {attemptsCount !== undefined ? ` · ${attemptsCount} attempt${attemptsCount === 1 ? '' : 's'}` : ''}
      </span>
    </span>
  );
};

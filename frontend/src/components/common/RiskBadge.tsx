import React from 'react';
import { RiskBand, MasteryBand } from '@/api/types';

interface RiskBadgeProps {
  band: RiskBand | MasteryBand;
  score?: number;
  showScore?: boolean;
  size?: 'sm' | 'md';
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({
  band,
  score,
  showScore = false,
  size = 'md',
}) => {
  let label: string = band;
  let bgClass = 'bg-lagoon/10 text-lagoon border-lagoon/30';
  let dotClass = 'bg-lagoon';

  if (band === 'high' || band === 'weak') {
    label = band === 'high' ? 'High Risk' : 'Weak';
    bgClass = 'bg-terracotta/10 text-terracotta border-terracotta/30';
    dotClass = 'bg-terracotta';
  } else if (band === 'medium' || band === 'developing') {
    label = band === 'medium' ? 'Medium Risk' : 'Developing';
    bgClass = 'bg-amber/10 text-amber border-amber/30';
    dotClass = 'bg-amber';
  } else if (band === 'low' || band === 'strong') {
    label = band === 'low' ? 'Low Risk' : 'Strong';
    bgClass = 'bg-lagoon/10 text-lagoon border-lagoon/30';
    dotClass = 'bg-lagoon';
  }

  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${padding} ${bgClass}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
      <span>{label}</span>
      {showScore && score !== undefined && (
        <span className="font-mono-numbers opacity-80">
          ({Math.round(score * 100)}%)
        </span>
      )}
    </span>
  );
};

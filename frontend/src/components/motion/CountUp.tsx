import React, { useEffect, useState, useRef } from 'react';
import { prefersReducedMotion } from '@/lib/motion';

interface CountUpProps {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  duration?: number; // seconds
  className?: string;
}

export const CountUp: React.FC<CountUpProps> = ({
  value,
  decimals = 0,
  prefix = '',
  suffix = '',
  duration = 1.0,
  className = '',
}) => {
  const [displayValue, setDisplayValue] = useState<number>(0);
  const elementRef = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setDisplayValue(value);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const startTime = performance.now();
          const startVal = 0;
          const endVal = value;
          const totalMs = duration * 1000;

          const tick = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(1, elapsed / totalMs);
            // power3.out easing: 1 - Math.pow(1 - progress, 3)
            const ease = 1 - Math.pow(1 - progress, 3);
            const current = startVal + (endVal - startVal) * ease;
            setDisplayValue(current);

            if (progress < 1) {
              requestAnimationFrame(tick);
            } else {
              setDisplayValue(endVal);
            }
          };

          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.1 }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [value, duration]);

  const formatted = displayValue.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span ref={elementRef} className={`font-mono-numbers ${className}`}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
};

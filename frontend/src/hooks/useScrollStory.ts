import { useEffect, useRef, useState } from 'react';
import { gsap, ScrollTrigger, prefersReducedMotion } from '@/lib/motion';

interface UseScrollStoryOptions {
  totalSteps: number;
  pinDuration?: string;
}

export function useScrollStory({ totalSteps, pinDuration = '+=200%' }: UseScrollStoryOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if (prefersReducedMotion()) {
      return;
    }

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: el,
        start: 'top top',
        end: pinDuration,
        pin: true,
        scrub: 0.6,
        onUpdate: (self) => {
          const step = Math.min(
            totalSteps - 1,
            Math.floor(self.progress * totalSteps)
          );
          setActiveStep(step);
        },
      });
    }, el);

    return () => ctx.revert();
  }, [totalSteps, pinDuration]);

  return { containerRef, activeStep, setActiveStep };
}

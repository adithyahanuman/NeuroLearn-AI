import React, { useEffect, useRef } from 'react';
import { gsap, prefersReducedMotion } from '@/lib/motion';

interface RevealProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  yOffset?: number;
  className?: string;
  triggerOnScroll?: boolean;
}

export const Reveal: React.FC<RevealProps> = ({
  children,
  delay = 0,
  duration = 0.8,
  yOffset = 24,
  className = '',
  triggerOnScroll = true,
}) => {
  const elRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;

    if (prefersReducedMotion()) {
      el.style.opacity = '1';
      el.style.transform = 'none';
      return;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        {
          opacity: 0,
          y: yOffset,
        },
        {
          opacity: 1,
          y: 0,
          duration,
          delay,
          ease: 'power3.out',
          scrollTrigger: triggerOnScroll
            ? {
                trigger: el,
                start: 'top 88%',
                once: true,
              }
            : undefined,
        }
      );
    }, el);

    return () => ctx.revert();
  }, [delay, duration, yOffset, triggerOnScroll]);

  return (
    <div ref={elRef} className={className}>
      {children}
    </div>
  );
};

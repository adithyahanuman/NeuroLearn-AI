import React, { useEffect, useRef } from 'react';
import { gsap, prefersReducedMotion } from '@/lib/motion';

interface SplitHeadingProps {
  children: React.ReactNode;
  as?: 'h1' | 'h2' | 'h3' | 'h4';
  className?: string;
  delay?: number;
}

export const SplitHeading: React.FC<SplitHeadingProps> = ({
  children,
  as: Component = 'h1',
  className = '',
  delay = 0.1,
}) => {
  const containerRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if (prefersReducedMotion()) {
      el.style.opacity = '1';
      return;
    }

    const lines = el.querySelectorAll('.split-line-inner');

    const ctx = gsap.context(() => {
      gsap.fromTo(
        lines,
        {
          y: '105%',
          opacity: 0,
        },
        {
          y: '0%',
          opacity: 1,
          duration: 1.0,
          delay,
          stagger: 0.14,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 85%',
            once: true,
          },
        }
      );
    }, el);

    return () => ctx.revert();
  }, [delay]);

  return (
    <Component ref={containerRef} className={`font-display ${className}`}>
      {children}
    </Component>
  );
};

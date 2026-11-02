import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

export const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

let globalLenis: Lenis | null = null;

export const initSmoothScroll = (): Lenis | null => {
  if (typeof window === 'undefined' || prefersReducedMotion()) return null;

  if (!globalLenis) {
    globalLenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 1.5,
    });

    globalLenis.on('scroll', ScrollTrigger.update);

    gsap.ticker.add((time) => {
      globalLenis?.raf(time * 1000);
    });

    gsap.ticker.lagSmoothing(0);
  }

  return globalLenis;
};

export const destroySmoothScroll = () => {
  if (globalLenis) {
    globalLenis.destroy();
    globalLenis = null;
  }
};

export { gsap, ScrollTrigger };

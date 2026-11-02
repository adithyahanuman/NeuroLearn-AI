import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  color: string;
}

export const HeroAtmosphere: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    const colors = ['#E2674A', '#2A7B88', '#121212', '#C48B28'];
    const particleCount = Math.min(Math.floor(width / 32), 48);
    const particles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        radius: Math.random() * 2.2 + 1.2,
        alpha: Math.random() * 0.4 + 0.15,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    const mouse = { x: -9999, y: -9999, radius: 120 };

    const handlePointerMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };

    const handlePointerLeave = () => {
      mouse.x = -9999;
      mouse.y = -9999;
    };

    window.addEventListener('mousemove', handlePointerMove, { passive: true });
    window.addEventListener('mouseleave', handlePointerLeave, { passive: true });

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      height = canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
    };

    window.addEventListener('resize', handleResize, { passive: true });

    const maxDist = 110;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw subtle connecting graph filaments
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.hypot(dx, dy);

          if (dist < maxDist) {
            const opacity = (1 - dist / maxDist) * 0.18;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(18, 18, 18, ${opacity})`;
            ctx.lineWidth = 0.75;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Update & draw particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Mouse repelling interaction
        const mdx = p.x - mouse.x;
        const mdy = p.y - mouse.y;
        const mdist = Math.hypot(mdx, mdy);
        if (mdist < mouse.radius && mdist > 0) {
          const force = (mouse.radius - mdist) / mouse.radius;
          p.x += (mdx / mdist) * force * 2.2;
          p.y += (mdy / mdist) * force * 2.2;
        }

        p.x += p.vx;
        p.y += p.vy;

        // Wrap boundaries smoothly
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseleave', handlePointerLeave);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {/* Ambient Breathing Aurora Spheres */}
      <div className="absolute -top-[10%] left-[5%] h-[480px] w-[480px] rounded-full bg-[#E2674A]/12 blur-3xl filter animate-pulse" />
      <div className="absolute top-[20%] right-[10%] h-[520px] w-[520px] rounded-full bg-[#2A7B88]/12 blur-3xl filter animate-pulse delay-1000" />
      <div className="absolute -bottom-[15%] left-[30%] h-[420px] w-[420px] rounded-full bg-[#C48B28]/10 blur-3xl filter" />

      {/* Interactive Micro Constellation Graph Particles */}
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full opacity-80" />
    </div>
  );
};

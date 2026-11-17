import { useEffect, useRef } from 'react';

// Gold "network" dots with connecting lines, like the Manchester Tech website.
export default function NetworkBg({ density = 1, opacity = 0.55 }) {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current; const ctx = cv.getContext('2d');
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let w = 0; let h = 0; let pts = []; let raf = 0;
    const size = () => {
      const r = cv.parentElement.getBoundingClientRect(); const d = window.devicePixelRatio || 1;
      w = r.width; h = r.height; cv.width = w * d; cv.height = h * d; ctx.setTransform(d, 0, 0, d, 0, 0);
      const n = Math.min(140, Math.round((w * h) / 14000 * density));
      pts = Array.from({ length: n }, () => ({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25, r: Math.random() * 1.6 + 0.6 }));
    };
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        if (!reduce) { p.x += p.vx; p.y += p.vy; if (p.x < 0 || p.x > w) p.vx *= -1; if (p.y < 0 || p.y > h) p.vy *= -1; }
        for (let j = i + 1; j < pts.length; j++) {
          const q = pts[j]; const dx = p.x - q.x; const dy = p.y - q.y; const dd = dx * dx + dy * dy;
          if (dd < 15000) { ctx.strokeStyle = 'rgba(212,178,106,' + (0.18 * (1 - dd / 15000)) + ')'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke(); }
        }
        ctx.fillStyle = 'rgba(212,178,106,.55)'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
      }
      if (!reduce) raf = requestAnimationFrame(draw);
    };
    size(); draw();
    const onR = () => { size(); if (reduce) draw(); };
    window.addEventListener('resize', onR);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onR); };
  }, [density]);
  return <canvas ref={ref} aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity }} />;
}
import React, { useEffect, useRef } from 'react';
import { useOS } from '../../context/OSContext';
import { WindowsXPFlagSVG } from '../apps/aol/AOLGraphics';

export const Screensaver: React.FC = () => {
  const { screensaver, screensaverActive, setScreensaverActive } = useOS();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const flagPosRef = useRef({ x: 200, y: 180, vx: 2.4, vy: 1.9 });
  const flagElRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!screensaverActive) return;

    const dismiss = () => setScreensaverActive(false);
    const t = window.setTimeout(() => {
      window.addEventListener('mousemove', dismiss);
      window.addEventListener('mousedown', dismiss);
      window.addEventListener('keydown', dismiss);
    }, 350);

    return () => {
      clearTimeout(t);
      window.removeEventListener('mousemove', dismiss);
      window.removeEventListener('mousedown', dismiss);
      window.removeEventListener('keydown', dismiss);
    };
  }, [screensaverActive, setScreensaverActive]);

  useEffect(() => {
    if (!screensaverActive) return;

    if (screensaver === 'xpflag' || screensaver === 'none') {
      let raf = 0;
      const tick = () => {
        const p = flagPosRef.current;
        const maxX = window.innerWidth - 220;
        const maxY = window.innerHeight - 130;
        p.x += p.vx;
        p.y += p.vy;
        if (p.x <= 10 || p.x >= maxX) p.vx *= -1;
        if (p.y <= 10 || p.y >= maxY) p.vy *= -1;
        if (flagElRef.current) {
          flagElRef.current.style.transform = `translate(${p.x}px, ${p.y}px)`;
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let raf = 0;
    if (screensaver === 'starfield') {
      const stars = Array.from({ length: 240 }, () => ({
        x: (Math.random() - 0.5) * canvas.width * 2,
        y: (Math.random() - 0.5) * canvas.height * 2,
        z: Math.random() * canvas.width,
      }));
      const draw = () => {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        stars.forEach((s) => {
          s.z -= 7;
          if (s.z <= 1) {
            s.x = (Math.random() - 0.5) * canvas.width * 2;
            s.y = (Math.random() - 0.5) * canvas.height * 2;
            s.z = canvas.width;
          }
          const sx = (s.x / s.z) * 320 + cx;
          const sy = (s.y / s.z) * 320 + cy;
          const size = Math.max(0.8, (1 - s.z / canvas.width) * 3.8);
          ctx.fillStyle = '#fff';
          ctx.fillRect(sx, sy, size, size);
        });
        raf = requestAnimationFrame(draw);
      };
      raf = requestAnimationFrame(draw);
    } else if (screensaver === 'mystify') {
      const pts = Array.from({ length: 4 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 7,
        vy: (Math.random() - 0.5) * 7,
      }));
      let hue = 190;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const draw = () => {
        ctx.fillStyle = 'rgba(0,0,0,0.08)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        pts.forEach((p) => {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
          if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        });
        hue = (hue + 0.6) % 360;
        ctx.strokeStyle = `hsl(${hue}, 90%, 60%)`;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        pts.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
        ctx.closePath();
        ctx.stroke();
        raf = requestAnimationFrame(draw);
      };
      raf = requestAnimationFrame(draw);
    }

    return () => cancelAnimationFrame(raf);
  }, [screensaver, screensaverActive]);

  if (!screensaverActive) return null;

  return (
    <div
      onClick={() => setScreensaverActive(false)}
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000',
        zIndex: 95000,
        cursor: 'none',
      }}
    >
      {screensaver === 'xpflag' || screensaver === 'none' ? (
        <div
          ref={flagElRef}
          style={{
            position: 'absolute',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <WindowsXPFlagSVG size={72} />
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 24, marginTop: 4 }}>
            Windows<sup style={{ color: '#ff7324', fontSize: 12 }}>xp</sup>
          </div>
        </div>
      ) : (
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
      )}
    </div>
  );
};

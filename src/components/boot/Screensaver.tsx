import React, { useEffect, useRef } from 'react';
import { useOS } from '../../context/OSContext';
import { Maze3DCanvas } from '../apps/games/Maze3DApp';

export const Screensaver: React.FC = () => {
  const { screensaver, screensaverActive, setScreensaverActive } = useOS();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!screensaverActive) return;
    const dismiss = () => setScreensaverActive(false);
    const timer = window.setTimeout(() => {
      window.addEventListener('mousemove', dismiss, { once: true });
      window.addEventListener('mousedown', dismiss, { once: true });
      window.addEventListener('keydown', dismiss, { once: true });
      window.addEventListener('touchstart', dismiss, { once: true });
    }, 350);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousemove', dismiss);
      window.removeEventListener('mousedown', dismiss);
      window.removeEventListener('keydown', dismiss);
      window.removeEventListener('touchstart', dismiss);
    };
  }, [screensaverActive, setScreensaverActive]);

  useEffect(() => {
    if (!screensaverActive || screensaver === 'none' || screensaver === 'maze3d') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    let rafId = 0;

    if (screensaver === 'pipes3d') {
      // Classic Windows 95/98/XP 3D Metallic Pipes Screensaver!
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const colors = ['#ef4444', '#22c55e', '#3b82f6', '#eab308', '#a855f7', '#06b6d4', '#f97316'];
      let x = canvas.width / 2;
      let y = canvas.height / 2;
      let dir = 0;
      let color = colors[0];
      let segments = 0;

      const drawPipes = () => {
        segments++;
        if (segments > 420) {
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          segments = 0;
        }
        const step = 28;
        const dirs = [
          [step, 0],
          [0, step],
          [-step, 0],
          [0, -step],
        ];
        if (Math.random() < 0.35) {
          const nextDir = (dir + (Math.random() < 0.5 ? 1 : 3)) % 4;
          // Draw metallic ball joint
          const g = ctx.createRadialGradient(x - 4, y - 4, 2, x, y, 13);
          g.addColorStop(0, '#ffffff');
          g.addColorStop(0.35, color);
          g.addColorStop(1, '#0f172a');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(x, y, 12, 0, Math.PI * 2);
          ctx.fill();
          dir = nextDir;
        }
        const [dx, dy] = dirs[dir];
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 30 || nx > canvas.width - 30 || ny < 30 || ny > canvas.height - 30) {
          x = 80 + Math.random() * (canvas.width - 160);
          y = 80 + Math.random() * (canvas.height - 160);
          color = colors[Math.floor(Math.random() * colors.length)];
        } else {
          // Shaded 3D cylinder pipe segment
          ctx.lineCap = 'round';
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 18;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(nx, ny);
          ctx.stroke();

          ctx.strokeStyle = color;
          ctx.lineWidth = 14;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(nx, ny);
          ctx.stroke();

          ctx.strokeStyle = 'rgba(255,255,255,0.55)';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(x - (dy !== 0 ? 3 : 0), y - (dx !== 0 ? 3 : 0));
          ctx.lineTo(nx - (dy !== 0 ? 3 : 0), ny - (dx !== 0 ? 3 : 0));
          ctx.stroke();

          x = nx;
          y = ny;
        }
        rafId = requestAnimationFrame(drawPipes);
      };
      drawPipes();
    } else if (screensaver === 'starfield') {
      const stars = Array.from({ length: 240 }, () => ({
        x: (Math.random() - 0.5) * 1600,
        y: (Math.random() - 0.5) * 1200,
        z: Math.random() * 1000 + 20,
      }));
      const draw = () => {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        for (const s of stars) {
          s.z -= 7.5;
          if (s.z <= 2) {
            s.x = (Math.random() - 0.5) * 1600;
            s.y = (Math.random() - 0.5) * 1200;
            s.z = 1000;
          }
          const sx = cx + (s.x / s.z) * 420;
          const sy = cy + (s.y / s.z) * 420;
          const size = Math.max(1, (1 - s.z / 1000) * 3.8);
          const bright = Math.round((1 - s.z / 1000) * 255);
          ctx.fillStyle = `rgb(${bright},${bright},${Math.min(255, bright + 30)})`;
          ctx.fillRect(sx, sy, size, size);
        }
        rafId = requestAnimationFrame(draw);
      };
      draw();
    } else if (screensaver === 'mystify') {
      const pts = Array.from({ length: 4 }, (_, i) => ({
        x: 150 + i * 160,
        y: 120 + i * 90,
        vx: (i % 2 === 0 ? 1 : -1) * (3.2 + i * 0.5),
        vy: (i < 2 ? 1 : -1) * (2.6 + i * 0.4),
      }));
      let hue = 195;
      const draw = () => {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.09)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        for (const p of pts) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
          if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        }
        hue = (hue + 0.7) % 360;
        ctx.strokeStyle = `hsl(${hue}, 90%, 60%)`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.closePath();
        ctx.stroke();
        rafId = requestAnimationFrame(draw);
      };
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      draw();
    } else if (screensaver === 'xpflag') {
      let fx = 160;
      let fy = 140;
      let vx = 2.4;
      let vy = 1.9;
      const draw = () => {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        fx += vx;
        fy += vy;
        if (fx < 30 || fx > canvas.width - 210) vx *= -1;
        if (fy < 30 || fy > canvas.height - 140) vy *= -1;

        ctx.fillStyle = '#f25022';
        ctx.fillRect(fx, fy, 42, 34);
        ctx.fillStyle = '#7fba00';
        ctx.fillRect(fx + 48, fy, 42, 34);
        ctx.fillStyle = '#00a4ef';
        ctx.fillRect(fx, fy + 40, 42, 34);
        ctx.fillStyle = '#ffb900';
        ctx.fillRect(fx + 48, fy + 40, 42, 34);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 20px Tahoma, sans-serif';
        ctx.fillText('TrillXP Multi-OS', fx - 24, fy + 102);
        rafId = requestAnimationFrame(draw);
      };
      draw();
    }

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, [screensaverActive, screensaver]);

  if (!screensaverActive || screensaver === 'none') return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99990,
        background: '#000',
        cursor: 'none',
      }}
      onClick={() => setScreensaverActive(false)}
    >
      {screensaver === 'maze3d' ? (
        <Maze3DCanvas autoPlay={true} skin="brick" cellsSize={11} showMinimap={false} />
      ) : (
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
      )}
    </div>
  );
};

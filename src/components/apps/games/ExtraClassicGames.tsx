import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSound } from '../../../context/SoundContext';

/* ============================================================================
   1. SKIFREE XP (skifree.exe)
   Classic 1991/Windows Downhill Skiing + Jumps + Slalom + Abominable Yeti!
   ============================================================================ */
interface SkiObstacle {
  id: number;
  x: number;
  y: number;
  kind: 'tree' | 'tall_tree' | 'rock' | 'ramp' | 'gate';
  passed?: boolean;
}

export const SkiFreeApp: React.FC = () => {
  const { playSound } = useSound();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [hud, setHud] = useState({ dist: 0, stylePts: 0, speed: 0, crashed: false, eaten: false, turbo: false });
  const stateRef = useRef({
    skierX: 280,
    steer: 0, // -2 hard left, -1 left, 0 straight, 1 right, 2 hard right
    speed: 5.2,
    turbo: false,
    airZ: 0,
    airVz: 0,
    dist: 0,
    stylePts: 0,
    crashTimer: 0,
    eaten: false,
    yetiActive: false,
    yetiX: 90,
    yetiY: -60,
    nextId: 1,
    obstacles: [] as SkiObstacle[],
  });

  const resetGame = useCallback(() => {
    const obs: SkiObstacle[] = [];
    for (let i = 0; i < 22; i++) {
      obs.push({
        id: i + 1,
        x: 30 + Math.random() * 500,
        y: 190 + Math.random() * 340,
        kind: (['tree', 'tall_tree', 'rock', 'ramp', 'gate'] as const)[Math.floor(Math.random() * 5)],
      });
    }
    stateRef.current = {
      skierX: 280,
      steer: 0,
      speed: 5.2,
      turbo: false,
      airZ: 0,
      airVz: 0,
      dist: 0,
      stylePts: 0,
      crashTimer: 0,
      eaten: false,
      yetiActive: false,
      yetiX: 80,
      yetiY: -40,
      nextId: 30,
      obstacles: obs,
    };
    setHud({ dist: 0, stylePts: 0, speed: 5, crashed: false, eaten: false, turbo: false });
  }, []);

  useEffect(() => {
    resetGame();
  }, [resetGame]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const st = stateRef.current;
      if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') {
        st.steer = Math.max(-2, st.steer - 1);
      } else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') {
        st.steer = Math.min(2, st.steer + 1);
      } else if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's') {
        st.steer = 0;
      } else if (e.key.toLowerCase() === 'f') {
        st.turbo = !st.turbo;
      } else if (e.key === 'F2') {
        resetGame();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [resetGame]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let tick = 0;

    const loop = () => {
      tick++;
      const s = stateRef.current;
      const W = canvas.width;
      const H = canvas.height;

      if (!s.eaten) {
        if (s.crashTimer > 0) {
          s.crashTimer--;
          s.speed = 0;
        } else {
          const base = s.steer === 0 ? 6.2 : Math.abs(s.steer) === 1 ? 5.1 : 3.4;
          s.speed = base * (s.turbo ? 1.65 : 1);
          s.skierX = Math.max(24, Math.min(W - 24, s.skierX + s.steer * (s.turbo ? 3.8 : 2.8)));
          s.dist += s.speed * 0.24;
        }

        if (s.airZ > 0 || s.airVz > 0) {
          s.airZ += s.airVz;
          s.airVz -= 0.36;
          if (s.airZ <= 0) {
            s.airZ = 0;
            s.airVz = 0;
            s.stylePts += 75;
            playSound('cardPlace');
          }
        }

        // Scroll obstacles upward
        s.obstacles.forEach((ob) => {
          ob.y -= s.speed;
          // Collision when on snow
          const dx = Math.abs(ob.x - s.skierX);
          const dy = Math.abs(ob.y - 125);
          if (dy < 16 && dx < 18) {
            if (ob.kind === 'ramp' && s.airZ === 0 && s.crashTimer === 0) {
              s.airVz = 6.8;
              s.stylePts += 50;
              playSound('slingoJoker');
            } else if (ob.kind === 'gate' && !ob.passed) {
              ob.passed = true;
              s.stylePts += 100;
              playSound('slingoCoin');
            } else if ((ob.kind === 'tree' || ob.kind === 'tall_tree' || ob.kind === 'rock') && s.airZ < 8 && s.crashTimer === 0) {
              s.crashTimer = 32;
              s.stylePts = Math.max(0, s.stylePts - 30);
              ob.y -= 26;
              playSound('error');
            }
          }
        });

        s.obstacles = s.obstacles.filter((ob) => ob.y > -40);
        while (s.obstacles.length < 24) {
          const roll = Math.random();
          const kind: SkiObstacle['kind'] =
            roll < 0.36 ? 'tree' : roll < 0.62 ? 'tall_tree' : roll < 0.8 ? 'rock' : roll < 0.91 ? 'ramp' : 'gate';
          s.obstacles.push({
            id: s.nextId++,
            x: 24 + Math.random() * (W - 48),
            y: H + Math.random() * 140,
            kind,
          });
        }

        // Spawn the legendary Abominable Snow Monster at 2000m!
        if (s.dist >= 2000 && !s.yetiActive) {
          s.yetiActive = true;
          s.yetiX = s.skierX < W / 2 ? W - 40 : 40;
          s.yetiY = 20;
          playSound('devilLaughAlt');
        }

        if (s.yetiActive) {
          const yetiSpeed = 7.4;
          const vx = Math.sign(s.skierX - s.yetiX) * 3.6;
          s.yetiX += vx;
          s.yetiY += (125 - s.yetiY) * 0.045 + (yetiSpeed - s.speed) * 0.35;
          if (Math.hypot(s.yetiX - s.skierX, s.yetiY - 125) < 22 && s.airZ < 14) {
            s.eaten = true;
            playSound('gameLose');
          }
          // Outrun yeti at 2650m!
          if (s.dist >= 2650) {
            s.yetiActive = false;
            s.stylePts += 1000;
            playSound('gameWin');
          }
        }
      }

      // Draw crisp snow slope
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, W, H);

      // Draw obstacles
      for (const ob of s.obstacles) {
        if (ob.kind === 'tree' || ob.kind === 'tall_tree') {
          ctx.fillStyle = '#78350f';
          ctx.fillRect(ob.x - 3, ob.y + 8, 6, 8);
          ctx.fillStyle = ob.kind === 'tall_tree' ? '#14532d' : '#15803d';
          ctx.beginPath();
          ctx.moveTo(ob.x, ob.y - (ob.kind === 'tall_tree' ? 24 : 16));
          ctx.lineTo(ob.x - 13, ob.y + 9);
          ctx.lineTo(ob.x + 13, ob.y + 9);
          ctx.closePath();
          ctx.fill();
        } else if (ob.kind === 'rock') {
          ctx.fillStyle = '#64748b';
          ctx.beginPath();
          ctx.ellipse(ob.x, ob.y, 12, 7, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (ob.kind === 'ramp') {
          const colors = ['#ef4444', '#facc15', '#22c55e', '#3b82f6'];
          colors.forEach((c, idx) => {
            ctx.fillStyle = c;
            ctx.fillRect(ob.x - 16, ob.y - 6 + idx * 3, 32, 3);
          });
        } else if (ob.kind === 'gate') {
          ctx.fillStyle = ob.passed ? '#22c55e' : '#ef4444';
          ctx.fillRect(ob.x - 18, ob.y - 12, 3, 16);
          ctx.fillRect(ob.x + 15, ob.y - 12, 3, 16);
          ctx.fillRect(ob.x - 18, ob.y - 12, 8, 5);
          ctx.fillRect(ob.x + 15, ob.y - 12, 8, 5);
        }
      }

      // Draw Skier (and shadow when airborne)
      if (!s.eaten) {
        if (s.airZ > 0) {
          ctx.fillStyle = 'rgba(15,23,42,0.22)';
          ctx.beginPath();
          ctx.ellipse(s.skierX, 134, 10, 4, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        const sy = 125 - s.airZ;
        ctx.save();
        ctx.translate(s.skierX, sy);
        if (s.crashTimer > 0) {
          ctx.rotate(0.9);
        }
        // Red Skis
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 3;
        const skiDx = s.steer * 4;
        ctx.beginPath();
        ctx.moveTo(-5 - skiDx, -8);
        ctx.lineTo(-5 + skiDx, 12);
        ctx.moveTo(5 - skiDx, -8);
        ctx.lineTo(5 + skiDx, 12);
        ctx.stroke();
        // Blue Ski Suit & Hat
        ctx.fillStyle = '#2563eb';
        ctx.fillRect(-5, -10, 10, 12);
        ctx.fillStyle = '#fde68a';
        ctx.beginPath();
        ctx.arc(0, -14, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-5, -19, 10, 3);
        ctx.restore();
      }

      // Draw Abominable Snow Monster (Yeti)!
      if (s.yetiActive || s.eaten) {
        const yx = s.eaten ? s.skierX : s.yetiX;
        const yy = s.eaten ? 125 : s.yetiY;
        ctx.save();
        ctx.translate(yx, yy);
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.ellipse(0, 0, 15, 19, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 3;
        // Waving stick arms!
        const armWave = Math.sin(tick * 0.35) * 8;
        ctx.beginPath();
        ctx.moveTo(-12, -4);
        ctx.lineTo(-24, -16 + armWave);
        ctx.moveTo(12, -4);
        ctx.lineTo(24, -16 - armWave);
        ctx.stroke();
        // Big toothy mouth & eyes
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-6, -10, 4, 4);
        ctx.fillRect(2, -10, 4, 4);
        ctx.fillStyle = '#7f1d1d';
        ctx.fillRect(-8, -2, 16, 8);
        ctx.restore();
      }

      if (tick % 5 === 0) {
        setHud({
          dist: Math.floor(s.dist),
          stylePts: s.stylePts,
          speed: Math.round(s.speed * 4),
          crashed: s.crashTimer > 0,
          eaten: s.eaten,
          turbo: s.turbo,
        });
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playSound]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#ece9d8', minHeight: 0, userSelect: 'none' }}>
      <div className="xp-menubar">
        <span className="xp-menu-item" onClick={resetGame}>
          New Run (F2)
        </span>
        <span
          className="xp-menu-item"
          onClick={() => {
            stateRef.current.turbo = !stateRef.current.turbo;
          }}
        >
          Fast Mode (F): <b>{hud.turbo ? 'TURBO ON' : 'Normal'}</b>
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 11, paddingRight: 8 }}>
          Distance: <b>{hud.dist}m</b> • Style: <b>{hud.stylePts}</b> • Speed: <b>{hud.speed} m/s</b>
        </span>
      </div>

      <div style={{ flex: 1, position: 'relative', background: '#f8fafc', minHeight: 0 }}>
        <canvas
          ref={canvasRef}
          width={560}
          height={380}
          onPointerMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const rel = (e.clientX - rect.left) / rect.width - 0.5;
            stateRef.current.steer = rel < -0.24 ? -2 : rel < -0.07 ? -1 : rel > 0.24 ? 2 : rel > 0.07 ? 1 : 0;
          }}
          onClick={() => {
            if (stateRef.current.eaten) resetGame();
          }}
          style={{ width: '100%', height: '100%', display: 'block', cursor: 'crosshair' }}
        />

        {hud.dist >= 1850 && hud.dist < 2000 && !hud.eaten && (
          <div
            style={{
              position: 'absolute',
              top: 12,
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#fef08a',
              border: '2px solid #dc2626',
              padding: '4px 12px',
              borderRadius: 6,
              fontWeight: 800,
              color: '#991b1b',
            }}
          >
            ⚠️ WARNING: 2,000m Yeti Zone Ahead! Press F for Turbo Speed!
          </div>
        )}

        {hud.eaten && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(15,23,42,0.55)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div className="xp-window" style={{ width: 290, position: 'relative' }}>
              <div className="xp-titlebar" style={{ height: 24 }}>
                <span className="xp-titlebar-text">SkiFree — Chomp!</span>
              </div>
              <div style={{ padding: 14, background: '#ece9d8', textAlign: 'center', fontSize: 12 }}>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>
                  🦷 The Abominable Snow Monster ate you at {hud.dist}m!
                </div>
                <div style={{ marginBottom: 12 }}>
                  Style Points: <b>{hud.stylePts}</b> (Tip: Hit <b>F</b> to outrun the Yeti!)
                </div>
                <button className="xp-btn xp-btn-primary" onClick={resetGame}>
                  Ski Again (F2)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div
        style={{
          height: 26,
          background: '#ece9d8',
          borderTop: '1px solid #aca899',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 10px',
          fontSize: 11,
        }}
      >
        <span>Steer with Mouse / Finger or Arrow Keys • Hit Rainbow Ramps for Tricks!</span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="xp-btn" onClick={() => (stateRef.current.steer = -2)}>
            ◀ Left
          </button>
          <button className="xp-btn" onClick={() => (stateRef.current.steer = 0)}>
            ▼ Down
          </button>
          <button className="xp-btn" onClick={() => (stateRef.current.steer = 2)}>
            Right ▶
          </button>
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
   2. JEZZBALL XP (jezzball.exe)
   Microsoft Entertainment Pack Classic — Capture >=75% of the Atom Chamber!
   ============================================================================ */
const JB_COLS = 28;
const JB_ROWS = 20;

interface JBAtom {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface JBBeam {
  dir: 'H' | 'V';
  originR: number;
  originC: number;
  negLen: number;
  posLen: number;
  negDone: boolean;
  posDone: boolean;
}

export const JezzBallApp: React.FC = () => {
  const { playSound } = useSound();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [dir, setDir] = useState<'H' | 'V'>('V');
  const [status, setStatus] = useState({ level: 1, lives: 3, clearedPct: 0, score: 0, over: false, levelWon: false });

  const gameRef = useRef({
    level: 1,
    lives: 3,
    score: 0,
    dir: 'V' as 'H' | 'V',
    grid: Array.from({ length: JB_ROWS }, () => Array(JB_COLS).fill(false)), // true = captured wall
    atoms: [] as JBAtom[],
    beam: null as JBBeam | null,
    over: false,
    levelWon: false,
  });

  const startLevel = useCallback((lvl: number, carryScore = 0) => {
    const grid = Array.from({ length: JB_ROWS }, (_, r) =>
      Array.from({ length: JB_COLS }, (_, c) => r === 0 || r === JB_ROWS - 1 || c === 0 || c === JB_COLS - 1)
    );
    const atomCount = lvl + 1;
    const atoms: JBAtom[] = Array.from({ length: atomCount }, (_, idx) => ({
      x: 4 + ((idx * 5) % (JB_COLS - 8)) + 0.5,
      y: 4 + ((idx * 3) % (JB_ROWS - 8)) + 0.5,
      vx: (idx % 2 === 0 ? 1 : -1) * 0.14,
      vy: (idx % 3 === 0 ? -1 : 1) * 0.14,
    }));

    gameRef.current = {
      level: lvl,
      lives: atomCount + 1,
      score: carryScore,
      dir: gameRef.current.dir,
      grid,
      atoms,
      beam: null,
      over: false,
      levelWon: false,
    };
    setStatus({ level: lvl, lives: atomCount + 1, clearedPct: 0, score: carryScore, over: false, levelWon: false });
  }, []);

  useEffect(() => {
    startLevel(1, 0);
  }, [startLevel]);

  const toggleOrientation = useCallback(() => {
    setDir((prev) => {
      const next = prev === 'V' ? 'H' : 'V';
      gameRef.current.dir = next;
      return next;
    });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        toggleOrientation();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleOrientation]);

  // Flood-fill atom-reachable squares; capture any unreachable empty chambers!
  const captureEmptyChambers = useCallback(() => {
    const g = gameRef.current;
    const reachable = Array.from({ length: JB_ROWS }, () => Array(JB_COLS).fill(false));
    const q: Array<[number, number]> = [];

    for (const a of g.atoms) {
      const r = Math.max(1, Math.min(JB_ROWS - 2, Math.floor(a.y)));
      const c = Math.max(1, Math.min(JB_COLS - 2, Math.floor(a.x)));
      if (!g.grid[r][c] && !reachable[r][c]) {
        reachable[r][c] = true;
        q.push([r, c]);
      }
    }

    while (q.length > 0) {
      const [r, c] = q.shift()!;
      for (const [dr, dc] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < JB_ROWS && nc >= 0 && nc < JB_COLS && !g.grid[nr][nc] && !reachable[nr][nc]) {
          reachable[nr][nc] = true;
          q.push([nr, nc]);
        }
      }
    }

    let newlyCaptured = 0;
    let totalInterior = (JB_ROWS - 2) * (JB_COLS - 2);
    let totalCaptured = 0;
    for (let r = 1; r < JB_ROWS - 1; r++) {
      for (let c = 1; c < JB_COLS - 1; c++) {
        if (!reachable[r][c]) {
          if (!g.grid[r][c]) newlyCaptured++;
          g.grid[r][c] = true;
        }
        if (g.grid[r][c]) totalCaptured++;
      }
    }

    const pct = Math.round((totalCaptured / totalInterior) * 100);
    g.score += newlyCaptured * 25;
    playSound('cardPlace');

    if (pct >= 75 && !g.levelWon) {
      g.levelWon = true;
      g.score += 1000 * g.level;
      playSound('gameWin');
    }

    setStatus({
      level: g.level,
      lives: g.lives,
      clearedPct: pct,
      score: g.score,
      over: g.over,
      levelWon: g.levelWon,
    });
  }, [playSound]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let stepTick = 0;

    const loop = () => {
      stepTick++;
      const g = gameRef.current;
      const cellW = canvas.width / JB_COLS;
      const cellH = canvas.height / JB_ROWS;

      if (!g.over && !g.levelWon) {
        // Move atoms & bounce off solid walls
        for (const a of g.atoms) {
          const nx = a.x + a.vx;
          const ny = a.y + a.vy;
          const cr = Math.floor(a.y);
          const cc = Math.floor(a.x);
          const nr = Math.floor(ny);
          const nc = Math.floor(nx);

          if (g.grid[cr]?.[nc]) a.vx = -a.vx;
          else a.x = nx;

          if (g.grid[nr]?.[cc]) a.vy = -a.vy;
          else a.y = ny;

          // Check collision with growing beam!
          if (g.beam) {
            const b = g.beam;
            const ar = Math.floor(a.y);
            const ac = Math.floor(a.x);
            const hitH =
              b.dir === 'H' &&
              ar === b.originR &&
              ac >= b.originC - b.negLen &&
              ac <= b.originC + b.posLen;
            const hitV =
              b.dir === 'V' &&
              ac === b.originC &&
              ar >= b.originR - b.negLen &&
              ar <= b.originR + b.posLen;

            if (hitH || hitV) {
              g.beam = null;
              g.lives--;
              playSound('error');
              if (g.lives <= 0) {
                g.over = true;
                playSound('gameLose');
              }
              setStatus((prev) => ({ ...prev, lives: g.lives, over: g.over }));
            }
          }
        }

        // Advance active beam every 3 frames
        if (g.beam && stepTick % 3 === 0) {
          const b = g.beam;
          if (!b.negDone) {
            const nr = b.dir === 'V' ? b.originR - (b.negLen + 1) : b.originR;
            const nc = b.dir === 'H' ? b.originC - (b.negLen + 1) : b.originC;
            if (g.grid[nr]?.[nc]) b.negDone = true;
            else b.negLen++;
          }
          if (!b.posDone) {
            const pr = b.dir === 'V' ? b.originR + (b.posLen + 1) : b.originR;
            const pc = b.dir === 'H' ? b.originC + (b.posLen + 1) : b.originC;
            if (g.grid[pr]?.[pc]) b.posDone = true;
            else b.posLen++;
          }

          if (b.negDone && b.posDone) {
            for (let k = -b.negLen; k <= b.posLen; k++) {
              const wr = b.dir === 'V' ? b.originR + k : b.originR;
              const wc = b.dir === 'H' ? b.originC + k : b.originC;
              if (g.grid[wr]) g.grid[wr][wc] = true;
            }
            g.beam = null;
            captureEmptyChambers();
          }
        }
      }

      // Render classic checkerboard chamber
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let r = 0; r < JB_ROWS; r++) {
        for (let c = 0; c < JB_COLS; c++) {
          if (g.grid[r][c]) {
            ctx.fillStyle = r === 0 || r === JB_ROWS - 1 || c === 0 || c === JB_COLS - 1 ? '#334155' : '#0f172a';
            ctx.fillRect(c * cellW, r * cellH, cellW + 0.5, cellH + 0.5);
          } else {
            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 0.6;
            ctx.strokeRect(c * cellW, r * cellH, cellW, cellH);
          }
        }
      }

      // Render active red/blue splitter beam
      if (g.beam) {
        const b = g.beam;
        for (let k = -b.negLen; k <= b.posLen; k++) {
          const wr = b.dir === 'V' ? b.originR + k : b.originR;
          const wc = b.dir === 'H' ? b.originC + k : b.originC;
          ctx.fillStyle = k <= 0 ? '#ef4444' : '#2563eb';
          ctx.fillRect(wc * cellW, wr * cellH, cellW, cellH);
        }
      }

      // Render glossy red/gold bouncing atoms
      for (const a of g.atoms) {
        const ax = a.x * cellW;
        const ay = a.y * cellH;
        const rad = Math.min(cellW, cellH) * 0.42;
        const grad = ctx.createRadialGradient(ax - 2, ay - 2, 1, ax, ay, rad);
        grad.addColorStop(0, '#fef08a');
        grad.addColorStop(0.5, '#ef4444');
        grad.addColorStop(1, '#7f1d1d');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(ax, ay, rad, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [captureEmptyChambers, playSound]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#ece9d8', minHeight: 0, userSelect: 'none' }}>
      <div className="xp-menubar">
        <span className="xp-menu-item" onClick={() => startLevel(1, 0)}>
          New Game
        </span>
        <span className="xp-menu-item" onClick={toggleOrientation}>
          Direction (Space / Right-Click): <b>{dir === 'V' ? '↕ Vertical' : '↔ Horizontal'}</b>
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 11, paddingRight: 8 }}>
          Level <b>{status.level}</b> • Lives: <b>{status.lives}</b> • Cleared: <b>{status.clearedPct}% / 75%</b> • Score:{' '}
          <b>{status.score}</b>
        </span>
      </div>

      <div style={{ flex: 1, position: 'relative', minHeight: 0, background: '#0f172a' }}>
        <canvas
          ref={canvasRef}
          width={560}
          height={400}
          onContextMenu={(e) => {
            e.preventDefault();
            toggleOrientation();
          }}
          onClick={(e) => {
            const g = gameRef.current;
            if (g.over || g.levelWon || g.beam) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const c = Math.floor(((e.clientX - rect.left) / rect.width) * JB_COLS);
            const r = Math.floor(((e.clientY - rect.top) / rect.height) * JB_ROWS);
            if (g.grid[r]?.[c]) return;
            g.beam = {
              dir: g.dir,
              originR: r,
              originC: c,
              negLen: 0,
              posLen: 0,
              negDone: false,
              posDone: false,
            };
          }}
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            cursor: dir === 'V' ? 'ns-resize' : 'ew-resize',
          }}
        />

        {(status.levelWon || status.over) && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.55)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div className="xp-window" style={{ width: 280, position: 'relative' }}>
              <div className="xp-titlebar" style={{ height: 24 }}>
                <span className="xp-titlebar-text">JezzBall XP</span>
              </div>
              <div style={{ padding: 14, background: '#ece9d8', textAlign: 'center', fontSize: 12 }}>
                {status.levelWon ? (
                  <>
                    <div style={{ fontWeight: 800, marginBottom: 8 }}>
                      🎉 Level {status.level} Cleared ({status.clearedPct}% Captured)!
                    </div>
                    <button
                      className="xp-btn xp-btn-primary"
                      onClick={() => startLevel(status.level + 1, status.score)}
                    >
                      Advance to Level {status.level + 1} ▶
                    </button>
                  </>
                ) : (
                  <>
                    <div style={{ fontWeight: 800, marginBottom: 8 }}>💥 Out of Lives! Score: {status.score}</div>
                    <button className="xp-btn xp-btn-primary" onClick={() => startLevel(1, 0)}>
                      Play Again
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ============================================================================
   3. MAHJONG TITANS / TAIPEI (mahjong.exe)
   Classic 3D Stacked Tile Matching Solitaire with Undo, Hint & Shuffle!
   ============================================================================ */
interface MahjongTile {
  id: number;
  face: string;
  color: string;
  col: number;
  row: number;
  layer: number;
  removed: boolean;
}

const MAHJONG_FACES = [
  { face: '一', color: '#1d4ed8' },
  { face: '二', color: '#1d4ed8' },
  { face: '三', color: '#1d4ed8' },
  { face: '四', color: '#1d4ed8' },
  { face: '五', color: '#1d4ed8' },
  { face: '竹', color: '#15803d' },
  { face: '蘭', color: '#15803d' },
  { face: '菊', color: '#15803d' },
  { face: '梅', color: '#15803d' },
  { face: '中', color: '#dc2626' },
  { face: '發', color: '#16a34a' },
  { face: '白', color: '#334155' },
  { face: '東', color: '#0f172a' },
  { face: '南', color: '#0f172a' },
  { face: '西', color: '#0f172a' },
  { face: '北', color: '#0f172a' },
  { face: '①', color: '#b91c1c' },
  { face: '②', color: '#b91c1c' },
];

export const MahjongTitansApp: React.FC = () => {
  const { playSound } = useSound();
  const [tiles, setTiles] = useState<MahjongTile[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [hintIds, setHintIds] = useState<number[]>([]);
  const [undoPairs, setUndoPairs] = useState<Array<[number, number]>>([]);
  const [highlightFree, setHighlightFree] = useState(true);

  const buildLayout = useCallback(() => {
    const coords: Array<[number, number, number]> = [];
    // Layer 0: 8x6 base (48 tiles)
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 8; c++) coords.push([c, r, 0]);
    }
    // Layer 1: 4x4 middle (16 tiles)
    for (let r = 1; r <= 4; r++) {
      for (let c = 2; c <= 5; c++) coords.push([c, r, 1]);
    }
    // Layer 2: 2x4 crown (8 tiles) -> Total 72 tiles (36 pairs)
    for (let r = 1; r <= 4; r++) {
      for (let c = 3; c <= 4; c++) coords.push([c, r, 2]);
    }

    const pool: Array<{ face: string; color: string }> = [];
    for (let i = 0; i < coords.length / 2; i++) {
      const f = MAHJONG_FACES[i % MAHJONG_FACES.length];
      pool.push(f, f);
    }
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    setTiles(
      coords.map(([col, row, layer], idx) => ({
        id: idx + 1,
        face: pool[idx].face,
        color: pool[idx].color,
        col,
        row,
        layer,
        removed: false,
      }))
    );
    setSelectedId(null);
    setHintIds([]);
    setUndoPairs([]);
  }, []);

  useEffect(() => {
    buildLayout();
  }, [buildLayout]);

  const isTileFree = useCallback(
    (t: MahjongTile, all: MahjongTile[]) => {
      if (t.removed) return false;
      const blockedTop = all.some(
        (o) => !o.removed && o.layer > t.layer && o.col === t.col && o.row === t.row
      );
      if (blockedTop) return false;
      const blockedLeft = all.some(
        (o) => !o.removed && o.layer === t.layer && o.row === t.row && o.col === t.col - 1
      );
      const blockedRight = all.some(
        (o) => !o.removed && o.layer === t.layer && o.row === t.row && o.col === t.col + 1
      );
      return !(blockedLeft && blockedRight);
    },
    []
  );

  const handleTileClick = (t: MahjongTile) => {
    if (!isTileFree(t, tiles)) {
      playSound('ding');
      return;
    }
    setHintIds([]);
    if (selectedId === null) {
      setSelectedId(t.id);
      return;
    }
    if (selectedId === t.id) {
      setSelectedId(null);
      return;
    }
    const prev = tiles.find((x) => x.id === selectedId);
    if (prev && prev.face === t.face) {
      const next = tiles.map((x) => (x.id === prev.id || x.id === t.id ? { ...x, removed: true } : x));
      setTiles(next);
      setUndoPairs((u) => [...u, [prev.id, t.id]]);
      setSelectedId(null);
      playSound('slingoCoin');
      if (next.every((x) => x.removed)) {
        playSound('gameWin');
      }
    } else {
      setSelectedId(t.id);
    }
  };

  const showHint = () => {
    const free = tiles.filter((t) => isTileFree(t, tiles));
    for (let i = 0; i < free.length; i++) {
      for (let j = i + 1; j < free.length; j++) {
        if (free[i].face === free[j].face) {
          setHintIds([free[i].id, free[j].id]);
          playSound('menuClick');
          return;
        }
      }
    }
    alert('No free pairs remaining — click Shuffle Remaining Tiles!');
  };

  const shuffleRemaining = () => {
    const activeFaces = tiles.filter((t) => !t.removed).map((t) => ({ face: t.face, color: t.color }));
    for (let i = activeFaces.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [activeFaces[i], activeFaces[j]] = [activeFaces[j], activeFaces[i]];
    }
    let ptr = 0;
    setTiles((prev) =>
      prev.map((t) => (t.removed ? t : { ...t, ...activeFaces[ptr++] }))
    );
    setSelectedId(null);
    setHintIds([]);
    playSound('cardFlip');
  };

  const remainingCount = tiles.filter((t) => !t.removed).length;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0f3d2e', minHeight: 0, userSelect: 'none' }}>
      <div className="xp-menubar" style={{ color: '#000' }}>
        <span className="xp-menu-item" onClick={buildLayout}>
          New Deal
        </span>
        <span className="xp-menu-item" onClick={showHint}>
          Hint
        </span>
        <span className="xp-menu-item" onClick={shuffleRemaining}>
          Shuffle Remaining
        </span>
        <span
          className="xp-menu-item"
          style={{ opacity: undoPairs.length === 0 ? 0.45 : 1 }}
          onClick={() => {
            if (undoPairs.length === 0) return;
            const [a, b] = undoPairs[undoPairs.length - 1];
            setTiles((prev) => prev.map((t) => (t.id === a || t.id === b ? { ...t, removed: false } : t)));
            setUndoPairs((u) => u.slice(0, -1));
          }}
        >
          Undo
        </span>
        <span className="xp-menu-item" onClick={() => setHighlightFree((v) => !v)}>
          Highlight Free: <b>{highlightFree ? 'ON' : 'OFF'}</b>
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 11, paddingRight: 8 }}>
          Tiles Left: <b>{remainingCount}</b>
        </span>
      </div>

      <div
        style={{
          flex: 1,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'auto',
        }}
      >
        {remainingCount === 0 ? (
          <div className="xp-window" style={{ width: 280, position: 'relative' }}>
            <div className="xp-titlebar" style={{ height: 24 }}>
              <span className="xp-titlebar-text">Mahjong Titans</span>
            </div>
            <div style={{ padding: 14, background: '#ece9d8', textAlign: 'center', fontSize: 12 }}>
              <div style={{ fontWeight: 800, marginBottom: 10 }}>🀄 Dragon Tower Cleared! You Won!</div>
              <button className="xp-btn xp-btn-primary" onClick={buildLayout}>
                Deal New Board
              </button>
            </div>
          </div>
        ) : (
          <div style={{ position: 'relative', width: 450, height: 340 }}>
            {tiles
              .filter((t) => !t.removed)
              .sort((a, b) => a.layer - b.layer || a.row - b.row || a.col - b.col)
              .map((t) => {
                const free = isTileFree(t, tiles);
                const isSel = selectedId === t.id;
                const isHint = hintIds.includes(t.id);
                return (
                  <div
                    key={t.id}
                    onClick={() => handleTileClick(t)}
                    style={{
                      position: 'absolute',
                      left: 24 + t.col * 50 - t.layer * 5,
                      top: 18 + t.row * 52 - t.layer * 6,
                      width: 46,
                      height: 54,
                      borderRadius: 5,
                      background: isSel
                        ? '#fef08a'
                        : isHint
                        ? '#bae6fd'
                        : !free && highlightFree
                        ? '#e2e8f0'
                        : 'linear-gradient(180deg, #fffdf5 0%, #f5ebd2 100%)',
                      borderTop: '2px solid #ffffff',
                      borderLeft: '2px solid #ffffff',
                      borderRight: '4px solid #15803d',
                      borderBottom: '5px solid #166534',
                      boxShadow: isSel
                        ? '0 0 12px #facc15'
                        : '2px 4px 6px rgba(0,0,0,0.45)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 23,
                      fontWeight: 900,
                      fontFamily: 'Georgia, serif',
                      color: t.color,
                      cursor: free ? 'pointer' : 'not-allowed',
                      opacity: !free && highlightFree ? 0.72 : 1,
                    }}
                  >
                    {t.face}
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
};

/* ============================================================================
   4. MSN GAMING ZONE INTERNET CHECKERS (checkers.exe)
   Classic Windows XP Online Checkers vs Smart AI + MSN Zone Quick-Chat!
   ============================================================================ */
type CheckerCell = null | { owner: 'red' | 'black'; king: boolean };

interface CheckerMove {
  fromR: number;
  fromC: number;
  toR: number;
  toC: number;
  captured?: [number, number];
}

function createInitialCheckers(): CheckerCell[][] {
  return Array.from({ length: 8 }, (_, r) =>
    Array.from({ length: 8 }, (_, c) => {
      if ((r + c) % 2 === 0) return null;
      if (r < 3) return { owner: 'black', king: false };
      if (r > 4) return { owner: 'red', king: false };
      return null;
    })
  );
}

function getValidMovesForSide(board: CheckerCell[][], side: 'red' | 'black'): CheckerMove[] {
  const jumps: CheckerMove[] = [];
  const steps: CheckerMove[] = [];

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece || piece.owner !== side) continue;
      const dirs: number[] = piece.king ? [-1, 1] : side === 'red' ? [-1] : [1];
      for (const dr of dirs) {
        for (const dc of [-1, 1]) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && !board[nr][nc]) {
            steps.push({ fromR: r, fromC: c, toR: nr, toC: nc });
          }
          const jr = r + dr * 2;
          const jc = c + dc * 2;
          if (
            jr >= 0 &&
            jr < 8 &&
            jc >= 0 &&
            jc < 8 &&
            !board[jr][jc] &&
            board[nr]?.[nc] &&
            board[nr][nc]!.owner !== side
          ) {
            jumps.push({ fromR: r, fromC: c, toR: jr, toC: jc, captured: [nr, nc] });
          }
        }
      }
    }
  }
  return jumps.length > 0 ? jumps : steps;
}

export const CheckersXPApp: React.FC = () => {
  const { playSound } = useSound();
  const [board, setBoard] = useState<CheckerCell[][]>(() => createInitialCheckers());
  const [turn, setTurn] = useState<'red' | 'black'>('red');
  const [sel, setSel] = useState<[number, number] | null>(null);
  const [chat, setChat] = useState<string[]>([
    'ZoneMaster_2003: Welcome to MSN Gaming Zone Internet Checkers!',
    'ZoneMaster_2003: Your move (Red)!',
  ]);
  const [winner, setWinner] = useState<'red' | 'black' | null>(null);

  const applyCheckerMove = (b: CheckerCell[][], mv: CheckerMove): CheckerCell[][] => {
    const next = b.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
    const moving = next[mv.fromR][mv.fromC]!;
    next[mv.fromR][mv.fromC] = null;
    if (mv.captured) {
      next[mv.captured[0]][mv.captured[1]] = null;
    }
    const crowned =
      moving.king || (moving.owner === 'red' && mv.toR === 0) || (moving.owner === 'black' && mv.toR === 7);
    next[mv.toR][mv.toC] = { owner: moving.owner, king: crowned };
    return next;
  };

  // AI Turn (ZoneMaster_2003)
  useEffect(() => {
    if (turn !== 'black' || winner) return;
    const t = window.setTimeout(() => {
      const legal = getValidMovesForSide(board, 'black');
      if (legal.length === 0) {
        setWinner('red');
        playSound('gameWin');
        return;
      }
      // Score candidate moves (prefer captures, kings, center control, avoiding immediate capture)
      let best = legal[0];
      let bestScore = -9999;
      for (const mv of legal) {
        const after = applyCheckerMove(board, mv);
        let sc = (mv.captured ? 30 : 0) + (mv.toR === 7 ? 15 : mv.toR) + (mv.toC >= 2 && mv.toC <= 5 ? 4 : 0);
        const oppReplies = getValidMovesForSide(after, 'red');
        if (oppReplies.some((r) => r.captured)) sc -= 18;
        sc += Math.random() * 2;
        if (sc > bestScore) {
          bestScore = sc;
          best = mv;
        }
      }
      const nextBoard = applyCheckerMove(board, best);
      setBoard(nextBoard);
      playSound('cardPlace');
      if (best.captured) {
        setChat((c) => [...c.slice(-6), 'ZoneMaster_2003: Haha, got one!']);
      }
      if (getValidMovesForSide(nextBoard, 'red').length === 0) {
        setWinner('black');
        playSound('gameLose');
      } else {
        setTurn('red');
      }
    }, 480);
    return () => clearTimeout(t);
  }, [turn, board, winner, playSound]);

  const legalRedMoves = turn === 'red' ? getValidMovesForSide(board, 'red') : [];
  const movesForSelected = sel
    ? legalRedMoves.filter((m) => m.fromR === sel[0] && m.fromC === sel[1])
    : [];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#ece9d8', minHeight: 0, userSelect: 'none' }}>
      <div className="xp-menubar">
        <span
          className="xp-menu-item"
          onClick={() => {
            setBoard(createInitialCheckers());
            setTurn('red');
            setSel(null);
            setWinner(null);
          }}
        >
          New Match
        </span>
        {['Good game!', 'Nice move!', 'Watch this!'].map((phrase) => (
          <span
            key={phrase}
            className="xp-menu-item"
            onClick={() => {
              setChat((c) => [
                ...c.slice(-6),
                `You: ${phrase}`,
                `ZoneMaster_2003: ${phrase === 'Good game!' ? 'GG friend! :)' : 'Bring it on!'}`,
              ]);
              playSound('aimSend');
            }}
          >
            💬 “{phrase}”
          </span>
        ))}
      </div>

      <div style={{ flex: 1, display: 'flex', gap: 12, padding: 12, alignItems: 'center', justifyContent: 'center', overflow: 'auto' }}>
        {/* Classic Wooden 8x8 Board */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(8, 42px)',
            gridTemplateRows: 'repeat(8, 42px)',
            border: '5px solid #451a03',
            boxShadow: '0 6px 16px rgba(0,0,0,0.4)',
          }}
        >
          {board.map((row, r) =>
            row.map((cell, c) => {
              const dark = (r + c) % 2 === 1;
              const isSel = sel?.[0] === r && sel?.[1] === c;
              const destMove = movesForSelected.find((m) => m.toR === r && m.toC === c);
              return (
                <div
                  key={`${r}-${c}`}
                  onClick={() => {
                    if (turn !== 'red' || winner) return;
                    if (destMove) {
                      const next = applyCheckerMove(board, destMove);
                      setBoard(next);
                      setSel(null);
                      playSound('cardPlace');
                      if (getValidMovesForSide(next, 'black').length === 0) {
                        setWinner('red');
                        playSound('gameWin');
                      } else {
                        setTurn('black');
                      }
                      return;
                    }
                    if (cell?.owner === 'red') {
                      setSel([r, c]);
                    }
                  }}
                  style={{
                    background: destMove ? '#86efac' : dark ? '#92400e' : '#fef3c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: destMove || cell?.owner === 'red' ? 'pointer' : 'default',
                  }}
                >
                  {cell && (
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background:
                          cell.owner === 'red'
                            ? 'radial-gradient(circle at 35% 30%, #f87171, #b91c1c)'
                            : 'radial-gradient(circle at 35% 30%, #64748b, #0f172a)',
                        border: isSel ? '3px solid #fde047' : '2px solid rgba(255,255,255,0.45)',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fde047',
                        fontWeight: 900,
                        fontSize: 15,
                      }}
                    >
                      {cell.king ? '♛' : ''}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* MSN Gaming Zone Sidebar */}
        <div
          style={{
            width: 195,
            height: 344,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div className="xp-bevel-sunken" style={{ background: '#fff', padding: 8, fontSize: 11 }}>
            <div style={{ fontWeight: 800, color: '#1d4ed8', marginBottom: 4 }}>MSN Gaming Zone</div>
            <div>
              Turn:{' '}
              <b style={{ color: turn === 'red' ? '#dc2626' : '#0f172a' }}>
                {winner ? `${winner.toUpperCase()} WINS!` : turn === 'red' ? 'Your Move (Red)' : 'ZoneMaster Thinking...'}
              </b>
            </div>
            {legalRedMoves.some((m) => m.captured) && turn === 'red' && (
              <div style={{ color: '#b45309', fontWeight: 700, marginTop: 4 }}>⚡ Jump available!</div>
            )}
          </div>

          <div
            className="xp-bevel-sunken"
            style={{ flex: 1, background: '#fff', padding: 6, overflowY: 'auto', fontSize: 11 }}
          >
            {chat.map((line, idx) => (
              <div key={idx} style={{ marginBottom: 5 }}>
                {line}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
   5. TETRIS XP (tetris.exe)
   Classic Microsoft Entertainment Pack Block Puzzle with Ghost Piece!
   ============================================================================ */
const TET_W = 10;
const TET_H = 20;

const TETROMINOES = [
  { color: '#06b6d4', shape: [[1, 1, 1, 1]] }, // I
  { color: '#eab308', shape: [[1, 1], [1, 1]] }, // O
  { color: '#a855f7', shape: [[0, 1, 0], [1, 1, 1]] }, // T
  { color: '#22c55e', shape: [[0, 1, 1], [1, 1, 0]] }, // S
  { color: '#ef4444', shape: [[1, 1, 0], [0, 1, 1]] }, // Z
  { color: '#3b82f6', shape: [[1, 0, 0], [1, 1, 1]] }, // J
  { color: '#f97316', shape: [[0, 0, 1], [1, 1, 1]] }, // L
];

export const TetrisXPApp: React.FC = () => {
  const { playSound } = useSound();
  const [board, setBoard] = useState<string[][]>(() =>
    Array.from({ length: TET_H }, () => Array(TET_W).fill(''))
  );
  const [piece, setPiece] = useState(() => ({
    ...TETROMINOES[2],
    x: 3,
    y: 0,
  }));
  const [nextPiece, setNextPiece] = useState(() => TETROMINOES[0]);
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const collides = useCallback(
    (grid: string[][], shape: number[][], px: number, py: number) => {
      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (!shape[r][c]) continue;
          const nx = px + c;
          const ny = py + r;
          if (nx < 0 || nx >= TET_W || ny >= TET_H) return true;
          if (ny >= 0 && grid[ny][nx]) return true;
        }
      }
      return false;
    },
    []
  );

  const resetTetris = () => {
    setBoard(Array.from({ length: TET_H }, () => Array(TET_W).fill('')));
    setPiece({ ...TETROMINOES[Math.floor(Math.random() * 7)], x: 3, y: 0 });
    setNextPiece(TETROMINOES[Math.floor(Math.random() * 7)]);
    setScore(0);
    setLines(0);
    setGameOver(false);
  };

  const stepDown = useCallback(() => {
    if (gameOver) return;
    if (!collides(board, piece.shape, piece.x, piece.y + 1)) {
      setPiece((p) => ({ ...p, y: p.y + 1 }));
      return;
    }
    // Lock piece
    const merged = board.map((r) => [...r]);
    for (let r = 0; r < piece.shape.length; r++) {
      for (let c = 0; c < piece.shape[r].length; c++) {
        if (piece.shape[r][c] && piece.y + r >= 0) {
          merged[piece.y + r][piece.x + c] = piece.color;
        }
      }
    }
    const kept = merged.filter((row) => row.some((cell) => !cell));
    const cleared = TET_H - kept.length;
    while (kept.length < TET_H) kept.unshift(Array(TET_W).fill(''));

    setBoard(kept);
    if (cleared > 0) {
      setLines((l) => l + cleared);
      setScore((s) => s + [0, 100, 300, 600, 1200][cleared]);
      playSound('slingoCoin');
    } else {
      playSound('cardPlace');
    }

    const spawned = { ...nextPiece, x: 3, y: 0 };
    const upcoming = TETROMINOES[Math.floor(Math.random() * TETROMINOES.length)];
    setNextPiece(upcoming);
    if (collides(kept, spawned.shape, spawned.x, spawned.y)) {
      setGameOver(true);
      playSound('gameLose');
    } else {
      setPiece(spawned);
    }
  }, [board, collides, gameOver, nextPiece, piece, playSound]);

  useEffect(() => {
    if (gameOver) return;
    const speed = Math.max(140, 520 - Math.floor(lines / 8) * 45);
    const iv = window.setInterval(stepDown, speed);
    return () => clearInterval(iv);
  }, [stepDown, lines, gameOver]);

  const rotatePiece = useCallback(() => {
    const rot = piece.shape[0].map((_, idx) => piece.shape.map((row) => row[idx]).reverse());
    if (!collides(board, rot, piece.x, piece.y)) {
      setPiece((p) => ({ ...p, shape: rot }));
    } else if (!collides(board, rot, piece.x - 1, piece.y)) {
      setPiece((p) => ({ ...p, shape: rot, x: p.x - 1 }));
    } else if (!collides(board, rot, piece.x + 1, piece.y)) {
      setPiece((p) => ({ ...p, shape: rot, x: p.x + 1 }));
    }
  }, [board, collides, piece]);

  const hardDrop = useCallback(() => {
    let ny = piece.y;
    while (!collides(board, piece.shape, piece.x, ny + 1)) ny++;
    setPiece((p) => ({ ...p, y: ny }));
  }, [board, collides, piece]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (gameOver) return;
      if (e.key === 'ArrowLeft') {
        if (!collides(board, piece.shape, piece.x - 1, piece.y)) setPiece((p) => ({ ...p, x: p.x - 1 }));
      } else if (e.key === 'ArrowRight') {
        if (!collides(board, piece.shape, piece.x + 1, piece.y)) setPiece((p) => ({ ...p, x: p.x + 1 }));
      } else if (e.key === 'ArrowDown') {
        stepDown();
      } else if (e.key === 'ArrowUp') {
        rotatePiece();
      } else if (e.code === 'Space') {
        e.preventDefault();
        hardDrop();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [board, collides, gameOver, hardDrop, piece, rotatePiece, stepDown]);

  // Ghost y
  let ghostY = piece.y;
  while (!collides(board, piece.shape, piece.x, ghostY + 1)) ghostY++;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#ece9d8', minHeight: 0, userSelect: 'none' }}>
      <div className="xp-menubar">
        <span className="xp-menu-item" onClick={resetTetris}>
          New Game
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 11, paddingRight: 8 }}>
          Score: <b>{score.toLocaleString()}</b> • Lines: <b>{lines}</b>
        </span>
      </div>

      <div style={{ flex: 1, display: 'flex', gap: 16, padding: 12, alignItems: 'center', justifyContent: 'center', overflow: 'auto' }}>
        {/* 10x20 Matrix */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${TET_W}, 19px)`,
            gridTemplateRows: `repeat(${TET_H}, 19px)`,
            background: '#090d16',
            border: '3px inset #64748b',
          }}
        >
          {board.map((row, r) =>
            row.map((cell, c) => {
              let fill = cell;
              let ghost = false;
              const pr = r - piece.y;
              const pc = c - piece.x;
              if (!gameOver && pr >= 0 && pr < piece.shape.length && pc >= 0 && pc < piece.shape[0].length && piece.shape[pr][pc]) {
                fill = piece.color;
              } else {
                const gr = r - ghostY;
                if (!gameOver && gr >= 0 && gr < piece.shape.length && pc >= 0 && pc < piece.shape[0].length && piece.shape[gr][pc]) {
                  ghost = true;
                }
              }
              return (
                <div
                  key={`${r}-${c}`}
                  style={{
                    background: fill || (ghost ? 'rgba(255,255,255,0.14)' : 'transparent'),
                    border: fill
                      ? '1px solid rgba(255,255,255,0.45)'
                      : '1px solid rgba(255,255,255,0.04)',
                    boxSizing: 'border-box',
                  }}
                />
              );
            })
          )}
        </div>

        {/* Side Controls & Next Piece */}
        <div style={{ width: 145, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="xp-bevel-sunken" style={{ background: '#0f172a', color: '#fff', padding: 8 }}>
            <div style={{ fontSize: 10, color: '#93c5fd', marginBottom: 6, fontWeight: 700 }}>NEXT PIECE</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center', minHeight: 42 }}>
              {nextPiece.shape.map((rw, r) => (
                <div key={r} style={{ display: 'flex', gap: 2 }}>
                  {rw.map((v, c) => (
                    <div
                      key={c}
                      style={{
                        width: 14,
                        height: 14,
                        background: v ? nextPiece.color : 'transparent',
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          {gameOver && (
            <div style={{ background: '#fee2e2', border: '1px solid #dc2626', padding: 8, textAlign: 'center', fontWeight: 700 }}>
              GAME OVER!
              <button className="xp-btn xp-btn-primary" style={{ marginTop: 6, width: '100%' }} onClick={resetTetris}>
                Play Again
              </button>
            </div>
          )}

          {/* Touch / Mouse Controls */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
            <button
              className="xp-btn"
              onClick={() => !collides(board, piece.shape, piece.x - 1, piece.y) && setPiece((p) => ({ ...p, x: p.x - 1 }))}
            >
              ◀
            </button>
            <button className="xp-btn" onClick={rotatePiece}>
              ↻
            </button>
            <button
              className="xp-btn"
              onClick={() => !collides(board, piece.shape, piece.x + 1, piece.y) && setPiece((p) => ({ ...p, x: p.x + 1 }))}
            >
              ▶
            </button>
            <button className="xp-btn" style={{ gridColumn: '1 / 4' }} onClick={hardDrop}>
              ⬇ Drop (Space)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

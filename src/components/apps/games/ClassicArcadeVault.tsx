import React, { useState, useEffect, useRef } from 'react';
import { useOS, BuiltinAppId } from '../../../context/OSContext';
import { useSound } from '../../../context/SoundContext';

/* ============================================================================
   1. MS-DOS QBASIC GORILLA.BAS (1991 — EXPLODING BANANAS OVER SKYSCRAPERS!)
   ============================================================================ */
export const GorillasQBasicApp: React.FC = () => {
  const { playSound } = useSound();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [angle, setAngle] = useState(52);
  const [velocity, setVelocity] = useState(66);
  const [turn, setTurn] = useState<'p1' | 'p2'>('p1');
  const [scores, setScores] = useState({ p1: 0, p2: 0 });
  const [wind, setWind] = useState(0);
  const [throwing, setThrowing] = useState(false);
  const [msg, setMsg] = useState('Player 1: Enter Angle & Velocity and click Throw Banana!');

  const stateRef = useRef<{
    buildings: Array<{ x: number; w: number; h: number; color: string }>;
    craters: Array<{ x: number; y: number; r: number }>;
    g1: { x: number; y: number };
    g2: { x: number; y: number };
    banana: { x: number; y: number; active: boolean } | null;
  }>({
    buildings: [],
    craters: [],
    g1: { x: 80, y: 200 },
    g2: { x: 520, y: 200 },
    banana: null,
  });

  const drawScene = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width;
    const H = canvas.height;

    // Classic EGA Cobalt Blue Sky + Smiling Sun!
    ctx.fillStyle = '#0000aa';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ffff55';
    ctx.beginPath();
    ctx.arc(W / 2, 34, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.fillRect(W / 2 - 6, 29, 3, 3);
    ctx.fillRect(W / 2 + 3, 29, 3, 3);
    ctx.beginPath();
    ctx.arc(W / 2, 36, 7, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();

    // Buildings
    for (const b of stateRef.current.buildings) {
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, H - b.h, b.w, b.h);
      for (let wy = H - b.h + 8; wy < H - 8; wy += 14) {
        for (let wx = b.x + 6; wx < b.x + b.w - 8; wx += 12) {
          ctx.fillStyle = (wx + wy) % 3 === 0 ? '#555555' : '#ffff55';
          ctx.fillRect(wx, wy, 5, 7);
        }
      }
    }

    // Blast Craters
    ctx.fillStyle = '#0000aa';
    for (const c of stateRef.current.craters) {
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Gorillas
    const drawGorilla = (gx: number, gy: number) => {
      ctx.fillStyle = '#aa5500';
      ctx.fillRect(gx - 11, gy - 22, 22, 16);
      ctx.beginPath();
      ctx.arc(gx, gy - 27, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(gx - 14, gy - 20, 4, 12);
      ctx.fillRect(gx + 10, gy - 20, 4, 12);
      ctx.fillRect(gx - 9, gy - 6, 5, 6);
      ctx.fillRect(gx + 4, gy - 6, 5, 6);
    };
    drawGorilla(stateRef.current.g1.x, stateRef.current.g1.y);
    drawGorilla(stateRef.current.g2.x, stateRef.current.g2.y);

    // Flying Banana
    if (stateRef.current.banana?.active) {
      ctx.fillStyle = '#ffff55';
      ctx.beginPath();
      ctx.arc(stateRef.current.banana.x, stateRef.current.banana.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const generateCity = () => {
    const W = 600;
    const H = 340;
    const colors = ['#aa0000', '#00aaaa', '#aaaaaa'];
    const blds: Array<{ x: number; w: number; h: number; color: string }> = [];
    let x = 0;
    while (x < W) {
      const w = 52 + Math.floor(Math.random() * 24);
      const h = 75 + Math.floor(Math.random() * 145);
      blds.push({ x, w: Math.min(w, W - x), h, color: colors[blds.length % colors.length] });
      x += w + 2;
    }
    const b1 = blds[1];
    const b2 = blds[blds.length - 2];
    stateRef.current = {
      buildings: blds,
      craters: [],
      g1: { x: b1.x + b1.w / 2, y: H - b1.h },
      g2: { x: b2.x + b2.w / 2, y: H - b2.h },
      banana: null,
    };
    setWind(Math.round((Math.random() - 0.5) * 14));
    drawScene();
  };

  useEffect(() => {
    generateCity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const launchBanana = (angDeg: number, vel: number, who: 'p1' | 'p2') => {
    if (throwing) return;
    setThrowing(true);
    const rad = (angDeg * Math.PI) / 180;
    const dir = who === 'p1' ? 1 : -1;
    const origin = who === 'p1' ? stateRef.current.g1 : stateRef.current.g2;
    let t = 0;
    const x0 = origin.x;
    const y0 = origin.y - 32;
    const vx = Math.cos(rad) * vel * dir;
    const vy = -Math.sin(rad) * vel;

    const iv = window.setInterval(() => {
      t += 0.14;
      const bx = x0 + vx * t + 0.5 * (wind * 0.28) * t * t;
      const by = y0 + vy * t + 0.5 * 9.8 * t * t;
      stateRef.current.banana = { x: bx, y: by, active: true };
      drawScene();

      // Out of bounds
      if (bx < 0 || bx > 600 || by > 340) {
        clearInterval(iv);
        stateRef.current.banana = null;
        drawScene();
        setThrowing(false);
        const next = who === 'p1' ? 'p2' : 'p1';
        setTurn(next);
        if (next === 'p2') {
          setMsg('CPU Gorilla is aiming...');
          window.setTimeout(() => launchBanana(48 + Math.random() * 18, 56 + Math.random() * 22, 'p2'), 650);
        } else {
          setMsg('Your turn! Adjust Angle & Velocity.');
        }
        return;
      }

      // Check hit on opponent gorilla
      const target = who === 'p1' ? stateRef.current.g2 : stateRef.current.g1;
      if (Math.hypot(bx - target.x, by - (target.y - 14)) < 18) {
        clearInterval(iv);
        stateRef.current.banana = null;
        playSound('gameWin');
        setScores((s) => (who === 'p1' ? { ...s, p1: s.p1 + 1 } : { ...s, p2: s.p2 + 1 }));
        setMsg(who === 'p1' ? '💥 DIRECT BANANA HIT! Player 1 scores! New skyline!' : '💥 CPU Gorilla hit you! New skyline!');
        setThrowing(false);
        setTurn('p1');
        generateCity();
        return;
      }

      // Check building hit (outside existing craters)
      const inCrater = stateRef.current.craters.some((c) => Math.hypot(bx - c.x, by - c.y) < c.r);
      if (!inCrater && by > 0) {
        const hitBld = stateRef.current.buildings.some(
          (b) => bx >= b.x && bx <= b.x + b.w && by >= 340 - b.h
        );
        if (hitBld) {
          clearInterval(iv);
          stateRef.current.craters.push({ x: bx, y: by, r: 16 });
          stateRef.current.banana = null;
          playSound('ding');
          drawScene();
          setThrowing(false);
          const next = who === 'p1' ? 'p2' : 'p1';
          setTurn(next);
          if (next === 'p2') {
            setMsg('CPU Gorilla is aiming...');
            window.setTimeout(() => launchBanana(48 + Math.random() * 18, 56 + Math.random() * 22, 'p2'), 650);
          } else {
            setMsg('Your turn! Adjust Angle & Velocity.');
          }
        }
      }
    }, 28);
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0000aa', color: '#ffff55', fontFamily: 'monospace', padding: 10, gap: 8, alignItems: 'center' }}>
      <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>🦍 MS-DOS QBASIC GORILLA.BAS (1991)</strong>
        <span>Player 1: <b>{scores.p1}</b> | CPU: <b>{scores.p2}</b> | Wind: <b>{wind > 0 ? `+${wind} →` : `${wind} ←`}</b></span>
      </div>

      <canvas ref={canvasRef} width={600} height={340} style={{ width: '100%', maxWidth: 610, border: '2px solid #ffffff' }} />

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <label>
          Angle (1–89°):{' '}
          <input
            type="number"
            min={5}
            max={89}
            value={angle}
            onChange={(e) => setAngle(Number(e.target.value))}
            style={{ width: 52, padding: 3, fontFamily: 'inherit' }}
          />
        </label>
        <label>
          Velocity (15–120):{' '}
          <input
            type="number"
            min={15}
            max={120}
            value={velocity}
            onChange={(e) => setVelocity(Number(e.target.value))}
            style={{ width: 56, padding: 3, fontFamily: 'inherit' }}
          />
        </label>
        <button
          disabled={throwing || turn !== 'p1'}
          onClick={() => launchBanana(angle, velocity, 'p1')}
          style={{ padding: '5px 14px', background: '#ffff55', color: '#0000aa', fontWeight: 900, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          🍌 Throw Banana!
        </button>
        <span style={{ fontSize: 11.5, color: '#ffffff' }}>{msg}</span>
      </div>
    </div>
  );
};

/* ============================================================================
   2. PAC-CHOMP CLASSIC ARCADE MAZE
   ============================================================================ */
const PAC_MAP = [
  '###############',
  '#o.....#.....o#',
  '#.##.#.#.#.##.#',
  '#.............#',
  '#.##.#.#.#.##.#',
  '#....#...#....#',
  '####.# # #.####',
  '#......P......#',
  '#.##.#####.##.#',
  '#o...........o#',
  '###############',
];

export const PacChompApp: React.FC = () => {
  const { playSound } = useSound();
  const [grid, setGrid] = useState<string[][]>(() => PAC_MAP.map((r) => r.split('')));
  const [pac, setPac] = useState({ x: 7, y: 7 });
  const [ghosts, setGhosts] = useState([
    { x: 1, y: 1, color: '#ef4444' },
    { x: 13, y: 1, color: '#f472b6' },
    { x: 1, y: 9, color: '#38bdf8' },
  ]);
  const [power, setPower] = useState(0);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const reset = () => {
    const raw = PAC_MAP.map((r) => r.split(''));
    raw[7][7] = ' ';
    setGrid(raw);
    setPac({ x: 7, y: 7 });
    setGhosts([
      { x: 1, y: 1, color: '#ef4444' },
      { x: 13, y: 1, color: '#f472b6' },
      { x: 1, y: 9, color: '#38bdf8' },
    ]);
    setPower(0);
    setScore(0);
    setGameOver(false);
  };

  useEffect(() => {
    reset();
  }, []);

  const stepPac = (dx: number, dy: number) => {
    if (gameOver) return;
    const nx = pac.x + dx;
    const ny = pac.y + dy;
    const tile = grid[ny]?.[nx];
    if (!tile || tile === '#') return;
    const copy = grid.map((r) => [...r]);
    if (tile === '.') {
      copy[ny][nx] = ' ';
      setScore((s) => s + 10);
    } else if (tile === 'o') {
      copy[ny][nx] = ' ';
      setScore((s) => s + 50);
      setPower(14);
      playSound('ding');
    }
    setGrid(copy);
    setPac({ x: nx, y: ny });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w') stepPac(0, -1);
      if (e.key === 'ArrowDown' || e.key === 's') stepPac(0, 1);
      if (e.key === 'ArrowLeft' || e.key === 'a') stepPac(-1, 0);
      if (e.key === 'ArrowRight' || e.key === 'd') stepPac(1, 0);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  useEffect(() => {
    if (gameOver) return;
    const iv = window.setInterval(() => {
      setPower((p) => Math.max(0, p - 1));
      setGhosts((gs) =>
        gs.map((g) => {
          const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
          const valid = dirs
            .map(([dx, dy]) => ({ x: g.x + dx, y: g.y + dy }))
            .filter((p) => grid[p.y]?.[p.x] && grid[p.y][p.x] !== '#');
          if (valid.length === 0) return g;
          const pick = valid[Math.floor(Math.random() * valid.length)];
          if (pick.x === pac.x && pick.y === pac.y) {
            if (power > 0) {
              setScore((s) => s + 200);
              playSound('gameWin');
              return { ...g, x: 7, y: 5 };
            }
            playSound('error');
            setGameOver(true);
          }
          return { ...g, x: pick.x, y: pick.y };
        })
      );
    }, 420);
    return () => clearInterval(iv);
  }, [grid, pac, power, gameOver, playSound]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#000', color: '#fde047', padding: 12, gap: 8 }}>
      <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>🟡 PAC-CHOMP ARCADE (WASD / Arrows)</strong>
        <span>Score: <b>{score}</b> {power > 0 && '⚡ POWER PELLET!'}</span>
        <button onClick={reset} style={{ padding: '3px 10px', cursor: 'pointer' }}>Restart</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${grid[0].length}, 28px)`, background: '#020617', border: '3px solid #1d4ed8' }}>
        {grid.map((row, y) =>
          row.map((cell, x) => {
            const isPac = pac.x === x && pac.y === y;
            const ghost = ghosts.find((g) => g.x === x && g.y === y);
            return (
              <div
                key={`${x}-${y}`}
                style={{
                  width: 28,
                  height: 28,
                  background: cell === '#' ? '#1e3a8a' : '#000',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                }}
              >
                {ghost ? (
                  <span style={{ color: power > 0 ? '#60a5fa' : ghost.color }}>👻</span>
                ) : isPac ? (
                  '😮'
                ) : cell === '.' ? (
                  <span style={{ color: '#fef08a', fontSize: 10 }}>•</span>
                ) : cell === 'o' ? (
                  <span style={{ color: '#fde047', fontSize: 15 }}>●</span>
                ) : (
                  ''
                )}
              </div>
            );
          })
        )}
      </div>
      {gameOver && <div style={{ color: '#f87171', fontWeight: 800 }}>GAME OVER! Click Restart to play again.</div>}
    </div>
  );
};

/* ============================================================================
   3. CLASSIC HIGHWAY & RIVER FROGGER
   ============================================================================ */
export const FroggerClassicApp: React.FC = () => {
  const { playSound } = useSound();
  const [frog, setFrog] = useState({ x: 5, y: 8 });
  const [cars, setCars] = useState([
    { x: 1, y: 7, dx: 1 },
    { x: 6, y: 6, dx: -1 },
    { x: 3, y: 5, dx: 1 },
    { x: 8, y: 3, dx: -1 },
    { x: 2, y: 2, dx: 1 },
  ]);
  const [wins, setWins] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      setFrog((f) => {
        let nx = f.x;
        let ny = f.y;
        if (e.key === 'ArrowUp' || e.key === 'w') ny--;
        if (e.key === 'ArrowDown' || e.key === 's') ny++;
        if (e.key === 'ArrowLeft' || e.key === 'a') nx--;
        if (e.key === 'ArrowRight' || e.key === 'd') nx++;
        nx = Math.max(0, Math.min(10, nx));
        ny = Math.max(0, Math.min(8, ny));
        if (ny === 0) {
          playSound('gameWin');
          setWins((w) => w + 1);
          return { x: 5, y: 8 };
        }
        return { x: nx, y: ny };
      });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [playSound]);

  useEffect(() => {
    const iv = window.setInterval(() => {
      setCars((cs) => {
        const next = cs.map((c) => ({ ...c, x: (c.x + c.dx + 11) % 11 }));
        if (next.some((c) => c.x === frog.x && c.y === frog.y)) {
          playSound('error');
          setFrog({ x: 5, y: 8 });
        }
        return next;
      });
    }, 340);
    return () => clearInterval(iv);
  }, [frog, playSound]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#0f172a', color: '#4ade80', padding: 12, gap: 8 }}>
      <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}>
        <strong>🐸 CLASSIC HIGHWAY FROGGER (WASD / Arrows)</strong>
        <span>Frogs Home Safely: <b>{wins}</b></span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(11, 36px)', border: '3px solid #22c55e' }}>
        {Array.from({ length: 9 }).map((_, y) =>
          Array.from({ length: 11 }).map((__, x) => {
            const isFrog = frog.x === x && frog.y === y;
            const isCar = cars.some((c) => c.x === x && c.y === y);
            const bg = y === 0 ? '#14532d' : y === 4 || y === 8 ? '#3f6212' : '#1e293b';
            return (
              <div
                key={`${x}-${y}`}
                style={{ width: 36, height: 36, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}
              >
                {isFrog ? '🐸' : isCar ? '🚗' : y === 0 && x % 2 === 1 ? '🪷' : ''}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

/* ============================================================================
   4. 1972 CLASSIC PONG — PLAYER VS CPU
   ============================================================================ */
export const PongClassicApp: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [scores, setScores] = useState({ p: 0, cpu: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let py = 140;
    let cy = 140;
    let bx = 270;
    let by = 170;
    let vx = 4.4;
    let vy = 3.1;

    const onMove = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      py = Math.max(0, Math.min(canvas.height - 70, ((e.clientY - r.top) / r.height) * canvas.height - 35));
    };
    canvas.addEventListener('mousemove', onMove);

    let raf = 0;
    const loop = () => {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = '#334155';
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2, 0);
      ctx.lineTo(canvas.width / 2, canvas.height);
      ctx.stroke();
      ctx.setLineDash([]);

      bx += vx;
      by += vy;
      if (by < 8 || by > canvas.height - 8) vy *= -1;

      cy += (by - (cy + 35)) * 0.085;

      if (bx <= 26 && by >= py && by <= py + 70 && vx < 0) vx = Math.abs(vx) * 1.03;
      if (bx >= canvas.width - 26 && by >= cy && by <= cy + 70 && vx > 0) vx = -Math.abs(vx) * 1.03;

      if (bx < 0) {
        setScores((s) => ({ ...s, cpu: s.cpu + 1 }));
        bx = 270; by = 170; vx = 4.4;
      } else if (bx > canvas.width) {
        setScores((s) => ({ ...s, p: s.p + 1 }));
        bx = 270; by = 170; vx = -4.4;
      }

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(14, py, 10, 70);
      ctx.fillRect(canvas.width - 24, cy, 10, 70);
      ctx.fillRect(bx - 6, by - 6, 12, 12);

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener('mousemove', onMove);
    };
  }, []);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#000', color: '#fff', fontFamily: 'monospace', padding: 10, gap: 6 }}>
      <div style={{ width: '100%', display: 'flex', justifyContent: 'space-around', fontSize: 16, fontWeight: 900 }}>
        <span>YOU: {scores.p}</span>
        <span>🏓 1972 CLASSIC PONG</span>
        <span>CPU: {scores.cpu}</span>
      </div>
      <canvas ref={canvasRef} width={540} height={340} style={{ width: '100%', maxWidth: 550, border: '2px solid #fff' }} />
    </div>
  );
};

/* ============================================================================
   5. ALL 24 CLASSIC OLD PC GAMES VAULT LAUNCHER (`games-vault`)
   ============================================================================ */
export const FULL_24_CLASSIC_GAMES: Array<{
  appId: BuiltinAppId;
  name: string;
  icon: string;
  era: string;
  desc: string;
}> = [
  { appId: 'maze3d', name: '3D Brick Maze', icon: '/icons/maze3d.svg', era: 'Win95 OpenGL', desc: 'Playable 1st-person + Auto-Solve Screensaver with rats, OpenGL walls & flip rocks!' },
  { appId: 'oregon-trail', name: 'The Oregon Trail', icon: '/icons/oregon-trail.svg', era: '1985 MECC Lab', desc: 'Outfit your wagon, hunt bison, ford rivers & reach Willamette Valley!' },
  { appId: 'chips-challenge', name: "Chip's Challenge", icon: '/icons/chips-challenge.svg', era: 'WEP 1991', desc: 'Collect IC Chips, Flippers, Fire Boots & Keys to open the Exit Socket!' },
  { appId: 'rodents-revenge', name: "Rodent's Revenge", icon: '/icons/rodents-revenge.svg', era: 'WEP 1991', desc: 'Push green yarn blocks to trap wandering Cats into Swiss Cheese!' },
  { appId: 'pipe-dream', name: 'Pipe Dream', icon: '/icons/pipe-dream.svg', era: 'WEP 1991', desc: 'Connect pipe segments rapidly before green Fluro-Ooze spills!' },
  { appId: 'gorillas', name: 'QBasic GORILLA.BAS', icon: '/icons/bonzi.svg', era: 'MS-DOS 5.0', desc: 'Lob exploding bananas over EGA skyscrapers using Angle & Velocity!' },
  { appId: 'snake', name: 'QBasic NIBBLES / Snake', icon: '/icons/nibbles.svg', era: 'MS-DOS 5.0', desc: 'Authentic QBasic numbered Nibbles + Nokia 3310 LCD Green skin!' },
  { appId: 'purble-place', name: 'Purble Place', icon: '/icons/purble-place.svg', era: 'Win Classic', desc: 'Comfy Cakes conveyor bakery + Purble Pairs clover memory!' },
  { appId: 'breakout', name: 'DX-Ball Brick Breaker', icon: '/icons/dxball.svg', era: '1996 Shareware', desc: '60fps retro paddle & chrome ball brick-smashing arcade!' },
  { appId: 'pacman', name: 'Pac-Chomp Maze', icon: '/icons/luna48/gamepad.png', era: '1980 Arcade', desc: 'Eat dots & power pellets while dodging Blinky, Pinky & Inky!' },
  { appId: 'frogger', name: 'Classic Frogger', icon: '/icons/luna48/gamepad.png', era: '1981 Arcade', desc: 'Hop safely across busy highways to reach the lilypads!' },
  { appId: 'pong', name: '1972 Classic Pong', icon: '/icons/luna48/gamepad.png', era: '1972 Arcade', desc: 'Original white-on-black paddle tennis vs CPU!' },
  { appId: 'slingo', name: 'AOL Slingo Deluxe', icon: '/icons/slingo.svg', era: 'AOL Games', desc: 'Spin reels, match Bingo lines, Jokers, Cherubs & Devil Laugh!' },
  { appId: 'pinball', name: '3D Pinball Space Cadet', icon: '/icons/pinball.png', era: 'Plus! / XP', desc: 'Full WebAssembly port of Maxis Space Cadet Pinball with sound!' },
  { appId: 'solitaire', name: 'Klondike Solitaire', icon: '/icons/solitaire.png', era: 'Win 3.0 / XP', desc: 'Zero-lag drag & tap cards + cascading victory waterfall!' },
  { appId: 'spider', name: 'Spider Solitaire', icon: '/icons/spider.png', era: 'Win98 / XP', desc: '1, 2 & 4-Suit Spider Solitaire with live drag & click!' },
  { appId: 'freecell', name: 'FreeCell', icon: '/icons/freecell.png', era: 'Win95 / XP', desc: 'Every deal solvable with King centerpiece & 4 free cells!' },
  { appId: 'hearts', name: 'MS Hearts Network', icon: '/icons/heart.png', era: 'Win 3.11 / XP', desc: '4-player trick-taking Hearts against Pauline, Michele & Ben!' },
  { appId: 'minesweeper', name: 'Minesweeper', icon: '/icons/minesweeper/mine-icon.png', era: 'Win 3.1 / XP', desc: 'Beginner, Intermediate & Expert minefields with original sprites!' },
  { appId: 'skifree', name: 'SkiFree (Yeti!)', icon: '/icons/skifree.svg', era: 'WEP 1991', desc: 'Carve down the mountain & outrun the Abominable Snow Monster at 2000m!' },
  { appId: 'jezzball', name: 'JezzBall XP', icon: '/icons/jezzball.svg', era: 'WEP 1992', desc: 'Slice walls to trap bouncing atoms in 75%+ of the chamber!' },
  { appId: 'mahjong', name: 'Mahjong Titans', icon: '/icons/mahjong.svg', era: 'Classic Board', desc: 'Match free pairs of bamboo, character & dragon tiles!' },
  { appId: 'checkers', name: 'Internet Checkers', icon: '/icons/checkers.svg', era: 'MSN Gaming Zone', desc: 'Multi-jump king checkers against smart MSN bot!' },
  { appId: 'tetris', name: 'Tetris XP', icon: '/icons/tetris.svg', era: 'WEP 1990', desc: '7-bag Tetromino marathon with ghost piece & level speedups!' },
];

export const ClassicGamesVaultApp: React.FC = () => {
  const { openApp } = useOS();
  const [filter, setFilter] = useState('');

  const shown = FULL_24_CLASSIC_GAMES.filter(
    (g) =>
      g.name.toLowerCase().includes(filter.toLowerCase()) ||
      g.era.toLowerCase().includes(filter.toLowerCase()) ||
      g.desc.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0f172a', color: '#f8fafc', overflowY: 'auto' }}>
      <div
        style={{
          padding: '12px 16px',
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4c1d95 100%)',
          borderBottom: '2px solid #fbbf24',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <div>
          <div style={{ fontSize: 17, fontWeight: 900 }}>🕹️ Classic Old PC Games Vault — All 24 Legendary Titles</div>
          <div style={{ fontSize: 11.5, color: '#cbd5e1' }}>
            MS-DOS • Windows Entertainment Pack • Win95 3D Maze • School Computer Lab • AOL Games • Windows XP
          </div>
        </div>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search 24 classic games..."
          style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #94a3b8', background: '#0f172a', color: '#fff', fontSize: 12, width: 210 }}
        />
      </div>

      <div style={{ padding: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
        {shown.map((g) => (
          <div
            key={g.appId}
            onClick={() => openApp(g.appId)}
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: 9,
              padding: 10,
              cursor: 'pointer',
              display: 'flex',
              gap: 10,
              alignItems: 'flex-start',
            }}
          >
            <img src={g.icon} alt="" style={{ width: 36, height: 36, flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 800, fontSize: 13, color: '#fde047' }}>{g.name}</div>
              <div style={{ fontSize: 10, color: '#38bdf8', fontWeight: 700, marginBottom: 3 }}>{g.era}</div>
              <div style={{ fontSize: 11, color: '#cbd5e1', lineHeight: 1.35 }}>{g.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

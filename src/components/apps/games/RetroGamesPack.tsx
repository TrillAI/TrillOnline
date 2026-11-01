import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSound } from '../../../context/SoundContext';

/* ============================================================================
   1. THE OREGON TRAIL (1848 SCHOOL COMPUTER LAB EDITION)
   ============================================================================ */
const LANDMARKS = [
  { mile: 0, name: 'Independence, Missouri', river: false },
  { mile: 102, name: 'Kansas River Crossing', river: true },
  { mile: 185, name: 'Big Blue River Crossing', river: true },
  { mile: 304, name: 'Fort Kearney', river: false },
  { mile: 554, name: 'Chimney Rock', river: false },
  { mile: 640, name: 'Fort Laramie', river: false },
  { mile: 830, name: 'Independence Rock', river: false },
  { mile: 989, name: 'South Pass & Green River', river: true },
  { mile: 1150, name: 'Soda Springs', river: false },
  { mile: 1395, name: 'Snake River Crossing', river: true },
  { mile: 1648, name: 'Blue Mountains', river: false },
  { mile: 1860, name: 'The Dalles (Columbia River)', river: true },
  { mile: 2000, name: 'Willamette Valley, Oregon!', river: false },
];

export const OregonTrailApp: React.FC = () => {
  const { playSound } = useSound();
  const [stage, setStage] = useState<'setup' | 'trail' | 'river' | 'hunt' | 'won' | 'lost'>('setup');
  const [job, setJob] = useState<'banker' | 'carpenter' | 'farmer'>('banker');
  const [cash, setCash] = useState(800);
  const [food, setFood] = useState(500);
  const [oxen, setOxen] = useState(4);
  const [ammo, setAmmo] = useState(120);
  const [wheels, setWheels] = useState(2);
  const [miles, setMiles] = useState(0);
  const [day, setDay] = useState(1);
  const [health, setHealth] = useState(100);
  const [pace, setPace] = useState<'steady' | 'strenuous' | 'grueling'>('steady');
  const [log, setLog] = useState<string[]>([
    'Welcome to The Oregon Trail (1848)! Outfit your wagon in Independence, Missouri.',
  ]);
  const [huntTarget, setHuntTarget] = useState<{ x: number; y: number; active: boolean; shots: number; meat: number }>({
    x: 50,
    y: 50,
    active: false,
    shots: 8,
    meat: 0,
  });

  const startTrail = (selectedJob: 'banker' | 'carpenter' | 'farmer') => {
    setJob(selectedJob);
    const startCash = selectedJob === 'banker' ? 1100 : selectedJob === 'carpenter' ? 550 : 250;
    setCash(startCash);
    setFood(520);
    setOxen(4);
    setAmmo(140);
    setWheels(2);
    setMiles(0);
    setDay(1);
    setHealth(100);
    setStage('trail');
    setLog([
      `April 1, 1848 — Departed Independence, MO as a ${selectedJob.toUpperCase()} with $${startCash}, 520 lbs food, 4 oxen, and 140 bullets!`,
    ]);
  };

  const nextLandmark = LANDMARKS.find((l) => l.mile > miles) || LANDMARKS[LANDMARKS.length - 1];

  const travelDay = () => {
    if (food <= 0) {
      setHealth((h) => h - 18);
    }
    const speedBase = pace === 'steady' ? 18 : pace === 'strenuous' ? 26 : 33;
    const gain = Math.max(8, Math.round(speedBase * (oxen / 4) + (Math.random() * 8 - 3)));
    const targetMile = Math.min(2000, miles + gain);

    // Check if crossing a river landmark
    const crossed = LANDMARKS.find((l) => l.mile > miles && l.mile <= targetMile);
    const eaten = Math.min(food, pace === 'grueling' ? 16 : 12);
    setFood((f) => Math.max(0, f - eaten));
    setDay((d) => d + 1);
    setMiles(targetMile);

    let eventMsg = `Day ${day + 1}: Traveled ${gain} miles (${targetMile}/2000 mi). Ate ${eaten} lbs of rations.`;
    let hpDelta = pace === 'grueling' ? -4 : pace === 'strenuous' ? -1 : 2;

    const roll = Math.random();
    if (roll < 0.09) {
      eventMsg = '⚠️ OH NO! A party member has contracted DYSENTERY! (-16 Health — rest to recover!)';
      hpDelta -= 16;
      playSound('error');
    } else if (roll < 0.15) {
      eventMsg = '🐍 Rattlesnake bite on the prairie trail! (-12 Health)';
      hpDelta -= 12;
    } else if (roll < 0.21) {
      if (wheels > 0) {
        setWheels((w) => w - 1);
        eventMsg = '🛞 Broken wagon wheel! Replaced using 1 spare wheel.';
      } else {
        hpDelta -= 10;
        eventMsg = '🛞 Broken wagon wheel with no spares! Lost time making repairs.';
      }
    } else if (roll < 0.28) {
      const berries = 35 + Math.floor(Math.random() * 35);
      setFood((f) => f + berries);
      eventMsg = `🫐 Found wild prairie blackberries! (+${berries} lbs food)`;
      playSound('ding');
    }

    const nextHp = Math.min(100, health + hpDelta);
    setHealth(nextHp);
    setLog((prev) => [eventMsg, ...prev.slice(0, 7)]);

    if (nextHp <= 0) {
      setStage('lost');
      return;
    }
    if (targetMile >= 2000) {
      playSound('gameWin');
      setStage('won');
      return;
    }
    if (crossed) {
      setLog((prev) => [`📍 Reached ${crossed.name} (${crossed.mile} mi)!`, ...prev.slice(0, 7)]);
      if (crossed.river) {
        setStage('river');
      }
    }
  };

  const handleRiverChoice = (method: 'ford' | 'caulk' | 'ferry') => {
    if (method === 'ferry' && cash >= 25) {
      setCash((c) => c - 25);
      setLog((prev) => ['⛴️ Paid $25 for the ferry — crossed safely without losing supplies!', ...prev]);
      setStage('trail');
      return;
    }
    const risk = method === 'ford' ? 0.35 : 0.2;
    if (Math.random() < risk) {
      setFood((f) => Math.max(0, f - 65));
      setHealth((h) => Math.max(8, h - 14));
      playSound('error');
      setLog((prev) => ['🌊 Wagon tipped in deep rapids! Lost 65 lbs of food and got soaked!', ...prev]);
    } else {
      playSound('ding');
      setLog((prev) => [`🌊 Successfully crossed the river (${method})!`, ...prev]);
    }
    setStage('trail');
  };

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: '#050b07',
        color: '#4ade80',
        fontFamily: '"Courier New", monospace',
        padding: 14,
        gap: 10,
        overflowY: 'auto',
      }}
    >
      {/* Classic Apple II / DOS Banner + Covered Wagon Scene */}
      <div style={{ border: '2px double #4ade80', padding: 10, background: '#07140b' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <strong style={{ fontSize: 16, color: '#bbf7d0' }}>🐂 THE OREGON TRAIL (MECC 1985 / DOS Classic)</strong>
          <span style={{ fontSize: 12 }}>
            Miles: <b>{miles}</b> / 2,000 • Day <b>{day}</b>
          </span>
        </div>

        {/* Animated EGA Pixel Prairie & Covered Wagon SVG */}
        <svg viewBox="0 0 600 115" style={{ width: '100%', height: 110, background: '#091e2c', border: '1px solid #22c55e' }}>
          {/* Stars / Mountains */}
          <polygon points="0,82 70,38 145,82" fill="#1e3a5f" />
          <polygon points="110,82 205,28 295,82" fill="#254b7c" />
          <polygon points="270,82 360,44 450,82" fill="#1e3a5f" />
          <circle cx="530" cy="24" r="13" fill="#fde047" />
          {/* Prairie Ground */}
          <rect x="0" y="82" width="600" height="33" fill="#14532d" />
          <line x1="0" y1="95" x2="600" y2="95" stroke="#ca8a04" strokeWidth="3" strokeDasharray="14 8" />
          {/* Destination Progress Marker */}
          <g transform={`translate(${40 + Math.min(460, (miles / 2000) * 460)}, 46)`}>
            {/* Oxen */}
            <rect x="-36" y="22" width="22" height="13" rx="2" fill="#92400e" />
            <circle cx="-39" cy="24" r="5" fill="#78350f" />
            <line x1="-14" y1="28" x2="4" y2="28" stroke="#fde047" strokeWidth="2" />
            {/* Canvas Bonnet + Wood Bed */}
            <path d="M 4 22 C 4 0, 52 0, 52 22 Z" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.5" />
            <rect x="2" y="22" width="52" height="12" fill="#b45309" stroke="#78350f" />
            <circle cx="13" cy="36" r="7" fill="none" stroke="#fde047" strokeWidth="2.5" />
            <circle cx="43" cy="36" r="7" fill="none" stroke="#fde047" strokeWidth="2.5" />
          </g>
        </svg>
      </div>

      {stage === 'setup' && (
        <div style={{ border: '1px solid #22c55e', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fde047' }}>
            Many kinds of people made the trip to Oregon. You may:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
            <button
              onClick={() => startTrail('banker')}
              style={{ padding: 12, background: '#0f2918', color: '#4ade80', border: '1px solid #4ade80', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}
            >
              <b>1. Be a Banker from Boston</b>
              <div style={{ fontSize: 11, color: '#bbf7d0', marginTop: 4 }}>$1,100 cash • Easiest start (1x score)</div>
            </button>
            <button
              onClick={() => startTrail('carpenter')}
              style={{ padding: 12, background: '#0f2918', color: '#4ade80', border: '1px solid #4ade80', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}
            >
              <b>2. Be a Carpenter from Ohio</b>
              <div style={{ fontSize: 11, color: '#bbf7d0', marginTop: 4 }}>$550 cash • Balanced challenge (2x score)</div>
            </button>
            <button
              onClick={() => startTrail('farmer')}
              style={{ padding: 12, background: '#0f2918', color: '#4ade80', border: '1px solid #4ade80', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}
            >
              <b>3. Be a Farmer from Illinois</b>
              <div style={{ fontSize: 11, color: '#bbf7d0', marginTop: 4 }}>$250 cash • True pioneer (3x score!)</div>
            </button>
          </div>
        </div>
      )}

      {stage === 'trail' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6, fontSize: 12 }}>
            <div style={{ border: '1px solid #22c55e', padding: 6 }}>❤️ Health: <b>{health}%</b></div>
            <div style={{ border: '1px solid #22c55e', padding: 6 }}>🥩 Food: <b>{food} lb</b></div>
            <div style={{ border: '1px solid #22c55e', padding: 6 }}>🐂 Oxen: <b>{oxen}</b></div>
            <div style={{ border: '1px solid #22c55e', padding: 6 }}>🔫 Ammo: <b>{ammo}</b></div>
            <div style={{ border: '1px solid #22c55e', padding: 6 }}>🛞 Spares: <b>{wheels}</b></div>
            <div style={{ border: '1px solid #22c55e', padding: 6 }}>💵 Cash: <b>${cash}</b></div>
          </div>

          <div style={{ fontSize: 12, color: '#fde047' }}>
            Next Landmark: <b>{nextLandmark.name}</b> ({Math.max(0, nextLandmark.mile - miles)} miles ahead)
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button
              onClick={travelDay}
              style={{ padding: '8px 14px', background: '#22c55e', color: '#052e16', fontWeight: 900, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              ▶ Continue on Trail
            </button>
            <button
              onClick={() => {
                setHealth((h) => Math.min(100, h + 14));
                setFood((f) => Math.max(0, f - 10));
                setDay((d) => d + 1);
                setLog((p) => ['⛺ Rested inside the wagon for 1 day (+14 Health).', ...p.slice(0, 7)]);
              }}
              style={{ padding: '8px 12px', background: '#0f2918', color: '#4ade80', border: '1px solid #4ade80', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              ⛺ Rest (+Health)
            </button>
            <button
              onClick={() => {
                if (ammo < 5) return;
                setHuntTarget({ x: 20 + Math.random() * 60, y: 25 + Math.random() * 50, active: true, shots: 6, meat: 0 });
                setStage('hunt');
              }}
              style={{ padding: '8px 12px', background: '#0f2918', color: '#fde047', border: '1px solid #fde047', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              🦬 Go Hunting
            </button>
            <button
              onClick={() => {
                if (cash >= 30) {
                  setCash((c) => c - 30);
                  setFood((f) => f + 120);
                  setAmmo((a) => a + 20);
                  setLog((p) => ['🏪 Bought 120 lbs food & 20 bullets from trading post (-$30).', ...p.slice(0, 7)]);
                }
              }}
              style={{ padding: '8px 12px', background: '#0f2918', color: '#38bdf8', border: '1px solid #38bdf8', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              🏪 Buy Supplies ($30)
            </button>
            <select
              value={pace}
              onChange={(e) => setPace(e.target.value as 'steady' | 'strenuous' | 'grueling')}
              style={{ background: '#07140b', color: '#4ade80', border: '1px solid #4ade80', padding: '6px 8px', fontFamily: 'inherit' }}
            >
              <option value="steady">Pace: Steady</option>
              <option value="strenuous">Pace: Strenuous</option>
              <option value="grueling">Pace: Grueling</option>
            </select>
          </div>
        </>
      )}

      {stage === 'river' && (
        <div style={{ border: '2px solid #38bdf8', padding: 12, background: '#082f49', color: '#e0f2fe' }}>
          <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 8 }}>
            🌊 RIVER CROSSING AHEAD! Depth: 4.8 ft, Swift Current. Choose how to cross:
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => handleRiverChoice('ford')} style={{ padding: '8px 12px', cursor: 'pointer' }}>
              1. Attempt to Ford the River (Free, Risky)
            </button>
            <button onClick={() => handleRiverChoice('caulk')} style={{ padding: '8px 12px', cursor: 'pointer' }}>
              2. Caulk Wagon &amp; Float It Across (Moderate)
            </button>
            <button onClick={() => handleRiverChoice('ferry')} style={{ padding: '8px 12px', cursor: 'pointer' }}>
              3. Take the Ferry ($25 — Safest!)
            </button>
          </div>
        </div>
      )}

      {stage === 'hunt' && (
        <div style={{ border: '1px solid #fde047', padding: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span>🎯 Click the moving Bison! Shots left: <b>{huntTarget.shots}</b> • Meat: <b>{huntTarget.meat} lbs</b></span>
            <button
              onClick={() => {
                const carried = Math.min(200, huntTarget.meat);
                setFood((f) => f + carried);
                setLog((p) => [`🦬 Returned from hunt carrying ${carried} lbs of meat!`, ...p.slice(0, 7)]);
                setStage('trail');
              }}
              style={{ padding: '3px 10px', cursor: 'pointer' }}
            >
              Finish Hunt
            </button>
          </div>
          <div
            onClick={() => {
              if (huntTarget.shots <= 0) return;
              setAmmo((a) => Math.max(0, a - 1));
              setHuntTarget((h) => ({ ...h, shots: h.shots - 1, x: 10 + Math.random() * 75, y: 15 + Math.random() * 65 }));
            }}
            style={{ position: 'relative', height: 150, background: '#14532d', border: '1px solid #4ade80', cursor: 'crosshair' }}
          >
            {huntTarget.shots > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  playSound('ding');
                  setAmmo((a) => Math.max(0, a - 1));
                  setHuntTarget((h) => ({
                    shots: h.shots - 1,
                    meat: h.meat + 75,
                    active: true,
                    x: 10 + Math.random() * 75,
                    y: 15 + Math.random() * 65,
                  }));
                }}
                style={{
                  position: 'absolute',
                  left: `${huntTarget.x}%`,
                  top: `${huntTarget.y}%`,
                  fontSize: 28,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'crosshair',
                }}
              >
                🦬
              </button>
            )}
          </div>
        </div>
      )}

      {(stage === 'won' || stage === 'lost') && (
        <div style={{ border: '2px solid #fde047', padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: stage === 'won' ? '#fde047' : '#f87171' }}>
            {stage === 'won'
              ? `🎉 CONGRATULATIONS! You reached Willamette Valley, Oregon in ${day} days! Score: ${
                  (health * 10 + food + cash) * (job === 'farmer' ? 3 : job === 'carpenter' ? 2 : 1)
                }`
              : '🪦 HERE LIES PIONEER — You succumbed to the perils of the Oregon Trail.'}
          </div>
          <button
            onClick={() => setStage('setup')}
            style={{ marginTop: 10, padding: '8px 16px', background: '#22c55e', color: '#052e16', fontWeight: 800, border: 'none', cursor: 'pointer' }}
          >
            Play Again
          </button>
        </div>
      )}

      {/* Trail Journal */}
      <div style={{ flex: 1, border: '1px solid #166534', padding: 8, background: '#040906', fontSize: 11.5 }}>
        <div style={{ color: '#86efac', fontWeight: 700, marginBottom: 4 }}>📜 Pioneer Trail Log:</div>
        {log.map((entry, idx) => (
          <div key={idx} style={{ opacity: 1 - idx * 0.1, marginBottom: 3 }}>
            &gt; {entry}
          </div>
        ))}
      </div>
    </div>
  );
};

/* ============================================================================
   2. CHIP'S CHALLENGE (MICROSOFT ENTERTAINMENT PACK)
   ============================================================================ */
// Tile legend: '#' wall, '.' floor, 'C' chip, 'S' socket, 'E' exit, 'W' water, 'F' fire, 'B' flippers, 'R' fireboots, 'k' gold key, 'D' gold door
const CHIPS_LEVELS: string[][] = [
  [
    '###########',
    '#P..C.#..E#',
    '#.##..#.#S#',
    '#k..#...#.#',
    '###D#####.#',
    '#B..WWWW..#',
    '#C........#',
    '#..FFFF.RC#',
    '###########',
  ],
  [
    '###########',
    '#P.k#C...E#',
    '#.#.#.###S#',
    '#.#...#C..#',
    '#D#####.###',
    '#...W.F..R#',
    '#B#.W.F.#C#',
    '#C..W...#.#',
    '###########',
  ],
];

export const ChipsChallengeApp: React.FC = () => {
  const { playSound } = useSound();
  const [lvlIdx, setLvlIdx] = useState(0);
  const [board, setBoard] = useState<string[][]>(() => CHIPS_LEVELS[0].map((r) => r.split('')));
  const [player, setPlayer] = useState<{ x: number; y: number }>({ x: 1, y: 1 });
  const [chipsLeft, setChipsLeft] = useState(4);
  const [inv, setInv] = useState({ key: false, flippers: false, fireboots: false });
  const [status, setStatus] = useState('Collect all IC Computer Chips to open the Socket!');

  const loadLevel = useCallback((idx: number) => {
    const raw = CHIPS_LEVELS[idx % CHIPS_LEVELS.length].map((r) => r.split(''));
    let px = 1;
    let py = 1;
    let chips = 0;
    for (let y = 0; y < raw.length; y++) {
      for (let x = 0; x < raw[y].length; x++) {
        if (raw[y][x] === 'P') {
          px = x;
          py = y;
          raw[y][x] = '.';
        } else if (raw[y][x] === 'C') {
          chips++;
        }
      }
    }
    setBoard(raw);
    setPlayer({ x: px, y: py });
    setChipsLeft(chips);
    setInv({ key: false, flippers: false, fireboots: false });
    setStatus(`Lesson ${idx + 1}: Collect all ${chips} IC Chips!`);
  }, []);

  useEffect(() => {
    loadLevel(lvlIdx);
  }, [lvlIdx, loadLevel]);

  const stepMove = useCallback(
    (dx: number, dy: number) => {
      const nx = player.x + dx;
      const ny = player.y + dy;
      const tile = board[ny]?.[nx];
      if (!tile || tile === '#') return;

      if (tile === 'D' && !inv.key) {
        setStatus('🔒 Locked! Grab the Gold Key first.');
        return;
      }
      if (tile === 'S' && chipsLeft > 0) {
        setStatus(`🔌 Socket requires ${chipsLeft} more IC Chip(s)!`);
        return;
      }
      if (tile === 'W' && !inv.flippers) {
        playSound('error');
        setStatus('💦 BUMMER! Chip can’t swim without Flippers! Restarting level...');
        loadLevel(lvlIdx);
        return;
      }
      if (tile === 'F' && !inv.fireboots) {
        playSound('error');
        setStatus('🔥 BUMMER! Don’t step in Fire without Fire Boots! Restarting...');
        loadLevel(lvlIdx);
        return;
      }

      const next = board.map((r) => [...r]);
      if (tile === 'C') {
        next[ny][nx] = '.';
        setChipsLeft((c) => c - 1);
        playSound('ding');
      } else if (tile === 'k') {
        next[ny][nx] = '.';
        setInv((i) => ({ ...i, key: true }));
        setStatus('🔑 Picked up Gold Key!');
      } else if (tile === 'B') {
        next[ny][nx] = '.';
        setInv((i) => ({ ...i, flippers: true }));
        setStatus('🏊 Picked up Water Flippers!');
      } else if (tile === 'R') {
        next[ny][nx] = '.';
        setInv((i) => ({ ...i, fireboots: true }));
        setStatus('🥾 Picked up Fire Boots!');
      } else if (tile === 'D' || tile === 'S') {
        next[ny][nx] = '.';
      } else if (tile === 'E') {
        playSound('gameWin');
        setLvlIdx((l) => l + 1);
        return;
      }

      setBoard(next);
      setPlayer({ x: nx, y: ny });
    },
    [player, board, inv, chipsLeft, lvlIdx, loadLevel, playSound]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w') stepMove(0, -1);
      if (e.key === 'ArrowDown' || e.key === 's') stepMove(0, 1);
      if (e.key === 'ArrowLeft' || e.key === 'a') stepMove(-1, 0);
      if (e.key === 'ArrowRight' || e.key === 'd') stepMove(1, 0);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stepMove]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#c0c0c0', padding: 12, gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#000080', color: '#fff', padding: '6px 12px', fontWeight: 700 }}>
        <span>🔌 Chip&apos;s Challenge — Lesson {(lvlIdx % CHIPS_LEVELS.length) + 1}</span>
        <span>CHIPS LEFT: <b style={{ color: '#fde047', fontSize: 15 }}>{chipsLeft}</b></span>
        <button onClick={() => loadLevel(lvlIdx)} style={{ padding: '2px 8px', cursor: 'pointer' }}>Restart</button>
      </div>

      <div style={{ display: 'flex', gap: 14, flex: 1, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${board[0].length}, 34px)`,
            gap: 1,
            background: '#475569',
            border: '4px inset #94a3b8',
          }}
        >
          {board.map((row, y) =>
            row.map((cell, x) => {
              const isChip = player.x === x && player.y === y;
              let bg = '#cbd5e1';
              let icon = '';
              if (cell === '#') bg = '#475569';
              if (cell === 'W') { bg = '#0284c7'; icon = '🌊'; }
              if (cell === 'F') { bg = '#dc2626'; icon = '🔥'; }
              if (cell === 'C') icon = '💾';
              if (cell === 'S') { bg = '#78350f'; icon = '🔌'; }
              if (cell === 'E') { bg = '#16a34a'; icon = '🌀'; }
              if (cell === 'k') icon = '🔑';
              if (cell === 'D') { bg = '#ca8a04'; icon = '🚪'; }
              if (cell === 'B') icon = '🐬';
              if (cell === 'R') icon = '🥾';
              if (isChip) icon = '🤓';
              return (
                <div
                  key={`${x}-${y}`}
                  onClick={() => {
                    if (Math.abs(x - player.x) + Math.abs(y - player.y) === 1) {
                      stepMove(x - player.x, y - player.y);
                    }
                  }}
                  style={{
                    width: 34,
                    height: 34,
                    background: bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 19,
                    cursor: 'pointer',
                  }}
                >
                  {icon}
                </div>
              );
            })
          )}
        </div>

        <div style={{ width: 170, background: '#e2e8f0', border: '2px inset #fff', padding: 10, fontSize: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>🎒 Inventory</div>
          <div>🔑 Key: <b>{inv.key ? 'YES' : '—'}</b></div>
          <div>🐬 Flippers: <b>{inv.flippers ? 'YES' : '—'}</b></div>
          <div>🥾 Fire Boots: <b>{inv.fireboots ? 'YES' : '—'}</b></div>
          <hr style={{ margin: '8px 0' }} />
          <div style={{ fontSize: 11, color: '#334155' }}>{status}</div>
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
   3. RODENT'S REVENGE (PUSH BLOCKS TO TRAP CATS INTO SWISS CHEESE!)
   ============================================================================ */
export const RodentsRevengeApp: React.FC = () => {
  const { playSound } = useSound();
  const SIZE = 11;

  const createArena = () => {
    const g: string[][] = Array.from({ length: SIZE }, (_, y) =>
      Array.from({ length: SIZE }, (__, x) => {
        if (x === 0 || y === 0 || x === SIZE - 1 || y === SIZE - 1) return '#';
        if (x >= 3 && x <= 7 && y >= 3 && y <= 7 && !(x === 5 && y === 5)) return 'B';
        return '.';
      })
    );
    return g;
  };

  const [grid, setGrid] = useState<string[][]>(createArena);
  const [mouse, setMouse] = useState({ x: 5, y: 5 });
  const [cats, setCats] = useState<Array<{ x: number; y: number }>>([
    { x: 1, y: 1 },
    { x: SIZE - 2, y: SIZE - 2 },
  ]);
  const [score, setScore] = useState(0);
  const [msg, setMsg] = useState('Use Arrow Keys / WASD to push green blocks and trap every Cat into Cheese!');

  const resetGame = () => {
    setGrid(createArena());
    setMouse({ x: 5, y: 5 });
    setCats([
      { x: 1, y: 1 },
      { x: SIZE - 2, y: SIZE - 2 },
    ]);
    setScore(0);
    setMsg('New game! Push blocks so the cats have nowhere to move!');
  };

  const moveMouse = useCallback(
    (dx: number, dy: number) => {
      const nx = mouse.x + dx;
      const ny = mouse.y + dy;
      const cell = grid[ny]?.[nx];
      if (!cell || cell === '#') return;

      const nextGrid = grid.map((r) => [...r]);

      if (cell === 'B') {
        // Push chain of movable blocks!
        let cx = nx;
        let cy = ny;
        while (nextGrid[cy]?.[cx] === 'B') {
          cx += dx;
          cy += dy;
        }
        if (
          !nextGrid[cy]?.[cx] ||
          nextGrid[cy][cx] === '#' ||
          cats.some((cat) => cat.x === cx && cat.y === cy)
        ) {
          return; // Blocked!
        }
        nextGrid[cy][cx] = 'B';
        nextGrid[ny][nx] = '.';
      } else if (cell === 'C') {
        nextGrid[ny][nx] = '.';
        setScore((s) => s + 250);
        playSound('ding');
        setMsg('🧀 Yum! Ate Swiss Cheese (+250 pts)!');
      }

      setGrid(nextGrid);
      setMouse({ x: nx, y: ny });
    },
    [mouse, grid, cats, playSound]
  );

  // Cat AI tick every 750ms
  useEffect(() => {
    const iv = window.setInterval(() => {
      setCats((prevCats) => {
        if (prevCats.length === 0) return prevCats;
        const dirs = [
          [1, 0], [-1, 0], [0, 1], [0, -1],
          [1, 1], [1, -1], [-1, 1], [-1, -1],
        ];
        let trappedAll = true;
        const moved = prevCats.map((cat) => {
          const valid = dirs
            .map(([dx, dy]) => ({ x: cat.x + dx, y: cat.y + dy }))
            .filter(
              (p) =>
                (grid[p.y]?.[p.x] === '.' || grid[p.y]?.[p.x] === 'C') &&
                !prevCats.some((o) => o !== cat && o.x === p.x && o.y === p.y)
            );
          if (valid.length === 0) return cat;
          trappedAll = false;
          valid.sort(
            (a, b) =>
              Math.hypot(a.x - mouse.x, a.y - mouse.y) - Math.hypot(b.x - mouse.x, b.y - mouse.y)
          );
          return valid[0];
        });

        if (trappedAll) {
          playSound('gameWin');
          setGrid((g) => {
            const copy = g.map((r) => [...r]);
            for (const c of prevCats) copy[c.y][c.x] = 'C';
            return copy;
          });
          setScore((s) => s + 500);
          setMsg('🎉 Trapped all Cats into Swiss Cheese! Spawning next wave...');
          window.setTimeout(() => {
            setCats([
              { x: 1, y: SIZE - 2 },
              { x: SIZE - 2, y: 1 },
            ]);
          }, 1400);
          return [];
        }

        if (moved.some((c) => c.x === mouse.x && c.y === mouse.y)) {
          playSound('error');
          setMsg('😿 Caught by a Cat! Resetting mouse to center...');
          setMouse({ x: 5, y: 5 });
        }
        return moved;
      });
    }, 780);
    return () => clearInterval(iv);
  }, [grid, mouse, playSound]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w') moveMouse(0, -1);
      if (e.key === 'ArrowDown' || e.key === 's') moveMouse(0, 1);
      if (e.key === 'ArrowLeft' || e.key === 'a') moveMouse(-1, 0);
      if (e.key === 'ArrowRight' || e.key === 'd') moveMouse(1, 0);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [moveMouse]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#c0c0c0', padding: 10, gap: 8 }}>
      <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', background: '#14532d', color: '#fff', padding: '6px 12px', fontWeight: 700 }}>
        <span>🐭 Rodent&apos;s Revenge (1991)</span>
        <span>Score: <b style={{ color: '#fde047' }}>{score}</b></span>
        <button onClick={resetGame} style={{ padding: '2px 8px', cursor: 'pointer' }}>New Game</button>
      </div>
      <div style={{ fontSize: 11.5 }}>{msg}</div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${SIZE}, 34px)`, gap: 1, background: '#334155', border: '3px inset #64748b' }}>
        {grid.map((row, y) =>
          row.map((cell, x) => {
            const isMouse = mouse.x === x && mouse.y === y;
            const isCat = cats.some((c) => c.x === x && c.y === y);
            return (
              <div
                key={`${x}-${y}`}
                onClick={() => {
                  if (Math.abs(x - mouse.x) + Math.abs(y - mouse.y) === 1) {
                    moveMouse(x - mouse.x, y - mouse.y);
                  }
                }}
                style={{
                  width: 34,
                  height: 34,
                  background: cell === '#' ? '#475569' : cell === 'B' ? '#84cc16' : '#fef9c3',
                  border: cell === 'B' ? '2px outset #bef264' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 19,
                  cursor: 'pointer',
                }}
              >
                {isCat ? '🐱' : isMouse ? '🐭' : cell === 'C' ? '🧀' : ''}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

/* ============================================================================
   4. PIPE DREAM / PIPE MANIA (CONNECT PIPES BEFORE GREEN OOZE SPILLS!)
   ============================================================================ */
type PipeKind = 'NS' | 'EW' | 'NE' | 'NW' | 'SE' | 'SW' | 'CROSS';
const PIPE_GLYPH: Record<PipeKind, string> = {
  NS: '┃',
  EW: '━',
  NE: '┗',
  NW: '┛',
  SE: '┏',
  SW: '┓',
  CROSS: '╋',
};
const PIPE_OPENS: Record<PipeKind, Array<'N' | 'S' | 'E' | 'W'>> = {
  NS: ['N', 'S'],
  EW: ['E', 'W'],
  NE: ['N', 'E'],
  NW: ['N', 'W'],
  SE: ['S', 'E'],
  SW: ['S', 'W'],
  CROSS: ['N', 'S', 'E', 'W'],
};
const ALL_PIPES: PipeKind[] = ['NS', 'EW', 'NE', 'NW', 'SE', 'SW', 'CROSS'];

export const PipeDreamApp: React.FC = () => {
  const { playSound } = useSound();
  const GW = 9;
  const GH = 7;

  const randPipe = (): PipeKind => ALL_PIPES[Math.floor(Math.random() * ALL_PIPES.length)];

  const [cells, setCells] = useState<Array<Array<{ pipe: PipeKind | null; filled: boolean }>>>(() =>
    Array.from({ length: GH }, () => Array.from({ length: GW }, () => ({ pipe: null, filled: false })))
  );
  const [queue, setQueue] = useState<PipeKind[]>(() => Array.from({ length: 5 }, randPipe));
  const [ooze, setOoze] = useState<{ x: number; y: number; from: 'N' | 'S' | 'E' | 'W'; countdown: number; steps: number; over: boolean; won: boolean }>({
    x: 1,
    y: 3,
    from: 'W',
    countdown: 8,
    steps: 0,
    over: false,
    won: false,
  });

  const resetPipes = useCallback(() => {
    const g = Array.from({ length: GH }, () =>
      Array.from({ length: GW }, () => ({ pipe: null as PipeKind | null, filled: false }))
    );
    g[3][1] = { pipe: 'EW', filled: true };
    setCells(g);
    setQueue(Array.from({ length: 5 }, randPipe));
    setOoze({ x: 1, y: 3, from: 'W', countdown: 8, steps: 0, over: false, won: false });
  }, []);

  useEffect(() => {
    resetPipes();
  }, [resetPipes]);

  useEffect(() => {
    if (ooze.over) return;
    const iv = window.setInterval(() => {
      setOoze((st) => {
        if (st.over) return st;
        if (st.countdown > 0) return { ...st, countdown: st.countdown - 1 };

        const curPipe = cells[st.y]?.[st.x]?.pipe;
        if (!curPipe) return { ...st, over: true };
        const opens = PIPE_OPENS[curPipe];
        const outDir = opens.find((d) => d !== st.from) || opens[0];
        const delta: Record<'N' | 'S' | 'E' | 'W', [number, number, 'N' | 'S' | 'E' | 'W']> = {
          N: [0, -1, 'S'],
          S: [0, 1, 'N'],
          E: [1, 0, 'W'],
          W: [-1, 0, 'E'],
        };
        const [dx, dy, enterFrom] = delta[outDir];
        const nx = st.x + dx;
        const ny = st.y + dy;
        const target = cells[ny]?.[nx];
        if (!target || !target.pipe || !PIPE_OPENS[target.pipe].includes(enterFrom)) {
          if (st.steps >= 10) {
            playSound('gameWin');
            return { ...st, over: true, won: true };
          }
          playSound('error');
          return { ...st, over: true, won: false };
        }
        setCells((prev) => {
          const copy = prev.map((r) => r.map((c) => ({ ...c })));
          copy[ny][nx].filled = true;
          return copy;
        });
        playSound('ding');
        return { ...st, x: nx, y: ny, from: enterFrom, steps: st.steps + 1 };
      });
    }, 1150);
    return () => clearInterval(iv);
  }, [cells, ooze.over, playSound]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#1e293b', color: '#fff', padding: 12, gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>🧪 Pipe Dream — Connect at least 10 pipes!</strong>
        <span>
          {ooze.over
            ? ooze.won
              ? '🎉 LEVEL CLEARED!'
              : '💥 OOZE SPILLED!'
            : ooze.countdown > 0
            ? `Ooze flows in ${ooze.countdown}s`
            : `Pipes Filled: ${ooze.steps}/10`}
        </span>
        <button onClick={resetPipes} style={{ padding: '4px 10px', cursor: 'pointer' }}>New Board</button>
      </div>

      <div style={{ display: 'flex', gap: 14, alignItems: 'center', justifyContent: 'center' }}>
        {/* Next Queue */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>NEXT</span>
          {queue.map((p, i) => (
            <div
              key={i}
              style={{
                width: 42,
                height: 42,
                background: i === 0 ? '#fde047' : '#334155',
                color: i === 0 ? '#0f172a' : '#fff',
                fontWeight: 900,
                fontSize: 26,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 6,
              }}
            >
              {PIPE_GLYPH[p]}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${GW}, 44px)`, gap: 2, background: '#0f172a', padding: 4 }}>
          {cells.map((row, y) =>
            row.map((c, x) => (
              <div
                key={`${x}-${y}`}
                onClick={() => {
                  if (ooze.over || c.filled) return;
                  const nextPiece = queue[0];
                  setCells((prev) => {
                    const copy = prev.map((r) => r.map((cell) => ({ ...cell })));
                    copy[y][x].pipe = nextPiece;
                    return copy;
                  });
                  setQueue((q) => [...q.slice(1), randPipe()]);
                }}
                style={{
                  width: 44,
                  height: 44,
                  background: c.filled ? '#14532d' : '#334155',
                  color: c.filled ? '#4ade80' : '#e2e8f0',
                  fontSize: 28,
                  fontWeight: 900,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  border: x === 1 && y === 3 ? '2px solid #4ade80' : '1px solid #475569',
                }}
              >
                {c.pipe ? PIPE_GLYPH[c.pipe] : ''}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
   5. PURBLE PLACE (COMFY CAKES CONVEYOR BAKERY + PURBLE PAIRS)
   ============================================================================ */
export const PurblePlaceApp: React.FC = () => {
  const { playSound } = useSound();
  const [tab, setTab] = useState<'cakes' | 'pairs'>('cakes');

  // Comfy Cakes state
  const SHAPES = ['Circle', 'Heart', 'Square'] as const;
  const BATTERS = [
    { name: 'Strawberry Pink', col: '#f472b6' },
    { name: 'Chocolate Fudge', col: '#78350f' },
    { name: 'Vanilla Gold', col: '#fde047' },
  ];
  const FROSTINGS = [
    { name: 'Berry Swirl', col: '#ec4899' },
    { name: 'Mint Cream', col: '#34d399' },
    { name: 'Whipped White', col: '#ffffff' },
  ];
  const TOPPINGS = ['🍓', '🍒', '⭐', '🍫'];

  const [order, setOrder] = useState({ shape: 0, batter: 0, frosting: 0, topping: 0 });
  const [cake, setCake] = useState<{ shape: number | null; batter: number | null; frosting: number | null; topping: number | null }>({
    shape: null,
    batter: null,
    frosting: null,
    topping: null,
  });
  const [cakesShipped, setCakesShipped] = useState(0);
  const [cakeFeedback, setCakeFeedback] = useState('Match the Target Order step-by-step on the conveyor!');

  const newOrder = () => {
    setOrder({
      shape: Math.floor(Math.random() * SHAPES.length),
      batter: Math.floor(Math.random() * BATTERS.length),
      frosting: Math.floor(Math.random() * FROSTINGS.length),
      topping: Math.floor(Math.random() * TOPPINGS.length),
    });
    setCake({ shape: null, batter: null, frosting: null, topping: null });
  };

  // Purble Pairs Memory
  const PAIR_ICONS = ['🍀', '🎂', '🎀', '🎩', '🌸', '🍭', '⭐', '🟣'];
  const [cards, setCards] = useState(() =>
    [...PAIR_ICONS, ...PAIR_ICONS]
      .sort(() => Math.random() - 0.5)
      .map((icon, idx) => ({ id: idx, icon, open: false, matched: false }))
  );
  const [flipped, setFlipped] = useState<number[]>([]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'linear-gradient(180deg, #fdf2f8, #fce7f3)', padding: 12, gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#db2777', color: '#fff', padding: '8px 14px', borderRadius: 10 }}>
        <strong style={{ fontSize: 15 }}>🎂 Purble Place</strong>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => setTab('cakes')}
            style={{ padding: '4px 12px', borderRadius: 99, border: 'none', fontWeight: 800, background: tab === 'cakes' ? '#fde047' : '#fff', cursor: 'pointer' }}
          >
            🍰 Comfy Cakes
          </button>
          <button
            onClick={() => setTab('pairs')}
            style={{ padding: '4px 12px', borderRadius: 99, border: 'none', fontWeight: 800, background: tab === 'pairs' ? '#fde047' : '#fff', cursor: 'pointer' }}
          >
            🍀 Purble Pairs
          </button>
        </div>
      </div>

      {tab === 'cakes' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', background: '#fff', borderRadius: 12, padding: 12, border: '2px solid #f9a8d4' }}>
            {/* Target Order */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 800, color: '#be185d', marginBottom: 4 }}>📋 Customer Order</div>
              <div style={{ fontSize: 12 }}>
                Pan: <b>{SHAPES[order.shape]}</b><br />
                Batter: <b>{BATTERS[order.batter].name}</b><br />
                Frosting: <b>{FROSTINGS[order.frosting].name}</b><br />
                Topping: <b>{TOPPINGS[order.topping]}</b>
              </div>
            </div>

            {/* Live Conveyor Cake Preview */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 800, color: '#7e22ce', marginBottom: 6 }}>🧁 Conveyor Belt</div>
              <div
                style={{
                  width: 110,
                  height: 82,
                  margin: '0 auto',
                  borderRadius: cake.shape === 0 ? '50%' : cake.shape === 1 ? '28px 28px 46px 46px' : 10,
                  background: cake.batter !== null ? BATTERS[cake.batter].col : '#e2e8f0',
                  border: cake.frosting !== null ? `8px solid ${FROSTINGS[cake.frosting].col}` : '3px dashed #94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 28,
                }}
              >
                {cake.topping !== null ? TOPPINGS[cake.topping] : ''}
              </div>
              <div style={{ fontSize: 11, marginTop: 6, color: '#831843' }}>Shipped: <b>{cakesShipped}</b></div>
            </div>

            <button
              onClick={() => {
                if (
                  cake.shape === order.shape &&
                  cake.batter === order.batter &&
                  cake.frosting === order.frosting &&
                  cake.topping === order.topping
                ) {
                  playSound('gameWin');
                  setCakesShipped((c) => c + 1);
                  setCakeFeedback('🎉 Purble-fect Cake! Order matched 100%!');
                  newOrder();
                } else {
                  playSound('error');
                  setCakeFeedback('🤔 Oops! Check the pan, batter, frosting, and topping!');
                }
              }}
              style={{ padding: '12px 18px', borderRadius: 10, border: 'none', background: '#16a34a', color: '#fff', fontWeight: 800, cursor: 'pointer' }}
            >
              📦 Ship Cake!
            </button>
          </div>

          <div style={{ textAlign: 'center', fontWeight: 700, color: '#9d174d' }}>{cakeFeedback}</div>

          {/* Bakery Dispenser Stations */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            <div style={{ background: '#fff', padding: 8, borderRadius: 8 }}>
              <b>1. Pan Shape</b>
              {SHAPES.map((s, i) => (
                <button key={s} onClick={() => setCake((c) => ({ ...c, shape: i }))} style={{ display: 'block', width: '100%', marginTop: 4, padding: 4, cursor: 'pointer' }}>{s}</button>
              ))}
            </div>
            <div style={{ background: '#fff', padding: 8, borderRadius: 8 }}>
              <b>2. Batter</b>
              {BATTERS.map((b, i) => (
                <button key={b.name} onClick={() => setCake((c) => ({ ...c, batter: i }))} style={{ display: 'block', width: '100%', marginTop: 4, padding: 4, cursor: 'pointer' }}>{b.name}</button>
              ))}
            </div>
            <div style={{ background: '#fff', padding: 8, borderRadius: 8 }}>
              <b>3. Frosting</b>
              {FROSTINGS.map((f, i) => (
                <button key={f.name} onClick={() => setCake((c) => ({ ...c, frosting: i }))} style={{ display: 'block', width: '100%', marginTop: 4, padding: 4, cursor: 'pointer' }}>{f.name}</button>
              ))}
            </div>
            <div style={{ background: '#fff', padding: 8, borderRadius: 8 }}>
              <b>4. Topping</b>
              {TOPPINGS.map((t, i) => (
                <button key={t} onClick={() => setCake((c) => ({ ...c, topping: i }))} style={{ display: 'block', width: '100%', marginTop: 4, padding: 4, cursor: 'pointer' }}>{t}</button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 68px)', gap: 8, justifyContent: 'center', marginTop: 12 }}>
          {cards.map((card, idx) => (
            <button
              key={card.id}
              onClick={() => {
                if (card.open || card.matched || flipped.length >= 2) return;
                const nextCards = cards.map((c, i) => (i === idx ? { ...c, open: true } : c));
                const nextFlip = [...flipped, idx];
                setCards(nextCards);
                setFlipped(nextFlip);
                if (nextFlip.length === 2) {
                  const [a, b] = nextFlip;
                  if (nextCards[a].icon === nextCards[b].icon) {
                    playSound('ding');
                    setCards((cs) => cs.map((c, i) => (i === a || i === b ? { ...c, matched: true } : c)));
                    setFlipped([]);
                  } else {
                    window.setTimeout(() => {
                      setCards((cs) => cs.map((c, i) => (i === a || i === b ? { ...c, open: false } : c)));
                      setFlipped([]);
                    }, 650);
                  }
                }
              }}
              style={{
                width: 68,
                height: 68,
                borderRadius: 12,
                border: '2px solid #86efac',
                background: card.open || card.matched ? '#ffffff' : '#22c55e',
                fontSize: 28,
                cursor: 'pointer',
              }}
            >
              {card.open || card.matched ? card.icon : '🍀'}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* ============================================================================
   6. QBASIC NIBBLES.BAS & NOKIA 3310 SNAKE
   ============================================================================ */
export const SnakeNibblesApp: React.FC = () => {
  const { playSound } = useSound();
  const [skin, setSkin] = useState<'qbasic' | 'nokia'>('qbasic');
  const [score, setScore] = useState(0);
  const [numVal, setNumVal] = useState(1);
  const [dead, setDead] = useState(false);
  const snakeRef = useRef<Array<{ x: number; y: number }>>([
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 },
  ]);
  const dirRef = useRef<{ dx: number; dy: number }>({ dx: 1, dy: 0 });
  const foodRef = useRef<{ x: number; y: number }>({ x: 16, y: 10 });
  const [, setTick] = useState(0);

  const W = 24;
  const H = 16;

  const restart = () => {
    snakeRef.current = [
      { x: 10, y: 8 },
      { x: 9, y: 8 },
      { x: 8, y: 8 },
    ];
    dirRef.current = { dx: 1, dy: 0 };
    foodRef.current = { x: 16, y: 8 };
    setScore(0);
    setNumVal(1);
    setDead(false);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const d = dirRef.current;
      if ((e.key === 'ArrowUp' || e.key === 'w') && d.dy === 0) dirRef.current = { dx: 0, dy: -1 };
      if ((e.key === 'ArrowDown' || e.key === 's') && d.dy === 0) dirRef.current = { dx: 0, dy: 1 };
      if ((e.key === 'ArrowLeft' || e.key === 'a') && d.dx === 0) dirRef.current = { dx: -1, dy: 0 };
      if ((e.key === 'ArrowRight' || e.key === 'd') && d.dx === 0) dirRef.current = { dx: 1, dy: 0 };
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (dead) return;
    const iv = window.setInterval(() => {
      const s = snakeRef.current;
      const head = { x: s[0].x + dirRef.current.dx, y: s[0].y + dirRef.current.dy };
      if (head.x < 0 || head.y < 0 || head.x >= W || head.y >= H || s.some((seg) => seg.x === head.x && seg.y === head.y)) {
        playSound('error');
        setDead(true);
        return;
      }
      const next = [head, ...s];
      if (head.x === foodRef.current.x && head.y === foodRef.current.y) {
        playSound('ding');
        setScore((sc) => sc + numVal * 100);
        setNumVal((n) => (n % 9) + 1);
        foodRef.current = { x: 1 + Math.floor(Math.random() * (W - 2)), y: 1 + Math.floor(Math.random() * (H - 2)) };
      } else {
        next.pop();
      }
      snakeRef.current = next;
      setTick((t) => t + 1);
    }, 115);
    return () => clearInterval(iv);
  }, [dead, numVal, playSound]);

  const isNokia = skin === 'nokia';

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', background: isNokia ? '#84cc16' : '#0000aa', color: isNokia ? '#1a2e05' : '#ffff55', fontFamily: 'monospace', padding: 12, gap: 8 }}>
      <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>{isNokia ? '📱 NOKIA 3310 SNAKE II' : '🐍 MS-DOS QBASIC NIBBLES.BAS'}</strong>
        <span>SAMMY --&gt; Score: <b>{score}</b></span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setSkin(isNokia ? 'qbasic' : 'nokia')} style={{ cursor: 'pointer', padding: '2px 8px' }}>
            Skin: {isNokia ? 'QBasic Blue' : 'Nokia Green'}
          </button>
          <button onClick={restart} style={{ cursor: 'pointer', padding: '2px 8px' }}>Restart</button>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${W}, 18px)`,
          border: `3px solid ${isNokia ? '#1a2e05' : '#ff5555'}`,
          background: isNokia ? '#a3e635' : '#0000aa',
        }}
      >
        {Array.from({ length: H }).map((_, y) =>
          Array.from({ length: W }).map((__, x) => {
            const onSnake = snakeRef.current.some((seg) => seg.x === x && seg.y === y);
            const isFood = foodRef.current.x === x && foodRef.current.y === y;
            return (
              <div
                key={`${x}-${y}`}
                style={{
                  width: 18,
                  height: 18,
                  background: onSnake ? (isNokia ? '#1a2e05' : '#ffff55') : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: 13,
                  color: isNokia ? '#1a2e05' : '#ffffff',
                }}
              >
                {isFood ? numVal : ''}
              </div>
            );
          })
        )}
      </div>
      {dead && <div style={{ fontWeight: 900 }}>SAMMY DIED! Push Restart to play again!</div>}
    </div>
  );
};

/* ============================================================================
   7. DX-BALL / RETRO BRICK BREAKER
   ============================================================================ */
export const BreakoutDXApp: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [resetId, setResetId] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let paddleX = 240;
    const paddleW = 92;
    let bx = 285;
    let by = 320;
    let vx = 3.6;
    let vy = -3.8;
    let curLives = 3;
    let curScore = 0;

    const cols = 9;
    const rows = 5;
    const rowColors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#38bdf8'];
    const bricks: Array<{ x: number; y: number; w: number; h: number; color: string; alive: boolean }> = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        bricks.push({ x: 18 + c * 61, y: 28 + r * 22, w: 56, h: 17, color: rowColors[r], alive: true });
      }
    }

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const rel = ((e.clientX - rect.left) / rect.width) * canvas.width;
      paddleX = Math.max(6, Math.min(canvas.width - paddleW - 6, rel - paddleW / 2));
    };
    canvas.addEventListener('mousemove', onMove);

    let raf = 0;
    const loop = () => {
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      bx += vx;
      by += vy;
      if (bx < 8 || bx > canvas.width - 8) vx *= -1;
      if (by < 8) vy *= -1;

      // Paddle bounce
      if (by >= 352 && by <= 366 && bx >= paddleX && bx <= paddleX + paddleW && vy > 0) {
        const hitPos = (bx - (paddleX + paddleW / 2)) / (paddleW / 2);
        vx = hitPos * 4.8;
        vy = -Math.abs(vy);
      }

      if (by > canvas.height) {
        curLives--;
        setLives(curLives);
        if (curLives <= 0) {
          ctx.fillStyle = '#fde047';
          ctx.font = 'bold 24px Tahoma';
          ctx.fillText('GAME OVER — Click Reset!', 140, 210);
          return;
        }
        bx = paddleX + paddleW / 2;
        by = 320;
        vy = -3.8;
      }

      // Brick collisions
      let anyAlive = false;
      for (const b of bricks) {
        if (!b.alive) continue;
        anyAlive = true;
        if (bx > b.x && bx < b.x + b.w && by > b.y && by < b.y + b.h) {
          b.alive = false;
          vy *= -1;
          curScore += 50;
          setScore(curScore);
        }
        ctx.fillStyle = b.color;
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(b.x, b.y, b.w, 3);
      }

      if (!anyAlive) {
        ctx.fillStyle = '#4ade80';
        ctx.font = 'bold 26px Tahoma';
        ctx.fillText('🎉 BOARD CLEARED! YOU WIN!', 115, 210);
        return;
      }

      // Draw Metallic Paddle & Chrome Ball
      const pg = ctx.createLinearGradient(paddleX, 355, paddleX, 369);
      pg.addColorStop(0, '#e2e8f0');
      pg.addColorStop(0.5, '#3b82f6');
      pg.addColorStop(1, '#1e3a8a');
      ctx.fillStyle = pg;
      ctx.fillRect(paddleX, 355, paddleW, 13);

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(bx, by, 7, 0, Math.PI * 2);
      ctx.fill();

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener('mousemove', onMove);
    };
  }, [resetId]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0f172a', color: '#fff', padding: 8, gap: 6, alignItems: 'center' }}>
      <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 8px' }}>
        <strong>🧱 DX-Ball Retro Brick Breaker (Move Mouse to Steer)</strong>
        <span>Score: <b>{score}</b> • ❤️ Lives: <b>{lives}</b></span>
        <button
          onClick={() => {
            setScore(0);
            setLives(3);
            setResetId((n) => n + 1);
          }}
          style={{ padding: '3px 10px', cursor: 'pointer' }}
        >
          Reset
        </button>
      </div>
      <canvas ref={canvasRef} width={580} height={390} style={{ width: '100%', maxWidth: 590, border: '2px solid #334155', borderRadius: 4 }} />
    </div>
  );
};

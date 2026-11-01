import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSound } from '../../../context/SoundContext';
import { idbGet, persistHybrid, loadLocalFast } from '../../../services/persistentStorage';

/* ============================================================================
   CLASSIC SLINGO DELUXE / AOL SLINGO — EXACT REPLICA
   5x5 Matrix (1-75) + 5 Slot Reels, 20 Spins, Jokers, Super Jokers,
   Gold Coins, Free Spins, Devil, Cherub Rescue, Paid Spins 17-20,
   Spin-Scaled Full Card Jackpots (6,500-15,000), Deluxe Powerups & AOL Chat!
   ============================================================================ */

type ReelSymbolType = 'NUMBER' | 'JOKER' | 'SUPER_JOKER' | 'COIN' | 'FREE_SPIN' | 'DEVIL' | 'CHERUB';

interface ReelResult {
  type: ReelSymbolType;
  number?: number;
  used: boolean; // whether number match or wild placement has been used this spin
}

interface HighScoreEntry {
  name: string;
  score: number;
  fullCard: boolean;
  slingos: number;
  date: string;
  mode: 'Classic AOL' | 'Deluxe';
}

type DeluxePowerup = 'none' | 'vision' | 'devil_shield' | 'multiplier_2x' | 'extra_spins';

interface SavedSlingoGame {
  board: number[][];
  marked: boolean[][];
  spin: number;
  maxSpins: number;
  score: number;
  freeSpins: number;
  completedLines: string[];
  reels: ReelResult[];
  phase: 'ready_to_spin' | 'marking' | 'paid_spin_prompt' | 'gameover';
  gameMode: 'Classic AOL' | 'Deluxe';
  powerup: DeluxePowerup;
  shieldCharges: number;
}

const FULL_CARD_BONUS_BY_SPIN: Record<number, number> = {
  5: 15000,
  6: 14000,
  7: 13000,
  8: 12500,
  9: 12000,
  10: 11500,
  11: 11000,
  12: 10500,
  13: 10000,
  14: 9500,
  15: 9000,
  16: 8500,
  17: 8000,
  18: 7500,
  19: 7000,
  20: 6500,
  21: 6000,
  22: 5500,
};

const PAID_SPIN_COSTS: Record<number, number> = {
  17: 500,
  18: 1000,
  19: 1500,
  20: 2000,
  21: 2000,
  22: 2500,
};

const DEFAULT_HIGH_SCORES: HighScoreEntry[] = [
  { name: 'SlingoMaster99', score: 29400, fullCard: true, slingos: 12, date: '2004-08-19', mode: 'Classic AOL' },
  { name: 'AOL_LuckyStar', score: 24800, fullCard: true, slingos: 12, date: '2004-09-03', mode: 'Classic AOL' },
  { name: 'SonomaBliss', score: 19200, fullCard: false, slingos: 9, date: '2004-10-14', mode: 'Deluxe' },
  { name: 'SpaceCadetXP', score: 15600, fullCard: false, slingos: 7, date: '2004-11-02', mode: 'Classic AOL' },
  { name: 'CherubSaver', score: 12400, fullCard: false, slingos: 5, date: '2004-11-28', mode: 'Classic AOL' },
];

const ALL_SLINGO_LINES: { id: string; cells: [number, number][] }[] = [
  // 5 Horizontal Rows
  ...[0, 1, 2, 3, 4].map((r) => ({
    id: `r${r}`,
    cells: [0, 1, 2, 3, 4].map((c) => [r, c] as [number, number]),
  })),
  // 5 Vertical Columns
  ...[0, 1, 2, 3, 4].map((c) => ({
    id: `c${c}`,
    cells: [0, 1, 2, 3, 4].map((r) => [r, c] as [number, number]),
  })),
  // 2 Diagonals
  {
    id: 'd0',
    cells: [
      [0, 0],
      [1, 1],
      [2, 2],
      [3, 3],
      [4, 4],
    ],
  },
  {
    id: 'd1',
    cells: [
      [0, 4],
      [1, 3],
      [2, 2],
      [3, 1],
      [4, 0],
    ],
  },
];

function generateSlingoBoard(): number[][] {
  // Returns board[row][col] where col 0: 1..15, col 1: 16..30, col 2: 31..45, col 3: 46..60, col 4: 61..75
  const cols: number[][] = [];
  for (let c = 0; c < 5; c++) {
    const min = c * 15 + 1;
    const pool: number[] = [];
    for (let n = min; n < min + 15; n++) pool.push(n);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    cols.push(pool.slice(0, 5));
  }
  const board: number[][] = [];
  for (let r = 0; r < 5; r++) {
    board.push([cols[0][r], cols[1][r], cols[2][r], cols[3][r], cols[4][r]]);
  }
  return board;
}

/* ============================================================================
   CUSTOM SLINGO WEBAUDIO SOUND SYNTHESIZER
   ============================================================================ */
class SlingoAudioSynth {
  private ctx: AudioContext | null = null;

  private ensure(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  tone(freq: number, dur: number, type: OscillatorType, vol: number, delay = 0, slideTo?: number) {
    if (vol <= 0.001) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), now + dur);
    }
    gain.gain.setValueAtTime(Math.min(0.45, vol), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  reelTick(vol: number) {
    this.tone(420 + Math.random() * 180, 0.035, 'triangle', vol * 0.16);
  }

  reelStop(col: number, vol: number) {
    this.tone(220 + col * 42, 0.085, 'square', vol * 0.22, 0, 140);
  }

  daub(vol: number) {
    this.tone(660, 0.09, 'sine', vol * 0.3);
    this.tone(990, 0.14, 'triangle', vol * 0.26, 0.06);
  }

  coin(vol: number) {
    this.tone(987.77, 0.09, 'sine', vol * 0.32);
    this.tone(1318.51, 0.24, 'sine', vol * 0.34, 0.075);
  }

  joker(vol: number) {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      this.tone(f, 0.12, 'triangle', vol * 0.28, i * 0.055);
    });
  }

  devilLaugh(vol: number) {
    [290, 250, 215, 180, 145].forEach((f, i) => {
      this.tone(f, 0.14, 'sawtooth', vol * 0.28, i * 0.11, f * 0.78);
    });
  }

  cherubSave(vol: number) {
    [523.25, 659.25, 783.99, 987.77, 1174.66, 1567.98].forEach((f, i) => {
      this.tone(f, 0.22, 'sine', vol * 0.28, i * 0.065);
    });
  }

  slingoFanfare(vol: number) {
    const notes = [523.25, 659.25, 783.99, 659.25, 1046.5];
    const times = [0, 0.1, 0.2, 0.3, 0.42];
    const durs = [0.09, 0.09, 0.09, 0.1, 0.38];
    notes.forEach((f, i) => {
      this.tone(f, durs[i], 'triangle', vol * 0.35, times[i]);
      this.tone(f * 0.5, durs[i], 'sine', vol * 0.2, times[i]);
    });
  }

  fullCardJackpot(vol: number) {
    const scale = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1318.5, 1567.98];
    scale.forEach((f, i) => {
      this.tone(f, 0.24, 'triangle', vol * 0.35, i * 0.08);
    });
  }
}

const slingoSynth = new SlingoAudioSynth();

/* ============================================================================
   CRISP RETRO ILLUSTRATED SLINGO SYMBOL GRAPHICS
   ============================================================================ */
const SlingoSymbolGraphic: React.FC<{ type: ReelSymbolType; number?: number; size?: number }> = ({
  type,
  number,
  size = 44,
}) => {
  if (type === 'NUMBER') {
    return (
      <div
        style={{
          fontSize: size * 0.54,
          fontWeight: 900,
          color: '#10255a',
          fontFamily: "'Arial Black', Impact, sans-serif",
          textShadow: '0 1px 0 #fff',
          lineHeight: 1,
        }}
      >
        {number}
      </div>
    );
  }
  if (type === 'JOKER') {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48">
        <defs>
          <radialGradient id="jkBg" cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="100%" stopColor="#f59e0b" />
          </radialGradient>
        </defs>
        <circle cx="24" cy="24" r="21" fill="url(#jkBg)" stroke="#b45309" strokeWidth="2" />
        {/* 3-Point Red/Blue/Purple Jester Hat */}
        <path d="M9 22 C7 10, 16 8, 24 19 Z" fill="#dc2626" stroke="#7f1d1d" strokeWidth="1.2" />
        <path d="M24 19 C22 7, 26 7, 24 19 Z" fill="#7c3aed" />
        <path d="M18 19 C20 6, 28 6, 30 19 Z" fill="#2563eb" stroke="#1e3a8a" strokeWidth="1.2" />
        <path d="M39 22 C41 10, 32 8, 24 19 Z" fill="#16a34a" stroke="#14532d" strokeWidth="1.2" />
        <circle cx="9" cy="12" r="2.8" fill="#fde047" stroke="#92400e" />
        <circle cx="24" cy="8" r="2.8" fill="#fde047" stroke="#92400e" />
        <circle cx="39" cy="12" r="2.8" fill="#fde047" stroke="#92400e" />
        {/* Smiling Jester Face */}
        <circle cx="24" cy="28" r="10" fill="#ffedd5" stroke="#9a3412" strokeWidth="1.2" />
        <circle cx="20.5" cy="26" r="1.6" fill="#1e293b" />
        <circle cx="27.5" cy="26" r="1.6" fill="#1e293b" />
        <path d="M19 30 Q24 35 29 30" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" />
        <text x="24" y="45" textAnchor="middle" fontSize="8" fontWeight="900" fill="#7c2d12">
          JOKER
        </text>
      </svg>
    );
  }
  if (type === 'SUPER_JOKER') {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48">
        <circle cx="24" cy="24" r="21" fill="#10b981" stroke="#064e3b" strokeWidth="2.2" />
        <polygon
          points="24,4 29,16 42,17 32,25 35,38 24,31 13,38 16,25 6,17 19,16"
          fill="#fde047"
          stroke="#b45309"
          strokeWidth="1.4"
        />
        <circle cx="24" cy="23" r="7.5" fill="#ecfdf5" stroke="#065f46" strokeWidth="1.2" />
        <circle cx="21.5" cy="21.5" r="1.4" fill="#064e3b" />
        <circle cx="26.5" cy="21.5" r="1.4" fill="#064e3b" />
        <path d="M20.5 25 Q24 28.5 27.5 25" fill="none" stroke="#059669" strokeWidth="1.8" strokeLinecap="round" />
        <text x="24" y="45" textAnchor="middle" fontSize="7.4" fontWeight="900" fill="#ffffff">
          SUPER!
        </text>
      </svg>
    );
  }
  if (type === 'COIN') {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48">
        <defs>
          <radialGradient id="goldCoin" cx="35%" cy="30%" r="65%">
            <stop offset="0%" stopColor="#fffbeb" />
            <stop offset="38%" stopColor="#facc15" />
            <stop offset="100%" stopColor="#b45309" />
          </radialGradient>
        </defs>
        <circle cx="24" cy="24" r="19" fill="url(#goldCoin)" stroke="#78350f" strokeWidth="2" />
        <circle cx="24" cy="24" r="14.5" fill="none" stroke="#fef08a" strokeWidth="1.3" strokeDasharray="3 2" />
        <text x="24" y="23" textAnchor="middle" fontSize="9.5" fontWeight="900" fill="#78350f">
          1000
        </text>
        <text x="24" y="32" textAnchor="middle" fontSize="7.5" fontWeight="900" fill="#92400e">
          GOLD
        </text>
      </svg>
    );
  }
  if (type === 'FREE_SPIN') {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48">
        <circle cx="24" cy="24" r="19" fill="#2563eb" stroke="#93c5fd" strokeWidth="2.2" />
        <path
          d="M15 22 A9 9 0 1 1 20 32"
          fill="none"
          stroke="#fde047"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <polygon points="12,18 19,21 14,26" fill="#fde047" />
        <text x="24" y="23" textAnchor="middle" fontSize="8.5" fontWeight="900" fill="#ffffff">
          FREE
        </text>
        <text x="24" y="32" textAnchor="middle" fontSize="8" fontWeight="900" fill="#fde047">
          SPIN
        </text>
      </svg>
    );
  }
  if (type === 'DEVIL') {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48">
        <circle cx="24" cy="25" r="18" fill="#7f1d1d" stroke="#ef4444" strokeWidth="2" />
        {/* Horns */}
        <path d="M12 16 C9 7, 15 6, 18 14 Z" fill="#fde047" stroke="#991b1b" strokeWidth="1" />
        <path d="M36 16 C39 7, 33 6, 30 14 Z" fill="#fde047" stroke="#991b1b" strokeWidth="1" />
        {/* Red Devil Face */}
        <circle cx="24" cy="26" r="12" fill="#dc2626" stroke="#450a0a" strokeWidth="1.3" />
        <polygon points="17,21 22,23 18,25" fill="#fef08a" />
        <polygon points="31,21 26,23 30,25" fill="#fef08a" />
        <path d="M18 31 Q24 36 30 31" fill="none" stroke="#450a0a" strokeWidth="2.2" strokeLinecap="round" />
        <text x="24" y="45" textAnchor="middle" fontSize="7.5" fontWeight="900" fill="#fecaca">
          DEVIL!
        </text>
      </svg>
    );
  }
  // CHERUB
  return (
    <svg width={size} height={size} viewBox="0 0 48 48">
      <circle cx="24" cy="24" r="19" fill="#38bdf8" stroke="#bae6fd" strokeWidth="2" />
      {/* Halo */}
      <ellipse cx="24" cy="10" rx="8" ry="2.4" fill="none" stroke="#fde047" strokeWidth="2.2" />
      {/* Wings */}
      <path d="M7 24 Q12 15 17 24 Q12 30 7 24 Z" fill="#ffffff" />
      <path d="M41 24 Q36 15 31 24 Q36 30 41 24 Z" fill="#ffffff" />
      {/* Face */}
      <circle cx="24" cy="24" r="9.5" fill="#ffedd5" stroke="#c2410c" strokeWidth="1" />
      <circle cx="21" cy="23" r="1.4" fill="#1e293b" />
      <circle cx="27" cy="23" r="1.4" fill="#1e293b" />
      <path d="M21 27 Q24 30 27 27" fill="none" stroke="#e11d48" strokeWidth="1.6" strokeLinecap="round" />
      <text x="24" y="44" textAnchor="middle" fontSize="7.5" fontWeight="900" fill="#ffffff">
        CHERUB
      </text>
    </svg>
  );
};

const AOL_LOUNGE_CHAT_SEED = [
  { user: 'SlingoQueen04', text: 'gl everyone!! going for a spin-14 full card!' },
  { user: 'BingoBob_TN', text: 'watch out for the devil on spin 12 lol' },
  { user: 'CherubAngel', text: '3 jokers in one spin lets gooo!! +1000!' },
];

export const SlingoApp: React.FC = () => {
  const { volume, muted } = useSound();
  const effVol = muted ? 0 : volume;

  const [gameMode, setGameMode] = useState<'Classic AOL' | 'Deluxe'>('Classic AOL');
  const [powerup, setPowerup] = useState<DeluxePowerup>('vision');
  const [shieldCharges, setShieldCharges] = useState<number>(0);

  const [board, setBoard] = useState<number[][]>(() => generateSlingoBoard());
  const [marked, setMarked] = useState<boolean[][]>(() =>
    Array.from({ length: 5 }, () => Array(5).fill(false))
  );
  const [spin, setSpin] = useState<number>(0);
  const [maxSpins, setMaxSpins] = useState<number>(20);
  const [score, setScore] = useState<number>(0);
  const [freeSpins, setFreeSpins] = useState<number>(0);
  const [completedLines, setCompletedLines] = useState<string[]>([]);
  const [flashCells, setFlashCells] = useState<Set<string>>(new Set());

  const [reels, setReels] = useState<ReelResult[]>(() =>
    Array.from({ length: 5 }, (_, c) => ({ type: 'NUMBER', number: c * 15 + 7, used: true }))
  );
  const [spinningCols, setSpinningCols] = useState<boolean[]>([false, false, false, false, false]);
  const [phase, setPhase] = useState<'ready_to_spin' | 'spinning' | 'marking' | 'paid_spin_prompt' | 'gameover'>(
    'ready_to_spin'
  );

  // Classic options
  const [autoDaubNumbers, setAutoDaubNumbers] = useState<boolean>(false);
  const [timedMode, setTimedMode] = useState<boolean>(true);
  const [shotClock, setShotClock] = useState<number>(100); // percentage 0..100
  const [showLounge, setShowLounge] = useState<boolean>(true);
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);
  const [showHighScores, setShowHighScores] = useState<boolean>(false);

  // Event banners (Devil / Cherub / Slingo / Full Card / Coin / Joker Bonus)
  const [eventBanner, setEventBanner] = useState<{
    kind: 'devil' | 'cherub' | 'slingo' | 'fullcard' | 'bonus' | 'info';
    title: string;
    subtitle?: string;
  } | null>(null);

  const [highScores, setHighScores] = useState<HighScoreEntry[]>(() =>
    loadLocalFast('xp_slingo_highscores_v1', DEFAULT_HIGH_SCORES)
  );
  const [loungeMsgs, setLoungeMsgs] = useState(AOL_LOUNGE_CHAT_SEED);
  const [chatInput, setChatInput] = useState('');

  const hydratedRef = useRef(false);

  // Hydrate persistent state from IndexedDB on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      const savedScores = await idbGet<HighScoreEntry[]>('xp_slingo_highscores_v1');
      if (mounted && savedScores && savedScores.length > 0) {
        setHighScores(savedScores);
      }
      const savedGame = await idbGet<SavedSlingoGame>('xp_slingo_active_game_v1');
      if (mounted && savedGame && savedGame.spin > 0 && savedGame.phase !== 'gameover') {
        setBoard(savedGame.board);
        setMarked(savedGame.marked);
        setSpin(savedGame.spin);
        setMaxSpins(savedGame.maxSpins || 20);
        setScore(savedGame.score);
        setFreeSpins(savedGame.freeSpins);
        setCompletedLines(savedGame.completedLines);
        setReels(savedGame.reels);
        setPhase(savedGame.phase);
        setGameMode(savedGame.gameMode || 'Classic AOL');
        setPowerup(savedGame.powerup || 'vision');
        setShieldCharges(savedGame.shieldCharges || 0);
      }
      hydratedRef.current = true;
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Persist active game whenever spin/board/score updates
  useEffect(() => {
    if (!hydratedRef.current) return;
    if (phase === 'spinning') return;
    const snap: SavedSlingoGame = {
      board,
      marked,
      spin,
      maxSpins,
      score,
      freeSpins,
      completedLines,
      reels,
      phase,
      gameMode,
      powerup,
      shieldCharges,
    };
    persistHybrid('xp_slingo_active_game_v1', snap);
  }, [board, marked, spin, maxSpins, score, freeSpins, completedLines, reels, phase, gameMode, powerup, shieldCharges]);

  const showBanner = useCallback(
    (kind: 'devil' | 'cherub' | 'slingo' | 'fullcard' | 'bonus' | 'info', title: string, subtitle?: string, ms = 2400) => {
      setEventBanner({ kind, title, subtitle });
      window.setTimeout(() => {
        setEventBanner((cur) => (cur?.title === title ? null : cur));
      }, ms);
    },
    []
  );

  const mult = gameMode === 'Deluxe' && powerup === 'multiplier_2x' ? 2 : 1;

  const finalizeGame = useCallback(
    (finalScore: number, finalLinesCount: number, isFullCard: boolean) => {
      const unusedFreeBonus = freeSpins * 200 * mult;
      const total = Math.max(0, finalScore + unusedFreeBonus);
      setScore(total);
      setPhase('gameover');

      const entry: HighScoreEntry = {
        name: 'Administrator',
        score: total,
        fullCard: isFullCard,
        slingos: finalLinesCount,
        date: new Date().toISOString().slice(0, 10),
        mode: gameMode,
      };
      setHighScores((prev) => {
        const next = [...prev, entry].sort((a, b) => b.score - a.score).slice(0, 10);
        persistHybrid('xp_slingo_highscores_v1', next);
        return next;
      });

      setLoungeMsgs((prev) => [
        ...prev.slice(-12),
        {
          user: 'AOL_Host_Bot',
          text: isFullCard
            ? `🎉 FULL CARD SLINGO!! Administrator scored ${total.toLocaleString()} pts!`
            : `👏 Game Over! Administrator finished with ${total.toLocaleString()} pts (${finalLinesCount} Slingos).`,
        },
      ]);
    },
    [freeSpins, gameMode, mult]
  );

  // Evaluate newly formed Slingos & Full Card after marking a square
  const evaluateBoardProgress = useCallback(
    (nextMarked: boolean[][], currentScoreAfterMark: number, currentSpin: number) => {
      const newlyCompleted: { id: string; cells: [number, number][] }[] = [];
      for (const line of ALL_SLINGO_LINES) {
        if (completedLines.includes(line.id)) continue;
        if (line.cells.every(([r, c]) => nextMarked[r][c])) {
          newlyCompleted.push(line);
        }
      }

      let updatedScore = currentScoreAfterMark;
      let nextCompletedIds = completedLines;

      if (newlyCompleted.length > 0) {
        const lineBonus = newlyCompleted.length * 1000 * mult;
        updatedScore += lineBonus;
        nextCompletedIds = [...completedLines, ...newlyCompleted.map((l) => l.id)];
        setCompletedLines(nextCompletedIds);

        const cellsToFlash = new Set<string>();
        newlyCompleted.forEach((l) => l.cells.forEach(([r, c]) => cellsToFlash.add(`${r},${c}`)));
        setFlashCells(cellsToFlash);
        window.setTimeout(() => setFlashCells(new Set()), 1700);

        slingoSynth.slingoFanfare(effVol);
        showBanner(
          'slingo',
          newlyCompleted.length > 1 ? `${newlyCompleted.length}× DOUBLE SLINGO!!` : 'SLINGO!!',
          `+${lineBonus.toLocaleString()} Points! (${nextCompletedIds.length}/12 Slingos)`
        );
      }

      // Check Full Card (all 25 marked)
      const allCovered = nextMarked.every((row) => row.every(Boolean));
      if (allCovered) {
        const fcBase = FULL_CARD_BONUS_BY_SPIN[Math.max(5, Math.min(22, currentSpin))] || 6500;
        const fcBonus = fcBase * mult;
        const finalWithFc = updatedScore + fcBonus;
        slingoSynth.fullCardJackpot(effVol);
        showBanner(
          'fullcard',
          '★ FULL CARD SLINGO! ★',
          `Spin ${currentSpin} Blackout Jackpot: +${fcBonus.toLocaleString()} Points!`,
          4500
        );
        finalizeGame(finalWithFc, 12, true);
        return { gameEnded: true, score: finalWithFc };
      }

      setScore(updatedScore);
      return { gameEnded: false, score: updatedScore };
    },
    [completedLines, effVol, finalizeGame, mult, showBanner]
  );

  // Check if any actionable moves remain on current reels
  const hasRemainingMoves = useCallback(
    (curReels: ReelResult[], curMarked: boolean[][]): boolean => {
      for (let c = 0; c < 5; c++) {
        const r = curReels[c];
        if (r.used) continue;
        if (r.type === 'NUMBER') {
          for (let row = 0; row < 5; row++) {
            if (board[row][c] === r.number && !curMarked[row][c]) return true;
          }
        } else if (r.type === 'JOKER') {
          for (let row = 0; row < 5; row++) {
            if (!curMarked[row][c]) return true;
          }
        } else if (r.type === 'SUPER_JOKER') {
          for (let row = 0; row < 5; row++) {
            for (let col = 0; col < 5; col++) {
              if (!curMarked[row][col]) return true;
            }
          }
        }
      }
      return false;
    },
    [board]
  );

  const advanceAfterSpinComplete = useCallback(
    (curSpin: number, curScore: number) => {
      if (curSpin >= maxSpins) {
        finalizeGame(curScore, completedLines.length, false);
        return;
      }
      const nextSpin = curSpin + 1;
      if (nextSpin >= 17 && freeSpins === 0) {
        setPhase('paid_spin_prompt');
      } else {
        setPhase('ready_to_spin');
      }
    },
    [completedLines.length, finalizeGame, freeSpins, maxSpins]
  );

  // Start a new game
  const startNewGame = (modeOverride?: 'Classic AOL' | 'Deluxe', powerupOverride?: DeluxePowerup) => {
    const m = modeOverride ?? gameMode;
    const p = powerupOverride ?? powerup;
    const totalSpins = m === 'Deluxe' && p === 'extra_spins' ? 22 : 20;
    setBoard(generateSlingoBoard());
    setMarked(Array.from({ length: 5 }, () => Array(5).fill(false)));
    setSpin(0);
    setMaxSpins(totalSpins);
    setScore(0);
    setFreeSpins(0);
    setCompletedLines([]);
    setFlashCells(new Set());
    setShieldCharges(m === 'Deluxe' && p === 'devil_shield' ? 2 : 0);
    setReels(Array.from({ length: 5 }, (_, c) => ({ type: 'NUMBER', number: c * 15 + 1, used: true })));
    setPhase('ready_to_spin');
    setEventBanner(null);
    setShotClock(100);
  };

  // Roll a single column symbol with authentic Slingo feel
  const rollColumnSymbol = (col: number, curMarked: boolean[][]): ReelResult => {
    const roll = Math.random();
    // Center reels have classic Devil/Coin/FreeSpin chances; all reels have Numbers & Jokers
    if (roll < 0.14) {
      return { type: 'JOKER', used: false };
    }
    if (roll < 0.175) {
      return { type: 'SUPER_JOKER', used: false };
    }
    if (roll < 0.235) {
      return { type: 'COIN', used: true };
    }
    if (roll < 0.275) {
      return { type: 'FREE_SPIN', used: true };
    }
    if ((col === 1 || col === 2 || col === 3) && roll < 0.325) {
      // Devil!
      return { type: 'DEVIL', used: true };
    }

    // Number: ~46% chance to pick one of the uncovered numbers in this column if available so gameplay matches AOL Slingo pacing
    const uncoveredInCol: number[] = [];
    for (let r = 0; r < 5; r++) {
      if (!curMarked[r][col]) uncoveredInCol.push(board[r][col]);
    }
    if (uncoveredInCol.length > 0 && Math.random() < 0.46) {
      const picked = uncoveredInCol[Math.floor(Math.random() * uncoveredInCol.length)];
      return { type: 'NUMBER', number: picked, used: false };
    }

    const min = col * 15 + 1;
    const randomNum = min + Math.floor(Math.random() * 15);
    return { type: 'NUMBER', number: randomNum, used: false };
  };

  // Execute Spin!
  const executeSpin = (confirmedPaid = false) => {
    if (phase === 'spinning' || phase === 'gameover') return;
    const nextSpin = spin + 1;
    if (nextSpin > maxSpins) return;

    let workingScore = score;
    let workingFreeSpins = freeSpins;

    // Handle Spins 17+ cost or Free Spin token
    if (nextSpin >= 17) {
      if (workingFreeSpins > 0) {
        workingFreeSpins -= 1;
        setFreeSpins(workingFreeSpins);
        showBanner('info', 'FREE SPIN TOKEN USED!', `Spin ${nextSpin} is FREE! (${workingFreeSpins} Free Spins left)`, 1800);
      } else {
        const cost = PAID_SPIN_COSTS[nextSpin] || 2000;
        if (!confirmedPaid && phase !== 'paid_spin_prompt') {
          setPhase('paid_spin_prompt');
          return;
        }
        workingScore = Math.max(0, workingScore - cost);
        setScore(workingScore);
      }
    }

    setSpin(nextSpin);
    setPhase('spinning');
    setSpinningCols([true, true, true, true, true]);
    setShotClock(100);

    // Generate the 5 reel outcomes
    const rolled: ReelResult[] = [0, 1, 2, 3, 4].map((c) => rollColumnSymbol(c, marked));

    // Prevent more than 1 Devil in a single spin (authentic Slingo rule)
    let devilSeen = false;
    let devilCol = -1;
    for (let c = 0; c < 5; c++) {
      if (rolled[c].type === 'DEVIL') {
        if (devilSeen) {
          rolled[c] = { type: 'COIN', used: true };
        } else {
          devilSeen = true;
          devilCol = c;
        }
      }
    }

    // ~28% chance the Cherub appears on an adjacent reel to rescue you from the Devil!
    let cherubSaved = false;
    if (devilSeen && Math.random() < 0.3) {
      const otherCol = (devilCol + 2) % 5;
      rolled[otherCol] = { type: 'CHERUB', used: true };
      cherubSaved = true;
    }

    // Tick sound while reels spin
    const tickIv = window.setInterval(() => slingoSynth.reelTick(effVol), 75);

    // Stop reels sequentially left to right
    [0, 1, 2, 3, 4].forEach((colIdx) => {
      window.setTimeout(() => {
        slingoSynth.reelStop(colIdx, effVol);
        setReels((prev) => {
          const copy = [...prev];
          copy[colIdx] = rolled[colIdx];
          return copy;
        });
        setSpinningCols((prev) => {
          const copy = [...prev];
          copy[colIdx] = false;
          return copy;
        });

        if (colIdx === 4) {
          clearInterval(tickIv);
          // Process instant symbols: Coins, Free Spins, Multi-Joker Bonus, Devil / Cherub!
          let postSpinScore = workingScore;
          let addedFree = 0;
          let coinCount = 0;
          let jokerCount = 0;

          rolled.forEach((r) => {
            if (r.type === 'COIN') coinCount++;
            if (r.type === 'FREE_SPIN') addedFree++;
            if (r.type === 'JOKER' || r.type === 'SUPER_JOKER') jokerCount++;
          });

          if (coinCount > 0) {
            postSpinScore += coinCount * 1000 * mult;
            slingoSynth.coin(effVol);
          }
          if (addedFree > 0) {
            workingFreeSpins += addedFree;
            setFreeSpins(workingFreeSpins);
            slingoSynth.coin(effVol);
          }
          if (jokerCount >= 3) {
            const jb = (jokerCount === 3 ? 1000 : jokerCount === 4 ? 2500 : 5000) * mult;
            postSpinScore += jb;
            slingoSynth.joker(effVol);
            showBanner('bonus', `${jokerCount} JOKERS SPIN BONUS!`, `+${jb.toLocaleString()} Bonus Points!`);
          } else if (jokerCount > 0) {
            slingoSynth.joker(effVol);
          }

          if (devilSeen) {
            if (cherubSaved) {
              const rescueBonus = 500 * mult;
              postSpinScore += rescueBonus;
              slingoSynth.cherubSave(effVol);
              showBanner('cherub', '👼 SAVED BY THE CHERUB! 🏹', `The Cherub shot the Devil! Score safe +${rescueBonus} pts!`, 3000);
            } else if (shieldCharges > 0) {
              setShieldCharges((s) => s - 1);
              slingoSynth.cherubSave(effVol);
              showBanner('cherub', '🛡️ DEVIL SHIELD BLOCKED!', 'Your Deluxe Shield blocked the Slingo Devil!', 2600);
            } else {
              postSpinScore = Math.floor(postSpinScore / 2);
              slingoSynth.devilLaugh(effVol);
              showBanner('devil', '😈 MWAHAHA! THE SLINGO DEVIL!', 'Your score was cut in HALF!', 2800);
            }
          } else if (coinCount > 0 && jokerCount < 3) {
            showBanner('bonus', `🪙 GOLD COIN${coinCount > 1 ? 'S' : ''}!`, `+${(coinCount * 1000 * mult).toLocaleString()} Points!`, 1600);
          }

          // Mark non-matching NUMBER reels as already "used" so player isn't stuck
          let workingMarked = marked.map((row) => [...row]);
          const processedReels = rolled.map((r, c) => {
            if (r.type === 'NUMBER') {
              const matchRow = board.findIndex((row, rIdx) => row[c] === r.number && !workingMarked[rIdx][c]);
              if (matchRow === -1) {
                return { ...r, used: true };
              }
              if (autoDaubNumbers) {
                workingMarked[matchRow][c] = true;
                postSpinScore += 200 * mult;
                slingoSynth.daub(effVol);
                return { ...r, used: true };
              }
            }
            if (r.type === 'JOKER') {
              const anyOpenInCol = workingMarked.some((row) => !row[c]);
              if (!anyOpenInCol) return { ...r, used: true };
            }
            return r;
          });

          setReels(processedReels);
          setMarked(workingMarked);

          const evalRes = evaluateBoardProgress(workingMarked, postSpinScore, nextSpin);
          if (evalRes.gameEnded) return;

          if (hasRemainingMoves(processedReels, workingMarked)) {
            setPhase('marking');
          } else {
            advanceAfterSpinComplete(nextSpin, evalRes.score);
          }
        }
      }, 280 + colIdx * 170);
    });
  };

  // Shot-clock countdown during 'marking' phase when timedMode is ON
  useEffect(() => {
    if (phase !== 'marking' || !timedMode) return;
    const iv = window.setInterval(() => {
      setShotClock((prev) => {
        if (prev <= 2) {
          clearInterval(iv);
          // Shot clock expired -> forfeit remaining placements on this spin (authentic timed AOL Slingo!)
          setReels((rPrev) => rPrev.map((r) => ({ ...r, used: true })));
          showBanner('info', '⏰ TIME UP ON SPIN!', 'Click TAKE SPIN for your next roll!', 1600);
          advanceAfterSpinComplete(spin, score);
          return 0;
        }
        return prev - 1.5;
      });
    }, 150);
    return () => clearInterval(iv);
  }, [phase, timedMode, spin, score, advanceAfterSpinComplete, showBanner]);

  // Handle clicking a cell [r, c] on the 5x5 Slingo matrix
  const handleCellClick = (r: number, c: number) => {
    if (phase !== 'marking') return;
    if (marked[r][c]) return;

    const colReel = reels[c];
    let consumedReelCol = -1;

    // Priority 1: Exact NUMBER match in column c
    if (!colReel.used && colReel.type === 'NUMBER' && colReel.number === board[r][c]) {
      consumedReelCol = c;
    }
    // Priority 2: Column JOKER in column c
    else if (!colReel.used && colReel.type === 'JOKER') {
      consumedReelCol = c;
    }
    // Priority 3: Any unused SUPER_JOKER across any of the 5 reels
    else {
      const sjCol = reels.findIndex((rl) => !rl.used && rl.type === 'SUPER_JOKER');
      if (sjCol !== -1) {
        consumedReelCol = sjCol;
      }
    }

    if (consumedReelCol === -1) return;

    slingoSynth.daub(effVol);

    const nextMarked = marked.map((row, rIdx) =>
      row.map((val, cIdx) => (rIdx === r && cIdx === c ? true : val))
    );
    const nextReels = reels.map((rl, idx) => {
      if (idx === consumedReelCol) return { ...rl, used: true };
      return rl;
    });
    // Also clean up any JOKER whose column is now completely full, or NUMBER that was just covered by a Super Joker
    const cleanedReels = nextReels.map((rl, idx) => {
      if (rl.used) return rl;
      if (rl.type === 'NUMBER') {
        const stillOpen = board.some((row, rIdx) => row[idx] === rl.number && !nextMarked[rIdx][idx]);
        if (!stillOpen) return { ...rl, used: true };
      }
      if (rl.type === 'JOKER') {
        const anyOpen = nextMarked.some((row) => !row[idx]);
        if (!anyOpen) return { ...rl, used: true };
      }
      if (rl.type === 'SUPER_JOKER') {
        const anyBoardOpen = nextMarked.some((row) => row.some((v) => !v));
        if (!anyBoardOpen) return { ...rl, used: true };
      }
      return rl;
    });

    const gained = 200 * mult;
    const updatedScore = score + gained;

    setMarked(nextMarked);
    setReels(cleanedReels);

    const evalRes = evaluateBoardProgress(nextMarked, updatedScore, spin);
    if (evalRes.gameEnded) return;

    if (!hasRemainingMoves(cleanedReels, nextMarked)) {
      advanceAfterSpinComplete(spin, evalRes.score);
    }
  };

  // Compute which cells are currently clickable & which cell is recommended by Deluxe "Vision"
  const hasSuperJokerActive =
    phase === 'marking' && reels.some((rl) => !rl.used && rl.type === 'SUPER_JOKER');

  const isCellClickable = (r: number, c: number): boolean => {
    if (phase !== 'marking' || marked[r][c]) return false;
    if (hasSuperJokerActive) return true;
    const rl = reels[c];
    if (!rl || rl.used) return false;
    if (rl.type === 'JOKER') return true;
    if (rl.type === 'NUMBER' && rl.number === board[r][c]) return true;
    return false;
  };

  // Vision helper: score each clickable wild cell by how close its lines are to Slingo!
  const getBestVisionCells = (): Set<string> => {
    const set = new Set<string>();
    if (phase !== 'marking' || !(gameMode === 'Deluxe' && powerup === 'vision')) return set;
    const wildActive = hasSuperJokerActive || reels.some((rl) => !rl.used && rl.type === 'JOKER');
    if (!wildActive) return set;

    let bestVal = -1;
    let bestCoords: string[] = [];
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (!isCellClickable(r, c)) continue;
        // Skip if it's an exact number match (that one is mandatory anyway)
        if (!reels[c].used && reels[c].type === 'NUMBER' && reels[c].number === board[r][c]) continue;
        let weight = r === 2 && c === 2 ? 3 : r === c || r + c === 4 ? 2 : 1;
        for (const line of ALL_SLINGO_LINES) {
          if (line.cells.some(([lr, lc]) => lr === r && lc === c)) {
            const countMarked = line.cells.filter(([lr, lc]) => marked[lr][lc]).length;
            if (countMarked === 4) weight += 50; // Instant SLINGO!
            else if (countMarked === 3) weight += 12;
            else weight += countMarked * 2;
          }
        }
        if (weight > bestVal) {
          bestVal = weight;
          bestCoords = [`${r},${c}`];
        } else if (weight === bestVal) {
          bestCoords.push(`${r},${c}`);
        }
      }
    }
    bestCoords.forEach((k) => set.add(k));
    return set;
  };

  const visionCells = getBestVisionCells();
  const nextSpinNum = Math.min(maxSpins, spin + 1);
  const nextSpinCost = nextSpinNum >= 17 && freeSpins === 0 ? PAID_SPIN_COSTS[nextSpinNum] || 2000 : 0;

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: 'radial-gradient(circle at 50% 25%, #1e3a8a 0%, #0f1f56 62%, #070e2c 100%)',
        color: '#fff',
        fontFamily: 'Tahoma, Verdana, sans-serif',
        fontSize: 11,
        minHeight: 0,
        userSelect: 'none',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <style>{`
        @keyframes slingoPulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 8px #facc15; }
          50% { transform: scale(1.05); box-shadow: 0 0 18px #fde047, inset 0 0 8px #fef08a; }
        }
        @keyframes slingoSpinBlur {
          0% { transform: translateY(-10px); opacity: 0.65; }
          50% { transform: translateY(10px); opacity: 0.95; }
          100% { transform: translateY(-10px); opacity: 0.65; }
        }
        @keyframes slingoBtnGlow {
          0%, 100% { box-shadow: 0 0 10px rgba(250, 204, 21, 0.55), inset 0 1px 0 #fff; }
          50% { box-shadow: 0 0 22px rgba(250, 204, 21, 0.95), inset 0 1px 0 #fff; }
        }
      `}</style>

      {/* Top Classic XP Game Menu Bar */}
      <div className="xp-menubar" style={{ color: '#000', flexShrink: 0 }}>
        <span className="xp-menu-item" onClick={() => startNewGame()}>
          New Game
        </span>
        <span
          className="xp-menu-item"
          onClick={() => {
            const nextMode = gameMode === 'Classic AOL' ? 'Deluxe' : 'Classic AOL';
            setGameMode(nextMode);
            startNewGame(nextMode, powerup);
          }}
        >
          Mode: <b>{gameMode}</b>
        </span>
        <span className="xp-menu-item" onClick={() => setAutoDaubNumbers((v) => !v)}>
          Auto-Match: <b>{autoDaubNumbers ? 'ON' : 'OFF'}</b>
        </span>
        <span className="xp-menu-item" onClick={() => setTimedMode((v) => !v)}>
          Shot Clock: <b>{timedMode ? 'ON' : 'Relaxed'}</b>
        </span>
        <span className="xp-menu-item" onClick={() => setShowHighScores(true)}>
          High Scores
        </span>
        <span className="xp-menu-item" onClick={() => setShowLounge((v) => !v)}>
          AOL Lounge
        </span>
        <span className="xp-menu-item" onClick={() => setShowRulesModal(true)}>
          How to Play & Paytable
        </span>
      </div>

      {/* Top Gold-Trimmed Marquee Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 14px',
          background: 'linear-gradient(180deg, #172554 0%, #0b1536 100%)',
          borderBottom: '2px solid #f59e0b',
          flexShrink: 0,
          gap: 10,
          flexWrap: 'wrap',
        }}
      >
        {/* Jewel-Colored 3D S-L-I-N-G-O Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          {[
            { ch: 'S', bg: '#ef4444' },
            { ch: 'L', bg: '#f59e0b' },
            { ch: 'I', bg: '#10b981' },
            { ch: 'N', bg: '#3b82f6' },
            { ch: 'G', bg: '#8b5cf6' },
            { ch: 'O', bg: '#ec4899' },
          ].map((b, i) => (
            <div
              key={i}
              style={{
                width: 26,
                height: 26,
                borderRadius: '50%',
                background: `radial-gradient(circle at 35% 30%, #fff 0%, ${b.bg} 42%, #111827 100%)`,
                border: '2px solid #fde047',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: 14,
                color: '#fff',
                textShadow: '0 1px 2px #000',
              }}
            >
              {b.ch}
            </div>
          ))}
          <span
            style={{
              marginLeft: 6,
              fontSize: 11,
              fontWeight: 800,
              color: '#fde047',
              letterSpacing: 0.6,
            }}
          >
            {gameMode === 'Classic AOL' ? 'CLASSIC AOL EDITION' : 'DELUXE EDITION'}
          </span>
        </div>

        {/* Digital LED Score, Spin, Free Spins, High Score Counters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              background: '#050816',
              border: '2px solid #d97706',
              borderRadius: 5,
              padding: '2px 10px',
              textAlign: 'center',
              minWidth: 106,
            }}
          >
            <div style={{ fontSize: 9, color: '#fbbf24', fontWeight: 800 }}>SCORE</div>
            <div style={{ fontSize: 17, fontWeight: 900, color: '#4ade80', fontFamily: "'Courier New', monospace" }}>
              {score.toLocaleString()}
            </div>
          </div>

          <div
            style={{
              background: '#050816',
              border: '2px solid #60a5fa',
              borderRadius: 5,
              padding: '2px 9px',
              textAlign: 'center',
              minWidth: 74,
            }}
          >
            <div style={{ fontSize: 9, color: '#93c5fd', fontWeight: 800 }}>SPIN</div>
            <div style={{ fontSize: 17, fontWeight: 900, color: '#ffffff', fontFamily: "'Courier New', monospace" }}>
              {spin}/{maxSpins}
            </div>
          </div>

          <div
            style={{
              background: '#050816',
              border: '2px solid #34d399',
              borderRadius: 5,
              padding: '2px 9px',
              textAlign: 'center',
              minWidth: 72,
            }}
          >
            <div style={{ fontSize: 9, color: '#6ee7b7', fontWeight: 800 }}>FREE SPINS</div>
            <div style={{ fontSize: 17, fontWeight: 900, color: '#fde047', fontFamily: "'Courier New', monospace" }}>
              {freeSpins}
            </div>
          </div>

          <div
            style={{
              background: '#050816',
              border: '2px solid #a855f7',
              borderRadius: 5,
              padding: '2px 9px',
              textAlign: 'center',
              minWidth: 92,
              cursor: 'pointer',
            }}
            onClick={() => setShowHighScores(true)}
            title="Click to view Hall of Fame"
          >
            <div style={{ fontSize: 9, color: '#d8b4fe', fontWeight: 800 }}>BEST SCORE</div>
            <div style={{ fontSize: 15, fontWeight: 900, color: '#facc15', fontFamily: "'Courier New', monospace" }}>
              {(highScores[0]?.score || 0).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Main Cabinet Stage */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          gap: 10,
          padding: 10,
          minHeight: 0,
          overflow: 'auto',
          alignItems: 'stretch',
        }}
      >
        {/* Left Column: 12-Step SLINGO Ladder + Deluxe Powerup Selector */}
        <div
          style={{
            width: 158,
            flexShrink: 0,
            background: 'linear-gradient(180deg, #162456 0%, #0c1638 100%)',
            border: '2px solid #f59e0b',
            borderRadius: 8,
            padding: 8,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 6,
          }}
        >
          <div>
            <div
              style={{
                textAlign: 'center',
                fontWeight: 900,
                color: '#fde047',
                fontSize: 11,
                borderBottom: '1px solid rgba(250,204,21,0.35)',
                paddingBottom: 4,
                marginBottom: 5,
              }}
            >
              ★ SLINGO LADDER ★
            </div>

            {/* Full Card Top Jackpot Box */}
            <div
              style={{
                padding: '4px 6px',
                borderRadius: 4,
                marginBottom: 4,
                background:
                  completedLines.length === 12
                    ? 'linear-gradient(90deg, #f59e0b, #fde047)'
                    : 'rgba(239, 68, 68, 0.28)',
                border: '1px solid #f59e0b',
                color: completedLines.length === 12 ? '#000' : '#fde047',
                fontWeight: 900,
                fontSize: 10,
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>FULL CARD</span>
              <span>
                {(
                  (FULL_CARD_BONUS_BY_SPIN[Math.max(5, Math.min(22, spin || 5))] || 6500) * mult
                ).toLocaleString()}
              </span>
            </div>

            {/* 12 Slingos Meter */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {[12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((n) => {
                const reached = completedLines.length >= n;
                return (
                  <div
                    key={n}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '1.5px 6px',
                      borderRadius: 3,
                      fontSize: 10,
                      fontWeight: reached ? 800 : 600,
                      background: reached
                        ? 'linear-gradient(90deg, #16a34a 0%, #22c55e 100%)'
                        : 'rgba(255,255,255,0.06)',
                      color: reached ? '#fff' : '#cbd5e1',
                    }}
                  >
                    <span>{n} Slingo{n > 1 ? 's' : ''}</span>
                    <span>{(n * 1000 * mult).toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Deluxe Powerup Box */}
          <div
            style={{
              borderTop: '1px solid rgba(255,255,255,0.18)',
              paddingTop: 6,
              fontSize: 10,
            }}
          >
            <div style={{ color: '#93c5fd', fontWeight: 800, marginBottom: 3 }}>
              {gameMode === 'Deluxe' ? '⚡ Deluxe Powerup:' : '🕹️ Classic Options:'}
            </div>
            {gameMode === 'Deluxe' ? (
              <select
                value={powerup}
                onChange={(e) => {
                  const p = e.target.value as DeluxePowerup;
                  setPowerup(p);
                  startNewGame('Deluxe', p);
                }}
                style={{
                  width: '100%',
                  background: '#0f172a',
                  color: '#fde047',
                  border: '1px solid #f59e0b',
                  borderRadius: 4,
                  padding: '3px 4px',
                  fontSize: 10,
                  fontWeight: 700,
                }}
              >
                <option value="vision">🔮 Slingo Vision (Best Move)</option>
                <option value="devil_shield">🛡️ Devil Shield (2 Blocks)</option>
                <option value="multiplier_2x">✨ 2× Score Multiplier</option>
                <option value="extra_spins">🎰 22 Spins Extended</option>
              </select>
            ) : (
              <button
                onClick={() => {
                  setGameMode('Deluxe');
                  startNewGame('Deluxe', powerup);
                }}
                style={{
                  width: '100%',
                  padding: '4px 6px',
                  borderRadius: 4,
                  border: '1px solid #60a5fa',
                  background: '#1d4ed8',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 10,
                  cursor: 'pointer',
                }}
              >
                Switch to Deluxe Powerups
              </button>
            )}
            {shieldCharges > 0 && (
              <div style={{ marginTop: 4, color: '#6ee7b7', fontWeight: 700 }}>
                🛡️ Shields Active: {shieldCharges}
              </div>
            )}
          </div>
        </div>

        {/* Center Stage: 5x5 Slingo Matrix + 5 Slot Reels + Spin Controls */}
        <div
          style={{
            flex: 1,
            minWidth: 325,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(180deg, #1e3a8a 0%, #112259 100%)',
            border: '3px solid #facc15',
            borderRadius: 10,
            padding: '8px 12px',
            boxShadow: 'inset 0 0 24px rgba(0,0,0,0.55)',
            position: 'relative',
          }}
        >
          {/* Floating Animated Event Banner (Devil / Cherub / Slingo / Jackpot) */}
          {eventBanner && (
            <div
              style={{
                position: 'absolute',
                top: 10,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 30,
                padding: '7px 18px',
                borderRadius: 8,
                border: '2px solid #fff',
                background:
                  eventBanner.kind === 'devil'
                    ? 'linear-gradient(180deg, #dc2626 0%, #7f1d1d 100%)'
                    : eventBanner.kind === 'cherub'
                    ? 'linear-gradient(180deg, #0ea5e9 0%, #0369a1 100%)'
                    : eventBanner.kind === 'fullcard'
                    ? 'linear-gradient(180deg, #f59e0b 0%, #b45309 100%)'
                    : 'linear-gradient(180deg, #16a34a 0%, #14532d 100%)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.65)',
                textAlign: 'center',
                pointerEvents: 'none',
                minWidth: 260,
              }}
            >
              <div style={{ fontWeight: 900, fontSize: 14, color: '#fef08a', textShadow: '0 1px 2px #000' }}>
                {eventBanner.title}
              </div>
              {eventBanner.subtitle && (
                <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', marginTop: 2 }}>
                  {eventBanner.subtitle}
                </div>
              )}
            </div>
          )}

          {/* Column Range Headers */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 58px)',
              gap: 6,
              marginBottom: 4,
            }}
          >
            {['1–15', '16–30', '31–45', '46–60', '61–75'].map((rng, c) => (
              <div
                key={c}
                style={{
                  textAlign: 'center',
                  fontSize: 10,
                  fontWeight: 900,
                  color: '#fde047',
                  background: 'rgba(0,0,0,0.35)',
                  borderRadius: 4,
                  padding: '2px 0',
                  border: '1px solid rgba(250,204,21,0.35)',
                }}
              >
                {rng}
              </div>
            ))}
          </div>

          {/* 5x5 SLINGO MATRIX */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 58px)',
              gridTemplateRows: 'repeat(5, 52px)',
              gap: 6,
              padding: 7,
              background: '#091230',
              border: '2px solid #ca8a04',
              borderRadius: 8,
            }}
          >
            {board.map((row, r) =>
              row.map((num, c) => {
                const isCovered = marked[r][c];
                const clickable = isCellClickable(r, c);
                const isFlashing = flashCells.has(`${r},${c}`);
                const isVisionBest = visionCells.has(`${r},${c}`);

                return (
                  <button
                    key={`${r}-${c}`}
                    type="button"
                    onClick={() => handleCellClick(r, c)}
                    style={{
                      width: 58,
                      height: 52,
                      borderRadius: 6,
                      border: isFlashing
                        ? '2px solid #ffffff'
                        : clickable
                        ? '2px solid #fde047'
                        : isCovered
                        ? '2px solid #b45309'
                        : '2px solid #94a3b8',
                      background: isFlashing
                        ? 'linear-gradient(135deg, #fde047 0%, #f59e0b 100%)'
                        : isCovered
                        ? 'radial-gradient(circle at 35% 30%, #ef4444 0%, #991b1b 85%)'
                        : clickable
                        ? 'linear-gradient(180deg, #fef9c3 0%, #fde047 100%)'
                        : 'linear-gradient(180deg, #ffffff 0%, #e2e8f0 100%)',
                      cursor: clickable ? 'pointer' : 'default',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      padding: 0,
                      outline: 'none',
                      animation: clickable ? 'slingoPulse 0.9s ease-in-out infinite' : 'none',
                      boxShadow: isCovered
                        ? 'inset 0 2px 4px rgba(255,255,255,0.35)'
                        : 'inset 0 2px 0 #fff, 0 2px 4px rgba(0,0,0,0.4)',
                    }}
                  >
                    {isCovered ? (
                      <>
                        <span style={{ fontSize: 23, color: '#fde047', lineHeight: 1, textShadow: '0 1px 2px #000' }}>
                          ★
                        </span>
                        <span style={{ fontSize: 8.5, fontWeight: 800, color: '#fecaca', marginTop: -1 }}>
                          {num}
                        </span>
                      </>
                    ) : (
                      <>
                        <span
                          style={{
                            fontSize: 20,
                            fontWeight: 900,
                            color: clickable ? '#7c2d12' : '#0f172a',
                            fontFamily: "'Arial Black', Tahoma, sans-serif",
                            lineHeight: 1,
                          }}
                        >
                          {num}
                        </span>
                        {isVisionBest && (
                          <span
                            style={{
                              position: 'absolute',
                              top: 1,
                              right: 2,
                              fontSize: 9,
                              background: '#7c3aed',
                              color: '#fff',
                              borderRadius: 3,
                              padding: '0 3px',
                              fontWeight: 900,
                            }}
                            title="Slingo Vision: Best Strategic Square!"
                          >
                            BEST
                          </span>
                        )}
                      </>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Shot Clock / Instruction Strip */}
          <div style={{ width: 318, marginTop: 5, marginBottom: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 800, marginBottom: 2 }}>
              <span style={{ color: '#fde047' }}>
                {phase === 'marking'
                  ? hasSuperJokerActive
                    ? '🌟 SUPER JOKER! Click ANY square on the board!'
                    : '👆 Click highlighted matching/wild squares above!'
                  : phase === 'spinning'
                  ? '🎰 Spinning reels...'
                  : phase === 'gameover'
                  ? '🏁 Game Complete! Click PLAY AGAIN to start a new card!'
                  : spin === 0
                  ? '👇 Click TAKE SPIN to begin Game!'
                  : nextSpinCost > 0
                  ? `⚠️ Spin ${nextSpinNum} costs ${nextSpinCost.toLocaleString()} pts`
                  : `👇 Ready for Spin ${nextSpinNum} of ${maxSpins}`}
              </span>
              {timedMode && phase === 'marking' && (
                <span style={{ color: shotClock < 30 ? '#f87171' : '#86efac' }}>
                  ⏱ {Math.ceil(shotClock / 10)}s
                </span>
              )}
            </div>
            {timedMode && (
              <div
                style={{
                  height: 6,
                  background: '#091230',
                  borderRadius: 4,
                  overflow: 'hidden',
                  border: '1px solid #334155',
                }}
              >
                <div
                  style={{
                    width: `${phase === 'marking' ? shotClock : 100}%`,
                    height: '100%',
                    background:
                      shotClock > 50 ? '#22c55e' : shotClock > 25 ? '#eab308' : '#ef4444',
                    transition: 'width 0.14s linear',
                  }}
                />
              </div>
            )}
          </div>

          {/* 5 SLOT REELS */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 58px)',
              gap: 6,
              padding: '6px 8px',
              background: 'linear-gradient(180deg, #78350f 0%, #451a03 100%)',
              border: '2px solid #facc15',
              borderRadius: 8,
              boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
            }}
          >
            {reels.map((rl, c) => {
              const isColSpinning = spinningCols[c];
              const needsAction = phase === 'marking' && !rl.used;
              return (
                <div
                  key={c}
                  style={{
                    width: 58,
                    height: 54,
                    borderRadius: 5,
                    background: needsAction
                      ? 'linear-gradient(180deg, #fef08a 0%, #ffffff 50%, #fef08a 100%)'
                      : 'linear-gradient(180deg, #cbd5e1 0%, #ffffff 48%, #cbd5e1 100%)',
                    border: needsAction ? '2px solid #16a34a' : '2px solid #475569',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    boxShadow: 'inset 0 3px 6px rgba(0,0,0,0.35)',
                  }}
                >
                  {isColSpinning ? (
                    <div
                      style={{
                        animation: 'slingoSpinBlur 0.16s linear infinite',
                        fontWeight: 900,
                        fontSize: 20,
                        color: '#64748b',
                      }}
                    >
                      {c * 15 + ((spin * 7 + c * 3) % 15) + 1}
                    </div>
                  ) : (
                    <SlingoSymbolGraphic type={rl.type} number={rl.number} size={44} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Bottom Action Bar: TAKE SPIN / Paid Spin Risk Decision / New Game */}
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
            {phase === 'paid_spin_prompt' ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: 'rgba(127, 29, 29, 0.92)',
                  border: '2px solid #fde047',
                  borderRadius: 8,
                  padding: '5px 10px',
                }}
              >
                <span style={{ fontWeight: 800, color: '#fef08a', fontSize: 11 }}>
                  Spin {nextSpinNum} costs {(PAID_SPIN_COSTS[nextSpinNum] || 2000).toLocaleString()} pts!
                </span>
                <button
                  type="button"
                  onClick={() => executeSpin(true)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 5,
                    border: '1px solid #fff',
                    background: 'linear-gradient(180deg, #22c55e 0%, #15803d 100%)',
                    color: '#fff',
                    fontWeight: 900,
                    fontSize: 11,
                    cursor: 'pointer',
                  }}
                >
                  🎰 Pay & Take Spin {nextSpinNum}
                </button>
                <button
                  type="button"
                  onClick={() => finalizeGame(score, completedLines.length, false)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: 5,
                    border: '1px solid #fca5a5',
                    background: '#991b1b',
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: 11,
                    cursor: 'pointer',
                  }}
                >
                  💰 Keep {score.toLocaleString()} & End
                </button>
              </div>
            ) : phase === 'gameover' ? (
              <button
                type="button"
                onClick={() => startNewGame()}
                style={{
                  padding: '8px 28px',
                  borderRadius: 20,
                  border: '2px solid #fef08a',
                  background: 'linear-gradient(180deg, #22c55e 0%, #15803d 100%)',
                  color: '#fff',
                  fontWeight: 900,
                  fontSize: 14,
                  cursor: 'pointer',
                  animation: 'slingoBtnGlow 1.3s infinite',
                }}
              >
                ★ PLAY NEW SLINGO CARD ★
              </button>
            ) : (
              <>
                <button
                  type="button"
                  disabled={phase !== 'ready_to_spin'}
                  onClick={() => executeSpin(false)}
                  style={{
                    padding: '7px 30px',
                    borderRadius: 22,
                    border: '2px solid #fef08a',
                    background:
                      phase === 'ready_to_spin'
                        ? 'linear-gradient(180deg, #facc15 0%, #eab308 48%, #ca8a04 100%)'
                        : '#475569',
                    color: phase === 'ready_to_spin' ? '#451a03' : '#94a3b8',
                    fontWeight: 900,
                    fontSize: 14,
                    letterSpacing: 0.5,
                    cursor: phase === 'ready_to_spin' ? 'pointer' : 'not-allowed',
                    animation: phase === 'ready_to_spin' ? 'slingoBtnGlow 1.3s infinite' : 'none',
                  }}
                >
                  {spin === 0 ? '🎰 TAKE FIRST SPIN!' : `🎰 TAKE SPIN ${nextSpinNum}`}
                </button>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 10, color: '#cbd5e1' }}>
                  <input
                    type="checkbox"
                    checked={autoDaubNumbers}
                    onChange={(e) => setAutoDaubNumbers(e.target.checked)}
                  />
                  Auto-Match Numbers
                </label>
              </>
            )}
          </div>
        </div>

        {/* Right Optional Classic AOL Slingo Game Room Chat & Quick Legend */}
        {showLounge && (
          <div
            style={{
              width: 195,
              flexShrink: 0,
              background: 'linear-gradient(180deg, #162456 0%, #0c1638 100%)',
              border: '2px solid #60a5fa',
              borderRadius: 8,
              padding: 8,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 6,
            }}
          >
            {/* Quick Symbol Pay Legend */}
            <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 5, padding: 6, fontSize: 10, lineHeight: 1.45 }}>
              <div style={{ fontWeight: 900, color: '#fde047', marginBottom: 2 }}>SYMBOL GUIDE</div>
              <div>🔢 <b>Number:</b> +{(200 * mult).toLocaleString()} pts</div>
              <div>🃏 <b>Joker:</b> Column Wild</div>
              <div>🌟 <b>Super Joker:</b> Any Square</div>
              <div>🪙 <b>Gold Coin:</b> +{(1000 * mult).toLocaleString()} pts</div>
              <div>🔄 <b>Free Spin:</b> Free Turn</div>
              <div>😈 <b>Devil:</b> ½ Score!</div>
              <div>👼 <b>Cherub:</b> Saves Score!</div>
            </div>

            {/* Classic AOL Keyword: SLINGO Lounge Chat */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div style={{ fontWeight: 800, color: '#93c5fd', fontSize: 10, marginBottom: 3 }}>
                💬 AOL Slingo Lounge (Keyword: SLINGO)
              </div>
              <div
                style={{
                  flex: 1,
                  background: '#ffffff',
                  color: '#0f172a',
                  borderRadius: 4,
                  padding: 6,
                  overflowY: 'auto',
                  fontSize: 10,
                  lineHeight: 1.38,
                }}
              >
                {loungeMsgs.map((m, idx) => (
                  <div key={idx} style={{ marginBottom: 4 }}>
                    <b style={{ color: m.user === 'Administrator' ? '#1d4ed8' : '#b91c1c' }}>{m.user}:</b>{' '}
                    <span>{m.text}</span>
                  </div>
                ))}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!chatInput.trim()) return;
                  const txt = chatInput.trim();
                  setChatInput('');
                  setLoungeMsgs((prev) => [...prev.slice(-14), { user: 'Administrator', text: txt }]);
                  window.setTimeout(() => {
                    const replies = [
                      'nice spin!! keep those jokers coming!',
                      'watch spin 17-20 costs unless you got free spins!',
                      'nothing beats clearing a full card on AOL Slingo!',
                      'may the Cherub protect your score!! 👼',
                    ];
                    setLoungeMsgs((prev) => [
                      ...prev.slice(-14),
                      {
                        user: 'SlingoQueen04',
                        text: replies[Math.floor(Math.random() * replies.length)],
                      },
                    ]);
                  }, 900);
                }}
                style={{ display: 'flex', gap: 4, marginTop: 4 }}
              >
                <input
                  className="xp-input"
                  style={{ flex: 1, height: 21, fontSize: 10, color: '#000' }}
                  placeholder="Chat in Slingo room..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                />
                <button type="submit" className="xp-btn" style={{ padding: '1px 7px', minHeight: 21, fontSize: 10 }}>
                  Send
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* High Scores Hall of Fame Modal */}
      {showHighScores && (
        <div
          onClick={() => setShowHighScores(false)}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.68)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 60,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 390,
              background: '#ece9d8',
              color: '#000',
              border: '2px solid #0054e3',
              borderRadius: 6,
              padding: 14,
              boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
            }}
          >
            <div style={{ fontWeight: 900, fontSize: 14, color: '#00309c', marginBottom: 8 }}>
              🏆 Slingo Hall of Fame (Persistent OS Storage)
            </div>
            <div style={{ background: '#fff', border: '1px solid #7f9db9', padding: 8, maxHeight: 240, overflowY: 'auto' }}>
              {highScores.map((hs, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '24px 1fr 74px 68px',
                    padding: '4px 4px',
                    borderBottom: '1px solid #f1f5f9',
                    fontWeight: idx === 0 ? 700 : 400,
                  }}
                >
                  <span>#{idx + 1}</span>
                  <span>
                    {hs.name} {hs.fullCard ? '★' : ''}
                  </span>
                  <span style={{ color: '#64748b', fontSize: 10 }}>{hs.slingos} Slingos</span>
                  <span style={{ textAlign: 'right', fontWeight: 700, color: '#15803d' }}>
                    {hs.score.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
              <button className="xp-btn xp-btn-primary" onClick={() => setShowHighScores(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rules & Official AOL Slingo Paytable Modal */}
      {showRulesModal && (
        <div
          onClick={() => setShowRulesModal(false)}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.68)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 60,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 440,
              maxHeight: '88%',
              overflowY: 'auto',
              background: '#ece9d8',
              color: '#000',
              border: '2px solid #0054e3',
              borderRadius: 6,
              padding: 14,
              boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
              lineHeight: 1.45,
            }}
          >
            <div style={{ fontWeight: 900, fontSize: 14, color: '#00309c', marginBottom: 6 }}>
              🎰 Official Classic Slingo Rules & Paytable
            </div>
            <ul style={{ paddingLeft: 18, margin: '6px 0' }}>
              <li>
                <b>20 Spins per Game:</b> Spins 1–16 are free. Final Spins cost points unless you have a{' '}
                <b>Free Spin</b> token (Spin 17: 500 • Spin 18: 1,000 • Spin 19: 1,500 • Spin 20: 2,000).
              </li>
              <li>
                <b>Numbers & Wilds:</b> Match numbers in their column (+200 pts). <b>Jokers</b> cover ANY number in
                their column. <b>Super Jokers</b> cover ANY number on the entire 5×5 card!
              </li>
              <li>
                <b>Multi-Joker Spin Bonus:</b> 3 Jokers = +1,000 • 4 Jokers = +2,500 • 5 Jokers = +5,000!
              </li>
              <li>
                <b>Slingos (5-in-a-Row):</b> Horizontal, vertical, or diagonal = <b>+1,000 pts</b> each (12 possible).
              </li>
              <li>
                <b>Devil & Cherub:</b> The Devil cuts your score in half — unless the <b>Cherub</b> shoots him with an
                arrow!
              </li>
              <li>
                <b>Full Card Bonus:</b> Spin 5 = <b>15,000 pts</b> down to Spin 20 = <b>6,500 pts</b>!
              </li>
            </ul>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
              <button className="xp-btn xp-btn-primary" onClick={() => setShowRulesModal(false)}>
                Got It!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

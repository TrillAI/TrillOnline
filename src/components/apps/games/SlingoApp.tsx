import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSound } from '../../../context/SoundContext';
import { idbGet, persistHybrid, loadLocalFast } from '../../../services/persistentStorage';

/* ============================================================================
   AUTHENTIC CLASSIC AOL SLINGO (1998) & SLINGO DELUXE (2002)
   - Classic Crimson/Gold Beveled Casino Cabinet + Cream 5x5 Embossed Tiles
   - Iconic Crimson-Gold Star Medallion Daubs + 5 3D Cylindrical Slot Drums
   - Real Recorded Villain Devil Laugh WAVs + Slot/Coin/Joker/Cherub/Slingo Audio
   - Animated Pop-Out Red Devil & Winged Cherub Stage Cutscenes
   - 3 Modes (Classic AOL, Slingo Deluxe Powerups, Daily Challenge) + Trophies!
   ============================================================================ */

type ReelSymbolType = 'NUMBER' | 'JOKER' | 'SUPER_JOKER' | 'COIN' | 'FREE_SPIN' | 'DEVIL' | 'CHERUB';
type SlingoGameMode = 'Classic AOL' | 'Deluxe' | 'Daily Challenge';
type DeluxePowerup = 'vision' | 'devil_shield' | 'multiplier_2x' | 'extra_spins' | 'bounce_back';

interface ReelResult {
  type: ReelSymbolType;
  number?: number;
  used: boolean;
}

interface HighScoreEntry {
  name: string;
  score: number;
  fullCard: boolean;
  slingos: number;
  date: string;
  mode: SlingoGameMode;
}

interface SlingoCareerStats {
  gamesPlayed: number;
  fullCards: number;
  totalSlingos: number;
  devilsMet: number;
  cherubRescues: number;
  highestScore: number;
  unlockedBadges: string[];
}

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
  gameMode: SlingoGameMode;
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

const DEFAULT_STATS: SlingoCareerStats = {
  gamesPlayed: 0,
  fullCards: 0,
  totalSlingos: 0,
  devilsMet: 0,
  cherubRescues: 0,
  highestScore: 0,
  unlockedBadges: [],
};

const BADGE_DEFINITIONS = [
  { id: 'first_slingo', icon: '⭐', title: 'First Slingo!', desc: 'Complete your first 5-in-a-row Slingo line' },
  { id: 'double_slingo', icon: '⚡', title: 'Double Trouble', desc: 'Score 2+ Slingos on a single tile placement' },
  { id: 'devil_survivor', icon: '😈', title: 'Met the Devil', desc: 'Encounter the Slingo Devil and hear his laugh' },
  { id: 'cherub_blessed', icon: '👼', title: 'Cherub Rescue', desc: 'Get saved from the Devil by the Cherub or Shield' },
  { id: 'full_card', icon: '👑', title: 'Full Card Blackout', desc: 'Cover all 25 tiles before Spin 20 ends' },
  { id: 'high_roller', icon: '💰', title: '20K High Roller', desc: 'Finish a game with 20,000+ points' },
];

const ALL_SLINGO_LINES: { id: string; cells: [number, number][] }[] = [
  ...[0, 1, 2, 3, 4].map((r) => ({
    id: `r${r}`,
    cells: [0, 1, 2, 3, 4].map((c) => [r, c] as [number, number]),
  })),
  ...[0, 1, 2, 3, 4].map((c) => ({
    id: `c${c}`,
    cells: [0, 1, 2, 3, 4].map((r) => [r, c] as [number, number]),
  })),
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

function generateSlingoBoard(seedInput?: number): number[][] {
  let seed = seedInput ?? Math.floor(Math.random() * 0x7fffffff);
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  const cols: number[][] = [];
  for (let c = 0; c < 5; c++) {
    const min = c * 15 + 1;
    const pool: number[] = [];
    for (let n = min; n < min + 15; n++) pool.push(n);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor((seedInput !== undefined ? rand() : Math.random()) * (i + 1));
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
   HYBRID REAL-WAV + WEBAUDIO SLINGO SOUND ENGINE
   Uses real 16-bit PCM WAV files in /sounds/slingo/* PLUS crisp synth layers!
   ============================================================================ */
class SlingoSoundEngine {
  private ctx: AudioContext | null = null;
  private laughToggle = false;

  private ensure(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AC =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private playClip(url: string, vol: number, playbackRate = 1.0) {
    if (vol <= 0.001) return;
    try {
      const a = new Audio(url);
      a.volume = Math.min(1, vol);
      a.playbackRate = playbackRate;
      a.play().catch(() => {});
    } catch {
      // ignore
    }
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

  spinButton(vol: number) {
    this.tone(330, 0.06, 'triangle', vol * 0.25, 0, 520);
  }

  reelTick(vol: number) {
    this.tone(480 + Math.random() * 190, 0.028, 'triangle', vol * 0.13);
  }

  reelStop(col: number, vol: number) {
    this.playClip('/sounds/slingo/reel-stop.wav', vol * 0.55, 0.92 + col * 0.05);
    this.tone(190 + col * 36, 0.07, 'square', vol * 0.14, 0, 120);
  }

  daub(vol: number) {
    this.playClip('/sounds/card-place.wav', vol * 0.7, 1.15);
    this.tone(698.46, 0.08, 'sine', vol * 0.26);
    this.tone(1046.5, 0.13, 'triangle', vol * 0.24, 0.05);
  }

  coin(vol: number) {
    this.playClip('/sounds/slingo/coin-collect.wav', vol * 0.85);
    this.tone(1046.5, 0.09, 'sine', vol * 0.22);
    this.tone(1567.98, 0.2, 'sine', vol * 0.22, 0.07);
  }

  joker(vol: number) {
    this.playClip('/sounds/slingo/joker-chime.wav', vol * 0.8);
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      this.tone(f, 0.11, 'triangle', vol * 0.2, i * 0.05);
    });
  }

  devilLaugh(vol: number) {
    // Play REAL recorded evil villain laugh WAV!
    const clip = this.laughToggle
      ? '/sounds/slingo/devil-laugh-2.wav'
      : '/sounds/slingo/devil-laugh-1.wav';
    this.laughToggle = !this.laughToggle;
    this.playClip(clip, Math.min(1, vol * 0.98));
    // Add subtle low-end fire rumble underneath for theatrical punch!
    [130, 110, 92].forEach((f, i) => {
      this.tone(f, 0.22, 'sawtooth', vol * 0.16, i * 0.14, f * 0.72);
    });
  }

  cherubSave(vol: number) {
    this.playClip('/sounds/slingo/cherub-harp.wav', Math.min(1, vol * 0.95));
  }

  slingoFanfare(vol: number) {
    this.playClip('/sounds/slingo/slingo-win.wav', Math.min(1, vol * 0.88));
    const notes = [523.25, 659.25, 783.99, 659.25, 1046.5];
    const times = [0, 0.09, 0.18, 0.27, 0.38];
    notes.forEach((f, i) => {
      this.tone(f, i === 4 ? 0.36 : 0.09, 'triangle', vol * 0.25, times[i]);
    });
  }

  fullCardJackpot(vol: number) {
    this.playClip('/sounds/slingo/slingo-win.wav', Math.min(1, vol));
    const scale = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1318.5, 1567.98];
    scale.forEach((f, i) => {
      this.tone(f, 0.25, 'triangle', vol * 0.3, i * 0.075);
    });
  }
}

const slingoAudio = new SlingoSoundEngine();

/* ============================================================================
   ICONIC CLASSIC SLINGO REEL SYMBOLS & EMBOSSED STAR MEDALLION
   ============================================================================ */
const SlingoStarMedallion: React.FC<{ flashing?: boolean }> = ({ flashing }) => (
  <div
    style={{
      width: '84%',
      height: '84%',
      borderRadius: '50%',
      background: 'radial-gradient(circle at 35% 30%, #ff6b6b 0%, #dc2626 55%, #7f1d1d 100%)',
      border: '2.5px solid #fde047',
      boxShadow: flashing
        ? '0 0 14px #fde047, inset 0 1px 3px rgba(255,255,255,0.7)'
        : '0 2px 4px rgba(0,0,0,0.45), inset 0 1px 2px rgba(255,255,255,0.55)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      animation: flashing ? 'slingoStarSpin 0.8s ease-in-out infinite alternate' : 'slingoCoverPop 0.22s ease-out',
    }}
  >
    <svg width="74%" height="74%" viewBox="0 0 36 36">
      <polygon
        points="18,2 22.5,12.5 34,13.5 25,21 27.8,32.5 18,26.2 8.2,32.5 11,21 2,13.5 13.5,12.5"
        fill="#fde047"
        stroke="#854d0e"
        strokeWidth="1.4"
      />
    </svg>
  </div>
);

const SlingoReelSymbolSVG: React.FC<{ type: ReelSymbolType; number?: number; size?: number }> = ({
  type,
  number,
  size = 46,
}) => {
  if (type === 'NUMBER') {
    return (
      <div
        style={{
          fontSize: size * 0.56,
          fontWeight: 900,
          color: '#172554',
          fontFamily: "'Georgia', 'Times New Roman', 'Arial Black', serif",
          textShadow: '0 1px 0 #ffffff, 0 -1px 0 rgba(0,0,0,0.2)',
          lineHeight: 1,
        }}
      >
        {number}
      </div>
    );
  }
  if (type === 'JOKER') {
    return (
      <svg width={size} height={size} viewBox="0 0 52 52">
        {/* Authentic 3-Pronged Slingo Joker */}
        <path d="M15,23 C8,15 3,16 5,24 C8,21 11,23 14,27 Z" fill="#dc2626" stroke="#450a0a" strokeWidth="1.2" />
        <path d="M37,23 C44,15 49,16 47,24 C44,21 41,23 38,27 Z" fill="#1d4ed8" stroke="#1e1b4b" strokeWidth="1.2" />
        <path d="M18,22 C19,9 24,5 26,5 C28,5 33,9 34,22 Z" fill="#eab308" stroke="#713f12" strokeWidth="1.2" />
        <circle cx="5" cy="24" r="2.8" fill="#fde047" stroke="#713f12" />
        <circle cx="47" cy="24" r="2.8" fill="#fde047" stroke="#713f12" />
        <circle cx="26" cy="5" r="2.8" fill="#fde047" stroke="#713f12" />
        <ellipse cx="26" cy="30" rx="11" ry="10" fill="#ffedd5" stroke="#7c2d12" strokeWidth="1.3" />
        <circle cx="22" cy="28" r="1.6" fill="#111827" />
        <circle cx="30" cy="28" r="1.6" fill="#111827" />
        <circle cx="26" cy="31" r="1.8" fill="#f97316" />
        <path d="M20,33.5 Q26,39 32,33.5" fill="#fff" stroke="#b91c1c" strokeWidth="1.4" />
        <rect x="7" y="41" width="38" height="9" rx="2.5" fill="#991b1b" stroke="#fde047" strokeWidth="1" />
        <text x="26" y="48" textAnchor="middle" fontSize="7" fontWeight="900" fill="#fef08a">
          JOKER
        </text>
      </svg>
    );
  }
  if (type === 'SUPER_JOKER') {
    return (
      <svg width={size} height={size} viewBox="0 0 52 52">
        <circle cx="26" cy="24" r="19" fill="#059669" stroke="#fde047" strokeWidth="2.2" />
        <path d="M15,21 C8,13 4,15 6,22 C9,20 12,22 15,25 Z" fill="#a855f7" stroke="#3b0764" strokeWidth="1.1" />
        <path d="M37,21 C44,13 48,15 46,22 C43,20 40,22 37,25 Z" fill="#10b981" stroke="#064e3b" strokeWidth="1.1" />
        <path d="M19,20 C20,8 24,5 26,5 C28,5 32,8 33,20 Z" fill="#fde047" stroke="#713f12" strokeWidth="1.1" />
        <ellipse cx="26" cy="28" rx="10" ry="9" fill="#ecfdf5" stroke="#065f46" strokeWidth="1.2" />
        <circle cx="22.5" cy="26.5" r="1.6" fill="#064e3b" />
        <circle cx="29.5" cy="26.5" r="1.6" fill="#064e3b" />
        <path d="M21,31 Q26,36 31,31" fill="none" stroke="#047857" strokeWidth="1.8" />
        <rect x="4" y="40" width="44" height="10" rx="3" fill="#065f46" stroke="#fde047" strokeWidth="1.2" />
        <text x="26" y="47.5" textAnchor="middle" fontSize="7" fontWeight="900" fill="#fde047">
          SUPER JOKER
        </text>
      </svg>
    );
  }
  if (type === 'COIN') {
    return (
      <svg width={size} height={size} viewBox="0 0 52 52">
        <defs>
          <radialGradient id="slGoldCoin" cx="35%" cy="30%" r="65%">
            <stop offset="0%" stopColor="#fffbeb" />
            <stop offset="40%" stopColor="#facc15" />
            <stop offset="100%" stopColor="#b45309" />
          </radialGradient>
        </defs>
        <circle cx="26" cy="26" r="20" fill="url(#slGoldCoin)" stroke="#78350f" strokeWidth="2.2" />
        <circle cx="26" cy="26" r="15.5" fill="none" stroke="#fef9c3" strokeWidth="1.3" strokeDasharray="3 2" />
        <text x="26" y="25" textAnchor="middle" fontSize="10" fontWeight="900" fill="#78350f">
          1,000
        </text>
        <text x="26" y="34" textAnchor="middle" fontSize="7.5" fontWeight="900" fill="#92400e">
          COIN
        </text>
      </svg>
    );
  }
  if (type === 'FREE_SPIN') {
    return (
      <svg width={size} height={size} viewBox="0 0 52 52">
        <circle cx="26" cy="26" r="20" fill="#1d4ed8" stroke="#fde047" strokeWidth="2.4" />
        <circle cx="26" cy="26" r="15" fill="#2563eb" stroke="#93c5fd" strokeWidth="1" />
        <text x="26" y="24" textAnchor="middle" fontSize="9.5" fontWeight="900" fill="#ffffff">
          FREE
        </text>
        <text x="26" y="34" textAnchor="middle" fontSize="8.8" fontWeight="900" fill="#fde047">
          SPIN
        </text>
      </svg>
    );
  }
  if (type === 'DEVIL') {
    return (
      <svg width={size} height={size} viewBox="0 0 52 52">
        <circle cx="26" cy="27" r="19" fill="#450a0a" stroke="#ef4444" strokeWidth="2" />
        <path d="M12,17 C8,7 15,6 19,15 Z" fill="#fef08a" stroke="#7f1d1d" strokeWidth="1.2" />
        <path d="M40,17 C44,7 37,6 33,15 Z" fill="#fef08a" stroke="#7f1d1d" strokeWidth="1.2" />
        <ellipse cx="26" cy="27" rx="13" ry="12" fill="#dc2626" stroke="#450a0a" strokeWidth="1.4" />
        <polygon points="18,22 24,25 19,27" fill="#fde047" />
        <polygon points="34,22 28,25 33,27" fill="#fde047" />
        <path d="M19,32 Q26,38 33,32" fill="#fff" stroke="#450a0a" strokeWidth="1.4" />
        <polygon points="24,39 26,44 28,39" fill="#111827" />
      </svg>
    );
  }
  // CHERUB
  return (
    <svg width={size} height={size} viewBox="0 0 52 52">
      <circle cx="26" cy="27" r="19" fill="#0284c7" stroke="#bae6fd" strokeWidth="2" />
      <ellipse cx="26" cy="10" rx="9" ry="2.6" fill="none" stroke="#fde047" strokeWidth="2.4" />
      <path d="M6,26 Q12,16 17,26 Q12,32 6,26 Z" fill="#ffffff" />
      <path d="M46,26 Q40,16 35,26 Q40,32 46,26 Z" fill="#ffffff" />
      <circle cx="26" cy="27" r="10.5" fill="#ffedd5" stroke="#c2410c" strokeWidth="1.1" />
      <circle cx="22.5" cy="25.5" r="1.6" fill="#1e293b" />
      <circle cx="29.5" cy="25.5" r="1.6" fill="#1e293b" />
      <path d="M22,30 Q26,33.5 30,30" fill="none" stroke="#e11d48" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
};

/* ============================================================================
   ANIMATED STAGE CUTSCENE: POP-OUT SLINGO DEVIL & WINGED CHERUB!
   ============================================================================ */
const DevilAndCherubCutscene: React.FC<{
  mode: 'devil' | 'cherub' | null;
  subtitle: string;
  onDismiss: () => void;
}> = ({ mode, subtitle, onDismiss }) => {
  if (!mode) return null;

  return (
    <div
      onClick={onDismiss}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 70,
        background:
          mode === 'devil'
            ? 'radial-gradient(circle at 50% 55%, rgba(220,38,38,0.48) 0%, rgba(15,4,4,0.72) 100%)'
            : 'radial-gradient(circle at 50% 45%, rgba(56,189,248,0.45) 0%, rgba(12,28,68,0.68) 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        animation: mode === 'devil' ? 'slingoDevilShake 0.45s ease-in-out' : 'slingoCoverPop 0.3s ease-out',
      }}
    >
      {mode === 'devil' ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          {/* Speech Bubble */}
          <div
            style={{
              background: '#fffbeb',
              color: '#7f1d1d',
              border: '3px solid #dc2626',
              borderRadius: 16,
              padding: '8px 18px',
              fontWeight: 900,
              fontSize: 15,
              boxShadow: '0 6px 20px rgba(0,0,0,0.55)',
              textAlign: 'center',
            }}
          >
            “MWA-HA-HA-HA!! Half your score is MINE!”
          </div>

          {/* Big Animated Classic Red Slingo Devil */}
          <svg width="168" height="164" viewBox="0 0 160 160">
            {/* Rising Flames */}
            <path
              d="M20,155 Q35,105 50,138 Q65,92 80,132 Q95,90 112,135 Q128,104 140,155 Z"
              fill="#f97316"
              opacity="0.9"
            />
            <path
              d="M34,155 Q48,120 62,144 Q80,108 98,144 Q114,120 128,155 Z"
              fill="#fde047"
            />
            {/* Pitchfork */}
            <line x1="130" y1="36" x2="118" y2="146" stroke="#78350f" strokeWidth="5" strokeLinecap="round" />
            <path
              d="M118,38 L122,20 M130,40 L134,18 M142,42 L146,22 M118,38 Q130,46 142,42"
              stroke="#facc15"
              strokeWidth="3.5"
              fill="none"
              strokeLinecap="round"
            />
            {/* Curved Horns */}
            <path d="M48,54 C28,24 44,14 60,40 Z" fill="#fef08a" stroke="#7f1d1d" strokeWidth="2.5" />
            <path d="M104,54 C124,24 108,14 92,40 Z" fill="#fef08a" stroke="#7f1d1d" strokeWidth="2.5" />
            {/* Pointed Ears */}
            <polygon points="36,72 20,62 38,84" fill="#dc2626" stroke="#450a0a" strokeWidth="2" />
            <polygon points="116,72 132,62 114,84" fill="#dc2626" stroke="#450a0a" strokeWidth="2" />
            {/* Cape & Torso */}
            <path d="M44,108 L108,108 L120,152 L32,152 Z" fill="#7f1d1d" stroke="#450a0a" strokeWidth="2.5" />
            {/* Devil Head */}
            <ellipse cx="76" cy="76" rx="38" ry="34" fill="#ef4444" stroke="#450a0a" strokeWidth="3" />
            {/* Sinister Brows & Glowing Yellow Eyes */}
            <path d="M52,60 L72,69" stroke="#290505" strokeWidth="4.5" strokeLinecap="round" />
            <path d="M100,60 L80,69" stroke="#290505" strokeWidth="4.5" strokeLinecap="round" />
            <ellipse cx="63" cy="73" rx="7" ry="5" fill="#fde047" stroke="#450a0a" strokeWidth="1.5" />
            <circle cx="64" cy="73" r="2.5" fill="#111" />
            <ellipse cx="89" cy="73" rx="7" ry="5" fill="#fde047" stroke="#450a0a" strokeWidth="1.5" />
            <circle cx="88" cy="73" r="2.5" fill="#111" />
            {/* Fanged Laughing Mouth & Goatee */}
            <path d="M53,88 Q76,110 99,88 Z" fill="#450a0a" stroke="#290505" strokeWidth="2" />
            <polygon points="59,89 63,97 67,89" fill="#ffffff" />
            <polygon points="85,89 89,97 93,89" fill="#ffffff" />
            <polygon points="71,109 76,125 81,109" fill="#111827" />
          </svg>

          <div
            style={{
              background: '#7f1d1d',
              border: '2px solid #fde047',
              borderRadius: 8,
              padding: '5px 14px',
              color: '#fef08a',
              fontWeight: 800,
              fontSize: 13,
            }}
          >
            {subtitle}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              background: '#f0f9ff',
              color: '#0369a1',
              border: '3px solid #facc15',
              borderRadius: 16,
              padding: '8px 18px',
              fontWeight: 900,
              fontSize: 15,
              boxShadow: '0 6px 20px rgba(0,0,0,0.45)',
            }}
          >
            👼 SAVED BY THE SLINGO CHERUB!! 🏹
          </div>

          <svg width="200" height="145" viewBox="0 0 200 145">
            {/* Winged Cherub with Golden Bow on Left shooting Heart Arrow at Tumbling Devil on Right! */}
            <ellipse cx="58" cy="24" rx="18" ry="5" fill="none" stroke="#fde047" strokeWidth="3.5" />
            <path d="M16,66 Q30,42 42,66 Q28,78 16,66 Z" fill="#ffffff" stroke="#bae6fd" strokeWidth="1.5" />
            <circle cx="58" cy="58" r="21" fill="#ffedd5" stroke="#c2410c" strokeWidth="2" />
            <circle cx="52" cy="55" r="2.5" fill="#1e293b" />
            <circle cx="64" cy="55" r="2.5" fill="#1e293b" />
            <path d="M52,64 Q58,70 64,64" fill="none" stroke="#e11d48" strokeWidth="2.5" strokeLinecap="round" />
            {/* Golden Bow */}
            <path d="M80,38 Q98,62 80,86" fill="none" stroke="#facc15" strokeWidth="4" />
            <line x1="80" y1="38" x2="80" y2="86" stroke="#fef08a" strokeWidth="1.5" />
            {/* Flying Arrow hitting Devil */}
            <line x1="88" y1="62" x2="136" y2="62" stroke="#fde047" strokeWidth="3.5" />
            <polygon points="142,62 132,56 132,68" fill="#ec4899" />
            {/* Bonked Mini Devil */}
            <g transform="translate(158, 66) rotate(28)">
              <circle cx="0" cy="0" r="19" fill="#dc2626" stroke="#450a0a" strokeWidth="2" />
              <text x="-10" y="4" fontSize="11" fontWeight="900" fill="#fde047">
                X X
              </text>
            </g>
          </svg>

          <div
            style={{
              background: '#0c4a6e',
              border: '2px solid #fde047',
              borderRadius: 8,
              padding: '5px 14px',
              color: '#fef08a',
              fontWeight: 800,
              fontSize: 13,
            }}
          >
            {subtitle}
          </div>
        </div>
      )}
    </div>
  );
};

const AOL_LOUNGE_CHAT_SEED = [
  { user: 'SlingoHost_AOL', text: 'Welcome to AOL Keyword: SLINGO! Watch out for that Devil laugh!' },
  { user: 'BingoQueen99', text: 'gl everyone!! going for a spin-14 full card!' },
  { user: 'DialUp_Dave', text: 'the cherub just saved my 14,200 score omg!!' },
];

export const SlingoApp: React.FC = () => {
  const { volume, muted } = useSound();
  const effVol = muted ? 0 : volume;

  const [gameMode, setGameMode] = useState<SlingoGameMode>('Classic AOL');
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
  const [rollingNumbers, setRollingNumbers] = useState<number[]>([7, 22, 37, 52, 67]);
  const [phase, setPhase] = useState<
    'ready_to_spin' | 'spinning' | 'marking' | 'paid_spin_prompt' | 'gameover'
  >('ready_to_spin');

  // Options & Modals
  const [autoDaubNumbers, setAutoDaubNumbers] = useState<boolean>(false);
  const [timedMode, setTimedMode] = useState<boolean>(true);
  const [shotClock, setShotClock] = useState<number>(100);
  const [showLounge, setShowLounge] = useState<boolean>(false);
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);
  const [showHighScores, setShowHighScores] = useState<boolean>(false);
  const [showTrophiesModal, setShowTrophiesModal] = useState<boolean>(false);
  const [bulbTick, setBulbTick] = useState<number>(0);

  // Stage Cutscene & Banner
  const [cutscene, setCutscene] = useState<{ mode: 'devil' | 'cherub'; subtitle: string } | null>(null);
  const [statusBanner, setStatusBanner] = useState<string>('Press START / TAKE SPIN to roll the reels!');

  const [highScores, setHighScores] = useState<HighScoreEntry[]>(() =>
    loadLocalFast('xp_slingo_highscores_v1', DEFAULT_HIGH_SCORES)
  );
  const [careerStats, setCareerStats] = useState<SlingoCareerStats>(() =>
    loadLocalFast('xp_slingo_stats_v1', DEFAULT_STATS)
  );
  const [loungeMsgs, setLoungeMsgs] = useState(AOL_LOUNGE_CHAT_SEED);
  const [chatInput, setChatInput] = useState('');

  const hydratedRef = useRef(false);

  // Chasing casino marquee lights
  useEffect(() => {
    const iv = window.setInterval(() => setBulbTick((t) => (t + 1) % 2), 550);
    return () => clearInterval(iv);
  }, []);

  // Rolling blurred numbers inside spinning drums
  useEffect(() => {
    if (!spinningCols.some(Boolean)) return;
    const iv = window.setInterval(() => {
      setRollingNumbers((prev) =>
        prev.map((val, c) => (spinningCols[c] ? c * 15 + 1 + Math.floor(Math.random() * 15) : val))
      );
    }, 55);
    return () => clearInterval(iv);
  }, [spinningCols]);

  const updateCareer = useCallback((updater: (prev: SlingoCareerStats) => SlingoCareerStats) => {
    setCareerStats((prev) => {
      const next = updater(prev);
      persistHybrid('xp_slingo_stats_v1', next);
      return next;
    });
  }, []);

  const unlockBadge = useCallback(
    (badgeId: string) => {
      updateCareer((prev) => {
        if (prev.unlockedBadges.includes(badgeId)) return prev;
        return { ...prev, unlockedBadges: [...prev.unlockedBadges, badgeId] };
      });
    },
    [updateCareer]
  );

  // Hydrate persistent state
  useEffect(() => {
    let mounted = true;
    (async () => {
      const savedScores = await idbGet<HighScoreEntry[]>('xp_slingo_highscores_v1');
      if (mounted && savedScores && savedScores.length > 0) setHighScores(savedScores);

      const savedStats = await idbGet<SlingoCareerStats>('xp_slingo_stats_v1');
      if (mounted && savedStats) setCareerStats(savedStats);

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

  useEffect(() => {
    if (!hydratedRef.current || phase === 'spinning') return;
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

  const triggerCutscene = useCallback((mode: 'devil' | 'cherub', subtitle: string, ms = 2700) => {
    setCutscene({ mode, subtitle });
    window.setTimeout(() => {
      setCutscene((cur) => (cur?.subtitle === subtitle ? null : cur));
    }, ms);
  }, []);

  const mult = gameMode === 'Deluxe' && powerup === 'multiplier_2x' ? 2 : 1;

  const finalizeGame = useCallback(
    (finalScore: number, finalLinesCount: number, isFullCard: boolean) => {
      const unusedFreeBonus = freeSpins * 200 * mult;
      const total = Math.max(0, finalScore + unusedFreeBonus);
      setScore(total);
      setPhase('gameover');
      setStatusBanner(
        isFullCard
          ? `★ FULL CARD BLACKOUT! Final Score: ${total.toLocaleString()} ★`
          : `Game Over! Final Score: ${total.toLocaleString()} (${finalLinesCount} Slingos)`
      );

      if (total >= 20000) unlockBadge('high_roller');
      if (isFullCard) unlockBadge('full_card');

      updateCareer((prev) => ({
        ...prev,
        gamesPlayed: prev.gamesPlayed + 1,
        fullCards: prev.fullCards + (isFullCard ? 1 : 0),
        highestScore: Math.max(prev.highestScore, total),
      }));

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
          user: 'SlingoHost_AOL',
          text: isFullCard
            ? `🎉 FULL CARD SLINGO!! Administrator scored ${total.toLocaleString()} pts!`
            : `👏 Game Over! Administrator scored ${total.toLocaleString()} pts (${finalLinesCount} Slingos).`,
        },
      ]);
    },
    [freeSpins, gameMode, mult, unlockBadge, updateCareer]
  );

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

        unlockBadge('first_slingo');
        if (newlyCompleted.length >= 2) unlockBadge('double_slingo');
        updateCareer((prev) => ({ ...prev, totalSlingos: prev.totalSlingos + newlyCompleted.length }));

        const cellsToFlash = new Set<string>();
        newlyCompleted.forEach((l) => l.cells.forEach(([r, c]) => cellsToFlash.add(`${r},${c}`)));
        setFlashCells(cellsToFlash);
        window.setTimeout(() => setFlashCells(new Set()), 1700);

        slingoAudio.slingoFanfare(effVol);
        setStatusBanner(
          newlyCompleted.length > 1
            ? `★ ${newlyCompleted.length}× MULTI-SLINGO! +${lineBonus.toLocaleString()} PTS! ★`
            : `★ SLINGO! +${lineBonus.toLocaleString()} PTS! (${nextCompletedIds.length}/12) ★`
        );
      }

      const allCovered = nextMarked.every((row) => row.every(Boolean));
      if (allCovered) {
        const fcBase = FULL_CARD_BONUS_BY_SPIN[Math.max(5, Math.min(22, currentSpin))] || 6500;
        const fcBonus = fcBase * mult;
        const finalWithFc = updatedScore + fcBonus;
        slingoAudio.fullCardJackpot(effVol);
        finalizeGame(finalWithFc, 12, true);
        return { gameEnded: true, score: finalWithFc };
      }

      setScore(updatedScore);
      return { gameEnded: false, score: updatedScore };
    },
    [completedLines, effVol, finalizeGame, mult, unlockBadge, updateCareer]
  );

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
        setStatusBanner(`Spin ${nextSpin} costs ${PAID_SPIN_COSTS[nextSpin] || 2000} pts — Take Spin or End Game!`);
      } else {
        setPhase('ready_to_spin');
        setStatusBanner('Press TAKE SPIN for your next roll!');
      }
    },
    [completedLines.length, finalizeGame, freeSpins, maxSpins]
  );

  const startNewGame = (modeOverride?: SlingoGameMode, powerupOverride?: DeluxePowerup) => {
    const m = modeOverride ?? gameMode;
    const p = powerupOverride ?? powerup;
    const totalSpins = m === 'Deluxe' && p === 'extra_spins' ? 22 : 20;
    const dailySeed =
      m === 'Daily Challenge'
        ? Number(new Date().toISOString().slice(0, 10).replace(/-/g, ''))
        : undefined;
    setBoard(generateSlingoBoard(dailySeed));
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
    setCutscene(null);
    setShotClock(100);
    setStatusBanner(
      m === 'Daily Challenge'
        ? 'Daily Seeded Card Ready — Press START GAME!'
        : 'Welcome to Classic Slingo! Press START GAME!'
    );
  };

  const rollColumnSymbol = (col: number, curMarked: boolean[][]): ReelResult => {
    const roll = Math.random();
    if (roll < 0.145) return { type: 'JOKER', used: false };
    if (roll < 0.18) return { type: 'SUPER_JOKER', used: false };
    if (roll < 0.24) return { type: 'COIN', used: true };
    if (roll < 0.28) return { type: 'FREE_SPIN', used: true };
    if ((col === 1 || col === 2 || col === 3) && roll < 0.34) {
      return { type: 'DEVIL', used: true };
    }

    const uncoveredInCol: number[] = [];
    for (let r = 0; r < 5; r++) {
      if (!curMarked[r][col]) uncoveredInCol.push(board[r][col]);
    }
    if (uncoveredInCol.length > 0 && Math.random() < 0.47) {
      const picked = uncoveredInCol[Math.floor(Math.random() * uncoveredInCol.length)];
      return { type: 'NUMBER', number: picked, used: false };
    }

    const min = col * 15 + 1;
    return { type: 'NUMBER', number: min + Math.floor(Math.random() * 15), used: false };
  };

  const executeSpin = (confirmedPaid = false) => {
    if (phase === 'spinning' || phase === 'gameover') return;
    const nextSpin = spin + 1;
    if (nextSpin > maxSpins) return;

    let workingScore = score;
    let workingFreeSpins = freeSpins;

    if (nextSpin >= 17) {
      if (workingFreeSpins > 0) {
        workingFreeSpins -= 1;
        setFreeSpins(workingFreeSpins);
        setStatusBanner(`Used 1 Free Spin Token! (${workingFreeSpins} left)`);
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

    slingoAudio.spinButton(effVol);
    setSpin(nextSpin);
    setPhase('spinning');
    setSpinningCols([true, true, true, true, true]);
    setShotClock(100);
    setStatusBanner(`Spinning Reel 1–5 (Spin ${nextSpin} of ${maxSpins})...`);

    const rolled: ReelResult[] = [0, 1, 2, 3, 4].map((c) => rollColumnSymbol(c, marked));

    // Max 1 Devil per spin
    let devilSeen = false;
    let devilCol = -1;
    for (let c = 0; c < 5; c++) {
      if (rolled[c].type === 'DEVIL') {
        if (devilSeen) rolled[c] = { type: 'COIN', used: true };
        else {
          devilSeen = true;
          devilCol = c;
        }
      }
    }

    let cherubSaved = false;
    if (devilSeen && Math.random() < 0.32) {
      const otherCol = (devilCol + 2) % 5;
      rolled[otherCol] = { type: 'CHERUB', used: true };
      cherubSaved = true;
    }

    const tickIv = window.setInterval(() => slingoAudio.reelTick(effVol), 70);

    [0, 1, 2, 3, 4].forEach((colIdx) => {
      window.setTimeout(() => {
        slingoAudio.reelStop(colIdx, effVol);
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
            slingoAudio.coin(effVol);
          }
          if (addedFree > 0) {
            workingFreeSpins += addedFree;
            setFreeSpins(workingFreeSpins);
            slingoAudio.coin(effVol);
          }
          if (jokerCount >= 3) {
            const jb = (jokerCount === 3 ? 1000 : jokerCount === 4 ? 2500 : 5000) * mult;
            postSpinScore += jb;
            slingoAudio.joker(effVol);
          } else if (jokerCount > 0) {
            slingoAudio.joker(effVol);
          }

          if (devilSeen) {
            unlockBadge('devil_survivor');
            updateCareer((prev) => ({ ...prev, devilsMet: prev.devilsMet + 1 }));

            if (cherubSaved) {
              const rescueBonus = 500 * mult;
              postSpinScore += rescueBonus;
              unlockBadge('cherub_blessed');
              updateCareer((prev) => ({ ...prev, cherubRescues: prev.cherubRescues + 1 }));
              slingoAudio.cherubSave(effVol);
              triggerCutscene('cherub', `Score Protected +${rescueBonus} Cherub Bonus!`);
            } else if (shieldCharges > 0) {
              setShieldCharges((s) => s - 1);
              unlockBadge('cherub_blessed');
              slingoAudio.cherubSave(effVol);
              triggerCutscene('cherub', 'Your Deluxe Devil Shield deflected the Devil!');
            } else {
              const lostPts = Math.ceil(postSpinScore / 2);
              if (gameMode === 'Deluxe' && powerup === 'bounce_back') {
                // Bounce-Back recovers half of the Devil's theft!
                postSpinScore = postSpinScore - Math.floor(lostPts / 2);
              } else {
                postSpinScore = Math.floor(postSpinScore / 2);
              }
              slingoAudio.devilLaugh(effVol);
              triggerCutscene(
                'devil',
                gameMode === 'Deluxe' && powerup === 'bounce_back'
                  ? `Devil stole points (Bounce-Back saved 50%!)`
                  : `Score Sliced in HALF! (-${lostPts.toLocaleString()} pts)`
              );
            }
          }

          let workingMarked = marked.map((row) => [...row]);
          const processedReels = rolled.map((r, c) => {
            if (r.type === 'NUMBER') {
              const matchRow = board.findIndex((row, rIdx) => row[c] === r.number && !workingMarked[rIdx][c]);
              if (matchRow === -1) return { ...r, used: true };
              if (autoDaubNumbers) {
                workingMarked[matchRow][c] = true;
                postSpinScore += 200 * mult;
                slingoAudio.daub(effVol);
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
            setStatusBanner('Click flashing numbers or place your Jokers on the card!');
          } else {
            advanceAfterSpinComplete(nextSpin, evalRes.score);
          }
        }
      }, 260 + colIdx * 165);
    });
  };

  // Shot-clock countdown during 'marking'
  useEffect(() => {
    if (phase !== 'marking' || !timedMode) return;
    const iv = window.setInterval(() => {
      setShotClock((prev) => {
        if (prev <= 2) {
          clearInterval(iv);
          setReels((rPrev) => rPrev.map((r) => ({ ...r, used: true })));
          setStatusBanner('⏰ Time expired on spin! Press TAKE SPIN.');
          advanceAfterSpinComplete(spin, score);
          return 0;
        }
        return prev - 1.4;
      });
    }, 150);
    return () => clearInterval(iv);
  }, [phase, timedMode, spin, score, advanceAfterSpinComplete]);

  const handleCellClick = (r: number, c: number) => {
    if (phase !== 'marking' || marked[r][c]) return;

    const colReel = reels[c];
    let consumedReelCol = -1;

    if (!colReel.used && colReel.type === 'NUMBER' && colReel.number === board[r][c]) {
      consumedReelCol = c;
    } else if (!colReel.used && colReel.type === 'JOKER') {
      consumedReelCol = c;
    } else {
      const sjCol = reels.findIndex((rl) => !rl.used && rl.type === 'SUPER_JOKER');
      if (sjCol !== -1) consumedReelCol = sjCol;
    }

    if (consumedReelCol === -1) return;

    slingoAudio.daub(effVol);

    const nextMarked = marked.map((row, rIdx) =>
      row.map((val, cIdx) => (rIdx === r && cIdx === c ? true : val))
    );
    const nextReels = reels.map((rl, idx) => (idx === consumedReelCol ? { ...rl, used: true } : rl));
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

    const updatedScore = score + 200 * mult;
    setMarked(nextMarked);
    setReels(cleanedReels);

    const evalRes = evaluateBoardProgress(nextMarked, updatedScore, spin);
    if (evalRes.gameEnded) return;

    if (!hasRemainingMoves(cleanedReels, nextMarked)) {
      advanceAfterSpinComplete(spin, evalRes.score);
    }
  };

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
        if (!reels[c].used && reels[c].type === 'NUMBER' && reels[c].number === board[r][c]) continue;
        let weight = r === 2 && c === 2 ? 3 : r === c || r + c === 4 ? 2 : 1;
        for (const line of ALL_SLINGO_LINES) {
          if (line.cells.some(([lr, lc]) => lr === r && lc === c)) {
            const countMarked = line.cells.filter(([lr, lc]) => marked[lr][lc]).length;
            if (countMarked === 4) weight += 50;
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
        background: 'radial-gradient(circle at 50% 35%, #5c0a14 0%, #310409 65%, #180205 100%)',
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
        @keyframes slingoTileGlow {
          0%, 100% { box-shadow: inset 0 0 0 2px #dc2626, 0 0 8px #fde047; transform: scale(1); }
          50% { box-shadow: inset 0 0 0 3px #facc15, 0 0 16px #fef08a; transform: scale(1.03); }
        }
        @keyframes slingoCoverPop {
          0% { transform: scale(0.45); opacity: 0.4; }
          80% { transform: scale(1.08); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes slingoStarSpin {
          0% { transform: scale(0.95) rotate(-8deg); }
          100% { transform: scale(1.08) rotate(8deg); }
        }
        @keyframes slingoDevilShake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px) rotate(-1deg); }
          40% { transform: translateX(8px) rotate(1deg); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
        @keyframes slingoSpinPulse {
          0%, 100% { box-shadow: 0 4px 10px rgba(0,0,0,0.6), 0 0 10px rgba(250,204,21,0.55); }
          50% { box-shadow: 0 4px 14px rgba(0,0,0,0.7), 0 0 22px rgba(253,224,71,0.95); }
        }
      `}</style>

      {/* Top Classic XP Menu Bar */}
      <div className="xp-menubar" style={{ color: '#000', flexShrink: 0, flexWrap: 'wrap' }}>
        <span className="xp-menu-item" onClick={() => startNewGame()}>
          New Game
        </span>
        <span
          className="xp-menu-item"
          onClick={() => {
            const order: SlingoGameMode[] = ['Classic AOL', 'Deluxe', 'Daily Challenge'];
            const nextMode = order[(order.indexOf(gameMode) + 1) % order.length];
            setGameMode(nextMode);
            startNewGame(nextMode, powerup);
          }}
        >
          Mode: <b>{gameMode}</b>
        </span>
        <span className="xp-menu-item" onClick={() => setAutoDaubNumbers((v) => !v)}>
          Auto-Daub: <b>{autoDaubNumbers ? 'ON' : 'OFF'}</b>
        </span>
        <span className="xp-menu-item" onClick={() => setTimedMode((v) => !v)}>
          Timer: <b>{timedMode ? 'ON' : 'Relaxed'}</b>
        </span>
        <span className="xp-menu-item" onClick={() => setShowHighScores(true)}>
          High Scores
        </span>
        <span className="xp-menu-item" onClick={() => setShowTrophiesModal(true)}>
          Trophies ({careerStats.unlockedBadges.length}/{BADGE_DEFINITIONS.length})
        </span>
        <span className="xp-menu-item" onClick={() => setShowLounge((v) => !v)}>
          AOL Chat {showLounge ? '▾' : '▸'}
        </span>
        <span
          className="xp-menu-item"
          style={{ color: '#991b1b', fontWeight: 700 }}
          onClick={() => {
            slingoAudio.devilLaugh(Math.max(0.5, effVol));
            triggerCutscene('devil', 'Sound Check: Authentic Slingo Devil Laugh!', 2300);
          }}
          title="Preview the Slingo Devil Laugh & Cutscene!"
        >
          😈 Hear Devil Laugh
        </span>
        <span className="xp-menu-item" onClick={() => setShowRulesModal(true)}>
          Paytable & Rules
        </span>
      </div>

      {/* Main Authentic AOL / Funkitron Slingo Cabinet */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          gap: 10,
          padding: '10px 12px',
          minHeight: 0,
          overflow: 'auto',
          alignItems: 'stretch',
          justifyContent: 'center',
        }}
      >
        {/* LEFT CONSOLE TOWER — Classic Sculpted Burgundy & Gold Slingo Control Panel */}
        <div
          style={{
            width: 192,
            flexShrink: 0,
            background: 'linear-gradient(180deg, #7f1d1d 0%, #450a0a 60%, #2a0404 100%)',
            border: '3px solid #eab308',
            borderRadius: 10,
            boxShadow: 'inset 0 0 0 2px #991b1b, 0 6px 18px rgba(0,0,0,0.6)',
            padding: '10px 10px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          {/* Arched 3D Golden SLINGO Marquee Logo */}
          <div
            style={{
              background: 'radial-gradient(circle at 50% 40%, #1e3a8a 0%, #0f172a 100%)',
              border: '2.5px solid #fde047',
              borderRadius: 8,
              padding: '6px 4px',
              textAlign: 'center',
              boxShadow: '0 3px 8px rgba(0,0,0,0.5)',
              position: 'relative',
            }}
          >
            <div
              style={{
                fontFamily: "'Arial Black', Impact, sans-serif",
                fontSize: 24,
                fontWeight: 900,
                letterSpacing: 1.5,
                background: 'linear-gradient(180deg, #ffffff 0%, #fde047 45%, #f97316 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.85))',
                lineHeight: 1.05,
              }}
            >
              SLINGO
            </div>
            <div style={{ fontSize: 9, fontWeight: 800, color: '#93c5fd', letterSpacing: 1 }}>
              {gameMode.toUpperCase()}
            </div>
          </div>

          {/* Recessed Digital Red/Gold LED Counters: SCORE & SPIN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div
              style={{
                background: '#090406',
                borderTop: '2px solid #290d0d',
                borderLeft: '2px solid #290d0d',
                borderRight: '2px solid #d97706',
                borderBottom: '2px solid #d97706',
                borderRadius: 4,
                padding: '4px 8px',
              }}
            >
              <div style={{ fontSize: 9, color: '#fde047', fontWeight: 800, letterSpacing: 0.8 }}>SCORE</div>
              <div
                style={{
                  fontSize: 21,
                  fontWeight: 900,
                  color: '#ff3b30',
                  fontFamily: "'Courier New', monospace",
                  textAlign: 'right',
                  textShadow: '0 0 8px rgba(255,59,48,0.65)',
                  lineHeight: 1.1,
                }}
              >
                {score.toLocaleString()}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <div
                style={{
                  background: '#090406',
                  border: '2px inset #78350f',
                  borderRadius: 4,
                  padding: '4px 6px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 9, color: '#fde047', fontWeight: 800 }}>SPIN</div>
                <div
                  style={{
                    fontSize: 19,
                    fontWeight: 900,
                    color: '#fbbf24',
                    fontFamily: "'Courier New', monospace",
                  }}
                >
                  {spin}/{maxSpins}
                </div>
              </div>

              <div
                style={{
                  background: '#090406',
                  border: '2px inset #78350f',
                  borderRadius: 4,
                  padding: '4px 6px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 9, color: '#93c5fd', fontWeight: 800 }}>SLINGOS</div>
                <div
                  style={{
                    fontSize: 19,
                    fontWeight: 900,
                    color: '#38bdf8',
                    fontFamily: "'Courier New', monospace",
                  }}
                >
                  {completedLines.length}/12
                </div>
              </div>
            </div>
          </div>

          {/* Vertical Segmented Tube Timer + Free Spin Coin Stack */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 8,
              background: 'rgba(0,0,0,0.32)',
              border: '1px solid rgba(250,204,21,0.35)',
              borderRadius: 6,
              padding: 7,
            }}
          >
            {/* Segmented TIME Meter */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <span style={{ fontSize: 9, fontWeight: 800, color: '#fde047' }}>TIME</span>
              <div
                style={{
                  width: 24,
                  height: 68,
                  background: '#09090b',
                  border: '2px inset #713f12',
                  borderRadius: 4,
                  padding: 2,
                  display: 'flex',
                  flexDirection: 'column-reverse',
                  gap: 2,
                }}
              >
                {Array.from({ length: 8 }, (_, seg) => {
                  const active = !timedMode || shotClock >= (seg + 1) * 12;
                  const segColor = seg < 2 ? '#ef4444' : seg < 5 ? '#facc15' : '#22c55e';
                  return (
                    <div
                      key={seg}
                      style={{
                        flex: 1,
                        borderRadius: 1,
                        background: active ? segColor : '#1f2937',
                        boxShadow: active ? `0 0 4px ${segColor}` : 'none',
                      }}
                    />
                  );
                })}
              </div>
            </div>

            {/* Free Spin Gold Token Stack */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <span style={{ fontSize: 9, fontWeight: 800, color: '#fde047' }}>FREE SPINS</span>
              <div
                style={{
                  width: 44,
                  height: 68,
                  background: '#09090b',
                  border: '2px inset #713f12',
                  borderRadius: 4,
                  display: 'flex',
                  flexDirection: 'column-reverse',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  padding: 4,
                  gap: 2,
                }}
              >
                {freeSpins === 0 ? (
                  <span style={{ fontSize: 10, color: '#6b7280', margin: 'auto' }}>0</span>
                ) : (
                  Array.from({ length: Math.min(6, freeSpins) }, (_, idx) => (
                    <div
                      key={idx}
                      style={{
                        width: 32,
                        height: 8,
                        borderRadius: 4,
                        background: 'linear-gradient(90deg, #b45309 0%, #fde047 50%, #b45309 100%)',
                        border: '1px solid #78350f',
                      }}
                    />
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Deluxe Powerup Selector (when in Deluxe mode) */}
          {gameMode === 'Deluxe' && (
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.72)',
                border: '1px solid #f59e0b',
                borderRadius: 6,
                padding: 6,
              }}
            >
              <div style={{ fontSize: 9, fontWeight: 800, color: '#fde047', marginBottom: 3 }}>
                DELUXE POWERUP {powerup === 'devil_shield' && `(${shieldCharges}🛡)`}
              </div>
              <select
                value={powerup}
                onChange={(e) => {
                  const p = e.target.value as DeluxePowerup;
                  setPowerup(p);
                  startNewGame('Deluxe', p);
                }}
                style={{
                  width: '100%',
                  fontSize: 10,
                  padding: '2px 4px',
                  borderRadius: 3,
                  background: '#1e293b',
                  color: '#fff',
                  border: '1px solid #fbbf24',
                }}
              >
                <option value="vision">🔮 Slingo Vision (Best Joker)</option>
                <option value="devil_shield">🛡️ Devil Shield (2 Blocks)</option>
                <option value="multiplier_2x">⚡ 2× All Points Multiplier</option>
                <option value="bounce_back">🪃 Devil Bounce-Back (Save 50%)</option>
                <option value="extra_spins">🎰 22-Spin Marathon</option>
              </select>
            </div>
          )}

          {/* Big Tactile Glossy Red & Gold START / TAKE SPIN Button! */}
          <div>
            {phase === 'gameover' ? (
              <button
                onClick={() => startNewGame()}
                style={{
                  width: '100%',
                  padding: '11px 8px',
                  borderRadius: 24,
                  border: '3px solid #fde047',
                  background: 'radial-gradient(circle at 50% 25%, #4ade80 0%, #16a34a 60%, #14532d 100%)',
                  color: '#fff',
                  fontWeight: 900,
                  fontSize: 14,
                  cursor: 'pointer',
                  textShadow: '0 1px 2px #000',
                  animation: 'slingoSpinPulse 1.4s infinite',
                }}
              >
                ▶ PLAY AGAIN
              </button>
            ) : phase === 'paid_spin_prompt' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <button
                  onClick={() => executeSpin(true)}
                  style={{
                    width: '100%',
                    padding: '8px 6px',
                    borderRadius: 18,
                    border: '2.5px solid #fde047',
                    background: 'linear-gradient(180deg, #ef4444 0%, #991b1b 100%)',
                    color: '#fef08a',
                    fontWeight: 900,
                    fontSize: 11,
                    cursor: 'pointer',
                  }}
                >
                  BUY SPIN {nextSpinNum} (-{nextSpinCost})
                </button>
                <button
                  onClick={() => finalizeGame(score, completedLines.length, false)}
                  style={{
                    width: '100%',
                    padding: '5px 6px',
                    borderRadius: 12,
                    border: '1px solid #9ca3af',
                    background: '#374151',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 10,
                    cursor: 'pointer',
                  }}
                >
                  CASH OUT ({score.toLocaleString()})
                </button>
              </div>
            ) : (
              <button
                disabled={phase !== 'ready_to_spin'}
                onClick={() => executeSpin(false)}
                style={{
                  width: '100%',
                  padding: '12px 8px',
                  borderRadius: 26,
                  border: '3px solid #fde047',
                  background:
                    phase === 'ready_to_spin'
                      ? 'radial-gradient(circle at 50% 25%, #ff6b6b 0%, #dc2626 55%, #7f1d1d 100%)'
                      : 'linear-gradient(180deg, #6b7280 0%, #374151 100%)',
                  color: phase === 'ready_to_spin' ? '#fffbeb' : '#d1d5db',
                  fontWeight: 900,
                  fontSize: 14,
                  letterSpacing: 0.6,
                  cursor: phase === 'ready_to_spin' ? 'pointer' : 'not-allowed',
                  textShadow: '0 2px 2px rgba(0,0,0,0.8)',
                  animation: phase === 'ready_to_spin' ? 'slingoSpinPulse 1.3s infinite' : 'none',
                }}
              >
                {spin === 0
                  ? '● START GAME'
                  : phase === 'spinning'
                  ? 'SPINNING...'
                  : phase === 'marking'
                  ? 'PLACE TILES!'
                  : '● TAKE SPIN'}
              </button>
            )}
          </div>
        </div>

        {/* CENTER BEVELED GOLD & ROYAL-BLUE CLASSIC SLINGO MACHINE */}
        <div
          style={{
            flex: '0 1 430px',
            minWidth: 330,
            background: 'linear-gradient(180deg, #1e3a8a 0%, #172554 65%, #0f172a 100%)',
            border: '4px solid #eab308',
            borderRadius: 12,
            boxShadow: 'inset 0 0 0 2px #93c5fd, 0 8px 24px rgba(0,0,0,0.65)',
            padding: '8px 12px 10px 12px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
          }}
        >
          {/* Top Chasing Casino Marquee Light Bar + Status Ticker */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#090d1f',
              border: '2px solid #ca8a04',
              borderRadius: 6,
              padding: '4px 10px',
              marginBottom: 6,
              gap: 6,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: bulbTick === 0 ? '#fde047' : '#ef4444',
                boxShadow: '0 0 6px #fde047',
                flexShrink: 0,
              }}
            />
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: '#fef08a',
                textAlign: 'center',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {statusBanner}
            </div>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: bulbTick === 1 ? '#fde047' : '#ef4444',
                boxShadow: '0 0 6px #fde047',
                flexShrink: 0,
              }}
            />
          </div>

          {/* Column Range Headers (1-15 | 16-30 | 31-45 | 46-60 | 61-75) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: 6,
              marginBottom: 4,
            }}
          >
            {['1–15', '16–30', '31–45', '46–60', '61–75'].map((rng, idx) => (
              <div
                key={rng}
                style={{
                  background: 'linear-gradient(180deg, #b91c1c 0%, #7f1d1d 100%)',
                  border: '1.5px solid #fde047',
                  borderRadius: 4,
                  textAlign: 'center',
                  fontSize: 10,
                  fontWeight: 900,
                  color: '#fef08a',
                  padding: '2px 0',
                }}
              >
                {['S', 'L', 'I', 'N', 'G'][idx]} • {rng}
              </div>
            ))}
          </div>

          {/* AUTHENTIC 5×5 EMBOSSED CREAM/IVORY SLINGO MATRIX */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gridTemplateRows: 'repeat(5, 1fr)',
              gap: 6,
              flex: 1,
              background: '#0b132b',
              border: '3px inset #ca8a04',
              borderRadius: 6,
              padding: 6,
              minHeight: 235,
            }}
          >
            {board.map((row, rIdx) =>
              row.map((num, cIdx) => {
                const isCovered = marked[rIdx][cIdx];
                const clickable = isCellClickable(rIdx, cIdx);
                const isFlashing = flashCells.has(`${rIdx},${cIdx}`);
                const isVisionBest = visionCells.has(`${rIdx},${cIdx}`);

                return (
                  <div
                    key={`${rIdx}-${cIdx}`}
                    onClick={() => handleCellClick(rIdx, cIdx)}
                    style={{
                      position: 'relative',
                      borderRadius: 5,
                      background: isCovered
                        ? 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)'
                        : clickable
                        ? 'linear-gradient(180deg, #fef9c3 0%, #fde047 100%)'
                        : 'linear-gradient(180deg, #fffdf5 0%, #efe4c8 100%)',
                      borderTop: isCovered ? '2px solid #090d16' : '2px solid #ffffff',
                      borderLeft: isCovered ? '2px solid #090d16' : '2px solid #ffffff',
                      borderRight: isCovered ? '2px solid #334155' : '2px solid #a89977',
                      borderBottom: isCovered ? '2px solid #334155' : '2px solid #a89977',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: clickable ? 'pointer' : 'default',
                      animation: clickable ? 'slingoTileGlow 0.9s infinite' : 'none',
                    }}
                  >
                    {isCovered ? (
                      <SlingoStarMedallion flashing={isFlashing} />
                    ) : (
                      <>
                        <span
                          style={{
                            fontSize: 22,
                            fontWeight: 900,
                            color: clickable ? '#991b1b' : '#172554',
                            fontFamily: "'Georgia', 'Times New Roman', serif",
                            textShadow: '0 1px 0 #ffffff',
                          }}
                        >
                          {num}
                        </span>
                        {isVisionBest && (
                          <span
                            title="Slingo Vision: Optimal Joker Placement!"
                            style={{
                              position: 'absolute',
                              top: 2,
                              right: 3,
                              fontSize: 10,
                              background: '#7c3aed',
                              color: '#fff',
                              borderRadius: 4,
                              padding: '0 3px',
                              fontWeight: 900,
                            }}
                          >
                            ★BEST
                          </span>
                        )}
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Brushed Gold Axle Divider Between Card & 5 Slot Reels */}
          <div
            style={{
              height: 8,
              margin: '7px 0 6px 0',
              borderRadius: 4,
              background: 'linear-gradient(180deg, #fef08a 0%, #ca8a04 55%, #713f12 100%)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
            }}
          />

          {/* 5 CURVED 3D CYLINDRICAL SLOT MACHINE REEL DRUMS */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: 6,
              height: 68,
            }}
          >
            {reels.map((rl, cIdx) => {
              const isSpinning = spinningCols[cIdx];
              const actionable =
                phase === 'marking' &&
                !rl.used &&
                (rl.type === 'JOKER' || rl.type === 'SUPER_JOKER' || rl.type === 'NUMBER');

              return (
                <div
                  key={cIdx}
                  style={{
                    position: 'relative',
                    borderRadius: 6,
                    overflow: 'hidden',
                    border: actionable ? '2.5px solid #facc15' : '2px solid #78350f',
                    /* 3D Cylindrical Drum Barrel Shading! */
                    background:
                      'linear-gradient(180deg, #b8b09c 0%, #fffdf7 22%, #ffffff 50%, #f3ebd6 78%, #9c927a 100%)',
                    boxShadow: actionable
                      ? '0 0 12px #fde047, inset 0 6px 8px rgba(0,0,0,0.28), inset 0 -6px 8px rgba(0,0,0,0.28)'
                      : 'inset 0 7px 9px rgba(0,0,0,0.35), inset 0 -7px 9px rgba(0,0,0,0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {isSpinning ? (
                    <div
                      style={{
                        fontSize: 24,
                        fontWeight: 900,
                        color: '#475569',
                        filter: 'blur(1px)',
                        fontFamily: 'Georgia, serif',
                      }}
                    >
                      {rollingNumbers[cIdx]}
                    </div>
                  ) : (
                    <div style={{ opacity: rl.used && rl.type === 'NUMBER' && spin > 0 ? 0.55 : 1 }}>
                      <SlingoReelSymbolSVG type={rl.type} number={rl.number} size={48} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Animated Pop-Out Devil & Cherub Stage Overlay */}
          <DevilAndCherubCutscene
            mode={cutscene?.mode ?? null}
            subtitle={cutscene?.subtitle ?? ''}
            onDismiss={() => setCutscene(null)}
          />
        </div>

        {/* OPTIONAL RIGHT PANE: AOL Game Parlor Chat Room */}
        {showLounge && (
          <div
            style={{
              width: 205,
              flexShrink: 0,
              background: '#ece9d8',
              color: '#000',
              border: '2px solid #eab308',
              borderRadius: 8,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                background: 'linear-gradient(90deg, #1d4ed8 0%, #1e3a8a 100%)',
                color: '#fff',
                padding: '5px 8px',
                fontWeight: 700,
                fontSize: 11,
              }}
            >
              💬 AOL Slingo Lounge (28)
            </div>
            <div style={{ flex: 1, padding: 6, overflowY: 'auto', background: '#fff', fontSize: 11 }}>
              {loungeMsgs.map((m, i) => (
                <div key={i} style={{ marginBottom: 5, lineHeight: 1.3 }}>
                  <b style={{ color: m.user === 'Administrator' ? '#dc2626' : '#1d4ed8' }}>{m.user}:</b>{' '}
                  {m.text}
                </div>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!chatInput.trim()) return;
                setLoungeMsgs((prev) => [...prev.slice(-15), { user: 'Administrator', text: chatInput.trim() }]);
                setChatInput('');
              }}
              style={{ display: 'flex', gap: 4, padding: 5, borderTop: '1px solid #cbd5e1' }}
            >
              <input
                className="xp-input"
                style={{ flex: 1, fontSize: 11 }}
                placeholder="Say hi..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
              />
              <button type="submit" className="xp-btn">
                Send
              </button>
            </form>
          </div>
        )}
      </div>

      {/* HIGH SCORES MODAL */}
      {showHighScores && (
        <div
          onClick={() => setShowHighScores(false)}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 90,
          }}
        >
          <div
            className="xp-window"
            style={{ width: 390, color: '#000', position: 'relative' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="xp-titlebar" style={{ height: 24 }}>
              <span className="xp-titlebar-text">🏆 Slingo Hall of Fame</span>
            </div>
            <div style={{ padding: 12, background: '#ece9d8', fontSize: 11 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', marginBottom: 10 }}>
                <thead>
                  <tr style={{ background: '#dbeafe', textAlign: 'left' }}>
                    <th style={{ padding: 5 }}>#</th>
                    <th style={{ padding: 5 }}>Screen Name</th>
                    <th style={{ padding: 5 }}>Mode</th>
                    <th style={{ padding: 5, textAlign: 'right' }}>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {highScores.map((hs, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: 5, fontWeight: 700 }}>{i + 1}</td>
                      <td style={{ padding: 5 }}>
                        {hs.name} {hs.fullCard && '👑'}
                      </td>
                      <td style={{ padding: 5 }}>{hs.mode}</td>
                      <td style={{ padding: 5, textAlign: 'right', fontWeight: 700 }}>
                        {hs.score.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="xp-btn xp-btn-primary" onClick={() => setShowHighScores(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CAREER TROPHIES & STATS MODAL */}
      {showTrophiesModal && (
        <div
          onClick={() => setShowTrophiesModal(false)}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 90,
          }}
        >
          <div
            className="xp-window"
            style={{ width: 420, color: '#000', position: 'relative' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="xp-titlebar" style={{ height: 24 }}>
              <span className="xp-titlebar-text">🎖️ Slingo Career Stats & Trophies</span>
            </div>
            <div style={{ padding: 12, background: '#ece9d8', fontSize: 11 }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 6,
                  marginBottom: 10,
                  textAlign: 'center',
                }}
              >
                <div className="xp-bevel-sunken" style={{ background: '#fff', padding: 6 }}>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>{careerStats.gamesPlayed}</div>
                  <div>Games</div>
                </div>
                <div className="xp-bevel-sunken" style={{ background: '#fff', padding: 6 }}>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>{careerStats.totalSlingos}</div>
                  <div>Slingos</div>
                </div>
                <div className="xp-bevel-sunken" style={{ background: '#fff', padding: 6 }}>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>{careerStats.devilsMet}</div>
                  <div>Devils Met</div>
                </div>
                <div className="xp-bevel-sunken" style={{ background: '#fff', padding: 6 }}>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>{careerStats.cherubRescues}</div>
                  <div>Cherub Saves</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
                {BADGE_DEFINITIONS.map((b) => {
                  const unlocked = careerStats.unlockedBadges.includes(b.id);
                  return (
                    <div
                      key={b.id}
                      style={{
                        background: unlocked ? '#fef9c3' : '#f1f5f9',
                        border: unlocked ? '1px solid #ca8a04' : '1px solid #cbd5e1',
                        borderRadius: 4,
                        padding: 6,
                        opacity: unlocked ? 1 : 0.6,
                      }}
                    >
                      <div style={{ fontWeight: 700 }}>
                        {b.icon} {b.title} {unlocked ? '✓' : '🔒'}
                      </div>
                      <div style={{ fontSize: 10, color: '#475569' }}>{b.desc}</div>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="xp-btn xp-btn-primary" onClick={() => setShowTrophiesModal(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PAYTABLE & SOUNDBOARD RULES MODAL */}
      {showRulesModal && (
        <div
          onClick={() => setShowRulesModal(false)}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 90,
          }}
        >
          <div
            className="xp-window"
            style={{ width: 430, color: '#000', position: 'relative' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="xp-titlebar" style={{ height: 24 }}>
              <span className="xp-titlebar-text">Classic AOL Slingo — Official Paytable & Sounds</span>
            </div>
            <div style={{ padding: 12, background: '#ece9d8', fontSize: 11, lineHeight: 1.45 }}>
              <ul style={{ margin: '0 0 10px 0', paddingLeft: 18 }}>
                <li>
                  <b>Number Match / Joker Placement:</b> +200 pts
                </li>
                <li>
                  <b>Gold Coin:</b> +1,000 pts • <b>3 / 4 / 5 Jokers on 1 Spin:</b> +1,000 / +2,500 / +5,000 pts
                </li>
                <li>
                  <b>Each 5-in-a-Row SLINGO (12 lines):</b> +1,000 pts
                </li>
                <li>
                  <b>Full Card Blackout Bonus:</b> 15,000 pts (Spin 5) scaling down to 6,500 pts (Spin 20)
                </li>
                <li>
                  <b>😈 The Slingo Devil:</b> Laughs and cuts your score in HALF — unless rescued by the{' '}
                  <b>👼 Winged Cherub (+500 pts)</b> or Deluxe Shield!
                </li>
                <li>
                  <b>Spins 17–20:</b> Cost 500 / 1,000 / 1,500 / 2,000 pts unless covered by a Free Spin token.
                </li>
              </ul>

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                <button className="xp-btn" onClick={() => slingoAudio.devilLaugh(Math.max(0.6, effVol))}>
                  🔊 Devil Laugh
                </button>
                <button className="xp-btn" onClick={() => slingoAudio.cherubSave(Math.max(0.6, effVol))}>
                  🔊 Cherub Rescue
                </button>
                <button className="xp-btn" onClick={() => slingoAudio.slingoFanfare(Math.max(0.6, effVol))}>
                  🔊 Slingo Fanfare
                </button>
                <button className="xp-btn" onClick={() => slingoAudio.coin(Math.max(0.6, effVol))}>
                  🔊 Gold Coin
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="xp-btn xp-btn-primary" onClick={() => setShowRulesModal(false)}>
                  Got It!
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

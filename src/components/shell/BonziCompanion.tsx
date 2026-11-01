import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useOS, CompanionType } from '../../context/OSContext';
import { useSound } from '../../context/SoundContext';

/* ============================================================================
   MELODIC SONG SCORE DEFINITIONS (Note frequencies in Hz + duration ms + lyric)
   ============================================================================ */
interface SongStep {
  freq: number;
  dur: number;
  lyric: string;
  vowel?: 'a' | 'e' | 'o';
}

export interface BonziSong {
  id: string;
  title: string;
  spokenLine: string;
  steps: SongStep[];
}

const N = {
  E3: 164.81,
  G3: 196.0,
  A3: 220.0,
  B3: 246.94,
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  F4: 349.23,
  Fs4: 369.99,
  G4: 392.0,
  A4: 440.0,
  Bb4: 466.16,
  B4: 493.88,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
};

export const BONZI_SONGS: BonziSong[] = [
  {
    id: 'daisy',
    title: '🚲 Daisy Bell (Bicycle Built for Two)',
    spokenLine:
      "Daisy, Daisy, give me your answer do! I'm half crazy, all for the love of you! You'll look sweet upon the seat of a bicycle built for two!",
    steps: [
      { freq: N.C5, dur: 520, lyric: 'Dai-', vowel: 'e' },
      { freq: N.A4, dur: 520, lyric: 'sy,', vowel: 'e' },
      { freq: N.F4, dur: 520, lyric: 'Dai-', vowel: 'e' },
      { freq: N.C4, dur: 520, lyric: 'sy,', vowel: 'e' },
      { freq: N.D4, dur: 240, lyric: 'give', vowel: 'e' },
      { freq: N.E4, dur: 240, lyric: 'me', vowel: 'e' },
      { freq: N.F4, dur: 240, lyric: 'your', vowel: 'o' },
      { freq: N.D4, dur: 460, lyric: 'an-', vowel: 'a' },
      { freq: N.F4, dur: 260, lyric: 'swer', vowel: 'o' },
      { freq: N.C4, dur: 660, lyric: 'do!', vowel: 'o' },
      { freq: N.G4, dur: 500, lyric: "I'm", vowel: 'a' },
      { freq: N.C5, dur: 500, lyric: 'half', vowel: 'a' },
      { freq: N.A4, dur: 500, lyric: 'cra-', vowel: 'e' },
      { freq: N.F4, dur: 500, lyric: 'zy,', vowel: 'e' },
      { freq: N.D4, dur: 240, lyric: 'all', vowel: 'o' },
      { freq: N.E4, dur: 240, lyric: 'for', vowel: 'o' },
      { freq: N.F4, dur: 240, lyric: 'the', vowel: 'a' },
      { freq: N.G4, dur: 460, lyric: 'love', vowel: 'o' },
      { freq: N.A4, dur: 260, lyric: 'of', vowel: 'o' },
      { freq: N.G4, dur: 660, lyric: 'you!', vowel: 'o' },
      { freq: N.A4, dur: 220, lyric: 'You', vowel: 'o' },
      { freq: N.B4, dur: 220, lyric: 'will', vowel: 'e' },
      { freq: N.C5, dur: 260, lyric: 'look', vowel: 'o' },
      { freq: N.A4, dur: 380, lyric: 'sweet', vowel: 'e' },
      { freq: N.F4, dur: 240, lyric: 'up-', vowel: 'a' },
      { freq: N.G4, dur: 240, lyric: 'on', vowel: 'o' },
      { freq: N.A4, dur: 240, lyric: 'the', vowel: 'a' },
      { freq: N.F4, dur: 380, lyric: 'seat', vowel: 'e' },
      { freq: N.D4, dur: 240, lyric: 'of', vowel: 'o' },
      { freq: N.F4, dur: 240, lyric: 'a', vowel: 'a' },
      { freq: N.D4, dur: 360, lyric: 'bi-cy-cle', vowel: 'a' },
      { freq: N.C4, dur: 360, lyric: 'built', vowel: 'e' },
      { freq: N.E4, dur: 320, lyric: 'for', vowel: 'o' },
      { freq: N.F4, dur: 760, lyric: 'two! 🎶', vowel: 'o' },
    ],
  },
  {
    id: 'bonzi-theme',
    title: '🕸️ The Bonzi Purple Monkey Song',
    spokenLine:
      "Swinging from a web right onto your screen, I'm the purplest monkey that you've ever seen! Bananas and jokes and singing all day, Bonzi Buddy is here to play!",
    steps: [
      { freq: N.C4, dur: 260, lyric: 'Swing-', vowel: 'e' },
      { freq: N.E4, dur: 260, lyric: 'ing', vowel: 'e' },
      { freq: N.G4, dur: 260, lyric: 'from', vowel: 'o' },
      { freq: N.E4, dur: 260, lyric: 'a', vowel: 'a' },
      { freq: N.A4, dur: 360, lyric: 'web', vowel: 'e' },
      { freq: N.G4, dur: 360, lyric: 'on', vowel: 'o' },
      { freq: N.E4, dur: 280, lyric: 'your', vowel: 'o' },
      { freq: N.C4, dur: 520, lyric: 'screen,', vowel: 'e' },
      { freq: N.D4, dur: 260, lyric: "I'm", vowel: 'a' },
      { freq: N.F4, dur: 260, lyric: 'the', vowel: 'a' },
      { freq: N.A4, dur: 340, lyric: 'pur-plest', vowel: 'o' },
      { freq: N.G4, dur: 340, lyric: 'mon-key', vowel: 'e' },
      { freq: N.F4, dur: 260, lyric: 'you', vowel: 'o' },
      { freq: N.E4, dur: 260, lyric: 'have', vowel: 'a' },
      { freq: N.D4, dur: 520, lyric: 'seen!', vowel: 'e' },
      { freq: N.G4, dur: 260, lyric: 'Bon-', vowel: 'o' },
      { freq: N.A4, dur: 260, lyric: 'zi', vowel: 'e' },
      { freq: N.B4, dur: 280, lyric: 'Bud-dy', vowel: 'a' },
      { freq: N.C5, dur: 460, lyric: 'loves', vowel: 'o' },
      { freq: N.G4, dur: 280, lyric: 'to', vowel: 'o' },
      { freq: N.C5, dur: 740, lyric: 'sing! 🍌🎶', vowel: 'e' },
    ],
  },
  {
    id: 'bonnie',
    title: '🌊 My Bonnie Lies Over the Ocean',
    spokenLine:
      'My Bonnie lies over the ocean, my Bonnie lies over the sea, oh bring back my Bonnie to me!',
    steps: [
      { freq: N.G3, dur: 280, lyric: 'My', vowel: 'a' },
      { freq: N.E4, dur: 480, lyric: 'Bon-', vowel: 'o' },
      { freq: N.D4, dur: 280, lyric: 'nie', vowel: 'e' },
      { freq: N.C4, dur: 380, lyric: 'lies', vowel: 'a' },
      { freq: N.D4, dur: 280, lyric: 'o-', vowel: 'o' },
      { freq: N.C4, dur: 280, lyric: 'ver', vowel: 'a' },
      { freq: N.A3, dur: 280, lyric: 'the', vowel: 'a' },
      { freq: N.G3, dur: 440, lyric: 'o-', vowel: 'o' },
      { freq: N.E3, dur: 520, lyric: 'cean,', vowel: 'a' },
      { freq: N.G3, dur: 280, lyric: 'My', vowel: 'a' },
      { freq: N.E4, dur: 480, lyric: 'Bon-', vowel: 'o' },
      { freq: N.D4, dur: 280, lyric: 'nie', vowel: 'e' },
      { freq: N.C4, dur: 380, lyric: 'lies', vowel: 'a' },
      { freq: N.C4, dur: 280, lyric: 'o-', vowel: 'o' },
      { freq: N.B3, dur: 280, lyric: 'ver', vowel: 'a' },
      { freq: N.C4, dur: 280, lyric: 'the', vowel: 'a' },
      { freq: N.D4, dur: 660, lyric: 'sea,', vowel: 'e' },
      { freq: N.G3, dur: 300, lyric: 'Oh', vowel: 'o' },
      { freq: N.C4, dur: 460, lyric: 'bring', vowel: 'e' },
      { freq: N.A3, dur: 440, lyric: 'back', vowel: 'a' },
      { freq: N.D4, dur: 380, lyric: 'my', vowel: 'a' },
      { freq: N.C4, dur: 320, lyric: 'Bon-', vowel: 'o' },
      { freq: N.B3, dur: 300, lyric: 'nie', vowel: 'e' },
      { freq: N.A3, dur: 300, lyric: 'to', vowel: 'o' },
      { freq: N.C4, dur: 760, lyric: 'me! 🎵', vowel: 'e' },
    ],
  },
  {
    id: 'rowboat',
    title: '🚣 Row, Row, Row Your Boat',
    spokenLine:
      'Row, row, row your boat, gently down the stream! Merrily, merrily, merrily, merrily, life is but a dream!',
    steps: [
      { freq: N.C4, dur: 380, lyric: 'Row,', vowel: 'o' },
      { freq: N.C4, dur: 380, lyric: 'row,', vowel: 'o' },
      { freq: N.C4, dur: 280, lyric: 'row', vowel: 'o' },
      { freq: N.D4, dur: 180, lyric: 'your', vowel: 'o' },
      { freq: N.E4, dur: 440, lyric: 'boat,', vowel: 'o' },
      { freq: N.E4, dur: 280, lyric: 'gent-', vowel: 'e' },
      { freq: N.D4, dur: 180, lyric: 'ly', vowel: 'e' },
      { freq: N.E4, dur: 280, lyric: 'down', vowel: 'a' },
      { freq: N.F4, dur: 180, lyric: 'the', vowel: 'a' },
      { freq: N.G4, dur: 640, lyric: 'stream!', vowel: 'e' },
      { freq: N.C5, dur: 180, lyric: 'Mer-ri-ly,', vowel: 'e' },
      { freq: N.G4, dur: 180, lyric: 'mer-ri-ly,', vowel: 'e' },
      { freq: N.E4, dur: 180, lyric: 'mer-ri-ly,', vowel: 'e' },
      { freq: N.C4, dur: 240, lyric: 'mer-ri-ly,', vowel: 'e' },
      { freq: N.G4, dur: 280, lyric: 'life', vowel: 'a' },
      { freq: N.F4, dur: 180, lyric: 'is', vowel: 'e' },
      { freq: N.E4, dur: 280, lyric: 'but', vowel: 'a' },
      { freq: N.D4, dur: 180, lyric: 'a', vowel: 'a' },
      { freq: N.C4, dur: 720, lyric: 'dream! 🎵', vowel: 'e' },
    ],
  },
  {
    id: 'susanna',
    title: '🪕 Oh! Susanna',
    spokenLine:
      "Oh I come from Alabama with a banjo on my knee, I'm going to Louisiana, my true love for to see!",
    steps: [
      { freq: N.C4, dur: 180, lyric: 'Oh', vowel: 'o' },
      { freq: N.D4, dur: 180, lyric: 'I', vowel: 'a' },
      { freq: N.E4, dur: 300, lyric: 'come', vowel: 'o' },
      { freq: N.G4, dur: 300, lyric: 'from', vowel: 'o' },
      { freq: N.G4, dur: 340, lyric: 'Al-a-', vowel: 'a' },
      { freq: N.A4, dur: 300, lyric: 'bam-a', vowel: 'a' },
      { freq: N.G4, dur: 280, lyric: 'with', vowel: 'e' },
      { freq: N.E4, dur: 280, lyric: 'a', vowel: 'a' },
      { freq: N.C4, dur: 340, lyric: 'ban-jo', vowel: 'o' },
      { freq: N.D4, dur: 240, lyric: 'on', vowel: 'o' },
      { freq: N.E4, dur: 260, lyric: 'my', vowel: 'a' },
      { freq: N.D4, dur: 540, lyric: 'knee!', vowel: 'e' },
      { freq: N.F4, dur: 460, lyric: 'Oh!', vowel: 'o' },
      { freq: N.F4, dur: 460, lyric: 'Su-', vowel: 'o' },
      { freq: N.A4, dur: 380, lyric: 'san-', vowel: 'a' },
      { freq: N.G4, dur: 420, lyric: 'na,', vowel: 'a' },
      { freq: N.E4, dur: 280, lyric: "don't", vowel: 'o' },
      { freq: N.C4, dur: 280, lyric: 'you', vowel: 'o' },
      { freq: N.D4, dur: 320, lyric: 'cry', vowel: 'a' },
      { freq: N.E4, dur: 260, lyric: 'for', vowel: 'o' },
      { freq: N.C4, dur: 720, lyric: 'me! 🪕', vowel: 'e' },
    ],
  },
  {
    id: 'yankee',
    title: '🎩 Yankee Doodle (Bonzi Remix)',
    spokenLine:
      'Bonzi Buddy came to town, swinging on a spider web! Stuck a banana in his cap and sang upon your desktop!',
    steps: [
      { freq: N.F4, dur: 240, lyric: 'Bon-', vowel: 'o' },
      { freq: N.F4, dur: 240, lyric: 'zi', vowel: 'e' },
      { freq: N.G4, dur: 240, lyric: 'Bud-', vowel: 'a' },
      { freq: N.A4, dur: 240, lyric: 'dy', vowel: 'e' },
      { freq: N.F4, dur: 240, lyric: 'came', vowel: 'e' },
      { freq: N.A4, dur: 240, lyric: 'to', vowel: 'o' },
      { freq: N.G4, dur: 460, lyric: 'town,', vowel: 'a' },
      { freq: N.F4, dur: 240, lyric: 'swing-', vowel: 'e' },
      { freq: N.F4, dur: 240, lyric: 'ing', vowel: 'e' },
      { freq: N.G4, dur: 240, lyric: 'on', vowel: 'o' },
      { freq: N.A4, dur: 240, lyric: 'a', vowel: 'a' },
      { freq: N.F4, dur: 440, lyric: 'spi-der', vowel: 'a' },
      { freq: N.E4, dur: 460, lyric: 'web!', vowel: 'e' },
      { freq: N.F4, dur: 240, lyric: 'Sing-', vowel: 'e' },
      { freq: N.F4, dur: 240, lyric: 'ing', vowel: 'e' },
      { freq: N.G4, dur: 240, lyric: 'songs', vowel: 'o' },
      { freq: N.A4, dur: 240, lyric: 'and', vowel: 'a' },
      { freq: N.Bb4, dur: 240, lyric: 'tell-', vowel: 'e' },
      { freq: N.A4, dur: 240, lyric: 'ing', vowel: 'e' },
      { freq: N.G4, dur: 240, lyric: 'jokes', vowel: 'o' },
      { freq: N.F4, dur: 260, lyric: 'all', vowel: 'o' },
      { freq: N.E4, dur: 260, lyric: 'day', vowel: 'e' },
      { freq: N.C4, dur: 260, lyric: 'for', vowel: 'o' },
      { freq: N.D4, dur: 260, lyric: 'you,', vowel: 'o' },
      { freq: N.E4, dur: 260, lyric: 'my', vowel: 'a' },
      { freq: N.F4, dur: 680, lyric: 'pal! 🎩🎶', vowel: 'a' },
    ],
  },
];

const BONZI_JOKES = [
  "Why did the monkey like the banana? Because it had appeal! Hahaha!",
  "Why did the computer go to the doctor? Because it caught a terminal virus! Get it, buddy?",
  "What do you call a purple monkey running six operating systems? A Multi-Boot Ape-ministrator!",
  "Knock knock! Who's there? Banana! Banana who? Banana glad I swung in from my web to hang out with you?!",
  "I tried to download a sandwich over 56K AOL dial-up... by the time it finished, it was toast!",
  "What key does a monkey use most on a keyboard? The Space Bar — to blast off!",
  "Did you know? In 2000 I was powered by Microsoft Agent and Lernout & Hauspie TruVoice!",
  "Have you explored the 3D Brick Maze yet? Step on the spinning diamond rock to walk on the ceiling!",
  "Try switching live between Windows XP, Windows 10, Mac OS, Linux, Debian, and CentOS!",
  "Don't die of dysentery on The Oregon Trail — buy plenty of oxen and spare wagon wheels!",
];

const COMPANION_PROFILES: Record<
  CompanionType,
  { name: string; color: string; lines: string[] }
> = {
  bonzi: {
    name: 'BonziBUDDY (Purple Monkey)',
    color: '#7e22ce',
    lines: BONZI_JOKES,
  },
  clippy: {
    name: 'Clippy (Office 97/XP Assistant)',
    color: '#334155',
    lines: [
      "It looks like you're exploring 6 Operating Systems! Would you like help switching to Mac OS or Debian?",
      "It looks like you're writing a ransom note — I mean, a friendly letter! Shall I make it 24pt Comic Sans?",
      "Tip: Click 'All 24 Classic Games' on the desktop to play Gorillas.bas, Oregon Trail, or 3D Brick Maze!",
    ],
  },
  peedy: {
    name: 'Peedy the Green Parrot',
    color: '#15803d',
    lines: [
      'SQUAWK! Fun fact: BonziBUDDY v1.0 in 1999 originally used ME — Peedy the Parrot — before Bonzi the purple monkey swung in!',
      'SQUAWK! Polly wants a cracker and a 20-spin Slingo jackpot!',
      'Try typing `neofetch` in the Bash/Zsh Unix Terminal!',
    ],
  },
  rover: {
    name: 'Rover (Windows XP Search Dog)',
    color: '#b45309',
    lines: [
      'Woof! *wags tail* I sniffed your hard drive and found 24 classic PC games and 6 operating systems!',
      '*scratches ear* Want me to help find the Smiley Face exit inside the 3D Brick Maze?',
      'Arf! Remember me from the Windows XP File Search sidebar?',
    ],
  },
  merlin: {
    name: 'Merlin (Microsoft Agent Wizard)',
    color: '#1d4ed8',
    lines: [
      '✨ Greetings, time traveler! Behold Windows XP, Windows 10, Mac OS, Linux, Debian, and CentOS in one realm!',
      '✨ *waves wand* In MS-DOS GORILLA.BAS, aim 55 degrees at velocity 68 to lob an exploding banana!',
      '✨ May your wagon cross every river safely on The Oregon Trail!',
    ],
  },
};

/* ============================================================================
   ACCURATE 3D-SHADED BONZIBUDDY PURPLE MONKEY / GORILLA SVG
   ============================================================================ */
export const BonziMonkeySVG: React.FC<{
  size?: number;
  mouthOpen?: number; // 0 = grin, 1 = talking eh, 2 = wide ah, 3 = singing O
  blinking?: boolean;
  swinging?: boolean;
  singing?: boolean;
  waving?: boolean;
  holdingBanana?: boolean;
}> = ({
  size = 134,
  mouthOpen = 0,
  blinking = false,
  swinging = false,
  singing = false,
  waving = false,
  holdingBanana = false,
}) => {
  return (
    <svg
      width={size}
      height={Math.round(size * 1.2)}
      viewBox="0 0 150 180"
      style={{ overflow: 'visible', filter: 'drop-shadow(0 8px 14px rgba(0,0,0,0.48))' }}
    >
      <defs>
        {/* Glossy 3D Pre-Rendered MS-Agent Lavender-Purple Fur Gradients */}
        <radialGradient id="bzHead3D" cx="36%" cy="26%" r="68%">
          <stop offset="0%" stopColor="#f3e8ff" />
          <stop offset="22%" stopColor="#d8b4fe" />
          <stop offset="56%" stopColor="#9333ea" />
          <stop offset="86%" stopColor="#6b21a8" />
          <stop offset="100%" stopColor="#3b0764" />
        </radialGradient>
        <radialGradient id="bzBody3D" cx="38%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#e9d5ff" />
          <stop offset="30%" stopColor="#c084fc" />
          <stop offset="68%" stopColor="#7e22ce" />
          <stop offset="100%" stopColor="#4c1d95" />
        </radialGradient>
        <radialGradient id="bzSkin3D" cx="42%" cy="30%" r="72%">
          <stop offset="0%" stopColor="#fff1dc" />
          <stop offset="55%" stopColor="#f6c794" />
          <stop offset="88%" stopColor="#df9f64" />
          <stop offset="100%" stopColor="#b0703c" />
        </radialGradient>
      </defs>

      {/* Playful Curled Purple Monkey Tail */}
      <path
        d="M 103 136 C 136 134, 144 98, 126 90 C 115 85, 111 97, 120 101"
        fill="none"
        stroke="#581c87"
        strokeWidth="9"
        strokeLinecap="round"
      />
      <path
        d="M 103 136 C 136 134, 144 98, 126 90 C 115 85, 111 97, 120 101"
        fill="none"
        stroke="#b865f8"
        strokeWidth="4.5"
        strokeLinecap="round"
      />

      {/* LEFT ARM: Waves enthusiastically, swings free in air, or holds silver microphone! */}
      {swinging ? (
        <g>
          <path d="M 42 98 C 16 82, 10 58, 18 38" fill="none" stroke="url(#bzBody3D)" strokeWidth="17" strokeLinecap="round" />
          <circle cx="18" cy="36" r="10" fill="url(#bzSkin3D)" stroke="#581c87" strokeWidth="1.5" />
        </g>
      ) : waving || singing ? (
        <g
          style={{
            transformOrigin: '44px 102px',
            animation: 'bonziWaveAnim 0.48s ease-in-out infinite alternate',
          }}
        >
          <path d="M 44 102 C 16 86, 12 62, 20 44" fill="none" stroke="url(#bzBody3D)" strokeWidth="17" strokeLinecap="round" />
          <circle cx="20" cy="42" r="9.5" fill="url(#bzSkin3D)" stroke="#581c87" strokeWidth="1.4" />
          {singing && (
            <g transform="translate(11, 22) rotate(-18)">
              <rect x="4" y="9" width="6" height="17" rx="2" fill="#1e293b" stroke="#94a3b8" strokeWidth="0.8" />
              <circle cx="7" cy="6" r="7" fill="#e2e8f0" stroke="#475569" strokeWidth="1.4" />
              <line x1="2" y1="6" x2="12" y2="6" stroke="#64748b" strokeWidth="1.2" />
            </g>
          )}
        </g>
      ) : (
        <g>
          <path d="M 43 100 C 18 114, 18 134, 28 144" fill="none" stroke="url(#bzBody3D)" strokeWidth="17" strokeLinecap="round" />
          <ellipse cx="30" cy="146" rx="10" ry="8.5" fill="url(#bzSkin3D)" stroke="#581c87" strokeWidth="1.4" />
        </g>
      )}

      {/* RIGHT ARM: Reaches HIGH UP (102, 2) to grip the Spider-Web Rope when swinging! */}
      {swinging ? (
        <g>
          <path d="M 104 96 C 122 58, 114 26, 102 4" fill="none" stroke="url(#bzBody3D)" strokeWidth="17" strokeLinecap="round" />
          {/* Tan Monkey Hand Wrapped Tightly Around the Silky Web Strand at (102, 3)! */}
          <ellipse cx="102" cy="4" rx="10.5" ry="9" fill="url(#bzSkin3D)" stroke="#3b0764" strokeWidth="1.6" />
          <path d="M 95 2 L 109 2 M 95 5.5 L 109 5.5 M 96 8.5 L 108 8.5" stroke="#9a3412" strokeWidth="1.5" strokeLinecap="round" />
        </g>
      ) : holdingBanana ? (
        <g>
          <path d="M 106 100 C 130 92, 132 74, 124 62" fill="none" stroke="url(#bzBody3D)" strokeWidth="17" strokeLinecap="round" />
          <circle cx="124" cy="60" r="9.5" fill="url(#bzSkin3D)" stroke="#581c87" strokeWidth="1.4" />
          <path d="M 114 54 C 132 36, 144 58, 134 72 C 128 63, 122 57, 114 54 Z" fill="#fde047" stroke="#ca8a04" strokeWidth="1.6" />
        </g>
      ) : (
        <g>
          <path d="M 106 100 C 130 114, 130 134, 120 144" fill="none" stroke="url(#bzBody3D)" strokeWidth="17" strokeLinecap="round" />
          <ellipse cx="118" cy="146" rx="10" ry="8.5" fill="url(#bzSkin3D)" stroke="#581c87" strokeWidth="1.4" />
        </g>
      )}

      {/* Sturdy Purple Ape/Monkey Legs & Tan Toed Feet */}
      <g style={swinging ? { transform: 'rotate(-16deg)', transformOrigin: '75px 140px' } : undefined}>
        <path d="M 57 142 Q 49 156 45 164" fill="none" stroke="url(#bzBody3D)" strokeWidth="17" strokeLinecap="round" />
        <path d="M 93 142 Q 101 156 105 164" fill="none" stroke="url(#bzBody3D)" strokeWidth="17" strokeLinecap="round" />
        <ellipse cx="41" cy="168" rx="15" ry="7.5" fill="url(#bzSkin3D)" stroke="#3b0764" strokeWidth="1.5" />
        <ellipse cx="109" cy="168" rx="15" ry="7.5" fill="url(#bzSkin3D)" stroke="#3b0764" strokeWidth="1.5" />
      </g>

      {/* Chubby 3D Purple Gorilla/Monkey Torso + Warm Tan Belly Patch */}
      <ellipse cx="75" cy="121" rx="36" ry="32" fill="url(#bzBody3D)" stroke="#3b0764" strokeWidth="1.8" />
      <ellipse cx="75" cy="124" rx="23" ry="21" fill="url(#bzSkin3D)" />
      <ellipse cx="75" cy="133" rx="2.3" ry="1.8" fill="#9a3412" opacity="0.55" />

      {/* HEAD GROUP (Iconic Bonzi Rounded Ape Crest + Big Connected Cartoon Eyes + Wide Tan Muzzle) */}
      <g
        style={
          singing
            ? { transformOrigin: '75px 64px', animation: 'bonziHeadBob 0.45s ease-in-out infinite alternate' }
            : undefined
        }
      >
        {/* Rounded Purple Ears with Tan Inner Cups */}
        <circle cx="28" cy="52" r="13.5" fill="url(#bzHead3D)" stroke="#3b0764" strokeWidth="1.6" />
        <circle cx="28" cy="52" r="8" fill="url(#bzSkin3D)" />
        <circle cx="122" cy="52" r="13.5" fill="url(#bzHead3D)" stroke="#3b0764" strokeWidth="1.6" />
        <circle cx="122" cy="52" r="8" fill="url(#bzSkin3D)" />

        {/* Iconic Rounded Gorilla Crown + Playful Hair Tuft */}
        <ellipse cx="75" cy="28" rx="27" ry="18" fill="url(#bzHead3D)" stroke="#3b0764" strokeWidth="1.5" />
        <path
          d="M 64 14 Q 68 3 74 12 Q 79 1 83 13 Q 90 5 87 16"
          fill="#a855f7"
          stroke="#3b0764"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* Main Purple Head & Cheek Structure */}
        <ellipse cx="75" cy="50" rx="43" ry="34" fill="url(#bzHead3D)" stroke="#3b0764" strokeWidth="1.8" />

        {/* Tan Eye Socket Mask */}
        <path
          d="M 46 42 C 46 27, 72 27, 75 37 C 78 27, 104 27, 104 42 C 104 55, 46 55, 46 42 Z"
          fill="url(#bzSkin3D)"
        />

        {/* Big Connected Cartoon Eyes (Signature BonziBUDDY Look!) */}
        <ellipse cx="63" cy="41" rx="11" ry="13" fill="#ffffff" stroke="#3b0764" strokeWidth="1.6" />
        <ellipse cx="87" cy="41" rx="11" ry="13" fill="#ffffff" stroke="#3b0764" strokeWidth="1.6" />
        {blinking ? (
          <>
            <ellipse cx="63" cy="41" rx="11" ry="13" fill="#9333ea" stroke="#3b0764" strokeWidth="1.6" />
            <ellipse cx="87" cy="41" rx="11" ry="13" fill="#9333ea" stroke="#3b0764" strokeWidth="1.6" />
            <line x1="53" y1="42" x2="73" y2="42" stroke="#3b0764" strokeWidth="2.2" />
            <line x1="77" y1="42" x2="97" y2="42" stroke="#3b0764" strokeWidth="2.2" />
          </>
        ) : (
          <>
            <circle cx="65" cy="42" r="5" fill="#1e1b4b" />
            <circle cx="85" cy="42" r="5" fill="#1e1b4b" />
            <circle cx="66.8" cy="39.8" r="1.9" fill="#ffffff" />
            <circle cx="86.8" cy="39.8" r="1.9" fill="#ffffff" />
          </>
        )}

        {/* Cool 2000s Glossy Black Sunglasses when Singing! */}
        {singing && (
          <g>
            <line x1="33" y1="38" x2="48" y2="39" stroke="#0f172a" strokeWidth="2.6" />
            <line x1="102" y1="39" x2="117" y2="38" stroke="#0f172a" strokeWidth="2.6" />
            <rect x="47" y="33" width="26" height="16" rx="4" fill="#0f172a" stroke="#e2e8f0" strokeWidth="1.3" />
            <rect x="77" y="33" width="26" height="16" rx="4" fill="#0f172a" stroke="#e2e8f0" strokeWidth="1.3" />
            <line x1="73" y1="38" x2="77" y2="38" stroke="#0f172a" strokeWidth="2.8" />
            <line x1="51" y1="36" x2="60" y2="45" stroke="#38bdf8" strokeWidth="1.8" opacity="0.75" />
            <line x1="81" y1="36" x2="90" y2="45" stroke="#38bdf8" strokeWidth="1.8" opacity="0.75" />
          </g>
        )}

        {/* Sculpted Purple Gorilla Brow Ridge */}
        <path
          d={mouthOpen > 0 ? 'M 47 26 Q 62 19 74 28 Q 88 19 103 26' : 'M 48 29 Q 62 23 75 30 Q 88 23 102 29'}
          fill="none"
          stroke="#4c1d95"
          strokeWidth="4.2"
          strokeLinecap="round"
        />

        {/* Wide Warm Peach-Tan Gorilla/Monkey Muzzle + Nostrils + 4-State Lip-Sync Mouth */}
        <ellipse cx="75" cy="67" rx="34" ry="20" fill="url(#bzSkin3D)" stroke="#854d0e" strokeWidth="1.2" />
        <ellipse cx="68" cy="56" rx="3" ry="2.1" fill="#451a03" />
        <ellipse cx="82" cy="56" rx="3" ry="2.1" fill="#451a03" />

        {mouthOpen === 0 && (
          <g>
            <path d="M 50 65 Q 75 81 100 65" fill="none" stroke="#451a03" strokeWidth="3" strokeLinecap="round" />
            <path d="M 48 63 Q 50 66 53 64 M 97 64 Q 100 66 102 63" fill="none" stroke="#451a03" strokeWidth="2" strokeLinecap="round" />
          </g>
        )}
        {mouthOpen === 1 && (
          <g>
            <path d="M 54 64 Q 75 82 96 64 Q 75 68 54 64 Z" fill="#7f1d1d" stroke="#451a03" strokeWidth="2" />
            <path d="M 60 65 L 90 65 L 88 68 L 62 68 Z" fill="#ffffff" />
            <ellipse cx="75" cy="73" rx="10" ry="3.8" fill="#fb7185" />
          </g>
        )}
        {mouthOpen === 2 && (
          <g>
            <ellipse cx="75" cy="70" rx="17" ry="11" fill="#7f1d1d" stroke="#451a03" strokeWidth="2.2" />
            <path d="M 61 62 L 89 62 L 87 66.5 L 63 66.5 Z" fill="#ffffff" />
            <ellipse cx="75" cy="76" rx="11" ry="4.8" fill="#fb7185" />
          </g>
        )}
        {mouthOpen >= 3 && (
          /* Rounded Singing "OH" Mouth! */
          <g>
            <ellipse cx="75" cy="70" rx="11" ry="12" fill="#7f1d1d" stroke="#451a03" strokeWidth="2.4" />
            <ellipse cx="75" cy="75" rx="7" ry="4" fill="#fb7185" />
          </g>
        )}
      </g>
    </svg>
  );
};

/* Illustrated Vector Sprites for Fellow Classic Companions (Clippy, Peedy, Rover, Merlin) */
const ClassicBuddySVG: React.FC<{ type: CompanionType }> = ({ type }) => {
  if (type === 'clippy') {
    return (
      <svg width={96} height={112} viewBox="0 0 96 112" style={{ filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.4))' }}>
        <path
          d="M 32 88 L 32 28 C 32 12, 66 12, 66 28 L 66 84 C 66 98, 24 98, 24 82 L 24 40 C 24 28, 54 28, 54 40 L 54 76"
          fill="none"
          stroke="#475569"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path
          d="M 32 88 L 32 28 C 32 12, 66 12, 66 28 L 66 84 C 66 98, 24 98, 24 82 L 24 40 C 24 28, 54 28, 54 40 L 54 76"
          fill="none"
          stroke="#cbd5e1"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <ellipse cx="36" cy="44" rx="10" ry="12" fill="#fff" stroke="#1e293b" strokeWidth="2" />
        <ellipse cx="60" cy="44" rx="10" ry="12" fill="#fff" stroke="#1e293b" strokeWidth="2" />
        <circle cx="38" cy="45" r="4.5" fill="#0f172a" />
        <circle cx="58" cy="45" r="4.5" fill="#0f172a" />
        <path d="M 24 28 Q 36 20 46 28" fill="none" stroke="#1e293b" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M 50 28 Q 60 20 72 28" fill="none" stroke="#1e293b" strokeWidth="3.5" strokeLinecap="round" />
      </svg>
    );
  }
  const emojiMap: Record<CompanionType, string> = {
    bonzi: '🟣',
    clippy: '📎',
    peedy: '🦜',
    rover: '🐕',
    merlin: '🧙',
  };
  return (
    <div
      style={{
        width: 92,
        height: 92,
        borderRadius: 24,
        background: 'radial-gradient(circle at 30% 25%, #ffffff, #e2e8f0)',
        border: `3px solid ${COMPANION_PROFILES[type].color}`,
        boxShadow: '0 8px 18px rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 48,
      }}
    >
      {emojiMap[type]}
    </div>
  );
};

/* ============================================================================
   DESKTOP FLOATING COMPANION OVERLAY (SWINGS IN ON A WEB, TALKS & SINGS!)
   ============================================================================ */
export const BonziCompanionOverlay: React.FC = () => {
  const {
    bonziOverlay,
    setBonziOverlay,
    activeCompanion,
    bonziSwingNonce,
    companionCommand,
    username,
    osType,
    openApp,
  } = useOS();
  const { muted, volume } = useSound();

  const [pos, setPos] = useState<{ x: number; y: number }>(() => ({
    x: typeof window !== 'undefined' ? Math.max(40, window.innerWidth - 195) : 900,
    y: typeof window !== 'undefined' ? Math.max(80, window.innerHeight - 245) : 470,
  }));

  const [swingState, setSwingState] = useState<{
    active: boolean;
    anchorX: number;
    monkeyX: number;
    monkeyY: number;
    angleDeg: number;
  } | null>(null);

  const [speechText, setSpeechText] = useState<string>(
    `Hello ${username}! Nice to meet you! My name is Bonzi! I swung in from my web — click Sing Song or Tell Joke!`
  );
  const [bubbleVisible, setBubbleVisible] = useState(true);
  const [mouthFrame, setMouthFrame] = useState(0);
  const [blinking, setBlinking] = useState(false);
  const [isSinging, setIsSinging] = useState(false);
  const [isTalking, setIsTalking] = useState(false);
  const [songMenuOpen, setSongMenuOpen] = useState(false);
  const [customInputOpen, setCustomInputOpen] = useState(false);
  const [customSayText, setCustomSayText] = useState('');
  const [jokeIdx, setJokeIdx] = useState(0);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const singCancelRef = useRef<boolean>(false);
  const talkTimerRef = useRef<number | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  const getAudioCtx = useCallback((): AudioContext | null => {
    try {
      const AC =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AC();
      }
      if (audioCtxRef.current.state === 'suspended') {
        void audioCtxRef.current.resume();
      }
      return audioCtxRef.current;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    const iv = window.setInterval(() => {
      setBlinking(true);
      window.setTimeout(() => setBlinking(false), 145);
    }, 3300);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const onResize = () => {
      setPos((p) => ({
        x: Math.min(Math.max(12, p.x), window.innerWidth - 165),
        y: Math.min(Math.max(40, p.y), window.innerHeight - 220),
      }));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const stopSpeechAndSong = useCallback(() => {
    singCancelRef.current = true;
    setIsSinging(false);
    setIsTalking(false);
    setMouthFrame(0);
    if (talkTimerRef.current) {
      window.clearInterval(talkTimerRef.current);
      talkTimerRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
  }, []);

  // Speak text aloud with animated 3-frame lip-sync + SpeechSynthesis + Web Audio TruVoice formant fallback!
  const speakAloud = useCallback(
    (text: string) => {
      stopSpeechAndSong();
      setSpeechText(text);
      setBubbleVisible(true);
      setIsTalking(true);

      const words = text.split(/\s+/).filter(Boolean);
      const estDurationMs = Math.min(9500, Math.max(1500, words.length * 285));
      const start = performance.now();

      if (!muted && volume > 0) {
        const ctx = getAudioCtx();
        if (ctx) {
          const sylls = Math.min(16, Math.max(5, words.length));
          for (let i = 0; i < sylls; i++) {
            const t0 = ctx.currentTime + i * 0.13;
            const osc = ctx.createOscillator();
            const formant = ctx.createBiquadFilter();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            const f = 155 + ((i * 29) % 85);
            osc.frequency.setValueAtTime(f, t0);
            osc.frequency.exponentialRampToValueAtTime(f * 1.15, t0 + 0.08);
            formant.type = 'bandpass';
            formant.frequency.setValueAtTime(650 + ((i * 190) % 700), t0);
            formant.Q.setValueAtTime(3.2, t0);
            gain.gain.setValueAtTime(0.0001, t0);
            gain.gain.linearRampToValueAtTime(0.04 * volume, t0 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.105);
            osc.connect(formant);
            formant.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t0);
            osc.stop(t0 + 0.115);
          }
        }

        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          try {
            const utter = new SpeechSynthesisUtterance(text);
            utter.pitch = activeCompanion === 'bonzi' ? 1.2 : 1.38;
            utter.rate = 1.03;
            utter.volume = Math.min(1, volume);
            utter.onend = () => {
              setIsTalking(false);
              setMouthFrame(0);
              if (talkTimerRef.current) {
                window.clearInterval(talkTimerRef.current);
                talkTimerRef.current = null;
              }
            };
            window.speechSynthesis.speak(utter);
          } catch {
            // timer completes lip-sync
          }
        }
      }

      talkTimerRef.current = window.setInterval(() => {
        if (performance.now() - start > estDurationMs) {
          setIsTalking(false);
          setMouthFrame(0);
          if (talkTimerRef.current) {
            window.clearInterval(talkTimerRef.current);
            talkTimerRef.current = null;
          }
          return;
        }
        setMouthFrame((f) => (f === 0 ? 1 : f === 1 ? 2 : 0));
      }, 110);
    },
    [stopSpeechAndSong, muted, volume, getAudioCtx, activeCompanion]
  );

  // Sing a real polyphonic melody with Formant Vowel lead + Music-Box harmony + Karaoke lyrics!
  const singSong = useCallback(
    async (song: BonziSong) => {
      stopSpeechAndSong();
      singCancelRef.current = false;
      setIsSinging(true);
      setBubbleVisible(true);
      setSongMenuOpen(false);

      if (!muted && volume > 0 && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          const utter = new SpeechSynthesisUtterance(song.spokenLine);
          utter.pitch = 1.45;
          utter.rate = 0.88;
          utter.volume = Math.min(0.85, volume);
          window.speechSynthesis.speak(utter);
        } catch {
          // WebAudio formant vocal + melody always plays!
        }
      }

      const ctx = !muted && volume > 0 ? getAudioCtx() : null;
      let builtLyrics = `🎵 ${song.title}\n`;

      for (let i = 0; i < song.steps.length; i++) {
        if (singCancelRef.current) break;
        const step = song.steps[i];
        builtLyrics += (i === 0 ? '' : ' ') + step.lyric;
        setSpeechText(builtLyrics);
        setMouthFrame(step.vowel === 'o' ? 3 : i % 2 === 0 ? 2 : 1);

        if (ctx) {
          const now = ctx.currentTime;
          const durSec = Math.max(0.12, step.dur / 1000);

          // 1. Lead Formant Vocal Oscillator with Vibrato
          const lead = ctx.createOscillator();
          const lfo = ctx.createOscillator();
          const lfoGain = ctx.createGain();
          const formant = ctx.createBiquadFilter();
          const leadGain = ctx.createGain();

          lead.type = 'sawtooth';
          lead.frequency.setValueAtTime(step.freq, now);
          lfo.frequency.setValueAtTime(5.6, now);
          lfoGain.gain.setValueAtTime(4.8, now);
          lfo.connect(lfoGain);
          lfoGain.connect(lead.frequency);

          formant.type = 'bandpass';
          formant.frequency.setValueAtTime(
            step.vowel === 'e' ? 1850 : step.vowel === 'o' ? 580 : 1050,
            now
          );
          formant.Q.setValueAtTime(2.4, now);

          leadGain.gain.setValueAtTime(0.0001, now);
          leadGain.gain.linearRampToValueAtTime(0.13 * volume, now + 0.025);
          leadGain.gain.exponentialRampToValueAtTime(0.055 * volume, now + durSec * 0.8);
          leadGain.gain.exponentialRampToValueAtTime(0.0001, now + durSec * 0.96);

          lead.connect(formant);
          formant.connect(leadGain);
          leadGain.connect(ctx.destination);

          // 2. Warm Music-Box Bell Accompaniment (Octave + Fifth)
          const bell = ctx.createOscillator();
          const bellGain = ctx.createGain();
          bell.type = 'triangle';
          bell.frequency.setValueAtTime(step.freq * 2, now);
          bellGain.gain.setValueAtTime(0.0001, now);
          bellGain.gain.linearRampToValueAtTime(0.05 * volume, now + 0.015);
          bellGain.gain.exponentialRampToValueAtTime(0.0001, now + durSec * 0.85);
          bell.connect(bellGain);
          bellGain.connect(ctx.destination);

          lead.start(now);
          lfo.start(now);
          bell.start(now);
          lead.stop(now + durSec);
          lfo.stop(now + durSec);
          bell.stop(now + durSec);
        }

        await new Promise<void>((resolve) => window.setTimeout(resolve, step.dur));
      }

      if (!singCancelRef.current) {
        setIsSinging(false);
        setMouthFrame(0);
      }
    },
    [stopSpeechAndSong, muted, volume, getAudioCtx]
  );

  // Listen for live commands dispatched from CompanionsStudioApp / OS Switcher / Terminal!
  useEffect(() => {
    if (!companionCommand) return;
    if (companionCommand.kind === 'speak' && companionCommand.text) {
      speakAloud(companionCommand.text);
    } else if (companionCommand.kind === 'joke') {
      const profile = COMPANION_PROFILES[activeCompanion];
      setJokeIdx((j) => {
        const next = j + 1;
        speakAloud(profile.lines[next % profile.lines.length]);
        return next;
      });
    } else if (companionCommand.kind === 'sing') {
      const found = BONZI_SONGS.find((s) => s.id === companionCommand.songId) || BONZI_SONGS[0];
      void singSong(found);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companionCommand]);

  // DRAMATIC PENDULUM SPIDER-WEB SWING-IN + SOMERSAULT LANDING + SPOKEN GREETING!
  useEffect(() => {
    if (!bonziOverlay || activeCompanion !== 'bonzi') {
      setSwingState(null);
      return;
    }

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const targetX = Math.max(36, vw - 195);
    const targetY = Math.max(80, vh - 245);
    setPos({ x: targetX, y: targetY });

    const anchorX = Math.max(200, Math.min(vw - 180, Math.round(vw * 0.58)));
    const ropeLen = Math.min(vh * 0.64, targetY - 10);
    const duration = 2050;
    const tStart = performance.now();

    // Silky web zip + jungle whoosh sound!
    if (!muted && volume > 0) {
      const ctx = getAudioCtx();
      if (ctx) {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(240, now);
        osc.frequency.exponentialRampToValueAtTime(760, now + 0.35);
        osc.frequency.exponentialRampToValueAtTime(390, now + 0.95);
        g.gain.setValueAtTime(0.001, now);
        g.gain.linearRampToValueAtTime(0.1 * volume, now + 0.1);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.98);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 1.0);
      }
    }

    let raf = 0;
    const animateSwing = (now: number) => {
      const p = Math.min(1, (now - tStart) / duration);
      if (p < 0.74) {
        // Phase 1: Wide sweeping pendulum swing across screen gripping the silky web line!
        const sp = p / 0.74;
        const theta = -1.24 * Math.cos(sp * Math.PI * 1.18) * (1 - sp * 0.36);
        const handX = anchorX + Math.sin(theta) * ropeLen;
        const handY = Math.cos(theta) * ropeLen;
        setSwingState({
          active: true,
          anchorX,
          monkeyX: handX - 91,
          monkeyY: handY - 4,
          angleDeg: ((-theta * 180) / Math.PI) * 0.48,
        });
        raf = requestAnimationFrame(animateSwing);
      } else if (p < 1) {
        // Phase 2: Releases web line & does a playful mid-air 360° flip onto resting desktop spot!
        const lp = (p - 0.74) / 0.26;
        const releaseTheta = -1.24 * Math.cos(Math.PI * 1.18) * 0.64;
        const startX = anchorX + Math.sin(releaseTheta) * ropeLen - 91;
        const startY = Math.cos(releaseTheta) * ropeLen - 4;
        const arcBoost = Math.sin(lp * Math.PI) * 72;
        setSwingState({
          active: false,
          anchorX,
          monkeyX: startX + (targetX - startX) * lp,
          monkeyY: startY + (targetY - startY) * lp - arcBoost,
          angleDeg: lp * 360,
        });
        raf = requestAnimationFrame(animateSwing);
      } else {
        setSwingState(null);
        speakAloud(
          `Hello ${username}! Nice to meet you! I'm Bonzi the purple monkey — I just swung in on my web! Want to hear me sing Daisy Bell or tell a joke?`
        );
      }
    };

    raf = requestAnimationFrame(animateSwing);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bonziOverlay, bonziSwingNonce, activeCompanion]);

  useEffect(() => {
    return () => stopSpeechAndSong();
  }, [stopSpeechAndSong]);

  if (!bonziOverlay) return null;

  const drawX = swingState ? swingState.monkeyX : pos.x;
  const drawY = swingState ? swingState.monkeyY : pos.y;
  const handAttachX = drawX + 91;
  const handAttachY = drawY + 5;

  const handleDragStart = (e: React.PointerEvent) => {
    if (swingState) return;
    if ((e.target as HTMLElement).closest('button, input')) return;
    e.stopPropagation();
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: pos.x,
      origY: pos.y,
    };
  };

  const handleDragMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const nx = Math.max(8, Math.min(window.innerWidth - 155, dragRef.current.origX + (e.clientX - dragRef.current.startX)));
    const ny = Math.max(28, Math.min(window.innerHeight - 205, dragRef.current.origY + (e.clientY - dragRef.current.startY)));
    setPos({ x: nx, y: ny });
  };

  const handleDragEnd = () => {
    dragRef.current = null;
  };

  const profile = COMPANION_PROFILES[activeCompanion];

  return (
    <>
      <style>{`
        @keyframes bonziWaveAnim {
          0% { transform: rotate(-10deg); }
          100% { transform: rotate(20deg); }
        }
        @keyframes bonziHeadBob {
          0% { transform: rotate(-5deg) translateY(0px); }
          100% { transform: rotate(5deg) translateY(-3px); }
        }
        @keyframes bonziNoteFloat {
          0% { opacity: 0; transform: translateY(8px) scale(0.8); }
          30% { opacity: 1; }
          100% { opacity: 0; transform: translateY(-48px) translateX(14px) scale(1.3); }
        }
      `}</style>

      {/* Fullscreen Gleaming Silky Spider-Web Anchor & Strand when Bonzi Swings In! */}
      {swingState && swingState.active && (
        <svg
          style={{
            position: 'fixed',
            inset: 0,
            width: '100vw',
            height: '100vh',
            pointerEvents: 'none',
            zIndex: 8499,
          }}
        >
          {/* Detailed Radial Spiderweb Anchor at Top of Screen */}
          <g transform={`translate(${swingState.anchorX}, 0)`}>
            <path
              d="M -46 0 L 0 34 L 46 0 M -28 0 L 0 28 L 28 0 M 0 0 L 0 38 M -38 7 Q 0 24 38 7 M -24 14 Q 0 28 24 14"
              fill="none"
              stroke="rgba(15,23,42,0.75)"
              strokeWidth="3.8"
            />
            <path
              d="M -46 0 L 0 34 L 46 0 M -28 0 L 0 28 L 28 0 M 0 0 L 0 38 M -38 7 Q 0 24 38 7 M -24 14 Q 0 28 24 14"
              fill="none"
              stroke="#ffffff"
              strokeWidth="1.8"
            />
          </g>

          {/* High-Contrast Outer Glow + Multi-Strand Silky Web Line */}
          <path
            d={`M ${swingState.anchorX} 0 Q ${(swingState.anchorX + handAttachX) / 2 - 14} ${
              handAttachY * 0.5
            } ${handAttachX} ${handAttachY}`}
            fill="none"
            stroke="rgba(15, 23, 42, 0.85)"
            strokeWidth="6.5"
            strokeLinecap="round"
          />
          <path
            d={`M ${swingState.anchorX} 0 Q ${(swingState.anchorX + handAttachX) / 2 - 14} ${
              handAttachY * 0.5
            } ${handAttachX} ${handAttachY}`}
            fill="none"
            stroke="#ffffff"
            strokeWidth="3.4"
            strokeLinecap="round"
          />
          <path
            d={`M ${swingState.anchorX - 4} 0 Q ${(swingState.anchorX + handAttachX) / 2 - 18} ${
              handAttachY * 0.5
            } ${handAttachX} ${handAttachY}`}
            fill="none"
            stroke="#e9d5ff"
            strokeWidth="1.4"
            strokeDasharray="6 4"
            strokeLinecap="round"
          />
        </svg>
      )}

      {/* Companion Character + Speech Balloon */}
      <div
        className="bonzi-widget"
        onPointerDown={handleDragStart}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
        style={{
          position: 'fixed',
          left: drawX,
          top: drawY,
          zIndex: 8500,
          userSelect: 'none',
          touchAction: 'none',
          cursor: swingState ? 'default' : 'grab',
        }}
      >
        {/* Classic Microsoft Agent Pale-Yellow Speech Balloon */}
        {bubbleVisible && !swingState && (
          <div
            onPointerDown={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              bottom: '101%',
              right: 2,
              width: 278,
              background: '#ffffe1',
              color: '#111827',
              border: '1.5px solid #1f2937',
              borderRadius: 12,
              padding: '9px 11px',
              fontSize: 11,
              lineHeight: 1.4,
              boxShadow: '3px 4px 14px rgba(0,0,0,0.45)',
              cursor: 'default',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <strong style={{ color: profile.color, fontSize: 11.5 }}>{profile.name}</strong>
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  title="Open Companions Studio"
                  onClick={() => openApp('companions')}
                  style={{ border: '1px solid #9ca3af', background: '#fff', borderRadius: 4, fontSize: 10, padding: '0 5px', cursor: 'pointer' }}
                >
                  ⚙️
                </button>
                <button
                  title="Hide Speech Balloon"
                  onClick={() => setBubbleVisible(false)}
                  style={{ border: '1px solid #9ca3af', background: '#fff', borderRadius: 4, fontSize: 10, padding: '0 5px', cursor: 'pointer' }}
                >
                  –
                </button>
                <button
                  title="Dismiss Companion"
                  onClick={() => {
                    stopSpeechAndSong();
                    setBonziOverlay(false);
                  }}
                  style={{
                    border: '1px solid #ef4444',
                    background: '#fee2e2',
                    color: '#991b1b',
                    borderRadius: 4,
                    fontSize: 10,
                    padding: '0 5px',
                    cursor: 'pointer',
                    fontWeight: 700,
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            <div style={{ whiteSpace: 'pre-wrap', marginBottom: 7, maxHeight: 96, overflowY: 'auto' }}>
              {speechText}
            </div>

            {/* 6-Song Picker Menu */}
            {songMenuOpen && activeCompanion === 'bonzi' && (
              <div
                style={{
                  background: '#faf5ff',
                  border: '1px solid #c084fc',
                  borderRadius: 6,
                  padding: 5,
                  marginBottom: 6,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 3,
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 10, color: '#6b21a8' }}>🎵 Pick a Song for Bonzi to Sing:</div>
                {BONZI_SONGS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => void singSong(s)}
                    style={{
                      textAlign: 'left',
                      fontSize: 10.5,
                      padding: '3px 6px',
                      borderRadius: 4,
                      border: '1px solid #d8b4fe',
                      background: '#fff',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    {s.title}
                  </button>
                ))}
              </div>
            )}

            {/* Custom Say Input */}
            {customInputOpen && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (customSayText.trim()) {
                    speakAloud(customSayText.trim());
                    setCustomSayText('');
                  }
                }}
                style={{ display: 'flex', gap: 4, marginBottom: 6 }}
              >
                <input
                  value={customSayText}
                  onChange={(e) => setCustomSayText(e.target.value)}
                  placeholder="Type anything for Bonzi to say..."
                  style={{ flex: 1, fontSize: 11, padding: '3px 6px', border: '1px solid #9ca3af', borderRadius: 4 }}
                />
                <button
                  type="submit"
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    padding: '3px 8px',
                    background: '#7e22ce',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer',
                  }}
                >
                  Speak!
                </button>
              </form>
            )}

            {/* Interactive Action Strip */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              <button
                onClick={() => {
                  const next = jokeIdx + 1;
                  setJokeIdx(next);
                  speakAloud(profile.lines[next % profile.lines.length]);
                }}
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '3px 7px',
                  borderRadius: 4,
                  border: '1px solid #7e22ce',
                  background: '#f3e8ff',
                  color: '#581c87',
                  cursor: 'pointer',
                }}
              >
                🗣️ Joke / Talk
              </button>

              {activeCompanion === 'bonzi' && (
                <>
                  <button
                    onClick={() => {
                      if (isSinging) {
                        stopSpeechAndSong();
                      } else {
                        setSongMenuOpen((v) => !v);
                      }
                    }}
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '3px 7px',
                      borderRadius: 4,
                      border: '1px solid #ca8a04',
                      background: isSinging ? '#fde047' : '#fef9c3',
                      color: '#713f12',
                      cursor: 'pointer',
                    }}
                  >
                    {isSinging ? '⏹ Stop Song' : '🎵 Sing Song!'}
                  </button>

                  <button
                    onClick={() => {
                      stopSpeechAndSong();
                      const vw = window.innerWidth;
                      const vh = window.innerHeight;
                      const anchorX = Math.max(180, Math.min(vw - 180, Math.round(vw * (0.35 + Math.random() * 0.4))));
                      const ropeLen = Math.min(vh * 0.64, pos.y - 10);
                      const tStart = performance.now();
                      const duration = 1850;
                      const step = (now: number) => {
                        const p = Math.min(1, (now - tStart) / duration);
                        if (p < 0.76) {
                          const sp = p / 0.76;
                          const theta = -1.2 * Math.cos(sp * Math.PI * 1.18) * (1 - sp * 0.36);
                          setSwingState({
                            active: true,
                            anchorX,
                            monkeyX: anchorX + Math.sin(theta) * ropeLen - 91,
                            monkeyY: Math.cos(theta) * ropeLen - 4,
                            angleDeg: ((-theta * 180) / Math.PI) * 0.48,
                          });
                          requestAnimationFrame(step);
                        } else if (p < 1) {
                          const lp = (p - 0.76) / 0.24;
                          setSwingState({
                            active: false,
                            anchorX,
                            monkeyX: pos.x,
                            monkeyY: pos.y - Math.sin(lp * Math.PI) * 58,
                            angleDeg: lp * 360,
                          });
                          requestAnimationFrame(step);
                        } else {
                          setSwingState(null);
                          speakAloud(`Wheee!! Swinging across your ${osType.toUpperCase()} desktop on a web is the best!`);
                        }
                      };
                      requestAnimationFrame(step);
                    }}
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '3px 7px',
                      borderRadius: 4,
                      border: '1px solid #0284c7',
                      background: '#e0f2fe',
                      color: '#075985',
                      cursor: 'pointer',
                    }}
                  >
                    🕸️ Swing!
                  </button>
                </>
              )}

              <button
                onClick={() => setCustomInputOpen((v) => !v)}
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '3px 7px',
                  borderRadius: 4,
                  border: '1px solid #6b7280',
                  background: '#f3f4f6',
                  color: '#1f2937',
                  cursor: 'pointer',
                }}
              >
                💬 Say...
              </button>
            </div>

            <div
              style={{
                position: 'absolute',
                bottom: -9,
                right: 52,
                width: 0,
                height: 0,
                borderLeft: '8px solid transparent',
                borderRight: '8px solid transparent',
                borderTop: '9px solid #1f2937',
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: -7,
                right: 53,
                width: 0,
                height: 0,
                borderLeft: '7px solid transparent',
                borderRight: '7px solid transparent',
                borderTop: '8px solid #ffffe1',
              }}
            />
          </div>
        )}

        {/* Floating Musical Notes while Singing */}
        {isSinging && (
          <div style={{ position: 'absolute', left: 8, top: -22, pointerEvents: 'none', display: 'flex', gap: 18 }}>
            <span style={{ fontSize: 22, color: '#fde047', animation: 'bonziNoteFloat 1.05s linear infinite' }}>♪</span>
            <span style={{ fontSize: 24, color: '#f472b6', animation: 'bonziNoteFloat 1.25s linear 0.35s infinite' }}>♫</span>
            <span style={{ fontSize: 20, color: '#38bdf8', animation: 'bonziNoteFloat 1.15s linear 0.7s infinite' }}>♬</span>
          </div>
        )}

        {/* Character Sprite */}
        <div
          onClick={() => {
            if (!bubbleVisible) setBubbleVisible(true);
          }}
          style={{
            transform: swingState ? `rotate(${swingState.angleDeg}deg)` : undefined,
            transformOrigin: '50% 45%',
            transition: swingState ? 'none' : 'transform 0.2s ease',
          }}
          title="Drag me anywhere! Click to open speech balloon."
        >
          {activeCompanion === 'bonzi' ? (
            <BonziMonkeySVG
              size={128}
              mouthOpen={mouthFrame}
              blinking={blinking}
              swinging={Boolean(swingState?.active)}
              singing={isSinging}
              waving={isTalking}
              holdingBanana={!isSinging && !isTalking && jokeIdx % 3 === 1}
            />
          ) : (
            <ClassicBuddySVG type={activeCompanion} />
          )}
        </div>
      </div>
    </>
  );
};

/* ============================================================================
   FULL COMPANIONS STUDIO WINDOW (`companions` / `bonzibuddy` app)
   ============================================================================ */
export const CompanionsStudioApp: React.FC = () => {
  const {
    bonziOverlay,
    setBonziOverlay,
    activeCompanion,
    setActiveCompanion,
    triggerBonziSwing,
    dispatchCompanionCommand,
  } = useOS();
  const [customPhrase, setCustomPhrase] = useState(
    'Hello friend! I am Bonzi the purple monkey! Watch me swing in on a web and sing Daisy Bell!'
  );

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(180deg, #faf5ff 0%, #ede9fe 100%)',
        fontSize: 12,
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, #581c87 0%, #7e22ce 55%, #a855f7 100%)',
          color: '#fff',
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
          borderBottom: '3px solid #fde047',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <BonziMonkeySVG size={54} mouthOpen={1} waving />
          <div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>BonziBUDDY v3.6 &amp; Classic Desktop Companions</div>
            <div style={{ fontSize: 11, color: '#f3e8ff' }}>
              Accurate 3D-shaded Purple Monkey swings in from a web, talks with lip-sync &amp; sings 6 melodies!
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => triggerBonziSwing('bonzi')}
            style={{
              padding: '8px 14px',
              borderRadius: 6,
              border: '2px solid #fde047',
              background: '#22c55e',
              color: '#052e16',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            🕸️ Swing In From Web!
          </button>
          <button
            onClick={() => setBonziOverlay(!bonziOverlay)}
            style={{
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid #fff',
              background: bonziOverlay ? 'rgba(255,255,255,0.2)' : '#ef4444',
              color: '#fff',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {bonziOverlay ? 'Hide Buddy' : 'Show Buddy'}
          </button>
        </div>
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Live Jukebox: Make Bonzi Sing Any of His 6 Classic Songs! */}
        <div style={{ background: '#fff', border: '1px solid #d8b4fe', borderRadius: 8, padding: 12 }}>
          <div style={{ fontWeight: 800, color: '#581c87', marginBottom: 8 }}>
            🎵 Bonzi Singing Jukebox — Click Any Song to Make Bonzi Sing Live on Your Desktop:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(195px, 1fr))', gap: 8 }}>
            {BONZI_SONGS.map((song) => (
              <button
                key={song.id}
                onClick={() => {
                  setActiveCompanion('bonzi');
                  dispatchCompanionCommand({ kind: 'sing', songId: song.id });
                }}
                style={{
                  padding: '8px 10px',
                  borderRadius: 7,
                  border: '1px solid #c084fc',
                  background: '#faf5ff',
                  color: '#4c1d95',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: 11.5,
                }}
              >
                {song.title}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Speech Synthesizer Box */}
        <div style={{ background: '#fff', border: '1px solid #d8b4fe', borderRadius: 8, padding: 12 }}>
          <div style={{ fontWeight: 800, color: '#581c87', marginBottom: 6 }}>
            🎤 TruVoice Lip-Sync Speech Box — Make Bonzi Speak Any Sentence Aloud:
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={customPhrase}
              onChange={(e) => setCustomPhrase(e.target.value)}
              style={{
                flex: 1,
                padding: '7px 10px',
                borderRadius: 6,
                border: '1px solid #a855f7',
                fontSize: 12,
              }}
            />
            <button
              onClick={() => dispatchCompanionCommand({ kind: 'speak', text: customPhrase })}
              style={{
                padding: '7px 14px',
                borderRadius: 6,
                border: 'none',
                background: '#7e22ce',
                color: '#fff',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              🔊 Make Bonzi Talk
            </button>
            <button
              onClick={() => dispatchCompanionCommand({ kind: 'joke' })}
              style={{
                padding: '7px 12px',
                borderRadius: 6,
                border: '1px solid #7e22ce',
                background: '#f3e8ff',
                color: '#581c87',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              😂 Tell Joke
            </button>
          </div>
        </div>

        {/* Choose Active Desktop Buddy */}
        <div style={{ background: '#fff', border: '1px solid #d8b4fe', borderRadius: 8, padding: 12 }}>
          <div style={{ fontWeight: 800, color: '#581c87', marginBottom: 8 }}>
            🎭 Switch Active Desktop Companion:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(115px, 1fr))', gap: 8 }}>
            {(
              [
                { id: 'bonzi', label: 'BonziBUDDY', sub: 'Purple Monkey (Swings & Sings!)', badge: '⭐ Default' },
                { id: 'clippy', label: 'Clippy', sub: 'Office 97/XP Paperclip', badge: '1997' },
                { id: 'peedy', label: 'Peedy', sub: 'Green MS Agent Parrot', badge: '1999' },
                { id: 'rover', label: 'Rover', sub: 'Windows XP Search Dog', badge: '2001' },
                { id: 'merlin', label: 'Merlin', sub: 'Microsoft Agent Wizard', badge: '1998' },
              ] as Array<{ id: CompanionType; label: string; sub: string; badge: string }>
            ).map((c) => {
              const selected = activeCompanion === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveCompanion(c.id)}
                  style={{
                    padding: 10,
                    borderRadius: 8,
                    border: selected ? '2px solid #7e22ce' : '1px solid #cbd5e1',
                    background: selected ? '#f3e8ff' : '#f8fafc',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ fontSize: 10, color: '#7e22ce', fontWeight: 800 }}>{c.badge}</div>
                  <div style={{ fontWeight: 800, fontSize: 13, marginTop: 2 }}>{c.label}</div>
                  <div style={{ fontSize: 10.5, color: '#475569', marginTop: 2 }}>{c.sub}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

import React from 'react';

export const WindowsXPFlagSVG: React.FC<{ size?: number }> = ({ size = 48 }) => (
  <svg width={size} height={size * 0.88} viewBox="0 0 100 88" fill="none">
    <defs>
      <linearGradient id="xpRed" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#ff7340" />
        <stop offset="55%" stopColor="#eb3c14" />
        <stop offset="100%" stopColor="#b82305" />
      </linearGradient>
      <linearGradient id="xpGreen" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#a8e838" />
        <stop offset="55%" stopColor="#6dc211" />
        <stop offset="100%" stopColor="#468c05" />
      </linearGradient>
      <linearGradient id="xpBlue" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#5cc6ff" />
        <stop offset="55%" stopColor="#098be6" />
        <stop offset="100%" stopColor="#0459a8" />
      </linearGradient>
      <linearGradient id="xpYellow" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#ffe359" />
        <stop offset="55%" stopColor="#fcba04" />
        <stop offset="100%" stopColor="#d48c00" />
      </linearGradient>
    </defs>
    {/* Top-left Red */}
    <path d="M18 12 C29 5, 42 8, 51 15 L44 43 C35 36, 22 33, 11 40 Z" fill="url(#xpRed)" />
    {/* Top-right Green */}
    <path d="M56 17 C67 24, 80 26, 91 18 L84 46 C73 54, 60 52, 49 45 Z" fill="url(#xpGreen)" />
    {/* Bottom-left Blue */}
    <path d="M10 45 C21 38, 34 41, 43 48 L36 76 C27 69, 14 66, 3 73 Z" fill="url(#xpBlue)" />
    {/* Bottom-right Yellow */}
    <path d="M48 50 C59 57, 72 59, 83 51 L76 79 C65 87, 52 85, 41 78 Z" fill="url(#xpYellow)" />
  </svg>
);

export const AOLClassicLogo: React.FC<{ width?: number }> = ({ width = 230 }) => (
  <svg width={width} height={width * 0.37} viewBox="0 0 280 104" fill="none">
    <defs>
      <filter id="aolShadow" x="-10%" y="-10%" width="130%" height="130%">
        <feDropShadow dx="2" dy="2" stdDeviation="1.5" floodColor="#000" floodOpacity="0.28" />
      </filter>
    </defs>
    <g filter="url(#aolShadow)">
      {/* Blue AOL Triangle */}
      <path d="M62 12 L18 90 L106 90 Z" fill="#00357a" />
      {/* White curve cutout inside triangle */}
      <path
        d="M42 64 C44 42, 74 38, 86 64 C90 73, 88 84, 82 90 L70 90 C76 80, 75 64, 63 59 C52 54, 46 66, 48 80 L36 80 C36 73, 39 68, 42 64 Z"
        fill="#ffffff"
      />
      <circle cx="62" cy="69" r="14" fill="#00357a" />
    </g>
    {/* AMERICA text */}
    <text
      x="116"
      y="33"
      fill="#0d254c"
      fontFamily="Tahoma, Arial, sans-serif"
      fontWeight="800"
      fontSize="14"
      letterSpacing="5.5"
    >
      AMERICA
    </text>
    {/* Cursive Online */}
    <text
      x="110"
      y="76"
      fill="#00357a"
      fontFamily="'Brush Script MT', 'Segoe Script', 'Comic Sans MS', cursive"
      fontStyle="italic"
      fontWeight="700"
      fontSize="54"
      filter="url(#aolShadow)"
    >
      Online
    </text>
    {/* Signature swoosh underline */}
    <path
      d="M116 86 Q 186 73, 266 75"
      stroke="#00357a"
      strokeWidth="3.5"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);

export const RunningManSVG: React.FC<{ size?: number; speedLines?: boolean; color?: string }> = ({
  size = 64,
  speedLines = false,
  color = '#ffd43b',
}) => (
  <svg width={size * (speedLines ? 1.28 : 1)} height={size} viewBox={speedLines ? '-28 0 118 92' : '0 0 90 92'} fill="none">
    <defs>
      <filter id="manShadow" x="-15%" y="-15%" width="140%" height="140%">
        <feDropShadow dx="2" dy="2" stdDeviation="1.2" floodColor="#000" floodOpacity="0.45" />
      </filter>
    </defs>
    {speedLines && (
      <g stroke="#111" strokeWidth="3.2" strokeLinecap="round">
        <line x1="-22" y1="26" x2="10" y2="26" />
        <line x1="-14" y1="42" x2="6" y2="42" />
        <line x1="-20" y1="58" x2="8" y2="58" />
      </g>
    )}
    <g filter="url(#manShadow)">
      {/* Head */}
      <circle cx="48" cy="18" r="10.5" fill={color} stroke="#111" strokeWidth="3.2" />
      {/* Running Body */}
      <path
        d="M44 30 L59 38 L72 34 L75 43 L57 49 L52 56 L68 74 L59 82 L43 64 L32 76 L16 80 L13 70 L27 65 L37 51 L29 44 L38 30 Z"
        fill={color}
        stroke="#111"
        strokeWidth="3.2"
        strokeLinejoin="round"
      />
    </g>
  </svg>
);

export const AOLPeopleTriangleSVG: React.FC<{ size?: number }> = ({ size = 78 }) => (
  <svg width={size * 1.2} height={size} viewBox="0 0 120 96" fill="none">
    {/* Back AOL Blue Triangle */}
    <path d="M60 8 L22 82 L98 82 Z" fill="#0d2570" />
    <path d="M46 58 C50 42, 72 42, 76 58" stroke="#cbd2ff" strokeWidth="5" fill="none" />
    {/* Left Person raising arm (greenish cream) */}
    <path
      d="M13 50 C20 58, 30 64, 36 66 L36 82 L52 82 L50 67 C42 63, 28 53, 19 44 Z"
      fill="#d6f5c9"
      stroke="#111"
      strokeWidth="2.8"
      strokeLinejoin="round"
    />
    <circle cx="35" cy="54" r="8" fill="#fff" stroke="#111" strokeWidth="2.8" />
    {/* Right Person raising arm (peach) */}
    <path
      d="M107 50 C100 58, 90 64, 84 66 L84 82 L68 82 L70 67 C78 63, 92 53, 101 44 Z"
      fill="#ffe0b2"
      stroke="#111"
      strokeWidth="2.8"
      strokeLinejoin="round"
    />
    <circle cx="85" cy="54" r="8" fill="#fff" stroke="#111" strokeWidth="2.8" />
    {/* Center-Left Red shirt figure */}
    <path d="M36 82 C38 69, 54 69, 57 82 Z" fill="#e61919" stroke="#111" strokeWidth="2.8" />
    <circle cx="48" cy="64" r="7" fill="#fff" stroke="#111" strokeWidth="2.8" />
    {/* Center-Right Yellow shirt figure */}
    <path d="M56 82 C59 68, 79 68, 82 82 Z" fill="#ffea28" stroke="#111" strokeWidth="2.8" />
    <circle cx="69" cy="63" r="7.5" fill="#fff" stroke="#111" strokeWidth="2.8" />
  </svg>
);

export const AOLMailboxIconSVG: React.FC<{ size?: number; hasUnread?: boolean }> = ({
  size = 32,
  hasUnread = true,
}) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    {/* Wooden post */}
    <rect x="21" y="28" width="6" height="17" rx="1" fill="#a86b32" stroke="#4a2c0f" strokeWidth="1.8" />
    {/* Mailbox body */}
    <path
      d="M8 20 C8 12, 16 11, 24 11 L36 11 C41 11, 43 15, 43 20 L43 29 L8 29 Z"
      fill="#dce7f5"
      stroke="#1e3250"
      strokeWidth="2"
    />
    {/* Open front showing blue/gold envelope */}
    <path d="M8 20 C8 14, 17 14, 17 20 L17 29 L8 29 Z" fill="#6b7f9e" stroke="#1e3250" strokeWidth="2" />
    {hasUnread && (
      <>
        {/* Envelope sticking out */}
        <rect x="3" y="19" width="13" height="9" rx="1" fill="#fff7cc" stroke="#204080" strokeWidth="1.5" />
        <path d="M3 19 L9.5 24 L16 19" stroke="#204080" strokeWidth="1.3" />
        {/* Red Flag UP */}
        <line x1="28" y1="22" x2="28" y2="5" stroke="#b50000" strokeWidth="2.4" />
        <path d="M28 5 L38 5 L38 11 L28 11 Z" fill="#ff1f1f" stroke="#7a0000" strokeWidth="1.2" />
      </>
    )}
    {!hasUnread && (
      /* Red Flag DOWN */
      <g>
        <line x1="28" y1="22" x2="40" y2="22" stroke="#b50000" strokeWidth="2.4" />
        <rect x="35" y="22" width="6" height="4" fill="#ff1f1f" />
      </g>
    )}
  </svg>
);

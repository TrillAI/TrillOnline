import React, { useRef, useState, useCallback, useEffect } from 'react';

export type Suit = '♠' | '♥' | '♣' | '♦';

export interface PlayingCardData {
  id: string;
  suit: Suit;
  rank: number; // 1 = A .. 13 = K
  faceUp: boolean;
}

export const SUITS: Suit[] = ['♠', '♥', '♣', '♦'];
export const RANKS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export const isRedSuit = (s: Suit): boolean => s === '♥' || s === '♦';

export type CardBackId =
  | 'castle'
  | 'island'
  | 'spiderweb'
  | 'robot'
  | 'roses'
  | 'shells'
  | 'astronaut'
  | 'classic_blue';

export interface CardBackDesign {
  id: CardBackId;
  name: string;
}

export const CARD_BACK_DESIGNS: CardBackDesign[] = [
  { id: 'classic_blue', name: 'Classic Lattice' },
  { id: 'castle', name: 'Haunted Castle' },
  { id: 'island', name: 'Sunny Island' },
  { id: 'spiderweb', name: 'Spider Web' },
  { id: 'roses', name: 'Tudor Roses' },
  { id: 'robot', name: 'Retro Robot' },
  { id: 'shells', name: 'Ocean Shells' },
  { id: 'astronaut', name: 'Spacewalk' },
];

/* ============================================================================
   CRISP VECTOR SUIT GLYPHS (Consistent across Linux/Windows/macOS/Android)
   ============================================================================ */
export const SuitGlyph: React.FC<{ suit: Suit; size?: number; color?: string }> = ({
  suit,
  size = 14,
  color,
}) => {
  const fill = color ?? (isRedSuit(suit) ? '#d60000' : '#0a0a0a');
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{ display: 'block', flexShrink: 0 }}
      aria-hidden="true"
    >
      {suit === '♠' && (
        <path
          d="M12 2C7.5 7.2 3 10.6 3 14.5C3 17.3 5.2 19.2 7.8 19.2C9.4 19.2 10.7 18.4 11.4 17.3L10.1 22H13.9L12.6 17.3C13.3 18.4 14.6 19.2 16.2 19.2C18.8 19.2 21 17.3 21 14.5C21 10.6 16.5 7.2 12 2Z"
          fill={fill}
        />
      )}
      {suit === '♥' && (
        <path
          d="M12 21.4L10.5 20C5.2 15.2 2.2 12.4 2.2 8.6C2.2 5.4 4.7 3 7.8 3C9.6 3 11.3 3.9 12 5.2C12.7 3.9 14.4 3 16.2 3C19.3 3 21.8 5.4 21.8 8.6C21.8 12.4 18.8 15.2 13.5 20L12 21.4Z"
          fill={fill}
        />
      )}
      {suit === '♦' && <path d="M12 2L20.5 12L12 22L3.5 12L12 2Z" fill={fill} />}
      {suit === '♣' && (
        <path
          d="M12 2.5C9.5 2.5 7.6 4.4 7.6 6.8C7.6 8 8.1 9.1 8.9 9.8C7.9 9.4 6.8 9.2 5.9 9.5C3.8 10.1 2.5 12.1 2.9 14.3C3.3 16.5 5.2 18 7.4 18C9 18 10.4 17.1 11.2 15.8L9.9 21.8H14.1L12.8 15.8C13.6 17.1 15 18 16.6 18C18.8 18 20.7 16.5 21.1 14.3C21.5 12.1 20.2 10.1 18.1 9.5C17.2 9.2 16.1 9.4 15.1 9.8C15.9 9.1 16.4 8 16.4 6.8C16.4 4.4 14.5 2.5 12 2.5Z"
          fill={fill}
        />
      )}
    </svg>
  );
};

/* ============================================================================
   TRADITIONAL PLAYING CARD PIP COORDINATES (Ranks 2..10)
   Normalized [xPercent, yPercent, inverted] inside center pip box
   ============================================================================ */
const PIP_LAYOUTS: Record<number, Array<[number, number, boolean?]>> = {
  2: [
    [50, 18, false],
    [50, 82, true],
  ],
  3: [
    [50, 16, false],
    [50, 50, false],
    [50, 84, true],
  ],
  4: [
    [28, 18, false],
    [72, 18, false],
    [28, 82, true],
    [72, 82, true],
  ],
  5: [
    [28, 18, false],
    [72, 18, false],
    [50, 50, false],
    [28, 82, true],
    [72, 82, true],
  ],
  6: [
    [28, 17, false],
    [72, 17, false],
    [28, 50, false],
    [72, 50, false],
    [28, 83, true],
    [72, 83, true],
  ],
  7: [
    [28, 16, false],
    [72, 16, false],
    [50, 33, false],
    [28, 50, false],
    [72, 50, false],
    [28, 84, true],
    [72, 84, true],
  ],
  8: [
    [28, 16, false],
    [72, 16, false],
    [50, 33, false],
    [28, 50, false],
    [72, 50, false],
    [50, 67, true],
    [28, 84, true],
    [72, 84, true],
  ],
  9: [
    [28, 14, false],
    [72, 14, false],
    [28, 38, false],
    [72, 38, false],
    [50, 50, false],
    [28, 62, true],
    [72, 62, true],
    [28, 86, true],
    [72, 86, true],
  ],
  10: [
    [28, 14, false],
    [72, 14, false],
    [50, 26, false],
    [28, 38, false],
    [72, 38, false],
    [28, 62, true],
    [72, 62, true],
    [50, 74, true],
    [28, 86, true],
    [72, 86, true],
  ],
};

/* ============================================================================
   AUTHENTIC WINDOWS XP cards.dll CARD BACK ARTWORK
   ============================================================================ */
export const CardBackView: React.FC<{
  design?: CardBackId;
  width?: number | string;
  height?: number | string;
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent) => void;
}> = ({ design = 'classic_blue', width = '100%', height = '100%', style, onClick }) => {
  return (
    <div
      onClick={onClick}
      style={{
        width,
        height,
        borderRadius: 4,
        background: '#ffffff',
        border: '1px solid #0b0b0b',
        padding: 3,
        boxSizing: 'border-box',
        boxShadow: '0 1px 2px rgba(0,0,0,0.45)',
        userSelect: 'none',
        ...style,
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: 2,
          overflow: 'hidden',
          position: 'relative',
          border: '1px solid rgba(0,0,0,0.35)',
          boxSizing: 'border-box',
          ...(design === 'classic_blue'
            ? {
                backgroundColor: '#123e96',
                backgroundImage:
                  'repeating-linear-gradient(45deg, rgba(255,255,255,0.28) 0 2px, transparent 2px 6px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.28) 0 2px, transparent 2px 6px)',
              }
            : design === 'spiderweb'
            ? {
                background: 'radial-gradient(circle at 50% 50%, #1d4ed8 0%, #0b1d5c 70%, #050d2e 100%)',
              }
            : design === 'castle'
            ? {
                background: 'linear-gradient(180deg, #1e1b4b 0%, #3730a3 52%, #14532d 85%, #052e16 100%)',
              }
            : design === 'island'
            ? {
                background: 'linear-gradient(180deg, #38bdf8 0%, #7dd3fc 56%, #0284c7 68%, #fde047 72%, #eab308 100%)',
              }
            : design === 'roses'
            ? {
                backgroundColor: '#881337',
                backgroundImage:
                  'repeating-linear-gradient(45deg, rgba(253,224,71,0.22) 0 2px, transparent 2px 8px), repeating-linear-gradient(-45deg, rgba(253,224,71,0.22) 0 2px, transparent 2px 8px)',
              }
            : design === 'robot'
            ? {
                background: 'linear-gradient(180deg, #334155 0%, #0f172a 100%)',
              }
            : design === 'shells'
            ? {
                background: 'linear-gradient(135deg, #0ea5e9 0%, #0369a1 55%, #1e3a8a 100%)',
              }
            : {
                background: 'radial-gradient(circle at 30% 25%, #312e81 0%, #090d1f 75%)',
              }),
        }}
      >
        <svg viewBox="0 0 64 88" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
          {design === 'classic_blue' && (
            <>
              <rect x="4" y="4" width="56" height="80" rx="2" fill="none" stroke="#93c5fd" strokeWidth="1.2" />
              <circle cx="32" cy="44" r="13" fill="#0b2563" stroke="#bfdbfe" strokeWidth="1.2" />
              <polygon points="32,33 35,41 43,41 37,46 39,54 32,49 25,54 27,46 21,41 29,41" fill="#dbeafe" />
            </>
          )}
          {design === 'spiderweb' && (
            <>
              {/* Spiderweb rays & rings */}
              {[0, 30, 60, 90, 120, 150].map((deg) => (
                <line
                  key={deg}
                  x1="32"
                  y1="44"
                  x2={32 + 46 * Math.cos((deg * Math.PI) / 180)}
                  y2={44 + 46 * Math.sin((deg * Math.PI) / 180)}
                  stroke="rgba(191,219,254,0.45)"
                  strokeWidth="0.9"
                />
              ))}
              {[10, 20, 30].map((r) => (
                <circle
                  key={r}
                  cx="32"
                  cy="44"
                  r={r}
                  fill="none"
                  stroke="rgba(191,219,254,0.42)"
                  strokeWidth="0.9"
                />
              ))}
              {/* Red-accented XP Spider silhouette */}
              <ellipse cx="32" cy="46" rx="5.5" ry="7" fill="#dc2626" stroke="#111" strokeWidth="1" />
              <circle cx="32" cy="37" r="3.6" fill="#111" />
              <path
                d="M27 40 L18 33 M27 44 L16 44 M27 48 L18 56 M37 40 L46 33 M37 44 L48 44 M37 48 L46 56"
                stroke="#f8fafc"
                strokeWidth="1.3"
                strokeLinecap="round"
              />
            </>
          )}
          {design === 'castle' && (
            <>
              <circle cx="47" cy="18" r="8" fill="#fef08a" opacity="0.92" />
              <path d="M0 68 Q32 52 64 68 L64 88 L0 88 Z" fill="#14532d" />
              <rect x="18" y="34" width="28" height="30" fill="#1e293b" stroke="#0f172a" />
              <rect x="14" y="24" width="8" height="40" fill="#334155" />
              <rect x="42" y="24" width="8" height="40" fill="#334155" />
              <polygon points="12,24 18,14 24,24" fill="#0f172a" />
              <polygon points="40,24 46,14 52,24" fill="#0f172a" />
              <polygon points="25,34 32,20 39,34" fill="#0f172a" />
              <rect x="29" y="50" width="6" height="14" rx="3" fill="#f59e0b" />
              <rect x="22" y="39" width="4" height="5" fill="#fde047" />
              <rect x="38" y="39" width="4" height="5" fill="#fde047" />
            </>
          )}
          {design === 'island' && (
            <>
              <circle cx="48" cy="16" r="8" fill="#fde047" />
              {/* Palm trunk & fronds */}
              <path d="M26 68 Q22 48 31 30" stroke="#78350f" strokeWidth="4" fill="none" strokeLinecap="round" />
              <path d="M31 30 Q16 24 12 34 M31 30 Q20 16 14 20 M31 30 Q44 18 50 25 M31 30 Q46 28 50 38" stroke="#15803d" strokeWidth="3.2" fill="none" strokeLinecap="round" />
              {/* Cute red beach crab */}
              <ellipse cx="44" cy="76" rx="5" ry="3.2" fill="#ef4444" />
            </>
          )}
          {design === 'roses' && (
            <>
              <rect x="5" y="5" width="54" height="78" fill="none" stroke="#fde047" strokeWidth="1.2" />
              <circle cx="32" cy="30" r="8" fill="#e11d48" stroke="#fecdd3" strokeWidth="1" />
              <circle cx="32" cy="30" r="3.5" fill="#fb7185" />
              <circle cx="32" cy="58" r="8" fill="#e11d48" stroke="#fecdd3" strokeWidth="1" />
              <circle cx="32" cy="58" r="3.5" fill="#fb7185" />
              <path d="M32 38 L32 50 M25 44 L39 44" stroke="#22c55e" strokeWidth="2.2" />
            </>
          )}
          {design === 'robot' && (
            <>
              <line x1="32" y1="12" x2="32" y2="21" stroke="#94a3b8" strokeWidth="2" />
              <circle cx="32" cy="11" r="3" fill="#ef4444" />
              <rect x="18" y="21" width="28" height="22" rx="4" fill="#94a3b8" stroke="#e2e8f0" />
              <circle cx="26" cy="30" r="3" fill="#fde047" />
              <circle cx="38" cy="30" r="3" fill="#fde047" />
              <rect x="23" y="37" width="18" height="3" fill="#0f172a" />
              <rect x="15" y="46" width="34" height="26" rx="3" fill="#64748b" stroke="#cbd5e1" />
              <rect x="21" y="52" width="22" height="10" fill="#0284c7" />
            </>
          )}
          {design === 'shells' && (
            <>
              <path d="M18 32 Q32 14 46 32 L32 46 Z" fill="#fed7aa" stroke="#fb923c" strokeWidth="1.2" />
              <path d="M18 64 Q32 46 46 64 L32 78 Z" fill="#fef08a" stroke="#eab308" strokeWidth="1.2" />
            </>
          )}
          {design === 'astronaut' && (
            <>
              <circle cx="14" cy="18" r="1.2" fill="#fff" />
              <circle cx="51" cy="24" r="1.5" fill="#fde047" />
              <circle cx="20" cy="70" r="1.2" fill="#fff" />
              <circle cx="48" cy="64" r="7" fill="#38bdf8" />
              <circle cx="30" cy="34" r="9" fill="#f8fafc" stroke="#94a3b8" />
              <ellipse cx="30" cy="34" rx="6" ry="4.5" fill="#1e3a8a" />
              <rect x="22" y="43" width="16" height="19" rx="4" fill="#f8fafc" />
            </>
          )}
        </svg>
      </div>
    </div>
  );
};

/* ============================================================================
   AUTHENTIC WINDOWS XP cards.dll CARD FACE VIEW
   ============================================================================ */
export const CardFaceView: React.FC<{
  suit: Suit;
  rank: number;
  width?: number | string;
  height?: number | string;
  selected?: boolean;
  hintFlash?: boolean;
  dimmed?: boolean;
  compactHeader?: boolean; // extra crisp top strip for Spider 10-column stacks
  style?: React.CSSProperties;
}> = ({
  suit,
  rank,
  width = '100%',
  height = '100%',
  selected = false,
  hintFlash = false,
  dimmed = false,
  compactHeader = false,
  style,
}) => {
  const red = isRedSuit(suit);
  const ink = red ? '#d60000' : '#0a0a0a';
  const rankLabel = RANKS[rank];
  const pips = PIP_LAYOUTS[rank];

  return (
    <div
      style={{
        width,
        height,
        borderRadius: 4,
        background: hintFlash ? '#1e293b' : selected ? '#e0f2fe' : dimmed ? '#f1f5f9' : '#ffffff',
        border: selected
          ? '2px solid #2563eb'
          : hintFlash
          ? '2px solid #facc15'
          : '1px solid #141414',
        boxShadow: selected
          ? '0 0 0 2px rgba(250, 204, 21, 0.85), 0 4px 10px rgba(0,0,0,0.45)'
          : '0 1px 2px rgba(0,0,0,0.38)',
        boxSizing: 'border-box',
        position: 'relative',
        overflow: 'hidden',
        userSelect: 'none',
        filter: hintFlash ? 'invert(1)' : undefined,
        ...style,
      }}
    >
      {/* Top Header Strip — Always legible even when stacked 20px apart! */}
      {compactHeader ? (
        <div
          style={{
            position: 'absolute',
            top: 2,
            left: 4,
            right: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            lineHeight: 1,
            pointerEvents: 'none',
          }}
        >
          <span
            style={{
              color: ink,
              fontFamily: "'Arial', 'Tahoma', sans-serif",
              fontWeight: 900,
              fontSize: rank === 10 ? 12 : 13,
              letterSpacing: rank === 10 ? -0.8 : 0,
            }}
          >
            {rankLabel}
          </span>
          <SuitGlyph suit={suit} size={12} color={ink} />
        </div>
      ) : (
        <>
          {/* Classic Top-Left Corner Index */}
          <div
            style={{
              position: 'absolute',
              top: 3,
              left: 3,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              lineHeight: 1,
              pointerEvents: 'none',
              width: 15,
            }}
          >
            <span
              style={{
                color: ink,
                fontFamily: "'Arial', 'Tahoma', sans-serif",
                fontWeight: 900,
                fontSize: rank === 10 ? 11.5 : 13,
                letterSpacing: rank === 10 ? -1 : 0,
              }}
            >
              {rankLabel}
            </span>
            <SuitGlyph suit={suit} size={11} color={ink} />
          </div>

          {/* Also tiny Top-Right Suit so tightly stacked cards are super easy to read */}
          <div
            style={{
              position: 'absolute',
              top: 4,
              right: 4,
              pointerEvents: 'none',
              opacity: 0.9,
            }}
          >
            <SuitGlyph suit={suit} size={10} color={ink} />
          </div>
        </>
      )}

      {/* Inverted Bottom-Right Corner Index */}
      <div
        style={{
          position: 'absolute',
          bottom: 3,
          right: 3,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          lineHeight: 1,
          transform: 'rotate(180deg)',
          pointerEvents: 'none',
          width: 15,
        }}
      >
        <span
          style={{
            color: ink,
            fontFamily: "'Arial', 'Tahoma', sans-serif",
            fontWeight: 900,
            fontSize: rank === 10 ? 11 : 12.5,
            letterSpacing: rank === 10 ? -1 : 0,
          }}
        >
          {rankLabel}
        </span>
        <SuitGlyph suit={suit} size={10} color={ink} />
      </div>

      {/* Center Card Body: Ace, Number Pips (2-10), or Illustrated Court Card (J/Q/K) */}
      <div
        style={{
          position: 'absolute',
          left: compactHeader ? 10 : 17,
          right: compactHeader ? 10 : 17,
          top: compactHeader ? 18 : 13,
          bottom: compactHeader ? 15 : 13,
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {rank === 1 && (
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <SuitGlyph suit={suit} size={suit === '♠' ? 34 : 30} color={ink} />
            {suit === '♠' && (
              <div
                style={{
                  position: 'absolute',
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  border: '1.5px solid #fff',
                  top: '44%',
                }}
              />
            )}
          </div>
        )}

        {pips && (
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            {pips.map(([xp, yp, inv], idx) => (
              <div
                key={idx}
                style={{
                  position: 'absolute',
                  left: `${xp}%`,
                  top: `${yp}%`,
                  transform: `translate(-50%, -50%)${inv ? ' rotate(180deg)' : ''}`,
                }}
              >
                <SuitGlyph suit={suit} size={rank >= 8 ? 11 : 12.5} color={ink} />
              </div>
            ))}
          </div>
        )}

        {rank >= 11 && (
          <div
            style={{
              width: '100%',
              height: '100%',
              border: `1.5px solid ${red ? '#b91c1c' : '#1e3a8a'}`,
              background: red
                ? 'linear-gradient(180deg, #fffbeb 0%, #fef3c7 50%, #fffbeb 100%)'
                : 'linear-gradient(180deg, #f8fafc 0%, #dbeafe 50%, #f8fafc 100%)',
              borderRadius: 2,
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg viewBox="0 0 40 60" width="100%" height="100%">
              {/* Royal Sash & Crown */}
              <polygon points="0,60 40,22 40,36 0,60" fill={red ? '#dc2626' : '#1d4ed8'} opacity="0.22" />
              {/* Crown */}
              <polygon
                points="10,16 13,8 20,14 27,8 30,16"
                fill="#eab308"
                stroke="#854d0e"
                strokeWidth="1"
              />
              {/* Royal Head */}
              <circle cx="20" cy="23" r="6" fill="#fde68a" stroke="#78350f" strokeWidth="0.9" />
              <circle cx="18" cy="22" r="0.9" fill="#111" />
              <circle cx="22" cy="22" r="0.9" fill="#111" />
              {rank === 13 && (
                /* King's beard & sword */
                <>
                  <path d="M15 26 Q20 31 25 26" fill="#92400e" />
                  <line x1="32" y1="12" x2="30" y2="44" stroke="#64748b" strokeWidth="2" />
                </>
              )}
              {rank === 12 && (
                /* Queen's hair & rose */
                <>
                  <circle cx="31" cy="36" r="3" fill="#e11d48" />
                  <line x1="31" y1="39" x2="31" y2="48" stroke="#15803d" strokeWidth="1.5" />
                </>
              )}
              {rank === 11 && (
                /* Jack's feather & halberd */
                <>
                  <path d="M27 12 Q34 6 33 15" stroke="#dc2626" strokeWidth="2" fill="none" />
                  <line x1="9" y1="12" x2="9" y2="48" stroke="#78350f" strokeWidth="1.8" />
                </>
              )}
              {/* Royal Tunic */}
              <path
                d="M9 48 C9 34 31 34 31 48 L33 58 L7 58 Z"
                fill={red ? '#dc2626' : '#1d4ed8'}
                stroke="#eab308"
                strokeWidth="1.2"
              />
              <text
                x="20"
                y="50"
                textAnchor="middle"
                fontSize="11"
                fontWeight="900"
                fill="#fef08a"
                fontFamily="Georgia, serif"
              >
                {rankLabel}
              </text>
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};

/* ============================================================================
   60/120FPS ZERO-LAG GPU LIVE DRAG-AND-DROP + TAP/DOUBLE-TAP ENGINE
   - Updates floating stack via direct DOM `translate3d(...)` ref (0 re-renders/frame!)
   - Supports mouse drag, touch finger drag, single-tap select/move, and double-tap!
   ============================================================================ */
export interface DragSession<TPayload> {
  payload: TPayload;
  cards: PlayingCardData[];
  width: number;
  height: number;
  stackGap: number;
  initialX: number;
  initialY: number;
}

interface UseCardDragOptions<TPayload> {
  boardRef: React.RefObject<HTMLElement | null>;
  canDropOnZone: (zoneId: string, payload: TPayload) => boolean;
  onDropOnZone: (zoneId: string, payload: TPayload) => void;
  onTapCard: (payload: TPayload) => void;
  onDoubleTapCard?: (payload: TPayload) => void;
  getPayloadKey: (payload: TPayload) => string;
}

export function useCardDrag<TPayload>({
  boardRef,
  canDropOnZone,
  onDropOnZone,
  onTapCard,
  onDoubleTapCard,
  getPayloadKey,
}: UseCardDragOptions<TPayload>) {
  const [activeDrag, setActiveDrag] = useState<DragSession<TPayload> | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  // Keep latest callbacks in refs so window pointer listeners never go stale
  const callbacksRef = useRef({
    canDropOnZone,
    onDropOnZone,
    onTapCard,
    onDoubleTapCard,
    getPayloadKey,
  });
  callbacksRef.current = {
    canDropOnZone,
    onDropOnZone,
    onTapCard,
    onDoubleTapCard,
    getPayloadKey,
  };

  const lastTapRef = useRef<{ time: number; key: string }>({ time: 0, key: '' });
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      cleanupRef.current?.();
    };
  }, []);

  const startPointerInteraction = useCallback(
    (
      e: React.PointerEvent<HTMLElement>,
      params: {
        payload: TPayload;
        cards: PlayingCardData[];
        canDrag?: boolean;
        stackGap?: number;
      }
    ) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.stopPropagation();

      const targetEl = e.currentTarget;
      const rect = targetEl.getBoundingClientRect();
      const startX = e.clientX;
      const startY = e.clientY;
      const offsetX = startX - rect.left;
      const offsetY = startY - rect.top;
      const cardW = rect.width || 71;
      const cardH = rect.height || 96;
      const stackGap = params.stackGap ?? 20;
      const allowDrag = params.canDrag !== false && params.cards.length > 0;

      let dragging = false;

      const handleMove = (ev: PointerEvent) => {
        if (!allowDrag) return;
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;

        if (!dragging) {
          if (dx * dx + dy * dy < 25) return; // 5px threshold separates Tap from Drag
          dragging = true;
          const x = ev.clientX - offsetX;
          const y = ev.clientY - offsetY;
          setActiveDrag({
            payload: params.payload,
            cards: params.cards,
            width: cardW,
            height: cardH,
            stackGap,
            initialX: x,
            initialY: y,
          });
          if (overlayRef.current) {
            overlayRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
          }
          return;
        }

        if (overlayRef.current) {
          const x = ev.clientX - offsetX;
          const y = ev.clientY - offsetY;
          overlayRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        }
      };

      const finish = (ev: PointerEvent, cancelled: boolean) => {
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', handleUp);
        window.removeEventListener('pointercancel', handleCancel);
        cleanupRef.current = null;

        const cbs = callbacksRef.current;

        if (dragging) {
          setActiveDrag(null);
          if (cancelled) return;

          // Bounding-box intersection hit test across all valid [data-drop-zone] targets!
          const dragLeft = ev.clientX - offsetX;
          const dragTop = ev.clientY - offsetY;
          const dragRight = dragLeft + cardW;
          const dragBottom = dragTop + cardH + (params.cards.length - 1) * stackGap;

          const root = boardRef.current ?? document.body;
          const zones = root.querySelectorAll<HTMLElement>('[data-drop-zone]');
          let bestZone: string | null = null;
          let bestScore = 0;

          zones.forEach((zEl) => {
            const zId = zEl.dataset.dropZone;
            if (!zId) return;
            if (!cbs.canDropOnZone(zId, params.payload)) return;

            const zr = zEl.getBoundingClientRect();
            // Expand drop zone slightly by 10px padding so near-misses feel effortless
            const overlapX = Math.max(0, Math.min(dragRight, zr.right + 10) - Math.max(dragLeft, zr.left - 10));
            const overlapY = Math.max(0, Math.min(dragBottom, zr.bottom + 14) - Math.max(dragTop, zr.top - 10));
            let score = overlapX * overlapY;

            // Bonus weight if the pointer itself is inside the drop zone
            if (
              ev.clientX >= zr.left - 8 &&
              ev.clientX <= zr.right + 8 &&
              ev.clientY >= zr.top - 8 &&
              ev.clientY <= zr.bottom + 12
            ) {
              score += 5000;
            }

            if (score > bestScore) {
              bestScore = score;
              bestZone = zId;
            }
          });

          if (bestZone && bestScore > 0) {
            cbs.onDropOnZone(bestZone, params.payload);
          }
          return;
        }

        if (cancelled) return;

        // Movement < 5px -> Crisp Tap / Click (with Double-Tap detection!)
        const now = performance.now();
        const key = cbs.getPayloadKey(params.payload);
        if (cbs.onDoubleTapCard && now - lastTapRef.current.time < 340 && lastTapRef.current.key === key) {
          lastTapRef.current = { time: 0, key: '' };
          cbs.onDoubleTapCard(params.payload);
        } else {
          lastTapRef.current = { time: now, key };
          cbs.onTapCard(params.payload);
        }
      };

      const handleUp = (ev: PointerEvent) => finish(ev, false);
      const handleCancel = (ev: PointerEvent) => finish(ev, true);

      window.addEventListener('pointermove', handleMove, { passive: true });
      window.addEventListener('pointerup', handleUp);
      window.addEventListener('pointercancel', handleCancel);
      cleanupRef.current = () => {
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', handleUp);
        window.removeEventListener('pointercancel', handleCancel);
      };
    },
    [boardRef]
  );

  return {
    activeDrag,
    overlayRef,
    startPointerInteraction,
  };
}

/* ============================================================================
   FLOATING HARDWARE-ACCELERATED DRAG OVERLAY
   ============================================================================ */
export const FloatingCardDragOverlay: React.FC<{
  activeDrag: DragSession<unknown> | null;
  overlayRef: React.RefObject<HTMLDivElement | null>;
  compactHeader?: boolean;
}> = ({ activeDrag, overlayRef, compactHeader = false }) => {
  if (!activeDrag) return null;

  return (
    <div
      ref={overlayRef as React.RefObject<HTMLDivElement>}
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        width: activeDrag.width,
        height: activeDrag.height + (activeDrag.cards.length - 1) * activeDrag.stackGap,
        transform: `translate3d(${activeDrag.initialX}px, ${activeDrag.initialY}px, 0)`,
        willChange: 'transform',
        pointerEvents: 'none',
        zIndex: 999999,
        filter: 'drop-shadow(0 10px 16px rgba(0, 0, 0, 0.5))',
      }}
    >
      {activeDrag.cards.map((card, i) => (
        <div
          key={card.id}
          style={{
            position: 'absolute',
            top: i * activeDrag.stackGap,
            left: 0,
            width: activeDrag.width,
            height: activeDrag.height,
          }}
        >
          <CardFaceView
            suit={card.suit}
            rank={card.rank}
            compactHeader={compactHeader}
          />
        </div>
      ))}
    </div>
  );
};

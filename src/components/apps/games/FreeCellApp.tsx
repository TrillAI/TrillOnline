import React, { useState, useEffect } from 'react';
import { useSound } from '../../../context/SoundContext';

type Suit = '♠' | '♥' | '♣' | '♦';
interface Card {
  id: string;
  suit: Suit;
  rank: number;
}

const SUITS: Suit[] = ['♠', '♥', '♣', '♦'];
const RANKS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const isRed = (s: Suit) => s === '♥' || s === '♦';

export const FreeCellApp: React.FC = () => {
  const { playSound } = useSound();
  const [gameNum, setGameNum] = useState(1941);
  const [freeCells, setFreeCells] = useState<Array<Card | null>>([null, null, null, null]);
  const [homeCells, setHomeCells] = useState<Card[][]>([[], [], [], []]);
  const [cols, setCols] = useState<Card[][]>(Array.from({ length: 8 }, () => []));
  const [selected, setSelected] = useState<{ zone: 'free' | 'col'; index: number } | null>(null);
  const [kingDir, setKingDir] = useState<'left' | 'right'>('left');
  const [won, setWon] = useState(false);

  const dealGame = (num?: number) => {
    const n = num ?? Math.floor(1 + Math.random() * 32000);
    setGameNum(n);
    const deck: Card[] = [];
    for (const s of SUITS) {
      for (let r = 1; r <= 13; r++) {
        deck.push({ id: `${r}${s}`, suit: s, rank: r });
      }
    }
    // Seeded shuffle based on game number
    let seed = n;
    for (let i = deck.length - 1; i > 0; i--) {
      seed = (seed * 214013 + 2531011) & 0x7fffffff;
      const j = seed % (i + 1);
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    const nextCols: Card[][] = Array.from({ length: 8 }, () => []);
    deck.forEach((c, idx) => nextCols[idx % 8].push(c));
    setCols(nextCols);
    setFreeCells([null, null, null, null]);
    setHomeCells([[], [], [], []]);
    setSelected(null);
    setWon(false);
  };

  useEffect(() => {
    dealGame(1941);
  }, []);

  const getSelectedCard = (): Card | null => {
    if (!selected) return null;
    if (selected.zone === 'free') return freeCells[selected.index];
    const col = cols[selected.index];
    return col[col.length - 1] || null;
  };

  const removeSelectedCard = () => {
    if (!selected) return;
    if (selected.zone === 'free') {
      setFreeCells((prev) => prev.map((c, i) => (i === selected.index ? null : c)));
    } else {
      setCols((prev) => prev.map((col, i) => (i === selected.index ? col.slice(0, -1) : col)));
    }
    setSelected(null);
  };

  const trySendHome = (card: Card, onRemove: () => void) => {
    for (let h = 0; h < 4; h++) {
      const pile = homeCells[h];
      const top = pile[pile.length - 1];
      if ((!top && card.rank === 1) || (top && top.suit === card.suit && card.rank === top.rank + 1)) {
        const nextHome = homeCells.map((p, idx) => (idx === h ? [...p, card] : p));
        onRemove();
        setHomeCells(nextHome);
        if (nextHome.every((p) => p.length === 13)) {
          setWon(true);
          playSound('gameWin');
        }
        return true;
      }
    }
    return false;
  };

  const cardsLeft = 52 - homeCells.reduce((acc, p) => acc + p.length, 0);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#008000', minHeight: 0 }}>
      <div className="xp-menubar">
        <span className="xp-menu-item" onClick={() => dealGame()}>
          New Game (F2)
        </span>
        <span
          className="xp-menu-item"
          onClick={() => {
            const val = prompt('Select FreeCell Game Number (1 - 32000):', String(gameNum));
            if (val && !isNaN(Number(val))) dealGame(Number(val));
          }}
        >
          Select Game #{gameNum}
        </span>
      </div>

      <div style={{ flex: 1, padding: '12px 16px', overflowY: 'auto' }}>
        {/* Top Row: 4 FreeCells | King Mascot | 4 HomeCells */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 18,
          }}
        >
          {/* 4 Free Cells */}
          <div style={{ display: 'flex', gap: 6 }}>
            {freeCells.map((card, i) => {
              const isSel = selected?.zone === 'free' && selected.index === i;
              return (
                <div
                  key={i}
                  onClick={() => {
                    setKingDir('left');
                    if (card) {
                      setSelected(isSel ? null : { zone: 'free', index: i });
                    } else if (selected) {
                      const moving = getSelectedCard();
                      if (moving) {
                        removeSelectedCard();
                        setFreeCells((prev) => prev.map((c, idx) => (idx === i ? moving : c)));
                      }
                    }
                  }}
                  onDoubleClick={() => {
                    if (card) {
                      trySendHome(card, () => setFreeCells((prev) => prev.map((c, idx) => (idx === i ? null : c))));
                    }
                  }}
                  className="xp-bevel-sunken"
                  style={{
                    width: 64,
                    height: 88,
                    background: card ? '#fff' : '#006800',
                    border: isSel ? '2px solid #facc15' : undefined,
                    borderRadius: 3,
                    padding: 4,
                    color: card && isRed(card.suit) ? '#dc2626' : '#111',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {card && (
                    <>
                      <div>
                        {RANKS[card.rank]}
                        {card.suit}
                      </div>
                      <div style={{ fontSize: 22, textAlign: 'center', marginTop: 10 }}>{card.suit}</div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Center King Box */}
          <div
            className="xp-bevel-sunken"
            style={{
              width: 44,
              height: 44,
              background: '#006800',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              transform: kingDir === 'right' ? 'scaleX(-1)' : 'none',
            }}
            title={`FreeCell Game #${gameNum}`}
          >
            🤴
          </div>

          {/* 4 Home Cells */}
          <div style={{ display: 'flex', gap: 6 }}>
            {homeCells.map((pile, i) => {
              const top = pile[pile.length - 1];
              return (
                <div
                  key={i}
                  onClick={() => {
                    setKingDir('right');
                    const moving = getSelectedCard();
                    if (moving) trySendHome(moving, removeSelectedCard);
                  }}
                  className="xp-bevel-sunken"
                  style={{
                    width: 64,
                    height: 88,
                    background: top ? '#fff' : '#006800',
                    borderRadius: 3,
                    padding: 4,
                    color: top && isRed(top.suit) ? '#dc2626' : '#111',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {top ? (
                    <>
                      <div>
                        {RANKS[top.rank]}
                        {top.suit}
                      </div>
                      <div style={{ fontSize: 22, textAlign: 'center', marginTop: 10 }}>{top.suit}</div>
                    </>
                  ) : (
                    <div style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: 24, fontSize: 20 }}>
                      {SUITS[i]}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {won && (
          <div
            style={{
              background: '#fef9c3',
              border: '2px solid #ca8a04',
              padding: 10,
              borderRadius: 6,
              textAlign: 'center',
              fontWeight: 800,
              marginBottom: 10,
            }}
          >
            🎉 Congratulations! You solved FreeCell Game #{gameNum}!
          </div>
        )}

        {/* 8 Cascades */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 8 }}>
          {cols.map((col, cIdx) => {
            const isColSel = selected?.zone === 'col' && selected.index === cIdx;
            return (
              <div
                key={cIdx}
                style={{ position: 'relative', minHeight: 280 }}
                onClick={() => {
                  setKingDir(cIdx < 4 ? 'left' : 'right');
                  if (!selected) {
                    if (col.length > 0) setSelected({ zone: 'col', index: cIdx });
                    return;
                  }
                  if (isColSel) {
                    setSelected(null);
                    return;
                  }
                  const moving = getSelectedCard();
                  if (!moving) return;
                  const destTop = col[col.length - 1];
                  if (
                    !destTop ||
                    (isRed(destTop.suit) !== isRed(moving.suit) && destTop.rank === moving.rank + 1)
                  ) {
                    removeSelectedCard();
                    setCols((prev) => prev.map((arr, idx) => (idx === cIdx ? [...arr, moving] : arr)));
                  } else if (col.length > 0) {
                    setSelected({ zone: 'col', index: cIdx });
                  }
                }}
              >
                {col.map((card, rIdx) => {
                  const isBottom = rIdx === col.length - 1;
                  return (
                    <div
                      key={card.id}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        if (isBottom) {
                          trySendHome(card, () =>
                            setCols((prev) => prev.map((arr, idx) => (idx === cIdx ? arr.slice(0, -1) : arr)))
                          );
                        }
                      }}
                      style={{
                        position: 'absolute',
                        top: rIdx * 22,
                        left: 0,
                        right: 0,
                        height: 88,
                        borderRadius: 4,
                        background: '#fff',
                        border: isBottom && isColSel ? '2px solid #facc15' : '1px solid #111',
                        padding: '3px 5px',
                        color: isRed(card.suit) ? '#dc2626' : '#111',
                        fontWeight: 700,
                        fontSize: 12,
                        cursor: 'pointer',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.35)',
                      }}
                    >
                      <div>
                        {RANKS[card.rank]}
                        {card.suit}
                      </div>
                      <div style={{ fontSize: 20, textAlign: 'center', marginTop: 12 }}>{card.suit}</div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <div
        style={{
          height: 22,
          background: '#ece9d8',
          borderTop: '1px solid #aca899',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 10px',
          fontSize: 11,
        }}
      >
        <span>Game #{gameNum} — Double-click bottom card to send to HomeCell</span>
        <span>Cards Left: <b>{cardsLeft}</b></span>
      </div>
    </div>
  );
};

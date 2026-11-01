import React, { useState, useEffect, useRef } from 'react';
import { useSound } from '../../../context/SoundContext';

type Suit = '♠' | '♥' | '♣' | '♦';
interface Card {
  id: string;
  suit: Suit;
  rank: number; // 1 (A) .. 13 (K)
  faceUp: boolean;
}

const SUITS: Suit[] = ['♠', '♥', '♣', '♦'];
const RANK_LABELS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const isRed = (s: Suit) => s === '♥' || s === '♦';

function makeDeck(): Card[] {
  const deck: Card[] = [];
  for (const s of SUITS) {
    for (let r = 1; r <= 13; r++) {
      deck.push({ id: `${r}${s}-${Math.random().toString(36).slice(2, 5)}`, suit: s, rank: r, faceUp: false });
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export const SolitaireApp: React.FC = () => {
  const { playSound } = useSound();
  const [stock, setStock] = useState<Card[]>([]);
  const [waste, setWaste] = useState<Card[]>([]);
  const [foundations, setFoundations] = useState<Card[][]>([[], [], [], []]);
  const [tableau, setTableau] = useState<Card[][]>([[], [], [], [], [], [], []]);
  const [selected, setSelected] = useState<{ src: 'waste' | 'tab'; col?: number; idx?: number } | null>(null);
  const [score, setScore] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [cardBack, setCardBack] = useState<'castle' | 'beach' | 'robot'>('castle');
  const [won, setWon] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const dealNewGame = () => {
    const d = makeDeck();
    const cols: Card[][] = [[], [], [], [], [], [], []];
    let p = 0;
    for (let c = 0; c < 7; c++) {
      for (let r = 0; r <= c; r++) {
        const card = { ...d[p++], faceUp: r === c };
        cols[c].push(card);
      }
    }
    setTableau(cols);
    setStock(d.slice(p));
    setWaste([]);
    setFoundations([[], [], [], []]);
    setSelected(null);
    setScore(0);
    setSeconds(0);
    setWon(false);
  };

  useEffect(() => {
    dealNewGame();
  }, []);

  useEffect(() => {
    if (won) return;
    const iv = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(iv);
  }, [won]);

  // Iconic Windows XP Bouncing Cards Win Animation!
  useEffect(() => {
    if (!won || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = canvas.parentElement?.clientWidth || 640;
    canvas.height = canvas.parentElement?.clientHeight || 440;
    ctx.fillStyle = '#008000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let x = 80;
    let y = 40;
    let vx = 5;
    let vy = 0;
    let rankIdx = 13;
    let raf = 0;

    const step = () => {
      vy += 0.65;
      x += vx;
      y += vy;
      if (y + 92 > canvas.height) {
        y = canvas.height - 92;
        vy = -vy * 0.82;
      }
      if (x > canvas.width || x < -70) {
        x = 60 + Math.random() * 260;
        y = 20;
        vx = (Math.random() > 0.5 ? 1 : -1) * (3 + Math.random() * 4);
        vy = 0;
        rankIdx = rankIdx > 1 ? rankIdx - 1 : 13;
      }
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#000';
      ctx.fillRect(x, y, 66, 92);
      ctx.strokeRect(x, y, 66, 92);
      ctx.fillStyle = rankIdx % 2 === 0 ? '#cc0000' : '#000';
      ctx.font = 'bold 15px Tahoma';
      ctx.fillText(`${RANK_LABELS[rankIdx]}♠`, x + 6, y + 18);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [won]);

  const checkVictory = (nextFound: Card[][]) => {
    if (nextFound.every((f) => f.length === 13)) {
      setWon(true);
      playSound('gameWin');
    }
  };

  const drawFromStock = () => {
    setSelected(null);
    if (stock.length === 0) {
      if (waste.length === 0) return;
      setStock([...waste].reverse().map((c) => ({ ...c, faceUp: false })));
      setWaste([]);
      return;
    }
    const next = { ...stock[stock.length - 1], faceUp: true };
    setStock((s) => s.slice(0, -1));
    setWaste((w) => [...w, next]);
  };

  const trySendToFoundation = (card: Card, onRemove: () => void) => {
    for (let f = 0; f < 4; f++) {
      const pile = foundations[f];
      const top = pile[pile.length - 1];
      if ((!top && card.rank === 1) || (top && top.suit === card.suit && card.rank === top.rank + 1)) {
        const nextFound = foundations.map((p, idx) => (idx === f ? [...p, card] : p));
        onRemove();
        setFoundations(nextFound);
        setScore((s) => s + 10);
        setSelected(null);
        checkVictory(nextFound);
        return true;
      }
    }
    return false;
  };

  const handleTableauClick = (col: number, idx: number) => {
    const colCards = tableau[col];
    const clicked = colCards[idx];
    if (!clicked.faceUp) {
      if (idx === colCards.length - 1) {
        const nextTab = tableau.map((c, ci) =>
          ci === col ? c.map((card, ri) => (ri === idx ? { ...card, faceUp: true } : card)) : c
        );
        setTableau(nextTab);
        setScore((s) => s + 5);
      }
      return;
    }

    if (!selected) {
      setSelected({ src: 'tab', col, idx });
      return;
    }

    if (selected.src === 'tab' && selected.col === col && selected.idx === idx) {
      setSelected(null);
      return;
    }

    // Attempt move onto col's bottom card
    const movingCards =
      selected.src === 'waste'
        ? [waste[waste.length - 1]]
        : tableau[selected.col!].slice(selected.idx!);
    if (!movingCards[0]) {
      setSelected(null);
      return;
    }

    const targetBottom = colCards[colCards.length - 1];
    const canDrop =
      (!targetBottom && movingCards[0].rank === 13) ||
      (targetBottom &&
        targetBottom.faceUp &&
        isRed(targetBottom.suit) !== isRed(movingCards[0].suit) &&
        targetBottom.rank === movingCards[0].rank + 1);

    if (canDrop) {
      if (selected.src === 'waste') {
        setWaste((w) => w.slice(0, -1));
        setTableau((prev) => prev.map((c, ci) => (ci === col ? [...c, ...movingCards] : c)));
      } else {
        setTableau((prev) =>
          prev.map((c, ci) => {
            if (ci === selected.col) {
              const sliced = c.slice(0, selected.idx);
              if (sliced.length > 0 && !sliced[sliced.length - 1].faceUp) {
                sliced[sliced.length - 1] = { ...sliced[sliced.length - 1], faceUp: true };
              }
              return sliced;
            }
            if (ci === col) return [...c, ...movingCards];
            return c;
          })
        );
      }
      setScore((s) => s + 5);
      setSelected(null);
    } else {
      setSelected({ src: 'tab', col, idx });
    }
  };

  const handleEmptyColClick = (col: number) => {
    if (!selected) return;
    const movingCards =
      selected.src === 'waste'
        ? [waste[waste.length - 1]]
        : tableau[selected.col!].slice(selected.idx!);
    if (!movingCards[0] || movingCards[0].rank !== 13) return;
    if (selected.src === 'waste') {
      setWaste((w) => w.slice(0, -1));
      setTableau((prev) => prev.map((c, ci) => (ci === col ? [...movingCards] : c)));
    } else {
      setTableau((prev) =>
        prev.map((c, ci) => {
          if (ci === selected.col) {
            const sliced = c.slice(0, selected.idx);
            if (sliced.length > 0) sliced[sliced.length - 1] = { ...sliced[sliced.length - 1], faceUp: true };
            return sliced;
          }
          if (ci === col) return [...movingCards];
          return c;
        })
      );
    }
    setSelected(null);
  };

  const backBg =
    cardBack === 'castle'
      ? 'repeating-linear-gradient(45deg, #1d4ed8, #1d4ed8 5px, #3b82f6 5px, #3b82f6 10px)'
      : cardBack === 'beach'
      ? 'linear-gradient(180deg, #38bdf8 0%, #fde047 70%, #f59e0b 100%)'
      : 'repeating-linear-gradient(90deg, #334155, #334155 4px, #64748b 4px, #64748b 8px)';

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#008000', minHeight: 0 }}>
      <div className="xp-menubar">
        <span className="xp-menu-item" onClick={dealNewGame}>
          Deal (F2)
        </span>
        <span
          className="xp-menu-item"
          onClick={() => setCardBack((b) => (b === 'castle' ? 'beach' : b === 'beach' ? 'robot' : 'castle'))}
        >
          Deck Back ({cardBack})
        </span>
        <span
          className="xp-menu-item"
          onClick={() => {
            setFoundations(
              SUITS.map((s) =>
                Array.from({ length: 13 }, (_, i) => ({
                  id: `w-${s}-${i}`,
                  suit: s,
                  rank: i + 1,
                  faceUp: true,
                }))
              )
            );
            setWon(true);
            playSound('gameWin');
          }}
        >
          Demo Win Cascade!
        </span>
      </div>

      {/* Felt Playfield */}
      <div style={{ flex: 1, position: 'relative', padding: '14px 18px', overflowY: 'auto' }}>
        {won && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 20 }}>
            <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
            <button
              className="xp-btn xp-btn-primary"
              onClick={dealNewGame}
              style={{ position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)' }}
            >
              🎉 You Won! Deal Again
            </button>
          </div>
        )}

        {/* Top Row: Stock + Waste + 4 Foundations */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 74px)', gap: 12, marginBottom: 20 }}>
          {/* Stock */}
          <div
            onClick={drawFromStock}
            style={{
              width: 72,
              height: 98,
              borderRadius: 5,
              border: '2px solid rgba(255,255,255,0.45)',
              background: stock.length > 0 ? backBg : 'rgba(0,0,0,0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#fff',
              fontSize: 22,
              boxShadow: stock.length > 0 ? '1px 2px 4px rgba(0,0,0,0.4)' : 'none',
            }}
          >
            {stock.length === 0 ? '↺' : ''}
          </div>

          {/* Waste */}
          <div style={{ width: 72, height: 98 }}>
            {waste.length > 0 && (
              <div
                onClick={() => setSelected(selected?.src === 'waste' ? null : { src: 'waste' })}
                onDoubleClick={() => {
                  const top = waste[waste.length - 1];
                  if (top) trySendToFoundation(top, () => setWaste((w) => w.slice(0, -1)));
                }}
                style={{
                  width: 72,
                  height: 98,
                  borderRadius: 5,
                  background: '#fff',
                  border: selected?.src === 'waste' ? '2px solid #facc15' : '1px solid #111',
                  padding: 5,
                  color: isRed(waste[waste.length - 1].suit) ? '#dc2626' : '#111',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '1px 2px 4px rgba(0,0,0,0.4)',
                }}
              >
                <div>
                  {RANK_LABELS[waste[waste.length - 1].rank]}
                  {waste[waste.length - 1].suit}
                </div>
                <div style={{ fontSize: 26, textAlign: 'center', marginTop: 12 }}>
                  {waste[waste.length - 1].suit}
                </div>
              </div>
            )}
          </div>

          <div />

          {/* 4 Foundations */}
          {foundations.map((pile, fIdx) => {
            const top = pile[pile.length - 1];
            return (
              <div
                key={fIdx}
                onClick={() => {
                  if (!selected) return;
                  if (selected.src === 'waste') {
                    const c = waste[waste.length - 1];
                    if (c) trySendToFoundation(c, () => setWaste((w) => w.slice(0, -1)));
                  } else if (selected.src === 'tab') {
                    const col = tableau[selected.col!];
                    if (selected.idx === col.length - 1) {
                      const c = col[col.length - 1];
                      trySendToFoundation(c, () => {
                        setTableau((prev) =>
                          prev.map((arr, ci) => {
                            if (ci !== selected.col) return arr;
                            const next = arr.slice(0, -1);
                            if (next.length > 0) next[next.length - 1] = { ...next[next.length - 1], faceUp: true };
                            return next;
                          })
                        );
                      });
                    }
                  }
                }}
                style={{
                  width: 72,
                  height: 98,
                  borderRadius: 5,
                  border: '2px dashed rgba(255,255,255,0.45)',
                  background: top ? '#fff' : 'rgba(0,0,0,0.16)',
                  padding: 5,
                  cursor: 'pointer',
                  color: top && isRed(top.suit) ? '#dc2626' : '#111',
                  fontWeight: 700,
                }}
              >
                {top ? (
                  <>
                    <div>
                      {RANK_LABELS[top.rank]}
                      {top.suit}
                    </div>
                    <div style={{ fontSize: 26, textAlign: 'center', marginTop: 12 }}>{top.suit}</div>
                  </>
                ) : (
                  <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 24, textAlign: 'center', marginTop: 26 }}>
                    {SUITS[fIdx]}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 7 Tableau Columns */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 74px)', gap: 12 }}>
          {tableau.map((col, cIdx) => (
            <div key={cIdx} style={{ position: 'relative', minHeight: 240 }}>
              {col.length === 0 ? (
                <div
                  onClick={() => handleEmptyColClick(cIdx)}
                  style={{
                    width: 72,
                    height: 98,
                    borderRadius: 5,
                    border: '1px solid rgba(255,255,255,0.28)',
                    background: 'rgba(0,0,0,0.12)',
                  }}
                />
              ) : (
                col.map((card, rIdx) => {
                  const isSel = selected?.src === 'tab' && selected.col === cIdx && rIdx >= (selected.idx ?? 99);
                  return (
                    <div
                      key={card.id}
                      onClick={() => handleTableauClick(cIdx, rIdx)}
                      onDoubleClick={() => {
                        if (card.faceUp && rIdx === col.length - 1) {
                          trySendToFoundation(card, () => {
                            setTableau((prev) =>
                              prev.map((arr, ci) => {
                                if (ci !== cIdx) return arr;
                                const next = arr.slice(0, -1);
                                if (next.length > 0) next[next.length - 1] = { ...next[next.length - 1], faceUp: true };
                                return next;
                              })
                            );
                          });
                        }
                      }}
                      style={{
                        position: 'absolute',
                        top: rIdx * 21,
                        left: 0,
                        width: 72,
                        height: 98,
                        borderRadius: 5,
                        background: card.faceUp ? '#fff' : backBg,
                        border: isSel ? '2px solid #facc15' : '1px solid #111',
                        padding: '3px 5px',
                        color: isRed(card.suit) ? '#dc2626' : '#111',
                        fontWeight: 700,
                        fontSize: 12,
                        cursor: 'pointer',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.38)',
                      }}
                    >
                      {card.faceUp && (
                        <>
                          <div>
                            {RANK_LABELS[card.rank]}
                            {card.suit}
                          </div>
                          <div style={{ fontSize: 22, textAlign: 'center', marginTop: 14 }}>{card.suit}</div>
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Status Bar */}
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
        <span>Double-click any card to send to Foundation</span>
        <span>
          Score: <b>{score}</b> &nbsp;&nbsp; Time: <b>{seconds}s</b>
        </span>
      </div>
    </div>
  );
};

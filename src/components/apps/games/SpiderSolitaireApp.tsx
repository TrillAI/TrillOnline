import React, { useState, useEffect } from 'react';
import { useSound } from '../../../context/SoundContext';

type Suit = '♠' | '♥' | '♣' | '♦';
interface SpiderCard {
  id: string;
  suit: Suit;
  rank: number;
  faceUp: boolean;
}

const RANKS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const isRed = (s: Suit) => s === '♥' || s === '♦';

function buildSpiderDeck(suitsCount: 1 | 2 | 4): SpiderCard[] {
  const pool: Suit[] =
    suitsCount === 1
      ? ['♠', '♠', '♠', '♠', '♠', '♠', '♠', '♠']
      : suitsCount === 2
      ? ['♠', '♠', '♠', '♠', '♥', '♥', '♥', '♥']
      : ['♠', '♠', '♥', '♥', '♣', '♣', '♦', '♦'];
  const cards: SpiderCard[] = [];
  pool.forEach((s, dIdx) => {
    for (let r = 1; r <= 13; r++) {
      cards.push({ id: `sp-${dIdx}-${r}-${Math.random().toString(36).slice(2, 5)}`, suit: s, rank: r, faceUp: false });
    }
  });
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

export const SpiderSolitaireApp: React.FC = () => {
  const { playSound } = useSound();
  const [suitsCount, setSuitsCount] = useState<1 | 2 | 4>(1);
  const [cols, setCols] = useState<SpiderCard[][]>(Array.from({ length: 10 }, () => []));
  const [stockDeals, setStockDeals] = useState<SpiderCard[][]>([]);
  const [completedRuns, setCompletedRuns] = useState(0);
  const [score, setScore] = useState(500);
  const [moves, setMoves] = useState(0);
  const [selected, setSelected] = useState<{ col: number; idx: number } | null>(null);

  const startNewGame = (sCount: 1 | 2 | 4 = suitsCount) => {
    setSuitsCount(sCount);
    const deck = buildSpiderDeck(sCount);
    const nextCols: SpiderCard[][] = Array.from({ length: 10 }, () => []);
    let ptr = 0;
    for (let c = 0; c < 10; c++) {
      const len = c < 4 ? 6 : 5;
      for (let i = 0; i < len; i++) {
        nextCols[c].push({ ...deck[ptr++], faceUp: i === len - 1 });
      }
    }
    const deals: SpiderCard[][] = [];
    for (let d = 0; d < 5; d++) {
      deals.push(deck.slice(ptr, ptr + 10).map((c) => ({ ...c, faceUp: true })));
      ptr += 10;
    }
    setCols(nextCols);
    setStockDeals(deals);
    setCompletedRuns(0);
    setScore(500);
    setMoves(0);
    setSelected(null);
  };

  useEffect(() => {
    startNewGame(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canSelectRun = (colCards: SpiderCard[], startIdx: number) => {
    if (!colCards[startIdx]?.faceUp) return false;
    for (let i = startIdx; i < colCards.length - 1; i++) {
      if (colCards[i].suit !== colCards[i + 1].suit || colCards[i].rank !== colCards[i + 1].rank + 1) {
        return false;
      }
    }
    return true;
  };

  const pruneCompleteSequence = (nextCols: SpiderCard[][]) => {
    let addedRuns = 0;
    const cleaned = nextCols.map((col) => {
      if (col.length < 13) return col;
      const tail = col.slice(col.length - 13);
      const isComplete =
        tail[0].rank === 13 &&
        tail.every((c, i) => c.faceUp && c.suit === tail[0].suit && c.rank === 13 - i);
      if (!isComplete) return col;
      addedRuns++;
      const rem = col.slice(0, col.length - 13);
      if (rem.length > 0 && !rem[rem.length - 1].faceUp) {
        rem[rem.length - 1] = { ...rem[rem.length - 1], faceUp: true };
      }
      return rem;
    });

    if (addedRuns > 0) {
      playSound('notify');
      setCompletedRuns((r) => {
        const total = r + addedRuns;
        if (total >= 8) playSound('gameWin');
        return total;
      });
      setScore((s) => s + addedRuns * 100);
    }
    return cleaned;
  };

  const handleCardClick = (colIdx: number, cardIdx: number) => {
    if (!selected) {
      if (canSelectRun(cols[colIdx], cardIdx)) {
        setSelected({ col: colIdx, idx: cardIdx });
      }
      return;
    }

    if (selected.col === colIdx) {
      setSelected(null);
      return;
    }

    const moving = cols[selected.col].slice(selected.idx);
    const destCol = cols[colIdx];
    const destTop = destCol[destCol.length - 1];

    if (!destTop || destTop.rank === moving[0].rank + 1) {
      const updated = cols.map((c, ci) => {
        if (ci === selected.col) {
          const left = c.slice(0, selected.idx);
          if (left.length > 0 && !left[left.length - 1].faceUp) {
            left[left.length - 1] = { ...left[left.length - 1], faceUp: true };
          }
          return left;
        }
        if (ci === colIdx) return [...c, ...moving];
        return c;
      });
      setCols(pruneCompleteSequence(updated));
      setScore((s) => Math.max(0, s - 1));
      setMoves((m) => m + 1);
      setSelected(null);
    } else if (canSelectRun(cols[colIdx], cardIdx)) {
      setSelected({ col: colIdx, idx: cardIdx });
    } else {
      setSelected(null);
    }
  };

  const dealStockRow = () => {
    if (stockDeals.length === 0) return;
    if (cols.some((c) => c.length === 0)) {
      playSound('error');
      alert('Every column must have at least one card before dealing a new row!');
      return;
    }
    const row = stockDeals[0];
    const nextCols = cols.map((c, idx) => [...c, row[idx]]);
    setStockDeals((d) => d.slice(1));
    setCols(pruneCompleteSequence(nextCols));
    setSelected(null);
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0b6623', minHeight: 0 }}>
      <div className="xp-menubar">
        <span className="xp-menu-item" onClick={() => startNewGame(suitsCount)}>
          New Game (F2)
        </span>
        <span className="xp-menu-item" onClick={() => startNewGame(1)}>
          {suitsCount === 1 ? '✓ ' : ''}Easy (1 Suit)
        </span>
        <span className="xp-menu-item" onClick={() => startNewGame(2)}>
          {suitsCount === 2 ? '✓ ' : ''}Medium (2 Suits)
        </span>
        <span className="xp-menu-item" onClick={() => startNewGame(4)}>
          {suitsCount === 4 ? '✓ ' : ''}Difficult (4 Suits)
        </span>
      </div>

      {/* 10 Tableau Columns */}
      <div style={{ flex: 1, padding: '12px 14px', overflowY: 'auto', position: 'relative' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 6 }}>
          {cols.map((col, cIdx) => (
            <div key={cIdx} style={{ position: 'relative', minHeight: 330 }}>
              {col.length === 0 ? (
                <div
                  onClick={() => handleCardClick(cIdx, 0)}
                  style={{
                    height: 86,
                    borderRadius: 4,
                    border: '1px solid rgba(255,255,255,0.3)',
                    background: 'rgba(0,0,0,0.14)',
                    cursor: 'pointer',
                  }}
                />
              ) : (
                col.map((card, rIdx) => {
                  const isSel = selected?.col === cIdx && rIdx >= selected.idx;
                  return (
                    <div
                      key={card.id}
                      onClick={() => handleCardClick(cIdx, rIdx)}
                      style={{
                        position: 'absolute',
                        top: rIdx * 19,
                        left: 0,
                        right: 0,
                        height: 86,
                        borderRadius: 4,
                        background: card.faceUp
                          ? '#fff'
                          : 'repeating-linear-gradient(45deg, #1e3a8a, #1e3a8a 4px, #3b82f6 4px, #3b82f6 8px)',
                        border: isSel ? '2px solid #facc15' : '1px solid #111',
                        padding: '2px 4px',
                        color: isRed(card.suit) ? '#dc2626' : '#111',
                        fontWeight: 700,
                        fontSize: 11,
                        cursor: 'pointer',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.35)',
                      }}
                    >
                      {card.faceUp && (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>{RANKS[card.rank]}</span>
                            <span>{card.suit}</span>
                          </div>
                          <div style={{ fontSize: 20, textAlign: 'center', marginTop: 12 }}>{card.suit}</div>
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

      {/* Bottom Score Plaque & Stock Deals (Authentic XP Spider Bottom Bar!) */}
      <div
        style={{
          height: 54,
          background: '#074d19',
          borderTop: '1px solid rgba(255,255,255,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          color: '#fff',
          fontSize: 12,
        }}
      >
        <div style={{ display: 'flex', gap: 6 }}>
          {Array.from({ length: completedRuns }).map((_, i) => (
            <div
              key={i}
              style={{
                width: 28,
                height: 38,
                background: '#fff',
                color: '#000',
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
              }}
            >
              K♠
            </div>
          ))}
        </div>

        <div
          style={{
            background: '#053812',
            border: '1px solid #2e8b57',
            padding: '4px 18px',
            textAlign: 'center',
          }}
        >
          <div>
            Score: <b>{score}</b> &nbsp;|&nbsp; Moves: <b>{moves}</b>
          </div>
          {completedRuns >= 8 && <div style={{ color: '#fde047', fontWeight: 800 }}>🎉 YOU WON SPIDER SOLITAIRE!</div>}
        </div>

        <button
          onClick={dealStockRow}
          disabled={stockDeals.length === 0}
          className="xp-btn"
          title="Deal next row of 10 cards"
        >
          🃏 Deal Row ({stockDeals.length} left)
        </button>
      </div>
    </div>
  );
};

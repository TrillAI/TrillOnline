import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSound } from '../../../context/SoundContext';
import {
  PlayingCardData,
  SUITS,
  isRedSuit,
  CardFaceView,
  SuitGlyph,
  useCardDrag,
  FloatingCardDragOverlay,
} from './PlayingCard';

interface FreeCellPayload {
  zone: 'free' | 'col';
  colIdx: number;
  cardIdx: number;
}

interface FreeCellSnapshot {
  freeCells: Array<PlayingCardData | null>;
  homeCells: PlayingCardData[][];
  cols: PlayingCardData[][];
}

const CARD_W = 64;
const CARD_H = 88;
const STACK_GAP = 21;

export const FreeCellApp: React.FC = () => {
  const { playSound } = useSound();
  const boardRef = useRef<HTMLDivElement | null>(null);

  const [gameNum, setGameNum] = useState(1941);
  const [freeCells, setFreeCells] = useState<Array<PlayingCardData | null>>([null, null, null, null]);
  const [homeCells, setHomeCells] = useState<PlayingCardData[][]>([[], [], [], []]);
  const [cols, setCols] = useState<PlayingCardData[][]>(Array.from({ length: 8 }, () => []));
  const [selected, setSelected] = useState<FreeCellPayload | null>(null);
  const [kingDir, setKingDir] = useState<'left' | 'right'>('left');
  const [history, setHistory] = useState<FreeCellSnapshot[]>([]);
  const [won, setWon] = useState(false);
  const [openMenu, setOpenMenu] = useState<'game' | null>(null);

  const dealGame = useCallback((num?: number) => {
    const n = num ?? Math.floor(1 + Math.random() * 32000);
    setGameNum(n);
    const deck: PlayingCardData[] = [];
    for (let r = 1; r <= 13; r++) {
      for (const s of ['♣', '♦', '♥', '♠'] as const) {
        deck.push({ id: `${r}${s}`, suit: s, rank: r, faceUp: true });
      }
    }
    let seed = n;
    const nextCols: PlayingCardData[][] = Array.from({ length: 8 }, () => []);
    let colPtr = 0;
    while (deck.length > 0) {
      seed = (seed * 214013 + 2531011) & 0x7fffffff;
      const idx = (seed >> 16) % deck.length;
      const [picked] = deck.splice(idx, 1);
      nextCols[colPtr % 8].push(picked);
      colPtr++;
    }
    setCols(nextCols);
    setFreeCells([null, null, null, null]);
    setHomeCells([[], [], [], []]);
    setSelected(null);
    setHistory([]);
    setWon(false);
    setOpenMenu(null);
  }, []);

  useEffect(() => {
    dealGame(1941);
  }, [dealGame]);

  const pushHistory = useCallback(() => {
    setHistory((prev) => [
      ...prev.slice(-30),
      {
        freeCells: freeCells.map((c) => (c ? { ...c } : null)),
        homeCells: homeCells.map((p) => p.map((c) => ({ ...c }))),
        cols: cols.map((c) => c.map((x) => ({ ...x }))),
      },
    ]);
  }, [freeCells, homeCells, cols]);

  const handleUndo = useCallback(() => {
    if (history.length === 0 || won) return;
    const snap = history[history.length - 1];
    setFreeCells(snap.freeCells);
    setHomeCells(snap.homeCells);
    setCols(snap.cols);
    setHistory((h) => h.slice(0, -1));
    setSelected(null);
    playSound('cardFlip');
  }, [history, won, playSound]);

  // Valid alternating-color descending run in cascade
  const isValidCascadeTail = useCallback((col: PlayingCardData[], startIdx: number): boolean => {
    if (startIdx < 0 || startIdx >= col.length) return false;
    for (let i = startIdx; i < col.length - 1; i++) {
      if (
        isRedSuit(col[i].suit) === isRedSuit(col[i + 1].suit) ||
        col[i].rank !== col[i + 1].rank + 1
      ) {
        return false;
      }
    }
    return true;
  }, []);

  // Supermove capacity: (1 + emptyFreeCells) * 2^(emptyCols excluding dest if empty)
  const maxSupermoveSize = useCallback(
    (destColIsEmpty: boolean): number => {
      const emptyFree = freeCells.filter((c) => c === null).length;
      const emptyCols = Math.max(0, cols.filter((c) => c.length === 0).length - (destColIsEmpty ? 1 : 0));
      return (1 + emptyFree) * Math.pow(2, emptyCols);
    },
    [freeCells, cols]
  );

  const getMovingCards = useCallback(
    (src: FreeCellPayload): PlayingCardData[] => {
      if (src.zone === 'free') {
        const c = freeCells[src.colIdx];
        return c ? [c] : [];
      }
      const col = cols[src.colIdx];
      if (!col || !isValidCascadeTail(col, src.cardIdx)) return [];
      return col.slice(src.cardIdx);
    },
    [freeCells, cols, isValidCascadeTail]
  );

  const canDropFreeCell = useCallback(
    (fIdx: number, src: FreeCellPayload): boolean => {
      if (freeCells[fIdx] !== null) return false;
      return getMovingCards(src).length === 1;
    },
    [freeCells, getMovingCards]
  );

  const canDropHomeCell = useCallback(
    (hIdx: number, src: FreeCellPayload): boolean => {
      const moving = getMovingCards(src);
      if (moving.length !== 1) return false;
      const card = moving[0];
      const pile = homeCells[hIdx];
      const top = pile[pile.length - 1];
      if (!top) return card.rank === 1;
      return top.suit === card.suit && card.rank === top.rank + 1;
    },
    [homeCells, getMovingCards]
  );

  const canDropColumn = useCallback(
    (destColIdx: number, src: FreeCellPayload): boolean => {
      if (src.zone === 'col' && src.colIdx === destColIdx) return false;
      const moving = getMovingCards(src);
      if (moving.length === 0) return false;
      const destCol = cols[destColIdx];
      if (moving.length > maxSupermoveSize(destCol.length === 0)) return false;
      const destTop = destCol[destCol.length - 1];
      if (!destTop) return true;
      return isRedSuit(destTop.suit) !== isRedSuit(moving[0].suit) && destTop.rank === moving[0].rank + 1;
    },
    [cols, getMovingCards, maxSupermoveSize]
  );

  const removeSource = (src: FreeCellPayload) => {
    if (src.zone === 'free') {
      setFreeCells((prev) => prev.map((c, idx) => (idx === src.colIdx ? null : c)));
    } else {
      setCols((prev) => prev.map((col, idx) => (idx === src.colIdx ? col.slice(0, src.cardIdx) : col)));
    }
  };

  const executeDropFreeCell = useCallback(
    (fIdx: number, src: FreeCellPayload): boolean => {
      if (!canDropFreeCell(fIdx, src)) return false;
      const [card] = getMovingCards(src);
      pushHistory();
      removeSource(src);
      setFreeCells((prev) => prev.map((c, idx) => (idx === fIdx ? card : c)));
      setSelected(null);
      setKingDir('left');
      playSound('cardPlace');
      return true;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canDropFreeCell, getMovingCards, pushHistory, playSound]
  );

  const executeDropHomeCell = useCallback(
    (hIdx: number, src: FreeCellPayload): boolean => {
      if (!canDropHomeCell(hIdx, src)) return false;
      const [card] = getMovingCards(src);
      pushHistory();
      removeSource(src);
      const nextHome = homeCells.map((p, idx) => (idx === hIdx ? [...p, card] : p));
      setHomeCells(nextHome);
      setSelected(null);
      setKingDir('right');
      playSound('cardPlace');
      if (nextHome.every((p) => p.length === 13)) {
        setWon(true);
        playSound('gameWin');
      }
      return true;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canDropHomeCell, getMovingCards, pushHistory, homeCells, playSound]
  );

  const executeDropColumn = useCallback(
    (destColIdx: number, src: FreeCellPayload): boolean => {
      if (!canDropColumn(destColIdx, src)) return false;
      const moving = getMovingCards(src);
      pushHistory();
      if (src.zone === 'free') {
        setFreeCells((prev) => prev.map((c, idx) => (idx === src.colIdx ? null : c)));
        setCols((prev) => prev.map((col, idx) => (idx === destColIdx ? [...col, ...moving] : col)));
      } else {
        setCols((prev) =>
          prev.map((col, idx) => {
            if (idx === src.colIdx) return col.slice(0, src.cardIdx);
            if (idx === destColIdx) return [...col, ...moving];
            return col;
          })
        );
      }
      setSelected(null);
      setKingDir(destColIdx < 4 ? 'left' : 'right');
      playSound('cardPlace');
      return true;
    },
    [canDropColumn, getMovingCards, pushHistory, playSound]
  );

  const canDropOnZone = useCallback(
    (zoneId: string, src: FreeCellPayload): boolean => {
      if (zoneId.startsWith('free-')) return canDropFreeCell(Number(zoneId.slice(5)), src);
      if (zoneId.startsWith('home-')) return canDropHomeCell(Number(zoneId.slice(5)), src);
      if (zoneId.startsWith('col-')) return canDropColumn(Number(zoneId.slice(4)), src);
      return false;
    },
    [canDropFreeCell, canDropHomeCell, canDropColumn]
  );

  const onDropOnZone = useCallback(
    (zoneId: string, src: FreeCellPayload) => {
      if (zoneId.startsWith('free-')) executeDropFreeCell(Number(zoneId.slice(5)), src);
      else if (zoneId.startsWith('home-')) executeDropHomeCell(Number(zoneId.slice(5)), src);
      else if (zoneId.startsWith('col-')) executeDropColumn(Number(zoneId.slice(4)), src);
    },
    [executeDropFreeCell, executeDropHomeCell, executeDropColumn]
  );

  const onTapCard = useCallback(
    (payload: FreeCellPayload) => {
      setOpenMenu(null);
      if (!selected) {
        if (getMovingCards(payload).length > 0) setSelected(payload);
        return;
      }
      if (
        selected.zone === payload.zone &&
        selected.colIdx === payload.colIdx &&
        selected.cardIdx === payload.cardIdx
      ) {
        setSelected(null);
        return;
      }
      if (payload.zone === 'col' && executeDropColumn(payload.colIdx, selected)) return;
      if (getMovingCards(payload).length > 0) setSelected(payload);
      else setSelected(null);
    },
    [selected, getMovingCards, executeDropColumn]
  );

  const onDoubleTapCard = useCallback(
    (payload: FreeCellPayload) => {
      for (let h = 0; h < 4; h++) {
        if (executeDropHomeCell(h, payload)) return;
      }
      for (let f = 0; f < 4; f++) {
        if (executeDropFreeCell(f, payload)) return;
      }
    },
    [executeDropHomeCell, executeDropFreeCell]
  );

  const { activeDrag, overlayRef, startPointerInteraction } = useCardDrag<FreeCellPayload>({
    boardRef,
    canDropOnZone,
    onDropOnZone,
    onTapCard,
    onDoubleTapCard,
    getPayloadKey: (p) => `${p.zone}-${p.colIdx}-${p.cardIdx}`,
  });

  const cardsLeft = 52 - homeCells.reduce((acc, p) => acc + p.length, 0);

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: '#008000',
        minHeight: 0,
        position: 'relative',
        userSelect: 'none',
      }}
      onClick={() => setOpenMenu(null)}
    >
      <div className="xp-menubar" onClick={(e) => e.stopPropagation()}>
        <div style={{ position: 'relative' }}>
          <span
            className="xp-menu-item"
            onClick={() => setOpenMenu(openMenu === 'game' ? null : 'game')}
          >
            Game
          </span>
          {openMenu === 'game' && (
            <div className="xp-dropdown-menu" style={{ left: 0, top: '100%', minWidth: 190 }}>
              <div className="xp-dropdown-item" onClick={() => dealGame()}>
                <span>New Game</span>
                <span style={{ marginLeft: 'auto', color: '#666' }}>F2</span>
              </div>
              <div
                className="xp-dropdown-item"
                onClick={() => {
                  setOpenMenu(null);
                  const val = prompt('Select FreeCell Game Number (1 - 32000):', String(gameNum));
                  if (val && !isNaN(Number(val))) dealGame(Math.max(1, Math.min(32000, Number(val))));
                }}
              >
                <span>Select Game...</span>
                <span style={{ marginLeft: 'auto', color: '#666' }}>F3</span>
              </div>
              <div className="xp-dropdown-item" onClick={() => dealGame(gameNum)}>
                <span>Restart Game</span>
              </div>
              <div className="xp-dropdown-sep" />
              <div
                className="xp-dropdown-item"
                style={{ opacity: history.length === 0 ? 0.45 : 1 }}
                onClick={handleUndo}
              >
                <span>Undo</span>
                <span style={{ marginLeft: 'auto', color: '#666' }}>F10</span>
              </div>
            </div>
          )}
        </div>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#444', paddingRight: 8 }}>
          Game #{gameNum} • Cards Left: <b>{cardsLeft}</b>
        </span>
      </div>

      <div
        ref={boardRef}
        onClick={() => setSelected(null)}
        style={{ flex: 1, padding: '12px 14px', overflowY: 'auto', minHeight: 0 }}
      >
        {/* Top Row: 4 FreeCells | King Mascot | 4 HomeCells */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            maxWidth: 620,
            margin: '0 auto 16px auto',
            gap: 8,
          }}
        >
          {/* 4 Free Cells */}
          <div style={{ display: 'flex', gap: 5 }}>
            {freeCells.map((card, i) => {
              const dragged =
                activeDrag?.payload.zone === 'free' && activeDrag.payload.colIdx === i;
              const isSel = selected?.zone === 'free' && selected.colIdx === i;
              return (
                <div
                  key={i}
                  data-drop-zone={`free-${i}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!card && selected) {
                      executeDropFreeCell(i, selected);
                    }
                  }}
                  className="xp-bevel-sunken"
                  style={{
                    width: CARD_W,
                    height: CARD_H,
                    background: '#006800',
                    borderRadius: 4,
                    position: 'relative',
                  }}
                >
                  {card && !dragged && (
                    <div
                      onPointerDown={(e) =>
                        startPointerInteraction(e, {
                          payload: { zone: 'free', colIdx: i, cardIdx: 0 },
                          cards: [card],
                          canDrag: true,
                        })
                      }
                      style={{ width: '100%', height: '100%', cursor: 'grab', touchAction: 'none' }}
                    >
                      <CardFaceView suit={card.suit} rank={card.rank} selected={isSel} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Center XP FreeCell King Box */}
          <div
            className="xp-bevel-sunken"
            style={{
              width: 40,
              height: 40,
              background: '#006800',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
            title={`FreeCell Game #${gameNum}`}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 32 32"
              style={{ transform: kingDir === 'right' ? 'scaleX(-1)' : undefined }}
            >
              <polygon points="6,12 10,5 16,10 22,5 26,12" fill="#facc15" stroke="#854d0e" strokeWidth="1" />
              <circle cx="16" cy="18" r="7" fill="#fde68a" stroke="#78350f" strokeWidth="1" />
              <circle cx="13.5" cy="17" r="1.2" fill="#111" />
              <circle cx="17.5" cy="17" r="1.2" fill="#111" />
              <path d="M12 22 Q15.5 25 20 22" stroke="#92400e" strokeWidth="1.5" fill="none" />
            </svg>
          </div>

          {/* 4 Home Cells */}
          <div style={{ display: 'flex', gap: 5 }}>
            {homeCells.map((pile, i) => {
              const top = pile[pile.length - 1];
              return (
                <div
                  key={i}
                  data-drop-zone={`home-${i}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (selected) executeDropHomeCell(i, selected);
                  }}
                  className="xp-bevel-sunken"
                  style={{
                    width: CARD_W,
                    height: CARD_H,
                    background: '#006800',
                    borderRadius: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  {top ? (
                    <CardFaceView suit={top.suit} rank={top.rank} />
                  ) : (
                    <div style={{ opacity: 0.32 }}>
                      <SuitGlyph suit={SUITS[i]} size={20} color="#bbf7d0" />
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
              maxWidth: 420,
              margin: '0 auto 12px auto',
            }}
          >
            🎉 Congratulations! You solved FreeCell Game #{gameNum}!{' '}
            <button className="xp-btn xp-btn-primary" style={{ marginLeft: 8 }} onClick={() => dealGame()}>
              New Game
            </button>
          </div>
        )}

        {/* 8 Cascades */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(8, minmax(0, 1fr))',
            gap: 8,
            maxWidth: 620,
            margin: '0 auto',
          }}
        >
          {cols.map((col, cIdx) => (
            <div
              key={cIdx}
              data-drop-zone={`col-${cIdx}`}
              onClick={(e) => {
                e.stopPropagation();
                if (selected) executeDropColumn(cIdx, selected);
              }}
              style={{
                position: 'relative',
                minHeight: Math.max(250, col.length * STACK_GAP + CARD_H),
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <div style={{ width: CARD_W, position: 'relative' }}>
                {col.map((card, rIdx) => {
                  const movable = isValidCascadeTail(col, rIdx);
                  const dragged =
                    activeDrag?.payload.zone === 'col' &&
                    activeDrag.payload.colIdx === cIdx &&
                    rIdx >= activeDrag.payload.cardIdx;
                  const isSel =
                    selected?.zone === 'col' &&
                    selected.colIdx === cIdx &&
                    rIdx >= selected.cardIdx;

                  return (
                    <div
                      key={card.id}
                      onPointerDown={(e) =>
                        startPointerInteraction(e, {
                          payload: { zone: 'col', colIdx: cIdx, cardIdx: rIdx },
                          cards: movable ? col.slice(rIdx) : [],
                          canDrag: movable,
                          stackGap: STACK_GAP,
                        })
                      }
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        position: 'absolute',
                        top: rIdx * STACK_GAP,
                        left: 0,
                        width: CARD_W,
                        height: CARD_H,
                        cursor: movable ? 'grab' : 'default',
                        touchAction: movable ? 'none' : 'auto',
                        visibility: dragged ? 'hidden' : 'visible',
                        zIndex: rIdx + 1,
                      }}
                    >
                      <CardFaceView suit={card.suit} rank={card.rank} selected={isSel} />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <FloatingCardDragOverlay activeDrag={activeDrag} overlayRef={overlayRef} />
    </div>
  );
};

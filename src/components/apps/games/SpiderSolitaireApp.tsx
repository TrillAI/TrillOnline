import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSound } from '../../../context/SoundContext';
import {
  PlayingCardData,
  Suit,
  CardBackView,
  CardFaceView,
  SuitGlyph,
  useCardDrag,
  FloatingCardDragOverlay,
} from './PlayingCard';

interface SpiderDragPayload {
  colIdx: number;
  cardIdx: number;
}

interface SpiderSnapshot {
  cols: PlayingCardData[][];
  stockDeals: PlayingCardData[][];
  completedSuits: Suit[];
  score: number;
  moves: number;
}

const CARD_H = 88;
const FACEDOWN_GAP = 6;
const FACEUP_GAP = 20;

export const SpiderSolitaireApp: React.FC = () => {
  const { playSound } = useSound();
  const boardRef = useRef<HTMLDivElement | null>(null);

  const [suitMode, setSuitMode] = useState<1 | 2 | 4>(1);
  const [cols, setCols] = useState<PlayingCardData[][]>(Array.from({ length: 10 }, () => []));
  const [initialDealBackup, setInitialDealBackup] = useState<{
    cols: PlayingCardData[][];
    stockDeals: PlayingCardData[][];
  } | null>(null);
  const [stockDeals, setStockDeals] = useState<PlayingCardData[][]>([]); // up to 5 deals of 10 cards
  const [completedSuits, setCompletedSuits] = useState<Suit[]>([]);
  const [selected, setSelected] = useState<SpiderDragPayload | null>(null);
  const [hintMove, setHintMove] = useState<{
    fromCol: number;
    fromIdx: number;
    toCol: number;
  } | null>(null);
  const [score, setScore] = useState(500);
  const [moves, setMoves] = useState(0);
  const [history, setHistory] = useState<SpiderSnapshot[]>([]);
  const [won, setWon] = useState(false);

  // Menus & Dialogs
  const [openMenu, setOpenMenu] = useState<'game' | 'help' | null>(null);
  const [diffDialogOpen, setDiffDialogOpen] = useState(false);
  const [pendingDiff, setPendingDiff] = useState<1 | 2 | 4>(1);
  const [bannerMsg, setBannerMsg] = useState<string | null>(null);

  const cloneCols = (arr: PlayingCardData[][]) => arr.map((col) => col.map((c) => ({ ...c })));

  const showToast = (msg: string) => {
    setBannerMsg(msg);
    window.setTimeout(() => {
      setBannerMsg((cur) => (cur === msg ? null : cur));
    }, 2600);
  };

  const startNewGame = useCallback((mode: 1 | 2 | 4) => {
    setSuitMode(mode);
    setPendingDiff(mode);
    const suitPool: Suit[] =
      mode === 1
        ? Array(8).fill('♠')
        : mode === 2
        ? ['♠', '♠', '♠', '♠', '♥', '♥', '♥', '♥']
        : ['♠', '♠', '♥', '♥', '♣', '♣', '♦', '♦'];

    const deck: PlayingCardData[] = [];
    suitPool.forEach((suit, deckIdx) => {
      for (let r = 1; r <= 13; r++) {
        deck.push({ id: `${deckIdx}-${r}-${suit}`, suit, rank: r, faceUp: false });
      }
    });

    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    // Authentic Spider Solitaire deal: 54 cards to 10 columns (first 4 get 6 cards, next 6 get 5 cards), 50 left in 5 stock piles of 10!
    const nextCols: PlayingCardData[][] = Array.from({ length: 10 }, () => []);
    let ptr = 0;
    for (let c = 0; c < 10; c++) {
      const count = c < 4 ? 6 : 5;
      for (let k = 0; k < count; k++) {
        const card = { ...deck[ptr++], faceUp: k === count - 1 };
        nextCols[c].push(card);
      }
    }

    const deals: PlayingCardData[][] = [];
    for (let d = 0; d < 5; d++) {
      deals.push(deck.slice(ptr + d * 10, ptr + (d + 1) * 10));
    }

    setCols(nextCols);
    setStockDeals(deals);
    setInitialDealBackup({
      cols: cloneCols(nextCols),
      stockDeals: cloneCols(deals),
    });
    setCompletedSuits([]);
    setSelected(null);
    setHintMove(null);
    setScore(500);
    setMoves(0);
    setHistory([]);
    setWon(false);
    setOpenMenu(null);
    setDiffDialogOpen(false);
  }, []);

  useEffect(() => {
    startNewGame(1);
  }, [startNewGame]);

  const restartCurrentGame = () => {
    if (!initialDealBackup) return;
    setCols(cloneCols(initialDealBackup.cols));
    setStockDeals(cloneCols(initialDealBackup.stockDeals));
    setCompletedSuits([]);
    setSelected(null);
    setHintMove(null);
    setScore(500);
    setMoves(0);
    setHistory([]);
    setWon(false);
    setOpenMenu(null);
    playSound('cardFlip');
  };

  // True if col[startIdx..end] is face-up AND strictly descending by 1 in the SAME suit
  const isMovableTail = useCallback((col: PlayingCardData[], startIdx: number): boolean => {
    if (startIdx < 0 || startIdx >= col.length) return false;
    if (!col[startIdx].faceUp) return false;
    for (let i = startIdx; i < col.length - 1; i++) {
      if (col[i].suit !== col[i + 1].suit || col[i].rank !== col[i + 1].rank + 1) {
        return false;
      }
    }
    return true;
  }, []);

  const sweepCompletedRuns = useCallback(
    (rawCols: PlayingCardData[][], currentCompleted: Suit[], currentScore: number) => {
      let extraSuits: Suit[] = [];
      let nextScore = currentScore;

      const cleaned = rawCols.map((col) => {
        if (col.length < 13) return col;
        const tailStart = col.length - 13;
        const tail = col.slice(tailStart);
        const fullRun =
          tail[0].faceUp &&
          tail[0].rank === 13 &&
          tail.every((c, idx) => c.faceUp && c.suit === tail[0].suit && c.rank === 13 - idx);

        if (!fullRun) return col;

        extraSuits.push(tail[0].suit);
        nextScore += 100;
        const rest = col.slice(0, tailStart);
        if (rest.length > 0 && !rest[rest.length - 1].faceUp) {
          rest[rest.length - 1] = { ...rest[rest.length - 1], faceUp: true };
        }
        return rest;
      });

      const mergedCompleted = [...currentCompleted, ...extraSuits];
      if (extraSuits.length > 0) {
        playSound('slingoJoker');
      }
      if (mergedCompleted.length >= 8) {
        setWon(true);
        playSound('gameWin');
      }
      return { cleaned, mergedCompleted, nextScore };
    },
    [playSound]
  );

  const pushSnapshot = useCallback(() => {
    setHistory((prev) => [
      ...prev.slice(-40),
      {
        cols: cloneCols(cols),
        stockDeals: cloneCols(stockDeals),
        completedSuits: [...completedSuits],
        score,
        moves,
      },
    ]);
  }, [cols, stockDeals, completedSuits, score, moves]);

  const handleUndo = useCallback(() => {
    if (history.length === 0 || won) return;
    const snap = history[history.length - 1];
    setCols(snap.cols);
    setStockDeals(snap.stockDeals);
    setCompletedSuits(snap.completedSuits);
    setScore(Math.max(0, snap.score - 1));
    setMoves((m) => m + 1);
    setHistory((h) => h.slice(0, -1));
    setSelected(null);
    setHintMove(null);
    playSound('cardFlip');
  }, [history, won, playSound]);

  const canMoveToColumn = useCallback(
    (destColIdx: number, src: SpiderDragPayload): boolean => {
      if (src.colIdx === destColIdx) return false;
      const srcCol = cols[src.colIdx];
      if (!srcCol || !isMovableTail(srcCol, src.cardIdx)) return false;
      const lead = srcCol[src.cardIdx];
      const destCol = cols[destColIdx];
      const destTop = destCol[destCol.length - 1];
      if (!destTop) return true;
      return destTop.faceUp && destTop.rank === lead.rank + 1;
    },
    [cols, isMovableTail]
  );

  const executeMove = useCallback(
    (destColIdx: number, src: SpiderDragPayload): boolean => {
      if (!canMoveToColumn(destColIdx, src)) return false;
      pushSnapshot();
      setHintMove(null);

      const moving = cols[src.colIdx].slice(src.cardIdx);
      const rawNext = cols.map((col, idx) => {
        if (idx === src.colIdx) {
          const rest = col.slice(0, src.cardIdx);
          if (rest.length > 0 && !rest[rest.length - 1].faceUp) {
            rest[rest.length - 1] = { ...rest[rest.length - 1], faceUp: true };
          }
          return rest;
        }
        if (idx === destColIdx) {
          return [...col, ...moving];
        }
        return col;
      });

      const baseScore = Math.max(0, score - 1);
      const { cleaned, mergedCompleted, nextScore } = sweepCompletedRuns(
        rawNext,
        completedSuits,
        baseScore
      );

      setCols(cleaned);
      setCompletedSuits(mergedCompleted);
      setScore(nextScore);
      setMoves((m) => m + 1);
      setSelected(null);
      playSound('cardPlace');
      return true;
    },
    [canMoveToColumn, pushSnapshot, cols, score, sweepCompletedRuns, completedSuits, playSound]
  );

  const dealNextRow = useCallback(() => {
    setOpenMenu(null);
    setSelected(null);
    setHintMove(null);
    if (stockDeals.length === 0 || won) return;

    // Classic XP Spider rule: every column must have at least 1 card before dealing a row (unless total board cards < 10)
    const totalCardsOnBoard = cols.reduce((acc, c) => acc + c.length, 0);
    if (totalCardsOnBoard >= 10 && cols.some((c) => c.length === 0)) {
      playSound('exclamation');
      showToast('You are not allowed to deal a new row while there are any empty slots.');
      return;
    }

    pushSnapshot();
    const rowCards = stockDeals[stockDeals.length - 1];
    const rawNext = cols.map((col, idx) => {
      const dealt = rowCards[idx];
      return dealt ? [...col, { ...dealt, faceUp: true }] : col;
    });

    const { cleaned, mergedCompleted, nextScore } = sweepCompletedRuns(
      rawNext,
      completedSuits,
      score
    );

    setStockDeals((s) => s.slice(0, -1));
    setCols(cleaned);
    setCompletedSuits(mergedCompleted);
    setScore(nextScore);
    setMoves((m) => m + 1);
    playSound('cardFlip');
  }, [stockDeals, won, cols, pushSnapshot, sweepCompletedRuns, completedSuits, score, playSound]);

  // Show An Available Move (M key or click bottom-center scoreboard!)
  const showAvailableMove = useCallback(() => {
    setOpenMenu(null);
    const candidates: Array<{ fromCol: number; fromIdx: number; toCol: number; priority: number }> = [];

    for (let c = 0; c < 10; c++) {
      const col = cols[c];
      for (let r = 0; r < col.length; r++) {
        if (!isMovableTail(col, r)) continue;
        // Avoid pointless move of an already-rooted sub-stack unless moving whole face-up chain or switching suits
        if (
          r > 0 &&
          col[r - 1].faceUp &&
          col[r - 1].suit === col[r].suit &&
          col[r - 1].rank === col[r].rank + 1
        ) {
          continue;
        }
        const lead = col[r];
        for (let dest = 0; dest < 10; dest++) {
          if (dest === c) continue;
          const destCol = cols[dest];
          const top = destCol[destCol.length - 1];
          if (top && top.faceUp && top.rank === lead.rank + 1) {
            const sameSuit = top.suit === lead.suit;
            candidates.push({
              fromCol: c,
              fromIdx: r,
              toCol: dest,
              priority: sameSuit ? 100 : 60,
            });
          } else if (!top && r > 0) {
            candidates.push({
              fromCol: c,
              fromIdx: r,
              toCol: dest,
              priority: 25,
            });
          }
        }
      }
    }

    candidates.sort((a, b) => b.priority - a.priority);
    if (candidates.length === 0) {
      playSound('ding');
      showToast(
        stockDeals.length > 0
          ? 'No more moves on the board — click the deck in the bottom-right to deal a new row!'
          : 'No available moves found.'
      );
      return;
    }

    const best = candidates[0];
    setHintMove({ fromCol: best.fromCol, fromIdx: best.fromIdx, toCol: best.toCol });
    playSound('menuClick');
    window.setTimeout(() => {
      setHintMove(null);
    }, 1150);
  }, [cols, isMovableTail, stockDeals.length, playSound]);

  // Keyboard shortcuts: F2 New Game, F3 Difficulty, Ctrl+Z Undo, D Deal, M Show Move
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        startNewGame(suitMode);
      } else if (e.key === 'F3') {
        e.preventDefault();
        setDiffDialogOpen(true);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
      } else if (!e.ctrlKey && !e.metaKey && e.key.toLowerCase() === 'd') {
        dealNextRow();
      } else if (!e.ctrlKey && !e.metaKey && e.key.toLowerCase() === 'm') {
        showAvailableMove();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [suitMode, startNewGame, handleUndo, dealNextRow, showAvailableMove]);

  // Zero-Lag GPU Live Drag + Tap Engine
  const canDropOnZone = useCallback(
    (zoneId: string, src: SpiderDragPayload) => {
      if (!zoneId.startsWith('col-')) return false;
      return canMoveToColumn(Number(zoneId.slice(4)), src);
    },
    [canMoveToColumn]
  );

  const onDropOnZone = useCallback(
    (zoneId: string, src: SpiderDragPayload) => {
      if (!zoneId.startsWith('col-')) return;
      executeMove(Number(zoneId.slice(4)), src);
    },
    [executeMove]
  );

  const onTapCard = useCallback(
    (payload: SpiderDragPayload) => {
      setOpenMenu(null);
      const clickedCol = cols[payload.colIdx];
      const canDragClicked = isMovableTail(clickedCol, payload.cardIdx);

      if (!selected) {
        if (canDragClicked) setSelected(payload);
        return;
      }

      if (selected.colIdx === payload.colIdx && selected.cardIdx === payload.cardIdx) {
        setSelected(null);
        return;
      }

      // Try moving currently selected stack onto the tapped column!
      if (executeMove(payload.colIdx, selected)) {
        return;
      }

      // Otherwise select the newly tapped movable tail
      if (canDragClicked) {
        setSelected(payload);
      } else {
        setSelected(null);
      }
    },
    [cols, isMovableTail, selected, executeMove]
  );

  // Smart double-tap/double-click: prefers same-suit match -> rank+1 match -> empty column!
  const onDoubleTapCard = useCallback(
    (payload: SpiderDragPayload) => {
      const srcCol = cols[payload.colIdx];
      if (!isMovableTail(srcCol, payload.cardIdx)) return;
      const lead = srcCol[payload.cardIdx];

      // 1. Same-suit rank+1 match
      for (let d = 0; d < 10; d++) {
        if (d === payload.colIdx) continue;
        const top = cols[d][cols[d].length - 1];
        if (top && top.faceUp && top.suit === lead.suit && top.rank === lead.rank + 1) {
          executeMove(d, payload);
          return;
        }
      }
      // 2. Any-suit rank+1 match
      for (let d = 0; d < 10; d++) {
        if (d === payload.colIdx) continue;
        const top = cols[d][cols[d].length - 1];
        if (top && top.faceUp && top.rank === lead.rank + 1) {
          executeMove(d, payload);
          return;
        }
      }
      // 3. Empty column
      for (let d = 0; d < 10; d++) {
        if (d !== payload.colIdx && cols[d].length === 0) {
          executeMove(d, payload);
          return;
        }
      }
    },
    [cols, isMovableTail, executeMove]
  );

  const { activeDrag, overlayRef, startPointerInteraction } = useCardDrag<SpiderDragPayload>({
    boardRef,
    canDropOnZone,
    onDropOnZone,
    onTapCard,
    onDoubleTapCard,
    getPayloadKey: (p) => `${p.colIdx}-${p.cardIdx}`,
  });

  const getColOffsets = (col: PlayingCardData[]) => {
    const faceUpCount = col.filter((c) => c.faceUp).length;
    const upGap = faceUpCount > 14 ? 13 : faceUpCount > 10 ? 16 : FACEUP_GAP;
    const offsets: number[] = [];
    let y = 0;
    for (let i = 0; i < col.length; i++) {
      offsets.push(y);
      y += col[i].faceUp ? upGap : FACEDOWN_GAP;
    }
    return { offsets, upGap, totalHeight: Math.max(CARD_H, y + CARD_H) };
  };

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: '#007d00',
        minHeight: 0,
        position: 'relative',
        userSelect: 'none',
      }}
      onClick={() => setOpenMenu(null)}
    >
      {/* Authentic Windows XP Spider Solitaire Menu Bar */}
      <div className="xp-menubar" style={{ position: 'relative', zIndex: 30 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ position: 'relative' }}>
          <span
            className="xp-menu-item"
            style={{ background: openMenu === 'game' ? '#316ac5' : undefined, color: openMenu === 'game' ? '#fff' : undefined }}
            onClick={() => setOpenMenu(openMenu === 'game' ? null : 'game')}
          >
            Game
          </span>
          {openMenu === 'game' && (
            <div className="xp-dropdown-menu" style={{ left: 0, top: '100%', minWidth: 225 }}>
              <div className="xp-dropdown-item" onClick={() => startNewGame(suitMode)}>
                <span>New Game</span>
                <span style={{ marginLeft: 'auto', color: '#666' }}>F2</span>
              </div>
              <div className="xp-dropdown-item" onClick={restartCurrentGame}>
                <span>Restart This Game</span>
              </div>
              <div className="xp-dropdown-sep" />
              <div
                className="xp-dropdown-item"
                style={{ opacity: history.length === 0 ? 0.45 : 1 }}
                onClick={handleUndo}
              >
                <span>Undo</span>
                <span style={{ marginLeft: 'auto', color: '#666' }}>Ctrl+Z</span>
              </div>
              <div
                className="xp-dropdown-item"
                style={{ opacity: stockDeals.length === 0 ? 0.45 : 1 }}
                onClick={dealNextRow}
              >
                <span>Deal Next Row</span>
                <span style={{ marginLeft: 'auto', color: '#666' }}>D</span>
              </div>
              <div className="xp-dropdown-item" onClick={showAvailableMove}>
                <span>Show An Available Move</span>
                <span style={{ marginLeft: 'auto', color: '#666' }}>M</span>
              </div>
              <div className="xp-dropdown-sep" />
              <div
                className="xp-dropdown-item"
                onClick={() => {
                  setOpenMenu(null);
                  setPendingDiff(suitMode);
                  setDiffDialogOpen(true);
                }}
              >
                <span>Difficulty...</span>
                <span style={{ marginLeft: 'auto', color: '#666' }}>F3</span>
              </div>
            </div>
          )}
        </div>

        <div style={{ position: 'relative' }}>
          <span
            className="xp-menu-item"
            style={{ background: openMenu === 'help' ? '#316ac5' : undefined, color: openMenu === 'help' ? '#fff' : undefined }}
            onClick={() => setOpenMenu(openMenu === 'help' ? null : 'help')}
          >
            Help
          </span>
          {openMenu === 'help' && (
            <div className="xp-dropdown-menu" style={{ left: 0, top: '100%', minWidth: 260 }}>
              <div
                className="xp-dropdown-item"
                onClick={() => {
                  setOpenMenu(null);
                  alert(
                    'TrillXP Spider Solitaire (spider.exe)\n\n• Build descending King-to-Ace runs of the SAME suit to clear all 8 runs!\n• Drag single cards or same-suit runs smoothly with zero lag, OR tap to select and tap a column, OR double-tap to smart-move!\n• Click the center scoreboard (or press M) to highlight an available move.\n• Click the Spiderweb decks in the bottom-right corner to deal 10 new cards!'
                  );
                }}
              >
                How to Play Spider Solitaire...
              </div>
            </div>
          )}
        </div>

        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#555', paddingRight: 6 }}>
          {suitMode === 1 ? 'Easy: One Suit (♠)' : suitMode === 2 ? 'Medium: Two Suits (♠♥)' : 'Difficult: Four Suits (♠♥♣♦)'}
        </span>
      </div>

      {/* Toast Notification Banner */}
      {bannerMsg && (
        <div
          style={{
            position: 'absolute',
            top: 30,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#fef9c3',
            color: '#1e293b',
            border: '1px solid #ca8a04',
            borderRadius: 4,
            padding: '5px 12px',
            fontSize: 11,
            fontWeight: 700,
            boxShadow: '0 3px 10px rgba(0,0,0,0.35)',
            zIndex: 55,
          }}
        >
          {bannerMsg}
        </div>
      )}

      {/* Main 10-Column Felt Table + Authentic Bottom Bar */}
      <div
        ref={boardRef}
        onClick={() => setSelected(null)}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '10px 12px 10px 12px',
          overflowY: 'auto',
          overflowX: 'hidden',
          minHeight: 0,
        }}
      >
        {/* 10 Spider Columns */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(10, minmax(0, 1fr))',
            gap: 6,
            width: '100%',
            flex: 1,
          }}
        >
          {cols.map((col, cIdx) => {
            const { offsets, upGap, totalHeight } = getColOffsets(col);
            const isHintDest = hintMove?.toCol === cIdx && col.length === 0;

            return (
              <div
                key={cIdx}
                data-drop-zone={`col-${cIdx}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (selected) {
                    executeMove(cIdx, selected);
                  }
                }}
                style={{
                  position: 'relative',
                  minHeight: Math.max(230, totalHeight),
                }}
              >
                {/* Empty Column Slot */}
                {col.length === 0 && (
                  <div
                    style={{
                      width: '100%',
                      height: CARD_H,
                      borderRadius: 4,
                      border: isHintDest ? '2px solid #facc15' : '1px solid rgba(0, 50, 0, 0.7)',
                      background: isHintDest ? 'rgba(250, 204, 21, 0.25)' : 'rgba(0, 52, 0, 0.28)',
                      boxSizing: 'border-box',
                    }}
                  />
                )}

                {col.map((card, rIdx) => {
                  const movable = isMovableTail(col, rIdx);
                  const dragged =
                    activeDrag !== null &&
                    activeDrag.payload.colIdx === cIdx &&
                    rIdx >= activeDrag.payload.cardIdx;

                  const isSel =
                    selected !== null &&
                    selected.colIdx === cIdx &&
                    rIdx >= selected.cardIdx &&
                    card.faceUp;

                  const isHintCard =
                    (hintMove?.fromCol === cIdx && rIdx >= hintMove.fromIdx) ||
                    (hintMove?.toCol === cIdx && rIdx === col.length - 1);

                  return (
                    <div
                      key={card.id}
                      onPointerDown={(e) => {
                        if (!card.faceUp) return;
                        startPointerInteraction(e, {
                          payload: { colIdx: cIdx, cardIdx: rIdx },
                          cards: movable ? col.slice(rIdx) : [],
                          canDrag: movable,
                          stackGap: upGap,
                        });
                      }}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        position: 'absolute',
                        top: offsets[rIdx],
                        left: 0,
                        right: 0,
                        height: CARD_H,
                        cursor: movable ? 'grab' : card.faceUp ? 'pointer' : 'default',
                        touchAction: movable ? 'none' : 'auto',
                        visibility: dragged ? 'hidden' : 'visible',
                        zIndex: rIdx + 1,
                      }}
                    >
                      {card.faceUp ? (
                        <CardFaceView
                          suit={card.suit}
                          rank={card.rank}
                          selected={isSel}
                          hintFlash={isHintCard}
                          dimmed={!movable}
                          compactHeader
                        />
                      ) : (
                        <CardBackView design="spiderweb" width="100%" height={CARD_H} />
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Authentic Windows XP Spider Solitaire Bottom Felt Area */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'end',
            paddingTop: 14,
            minHeight: 96,
            flexShrink: 0,
          }}
        >
          {/* Bottom-Left: Completed K-to-A Suit Stacks */}
          <div style={{ position: 'relative', height: CARD_H }}>
            {completedSuits.map((suit, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: i * 16,
                  bottom: 0,
                  width: 62,
                  height: CARD_H,
                }}
              >
                <CardFaceView suit={suit} rank={13} compactHeader />
              </div>
            ))}
          </div>

          {/* Bottom-Center: Iconic Sunken Dark-Green Felt Score/Moves Plaque */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              showAvailableMove();
            }}
            title="Click to show an available move (M)"
            style={{
              width: 196,
              height: 74,
              background: '#006200',
              borderTop: '2px solid #003e00',
              borderLeft: '2px solid #003e00',
              borderRight: '2px solid #1fa31f',
              borderBottom: '2px solid #1fa31f',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              color: '#ffffff',
              fontFamily: 'Tahoma, sans-serif',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <div>Score: &nbsp;{score}</div>
            <div>Moves: &nbsp;{moves}</div>
          </div>

          {/* Bottom-Right: Authentic 5 Overlapping Face-Down Stock Piles! */}
          <div style={{ position: 'relative', height: CARD_H, display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ position: 'relative', width: 62 + 4 * 12, height: CARD_H }}>
              {stockDeals.map((_, idx) => (
                <div
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    dealNextRow();
                  }}
                  title={`Deal next row of 10 cards (${stockDeals.length} deal${stockDeals.length === 1 ? '' : 's'} left)`}
                  style={{
                    position: 'absolute',
                    right: (stockDeals.length - 1 - idx) * 12,
                    bottom: 0,
                    width: 62,
                    height: CARD_H,
                    cursor: 'pointer',
                  }}
                >
                  <CardBackView design="spiderweb" width={62} height={CARD_H} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Authentic Windows XP Difficulty Dialog (F3) */}
      {diffDialogOpen && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 80,
          }}
          onClick={() => setDiffDialogOpen(false)}
        >
          <div
            className="xp-window"
            style={{ width: 290, position: 'relative' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="xp-titlebar" style={{ height: 24 }}>
              <span className="xp-titlebar-text">Difficulty</span>
            </div>
            <div style={{ padding: 14, background: '#ece9d8', fontSize: 12 }}>
              <div style={{ marginBottom: 10 }}>Select the game difficulty level that you want:</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14, paddingLeft: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="radio"
                    checked={pendingDiff === 1}
                    onChange={() => setPendingDiff(1)}
                  />
                  <SuitGlyph suit="♠" size={14} />
                  <span>Easy: One Suit</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="radio"
                    checked={pendingDiff === 2}
                    onChange={() => setPendingDiff(2)}
                  />
                  <span style={{ display: 'flex', gap: 2 }}>
                    <SuitGlyph suit="♠" size={14} />
                    <SuitGlyph suit="♥" size={14} />
                  </span>
                  <span>Medium: Two Suits</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="radio"
                    checked={pendingDiff === 4}
                    onChange={() => setPendingDiff(4)}
                  />
                  <span style={{ display: 'flex', gap: 2 }}>
                    <SuitGlyph suit="♠" size={13} />
                    <SuitGlyph suit="♥" size={13} />
                    <SuitGlyph suit="♣" size={13} />
                    <SuitGlyph suit="♦" size={13} />
                  </span>
                  <span>Difficult: Four Suits</span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
                <button className="xp-btn xp-btn-primary" onClick={() => startNewGame(pendingDiff)}>
                  OK
                </button>
                <button className="xp-btn" onClick={() => setDiffDialogOpen(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Game Won Modal */}
      {won && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.52)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 90,
          }}
        >
          <div className="xp-window" style={{ width: 310, position: 'relative' }}>
            <div className="xp-titlebar" style={{ height: 24 }}>
              <span className="xp-titlebar-text">Game Over</span>
            </div>
            <div style={{ padding: 16, background: '#ece9d8', textAlign: 'center', fontSize: 12 }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>🎆 You Won! 🎆</div>
              <div style={{ marginBottom: 12 }}>
                Congratulations, you cleared all 8 Spider runs!
                <br />
                Final Score: <b>{score}</b> • Moves: <b>{moves}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
                <button className="xp-btn xp-btn-primary" onClick={() => startNewGame(suitMode)}>
                  Play Again
                </button>
                <button className="xp-btn" onClick={() => setWon(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Zero-Lag Floating GPU Card Drag Layer */}
      <FloatingCardDragOverlay activeDrag={activeDrag} overlayRef={overlayRef} compactHeader />
    </div>
  );
};

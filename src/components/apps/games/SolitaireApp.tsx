import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSound } from '../../../context/SoundContext';
import {
  PlayingCardData,
  SUITS,
  RANKS,
  isRedSuit,
  CardBackId,
  CARD_BACK_DESIGNS,
  CardBackView,
  CardFaceView,
  SuitGlyph,
  useCardDrag,
  FloatingCardDragOverlay,
} from './PlayingCard';

type ScoringMode = 'standard' | 'vegas' | 'none';

interface SolDragPayload {
  zone: 'waste' | 'found' | 'col';
  colIdx: number;
  cardIdx: number;
}

interface SolHistorySnapshot {
  stock: PlayingCardData[];
  waste: PlayingCardData[];
  foundations: PlayingCardData[][];
  tableau: PlayingCardData[][];
  score: number;
  stockPasses: number;
}

const CARD_W = 71;
const CARD_H = 96;
const FACEDOWN_GAP = 6;
const FACEUP_GAP = 20;

export const SolitaireApp: React.FC = () => {
  const { playSound } = useSound();
  const boardRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Authentic XP Options
  const [drawCount, setDrawCount] = useState<1 | 3>(1);
  const [scoringMode, setScoringMode] = useState<ScoringMode>('standard');
  const [timedGame, setTimedGame] = useState(true);
  const [showStatusBar, setShowStatusBar] = useState(true);
  const [cardBack, setCardBack] = useState<CardBackId>('castle');

  // Game State
  const [stock, setStock] = useState<PlayingCardData[]>([]);
  const [waste, setWaste] = useState<PlayingCardData[]>([]);
  const [foundations, setFoundations] = useState<PlayingCardData[][]>([[], [], [], []]);
  const [tableau, setTableau] = useState<PlayingCardData[][]>(Array.from({ length: 7 }, () => []));
  const [selected, setSelected] = useState<SolDragPayload | null>(null);
  const [score, setScore] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [started, setStarted] = useState(false);
  const [stockPasses, setStockPasses] = useState(0);
  const [history, setHistory] = useState<SolHistorySnapshot[]>([]);
  const [won, setWon] = useState(false);

  // Menus & Dialogs
  const [openMenu, setOpenMenu] = useState<'game' | 'help' | null>(null);
  const [deckDialogOpen, setDeckDialogOpen] = useState(false);
  const [optionsDialogOpen, setOptionsDialogOpen] = useState(false);

  const cloneCards = (arr: PlayingCardData[]) => arr.map((c) => ({ ...c }));

  const saveHistory = useCallback(() => {
    setHistory((prev) => [
      ...prev.slice(-35),
      {
        stock: cloneCards(stock),
        waste: cloneCards(waste),
        foundations: foundations.map(cloneCards),
        tableau: tableau.map(cloneCards),
        score,
        stockPasses,
      },
    ]);
  }, [stock, waste, foundations, tableau, score, stockPasses]);

  const dealNewGame = useCallback(
    (nextDraw: 1 | 3 = drawCount, nextScoring: ScoringMode = scoringMode) => {
      const deck: PlayingCardData[] = [];
      for (const s of SUITS) {
        for (let r = 1; r <= 13; r++) {
          deck.push({ id: `${r}${s}`, suit: s, rank: r, faceUp: false });
        }
      }
      for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }
      const nextTab: PlayingCardData[][] = Array.from({ length: 7 }, () => []);
      let ptr = 0;
      for (let col = 0; col < 7; col++) {
        for (let row = 0; row <= col; row++) {
          const card = deck[ptr++];
          card.faceUp = row === col;
          nextTab[col].push(card);
        }
      }
      setTableau(nextTab);
      setStock(deck.slice(ptr));
      setWaste([]);
      setFoundations([[], [], [], []]);
      setSelected(null);
      setScore(nextScoring === 'vegas' ? -52 : 0);
      setSeconds(0);
      setStarted(false);
      setStockPasses(0);
      setHistory([]);
      setWon(false);
      setOpenMenu(null);
      void nextDraw;
    },
    [drawCount, scoringMode]
  );

  useEffect(() => {
    dealNewGame(1, 'standard');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Classic XP Solitaire Timer (-2 pts every 10 seconds in Standard Timed mode)
  useEffect(() => {
    if (!started || won || !timedGame) return;
    const iv = window.setInterval(() => {
      setSeconds((s) => {
        const next = s + 1;
        if (scoringMode === 'standard' && next % 10 === 0) {
          setScore((sc) => Math.max(0, sc - 2));
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [started, won, timedGame, scoringMode]);

  // Keyboard shortcuts: F2 Deal, Ctrl+Z Undo
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        dealNewGame();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Classic Windows XP Bouncing Card Waterfall on Win!
  useEffect(() => {
    if (!won || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#008000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let raf = 0;
    let rank = 13;
    let suitIdx = 0;
    let x = canvas.width - 110;
    let y = 18;
    let vx = -4.2;
    let vy = 0;

    const resetFallingCard = () => {
      suitIdx = (suitIdx + 1) % 4;
      if (suitIdx === 0) {
        rank--;
        if (rank < 1) rank = 13;
      }
      x = Math.max(40, canvas.width - 330 + suitIdx * 78);
      y = 18;
      vx = (Math.random() > 0.45 ? -1 : 1) * (2.6 + Math.random() * 3.2);
      vy = -1.5;
    };

    const step = () => {
      x += vx;
      vy += 0.48;
      y += vy;
      if (y + CARD_H > canvas.height) {
        y = canvas.height - CARD_H;
        vy = -vy * 0.82;
      }

      const suit = SUITS[suitIdx];
      const red = isRedSuit(suit);
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#0f0f0f';
      ctx.lineWidth = 1;
      ctx.fillRect(x, y, CARD_W, CARD_H);
      ctx.strokeRect(x, y, CARD_W, CARD_H);
      ctx.fillStyle = red ? '#d60000' : '#0a0a0a';
      ctx.font = 'bold 14px Arial';
      ctx.fillText(`${RANKS[rank]}${suit}`, x + 5, y + 17);
      ctx.font = 'bold 28px Arial';
      ctx.fillText(suit, x + 23, y + 58);

      if (x < -CARD_W || x > canvas.width + CARD_W) {
        resetFallingCard();
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [won]);

  const handleUndo = () => {
    if (history.length === 0 || won) return;
    const prev = history[history.length - 1];
    setStock(prev.stock);
    setWaste(prev.waste);
    setFoundations(prev.foundations);
    setTableau(prev.tableau);
    setScore(prev.score);
    setStockPasses(prev.stockPasses);
    setHistory((h) => h.slice(0, -1));
    setSelected(null);
    playSound('cardFlip');
  };

  const getMovingCards = useCallback(
    (src: SolDragPayload): PlayingCardData[] => {
      if (src.zone === 'waste') {
        const top = waste[waste.length - 1];
        return top ? [top] : [];
      }
      if (src.zone === 'found') {
        const pile = foundations[src.colIdx];
        const top = pile?.[pile.length - 1];
        return top ? [top] : [];
      }
      const col = tableau[src.colIdx] || [];
      const slice = col.slice(src.cardIdx);
      if (slice.length === 0 || !slice[0].faceUp) return [];
      return slice;
    },
    [waste, foundations, tableau]
  );

  const canPlaceOnFoundation = useCallback(
    (fIdx: number, src: SolDragPayload): boolean => {
      if (src.zone === 'found' && src.colIdx === fIdx) return false;
      const moving = getMovingCards(src);
      if (moving.length !== 1) return false;
      const card = moving[0];
      const pile = foundations[fIdx];
      const top = pile[pile.length - 1];
      if (!top) return card.rank === 1;
      return top.suit === card.suit && card.rank === top.rank + 1;
    },
    [foundations, getMovingCards]
  );

  const canPlaceOnTableau = useCallback(
    (destColIdx: number, src: SolDragPayload): boolean => {
      if (src.zone === 'col' && src.colIdx === destColIdx) return false;
      const moving = getMovingCards(src);
      if (moving.length === 0) return false;
      const lead = moving[0];
      const destCol = tableau[destColIdx];
      const destTop = destCol[destCol.length - 1];
      if (!destTop) return lead.rank === 13;
      if (!destTop.faceUp) return false;
      return isRedSuit(destTop.suit) !== isRedSuit(lead.suit) && destTop.rank === lead.rank + 1;
    },
    [tableau, getMovingCards]
  );

  const addScore = useCallback(
    (deltaStandard: number, deltaVegas = 0) => {
      if (scoringMode === 'none') return;
      if (scoringMode === 'vegas') {
        if (deltaVegas !== 0) setScore((s) => s + deltaVegas);
      } else {
        setScore((s) => Math.max(0, s + deltaStandard));
      }
    },
    [scoringMode]
  );

  const executeMoveToFoundation = useCallback(
    (fIdx: number, src: SolDragPayload) => {
      if (!canPlaceOnFoundation(fIdx, src)) return false;
      const moving = getMovingCards(src);
      const card = moving[0];

      saveHistory();
      setStarted(true);

      let flippedCard = false;
      if (src.zone === 'waste') {
        setWaste((w) => w.slice(0, -1));
      } else if (src.zone === 'found') {
        setFoundations((prev) =>
          prev.map((pile, idx) => (idx === src.colIdx ? pile.slice(0, -1) : idx === fIdx ? [...pile, card] : pile))
        );
        setSelected(null);
        playSound('cardPlace');
        return true;
      } else {
        setTableau((prev) =>
          prev.map((col, idx) => {
            if (idx !== src.colIdx) return col;
            const trimmed = col.slice(0, src.cardIdx);
            if (trimmed.length > 0 && !trimmed[trimmed.length - 1].faceUp) {
              flippedCard = true;
              const top = { ...trimmed[trimmed.length - 1], faceUp: true };
              return [...trimmed.slice(0, -1), top];
            }
            return trimmed;
          })
        );
      }

      const nextFound = foundations.map((pile, idx) => (idx === fIdx ? [...pile, card] : pile));
      setFoundations(nextFound);
      setSelected(null);
      addScore(10 + (flippedCard ? 5 : 0), 5);
      playSound('cardPlace');

      if (nextFound.every((p) => p.length === 13)) {
        setWon(true);
        playSound('gameWin');
      }
      return true;
    },
    [canPlaceOnFoundation, getMovingCards, saveHistory, foundations, addScore, playSound]
  );

  const executeMoveToTableau = useCallback(
    (destColIdx: number, src: SolDragPayload) => {
      if (!canPlaceOnTableau(destColIdx, src)) return false;
      const moving = getMovingCards(src);

      saveHistory();
      setStarted(true);

      let flippedCard = false;
      if (src.zone === 'waste') {
        setWaste((w) => w.slice(0, -1));
        setTableau((prev) => prev.map((col, idx) => (idx === destColIdx ? [...col, ...moving] : col)));
        addScore(5, 0);
      } else if (src.zone === 'found') {
        setFoundations((prev) => prev.map((pile, idx) => (idx === src.colIdx ? pile.slice(0, -1) : pile)));
        setTableau((prev) => prev.map((col, idx) => (idx === destColIdx ? [...col, ...moving] : col)));
        addScore(-15, -5);
      } else {
        setTableau((prev) =>
          prev.map((col, idx) => {
            if (idx === src.colIdx) {
              const trimmed = col.slice(0, src.cardIdx);
              if (trimmed.length > 0 && !trimmed[trimmed.length - 1].faceUp) {
                flippedCard = true;
                const top = { ...trimmed[trimmed.length - 1], faceUp: true };
                return [...trimmed.slice(0, -1), top];
              }
              return trimmed;
            }
            if (idx === destColIdx) {
              return [...col, ...moving];
            }
            return col;
          })
        );
        if (flippedCard) addScore(5, 0);
      }

      setSelected(null);
      playSound('cardPlace');
      return true;
    },
    [canPlaceOnTableau, getMovingCards, saveHistory, addScore, playSound]
  );

  // Stock click: Draw 1 or Draw 3 (respects Vegas 1-pass or 3-pass limits!)
  const handleStockClick = () => {
    setOpenMenu(null);
    setSelected(null);
    setStarted(true);

    if (stock.length === 0) {
      if (waste.length === 0) return;
      const maxVegasPasses = drawCount === 1 ? 0 : 2;
      if (scoringMode === 'vegas' && stockPasses >= maxVegasPasses) {
        playSound('error');
        return;
      }
      saveHistory();
      const recycled = [...waste].reverse().map((c) => ({ ...c, faceUp: false }));
      setStock(recycled);
      setWaste([]);
      setStockPasses((p) => p + 1);
      if (scoringMode === 'standard' && drawCount === 1) {
        addScore(-100, 0);
      } else if (scoringMode === 'standard' && drawCount === 3 && stockPasses >= 3) {
        addScore(-20, 0);
      }
      playSound('cardFlip');
      return;
    }

    saveHistory();
    const take = Math.min(drawCount, stock.length);
    const drawn = stock
      .slice(-take)
      .reverse()
      .map((c) => ({ ...c, faceUp: true }));
    setStock((s) => s.slice(0, s.length - take));
    setWaste((w) => [...w, ...drawn]);
    playSound('cardFlip');
  };

  // Auto-send single card to Foundation on double-tap/double-click
  const tryAutoSendToFoundation = useCallback(
    (src: SolDragPayload): boolean => {
      for (let f = 0; f < 4; f++) {
        if (canPlaceOnFoundation(f, src)) {
          return executeMoveToFoundation(f, src);
        }
      }
      return false;
    },
    [canPlaceOnFoundation, executeMoveToFoundation]
  );

  // Right-click background -> Auto-send eligible top cards to Foundations (authentic XP feature!)
  const handleAutoSendEligible = () => {
    if (waste.length > 0) {
      if (tryAutoSendToFoundation({ zone: 'waste', colIdx: 0, cardIdx: waste.length - 1 })) return;
    }
    for (let c = 0; c < 7; c++) {
      const col = tableau[c];
      if (col.length > 0 && col[col.length - 1].faceUp) {
        if (tryAutoSendToFoundation({ zone: 'col', colIdx: c, cardIdx: col.length - 1 })) return;
      }
    }
  };

  // Check if all cards in tableau are face-up and stock/waste empty -> show Auto-Complete!
  const canAutoComplete =
    !won &&
    stock.length === 0 &&
    waste.length === 0 &&
    tableau.some((c) => c.length > 0) &&
    tableau.every((col) => col.every((c) => c.faceUp));

  const runAutoComplete = () => {
    saveHistory();
    const fullFound: PlayingCardData[][] = SUITS.map((s) =>
      Array.from({ length: 13 }, (_, idx) => ({
        id: `${idx + 1}${s}`,
        suit: s,
        rank: idx + 1,
        faceUp: true,
      }))
    );
    const remaining = 52 - foundations.reduce((a, p) => a + p.length, 0);
    setFoundations(fullFound);
    setTableau(Array.from({ length: 7 }, () => []));
    setStock([]);
    setWaste([]);
    addScore(remaining * 10, remaining * 5);
    setWon(true);
    playSound('gameWin');
  };

  // Zero-lag GPU drag-and-drop + tap engine
  const canDropOnZone = useCallback(
    (zoneId: string, src: SolDragPayload): boolean => {
      if (zoneId.startsWith('found-')) {
        const fIdx = Number(zoneId.slice(6));
        return canPlaceOnFoundation(fIdx, src);
      }
      if (zoneId.startsWith('col-')) {
        const cIdx = Number(zoneId.slice(4));
        return canPlaceOnTableau(cIdx, src);
      }
      return false;
    },
    [canPlaceOnFoundation, canPlaceOnTableau]
  );

  const onDropOnZone = useCallback(
    (zoneId: string, src: SolDragPayload) => {
      if (zoneId.startsWith('found-')) {
        executeMoveToFoundation(Number(zoneId.slice(6)), src);
      } else if (zoneId.startsWith('col-')) {
        executeMoveToTableau(Number(zoneId.slice(4)), src);
      }
    },
    [executeMoveToFoundation, executeMoveToTableau]
  );

  const onTapCard = useCallback(
    (payload: SolDragPayload) => {
      setOpenMenu(null);
      if (!selected) {
        setSelected(payload);
        return;
      }
      // Tapping same card deselects
      if (
        selected.zone === payload.zone &&
        selected.colIdx === payload.colIdx &&
        selected.cardIdx === payload.cardIdx
      ) {
        setSelected(null);
        return;
      }
      // If user tapped a Foundation card while holding selection -> try placing onto that Foundation
      if (payload.zone === 'found') {
        if (executeMoveToFoundation(payload.colIdx, selected)) return;
      }
      // If user tapped a Tableau card while holding selection -> try placing onto that Tableau column
      if (payload.zone === 'col') {
        if (executeMoveToTableau(payload.colIdx, selected)) return;
      }
      // Otherwise switch selection to tapped card
      setSelected(payload);
    },
    [selected, executeMoveToFoundation, executeMoveToTableau]
  );

  const onDoubleTapCard = useCallback(
    (payload: SolDragPayload) => {
      if (!tryAutoSendToFoundation(payload)) {
        // Fallback: try moving to any valid non-empty tableau column, then empty column
        for (let c = 0; c < 7; c++) {
          if (tableau[c].length > 0 && canPlaceOnTableau(c, payload)) {
            executeMoveToTableau(c, payload);
            return;
          }
        }
        for (let c = 0; c < 7; c++) {
          if (tableau[c].length === 0 && canPlaceOnTableau(c, payload)) {
            executeMoveToTableau(c, payload);
            return;
          }
        }
      }
    },
    [tryAutoSendToFoundation, tableau, canPlaceOnTableau, executeMoveToTableau]
  );

  const { activeDrag, overlayRef, startPointerInteraction } = useCardDrag<SolDragPayload>({
    boardRef,
    canDropOnZone,
    onDropOnZone,
    onTapCard,
    onDoubleTapCard,
    getPayloadKey: (p) => `${p.zone}-${p.colIdx}-${p.cardIdx}`,
  });

  const isCardBeingDragged = (zone: SolDragPayload['zone'], colIdx: number, cardIdx: number) => {
    if (!activeDrag) return false;
    const p = activeDrag.payload;
    if (p.zone !== zone || p.colIdx !== colIdx) return false;
    if (zone === 'col') return cardIdx >= p.cardIdx;
    return cardIdx === p.cardIdx;
  };

  // Compute y-offset for each card in a tableau column (tight 6px face-down, crisp 20px face-up!)
  const getColOffsets = (col: PlayingCardData[]) => {
    const faceUpCount = col.filter((c) => c.faceUp).length;
    const upGap = faceUpCount > 11 ? 15 : FACEUP_GAP;
    const offsets: number[] = [];
    let y = 0;
    for (let i = 0; i < col.length; i++) {
      offsets.push(y);
      y += col[i].faceUp ? upGap : FACEDOWN_GAP;
    }
    return { offsets, upGap, totalHeight: Math.max(CARD_H, y + CARD_H) };
  };

  const visibleWaste = drawCount === 3 ? waste.slice(-3) : waste.slice(-1);
  const vegasExhausted =
    scoringMode === 'vegas' && stock.length === 0 && stockPasses >= (drawCount === 1 ? 0 : 2);

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
      {/* Classic Windows XP Solitaire Menu Bar */}
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
            <div className="xp-dropdown-menu" style={{ left: 0, top: '100%', minWidth: 185 }}>
              <div className="xp-dropdown-item" onClick={() => dealNewGame()}>
                <span>Deal</span>
                <span style={{ marginLeft: 'auto', color: '#666' }}>F2</span>
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
                onClick={() => {
                  setOpenMenu(null);
                  setDeckDialogOpen(true);
                }}
              >
                <span>Deck...</span>
              </div>
              <div
                className="xp-dropdown-item"
                onClick={() => {
                  setOpenMenu(null);
                  setOptionsDialogOpen(true);
                }}
              >
                <span>Options...</span>
              </div>
              <div className="xp-dropdown-sep" />
              <div
                className="xp-dropdown-item"
                onClick={() => {
                  setOpenMenu(null);
                  setWon(true);
                  playSound('gameWin');
                }}
              >
                <span>Preview Waterfall Win</span>
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
            <div className="xp-dropdown-menu" style={{ left: 0, top: '100%', minWidth: 250 }}>
              <div
                className="xp-dropdown-item"
                onClick={() => {
                  setOpenMenu(null);
                  alert(
                    'TrillXP Solitaire (sol.exe)\n\n• Drag & drop single cards or full stacks live with zero lag!\n• Or tap/click a card to select and tap a column/foundation to place.\n• Double-click/double-tap a card to send it straight to its Foundation.\n• Right-click the green felt to auto-send eligible cards up!'
                  );
                }}
              >
                How to Play Solitaire...
              </div>
            </div>
          )}
        </div>

        {canAutoComplete && (
          <button
            className="xp-btn xp-btn-primary"
            style={{ marginLeft: 'auto', height: 19, padding: '0 8px', fontSize: 10 }}
            onClick={runAutoComplete}
          >
            ✨ Auto-Complete All Cards
          </button>
        )}
      </div>

      {/* Main Felt Board */}
      {won ? (
        <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
          <canvas
            ref={canvasRef}
            width={680}
            height={460}
            style={{ width: '100%', height: '100%', display: 'block' }}
          />
          <div
            className="xp-window"
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: 260,
              padding: 0,
            }}
          >
            <div className="xp-titlebar" style={{ height: 24 }}>
              <span className="xp-titlebar-text">Solitaire</span>
            </div>
            <div style={{ padding: 14, background: '#ece9d8', fontSize: 12, textAlign: 'center' }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Deal again?</div>
              <div style={{ fontSize: 11, color: '#333', marginBottom: 12 }}>
                Final Score: <b>{scoringMode === 'vegas' ? `$${score}` : score}</b> • Time: <b>{seconds}s</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
                <button className="xp-btn xp-btn-primary" onClick={() => dealNewGame()}>
                  Yes
                </button>
                <button className="xp-btn" onClick={() => setWon(false)}>
                  No
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div
          ref={boardRef}
          onContextMenu={(e) => {
            e.preventDefault();
            handleAutoSendEligible();
          }}
          onClick={() => setSelected(null)}
          style={{
            flex: 1,
            padding: '12px 16px',
            overflowY: 'auto',
            overflowX: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
          }}
        >
          {/* Classic 7-Slot Top Row: [Stock] [Waste] [Spacer] [Found 0..3] */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
              gap: 10,
              maxWidth: 620,
              width: '100%',
              margin: '0 auto 18px auto',
              alignItems: 'start',
            }}
          >
            {/* Slot 0: Stock Pile */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  handleStockClick();
                }}
                style={{
                  width: CARD_W,
                  height: CARD_H,
                  borderRadius: 4,
                  position: 'relative',
                  cursor: 'pointer',
                  background: stock.length === 0 ? 'rgba(0, 56, 0, 0.45)' : 'transparent',
                  border: stock.length === 0 ? '1px solid #004d00' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxSizing: 'border-box',
                }}
                title={stock.length > 0 ? `Click to draw ${drawCount}` : 'Click to recycle waste pile'}
              >
                {stock.length > 0 ? (
                  <>
                    {/* Subtle 3D deck thickness */}
                    {stock.length > 8 && (
                      <div
                        style={{
                          position: 'absolute',
                          left: 2,
                          top: 2,
                          width: CARD_W,
                          height: CARD_H,
                          borderRadius: 4,
                          background: '#cbd5e1',
                          border: '1px solid #111',
                        }}
                      />
                    )}
                    <CardBackView
                      design={cardBack}
                      width={CARD_W}
                      height={CARD_H}
                      style={{ position: 'relative', zIndex: 2 }}
                    />
                  </>
                ) : vegasExhausted ? (
                  /* Classic red X when Vegas passes run out */
                  <svg width="42" height="42" viewBox="0 0 42 42">
                    <path d="M9 9 L33 33 M33 9 L9 33" stroke="#ef4444" strokeWidth="6" strokeLinecap="round" />
                  </svg>
                ) : (
                  /* Classic bright green O circle from Windows XP sol.exe! */
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: '50%',
                      border: '6px solid #00d200',
                      boxSizing: 'border-box',
                    }}
                  />
                )}
              </div>
            </div>

            {/* Slot 1 (+ overhang into Slot 2 in Draw-3): Waste Pile */}
            <div style={{ display: 'flex', justifyContent: 'center', position: 'relative', zIndex: 4 }}>
              <div style={{ width: CARD_W, height: CARD_H, position: 'relative' }}>
                {visibleWaste.map((card, i) => {
                  const realWasteIdx = waste.length - visibleWaste.length + i;
                  const isTopWaste = i === visibleWaste.length - 1;
                  const dragged = isTopWaste && isCardBeingDragged('waste', 0, realWasteIdx);
                  const isSel =
                    isTopWaste && selected?.zone === 'waste' && selected.cardIdx === realWasteIdx;

                  return (
                    <div
                      key={card.id}
                      onPointerDown={
                        isTopWaste
                          ? (e) =>
                              startPointerInteraction(e, {
                                payload: { zone: 'waste', colIdx: 0, cardIdx: realWasteIdx },
                                cards: [card],
                                canDrag: true,
                              })
                          : undefined
                      }
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        position: 'absolute',
                        left: i * 16,
                        top: 0,
                        width: CARD_W,
                        height: CARD_H,
                        cursor: isTopWaste ? 'grab' : 'default',
                        touchAction: 'none',
                        visibility: dragged ? 'hidden' : 'visible',
                      }}
                    >
                      <CardFaceView suit={card.suit} rank={card.rank} selected={isSel} />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Slot 2: Authentic Klondike Gap Spacer */}
            <div />

            {/* Slots 3..6: 4 Foundation Piles */}
            {foundations.map((pile, fIdx) => {
              const top = pile[pile.length - 1];
              const under = pile[pile.length - 2];
              const topDragged = top && isCardBeingDragged('found', fIdx, pile.length - 1);
              const shownCard = topDragged ? under : top;
              const isSel =
                !topDragged &&
                selected?.zone === 'found' &&
                selected.colIdx === fIdx &&
                selected.cardIdx === pile.length - 1;

              return (
                <div key={fIdx} style={{ display: 'flex', justifyContent: 'center' }}>
                  <div
                    data-drop-zone={`found-${fIdx}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (selected) {
                        executeMoveToFoundation(fIdx, selected);
                      }
                    }}
                    style={{
                      width: CARD_W,
                      height: CARD_H,
                      borderRadius: 4,
                      boxSizing: 'border-box',
                      position: 'relative',
                      cursor: shownCard ? 'grab' : 'pointer',
                      backgroundColor: 'rgba(0, 52, 0, 0.5)',
                      backgroundImage:
                        'repeating-linear-gradient(45deg, rgba(0,0,0,0.18) 0 2px, transparent 2px 5px)',
                      border: '1px solid #004200',
                      boxShadow: 'inset 1px 1px 2px rgba(0,0,0,0.45)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      touchAction: 'none',
                    }}
                  >
                    {shownCard ? (
                      <div
                        onPointerDown={(e) =>
                          startPointerInteraction(e, {
                            payload: { zone: 'found', colIdx: fIdx, cardIdx: pile.length - 1 },
                            cards: [top],
                            canDrag: true,
                          })
                        }
                        style={{ width: CARD_W, height: CARD_H, touchAction: 'none' }}
                      >
                        <CardFaceView suit={shownCard.suit} rank={shownCard.rank} selected={isSel} />
                      </div>
                    ) : (
                      <div style={{ opacity: 0.35 }}>
                        <SuitGlyph suit={SUITS[fIdx]} size={24} color="#a7f3d0" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 7 Tableau Columns */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
              gap: 10,
              maxWidth: 620,
              width: '100%',
              margin: '0 auto',
              flex: 1,
            }}
          >
            {tableau.map((col, cIdx) => {
              const { offsets, upGap, totalHeight } = getColOffsets(col);
              return (
                <div
                  key={cIdx}
                  data-drop-zone={`col-${cIdx}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (selected) {
                      executeMoveToTableau(cIdx, selected);
                    }
                  }}
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    minHeight: Math.max(260, totalHeight),
                    position: 'relative',
                  }}
                >
                  <div style={{ width: CARD_W, position: 'relative', minHeight: CARD_H }}>
                    {/* Empty column outline */}
                    {col.length === 0 && (
                      <div
                        style={{
                          width: CARD_W,
                          height: CARD_H,
                          borderRadius: 4,
                          border: '1px dashed rgba(0, 60, 0, 0.75)',
                          background: 'rgba(0, 56, 0, 0.22)',
                          boxSizing: 'border-box',
                        }}
                      />
                    )}

                    {col.map((card, rIdx) => {
                      const dragged = isCardBeingDragged('col', cIdx, rIdx);
                      const isSel =
                        selected?.zone === 'col' &&
                        selected.colIdx === cIdx &&
                        rIdx >= selected.cardIdx &&
                        card.faceUp;

                      return (
                        <div
                          key={card.id}
                          onPointerDown={(e) => {
                            if (!card.faceUp) {
                              // If top face-down card somehow unflipped, flip on click
                              if (rIdx === col.length - 1) {
                                e.stopPropagation();
                                setTableau((prev) =>
                                  prev.map((arr, idx) =>
                                    idx === cIdx
                                      ? [...arr.slice(0, -1), { ...card, faceUp: true }]
                                      : arr
                                  )
                                );
                                playSound('cardFlip');
                              }
                              return;
                            }
                            startPointerInteraction(e, {
                              payload: { zone: 'col', colIdx: cIdx, cardIdx: rIdx },
                              cards: col.slice(rIdx),
                              canDrag: true,
                              stackGap: upGap,
                            });
                          }}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            position: 'absolute',
                            top: offsets[rIdx],
                            left: 0,
                            width: CARD_W,
                            height: CARD_H,
                            cursor: card.faceUp ? 'grab' : 'default',
                            touchAction: card.faceUp ? 'none' : 'auto',
                            visibility: dragged ? 'hidden' : 'visible',
                            zIndex: rIdx + 1,
                          }}
                        >
                          {card.faceUp ? (
                            <CardFaceView suit={card.suit} rank={card.rank} selected={isSel} />
                          ) : (
                            <CardBackView design={cardBack} width={CARD_W} height={CARD_H} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Authentic Windows XP Solitaire Bottom Status Bar */}
      {showStatusBar && (
        <div
          style={{
            height: 22,
            background: '#ece9d8',
            borderTop: '1px solid #ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 8px',
            fontSize: 11,
            color: '#000',
            flexShrink: 0,
          }}
        >
          <span style={{ color: '#444' }}>
            {drawCount === 3 ? 'Draw Three' : 'Draw One'} •{' '}
            {scoringMode === 'vegas' ? 'Vegas' : scoringMode === 'standard' ? 'Standard' : 'No Scoring'} (Drag or Tap cards • Right-click auto-send)
          </span>
          <div style={{ display: 'flex', gap: 14, fontWeight: 600 }}>
            {scoringMode !== 'none' && (
              <span>
                Score: {scoringMode === 'vegas' ? (score < 0 ? `-$${Math.abs(score)}` : `$${score}`) : score}
              </span>
            )}
            {timedGame && <span>Time: {seconds}</span>}
          </div>
        </div>
      )}

      {/* Choose Card Back Dialog (Game -> Deck...) */}
      {deckDialogOpen && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 80,
          }}
          onClick={() => setDeckDialogOpen(false)}
        >
          <div
            className="xp-window"
            style={{ width: 360, position: 'relative' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="xp-titlebar" style={{ height: 24 }}>
              <span className="xp-titlebar-text">Select Card Back</span>
            </div>
            <div style={{ padding: 12, background: '#ece9d8', fontSize: 11 }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 10,
                  marginBottom: 12,
                }}
              >
                {CARD_BACK_DESIGNS.map((d) => (
                  <div
                    key={d.id}
                    onClick={() => setCardBack(d.id)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                      padding: 4,
                      borderRadius: 4,
                      cursor: 'pointer',
                      border: cardBack === d.id ? '2px solid #316ac5' : '2px solid transparent',
                      background: cardBack === d.id ? '#dbeafe' : 'transparent',
                    }}
                  >
                    <CardBackView design={d.id} width={54} height={74} />
                    <span style={{ fontSize: 10, textAlign: 'center' }}>{d.name}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                <button className="xp-btn xp-btn-primary" onClick={() => setDeckDialogOpen(false)}>
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Solitaire Options Dialog (Game -> Options...) */}
      {optionsDialogOpen && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 80,
          }}
          onClick={() => setOptionsDialogOpen(false)}
        >
          <div
            className="xp-window"
            style={{ width: 320, position: 'relative' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="xp-titlebar" style={{ height: 24 }}>
              <span className="xp-titlebar-text">Options</span>
            </div>
            <div style={{ padding: 14, background: '#ece9d8', fontSize: 11, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <fieldset style={{ border: '1px solid #aca899', padding: 8 }}>
                  <legend>Draw</legend>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                    <input
                      type="radio"
                      checked={drawCount === 1}
                      onChange={() => setDrawCount(1)}
                    />
                    Draw one
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <input
                      type="radio"
                      checked={drawCount === 3}
                      onChange={() => setDrawCount(3)}
                    />
                    Draw three
                  </label>
                </fieldset>

                <fieldset style={{ border: '1px solid #aca899', padding: 8 }}>
                  <legend>Scoring</legend>
                  {(['standard', 'vegas', 'none'] as ScoringMode[]).map((m) => (
                    <label key={m} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                      <input
                        type="radio"
                        checked={scoringMode === m}
                        onChange={() => setScoringMode(m)}
                      />
                      {m === 'standard' ? 'Standard' : m === 'vegas' ? 'Vegas' : 'None'}
                    </label>
                  ))}
                </fieldset>
              </div>

              <div style={{ display: 'flex', gap: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <input type="checkbox" checked={timedGame} onChange={(e) => setTimedGame(e.target.checked)} />
                  Timed game
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <input
                    type="checkbox"
                    checked={showStatusBar}
                    onChange={(e) => setShowStatusBar(e.target.checked)}
                  />
                  Status bar
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                <button
                  className="xp-btn xp-btn-primary"
                  onClick={() => {
                    setOptionsDialogOpen(false);
                    dealNewGame(drawCount, scoringMode);
                  }}
                >
                  OK (Redeals)
                </button>
                <button className="xp-btn" onClick={() => setOptionsDialogOpen(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Zero-Lag Floating GPU Card Drag Layer */}
      <FloatingCardDragOverlay activeDrag={activeDrag} overlayRef={overlayRef} />
    </div>
  );
};

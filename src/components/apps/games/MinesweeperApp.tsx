import React, { useState, useEffect, useCallback } from 'react';
import { useSound } from '../../../context/SoundContext';

type Difficulty = 'beginner' | 'intermediate' | 'expert';

interface Cell {
  mine: boolean;
  revealed: boolean;
  flagged: boolean;
  question: boolean;
  exploded?: boolean;
  neighbors: number;
}

const CONFIGS: Record<Difficulty, { rows: number; cols: number; mines: number }> = {
  beginner: { rows: 9, cols: 9, mines: 10 },
  intermediate: { rows: 16, cols: 16, mines: 40 },
  expert: { rows: 16, cols: 30, mines: 99 },
};

const NUM_COLORS = ['', '#0000ff', '#008000', '#ff0000', '#000080', '#800000', '#008080', '#000000', '#808080'];

function createEmptyBoard(rows: number, cols: number): Cell[][] {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      mine: false,
      revealed: false,
      flagged: false,
      question: false,
      neighbors: 0,
    }))
  );
}

export const MinesweeperApp: React.FC = () => {
  const { playSound } = useSound();
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner');
  const [board, setBoard] = useState<Cell[][]>(() => createEmptyBoard(9, 9));
  const [status, setStatus] = useState<'idle' | 'playing' | 'won' | 'lost'>('idle');
  const [pressing, setPressing] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  const cfg = CONFIGS[difficulty];

  const resetGame = useCallback((diff: Difficulty = difficulty) => {
    const c = CONFIGS[diff];
    setDifficulty(diff);
    setBoard(createEmptyBoard(c.rows, c.cols));
    setStatus('idle');
    setSeconds(0);
    setMenuOpen(false);
  }, [difficulty]);

  useEffect(() => {
    if (status !== 'playing') return;
    const iv = window.setInterval(() => setSeconds((s) => Math.min(999, s + 1)), 1000);
    return () => clearInterval(iv);
  }, [status]);

  const plantMines = (initialBoard: Cell[][], safeR: number, safeC: number) => {
    const next = initialBoard.map((row) => row.map((cell) => ({ ...cell })));
    let placed = 0;
    while (placed < cfg.mines) {
      const r = Math.floor(Math.random() * cfg.rows);
      const c = Math.floor(Math.random() * cfg.cols);
      if (next[r][c].mine) continue;
      if (Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1) continue;
      next[r][c].mine = true;
      placed++;
    }
    for (let r = 0; r < cfg.rows; r++) {
      for (let c = 0; c < cfg.cols; c++) {
        if (next[r][c].mine) continue;
        let cnt = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < cfg.rows && nc >= 0 && nc < cfg.cols && next[nr][nc].mine) cnt++;
          }
        }
        next[r][c].neighbors = cnt;
      }
    }
    return next;
  };

  const revealCell = (r: number, c: number) => {
    if (status === 'won' || status === 'lost') return;
    let cur = board.map((row) => row.map((cell) => ({ ...cell })));
    if (cur[r][c].flagged || cur[r][c].revealed) return;

    if (status === 'idle') {
      cur = plantMines(cur, r, c);
      setStatus('playing');
    }

    if (cur[r][c].mine) {
      cur[r][c].exploded = true;
      for (let rr = 0; rr < cfg.rows; rr++) {
        for (let cc = 0; cc < cfg.cols; cc++) {
          if (cur[rr][cc].mine) cur[rr][cc].revealed = true;
        }
      }
      setBoard(cur);
      setStatus('lost');
      playSound('gameLose');
      return;
    }

    const stack: Array<[number, number]> = [[r, c]];
    while (stack.length > 0) {
      const [cr, cc] = stack.pop()!;
      if (cur[cr][cc].revealed || cur[cr][cc].flagged) continue;
      cur[cr][cc].revealed = true;
      if (cur[cr][cc].neighbors === 0) {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = cr + dr;
            const nc = cc + dc;
            if (nr >= 0 && nr < cfg.rows && nc >= 0 && nc < cfg.cols && !cur[nr][nc].revealed) {
              stack.push([nr, nc]);
            }
          }
        }
      }
    }

    // Check win
    let unrevealedSafe = 0;
    for (let rr = 0; rr < cfg.rows; rr++) {
      for (let cc = 0; cc < cfg.cols; cc++) {
        if (!cur[rr][cc].mine && !cur[rr][cc].revealed) unrevealedSafe++;
      }
    }
    setBoard(cur);
    if (unrevealedSafe === 0) {
      setStatus('won');
      playSound('gameWin');
    }
  };

  const toggleFlag = (e: React.MouseEvent, r: number, c: number) => {
    e.preventDefault();
    if (status === 'won' || status === 'lost') return;
    const next = board.map((row) => row.map((cell) => ({ ...cell })));
    const target = next[r][c];
    if (target.revealed) return;
    if (!target.flagged && !target.question) {
      target.flagged = true;
    } else if (target.flagged) {
      target.flagged = false;
      target.question = true;
    } else {
      target.question = false;
    }
    setBoard(next);
  };

  const flagsCount = board.flat().filter((c) => c.flagged).length;
  const minesLeft = Math.max(-99, cfg.mines - flagsCount);

  const formatLed = (val: number) => {
    if (val < 0) return `-${String(Math.abs(val)).padStart(2, '0')}`;
    return String(Math.min(999, val)).padStart(3, '0');
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#c0c0c0', overflow: 'auto' }}>
      {/* Menu Bar */}
      <div className="xp-menubar" style={{ background: '#ece9d8' }}>
        <div
          className="xp-menu-item"
          onClick={() => setMenuOpen((v) => !v)}
        >
          Game
          {menuOpen && (
            <div className="xp-dropdown-menu" onClick={(e) => e.stopPropagation()}>
              <div className="xp-dropdown-option" onClick={() => resetGame(difficulty)}>
                New (F2)
              </div>
              <div className="xp-dropdown-sep" />
              <div className="xp-dropdown-option" onClick={() => resetGame('beginner')}>
                {difficulty === 'beginner' ? '✓ ' : ''}Beginner (9×9)
              </div>
              <div className="xp-dropdown-option" onClick={() => resetGame('intermediate')}>
                {difficulty === 'intermediate' ? '✓ ' : ''}Intermediate (16×16)
              </div>
              <div className="xp-dropdown-option" onClick={() => resetGame('expert')}>
                {difficulty === 'expert' ? '✓ ' : ''}Expert (30×16)
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Classic 3D Minesweeper Arena */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 10 }}>
        <div className="xp-bevel-raised" style={{ background: '#c0c0c0', padding: 8 }}>
          {/* Top LED + Smiley Header */}
          <div
            className="xp-bevel-sunken"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '4px 7px',
              marginBottom: 8,
              background: '#c0c0c0',
            }}
          >
            <div
              style={{
                background: '#000',
                color: '#ff1a1a',
                fontFamily: "'Courier New', monospace",
                fontWeight: 900,
                fontSize: 21,
                padding: '1px 5px',
                letterSpacing: 2,
                border: '1px inset #808080',
              }}
            >
              {formatLed(minesLeft)}
            </div>

            <button
              onClick={() => resetGame(difficulty)}
              className="xp-bevel-raised"
              style={{
                width: 28,
                height: 28,
                background: '#c0c0c0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: 16,
                padding: 0,
              }}
            >
              {status === 'lost' ? '😵' : status === 'won' ? '😎' : pressing ? '😮' : '🙂'}
            </button>

            <div
              style={{
                background: '#000',
                color: '#ff1a1a',
                fontFamily: "'Courier New', monospace",
                fontWeight: 900,
                fontSize: 21,
                padding: '1px 5px',
                letterSpacing: 2,
                border: '1px inset #808080',
              }}
            >
              {formatLed(seconds)}
            </div>
          </div>

          {/* Grid */}
          <div
            className="xp-bevel-sunken"
            onMouseDown={() => setPressing(true)}
            onMouseUp={() => setPressing(false)}
            onMouseLeave={() => setPressing(false)}
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${cfg.cols}, 20px)`,
              background: '#808080',
            }}
          >
            {board.map((row, r) =>
              row.map((cell, c) => (
                <div
                  key={`${r}-${c}`}
                  onClick={() => revealCell(r, c)}
                  onContextMenu={(e) => toggleFlag(e, r, c)}
                  className={cell.revealed ? '' : 'xp-bevel-raised'}
                  style={{
                    width: 20,
                    height: 20,
                    background: cell.exploded ? '#ff0000' : '#c0c0c0',
                    border: cell.revealed ? '1px solid #808080' : undefined,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: 13,
                    color: NUM_COLORS[cell.neighbors] || '#000',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  {cell.revealed
                    ? cell.mine
                      ? '💣'
                      : cell.neighbors > 0
                      ? cell.neighbors
                      : ''
                    : cell.flagged
                    ? '🚩'
                    : cell.question
                    ? '?'
                    : ''}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

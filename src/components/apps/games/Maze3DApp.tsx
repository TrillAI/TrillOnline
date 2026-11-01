import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useOS } from '../../../context/OSContext';
import { useSound } from '../../../context/SoundContext';

export type MazeSkin = 'brick' | 'stone' | 'psychedelic' | 'hedge';

interface SpriteEntity {
  x: number;
  y: number;
  kind: 'start' | 'smiley_exit' | 'rat' | 'fliprock' | 'gem';
  vx?: number;
  vy?: number;
  collected?: boolean;
}

// Generate odd-dimension perfect maze where 1 = regular wall, 2 = wall with OpenGL logo frame, 0 = corridor
function generateMazeGrid(cellsW: number, cellsH: number): number[][] {
  const gw = cellsW * 2 + 1;
  const gh = cellsH * 2 + 1;
  const grid: number[][] = Array.from({ length: gh }, () => Array(gw).fill(1));

  const visited: boolean[][] = Array.from({ length: cellsH }, () => Array(cellsW).fill(false));
  const stack: Array<[number, number]> = [[0, 0]];
  visited[0][0] = true;
  grid[1][1] = 0;

  const dirs: Array<[number, number]> = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ];

  while (stack.length > 0) {
    const [cx, cy] = stack[stack.length - 1];
    const neighbors: Array<[number, number, number, number]> = [];
    for (const [dx, dy] of dirs) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx >= 0 && ny >= 0 && nx < cellsW && ny < cellsH && !visited[ny][nx]) {
        neighbors.push([nx, ny, dx, dy]);
      }
    }
    if (neighbors.length === 0) {
      stack.pop();
    } else {
      const [nx, ny, dx, dy] = neighbors[Math.floor(Math.random() * neighbors.length)];
      visited[ny][nx] = true;
      grid[cy * 2 + 1 + dy][cx * 2 + 1 + dx] = 0;
      grid[ny * 2 + 1][nx * 2 + 1] = 0;
      stack.push([nx, ny]);
    }
  }

  // Place classic Win95 OpenGL picture frames on ~10% of interior brick walls!
  for (let y = 1; y < gh - 1; y++) {
    for (let x = 1; x < gw - 1; x++) {
      if (grid[y][x] === 1 && (x * 7 + y * 13) % 11 === 0) {
        grid[y][x] = 2;
      }
    }
  }

  return grid;
}

function buildWallTextures(): {
  walls: Record<MazeSkin, HTMLCanvasElement>;
  openglWall: HTMLCanvasElement;
} {
  const makeTex = (draw: (ctx: CanvasRenderingContext2D) => void) => {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 64;
    const ctx = c.getContext('2d')!;
    draw(ctx);
    return c;
  };

  const drawRedBrick = (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = '#c4c7cc'; // classic Win95 light gray mortar
    ctx.fillRect(0, 0, 64, 64);
    const rows = 4;
    const rowH = 16;
    for (let r = 0; r < rows; r++) {
      const offset = r % 2 === 0 ? 0 : -16;
      for (let bx = offset; bx < 64; bx += 32) {
        ctx.fillStyle = (r + bx) % 3 === 0 ? '#9e2a1c' : '#b63525';
        ctx.fillRect(bx + 1, r * rowH + 1, 30, rowH - 2);
        ctx.fillStyle = '#d3503e';
        ctx.fillRect(bx + 1, r * rowH + 1, 30, 2);
        ctx.fillStyle = '#751b11';
        ctx.fillRect(bx + 1, (r + 1) * rowH - 2, 30, 1);
      }
    }
  };

  const brick = makeTex(drawRedBrick);

  // Brick wall with mounted 90s "OpenGL" picture plaque (iconic Win95 3D Maze Easter egg!)
  const openglWall = makeTex((ctx) => {
    drawRedBrick(ctx);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(10, 16, 44, 32);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 16, 44, 32);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(32, 32, 15, 8, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 8px sans-serif';
    ctx.fillText('OpenGL', 16, 35);
  });

  const stone = makeTex((ctx) => {
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, 0, 64, 64);
    const blocks = [
      [1, 1, 29, 19, '#64748b'],
      [32, 1, 31, 19, '#475569'],
      [1, 22, 18, 20, '#475569'],
      [21, 22, 24, 20, '#64748b'],
      [47, 22, 16, 20, '#52525b'],
      [1, 44, 34, 19, '#52525b'],
      [37, 44, 26, 19, '#64748b'],
    ] as const;
    for (const [x, y, w, h, col] of blocks) {
      ctx.fillStyle = col;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(x, y, w, 2);
    }
  });

  const psychedelic = makeTex((ctx) => {
    for (let y = 0; y < 64; y += 2) {
      for (let x = 0; x < 64; x += 2) {
        const hue = Math.round((Math.sin(x * 0.14) * 90 + Math.cos(y * 0.14) * 90 + (x + y) * 3) % 360);
        ctx.fillStyle = `hsl(${(hue + 360) % 360}, 85%, 52%)`;
        ctx.fillRect(x, y, 2, 2);
      }
    }
  });

  const hedge = makeTex((ctx) => {
    ctx.fillStyle = '#14532d';
    ctx.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 140; i++) {
      const lx = (i * 19) % 60;
      const ly = (i * 31) % 60;
      ctx.fillStyle = i % 3 === 0 ? '#22c55e' : i % 2 === 0 ? '#15803d' : '#166534';
      ctx.fillRect(lx, ly, 5, 4);
    }
  });

  return { walls: { brick, stone, psychedelic, hedge }, openglWall };
}

export const Maze3DCanvas: React.FC<{
  autoPlay: boolean;
  skin: MazeSkin;
  cellsSize?: number;
  showMinimap?: boolean;
  externalMoveRef?: React.MutableRefObject<{ fwd: number; turn: number }>;
  onStats?: (stats: { solvedCount: number; gems: number; totalGems: number; upsideDown: boolean }) => void;
}> = ({ autoPlay, skin, cellsSize = 9, showMinimap = true, externalMoveRef, onStats }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const keysRef = useRef<Record<string, boolean>>({});
  const skinRef = useRef<MazeSkin>(skin);
  const autoPlayRef = useRef<boolean>(autoPlay);
  const showMapRef = useRef<boolean>(showMinimap);
  const { playSound } = useSound();

  skinRef.current = skin;
  autoPlayRef.current = autoPlay;
  showMapRef.current = showMinimap;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { walls, openglWall } = buildWallTextures();
    let grid = generateMazeGrid(cellsSize, cellsSize);
    let gh = grid.length;
    let gw = grid[0].length;

    let px = 1.5;
    let py = 1.5;
    let pa = 0;
    let solvedCount = 0;
    let upsideDown = false;
    let rollAngle = 0;

    let autoCellX = 1;
    let autoCellY = 1;
    let autoDir = 0;
    let autoAnim:
      | { kind: 'move'; fromX: number; fromY: number; toX: number; toY: number; t: number }
      | { kind: 'turn'; fromA: number; toA: number; t: number }
      | null = null;

    let sprites: SpriteEntity[] = [];
    let gemsCollected = 0;
    let totalGems = 0;

    const spawnMazeEntities = () => {
      sprites = [];
      gemsCollected = 0;
      // Floating Windows Start Sign near entrance + Iconic Yellow Smiley Face Exit Goal!
      sprites.push({ x: 1.5, y: 1.5, kind: 'start' });
      sprites.push({ x: gw - 1.5, y: gh - 1.5, kind: 'smiley_exit' });

      const openCells: Array<[number, number]> = [];
      for (let y = 1; y < gh - 1; y++) {
        for (let x = 1; x < gw - 1; x++) {
          if (grid[y][x] === 0 && !(x === 1 && y === 1) && !(x === gw - 2 && y === gh - 2)) {
            openCells.push([x, y]);
          }
        }
      }
      for (let i = openCells.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [openCells[i], openCells[j]] = [openCells[j], openCells[i]];
      }

      let idx = 0;
      for (let i = 0; i < 2 && idx < openCells.length; i++, idx++) {
        const [cx, cy] = openCells[idx];
        sprites.push({ x: cx + 0.5, y: cy + 0.5, kind: 'fliprock' });
      }
      for (let i = 0; i < 3 && idx < openCells.length; i++, idx++) {
        const [cx, cy] = openCells[idx];
        sprites.push({ x: cx + 0.5, y: cy + 0.5, kind: 'rat', vx: 1.4, vy: 0 });
      }
      totalGems = Math.min(5, Math.max(0, openCells.length - idx));
      for (let i = 0; i < totalGems && idx < openCells.length; i++, idx++) {
        const [cx, cy] = openCells[idx];
        sprites.push({ x: cx + 0.5, y: cy + 0.5, kind: 'gem' });
      }

      onStats?.({ solvedCount, gems: gemsCollected, totalGems, upsideDown });
    };

    const resetMaze = (incrementSolved: boolean) => {
      if (incrementSolved) {
        solvedCount++;
        if (!autoPlayRef.current) {
          playSound('gameWin');
        }
      }
      grid = generateMazeGrid(cellsSize, cellsSize);
      gh = grid.length;
      gw = grid[0].length;
      px = 1.5;
      py = 1.5;
      pa = grid[1][2] === 0 ? 0 : Math.PI / 2;
      autoCellX = 1;
      autoCellY = 1;
      autoDir = grid[1][2] === 0 ? 0 : 1;
      autoAnim = null;
      upsideDown = false;
      spawnMazeEntities();
    };

    spawnMazeEntities();
    if (grid[1][2] !== 0) {
      pa = Math.PI / 2;
      autoDir = 1;
    }

    const dirVec = [
      [1, 0],
      [0, 1],
      [-1, 0],
      [0, -1],
    ];

    let lastTime = performance.now();
    let raf = 0;

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      const targetRoll = upsideDown ? Math.PI : 0;
      rollAngle += (targetRoll - rollAngle) * Math.min(1, dt * 6.5);

      for (const s of sprites) {
        if (s.kind === 'rat') {
          const speed = 1.35 * dt;
          const nx = s.x + (s.vx || 0) * speed;
          const ny = s.y + (s.vy || 0) * speed;
          if (grid[Math.floor(ny)]?.[Math.floor(nx)] === 0) {
            s.x = nx;
            s.y = ny;
          } else {
            const d = dirVec[Math.floor(Math.random() * 4)];
            s.vx = d[0];
            s.vy = d[1];
          }
        }
      }

      if (autoPlayRef.current) {
        if (!autoAnim) {
          const order = [(autoDir + 1) % 4, autoDir, (autoDir + 3) % 4, (autoDir + 2) % 4];
          let chosen = autoDir;
          for (const cand of order) {
            const [dx, dy] = dirVec[cand];
            if (grid[autoCellY + dy]?.[autoCellX + dx] === 0) {
              chosen = cand;
              break;
            }
          }
          if (chosen !== autoDir) {
            let diff = ((chosen - autoDir) * Math.PI) / 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            autoAnim = { kind: 'turn', fromA: pa, toA: pa + diff, t: 0 };
            autoDir = chosen;
          } else {
            const [dx, dy] = dirVec[autoDir];
            autoAnim = {
              kind: 'move',
              fromX: autoCellX + 0.5,
              fromY: autoCellY + 0.5,
              toX: autoCellX + dx + 0.5,
              toY: autoCellY + dy + 0.5,
              t: 0,
            };
            autoCellX += dx;
            autoCellY += dy;
          }
        } else if (autoAnim.kind === 'turn') {
          autoAnim.t += dt * 3.1;
          if (autoAnim.t >= 1) {
            pa = autoAnim.toA;
            autoAnim = null;
          } else {
            pa = autoAnim.fromA + (autoAnim.toA - autoAnim.fromA) * autoAnim.t;
          }
        } else if (autoAnim.kind === 'move') {
          autoAnim.t += dt * 3.4;
          if (autoAnim.t >= 1) {
            px = autoAnim.toX;
            py = autoAnim.toY;
            autoAnim = null;
          } else {
            px = autoAnim.fromX + (autoAnim.toX - autoAnim.fromX) * autoAnim.t;
            py = autoAnim.fromY + (autoAnim.toY - autoAnim.fromY) * autoAnim.t;
          }
        }
      } else {
        const k = keysRef.current;
        const ext = externalMoveRef?.current || { fwd: 0, turn: 0 };
        const turnInput =
          (k['arrowright'] || k['d'] ? 1 : 0) -
          (k['arrowleft'] || k['a'] ? 1 : 0) +
          ext.turn * (upsideDown ? -1 : 1);
        const fwdInput =
          (k['arrowup'] || k['w'] ? 1 : 0) - (k['arrowdown'] || k['s'] ? 1 : 0) + ext.fwd;

        pa += turnInput * 2.55 * dt * (upsideDown ? -1 : 1);
        if (fwdInput !== 0) {
          const moveStep = fwdInput * 3.15 * dt;
          const nx = px + Math.cos(pa) * moveStep;
          const ny = py + Math.sin(pa) * moveStep;
          const pad = 0.22;
          if (grid[Math.floor(py)]?.[Math.floor(nx + Math.sign(Math.cos(pa)) * pad)] === 0) {
            px = nx;
          }
          if (grid[Math.floor(ny + Math.sign(Math.sin(pa)) * pad)]?.[Math.floor(px)] === 0) {
            py = ny;
          }
          autoCellX = Math.floor(px);
          autoCellY = Math.floor(py);
        }
      }

      for (const s of sprites) {
        if (s.collected || s.kind === 'start') continue;
        const dist = Math.hypot(s.x - px, s.y - py);
        if (dist < 0.44) {
          if (s.kind === 'smiley_exit') {
            resetMaze(true);
            break;
          } else if (s.kind === 'fliprock') {
            s.collected = true;
            upsideDown = !upsideDown;
            onStats?.({ solvedCount, gems: gemsCollected, totalGems, upsideDown });
          } else if (s.kind === 'gem') {
            s.collected = true;
            gemsCollected++;
            if (!autoPlayRef.current) playSound('ding');
            onStats?.({ solvedCount, gems: gemsCollected, totalGems, upsideDown });
          }
        }
      }

      // ================== RENDER 3D WIN95 RAYCAST SCENE ==================
      const W = canvas.width;
      const H = canvas.height;
      ctx.save();
      if (Math.abs(rollAngle) > 0.005) {
        ctx.translate(W / 2, H / 2);
        ctx.rotate(rollAngle);
        ctx.translate(-W / 2, -H / 2);
      }

      // Classic Win95 Acoustic Gray-White Ceiling + Warm Brown Wood-Plank Floor!
      const ceilGrad = ctx.createLinearGradient(0, 0, 0, H / 2);
      ceilGrad.addColorStop(0, '#cbd5e1');
      ceilGrad.addColorStop(1, '#475569');
      ctx.fillStyle = ceilGrad;
      ctx.fillRect(0, 0, W, H / 2);

      const floorGrad = ctx.createLinearGradient(0, H / 2, 0, H);
      floorGrad.addColorStop(0, '#451a03');
      floorGrad.addColorStop(0.45, '#78350f');
      floorGrad.addColorStop(1, '#9a5b25');
      ctx.fillStyle = floorGrad;
      ctx.fillRect(0, H / 2, W, H / 2);

      const fov = Math.PI / 3;
      const numRays = Math.floor(W / 2);
      const zBuffer = new Float32Array(numRays);

      for (let r = 0; r < numRays; r++) {
        const camX = (2 * r) / numRays - 1;
        const rayAngle = pa + Math.atan(camX * Math.tan(fov / 2));
        const rayDirX = Math.cos(rayAngle);
        const rayDirY = Math.sin(rayAngle);

        let mapX = Math.floor(px);
        let mapY = Math.floor(py);

        const deltaDistX = Math.abs(1 / (rayDirX || 1e-6));
        const deltaDistY = Math.abs(1 / (rayDirY || 1e-6));

        let stepX = 0;
        let stepY = 0;
        let sideDistX = 0;
        let sideDistY = 0;

        if (rayDirX < 0) {
          stepX = -1;
          sideDistX = (px - mapX) * deltaDistX;
        } else {
          stepX = 1;
          sideDistX = (mapX + 1.0 - px) * deltaDistX;
        }
        if (rayDirY < 0) {
          stepY = -1;
          sideDistY = (py - mapY) * deltaDistY;
        } else {
          stepY = 1;
          sideDistY = (mapY + 1.0 - py) * deltaDistY;
        }

        let hitType = 0;
        let side = 0;
        let guard = 0;
        while (hitType === 0 && guard++ < 64) {
          if (sideDistX < sideDistY) {
            sideDistX += deltaDistX;
            mapX += stepX;
            side = 0;
          } else {
            sideDistY += deltaDistY;
            mapY += stepY;
            side = 1;
          }
          const cellVal = grid[mapY]?.[mapX] ?? 1;
          if (cellVal !== 0) hitType = cellVal;
        }

        const rawDist = side === 0 ? sideDistX - deltaDistX : sideDistY - deltaDistY;
        const perpDist = Math.max(0.08, rawDist * Math.cos(rayAngle - pa));
        zBuffer[r] = perpDist;

        const lineH = Math.floor(H / perpDist);
        const drawY = Math.floor((H - lineH) / 2);

        let wallX = side === 0 ? py + rawDist * rayDirY : px + rawDist * rayDirX;
        wallX -= Math.floor(wallX);
        const texX = Math.min(63, Math.max(0, Math.floor(wallX * 64)));

        const wallTex =
          hitType === 2 && skinRef.current === 'brick' ? openglWall : walls[skinRef.current];
        ctx.drawImage(wallTex, texX, 0, 1, 64, r * 2, drawY, 2, lineH);

        const shade = Math.min(0.75, (side === 1 ? 0.22 : 0) + perpDist * 0.08);
        if (shade > 0.02) {
          ctx.fillStyle = `rgba(0,0,0,${shade.toFixed(2)})`;
          ctx.fillRect(r * 2, Math.max(0, drawY), 2, Math.min(H, lineH));
        }
      }

      // Render 3D Sprites (Smiley Face Exit, Windows Start Banner, Gray Rats, Flip Rocks, OpenGL Gems)
      const visibleSprites = sprites
        .filter((s) => !s.collected)
        .map((s) => ({ s, dist: Math.hypot(s.x - px, s.y - py) }))
        .sort((a, b) => b.dist - a.dist);

      for (const { s, dist } of visibleSprites) {
        if (dist < 0.28) continue;
        let angleToSprite = Math.atan2(s.y - py, s.x - px) - pa;
        while (angleToSprite > Math.PI) angleToSprite -= Math.PI * 2;
        while (angleToSprite < -Math.PI) angleToSprite += Math.PI * 2;
        if (Math.abs(angleToSprite) > fov * 0.75) continue;

        const screenX = (0.5 + Math.tan(angleToSprite) / (2 * Math.tan(fov / 2))) * W;
        const size = Math.min(H * 0.9, H / dist);
        const rayIdx = Math.floor(screenX / 2);
        if (rayIdx < 0 || rayIdx >= numRays || zBuffer[rayIdx] < dist - 0.15) continue;

        const bob = Math.sin(now * 0.005 + s.x) * (size * 0.05);

        if (s.kind === 'smiley_exit') {
          // Iconic Windows 95 3D Maze Yellow Smiley Face Goal!
          const rad = size * 0.26;
          const cy = H / 2 + bob;
          ctx.fillStyle = '#facc15';
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = Math.max(1.5, rad * 0.09);
          ctx.beginPath();
          ctx.arc(screenX, cy, rad, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.arc(screenX - rad * 0.34, cy - rad * 0.24, Math.max(1.5, rad * 0.12), 0, Math.PI * 2);
          ctx.arc(screenX + rad * 0.34, cy - rad * 0.24, Math.max(1.5, rad * 0.12), 0, Math.PI * 2);
          ctx.fill();

          ctx.beginPath();
          ctx.arc(screenX, cy + rad * 0.06, rad * 0.56, 0.18 * Math.PI, 0.82 * Math.PI);
          ctx.stroke();
        } else if (s.kind === 'start') {
          const sW = size * 0.42;
          const sH = size * 0.32;
          const sx = screenX - sW / 2;
          const sy = H / 2 - sH / 2;
          ctx.fillStyle = 'rgba(255,255,255,0.85)';
          ctx.fillRect(sx, sy, sW, sH);
          ctx.fillStyle = '#1d4ed8';
          ctx.font = `bold ${Math.max(8, Math.round(sH * 0.42))}px sans-serif`;
          ctx.fillText('START', sx + sW * 0.1, sy + sH * 0.66);
        } else if (s.kind === 'rat') {
          // Detailed Gray Win95 Corridor Rat (body + ears + pink tail + red eye)
          const rw = size * 0.38;
          const rh = size * 0.2;
          const rx = screenX - rw / 2;
          const ry = H / 2 + size * 0.28;
          ctx.strokeStyle = '#fda4af';
          ctx.lineWidth = Math.max(1.5, rw * 0.06);
          ctx.beginPath();
          ctx.moveTo(rx, ry);
          ctx.quadraticCurveTo(rx - rw * 0.35, ry - rh * 0.5, rx - rw * 0.5, ry);
          ctx.stroke();

          ctx.fillStyle = '#9ca3af';
          ctx.beginPath();
          ctx.ellipse(rx + rw / 2, ry, rw / 2, rh / 2, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(rx + rw * 0.72, ry - rh * 0.48, Math.max(2, rw * 0.11), 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(rx + rw * 0.84, ry - rh * 0.12, Math.max(1.5, rw * 0.06), 0, Math.PI * 2);
          ctx.fill();
        } else if (s.kind === 'fliprock') {
          const r = size * 0.21;
          const cx = screenX;
          const cy = H / 2 + bob;
          ctx.fillStyle = '#a8a29e';
          ctx.strokeStyle = '#fde047';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(cx, cy - r);
          ctx.lineTo(cx + r, cy);
          ctx.lineTo(cx, cy + r);
          ctx.lineTo(cx - r, cy);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else if (s.kind === 'gem') {
          const r = size * 0.18;
          const cx = screenX;
          const cy = H / 2 + bob;
          ctx.fillStyle = '#38bdf8';
          ctx.strokeStyle = '#e0f2fe';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(cx, cy - r);
          ctx.lineTo(cx + r * 0.78, cy);
          ctx.lineTo(cx, cy + r);
          ctx.lineTo(cx - r * 0.78, cy);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      }

      ctx.restore();

      if (showMapRef.current) {
        const cellPx = Math.max(3, Math.min(6, Math.floor((W * 0.24) / gw)));
        const mapW = gw * cellPx;
        const mapH = gh * cellPx;
        const ox = W - mapW - 10;
        const oy = 10;

        ctx.fillStyle = 'rgba(0,0,0,0.72)';
        ctx.fillRect(ox - 3, oy - 3, mapW + 6, mapH + 6);
        for (let y = 0; y < gh; y++) {
          for (let x = 0; x < gw; x++) {
            if (grid[y][x] !== 0) {
              ctx.fillStyle = grid[y][x] === 2 ? '#38bdf8' : '#b91c1c';
              ctx.fillRect(ox + x * cellPx, oy + y * cellPx, cellPx, cellPx);
            }
          }
        }
        ctx.fillStyle = '#facc15';
        ctx.fillRect(ox + (gw - 2) * cellPx, oy + (gh - 2) * cellPx, cellPx, cellPx);
        const pmx = ox + px * cellPx;
        const pmy = oy + py * cellPx;
        ctx.fillStyle = '#4ade80';
        ctx.beginPath();
        ctx.arc(pmx, pmy, Math.max(2.2, cellPx * 0.55), 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#4ade80';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(pmx, pmy);
        ctx.lineTo(pmx + Math.cos(pa) * cellPx * 2.2, pmy + Math.sin(pa) * cellPx * 2.2);
        ctx.stroke();
      }

      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [cellsSize, externalMoveRef, onStats, playSound]);

  return (
    <canvas
      ref={canvasRef}
      width={640}
      height={400}
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
        background: '#000',
        imageRendering: 'pixelated',
      }}
    />
  );
};

export const Maze3DApp: React.FC = () => {
  const { setScreensaver, setScreensaverActive } = useOS();
  const [autoPlay, setAutoPlay] = useState(false);
  const [skin, setSkin] = useState<MazeSkin>('brick');
  const [cellsSize, setCellsSize] = useState(9);
  const [showMinimap, setShowMinimap] = useState(true);
  const [stats, setStats] = useState({ solvedCount: 0, gems: 0, totalGems: 5, upsideDown: false });
  const touchMoveRef = useRef<{ fwd: number; turn: number }>({ fwd: 0, turn: 0 });

  const handleStats = useCallback(
    (s: { solvedCount: number; gems: number; totalGems: number; upsideDown: boolean }) => {
      setStats(s);
    },
    []
  );

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#111827', color: '#f8fafc', fontSize: 12 }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          padding: '6px 10px',
          background: '#1e293b',
          borderBottom: '1px solid #334155',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <button
            onClick={() => setAutoPlay((v) => !v)}
            style={{
              padding: '4px 10px',
              borderRadius: 4,
              border: '1px solid #fbbf24',
              background: autoPlay ? '#f59e0b' : '#2563eb',
              color: '#fff',
              fontWeight: 800,
              cursor: 'pointer',
              fontSize: 11,
            }}
          >
            {autoPlay ? '🤖 Mode: Win95 Auto-Solve (Click to Play!)' : '🎮 Mode: First-Person Playable (WASD / Arrows)'}
          </button>

          <select
            value={skin}
            onChange={(e) => setSkin(e.target.value as MazeSkin)}
            style={{ padding: '4px 6px', borderRadius: 4, background: '#0f172a', color: '#fff', border: '1px solid #475569', fontSize: 11 }}
          >
            <option value="brick">🧱 Win95 Red Brick + OpenGL Plaques</option>
            <option value="stone">🏰 Castle Cobblestone</option>
            <option value="psychedelic">🌈 90s OpenGL Tie-Dye</option>
            <option value="hedge">🌿 Royal Hedge Maze</option>
          </select>

          <select
            value={cellsSize}
            onChange={(e) => setCellsSize(Number(e.target.value))}
            style={{ padding: '4px 6px', borderRadius: 4, background: '#0f172a', color: '#fff', border: '1px solid #475569', fontSize: 11 }}
          >
            <option value={7}>Small (7×7)</option>
            <option value={9}>Classic Win95 (9×9)</option>
            <option value={13}>Large Labyrinth (13×13)</option>
          </select>

          <button
            onClick={() => setShowMinimap((m) => !m)}
            style={{
              padding: '4px 8px',
              borderRadius: 4,
              border: '1px solid #475569',
              background: showMinimap ? '#065f46' : '#334155',
              color: '#fff',
              cursor: 'pointer',
              fontSize: 11,
            }}
          >
            🗺️ Map: {showMinimap ? 'ON' : 'OFF'}
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>🙂 Mazes Cleared: <b>{stats.solvedCount}</b></span>
          <span>💎 Gems: <b>{stats.gems}/{stats.totalGems}</b></span>
          {stats.upsideDown && <span style={{ color: '#fde047', fontWeight: 800 }}>🙃 UPSIDE DOWN!</span>}
          <button
            onClick={() => {
              setScreensaver('maze3d');
              setScreensaverActive(true);
            }}
            style={{
              padding: '4px 9px',
              borderRadius: 4,
              border: '1px solid #a855f7',
              background: '#6b21a8',
              color: '#fff',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: 11,
            }}
          >
            🖥️ Fullscreen Screensaver
          </button>
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <Maze3DCanvas
          autoPlay={autoPlay}
          skin={skin}
          cellsSize={cellsSize}
          showMinimap={showMinimap}
          externalMoveRef={touchMoveRef}
          onStats={handleStats}
        />

        {!autoPlay && (
          <div
            style={{
              position: 'absolute',
              left: 12,
              bottom: 12,
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 36px)',
              gridTemplateRows: 'repeat(2, 34px)',
              gap: 4,
              opacity: 0.85,
            }}
          >
            <div />
            <button
              onPointerDown={() => (touchMoveRef.current.fwd = 1)}
              onPointerUp={() => (touchMoveRef.current.fwd = 0)}
              onPointerLeave={() => (touchMoveRef.current.fwd = 0)}
              style={{ borderRadius: 6, border: '1px solid #94a3b8', background: 'rgba(15,23,42,0.8)', color: '#fff', fontWeight: 800 }}
            >
              ▲
            </button>
            <div />
            <button
              onPointerDown={() => (touchMoveRef.current.turn = -1)}
              onPointerUp={() => (touchMoveRef.current.turn = 0)}
              onPointerLeave={() => (touchMoveRef.current.turn = 0)}
              style={{ borderRadius: 6, border: '1px solid #94a3b8', background: 'rgba(15,23,42,0.8)', color: '#fff', fontWeight: 800 }}
            >
              ◀
            </button>
            <button
              onPointerDown={() => (touchMoveRef.current.fwd = -1)}
              onPointerUp={() => (touchMoveRef.current.fwd = 0)}
              onPointerLeave={() => (touchMoveRef.current.fwd = 0)}
              style={{ borderRadius: 6, border: '1px solid #94a3b8', background: 'rgba(15,23,42,0.8)', color: '#fff', fontWeight: 800 }}
            >
              ▼
            </button>
            <button
              onPointerDown={() => (touchMoveRef.current.turn = 1)}
              onPointerUp={() => (touchMoveRef.current.turn = 0)}
              onPointerLeave={() => (touchMoveRef.current.turn = 0)}
              style={{ borderRadius: 6, border: '1px solid #94a3b8', background: 'rgba(15,23,42,0.8)', color: '#fff', fontWeight: 800 }}
            >
              ▶
            </button>
          </div>
        )}
      </div>

      <div style={{ padding: '4px 10px', background: '#0f172a', color: '#94a3b8', fontSize: 11, display: 'flex', justifyContent: 'space-between' }}>
        <span>Controls: W/A/S/D or Arrow Keys • Touch diamond Flip Rocks to walk upside-down on the ceiling!</span>
        <span>Find the Yellow Win95 Smiley Face 🙂 to clear the maze!</span>
      </div>
    </div>
  );
};

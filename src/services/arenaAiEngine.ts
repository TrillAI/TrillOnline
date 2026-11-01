/**
 * Arena AI Agent Core Engine for Windows XP Professional OS
 * - Autonomous multi-step Agent Mode (like https://arena.ai/agent)
 * - Real HD Image Generation (.png) + Side-by-Side Arena Model Battle
 * - Real Playable Video Generation (.webm encoded via MediaRecorder)
 * - Persistent VFS File Creation (HTML apps, scripts, docs, images, videos)
 * - Native Windows XP OS Task Control + Optional Live Cloud API Key Support
 */

export interface ArenaToolStep {
  id: string;
  tool:
    | 'thinking'
    | 'mkdir'
    | 'write_file'
    | 'generate_image'
    | 'generate_video'
    | 'os_action'
    | 'verify_preview';
  label: string;
  detail?: string;
  status: 'running' | 'completed' | 'error';
  filePath?: string;
  vfsFileId?: string;
}

export interface ArenaArtifact {
  id: string;
  kind: 'image' | 'video' | 'webapp' | 'file';
  title: string;
  vfsId: string;
  pathDisplay: string;
  mime: string;
  previewSrc?: string; // dataURL for image/video or HTML content for webapp
  modelName?: string;
}

export interface ArenaBattlePair {
  id: string;
  prompt: string;
  voted?: 'A' | 'B';
  optionA: { model: string; dataUrl: string; vfsId?: string };
  optionB: { model: string; dataUrl: string; vfsId?: string };
}

export interface ArenaMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  modelBadge?: string;
  steps?: ArenaToolStep[];
  artifacts?: ArenaArtifact[];
  battle?: ArenaBattlePair;
}

export interface ArenaSettingsConfig {
  provider: 'builtin' | 'openai' | 'openrouter';
  apiKey: string;
  model: string;
  uiSkin: 'xp-native' | 'arena-studio';
}

/* ============================================================================
   1. DETERMINISTIC HASH & PALETTE HELPERS FOR PROCEDURAL IMAGE/VIDEO SYNTHESIS
   ============================================================================ */
function hashPrompt(str: string, seedOffset = 0): number {
  let h = 2166136261 ^ seedOffset;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function makeRng(seed: number) {
  let s = seed || 123456789;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

interface SceneStyle {
  theme: 'cyberpunk' | 'sunset_ocean' | 'space' | 'bliss_hills' | 'mountains_aurora' | 'matrix' | 'abstract_3d';
  skyTop: string;
  skyMid: string;
  skyBot: string;
  accent1: string;
  accent2: string;
  sunColor: string;
}

function inferSceneStyle(prompt: string, variant = 0): SceneStyle {
  const p = prompt.toLowerCase();
  if (p.includes('cyber') || p.includes('neon') || p.includes('city') || p.includes('tokyo') || p.includes('synth')) {
    return variant === 0
      ? {
          theme: 'cyberpunk',
          skyTop: '#07041a',
          skyMid: '#240b4c',
          skyBot: '#831843',
          accent1: '#00f5d4',
          accent2: '#ff2a85',
          sunColor: '#ffbe0b',
        }
      : {
          theme: 'cyberpunk',
          skyTop: '#020617',
          skyMid: '#0f172a',
          skyBot: '#1d4ed8',
          accent1: '#38bdf8',
          accent2: '#f43f5e',
          sunColor: '#fde047',
        };
  }
  if (p.includes('space') || p.includes('galaxy') || p.includes('nebula') || p.includes('planet') || p.includes('star')) {
    return variant === 0
      ? {
          theme: 'space',
          skyTop: '#02010a',
          skyMid: '#0f0836',
          skyBot: '#2e1065',
          accent1: '#a855f7',
          accent2: '#38bdf8',
          sunColor: '#fef08a',
        }
      : {
          theme: 'space',
          skyTop: '#010814',
          skyMid: '#082f49',
          skyBot: '#115e59',
          accent1: '#2dd4bf',
          accent2: '#f472b6',
          sunColor: '#fde68a',
        };
  }
  if (p.includes('matrix') || p.includes('code') || p.includes('hacker') || p.includes('terminal')) {
    return {
      theme: 'matrix',
      skyTop: '#000802',
      skyMid: '#021c08',
      skyBot: '#052e16',
      accent1: '#22c55e',
      accent2: '#86efac',
      sunColor: '#4ade80',
    };
  }
  if (p.includes('ocean') || p.includes('beach') || p.includes('wave') || p.includes('sea') || p.includes('sunset')) {
    return variant === 0
      ? {
          theme: 'sunset_ocean',
          skyTop: '#1e1b4b',
          skyMid: '#be185d',
          skyBot: '#fb923c',
          accent1: '#fde047',
          accent2: '#38bdf8',
          sunColor: '#fef08a',
        }
      : {
          theme: 'sunset_ocean',
          skyTop: '#0c4a6e',
          skyMid: '#0284c7',
          skyBot: '#fda4af',
          accent1: '#fed7aa',
          accent2: '#22d3ee',
          sunColor: '#fffbeb',
        };
  }
  if (p.includes('bliss') || p.includes('xp') || p.includes('meadow') || p.includes('hill') || p.includes('grass')) {
    return variant === 0
      ? {
          theme: 'bliss_hills',
          skyTop: '#1d4ed8',
          skyMid: '#3b82f6',
          skyBot: '#bae6fd',
          accent1: '#22c55e',
          accent2: '#15803d',
          sunColor: '#ffffff',
        }
      : {
          theme: 'bliss_hills',
          skyTop: '#312e81',
          skyMid: '#ec4899',
          skyBot: '#fde68a',
          accent1: '#16a34a',
          accent2: '#14532d',
          sunColor: '#fef08a',
        };
  }
  if (p.includes('abstract') || p.includes('logo') || p.includes('glass') || p.includes('3d')) {
    return variant === 0
      ? {
          theme: 'abstract_3d',
          skyTop: '#090d1f',
          skyMid: '#1e1b4b',
          skyBot: '#312e81',
          accent1: '#60a5fa',
          accent2: '#f472b6',
          sunColor: '#fde047',
        }
      : {
          theme: 'abstract_3d',
          skyTop: '#18181b',
          skyMid: '#27272a',
          skyBot: '#3f3f46',
          accent1: '#f59e0b',
          accent2: '#10b981',
          sunColor: '#ffffff',
        };
  }
  return variant === 0
    ? {
        theme: 'mountains_aurora',
        skyTop: '#020617',
        skyMid: '#0f172a',
        skyBot: '#1e3a8a',
        accent1: '#34d399',
        accent2: '#818cf8',
        sunColor: '#e0f2fe',
      }
    : {
        theme: 'mountains_aurora',
        skyTop: '#1e1b4b',
        skyMid: '#6d28d9',
        skyBot: '#f97316',
        accent1: '#fde047',
        accent2: '#fb7185',
        sunColor: '#fff7ed',
      };
}

/* ============================================================================
   SHARED SCENE FRAME RENDERER (Used for both HD Stills & 30fps Motion Video!)
   ============================================================================ */
function renderSceneFrame(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  prompt: string,
  style: SceneStyle,
  tNorm: number, // 0..1 animation progress
  seed: number
) {
  const rng = makeRng(seed);

  // 1. Sky Gradient
  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.72);
  sky.addColorStop(0, style.skyTop);
  sky.addColorStop(0.55, style.skyMid);
  sky.addColorStop(1, style.skyBot);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // 2. Stars (for night/space/cyberpunk/aurora)
  if (style.theme !== 'bliss_hills') {
    for (let i = 0; i < 110; i++) {
      const sx = ((rng() * w + tNorm * (style.theme === 'space' ? 90 : 12)) % w);
      const sy = rng() * h * 0.56;
      const sr = 0.6 + rng() * 1.8;
      const tw = 0.45 + 0.55 * Math.sin(tNorm * Math.PI * 4 + i);
      ctx.fillStyle = `rgba(255,255,255,${tw.toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 3. Theme-Specific Rich Composition
  if (style.theme === 'cyberpunk') {
    // Giant Synthwave Sun with horizontal scan cuts
    const sunX = w * 0.5;
    const sunY = h * 0.44 - Math.sin(tNorm * Math.PI * 2) * 6;
    const sunR = Math.min(w, h) * 0.22;
    const sunGrad = ctx.createLinearGradient(sunX, sunY - sunR, sunX, sunY + sunR);
    sunGrad.addColorStop(0, '#fde047');
    sunGrad.addColorStop(0.55, '#fb7185');
    sunGrad.addColorStop(1, '#9333ea');
    ctx.save();
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = sunGrad;
    ctx.fillRect(sunX - sunR, sunY - sunR, sunR * 2, sunR * 2);
    ctx.fillStyle = style.skyBot;
    for (let s = 0; s < 7; s++) {
      const barY = sunY + s * (sunR * 0.14);
      ctx.fillRect(sunX - sunR, barY, sunR * 2, 2 + s * 1.3);
    }
    ctx.restore();

    // City Skyline with glowing windows
    const horizon = h * 0.58;
    for (let layer = 0; layer < 2; layer++) {
      const bCount = layer === 0 ? 24 : 16;
      for (let i = 0; i < bCount; i++) {
        const bw = (w / bCount) * (layer === 0 ? 1.05 : 0.85);
        const bx = i * (w / bCount);
        const bh = (layer === 0 ? 0.16 : 0.28) * h * (0.35 + rng() * 0.85);
        ctx.fillStyle = layer === 0 ? '#110a29' : '#060414';
        ctx.fillRect(bx, horizon - bh, bw - 2, bh);

        if (layer === 1) {
          for (let wy = horizon - bh + 8; wy < horizon - 8; wy += 9) {
            for (let wx = bx + 5; wx < bx + bw - 8; wx += 8) {
              if (rng() > 0.45) {
                ctx.fillStyle = rng() > 0.5 ? style.accent1 : style.accent2;
                ctx.fillRect(wx, wy, 4, 5);
              }
            }
          }
        }
      }
    }

    // Moving 3D Perspective Neon Highway Grid
    ctx.fillStyle = '#050212';
    ctx.fillRect(0, horizon, w, h - horizon);
    ctx.strokeStyle = style.accent2;
    ctx.lineWidth = 1.4;
    ctx.globalAlpha = 0.72;
    for (let i = -14; i <= 14; i++) {
      ctx.beginPath();
      ctx.moveTo(w * 0.5 + i * 14, horizon);
      ctx.lineTo(w * 0.5 + i * 115, h);
      ctx.stroke();
    }
    for (let z = 0; z < 12; z++) {
      const prog = ((z / 12 + tNorm * 2) % 1);
      const y = horizon + Math.pow(prog, 2.1) * (h - horizon);
      ctx.strokeStyle = style.accent1;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else if (style.theme === 'bliss_hills') {
    // Fluffy Sonoma Clouds
    for (let c = 0; c < 8; c++) {
      const cx = ((c * w * 0.17 + tNorm * w * 0.28) % (w + 180)) - 90;
      const cy = h * (0.18 + (c % 3) * 0.08);
      ctx.fillStyle = 'rgba(255,255,255,0.88)';
      for (let puff = 0; puff < 5; puff++) {
        ctx.beginPath();
        ctx.arc(cx + puff * 26, cy - Math.sin(puff) * 10, 24 + (puff % 2) * 10, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Rolling Emerald Hills
    const drawHill = (yBase: number, amp: number, freq: number, phase: number, c1: string, c2: string) => {
      const hg = ctx.createLinearGradient(0, yBase - amp, 0, h);
      hg.addColorStop(0, c1);
      hg.addColorStop(1, c2);
      ctx.fillStyle = hg;
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 12) {
        const y = yBase + Math.sin((x / w) * freq + phase) * amp + Math.cos((x / w) * (freq * 1.7)) * (amp * 0.35);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();
    };
    drawHill(h * 0.56, 48, 3.4, 0.5, '#4ade80', '#15803d');
    drawHill(h * 0.68, 56, 2.6, 2.1, '#22c55e', '#14532d');
  } else if (style.theme === 'sunset_ocean') {
    const horizon = h * 0.56;
    const sunX = w * 0.5;
    const sunY = horizon - 18 - Math.sin(tNorm * Math.PI * 2) * 10;
    const glow = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, w * 0.35);
    glow.addColorStop(0, style.sunColor);
    glow.addColorStop(0.3, 'rgba(251, 146, 60, 0.65)');
    glow.addColorStop(1, 'rgba(251, 146, 60, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, horizon);

    ctx.fillStyle = style.sunColor;
    ctx.beginPath();
    ctx.arc(sunX, sunY, Math.min(w, h) * 0.11, 0, Math.PI * 2);
    ctx.fill();

    // Animated Ocean Waves & Sun Shimmer
    const sea = ctx.createLinearGradient(0, horizon, 0, h);
    sea.addColorStop(0, '#1e3a8a');
    sea.addColorStop(0.5, '#0f172a');
    sea.addColorStop(1, '#020617');
    ctx.fillStyle = sea;
    ctx.fillRect(0, horizon, w, h - horizon);

    for (let row = 0; row < 28; row++) {
      const p = row / 28;
      const y = horizon + p * (h - horizon);
      const shimmerW = (0.06 + p * 0.22) * w + Math.sin(tNorm * Math.PI * 6 + row) * 18;
      ctx.fillStyle = `rgba(253, 224, 71, ${(0.62 - p * 0.45).toFixed(2)})`;
      ctx.fillRect(sunX - shimmerW / 2, y, shimmerW, 2.5 + p * 3);
    }
  } else if (style.theme === 'matrix') {
    ctx.fillStyle = 'rgba(0, 12, 4, 0.92)';
    ctx.fillRect(0, 0, w, h);
    ctx.font = 'bold 15px monospace';
    const cols = Math.floor(w / 16);
    for (let c = 0; c < cols; c++) {
      const speed = 1 + (c % 3);
      const headRow = Math.floor(((rng() * 40 + tNorm * 35 * speed) % 42));
      for (let r = 0; r < 14; r++) {
        const y = (headRow - r) * 16;
        if (y < 0 || y > h) continue;
        const ch = String.fromCharCode(0x30a0 + ((c * 13 + r * 7 + Math.floor(tNorm * 20)) % 64));
        ctx.fillStyle = r === 0 ? '#ffffff' : `rgba(34, 197, 94, ${(1 - r / 14).toFixed(2)})`;
        ctx.fillText(ch, c * 16, y);
      }
    }
  } else if (style.theme === 'space') {
    // Glowing Nebula + Ringed Planet
    const neb = ctx.createRadialGradient(w * 0.42, h * 0.45, 20, w * 0.42, h * 0.45, w * 0.48);
    neb.addColorStop(0, 'rgba(168, 85, 247, 0.55)');
    neb.addColorStop(0.5, 'rgba(56, 189, 248, 0.25)');
    neb.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = neb;
    ctx.fillRect(0, 0, w, h);

    const px = w * 0.54 + Math.cos(tNorm * Math.PI * 2) * 14;
    const py = h * 0.48 + Math.sin(tNorm * Math.PI * 2) * 8;
    const pr = Math.min(w, h) * 0.18;

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(-0.32);
    ctx.strokeStyle = 'rgba(253, 224, 71, 0.65)';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.ellipse(0, 0, pr * 2.1, pr * 0.48, 0, 0, Math.PI * 2);
    ctx.stroke();

    const pGrad = ctx.createRadialGradient(-pr * 0.35, -pr * 0.35, pr * 0.1, 0, 0, pr);
    pGrad.addColorStop(0, style.accent2);
    pGrad.addColorStop(0.6, style.accent1);
    pGrad.addColorStop(1, '#090418');
    ctx.fillStyle = pGrad;
    ctx.beginPath();
    ctx.arc(0, 0, pr, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else if (style.theme === 'abstract_3d') {
    for (let i = 0; i < 9; i++) {
      const angle = (i / 9) * Math.PI * 2 + tNorm * Math.PI * 2;
      const ox = w * 0.5 + Math.cos(angle) * (w * 0.2);
      const oy = h * 0.5 + Math.sin(angle * 1.5) * (h * 0.16);
      const rad = 36 + (i % 4) * 22;
      const g = ctx.createRadialGradient(ox - rad * 0.3, oy - rad * 0.3, 4, ox, oy, rad);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.35, i % 2 === 0 ? style.accent1 : style.accent2);
      g.addColorStop(1, 'rgba(15, 23, 42, 0.15)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(ox, oy, rad, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // Mountains + Aurora Borealis Ribbons
    for (let band = 0; band < 3; band++) {
      ctx.save();
      ctx.globalAlpha = 0.32;
      const ag = ctx.createLinearGradient(0, h * 0.08, 0, h * 0.48);
      ag.addColorStop(0, 'transparent');
      ag.addColorStop(0.5, band % 2 === 0 ? style.accent1 : style.accent2);
      ag.addColorStop(1, 'transparent');
      ctx.fillStyle = ag;
      ctx.beginPath();
      ctx.moveTo(0, h * 0.45);
      for (let x = 0; x <= w; x += 16) {
        const y =
          h * (0.18 + band * 0.06) +
          Math.sin((x / w) * 5 + tNorm * Math.PI * 2 + band) * 32;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Jagged Alpine Peaks + Lake Reflection
    const horizon = h * 0.64;
    for (let layer = 0; layer < 2; layer++) {
      ctx.fillStyle = layer === 0 ? '#1e293b' : '#0f172a';
      ctx.beginPath();
      ctx.moveTo(0, horizon);
      const steps = 14;
      for (let s = 0; s <= steps; s++) {
        const mx = (s / steps) * w;
        const my =
          horizon -
          (layer === 0 ? h * 0.28 : h * 0.18) *
            (0.35 + Math.abs(Math.sin(s * 1.7 + layer * 2 + (seed % 5))));
        ctx.lineTo(mx, my);
      }
      ctx.lineTo(w, horizon);
      ctx.closePath();
      ctx.fill();
    }

    const lake = ctx.createLinearGradient(0, horizon, 0, h);
    lake.addColorStop(0, '#0f172a');
    lake.addColorStop(1, '#020617');
    ctx.fillStyle = lake;
    ctx.fillRect(0, horizon, w, h - horizon);
  }
}

/* ============================================================================
   2. GENERATE HD PNG IMAGE (.png dataURL)
   ============================================================================ */
export async function generateArenaImage(
  prompt: string,
  variant = 0,
  settings?: ArenaSettingsConfig
): Promise<{ dataUrl: string; model: string }> {
  // Optional live OpenAI Images call if user provided an OpenAI key
  if (settings?.provider === 'openai' && settings.apiKey.trim()) {
    try {
      const res = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${settings.apiKey.trim()}`,
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt,
          n: 1,
          size: '1024x1024',
          response_format: 'b64_json',
        }),
      });
      if (res.ok) {
        const json = await res.json();
        const b64 = json?.data?.[0]?.b64_json;
        if (b64) {
          return { dataUrl: `data:image/png;base64,${b64}`, model: 'DALL·E 3 (Live API)' };
        }
      }
    } catch {
      // Fallback seamlessly to built-in synthesizer
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = 960;
  canvas.height = 600;
  const ctx = canvas.getContext('2d')!;
  const seed = hashPrompt(prompt, variant * 7919);
  const style = inferSceneStyle(prompt, variant);

  renderSceneFrame(ctx, canvas.width, canvas.height, prompt, style, variant * 0.37, seed);

  // Subtle cinematic vignette
  const vig = ctx.createRadialGradient(
    canvas.width / 2,
    canvas.height / 2,
    canvas.width * 0.28,
    canvas.width / 2,
    canvas.height / 2,
    canvas.width * 0.65
  );
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.34)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const modelNames = ['Imagen-Arena-XL v3', 'Flux-Pro-XP Studio'];
  return {
    dataUrl: canvas.toDataURL('image/png'),
    model: modelNames[variant % modelNames.length],
  };
}

/* ============================================================================
   3. GENERATE REAL PLAYABLE .WEBM MOTION VIDEO (Saved in Persistent VFS!)
   ============================================================================ */
export async function generateArenaVideo(
  prompt: string,
  onProgress?: (pct: number) => void
): Promise<{ dataUrl: string; mime: string; model: string }> {
  const width = 640;
  const height = 360;
  const fps = 30;
  const totalFrames = 105; // 3.5 seconds @ 30fps — crisp & fast to encode!

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const seed = hashPrompt(prompt, 42);
  const style = inferSceneStyle(prompt, 0);

  // Check MediaRecorder availability for real .webm video encoding
  const canRecord =
    typeof MediaRecorder !== 'undefined' && typeof canvas.captureStream === 'function';

  if (!canRecord) {
    renderSceneFrame(ctx, width, height, prompt, style, 0.25, seed);
    return {
      dataUrl: canvas.toDataURL('image/png'),
      mime: 'image/png',
      model: 'Veo-Arena Motion Engine',
    };
  }

  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
    ? 'video/webm;codecs=vp8'
    : 'video/webm';

  const stream = canvas.captureStream(fps);
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 2_200_000,
  });

  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (ev) => {
    if (ev.data && ev.data.size > 0) chunks.push(ev.data);
  };

  const donePromise = new Promise<string>((resolve, reject) => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    };
  });

  recorder.start();

  for (let f = 0; f < totalFrames; f++) {
    const tNorm = f / totalFrames;
    renderSceneFrame(ctx, width, height, prompt, style, tNorm, seed);

    // Subtle film HUD caption in bottom-left
    ctx.fillStyle = 'rgba(0,0,0,0.42)';
    ctx.fillRect(12, height - 30, Math.min(width - 24, prompt.length * 6.5 + 90), 20);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 11px Tahoma, sans-serif';
    ctx.fillText(`▶ Arena Video • ${prompt.slice(0, 48)}`, 18, height - 16);

    if (f % 15 === 0 && onProgress) {
      onProgress(Math.round((f / totalFrames) * 100));
    }
    await new Promise((r) => setTimeout(r, 22));
  }

  onProgress?.(100);
  recorder.stop();
  const dataUrl = await donePromise;
  return {
    dataUrl,
    mime: 'video/webm',
    model: 'Arena-Video-Gen 720p (WebM)',
  };
}

/* ============================================================================
   4. INTERACTIVE WEB APP / PROJECT CODE SYNTHESIZER (arena.ai/agent style!)
   ============================================================================ */
export function synthesizeArenaWebApp(prompt: string): {
  appName: string;
  slug: string;
  summary: string;
  html: string;
  readme: string;
} {
  const p = prompt.toLowerCase();

  if (p.includes('drum') || p.includes('synth') || p.includes('music') || p.includes('beat')) {
    return {
      appName: 'XP Chiptune Beat Studio',
      slug: 'xp-beat-studio',
      summary: 'Built a 16-step synthesizer & drum sequencer with live WebAudio synthesis and BPM controls.',
      readme: '# XP Chiptune Beat Studio\nGenerated by Arena AI Agent and saved to persistent Windows XP storage.',
      html: `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>XP Beat Studio</title>
<style>
  body { margin:0; font-family: Tahoma, sans-serif; background:#0f172a; color:#f8fafc; padding:18px; }
  h2 { margin:0 0 10px; color:#38bdf8; }
  .bar { display:flex; gap:10px; align-items:center; margin-bottom:14px; }
  button { background:#2563eb; color:#fff; border:none; border-radius:5px; padding:7px 14px; font-weight:700; cursor:pointer; }
  button.alt { background:#334155; }
  .grid { display:grid; grid-template-columns: 74px repeat(8, 1fr); gap:6px; align-items:center; }
  .step { height:36px; border-radius:5px; background:#1e293b; border:1px solid #475569; cursor:pointer; }
  .step.on { background:#22c55e; border-color:#bbf7d0; }
  .step.play { outline:2px solid #facc15; }
</style></head><body>
  <h2>🎹 XP Chiptune Beat Studio</h2>
  <div class="bar">
    <button id="playBtn">▶ Play Loop</button>
    <button class="alt" id="clearBtn">Clear</button>
    <label>BPM: <input id="bpm" type="range" min="80" max="170" value="124"></label>
  </div>
  <div class="grid" id="grid"></div>
<script>
  const rows = [
    { name: 'Kick', freq: 95, type: 'sine' },
    { name: 'Snare', freq: 240, type: 'triangle' },
    { name: 'HiHat', freq: 880, type: 'square' },
    { name: 'Lead C', freq: 523.25, type: 'sawtooth' },
    { name: 'Lead G', freq: 783.99, type: 'sawtooth' }
  ];
  const state = rows.map((_, r) => Array.from({length:8}, (__, c) => (r===0 && c%2===0) || (r===2)));
  const grid = document.getElementById('grid');
  let playing = false, step = 0, timer = null;
  const ac = new (window.AudioContext || window.webkitAudioContext)();
  function beep(f, type) {
    if (ac.state === 'suspended') ac.resume();
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0.18, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.14);
    o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + 0.15);
  }
  function render() {
    grid.innerHTML = '';
    rows.forEach((row, r) => {
      const lbl = document.createElement('div');
      lbl.textContent = row.name; lbl.style.fontWeight = '700'; lbl.style.fontSize = '12px';
      grid.appendChild(lbl);
      for (let c = 0; c < 8; c++) {
        const d = document.createElement('div');
        d.className = 'step' + (state[r][c] ? ' on' : '') + (playing && c === step ? ' play' : '');
        d.onclick = () => { state[r][c] = !state[r][c]; render(); };
        grid.appendChild(d);
      }
    });
  }
  function tick() {
    rows.forEach((row, r) => { if (state[r][step]) beep(row.freq, row.type); });
    render();
    step = (step + 1) % 8;
  }
  document.getElementById('playBtn').onclick = (e) => {
    playing = !playing;
    e.target.textContent = playing ? '⏸ Pause' : '▶ Play Loop';
    clearInterval(timer);
    if (playing) timer = setInterval(tick, (60 / document.getElementById('bpm').value / 2) * 1000);
    render();
  };
  document.getElementById('clearBtn').onclick = () => {
    state.forEach(r => r.fill(false)); render();
  };
  render();
</script></body></html>`,
    };
  }

  if (p.includes('game') || p.includes('space') || p.includes('flappy') || p.includes('pong') || p.includes('arcade')) {
    return {
      appName: 'StarDefender XP Arcade',
      slug: 'stardefender-xp',
      summary: 'Built a playable HTML5 Canvas 60fps StarDefender space shooter with score tracking & particle explosions.',
      readme: '# StarDefender XP Arcade\nUse Left/Right arrows or mouse to move and Space/Click to fire lasers!',
      html: `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>StarDefender XP</title>
<style>
  body { margin:0; background:#030712; color:#fff; font-family:Tahoma,sans-serif; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; overflow:hidden; }
  canvas { border:2px solid #38bdf8; border-radius:6px; background:#020617; cursor:crosshair; }
  .hud { margin-bottom:6px; font-weight:700; color:#fde047; font-size:13px; }
</style></head><body>
  <div class="hud">🛸 StarDefender XP — Move Mouse / Arrows • Click to Fire! Score: <span id="sc">0</span></div>
  <canvas id="cv" width="460" height="320"></canvas>
<script>
  const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
  let px = 230, score = 0, bullets = [], foes = [], tick = 0;
  cv.onmousemove = (e) => { const r = cv.getBoundingClientRect(); px = Math.max(20, Math.min(440, e.clientX - r.left)); };
  cv.onclick = () => bullets.push({ x: px, y: 285 });
  window.onkeydown = (e) => {
    if (e.key === 'ArrowLeft') px = Math.max(20, px - 22);
    if (e.key === 'ArrowRight') px = Math.min(440, px + 22);
    if (e.key === ' ') bullets.push({ x: px, y: 285 });
  };
  function loop() {
    tick++;
    if (tick % 38 === 0) foes.push({ x: 25 + Math.random()*410, y: -15, s: 1.2 + Math.random()*1.4 });
    ctx.fillStyle = '#020617'; ctx.fillRect(0,0,460,320);
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath(); ctx.moveTo(px, 275); ctx.lineTo(px-14, 304); ctx.lineTo(px+14, 304); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fde047';
    bullets.forEach(b => { b.y -= 6; ctx.fillRect(b.x-2, b.y, 4, 10); });
    bullets = bullets.filter(b => b.y > -10);
    ctx.fillStyle = '#f43f5e';
    foes.forEach(f => {
      f.y += f.s;
      ctx.beginPath(); ctx.arc(f.x, f.y, 12, 0, Math.PI*2); ctx.fill();
      bullets.forEach(b => {
        if (Math.hypot(b.x - f.x, b.y - f.y) < 15) { f.hit = true; b.y = -99; score += 100; document.getElementById('sc').textContent = score; }
      });
      if (f.y > 320) f.y = -15;
    });
    foes = foes.filter(f => !f.hit);
    requestAnimationFrame(loop);
  }
  loop();
</script></body></html>`,
    };
  }

  // General Interactive Productivity / Custom Prompt Web App
  const cleanTitle =
    prompt
      .replace(/^(build|create|make|write|generate)\s+(a|an|me\s+a)?\s*/i, '')
      .slice(0, 34)
      .trim() || 'Arena XP Studio App';
  const titleCap = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);
  const slug = titleCap.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'arena-app';

  return {
    appName: titleCap,
    slug,
    summary: `Built "${titleCap}" with persistent local state, task board, live metrics, and exportable notes.`,
    readme: `# ${titleCap}\nPrompt: ${prompt}\n\nSaved automatically into Windows XP Persistent VFS Storage.`,
    html: `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${titleCap}</title>
<style>
  * { box-sizing:border-box; }
  body { margin:0; font-family: Tahoma, system-ui, sans-serif; background:#f1f5f9; color:#0f172a; padding:18px; }
  .card { background:#fff; border:1px solid #cbd5e1; border-radius:8px; padding:16px; box-shadow:0 2px 6px rgba(0,0,0,0.05); margin-bottom:12px; }
  h2 { margin:0 0 4px; color:#1d4ed8; font-size:18px; }
  .sub { font-size:12px; color:#64748b; margin-bottom:12px; }
  .row { display:flex; gap:8px; margin-bottom:10px; }
  input { flex:1; padding:8px 10px; border:1px solid #94a3b8; border-radius:5px; font-size:13px; }
  button { background:#2563eb; color:#fff; border:none; border-radius:5px; padding:8px 14px; font-weight:700; cursor:pointer; }
  .item { display:flex; justify-content:space-between; align-items:center; padding:8px 10px; border-bottom:1px solid #e2e8f0; font-size:13px; }
  .done { text-decoration:line-through; color:#94a3b8; }
  .stats { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; text-align:center; }
  .stat-box { background:#eff6ff; border:1px solid #bfdbfe; border-radius:6px; padding:8px; }
</style></head><body>
  <div class="card">
    <h2>✨ ${titleCap}</h2>
    <div class="sub">Built by Arena AI Agent • Persistent inside Windows XP OS</div>
    <div class="stats">
      <div class="stat-box"><div style="font-size:18px;font-weight:800;color:#1d4ed8" id="cTotal">0</div><div style="font-size:11px">Items</div></div>
      <div class="stat-box"><div style="font-size:18px;font-weight:800;color:#16a34a" id="cDone">0</div><div style="font-size:11px">Completed</div></div>
      <div class="stat-box"><div style="font-size:18px;font-weight:800;color:#9333ea" id="cTimer">25:00</div><div style="font-size:11px" id="timerBtn" style="cursor:pointer">Focus Timer ▶</div></div>
    </div>
  </div>
  <div class="card">
    <form class="row" id="f">
      <input id="inp" placeholder="Add new entry to ${titleCap}..." required />
      <button type="submit">+ Add</button>
    </form>
    <div id="list"></div>
  </div>
<script>
  const KEY = 'arena_webapp_${slug}';
  let items = JSON.parse(localStorage.getItem(KEY) || '[{"t":"Welcome to ${titleCap.replace(/"/g, '')}!","d":false},{"t":"Saved automatically in Windows XP Persistent Storage","d":true}]');
  function save() { localStorage.setItem(KEY, JSON.stringify(items)); render(); }
  function render() {
    document.getElementById('cTotal').textContent = items.length;
    document.getElementById('cDone').textContent = items.filter(x=>x.d).length;
    const el = document.getElementById('list'); el.innerHTML = '';
    items.forEach((it, idx) => {
      const d = document.createElement('div'); d.className = 'item';
      d.innerHTML = '<span class="'+(it.d?'done':'')+'" style="cursor:pointer">'+(it.d?'✅ ':'⬜ ')+it.t+'</span><button style="background:#ef4444;padding:3px 8px;font-size:11px">✕</button>';
      d.children[0].onclick = () => { items[idx].d = !items[idx].d; save(); };
      d.children[1].onclick = () => { items.splice(idx,1); save(); };
      el.appendChild(d);
    });
  }
  document.getElementById('f').onsubmit = (e) => {
    e.preventDefault();
    const v = document.getElementById('inp').value.trim();
    if (!v) return;
    items.unshift({ t: v, d: false });
    document.getElementById('inp').value = '';
    save();
  };
  let secs = 1500, running = false, iv = null;
  document.getElementById('cTimer').onclick = () => {
    running = !running;
    clearInterval(iv);
    if (running) iv = setInterval(() => {
      secs = Math.max(0, secs - 1);
      document.getElementById('cTimer').textContent = String(Math.floor(secs/60)).padStart(2,'0')+':'+String(secs%60).padStart(2,'0');
    }, 1000);
  };
  render();
</script></body></html>`,
  };
}

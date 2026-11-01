import React, { useState, useEffect, useRef } from 'react';
import { useOS, InstallablePackage } from '../../../context/OSContext';
import { useSound } from '../../../context/SoundContext';

/* ============================================================================
   1. WINAMP 2.91 — Chiptune / Synth Player + Live Spectrum Analyzer
   ============================================================================ */
const WINAMP_TRACKS = [
  { title: '1. DJ Mike Llama - Llama Whippin\' Intro', bpm: 132, notes: [261, 329, 392, 523, 392, 329] },
  { title: '2. 009 Sound System - Dreamscape (XP Synth)', bpm: 126, notes: [220, 261, 329, 440, 392, 329, 293, 261] },
  { title: '3. Darude - Sandstorm (2001 Club Mix)', bpm: 136, notes: [329, 329, 329, 329, 440, 392, 293] },
  { title: '4. Beethoven - Symphony No. 9 (XP Sample)', bpm: 118, notes: [329, 329, 349, 392, 392, 349, 329, 293] },
];

export const WinampApp: React.FC = () => {
  const { volume, muted } = useSound();
  const [trackIdx, setTrackIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [bars, setBars] = useState<number[]>(Array(16).fill(15));
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!playing) {
      setBars(Array(16).fill(8));
      return;
    }
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!ctxRef.current) ctxRef.current = new Ctx();
    const ctx = ctxRef.current;
    const track = WINAMP_TRACKS[trackIdx];
    let step = 0;

    const iv = window.setInterval(() => {
      if (!muted && volume > 0 && ctx.state === 'running') {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = track.notes[step % track.notes.length];
        g.gain.setValueAtTime(0.06 * volume, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.19);
        osc.connect(g).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      }
      step++;
      setBars(Array.from({ length: 16 }, () => 18 + Math.floor(Math.random() * 78)));
    }, Math.round((60 / track.bpm / 2) * 1000));

    return () => clearInterval(iv);
  }, [playing, trackIdx, volume, muted]);

  return (
    <div
      style={{
        flex: 1,
        background: '#1e1e26',
        color: '#22c55e',
        fontFamily: "'Courier New', monospace",
        padding: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      {/* Classic Winamp LCD + Spectrum */}
      <div
        style={{
          background: '#050805',
          border: '2px inset #4b5563',
          padding: 8,
          borderRadius: 3,
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 700, color: '#4ade80', marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden' }}>
          {playing ? '▶ ' : '■ '}
          {WINAMP_TRACKS[trackIdx].title}
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 52 }}>
          {bars.map((h, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: `${h}%`,
                background: 'linear-gradient(180deg, #ef4444 0%, #eab308 45%, #22c55e 100%)',
                transition: 'height 0.1s ease',
              }}
            />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94a3b8', marginTop: 4 }}>
          <span>192 kbps</span>
          <span>44 kHz • STEREO</span>
        </div>
      </div>

      {/* Transport Buttons */}
      <div style={{ display: 'flex', gap: 5, justifyContent: 'center' }}>
        <button className="xp-btn" onClick={() => setTrackIdx((i) => (i - 1 + WINAMP_TRACKS.length) % WINAMP_TRACKS.length)}>
          ⏮
        </button>
        <button
          className="xp-btn xp-btn-primary"
          onClick={() => {
            if (ctxRef.current?.state === 'suspended') ctxRef.current.resume();
            setPlaying(true);
          }}
        >
          ▶ Play
        </button>
        <button className="xp-btn" onClick={() => setPlaying(false)}>
          ⏸ Pause
        </button>
        <button className="xp-btn" onClick={() => setTrackIdx((i) => (i + 1) % WINAMP_TRACKS.length)}>
          ⏭
        </button>
      </div>

      {/* Playlist Editor */}
      <div
        style={{
          flex: 1,
          background: '#090d09',
          border: '2px inset #4b5563',
          padding: 6,
          overflowY: 'auto',
          fontSize: 11,
        }}
      >
        <div style={{ color: '#eab308', fontWeight: 700, marginBottom: 4 }}>WINAMP PLAYLIST</div>
        {WINAMP_TRACKS.map((t, i) => (
          <div
            key={t.title}
            onClick={() => {
              setTrackIdx(i);
              setPlaying(true);
            }}
            style={{
              padding: '3px 5px',
              cursor: 'pointer',
              color: i === trackIdx ? '#fff' : '#4ade80',
              background: i === trackIdx ? '#1d4ed8' : 'transparent',
            }}
          >
            {t.title}
          </div>
        ))}
      </div>
    </div>
  );
};

/* ============================================================================
   2. PLUS! RETRO ARCADE PACK — Playable Snake XP & Brick Breaker
   ============================================================================ */
export const ArcadePackApp: React.FC = () => {
  const { playSound } = useSound();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState(0);
  const [running, setRunning] = useState(true);
  const dirRef = useRef<{ x: number; y: number }>({ x: 1, y: 0 });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' && dirRef.current.y !== 1) dirRef.current = { x: 0, y: -1 };
      if (e.key === 'ArrowDown' && dirRef.current.y !== -1) dirRef.current = { x: 0, y: 1 };
      if (e.key === 'ArrowLeft' && dirRef.current.x !== 1) dirRef.current = { x: -1, y: 0 };
      if (e.key === 'ArrowRight' && dirRef.current.x !== -1) dirRef.current = { x: 1, y: 0 };
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!running || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    const grid = 20;
    let snake = [
      { x: 8, y: 10 },
      { x: 7, y: 10 },
      { x: 6, y: 10 },
    ];
    let apple = { x: 14, y: 10 };
    dirRef.current = { x: 1, y: 0 };
    setScore(0);

    const iv = window.setInterval(() => {
      const head = { x: snake[0].x + dirRef.current.x, y: snake[0].y + dirRef.current.y };
      if (head.x < 0 || head.x >= 22 || head.y < 0 || head.y >= 18 || snake.some((s) => s.x === head.x && s.y === head.y)) {
        playSound('gameLose');
        setRunning(false);
        return;
      }
      snake = [head, ...snake];
      if (head.x === apple.x && head.y === apple.y) {
        playSound('ding');
        setScore((s) => s + 10);
        apple = { x: Math.floor(Math.random() * 22), y: Math.floor(Math.random() * 18) };
      } else {
        snake.pop();
      }

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 440, 360);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(apple.x * grid + 2, apple.y * grid + 2, grid - 4, grid - 4);
      snake.forEach((seg, idx) => {
        ctx.fillStyle = idx === 0 ? '#4ade80' : '#22c55e';
        ctx.fillRect(seg.x * grid + 1, seg.y * grid + 1, grid - 2, grid - 2);
      });
    }, 115);

    return () => clearInterval(iv);
  }, [running, playSound]);

  return (
    <div style={{ flex: 1, background: '#1e293b', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 10, gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', width: 440, alignItems: 'center', fontSize: 12 }}>
        <b>🐍 Plus! Snake XP — Use Arrow Keys</b>
        <span>Score: <b>{score}</b></span>
        <button className="xp-btn" onClick={() => setRunning(true)}>
          Restart
        </button>
      </div>
      <canvas ref={canvasRef} width={440} height={360} style={{ border: '2px solid #64748b', background: '#0f172a' }} />
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="xp-btn" onClick={() => (dirRef.current = { x: -1, y: 0 })}>◀</button>
        <button className="xp-btn" onClick={() => (dirRef.current = { x: 0, y: -1 })}>▲</button>
        <button className="xp-btn" onClick={() => (dirRef.current = { x: 0, y: 1 })}>▼</button>
        <button className="xp-btn" onClick={() => (dirRef.current = { x: 1, y: 0 })}>▶</button>
      </div>
    </div>
  );
};

/* ============================================================================
   3. WINRAR 3.40 — Iconic 40-Day Perpetual Evaluation Archiver
   ============================================================================ */
export const WinRARApp: React.FC = () => {
  const { vfs, createFile, pushBalloon } = useOS();
  const [nagOpen, setNagOpen] = useState(true);
  const docs = vfs.filter((n) => n.parentId === 'my-docs');

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#ece9d8', position: 'relative', fontSize: 11 }}>
      <div style={{ display: 'flex', gap: 8, padding: 8, borderBottom: '1px solid #aca899' }}>
        <button
          className="xp-btn xp-btn-primary"
          onClick={() => {
            const name = `Backup_${Date.now().toString().slice(-4)}.rar`;
            createFile('my-docs', name, 'RAR! Archive containing My Documents files.');
            pushBalloon('WinRAR Archive Created', `Saved ${name} into My Documents!`);
          }}
        >
          📚 Add to .RAR Archive
        </button>
        <button className="xp-btn" onClick={() => setNagOpen(true)}>
          Buy License...
        </button>
      </div>

      <div style={{ flex: 1, background: '#fff', margin: 8, border: '1px solid #7f9db9', padding: 8, overflowY: 'auto' }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Contents of C:\Documents and Settings\My Documents:</div>
        {docs.map((d) => (
          <div key={d.id} style={{ padding: '4px 6px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
            <span>📄 {d.name}</span>
            <span style={{ color: '#64748b' }}>{d.modifiedAt}</span>
          </div>
        ))}
      </div>

      {nagOpen && (
        <div
          className="xp-bevel-raised"
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: 340,
            background: '#ece9d8',
            padding: 14,
            boxShadow: '0 6px 20px rgba(0,0,0,0.45)',
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Please purchase WinRAR license</div>
          <p style={{ lineHeight: 1.45, margin: '0 0 12px' }}>
            Please note that WinRAR is not free software. After a 40 day trial period you must either buy a license or
            remove it from your computer. (Day 8,392 of 40)
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
            <button className="xp-btn xp-btn-primary" onClick={() => setNagOpen(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/* ============================================================================
   4. mIRC 6.16 — Classic Internet Relay Chat
   ============================================================================ */
export const MIRCApp: React.FC = () => {
  const { username } = useOS();
  const [lines, setLines] = useState<string[]>([
    '* Connecting to irc.dal.net (6667)...',
    '* Now talking in #windowsxp',
    '* Topic is: Welcome to #windowsxp | SP3 + AOL 9.8 + Space Cadet High Scores!',
    '<@QuizBot> Welcome! Type anything or try /slap ZeroCool!',
  ]);
  const [msg, setMsg] = useState('');

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    if (!msg.trim()) return;
    const text = msg.trim();
    setMsg('');
    if (text.startsWith('/slap ')) {
      const target = text.slice(6);
      setLines((l) => [...l, `* ${username} slaps ${target} around a bit with a large trout`]);
    } else {
      setLines((l) => [...l, `<${username}> ${text}`]);
      window.setTimeout(() => {
        setLines((l) => [
          ...l,
          `<+ZeroCool> nice!! have you tried connecting Gmail inside AOL 9.8 yet?`,
        ]);
      }, 700);
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#fff', fontFamily: "'Courier New', monospace", fontSize: 12 }}>
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 130px', minHeight: 0 }}>
        <div style={{ padding: 8, overflowY: 'auto', borderRight: '1px solid #999' }}>
          {lines.map((ln, i) => (
            <div key={i} style={{ color: ln.startsWith('*') ? '#008000' : '#000', marginBottom: 3 }}>
              {ln}
            </div>
          ))}
        </div>
        <div style={{ padding: 6, background: '#f8fafc', fontSize: 11 }}>
          <b>@ChanServ</b>
          <div>@QuizBot</div>
          <div>+ZeroCool</div>
          <div>+AcidBurn</div>
          <div>{username}</div>
        </div>
      </div>
      <form onSubmit={send} style={{ display: 'flex', borderTop: '1px solid #999' }}>
        <input
          className="xp-input"
          style={{ flex: 1, border: 'none' }}
          placeholder="Type message or /slap ZeroCool..."
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
        />
        <button type="submit" className="xp-btn">Send</button>
      </form>
    </div>
  );
};

/* ============================================================================
   5. XP WEB & SCRIPT STUDIO — Write Code & Install It as a Desktop App!
   ============================================================================ */
export const CodeStudioApp: React.FC = () => {
  const { launchInstallerWizard } = useOS();
  const [appName, setAppName] = useState('My Matrix Rain XP App');
  const [code, setCode] = useState(`<!DOCTYPE html>
<html>
<body style="margin:0;background:#000;overflow:hidden;color:#0f0;font-family:monospace">
  <canvas id="c"></canvas>
  <script>
    const c = document.getElementById('c');
    const ctx = c.getContext('2d');
    c.width = window.innerWidth; c.height = window.innerHeight;
    const drops = Array(60).fill(1);
    setInterval(() => {
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      ctx.fillRect(0,0,c.width,c.height);
      ctx.fillStyle = '#0f0';
      ctx.font = '15px monospace';
      drops.forEach((y, i) => {
        ctx.fillText(String.fromCharCode(0x30A0 + Math.random()*96), i*14, y*15);
        if (y*15 > c.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      });
    }, 45);
  </script>
</body>
</html>`);

  const compileAndInstall = () => {
    const slug = Date.now().toString(36);
    const pkg: InstallablePackage = {
      id: `studio-${slug}`,
      appId: `custom:${slug}`,
      name: appName.trim() || 'Custom Studio App',
      version: '1.0',
      publisher: 'XP Script Studio',
      installerFile: 'studio_build_setup.exe',
      sizeMB: 0.8,
      icon: '/icons/luna48/file_generic_executable.png',
      category: 'Custom',
      description: 'Compiled inside XP Web & Script Studio!',
      customHtml: code,
    };
    launchInstallerWizard(pkg);
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#ece9d8', fontSize: 11, minHeight: 0 }}>
      <div style={{ padding: 6, display: 'flex', gap: 8, alignItems: 'center', borderBottom: '1px solid #aca899' }}>
        <b>App Name:</b>
        <input className="xp-input" value={appName} onChange={(e) => setAppName(e.target.value)} style={{ width: 190 }} />
        <button className="xp-btn xp-btn-primary" onClick={compileAndInstall}>
          ⚙️ Compile & Install to Desktop (.EXE)
        </button>
      </div>
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: 0 }}>
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          style={{
            fontFamily: "'Courier New', monospace",
            fontSize: 12,
            background: '#1e1e1e',
            color: '#d4d4d4',
            border: 'none',
            padding: 10,
            resize: 'none',
          }}
        />
        <iframe title="Live Preview" srcDoc={code} style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }} />
      </div>
    </div>
  );
};

/* ============================================================================
   6. LIMEWIRE 4.18 (100% Safe Retro Simulator)
   ============================================================================ */
export const LimeWireApp: React.FC = () => {
  const { createFile, pushBalloon } = useOS();
  const [query, setQuery] = useState('windows xp remix');
  const items = [
    { name: 'Windows_XP_Startup_Orchestral_Notes.txt', size: '4 KB', speed: 'T3', content: 'Composed by Brian Eno — 4.81 seconds of pure nostalgia!' },
    { name: 'Top_10_AOL_Keywords_2003.txt', size: '6 KB', speed: 'Cable', content: 'Keyword: Mail, Keyword: Games, Keyword: Moviefone, Keyword: Nick!' },
    { name: 'Space_Cadet_Pinball_Pro_Tips.txt', size: '5 KB', speed: 'DSL', content: 'Hit the left ramp 3 times to light Wormhole and advance your rank!' },
  ];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#ecf5e8', fontSize: 11, padding: 10, gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#22c55e', color: '#fff', padding: '6px 10px', borderRadius: 4, fontWeight: 700 }}>
        <span>🍋 LimeWire 4.18.8 — Turbo-Charged Safe Nostalgia Simulator</span>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <input className="xp-input" style={{ flex: 1 }} value={query} onChange={(e) => setQuery(e.target.value)} />
        <button className="xp-btn xp-btn-primary">Search P2P</button>
      </div>
      <div style={{ flex: 1, background: '#fff', border: '1px solid #86efac', padding: 6, overflowY: 'auto' }}>
        {items.map((it) => (
          <div key={it.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', borderBottom: '1px solid #f1f5f9' }}>
            <div>
              <b>{it.name}</b> <span style={{ color: '#64748b' }}>({it.size} • {it.speed})</span>
            </div>
            <button
              className="xp-btn"
              onClick={() => {
                createFile('my-docs', it.name, it.content);
                pushBalloon('Download Complete', `Saved ${it.name} to My Documents!`);
              }}
            >
              ⬇ Save to My Docs
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ============================================================================
   7. BONZIBUDDY & HYPERCAM 2 & CUSTOM WEB APP RUNNER
   ============================================================================ */
export const BonziSettingsApp: React.FC = () => {
  const { bonziOverlay, setBonziOverlay } = useOS();
  return (
    <div style={{ flex: 1, padding: 16, background: '#ece9d8', fontSize: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontWeight: 700, fontSize: 14, color: '#6b21a8' }}>🦍 BonziBUDDY Desktop Companion</div>
      <p style={{ margin: 0 }}>Toggle BonziBUDDY on the bottom-right of your Windows XP desktop:</p>
      <button className="xp-btn xp-btn-primary" onClick={() => setBonziOverlay(!bonziOverlay)}>
        {bonziOverlay ? 'Hide BonziBUDDY Overlay' : 'Show BonziBUDDY on Desktop'}
      </button>
    </div>
  );
};

export const HyperCamApp: React.FC = () => {
  const { hypercamOverlay, setHypercamOverlay, openApp } = useOS();
  return (
    <div style={{ flex: 1, padding: 16, background: '#ece9d8', fontSize: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontWeight: 700, fontSize: 14 }}>🎥 Unregistered HyperCam 2</div>
      <p style={{ margin: 0 }}>
        Enable the classic 2007 YouTube tutorial top-left <b>&ldquo;Unregistered HyperCam 2&rdquo;</b> watermark and open Notepad to type `"hello youtube today i will show u..."`!
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="xp-btn xp-btn-primary" onClick={() => setHypercamOverlay(!hypercamOverlay)}>
          {hypercamOverlay ? 'Stop Recording Watermark' : '● Start HyperCam 2 Watermark'}
        </button>
        <button className="xp-btn" onClick={() => openApp('notepad')}>
          Open Tutorial Notepad
        </button>
      </div>
    </div>
  );
};

export const CustomWebAppRunner: React.FC<{ appId: string }> = ({ appId }) => {
  const { installedPackages } = useOS();
  const pkg = installedPackages.find((p) => p.appId === appId);
  if (!pkg) {
    return <div style={{ padding: 20 }}>Application not found.</div>;
  }
  if (pkg.customHtml) {
    return (
      <iframe
        title={pkg.name}
        srcDoc={pkg.customHtml}
        style={{ flex: 1, width: '100%', border: 'none', background: '#fff' }}
      />
    );
  }
  return (
    <iframe
      title={pkg.name}
      src={pkg.customUrl}
      style={{ flex: 1, width: '100%', border: 'none', background: '#fff' }}
    />
  );
};

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  useOS,
  INSTALLABLE_CATALOG,
  BuiltinAppId,
} from '../../../context/OSContext';
import { useSound } from '../../../context/SoundContext';
import { WindowsXPFlagSVG } from '../aol/AOLGraphics';

/* ============================================================================
   1. WINDOWS MEDIA PLAYER 9 — Live Video (.webm/.mp4) + Audio Visualizer
   ============================================================================ */
interface MediaTrackItem {
  id: string;
  name: string;
  url: string;
  kind: 'audio' | 'video';
}

const DEFAULT_WMP_AUDIO: MediaTrackItem[] = [
  { id: 'wmp-1', name: 'Windows XP Orchestral Startup (Brian Eno)', url: '/sounds/startup.wav', kind: 'audio' },
  { id: 'wmp-2', name: 'America Online - "You\'ve Got Mail!"', url: '/sounds/youve-got-mail.mp3', kind: 'audio' },
  { id: 'wmp-3', name: '56K V.90 Dial-Up Modem Symphony', url: '/sounds/dialup-modem.mp3', kind: 'audio' },
  { id: 'wmp-4', name: 'Windows XP Logon Chord', url: '/sounds/logon.wav', kind: 'audio' },
  { id: 'wmp-5', name: 'Windows XP Shutdown Chord', url: '/sounds/shutdown.wav', kind: 'audio' },
];

export const MediaPlayerApp: React.FC<{ payload?: Record<string, unknown> }> = ({ payload }) => {
  const { vfs, openApp } = useOS();
  const { volume, muted } = useSound();

  const [localUploads, setLocalUploads] = useState<MediaTrackItem[]>([]);

  // Automatically include all persistent videos in My Videos & My Videos\Arena AI!
  const vfsVideos = useMemo<MediaTrackItem[]>(() => {
    return vfs
      .filter(
        (n) =>
          n.type === 'file' &&
          n.content &&
          (n.mime?.startsWith('video/') || n.name.endsWith('.webm') || n.name.endsWith('.mp4'))
      )
      .map((n) => ({
        id: n.id,
        name: `🎬 ${n.name}`,
        url: n.content!,
        kind: 'video' as const,
      }));
  }, [vfs]);

  const tracks = useMemo<MediaTrackItem[]>(
    () => [...vfsVideos, ...localUploads, ...DEFAULT_WMP_AUDIO],
    [vfsVideos, localUploads]
  );

  const [currentIdx, setCurrentIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const activeTrack = tracks[currentIdx] || DEFAULT_WMP_AUDIO[0];

  // Auto-select VFS video if passed via payload.vfsId
  useEffect(() => {
    const vfsId = payload?.vfsId as string | undefined;
    if (!vfsId) return;
    const idx = tracks.findIndex((t) => t.id === vfsId);
    if (idx !== -1) {
      setCurrentIdx(idx);
      setPlaying(true);
    }
  }, [payload?.vfsId, tracks]);

  useEffect(() => {
    if (activeTrack.kind === 'video') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let t = 0;

    const draw = () => {
      t += playing ? 0.065 : 0.012;
      ctx.fillStyle = 'rgba(4, 12, 32, 0.22)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < 36; i++) {
        const x = (i / 36) * canvas.width;
        const amp = playing ? 45 + Math.sin(t * 2.5 + i * 0.4) * 55 + Math.cos(t * 4 - i) * 28 : 14;
        const hue = (t * 45 + i * 7) % 360;
        ctx.fillStyle = `hsl(${hue}, 90%, 60%)`;
        ctx.fillRect(x + 2, canvas.height / 2 - amp / 2, canvas.width / 36 - 4, amp);
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [playing, activeTrack.kind]);

  const playTrack = (idx: number) => {
    setCurrentIdx(idx);
    const chosen = tracks[idx];
    if (!chosen) return;
    if (chosen.kind === 'audio' && audioRef.current) {
      audioRef.current.src = chosen.url;
      audioRef.current.volume = muted ? 0 : volume;
      audioRef.current.play().then(() => setPlaying(true)).catch(() => {});
    } else {
      setPlaying(true);
    }
  };

  const handleLocalMedia = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const kind: 'audio' | 'video' = file.type.startsWith('video/') ? 'video' : 'audio';
    const item: MediaTrackItem = {
      id: `up-${Date.now()}`,
      name: `${kind === 'video' ? '🎬 ' : ''}${file.name}`,
      url,
      kind,
    };
    setLocalUploads((prev) => [item, ...prev]);
    setCurrentIdx(vfsVideos.length);
    setPlaying(true);
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#1e3a8a', color: '#fff', fontSize: 11, minHeight: 0 }}>
      <audio
        ref={audioRef}
        src={activeTrack.kind === 'audio' ? activeTrack.url : undefined}
        onEnded={() => setPlaying(false)}
      />

      {/* Top Glossy WMP9 Header */}
      <div
        style={{
          padding: '6px 12px',
          background: 'linear-gradient(180deg, #60a5fa 0%, #1d4ed8 100%)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontWeight: 700,
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <span>🎵 Now Playing: {activeTrack.name}</span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            className="xp-btn"
            style={{ color: '#000' }}
            onClick={() => openApp('arena-ai')}
          >
            ✨ Generate Video in Arena AI
          </button>
          <label className="xp-btn" style={{ cursor: 'pointer', color: '#000' }}>
            📂 Open Audio/Video
            <input type="file" accept="audio/*,video/*" hidden onChange={handleLocalMedia} />
          </label>
        </div>
      </div>

      {/* Center Video / Visualizer + Playlist */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 225px', minHeight: 0 }}>
        {activeTrack.kind === 'video' ? (
          <div style={{ background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
            <video
              ref={videoRef}
              key={activeTrack.url}
              src={activeTrack.url}
              controls
              autoPlay
              loop
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              style={{ width: '100%', height: '100%', maxHeight: '100%', objectFit: 'contain' }}
            />
          </div>
        ) : (
          <canvas ref={canvasRef} width={440} height={300} style={{ width: '100%', height: '100%', background: '#040c20' }} />
        )}
        <div style={{ background: '#0f172a', borderLeft: '1px solid #334155', padding: 8, overflowY: 'auto' }}>
          <div style={{ fontWeight: 700, color: '#93c5fd', marginBottom: 6 }}>
            Media Library ({tracks.length})
          </div>
          {tracks.map((tr, i) => (
            <div
              key={tr.id}
              onClick={() => playTrack(i)}
              style={{
                padding: '5px 6px',
                borderRadius: 3,
                cursor: 'pointer',
                background: i === currentIdx ? '#2563eb' : 'transparent',
                marginBottom: 2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {i === currentIdx && playing ? '▶ ' : ''}
              {tr.name}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Glossy Silver/Blue Transport Bar */}
      <div
        style={{
          height: 44,
          background: 'linear-gradient(180deg, #dbeafe 0%, #93c5fd 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          color: '#000',
        }}
      >
        <button className="xp-btn" onClick={() => playTrack((currentIdx - 1 + tracks.length) % tracks.length)}>
          ⏮ Prev
        </button>
        <button
          className="xp-btn xp-btn-primary"
          onClick={() => {
            if (activeTrack.kind === 'video' && videoRef.current) {
              if (playing) {
                videoRef.current.pause();
                setPlaying(false);
              } else {
                videoRef.current.play().then(() => setPlaying(true)).catch(() => {});
              }
              return;
            }
            if (!audioRef.current) return;
            if (playing) {
              audioRef.current.pause();
              setPlaying(false);
            } else {
              audioRef.current.volume = muted ? 0 : volume;
              audioRef.current.play().then(() => setPlaying(true)).catch(() => {});
            }
          }}
        >
          {playing ? '⏸ Pause' : '▶ Play'}
        </button>
        <button
          className="xp-btn"
          onClick={() => {
            if (activeTrack.kind === 'video' && videoRef.current) {
              videoRef.current.pause();
              videoRef.current.currentTime = 0;
            } else if (audioRef.current) {
              audioRef.current.pause();
              audioRef.current.currentTime = 0;
            }
            setPlaying(false);
          }}
        >
          ⏹ Stop
        </button>
        <button className="xp-btn" onClick={() => playTrack((currentIdx + 1) % tracks.length)}>
          ⏭ Next
        </button>
      </div>
    </div>
  );
};

/* ============================================================================
   2. COMMAND PROMPT (cmd.exe with VFS + xp-get + arena/slingo/wuauclt)
   ============================================================================ */
export const CommandPromptApp: React.FC = () => {
  const { vfs, openApp, launchInstallerWizard, aolConnected } = useOS();
  const [fgColor, setFgColor] = useState('#c0c0c0');
  const [lines, setLines] = useState<string[]>([
    'Microsoft Windows XP [Version 5.1.2600]',
    '(C) Copyright 1985-2001 Microsoft Corp.',
    '',
    'Type "help" for commands, "start arena" for Arena AI, or "start slingo"!',
  ]);
  const [cmd, setCmd] = useState('');
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView();
  }, [lines]);

  const execCmd = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = cmd.trim();
    setCmd('');
    const out: string[] = [`C:\\Documents and Settings\\Administrator>${raw}`];
    const lower = raw.toLowerCase();

    if (!raw) {
      setLines((l) => [...l, ...out]);
      return;
    }
    if (lower === 'cls' || lower === 'clear') {
      setLines([]);
      return;
    }
    if (lower === 'help') {
      out.push(
        'Available Commands:',
        '  DIR             Lists files in My Documents & Persistent VFS',
        '  VER             Displays Windows XP version',
        '  IPCONFIG        Displays AOL 56K PPP adapter configuration',
        '  WUAUCLT         Opens Microsoft Windows Update',
        '  COLOR 0A        Matrix green terminal text (07 resets)',
        '  START <app>     Opens app (arena, slingo, iexplore, pinball, winmine, sol, aol, aim)',
        '  XP-GET LIST     Lists installable .EXE software packages',
        '  XP-GET INSTALL <id>  Launches Setup Wizard (e.g. xp-get install winamp)'
      );
    } else if (lower === 'ver') {
      out.push('', 'Microsoft Windows XP [Version 5.1.2600 Service Pack 3 + Arena AI Copilot]');
    } else if (lower === 'wuauclt') {
      openApp('windows-update');
      out.push('Launched Microsoft Windows Update (wuauclt.exe).');
    } else if (lower === 'dir') {
      out.push(' Directory of C:\\Documents and Settings\\My Documents', '');
      vfs
        .filter((n) => n.parentId === 'my-docs')
        .forEach((n) => {
          out.push(`${n.modifiedAt}    ${n.type === 'folder' ? '<DIR>     ' : '     1,024'} ${n.name}`);
        });
    } else if (lower === 'ipconfig') {
      out.push(
        'Windows IP Configuration',
        '',
        'PPP adapter America Online 56K Dial-Up:',
        `   Media State . . . . . . : ${aolConnected ? 'Connected (56.0 Kbps)' : 'Media disconnected'}`,
        `   IP Address. . . . . . . : ${aolConnected ? '172.164.82.19' : '0.0.0.0'}`,
        '   Default Gateway . . . . : 205.188.0.1'
      );
    } else if (lower === 'color 0a') {
      setFgColor('#22c55e');
    } else if (lower === 'color 07') {
      setFgColor('#c0c0c0');
    } else if (lower === 'xp-get list') {
      out.push('Installable XP Software Packages:');
      INSTALLABLE_CATALOG.forEach((p) => {
        out.push(`  ${p.appId.padEnd(14)} ${p.name} v${p.version} (${p.sizeMB} MB)`);
      });
    } else if (lower.startsWith('xp-get install ')) {
      const q = lower.replace('xp-get install ', '').trim();
      const found = INSTALLABLE_CATALOG.find(
        (p) => p.appId.includes(q) || p.name.toLowerCase().includes(q)
      );
      if (found) {
        out.push(`Launching ${found.installerFile} Setup Wizard...`);
        launchInstallerWizard(found);
      } else {
        out.push(`Package "${q}" not found. Try "xp-get list".`);
      }
    } else if (lower.startsWith('start ')) {
      const target = lower.replace('start ', '').trim();
      const map: Record<string, BuiltinAppId> = {
        arena: 'arena-ai',
        'arena-ai': 'arena-ai',
        slingo: 'slingo',
        iexplore: 'ie',
        ie: 'ie',
        wuauclt: 'windows-update',
        pinball: 'pinball',
        winmine: 'minesweeper',
        minesweeper: 'minesweeper',
        sol: 'solitaire',
        solitaire: 'solitaire',
        spider: 'spider',
        freecell: 'freecell',
        hearts: 'hearts',
        aol: 'aol-dialer',
        aim: 'aim',
        paint: 'paint',
        mspaint: 'paint',
        calc: 'calculator',
        notepad: 'notepad',
      };
      if (map[target]) {
        openApp(map[target]);
        out.push(`Started ${target}.exe`);
      } else {
        out.push(`Cannot find '${target}'.`);
      }
    } else {
      out.push(`'${raw}' is not recognized as an internal or external command. Type HELP.`);
    }

    setLines((l) => [...l, ...out]);
  };

  return (
    <div
      style={{
        flex: 1,
        background: '#000',
        color: fgColor,
        fontFamily: "'Lucida Console', 'Courier New', monospace",
        fontSize: 13,
        padding: 10,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {lines.map((ln, idx) => (
        <div key={idx} style={{ whiteSpace: 'pre-wrap', minHeight: 16 }}>
          {ln}
        </div>
      ))}
      <form onSubmit={execCmd} style={{ display: 'flex', alignItems: 'center', marginTop: 2 }}>
        <span>C:\Documents and Settings\Administrator&gt;</span>
        <input
          autoFocus
          value={cmd}
          onChange={(e) => setCmd(e.target.value)}
          style={{
            flex: 1,
            background: '#000',
            color: fgColor,
            border: 'none',
            outline: 'none',
            fontFamily: 'inherit',
            fontSize: 'inherit',
            marginLeft: 3,
          }}
        />
      </form>
      <div ref={bottomRef} />
    </div>
  );
};

/* ============================================================================
   3. WINDOWS TASK MANAGER (taskmgr.exe)
   ============================================================================ */
export const TaskManagerApp: React.FC = () => {
  const { windows, closeWindow, focusWindow, openApp } = useOS();
  const [tab, setTab] = useState<'apps' | 'procs' | 'perf'>('apps');
  const [selectedWin, setSelectedWin] = useState<string | null>(null);
  const [cpuHist, setCpuHist] = useState<number[]>(Array(28).fill(8));

  useEffect(() => {
    const iv = window.setInterval(() => {
      setCpuHist((prev) => [
        ...prev.slice(1),
        Math.min(95, 6 + windows.length * 5 + Math.floor(Math.random() * 18)),
      ]);
    }, 900);
    return () => clearInterval(iv);
  }, [windows.length]);

  const curCpu = cpuHist[cpuHist.length - 1];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#ece9d8', padding: 8, fontSize: 11, minHeight: 0 }}>
      <div className="xp-tabs">
        <div className={`xp-tab ${tab === 'apps' ? 'active' : ''}`} onClick={() => setTab('apps')}>
          Applications
        </div>
        <div className={`xp-tab ${tab === 'procs' ? 'active' : ''}`} onClick={() => setTab('procs')}>
          Processes
        </div>
        <div className={`xp-tab ${tab === 'perf' ? 'active' : ''}`} onClick={() => setTab('perf')}>
          Performance
        </div>
      </div>

      <div className="xp-tab-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {tab === 'apps' && (
          <>
            <div style={{ flex: 1, border: '1px solid #7f9db9', background: '#fff', overflowY: 'auto', marginBottom: 8 }}>
              {windows.map((w) => (
                <div
                  key={w.id}
                  onClick={() => setSelectedWin(w.id)}
                  style={{
                    padding: '4px 8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    background: selectedWin === w.id ? '#316ac5' : 'transparent',
                    color: selectedWin === w.id ? '#fff' : '#000',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <img src={w.icon} alt="" style={{ width: 14, height: 14 }} />
                    {w.title}
                  </span>
                  <span>Running</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
              <button
                className="xp-btn"
                disabled={!selectedWin}
                onClick={() => selectedWin && closeWindow(selectedWin)}
              >
                End Task
              </button>
              <button
                className="xp-btn"
                disabled={!selectedWin}
                onClick={() => selectedWin && focusWindow(selectedWin)}
              >
                Switch To
              </button>
              <button className="xp-btn" onClick={() => openApp('run-dialog')}>
                New Task...
              </button>
            </div>
          </>
        )}

        {tab === 'procs' && (
          <div style={{ flex: 1, border: '1px solid #7f9db9', background: '#fff', overflowY: 'auto', padding: 6 }}>
            {[
              { name: 'explorer.exe', user: 'Administrator', mem: '18,420 K' },
              { name: 'arena_agent.exe', user: 'Administrator', mem: '31,200 K' },
              { name: 'svchost.exe', user: 'SYSTEM', mem: '12,104 K' },
              { name: 'waol.exe', user: 'Administrator', mem: '24,880 K' },
              ...windows.map((w) => ({
                name: `${w.appId}.exe`,
                user: 'Administrator',
                mem: `${8 + (w.title.length % 19)},412 K`,
              })),
            ].map((p, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 110px 80px', padding: '3px 4px', borderBottom: '1px solid #f1f5f9' }}>
                <span>{p.name}</span>
                <span>{p.user}</span>
                <span style={{ textAlign: 'right' }}>{p.mem}</span>
              </div>
            ))}
          </div>
        )}

        {tab === 'perf' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontWeight: 700 }}>CPU Usage History ({curCpu}%)</div>
            <div
              style={{
                height: 120,
                background: '#000',
                border: '2px inset #808080',
                backgroundImage:
                  'linear-gradient(#003800 1px, transparent 1px), linear-gradient(90deg, #003800 1px, transparent 1px)',
                backgroundSize: '14px 14px',
                display: 'flex',
                alignItems: 'flex-end',
                gap: 2,
                padding: 4,
              }}
            >
              {cpuHist.map((val, idx) => (
                <div
                  key={idx}
                  style={{
                    flex: 1,
                    height: `${val}%`,
                    background: '#00ff00',
                  }}
                />
              ))}
            </div>
            <div>Physical Memory (K): Total 524,288 | Available 361,120</div>
          </div>
        )}
      </div>

      <div style={{ paddingTop: 4, display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
        <span>Processes: {4 + windows.length}</span>
        <span>CPU Usage: {curCpu}%</span>
        <span>Commit Charge: 164M / 1256M</span>
      </div>
    </div>
  );
};

/* ============================================================================
   4. RUN DIALOG (Win+R / Start -> Run...)
   ============================================================================ */
export const RunDialogApp: React.FC<{ windowId: string }> = ({ windowId }) => {
  const { openApp, closeWindow } = useOS();
  const { playSound } = useSound();
  const [input, setInput] = useState('slingo');

  const handleRun = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = input.trim();
    const cmd = raw.toLowerCase();
    const map: Record<string, BuiltinAppId> = {
      arena: 'arena-ai',
      'arena-ai': 'arena-ai',
      slingo: 'slingo',
      wuauclt: 'windows-update',
      'windows-update': 'windows-update',
      cmd: 'cmd',
      calc: 'calculator',
      notepad: 'notepad',
      mspaint: 'paint',
      paint: 'paint',
      winmine: 'minesweeper',
      minesweeper: 'minesweeper',
      sol: 'solitaire',
      solitaire: 'solitaire',
      spider: 'spider',
      freecell: 'freecell',
      mshearts: 'hearts',
      hearts: 'hearts',
      pinball: 'pinball',
      aol: 'aol-dialer',
      gmail: 'aol-mailbox',
      aim: 'aim',
      iexplore: 'ie',
      wmplayer: 'wmplayer',
      taskmgr: 'taskmgr',
      control: 'control-panel',
      'appwiz.cpl': 'software-center',
    };
    if (map[cmd]) {
      openApp(map[cmd]);
      closeWindow(windowId);
    } else if (cmd.startsWith('iexplore ')) {
      openApp('ie', { url: raw.slice(9).trim() });
      closeWindow(windowId);
    } else if (cmd.startsWith('http') || cmd.includes('.com') || cmd.includes('.ai') || cmd.includes('.org')) {
      openApp('ie', { url: raw });
      closeWindow(windowId);
    } else {
      playSound('error');
      alert(
        `Windows cannot find '${input}'. Try: arena, slingo, iexplore, wuauclt, pinball, winmine, sol, spider, freecell, mshearts, aol, gmail, aim, cmd, mspaint`
      );
    }
  };

  return (
    <form onSubmit={handleRun} style={{ flex: 1, padding: 14, background: '#ece9d8', fontSize: 11, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <img src="/icons/743(32x32).png" alt="" style={{ width: 32, height: 32 }} />
        <div>Type the name of a program, folder, document, or Internet resource, and Windows will open it for you.</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <b>Open:</b>
        <input
          autoFocus
          className="xp-input"
          style={{ flex: 1 }}
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
        <button type="submit" className="xp-btn xp-btn-primary">
          OK
        </button>
        <button type="button" className="xp-btn" onClick={() => closeWindow(windowId)}>
          Cancel
        </button>
      </div>
    </form>
  );
};

/* ============================================================================
   5. TOUR WINDOWS XP
   ============================================================================ */
export const TourXPApp: React.FC = () => {
  const { openApp } = useOS();

  return (
    <div
      style={{
        flex: 1,
        background: 'linear-gradient(135deg, #00309c 0%, #245edb 55%, #5a7edc 100%)',
        color: '#fff',
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        overflowY: 'auto',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <WindowsXPFlagSVG size={68} />
        <div>
          <h2 style={{ margin: 0, fontSize: 24 }}>Welcome to Microsoft Windows XP</h2>
          <div style={{ color: '#bfdbfe', fontSize: 13 }}>
            Built-in Arena AI Agent, Classic Slingo Deluxe, Persistent IE6, Original XP Games & AOL 9.8 + Gmail!
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, margin: '14px 0' }}>
        {[
          {
            title: '✨ Arena AI Agent Built Into XP',
            desc: 'Run autonomous coding & OS tasks, generate HD PNG images and playable WebM videos saved straight into persistent VFS storage!',
            btn: 'Open Arena AI Agent',
            action: () => openApp('arena-ai'),
          },
          {
            title: '🎰 Classic AOL Slingo Deluxe + 6 XP Games',
            desc: 'Play authentic 20-spin Slingo Deluxe (Jokers, Gold Coins, Devil & Cherub!), Space Cadet Pinball, Minesweeper, Solitaire, Spider, FreeCell & Hearts!',
            btn: 'Play Slingo Deluxe',
            action: () => openApp('slingo'),
          },
          {
            title: '🌐 Fast Persistent Internet Explorer 6',
            desc: 'Browse the real web inside classic IE6 with persistent tabs, Favorites, live search, https://arena.ai/agent, and anti-X-Frame Turbo Reader!',
            btn: 'Open Internet Explorer 6',
            action: () => openApp('ie'),
          },
          {
            title: '📞 AOL 56K Dial-Up + Gmail & Updates',
            desc: 'Dial 959-262-8674, hear "You\'ve got mail!", connect Gmail, or install Royale & Zune themes in Windows Update!',
            btn: 'Open Windows Update',
            action: () => openApp('windows-update'),
          },
        ].map((card) => (
          <div
            key={card.title}
            style={{
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.28)',
              borderRadius: 8,
              padding: 12,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 8,
            }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{card.title}</div>
              <div style={{ fontSize: 11, color: '#dbeafe', marginTop: 4, lineHeight: 1.4 }}>{card.desc}</div>
            </div>
            <button className="xp-btn" style={{ alignSelf: 'flex-start' }} onClick={card.action}>
              {card.btn}
            </button>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 11, color: '#bfdbfe', textAlign: 'right' }}>
        Microsoft Windows XP Professional Service Pack 3 — Persistent IndexedDB Web OS
      </div>
    </div>
  );
};

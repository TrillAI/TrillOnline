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
   2. COMMAND PROMPT (cmd.exe — Full VFS Navigation + Networking + PowerShell/APK)
   ============================================================================ */
const CMD_FOLDER_PATHS: Record<string, string> = {
  root: 'C:\\',
  'c:': 'C:\\',
  'c-windows': 'C:\\WINDOWS',
  'c-progfiles': 'C:\\Program Files',
  'c-docs-root': 'C:\\Documents and Settings',
  'my-docs': 'C:\\Documents and Settings\\Administrator\\My Documents',
  'my-pics': 'C:\\Documents and Settings\\Administrator\\My Documents\\My Pictures',
  'my-videos': 'C:\\Documents and Settings\\Administrator\\My Documents\\My Videos',
  'my-music': 'C:\\Documents and Settings\\Administrator\\My Documents\\My Music',
  'shared-dl': 'C:\\Documents and Settings\\Administrator\\Downloads',
};

const CMD_KEYWORDS = [
  'help',
  'dir',
  'cd',
  'tree',
  'type',
  'mkdir',
  'del',
  'echo',
  'cls',
  'ver',
  'winver',
  'systeminfo',
  'tasklist',
  'taskkill',
  'ipconfig',
  'ping',
  'netstat',
  'color',
  'powershell',
  'apk',
  'xp-get',
  'start',
];

export const CommandPromptApp: React.FC = () => {
  const {
    vfs,
    windows,
    closeWindow,
    openApp,
    createFile,
    createFolder,
    deleteNodeToRecycleBin,
    launchInstallerWizard,
    aolConnected,
  } = useOS();

  const [bgColor, setBgColor] = useState('#000000');
  const [fgColor, setFgColor] = useState('#c0c0c0');
  const [cwdId, setCwdId] = useState<string>('my-docs');
  const [lines, setLines] = useState<string[]>([
    'TrillXP — Microsoft Windows XP [Version 5.1.2600 Service Pack 3]',
    '(C) Copyright 1985-2001 Microsoft Corp. Interactive 2000s Time Capsule.',
    '',
    'Type "help" for commands, "powershell" for PowerShell 1.0, "apk" for TrillXP.apk, or "start slingo"!',
    '',
  ]);
  const [cmd, setCmd] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView();
  }, [lines]);

  const curPromptPath =
    CMD_FOLDER_PATHS[cwdId] ||
    `C:\\Documents and Settings\\Administrator\\${vfs.find((n) => n.id === cwdId)?.name || 'My Documents'}`;

  const execCmd = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = cmd.trim();
    setCmd('');
    const out: string[] = [`${curPromptPath}>${raw}`];
    const lower = raw.toLowerCase();

    if (!raw) {
      setLines((l) => [...l, ...out]);
      return;
    }

    setHistory((h) => [...h, raw]);
    setHistIdx(-1);

    if (lower === 'cls' || lower === 'clear') {
      setLines([]);
      return;
    }

    // Handle output redirection: echo hello world > note.txt
    if (lower.startsWith('echo ') && raw.includes('>')) {
      const [left, right] = raw.split('>');
      const textBody = left.replace(/^echo\s+/i, '').trim();
      const targetName = (right || '').trim() || 'note.txt';
      createFile(cwdId, targetName, textBody, 'text/plain');
      out.push(`1 file(s) written: ${targetName}`);
      setLines((l) => [...l, ...out]);
      return;
    }

    const parts = raw.split(/\s+/);
    const verb = parts[0].toLowerCase();
    const rest = parts.slice(1).join(' ').replace(/^["']|["']$/g, '');

    if (verb === 'help' || verb === '/?') {
      out.push(
        'TrillXP Command Prompt (cmd.exe) Reference:',
        '  DIR                  Lists files & subdirectories in current VFS folder',
        '  CD <folder|..|\\>     Changes current directory',
        '  TREE                 Displays graphical folder tree of C:\\',
        '  TYPE <filename>      Displays text contents of a file',
        '  ECHO text > file.txt Writes a persistent file into current folder',
        '  MKDIR <name>         Creates a new directory',
        '  DEL <name>           Moves a file/folder to Recycle Bin',
        '  SYSTEMINFO / VER     Displays TrillXP OS & hardware specifications',
        '  TASKLIST / TASKKILL  Lists or closes running XP window processes',
        '  IPCONFIG / PING / NETSTAT  Displays 56K & network diagnostics',
        '  COLOR <0A|07|1F|0E>  Changes console colors (0A = Matrix green, 1F = BSOD blue)',
        '  POWERSHELL           Launches Windows PowerShell 1.0 (Monad)',
        '  APK                  Downloads signed Android TrillXP.apk & opens Mobile Center',
        '  START <program>      Opens any app (slingo, sol, spider, skifree, jezzball, mahjong, tetris, arena)',
        '  XP-GET LIST / XP-GET INSTALL <id>  Installs .EXE software packages'
      );
    } else if (verb === 'ver') {
      out.push('', 'TrillXP — Microsoft Windows XP [Version 5.1.2600 Service Pack 3]');
    } else if (verb === 'winver') {
      openApp('winver');
      out.push('Opened About TrillXP (winver.exe).');
    } else if (verb === 'systeminfo') {
      out.push(
        'Host Name:                 TRILLXP-PC',
        'OS Name:                   TrillXP (Microsoft Windows XP Professional)',
        'OS Version:                5.1.2600 Service Pack 3 Build 2600',
        'System Purpose:            2000s Computing Time Machine & Educator Museum',
        'Processor(s):              Intel(R) Pentium(R) 4 CPU 2.80GHz',
        'Total Physical Memory:     512 MB',
        'Shells Installed:          cmd.exe + Windows PowerShell 1.0 (KB926139)',
        'Android Companion APK:     /downloads/TrillXP.apk (ai.trill.trillxp)'
      );
    } else if (verb === 'dir' || verb === 'ls') {
      const items = vfs.filter((n) => n.parentId === cwdId);
      out.push(` Volume in drive C is TRILLXP_OS`, ` Directory of ${curPromptPath}`, '');
      items.forEach((n) => {
        const tag = n.type === 'folder' || n.type === 'drive' ? '<DIR>         ' : String(n.sizeBytes || 1024).padStart(14);
        out.push(`${n.modifiedAt.padEnd(16)}  ${tag} ${n.name}`);
      });
      out.push(`               ${items.length} item(s)`);
    } else if (verb === 'tree') {
      out.push('Folder PATH listing for volume TRILLXP_OS', 'C:.');
      vfs
        .filter((n) => n.type === 'folder')
        .forEach((f) => {
          out.push(`├───${f.name}`);
        });
    } else if (verb === 'cd' || verb === 'chdir') {
      if (!rest) {
        out.push(curPromptPath);
      } else if (rest === '\\' || rest.toLowerCase() === 'c:\\' || rest.toLowerCase() === 'c:') {
        setCwdId('c:');
      } else if (rest === '..') {
        const cur = vfs.find((n) => n.id === cwdId);
        if (cur?.parentId) setCwdId(cur.parentId);
      } else {
        const child = vfs.find(
          (n) =>
            (n.parentId === cwdId || cwdId === 'c:') &&
            (n.type === 'folder' || n.type === 'drive') &&
            n.name.toLowerCase() === rest.toLowerCase()
        );
        if (child) setCwdId(child.id);
        else out.push('The system cannot find the path specified.');
      }
    } else if (verb === 'type' || verb === 'cat') {
      const f = vfs.find((n) => n.parentId === cwdId && n.name.toLowerCase() === rest.toLowerCase());
      if (!f) out.push('The system cannot find the file specified.');
      else out.push(...(f.content || '(Binary or shortcut file)').split('\n'));
    } else if (verb === 'mkdir' || verb === 'md') {
      const fname = rest || 'New Folder';
      createFolder(cwdId, fname);
      out.push(`Created directory: ${fname}`);
    } else if (verb === 'del' || verb === 'erase' || verb === 'rm') {
      const target = vfs.find((n) => n.parentId === cwdId && n.name.toLowerCase() === rest.toLowerCase());
      if (!target) out.push(`Could Not Find ${curPromptPath}\\${rest}`);
      else {
        deleteNodeToRecycleBin(target.id);
        out.push(`Deleted ${target.name} (moved to Recycle Bin).`);
      }
    } else if (verb === 'echo') {
      out.push(rest);
    } else if (verb === 'date') {
      out.push(`The current date is: ${new Date().toLocaleDateString()}`);
    } else if (verb === 'time') {
      out.push(`The current time is: ${new Date().toLocaleTimeString()}`);
    } else if (verb === 'tasklist') {
      out.push(
        'Image Name                   PID Session Name     Mem Usage',
        '========================= ====== ================ ============',
        'explorer.exe                 400 Console             18,420 K',
        'arena_agent.exe              712 Console             31,200 K',
        ...windows.map(
          (w, i) => `${(w.appId + '.exe').padEnd(25)} ${String(1400 + i * 44).padStart(6)} Console             14,208 K`
        )
      );
    } else if (verb === 'taskkill') {
      const q = rest.replace(/^\/im\s+/i, '').replace(/\.exe$/i, '').trim().toLowerCase();
      const hit = windows.find((w) => w.appId.toLowerCase() === q);
      if (!hit) out.push(`ERROR: The process "${q}" not found.`);
      else {
        closeWindow(hit.id);
        out.push(`SUCCESS: Sent termination signal to process "${hit.appId}.exe".`);
      }
    } else if (verb === 'ipconfig') {
      out.push(
        'Windows IP Configuration',
        '',
        'Ethernet adapter TrillXP High-Speed Bridge:',
        '   Connection-specific DNS Suffix  . : trillxp.local',
        '   IP Address. . . . . . . . . . . . : 192.168.1.104',
        '   Default Gateway . . . . . . . . . : 192.168.1.1',
        '',
        'PPP adapter America Online 56K Dial-Up:',
        `   Media State . . . . . . . . . . . : ${aolConnected ? 'Connected (56.0 Kbps V.90)' : 'Media disconnected'}`,
        `   IP Address. . . . . . . . . . . . : ${aolConnected ? '172.164.82.19' : '0.0.0.0'}`
      );
    } else if (verb === 'ping') {
      const h = rest || 'arena.ai';
      out.push(
        `Pinging ${h} [104.18.26.120] with 32 bytes of data:`,
        'Reply from 104.18.26.120: bytes=32 time=13ms TTL=57',
        'Reply from 104.18.26.120: bytes=32 time=11ms TTL=57',
        'Ping statistics: Sent = 2, Received = 2, Lost = 0 (0% loss)'
      );
    } else if (verb === 'netstat') {
      out.push(
        'Active Connections',
        '  Proto  Local Address          Foreign Address        State',
        '  TCP    192.168.1.104:1032     arena.ai:443           ESTABLISHED',
        `  TCP    192.168.1.104:5190     aim.oscar.aol.com:5190 ${aolConnected ? 'ESTABLISHED' : 'SYN_SENT'}`
      );
    } else if (verb === 'color') {
      const code = rest.toUpperCase();
      if (code === '0A') {
        setBgColor('#000000');
        setFgColor('#22c55e');
      } else if (code === '1F') {
        setBgColor('#0000aa');
        setFgColor('#ffffff');
      } else if (code === '0E') {
        setBgColor('#000000');
        setFgColor('#fde047');
      } else {
        setBgColor('#000000');
        setFgColor('#c0c0c0');
      }
    } else if (verb === 'powershell' || verb === 'pwsh') {
      openApp('powershell');
      out.push('Launched Windows PowerShell 1.0 (powershell.exe).');
    } else if (verb === 'apk') {
      openApp('apk-installer');
      const a = document.createElement('a');
      a.href = '/downloads/TrillXP.apk';
      a.download = 'TrillXP.apk';
      a.click();
      out.push('Downloading /downloads/TrillXP.apk (ai.trill.trillxp) & opened TrillXP Mobile Center!');
    } else if (verb === 'wuauclt') {
      openApp('windows-update');
      out.push('Launched Microsoft Windows Update (wuauclt.exe).');
    } else if (verb === 'regedit') {
      openApp('regedit');
      out.push('Launched Registry Editor (regedit.exe).');
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
    } else if (verb === 'start') {
      const target = rest.toLowerCase().replace(/\.exe$/, '');
      const map: Record<string, BuiltinAppId> = {
        arena: 'arena-ai',
        'arena-ai': 'arena-ai',
        slingo: 'slingo',
        powershell: 'powershell',
        museum: 'trillxp-museum',
        apk: 'apk-installer',
        wordpad: 'wordpad',
        write: 'wordpad',
        regedit: 'regedit',
        winver: 'winver',
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
        skifree: 'skifree',
        jezzball: 'jezzball',
        mahjong: 'mahjong',
        checkers: 'checkers',
        tetris: 'tetris',
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
        out.push(`Cannot find '${target}'. Type HELP for program list.`);
      }
    } else {
      out.push(`'${parts[0]}' is not recognized as an internal or external command. Type HELP.`);
    }

    setLines((l) => [...l, ...out]);
  };

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      style={{
        flex: 1,
        background: bgColor,
        color: fgColor,
        fontFamily: "'Lucida Console', 'Courier New', monospace",
        fontSize: 13,
        padding: 10,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'text',
      }}
    >
      {lines.map((ln, idx) => (
        <div key={idx} style={{ whiteSpace: 'pre-wrap', minHeight: 16 }}>
          {ln}
        </div>
      ))}
      <form onSubmit={execCmd} style={{ display: 'flex', alignItems: 'center', marginTop: 2 }}>
        <span style={{ whiteSpace: 'pre' }}>{curPromptPath}&gt;</span>
        <input
          ref={inputRef}
          autoFocus
          value={cmd}
          onChange={(e) => setCmd(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              if (history.length === 0) return;
              const next = histIdx === -1 ? history.length - 1 : Math.max(0, histIdx - 1);
              setHistIdx(next);
              setCmd(history[next]);
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              if (histIdx === -1) return;
              if (histIdx >= history.length - 1) {
                setHistIdx(-1);
                setCmd('');
              } else {
                setHistIdx(histIdx + 1);
                setCmd(history[histIdx + 1]);
              }
            } else if (e.key === 'Tab') {
              e.preventDefault();
              const q = cmd.trim().toLowerCase();
              const match = CMD_KEYWORDS.find((k) => k.startsWith(q));
              if (match) setCmd(match + ' ');
            }
          }}
          style={{
            flex: 1,
            background: 'transparent',
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
      powershell: 'powershell',
      pwsh: 'powershell',
      wordpad: 'wordpad',
      write: 'wordpad',
      regedit: 'regedit',
      winver: 'winver',
      museum: 'trillxp-museum',
      trillxp: 'trillxp-museum',
      apk: 'apk-installer',
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
      skifree: 'skifree',
      jezzball: 'jezzball',
      mahjong: 'mahjong',
      checkers: 'checkers',
      tetris: 'tetris',
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
        `Windows cannot find '${input}'. Try: powershell, cmd, slingo, sol, spider, freecell, skifree, jezzball, mahjong, checkers, tetris, museum, apk, wordpad, regedit, winver, arena, iexplore, aol, aim`
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
          <h2 style={{ margin: 0, fontSize: 24 }}>
            Welcome to Trill<span style={{ color: '#fde047' }}>XP</span> (Windows XP SP3)
          </h2>
          <div style={{ color: '#bfdbfe', fontSize: 13 }}>
            Go back to experience the early-2000s PC era — or educate anyone who missed Dial-Up, AOL, Classic Slingo &amp; Windows XP!
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, margin: '14px 0' }}>
        {[
          {
            title: '🏛️ 2000s Time Capsule & Educator Museum',
            desc: 'Explore interactive exhibits, Then-vs-Now history, iconic 56K/AOL/XP sound artifacts, and hands-on quests!',
            btn: 'Open TrillXP Museum',
            action: () => openApp('trillxp-museum'),
          },
          {
            title: '📱 Download Official TrillXP.apk (Android)',
            desc: 'Install our V1+V2 cryptographically signed Android package (ai.trill.trillxp) or add as a fullscreen PWA!',
            btn: 'Get TrillXP.apk',
            action: () => openApp('apk-installer'),
          },
          {
            title: '🎰 Classic AOL Slingo + 12 PC Games',
            desc: 'Play authentic Slingo (with the Devil Laugh!), zero-lag Solitaire & Spider, SkiFree, JezzBall, Mahjong, Tetris & Pinball!',
            btn: 'Play Slingo Deluxe',
            action: () => openApp('slingo'),
          },
          {
            title: '💻 PowerShell 1.0, CMD & Arena AI Agent',
            desc: 'Run Windows PowerShell 1.0 (Monad), full cmd.exe, AOL 9.8 + Gmail, IE6, and the built-in Arena AI Agent!',
            btn: 'Open PowerShell 1.0',
            action: () => openApp('powershell'),
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

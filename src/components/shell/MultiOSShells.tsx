import React, { useState, useEffect } from 'react';
import {
  useOS,
  OS_METADATA,
  OSType,
  BuiltinAppId,
} from '../../context/OSContext';
import { useSound } from '../../context/SoundContext';

const ALL_OS_ORDER: OSType[] = ['winxp', 'win10', 'macos', 'linux', 'debian', 'centos'];

export const ALL_CLASSIC_GAMES_CATALOG: Array<{
  appId: BuiltinAppId;
  name: string;
  icon: string;
  era: string;
}> = [
  { appId: 'maze3d', name: '3D Brick Maze', icon: '/icons/maze3d.svg', era: 'Win95 OpenGL' },
  { appId: 'oregon-trail', name: 'The Oregon Trail', icon: '/icons/oregon-trail.svg', era: '1985 Lab Classic' },
  { appId: 'chips-challenge', name: "Chip's Challenge", icon: '/icons/chips-challenge.svg', era: 'WEP 1991' },
  { appId: 'rodents-revenge', name: "Rodent's Revenge", icon: '/icons/rodents-revenge.svg', era: 'WEP 1991' },
  { appId: 'pipe-dream', name: 'Pipe Dream', icon: '/icons/pipe-dream.svg', era: 'WEP 1991' },
  { appId: 'purble-place', name: 'Purble Place', icon: '/icons/purble-place.svg', era: '2007 Bakery' },
  { appId: 'snake', name: 'QBasic Nibbles / Snake', icon: '/icons/nibbles.svg', era: 'MS-DOS 5.0' },
  { appId: 'gorillas', name: 'QBasic GORILLA.BAS', icon: '/icons/bonzi.svg', era: 'MS-DOS 5.0' },
  { appId: 'breakout', name: 'DX-Ball Brick Breaker', icon: '/icons/dxball.svg', era: '1996 Shareware' },
  { appId: 'pacman', name: 'Pac-Chomp Arcade', icon: '/icons/luna48/gamepad.png', era: '1980 Arcade' },
  { appId: 'frogger', name: 'Classic Frogger', icon: '/icons/luna48/gamepad.png', era: '1981 Arcade' },
  { appId: 'pong', name: '1972 Classic Pong', icon: '/icons/luna48/gamepad.png', era: '1972 Arcade' },
  { appId: 'slingo', name: 'AOL Slingo Deluxe', icon: '/icons/slingo.svg', era: 'AOL Games' },
  { appId: 'pinball', name: '3D Pinball Space Cadet', icon: '/icons/pinball.png', era: 'Plus! / XP' },
  { appId: 'solitaire', name: 'Klondike Solitaire', icon: '/icons/solitaire.png', era: 'Win 3.0 / XP' },
  { appId: 'spider', name: 'Spider Solitaire', icon: '/icons/spider.png', era: 'Win98 / XP' },
  { appId: 'freecell', name: 'FreeCell', icon: '/icons/freecell.png', era: 'Win95 / XP' },
  { appId: 'hearts', name: 'MS Hearts Network', icon: '/icons/heart.png', era: 'Win for Workgroups' },
  { appId: 'minesweeper', name: 'Minesweeper', icon: '/icons/minesweeper/mine-icon.png', era: 'Win 3.1 / XP' },
  { appId: 'skifree', name: 'SkiFree (Yeti!)', icon: '/icons/skifree.svg', era: 'WEP 1991' },
  { appId: 'jezzball', name: 'JezzBall', icon: '/icons/jezzball.svg', era: 'WEP 1992' },
  { appId: 'mahjong', name: 'Mahjong Titans', icon: '/icons/mahjong.svg', era: 'Classic Board' },
  { appId: 'checkers', name: 'Internet Checkers', icon: '/icons/checkers.svg', era: 'MSN Zone' },
  { appId: 'tetris', name: 'Tetris XP', icon: '/icons/tetris.svg', era: 'WEP 1990' },
];

/* ============================================================================
   MULTI-OS BOOT MANAGER & LIVE SWITCHER APP (`os-switcher`)
   ============================================================================ */
export const OSSwitcherApp: React.FC = () => {
  const { osType, switchOperatingSystem, openApp, triggerBonziSwing, setScreensaver, setScreensaverActive } = useOS();

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: '#0f172a',
        color: '#f8fafc',
        overflowY: 'auto',
        fontSize: 12,
      }}
    >
      {/* Hero Header */}
      <div
        style={{
          padding: '14px 18px',
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 60%, #1e1b4b 100%)',
          borderBottom: '1px solid #334155',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/icons/os-switcher.svg" alt="" style={{ width: 42, height: 42 }} />
          <div>
            <div style={{ fontSize: 17, fontWeight: 800 }}>
              TrillXP Multi-OS Time Machine — 6 Operating Systems
            </div>
            <div style={{ fontSize: 11.5, color: '#94a3b8' }}>
              Currently Running: <b style={{ color: '#38bdf8' }}>{OS_METADATA[osType].name}</b> ({OS_METADATA[osType].kernel})
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() => triggerBonziSwing('bonzi')}
            style={{
              padding: '7px 12px',
              borderRadius: 6,
              border: '1px solid #c084fc',
              background: '#6b21a8',
              color: '#fff',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            🟣 Swing In BonziBUDDY!
          </button>
          <button
            onClick={() => openApp('maze3d')}
            style={{
              padding: '7px 12px',
              borderRadius: 6,
              border: '1px solid #f59e0b',
              background: '#9a3412',
              color: '#fff',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            🧱 Play 3D Brick Maze
          </button>
          <button
            onClick={() => {
              setScreensaver('maze3d');
              setScreensaverActive(true);
            }}
            style={{
              padding: '7px 12px',
              borderRadius: 6,
              border: '1px solid #38bdf8',
              background: '#0369a1',
              color: '#fff',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            🖥️ Maze Screensaver
          </button>
        </div>
      </div>

      {/* 6 Operating System Cards */}
      <div style={{ padding: 16 }}>
        <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 10, color: '#cbd5e1' }}>
          💿 Select Any Operating System — Instant Hot-Swap or Full Boot Sequence:
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(225px, 1fr))',
            gap: 12,
          }}
        >
          {ALL_OS_ORDER.map((id) => {
            const meta = OS_METADATA[id];
            const active = osType === id;
            return (
              <div
                key={id}
                style={{
                  background: active ? 'rgba(56, 189, 248, 0.12)' : '#1e293b',
                  border: active ? `2px solid ${meta.accent}` : '1px solid #334155',
                  borderRadius: 10,
                  padding: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 10,
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <img src={meta.icon} alt={meta.shortName} style={{ width: 36, height: 36 }} />
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 14, color: '#fff' }}>
                        {meta.shortName}{' '}
                        {active && (
                          <span
                            style={{
                              fontSize: 9.5,
                              background: '#22c55e',
                              color: '#052e16',
                              padding: '1px 6px',
                              borderRadius: 99,
                              marginLeft: 4,
                            }}
                          >
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 10.5, color: '#94a3b8' }}>
                        {meta.year} • {meta.kernel}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: '#cbd5e1', lineHeight: 1.4 }}>{meta.tagline}</div>
                </div>

                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => switchOperatingSystem(id, false)}
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      borderRadius: 6,
                      border: 'none',
                      background: meta.accent,
                      color: '#fff',
                      fontWeight: 800,
                      fontSize: 11,
                      cursor: 'pointer',
                    }}
                  >
                    ⚡ Instant Switch
                  </button>
                  <button
                    onClick={() => switchOperatingSystem(id, true)}
                    style={{
                      padding: '6px 8px',
                      borderRadius: 6,
                      border: '1px solid #64748b',
                      background: '#0f172a',
                      color: '#e2e8f0',
                      fontWeight: 700,
                      fontSize: 11,
                      cursor: 'pointer',
                    }}
                    title="Reboot through this OS's boot animation & login screen"
                  >
                    🔄 Boot Into
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Classic Games Vault Quick-Launch Grid */}
        <div style={{ marginTop: 18 }}>
          <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 8, color: '#fde047' }}>
            🕹️ All 24 Classic PC Games Included Across Every OS:
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(145px, 1fr))',
              gap: 6,
            }}
          >
            {ALL_CLASSIC_GAMES_CATALOG.map((g) => (
              <button
                key={g.appId}
                onClick={() => openApp(g.appId)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 8px',
                  borderRadius: 6,
                  border: '1px solid #334155',
                  background: '#1e293b',
                  color: '#f8fafc',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: 11,
                }}
              >
                <img src={g.icon} alt="" style={{ width: 22, height: 22, flexShrink: 0 }} />
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontWeight: 700, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    {g.name}
                  </div>
                  <div style={{ fontSize: 9.5, color: '#94a3b8' }}>{g.era}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
   NON-XP OPERATING SYSTEM SHELLS (WINDOWS 10, MAC OS, LINUX, DEBIAN, CENTOS)
   ============================================================================ */
export const MultiOSShellChrome: React.FC<{
  onShowModal: (mode: 'turnoff' | 'logoff') => void;
}> = ({ onShowModal }) => {
  const {
    osType,
    switchOperatingSystem,
    windows,
    activeWindowId,
    focusWindow,
    minimizeWindow,
    openApp,
    username,
    triggerBonziSwing,
  } = useOS();
  const { muted, setMuted } = useSound();

  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [clock, setClock] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [hoveredDockIdx, setHoveredDockIdx] = useState<number | null>(null);
  const [centosWorkspace, setCentosWorkspace] = useState(1);

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setClock(d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }));
      setDateStr(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
    };
    tick();
    const iv = window.setInterval(tick, 15000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [osType]);

  const launch = (appId: BuiltinAppId, payload?: Record<string, unknown>) => {
    openApp(appId, payload);
    setMenuOpen(false);
  };

  const handleTaskWindowClick = (wId: string, isMin: boolean) => {
    if (activeWindowId === wId && !isMin) {
      minimizeWindow(wId);
    } else {
      focusWindow(wId);
    }
  };

  /* ---------------- 1. WINDOWS 10 PRO SHELL ---------------- */
  if (osType === 'win10') {
    const filteredGames = ALL_CLASSIC_GAMES_CATALOG.filter((g) =>
      g.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <>
        {menuOpen && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              left: 0,
              bottom: 40,
              width: 610,
              maxWidth: '96vw',
              height: 470,
              background: 'rgba(20, 24, 31, 0.94)',
              backdropFilter: 'blur(18px)',
              color: '#fff',
              borderTop: '1px solid rgba(255,255,255,0.14)',
              borderRight: '1px solid rgba(255,255,255,0.14)',
              boxShadow: '0 -8px 28px rgba(0,0,0,0.6)',
              display: 'grid',
              gridTemplateColumns: '48px 220px 1fr',
              zIndex: 10020,
              fontFamily: '"Segoe UI", Tahoma, sans-serif',
            }}
          >
            {/* Left Rail */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', background: 'rgba(0,0,0,0.28)' }}>
              <span title={username} style={{ fontSize: 18 }}>👤</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
                <button onClick={() => launch('control-panel')} title="Settings" style={{ background: 'none', border: 'none', color: '#fff', fontSize: 17, cursor: 'pointer' }}>⚙️</button>
                <button onClick={() => launch('os-switcher')} title="Switch Operating System" style={{ background: 'none', border: 'none', color: '#fff', fontSize: 17, cursor: 'pointer' }}>💿</button>
                <button onClick={() => { setMenuOpen(false); onShowModal('turnoff'); }} title="Power" style={{ background: 'none', border: 'none', color: '#fff', fontSize: 17, cursor: 'pointer' }}>⏻</button>
              </div>
            </div>

            {/* App List */}
            <div style={{ padding: '10px 8px', overflowY: 'auto', borderRight: '1px solid rgba(255,255,255,0.08)', fontSize: 12 }}>
              <div style={{ fontSize: 10.5, color: '#94a3b8', marginBottom: 6, fontWeight: 700 }}>ALL APPS &amp; CLASSIC GAMES</div>
              {filteredGames.map((g) => (
                <div
                  key={g.appId}
                  onClick={() => launch(g.appId)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 6px', borderRadius: 4, cursor: 'pointer' }}
                >
                  <img src={g.icon} alt="" style={{ width: 20, height: 20 }} />
                  <span>{g.name}</span>
                </div>
              ))}
            </div>

            {/* Live Tiles */}
            <div style={{ padding: 14, overflowY: 'auto' }}>
              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8, fontWeight: 700 }}>PINNED LIVE TILES</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {[
                  { label: 'Switch OS', icon: '/icons/os-switcher.svg', bg: '#0078d4', app: 'os-switcher' as BuiltinAppId },
                  { label: 'BonziBUDDY', icon: '/icons/bonzi.svg', bg: '#7e22ce', app: 'companions' as BuiltinAppId },
                  { label: '3D Maze', icon: '/icons/maze3d.svg', bg: '#b91c1c', app: 'maze3d' as BuiltinAppId },
                  { label: 'Oregon Trail', icon: '/icons/oregon-trail.svg', bg: '#15803d', app: 'oregon-trail' as BuiltinAppId },
                  { label: 'PowerShell', icon: '/icons/powershell.svg', bg: '#1e3a8a', app: 'powershell' as BuiltinAppId },
                  { label: 'Bash WSL', icon: '/icons/terminal-unix.svg', bg: '#334155', app: 'unix-terminal' as BuiltinAppId },
                  { label: 'Arena AI', icon: '/icons/arena-ai.svg', bg: '#4f46e5', app: 'arena-ai' as BuiltinAppId },
                  { label: 'Edge / IE', icon: '/icons/ie.png', bg: '#0284c7', app: 'ie' as BuiltinAppId },
                  { label: 'Slingo', icon: '/icons/slingo.svg', bg: '#ca8a04', app: 'slingo' as BuiltinAppId },
                ].map((tile) => (
                  <button
                    key={tile.label}
                    onClick={() => launch(tile.app)}
                    style={{
                      height: 82,
                      background: tile.bg,
                      border: '1px solid rgba(255,255,255,0.18)',
                      color: '#fff',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 5,
                      cursor: 'pointer',
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    <img src={tile.icon} alt="" style={{ width: 28, height: 28 }} />
                    <span>{tile.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Windows 10 Taskbar */}
        <div
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            height: 40,
            background: 'rgba(16, 20, 26, 0.92)',
            backdropFilter: 'blur(12px)',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 10000,
            color: '#fff',
            fontFamily: '"Segoe UI", Tahoma, sans-serif',
            fontSize: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
            {/* Win10 Start Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((v) => !v);
              }}
              style={{
                width: 46,
                height: '100%',
                background: menuOpen ? 'rgba(255,255,255,0.14)' : 'transparent',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              title="Start"
            >
              <img src="/icons/os-win10.svg" alt="Start" style={{ width: 20, height: 20 }} />
            </button>

            {/* Win10 "Type here to search" Box */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: '#ffffff',
                color: '#1e293b',
                height: 30,
                width: 205,
                padding: '0 8px',
                gap: 6,
                marginRight: 6,
              }}
            >
              <span>🔍</span>
              <input
                value={searchQuery}
                onFocus={() => setMenuOpen(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setMenuOpen(true);
                }}
                placeholder="Type here to search"
                style={{ border: 'none', outline: 'none', width: '100%', fontSize: 12 }}
              />
            </div>

            {/* Pinned Icons */}
            {[
              { icon: '/icons/676(32x32).png', app: 'explorer' as BuiltinAppId, title: 'File Explorer' },
              { icon: '/icons/ie.png', app: 'ie' as BuiltinAppId, title: 'Browser' },
              { icon: '/icons/powershell.svg', app: 'powershell' as BuiltinAppId, title: 'PowerShell' },
              { icon: '/icons/maze3d.svg', app: 'maze3d' as BuiltinAppId, title: '3D Maze' },
              { icon: '/icons/bonzi.svg', app: 'companions' as BuiltinAppId, title: 'BonziBUDDY' },
              { icon: '/icons/os-switcher.svg', app: 'os-switcher' as BuiltinAppId, title: 'Switch OS' },
            ].map((p) => (
              <button
                key={p.app}
                onClick={() => openApp(p.app)}
                title={p.title}
                style={{
                  width: 42,
                  height: '100%',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img src={p.icon} alt="" style={{ width: 22, height: 22 }} />
              </button>
            ))}

            {/* Running Windows */}
            {windows.map((w) => (
              <button
                key={w.id}
                onClick={() => handleTaskWindowClick(w.id, w.minimized)}
                style={{
                  height: '100%',
                  padding: '0 10px',
                  background: activeWindowId === w.id && !w.minimized ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
                  border: 'none',
                  borderBottom: '3px solid #00a4ef',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: 'pointer',
                  maxWidth: 150,
                  fontSize: 11.5,
                }}
              >
                <img src={w.icon} alt="" style={{ width: 16, height: 16 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.title}</span>
              </button>
            ))}
          </div>

          {/* Right Tray */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingRight: 10 }}>
            <button
              onClick={() => openApp('os-switcher')}
              style={{
                background: '#0078d4',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                padding: '3px 8px',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              💿 Win10 ▾
            </button>
            <button
              onClick={() => setMuted(!muted)}
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 14 }}
            >
              {muted ? '🔇' : '🔊'}
            </button>
            <div style={{ textAlign: 'right', fontSize: 11, lineHeight: 1.15 }}>
              <div>{clock}</div>
              <div style={{ fontSize: 10, color: '#cbd5e1' }}>{dateStr}</div>
            </div>
          </div>
        </div>
      </>
    );
  }

  /* ---------------- 2. MAC OS AQUA SHELL (TOP APPLE BAR + BOTTOM MAGNIFYING DOCK) ---------------- */
  if (osType === 'macos') {
    const activeWin = windows.find((w) => w.id === activeWindowId);
    const dockItems: Array<{ label: string; icon: string; app: BuiltinAppId }> = [
      { label: 'Finder', icon: '/icons/676(32x32).png', app: 'explorer' },
      { label: 'Launchpad (Games)', icon: '/icons/os-macos.svg', app: 'os-switcher' },
      { label: 'Safari / Web', icon: '/icons/ie.png', app: 'ie' },
      { label: 'Terminal (zsh)', icon: '/icons/terminal-unix.svg', app: 'unix-terminal' },
      { label: 'Arena AI', icon: '/icons/arena-ai.svg', app: 'arena-ai' },
      { label: '3D Brick Maze', icon: '/icons/maze3d.svg', app: 'maze3d' },
      { label: 'The Oregon Trail', icon: '/icons/oregon-trail.svg', app: 'oregon-trail' },
      { label: 'Slingo Deluxe', icon: '/icons/slingo.svg', app: 'slingo' },
      { label: 'BonziBUDDY', icon: '/icons/bonzi.svg', app: 'companions' },
      { label: 'System Preferences', icon: '/icons/300(32x32).png', app: 'control-panel' },
      { label: 'Trash', icon: '/icons/luna48/bin.png', app: 'recycle-bin' },
    ];

    return (
      <>
        {/* Top Frosted-Glass Apple Menu Bar */}
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: 26,
            background: 'rgba(248, 250, 252, 0.82)',
            backdropFilter: 'blur(16px)',
            borderBottom: '1px solid rgba(0,0,0,0.16)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 14px',
            zIndex: 10010,
            color: '#0f172a',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            fontSize: 12.5,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              style={{ background: 'none', border: 'none', fontWeight: 900, fontSize: 15, cursor: 'pointer', padding: 0 }}
            >
              
            </button>
            <strong style={{ fontWeight: 700 }}>{activeWin ? activeWin.title.split('—')[0] : 'Finder'}</strong>
            <span style={{ cursor: 'pointer' }} onClick={() => openApp('explorer')}>File</span>
            <span style={{ cursor: 'pointer' }} onClick={() => openApp('unix-terminal')}>Terminal</span>
            <span style={{ cursor: 'pointer' }} onClick={() => openApp('maze3d')}>3D Maze</span>
            <span style={{ cursor: 'pointer' }} onClick={() => triggerBonziSwing('bonzi')}>BonziBUDDY</span>
            <span style={{ cursor: 'pointer', fontWeight: 700, color: '#2563eb' }} onClick={() => openApp('os-switcher')}>
              Switch OS
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12 }}>
            <span style={{ cursor: 'pointer' }} onClick={() => setMuted(!muted)}>{muted ? '🔇' : '🔊'}</span>
            <span>Wi-Fi</span>
            <span>{dateStr} &nbsp;{clock}</span>
          </div>
        </div>

        {/* Apple Menu Dropdown */}
        {menuOpen && (
          <div
            style={{
              position: 'fixed',
              top: 27,
              left: 10,
              width: 230,
              background: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(16px)',
              borderRadius: 8,
              border: '1px solid rgba(0,0,0,0.18)',
              boxShadow: '0 10px 28px rgba(0,0,0,0.3)',
              padding: 5,
              zIndex: 10030,
              fontSize: 12.5,
            }}
          >
            <div onClick={() => launch('winver')} style={{ padding: '5px 10px', cursor: 'pointer', borderRadius: 5 }}>About This Mac</div>
            <div onClick={() => launch('control-panel')} style={{ padding: '5px 10px', cursor: 'pointer', borderRadius: 5 }}>System Preferences...</div>
            <div onClick={() => launch('os-switcher')} style={{ padding: '5px 10px', cursor: 'pointer', borderRadius: 5, fontWeight: 700, color: '#2563eb' }}>
              Switch Operating System (6 OS)...
            </div>
            <hr style={{ margin: '4px 0', border: 'none', borderTop: '1px solid #e2e8f0' }} />
            <div onClick={() => { setMenuOpen(false); onShowModal('logoff'); }} style={{ padding: '5px 10px', cursor: 'pointer' }}>Log Out {username}...</div>
            <div onClick={() => { setMenuOpen(false); onShowModal('turnoff'); }} style={{ padding: '5px 10px', cursor: 'pointer', color: '#dc2626' }}>Shut Down...</div>
          </div>
        )}

        {/* Bottom Magnifying Glass Aqua Dock */}
        <div
          style={{
            position: 'fixed',
            bottom: 8,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(255, 255, 255, 0.32)',
            backdropFilter: 'blur(18px)',
            border: '1px solid rgba(255, 255, 255, 0.52)',
            borderRadius: 18,
            padding: '6px 12px',
            display: 'flex',
            alignItems: 'flex-end',
            gap: 9,
            boxShadow: '0 10px 30px rgba(0,0,0,0.38)',
            zIndex: 10000,
          }}
        >
          {dockItems.map((item, idx) => {
            const isOpen = windows.some((w) => w.appId === item.app);
            const scale =
              hoveredDockIdx === idx
                ? 1.32
                : hoveredDockIdx !== null && Math.abs(hoveredDockIdx - idx) === 1
                ? 1.14
                : 1;
            return (
              <div
                key={item.label}
                onMouseEnter={() => setHoveredDockIdx(idx)}
                onMouseLeave={() => setHoveredDockIdx(null)}
                onClick={() => openApp(item.app)}
                title={item.label}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  cursor: 'pointer',
                  transform: `scale(${scale}) translateY(${scale > 1 ? -6 : 0}px)`,
                  transition: 'transform 0.14s ease',
                }}
              >
                <img src={item.icon} alt={item.label} style={{ width: 38, height: 38 }} />
                <div
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    marginTop: 2,
                    background: isOpen ? '#0f172a' : 'transparent',
                  }}
                />
              </div>
            );
          })}
        </div>
      </>
    );
  }

  /* ---------------- 3. DEBIAN 12 ("BOOKWORM") GNOME SHELL ---------------- */
  if (osType === 'debian') {
    return (
      <>
        {/* GNOME Top Activities Bar */}
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: 28,
            background: '#131316',
            color: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 12px',
            zIndex: 10010,
            fontSize: 12,
            fontFamily: 'Ubuntu, Cantarell, sans-serif',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              style={{
                background: menuOpen ? '#d70a53' : 'transparent',
                color: '#fff',
                border: 'none',
                borderRadius: 99,
                padding: '2px 10px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
              }}
            >
              <img src="/icons/os-debian.svg" alt="" style={{ width: 16, height: 16 }} />
              <span>Activities</span>
            </button>
            <button
              onClick={() => openApp('unix-terminal')}
              style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', fontSize: 12 }}
            >
              &gt;_ Bash
            </button>
            <button
              onClick={() => openApp('os-switcher')}
              style={{ background: 'none', border: 'none', color: '#fda4af', fontWeight: 700, cursor: 'pointer', fontSize: 12 }}
            >
              Switch OS (Debian 12)
            </button>
          </div>

          <div style={{ fontWeight: 700 }}>
            {dateStr} &nbsp;{clock}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ cursor: 'pointer' }} onClick={() => setMuted(!muted)}>{muted ? '🔇' : '🔊'}</span>
            <span style={{ cursor: 'pointer' }} onClick={() => onShowModal('turnoff')}>⏻</span>
          </div>
        </div>

        {/* GNOME Activities App Grid Overlay */}
        {menuOpen && (
          <div
            onClick={() => setMenuOpen(false)}
            style={{
              position: 'fixed',
              inset: '28px 0 0 0',
              background: 'rgba(15, 18, 28, 0.88)',
              backdropFilter: 'blur(14px)',
              zIndex: 10025,
              padding: 28,
              overflowY: 'auto',
            }}
          >
            <div style={{ maxWidth: 820, margin: '0 auto', color: '#fff' }} onClick={(e) => e.stopPropagation()}>
              <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 14, color: '#fda4af' }}>
                🌀 Debian GNU/Linux 12 (&ldquo;Bookworm&rdquo;) — Applications &amp; Classic Games
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(115px, 1fr))', gap: 14 }}>
                {[
                  { appId: 'unix-terminal' as BuiltinAppId, name: 'GNOME Terminal', icon: '/icons/terminal-unix.svg' },
                  { appId: 'os-switcher' as BuiltinAppId, name: 'Switch OS', icon: '/icons/os-switcher.svg' },
                  { appId: 'companions' as BuiltinAppId, name: 'BonziBUDDY', icon: '/icons/bonzi.svg' },
                  { appId: 'explorer' as BuiltinAppId, name: 'Files (Nautilus)', icon: '/icons/676(32x32).png' },
                  ...ALL_CLASSIC_GAMES_CATALOG,
                ].map((item) => (
                  <button
                    key={item.appId}
                    onClick={() => launch(item.appId)}
                    style={{
                      background: 'rgba(255,255,255,0.07)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: 12,
                      padding: 12,
                      color: '#fff',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 11.5,
                    }}
                  >
                    <img src={item.icon} alt="" style={{ width: 36, height: 36 }} />
                    <span style={{ textAlign: 'center' }}>{item.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* GNOME Bottom Floating Dash */}
        <div
          style={{
            position: 'fixed',
            bottom: 8,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(24, 24, 32, 0.86)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 16,
            padding: '5px 12px',
            display: 'flex',
            gap: 10,
            zIndex: 10000,
          }}
        >
          {[
            { icon: '/icons/os-debian.svg', app: 'os-switcher' as BuiltinAppId, label: 'Switch OS' },
            { icon: '/icons/terminal-unix.svg', app: 'unix-terminal' as BuiltinAppId, label: 'Bash Terminal' },
            { icon: '/icons/676(32x32).png', app: 'explorer' as BuiltinAppId, label: 'Files' },
            { icon: '/icons/ie.png', app: 'ie' as BuiltinAppId, label: 'Web' },
            { icon: '/icons/maze3d.svg', app: 'maze3d' as BuiltinAppId, label: '3D Maze' },
            { icon: '/icons/oregon-trail.svg', app: 'oregon-trail' as BuiltinAppId, label: 'Oregon Trail' },
            { icon: '/icons/bonzi.svg', app: 'companions' as BuiltinAppId, label: 'BonziBUDDY' },
          ].map((d) => (
            <button
              key={d.label}
              onClick={() => openApp(d.app)}
              title={d.label}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3 }}
            >
              <img src={d.icon} alt="" style={{ width: 32, height: 32 }} />
            </button>
          ))}
        </div>
      </>
    );
  }

  /* ---------------- 4. CENTOS LINUX GNOME CLASSIC DUAL-PANEL SHELL ---------------- */
  if (osType === 'centos') {
    return (
      <>
        {/* Top Enterprise GNOME Classic Bar */}
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: 27,
            background: '#1e1b2e',
            borderBottom: '1px solid #4c1d95',
            color: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 12px',
            zIndex: 10010,
            fontSize: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              style={{
                background: 'none',
                border: 'none',
                color: '#fff',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
              }}
            >
              <img src="/icons/os-centos.svg" alt="" style={{ width: 16, height: 16 }} />
              <span>Applications ▾</span>
            </button>
            <span style={{ cursor: 'pointer' }} onClick={() => openApp('explorer')}>Places ▾</span>
            <span style={{ cursor: 'pointer' }} onClick={() => openApp('unix-terminal')}>Terminal</span>
            <span style={{ cursor: 'pointer', color: '#e879f9', fontWeight: 700 }} onClick={() => openApp('os-switcher')}>
              Switch OS (CentOS)
            </span>
          </div>

          <div style={{ fontWeight: 700 }}>{dateStr} {clock}</div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>{username}@centos</span>
            <button onClick={() => onShowModal('turnoff')} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>⏻</button>
          </div>
        </div>

        {menuOpen && (
          <div
            style={{
              position: 'fixed',
              top: 27,
              left: 8,
              width: 260,
              maxHeight: 420,
              overflowY: 'auto',
              background: '#1e1b2e',
              border: '1px solid #9333ea',
              color: '#fff',
              padding: 6,
              zIndex: 10030,
              fontSize: 12,
            }}
          >
            <div onClick={() => launch('unix-terminal')} style={{ padding: '6px 8px', cursor: 'pointer', fontWeight: 700 }}>
              &gt;_ CentOS Bash Terminal (yum/dnf)
            </div>
            <div onClick={() => launch('os-switcher')} style={{ padding: '6px 8px', cursor: 'pointer', color: '#e879f9', fontWeight: 700 }}>
              💿 Multi-OS Boot Switcher
            </div>
            <div onClick={() => launch('companions')} style={{ padding: '6px 8px', cursor: 'pointer' }}>
              🟣 BonziBUDDY Purple Monkey
            </div>
            <hr style={{ borderColor: '#4c1d95' }} />
            {ALL_CLASSIC_GAMES_CATALOG.map((g) => (
              <div
                key={g.appId}
                onClick={() => launch(g.appId)}
                style={{ padding: '5px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <img src={g.icon} alt="" style={{ width: 16, height: 16 }} />
                <span>{g.name}</span>
              </div>
            ))}
          </div>
        )}

        {/* Bottom GNOME Classic Window List + 4 Virtual Workspaces */}
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            height: 28,
            background: '#1e1b2e',
            borderTop: '1px solid #4c1d95',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 8px',
            zIndex: 10000,
            color: '#fff',
            fontSize: 11.5,
          }}
        >
          <div style={{ display: 'flex', gap: 4, overflowX: 'auto' }}>
            {windows.map((w) => (
              <button
                key={w.id}
                onClick={() => handleTaskWindowClick(w.id, w.minimized)}
                style={{
                  background: activeWindowId === w.id ? '#6b21a8' : '#312e81',
                  color: '#fff',
                  border: '1px solid #7e22ce',
                  padding: '2px 10px',
                  borderRadius: 3,
                  cursor: 'pointer',
                  fontSize: 11,
                }}
              >
                {w.title}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 3 }}>
            {[1, 2, 3, 4].map((ws) => (
              <button
                key={ws}
                onClick={() => setCentosWorkspace(ws)}
                style={{
                  width: 22,
                  height: 20,
                  background: centosWorkspace === ws ? '#9333ea' : '#334155',
                  color: '#fff',
                  border: 'none',
                  fontSize: 10,
                  cursor: 'pointer',
                }}
              >
                {ws}
              </button>
            ))}
          </div>
        </div>
      </>
    );
  }

  /* ---------------- 5. LINUX TUX DESKTOP (CINNAMON / ARC-DARK PANEL) ---------------- */
  return (
    <>
      {menuOpen && (
        <div
          style={{
            position: 'fixed',
            left: 6,
            bottom: 40,
            width: 440,
            maxWidth: '95vw',
            height: 410,
            background: '#1e242b',
            border: '1px solid #10b981',
            borderRadius: 8,
            color: '#f8fafc',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 10025,
            overflow: 'hidden',
            boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
          }}
        >
          <div style={{ padding: '10px 14px', background: '#111827', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between' }}>
            <strong>🐧 GNU/Linux Tux Menu — {username}@tux</strong>
            <button
              onClick={() => switchOperatingSystem('winxp', false)}
              style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: 11 }}
            >
              Back to XP
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <button onClick={() => launch('unix-terminal')} style={{ padding: 8, background: '#0f172a', color: '#4ade80', border: '1px solid #334155', borderRadius: 6, cursor: 'pointer', textAlign: 'left', fontWeight: 700 }}>
              &gt;_ Bash Terminal (neofetch)
            </button>
            <button onClick={() => launch('os-switcher')} style={{ padding: 8, background: '#0f172a', color: '#38bdf8', border: '1px solid #334155', borderRadius: 6, cursor: 'pointer', textAlign: 'left', fontWeight: 700 }}>
              💿 Switch OS (6 OSes)
            </button>
            <button onClick={() => launch('companions')} style={{ padding: 8, background: '#0f172a', color: '#c084fc', border: '1px solid #334155', borderRadius: 6, cursor: 'pointer', textAlign: 'left', fontWeight: 700 }}>
              🟣 BonziBUDDY Companion
            </button>
            <button onClick={() => launch('arena-ai')} style={{ padding: 8, background: '#0f172a', color: '#fde047', border: '1px solid #334155', borderRadius: 6, cursor: 'pointer', textAlign: 'left', fontWeight: 700 }}>
              🤖 Arena AI Copilot
            </button>
            {ALL_CLASSIC_GAMES_CATALOG.map((g) => (
              <button
                key={g.appId}
                onClick={() => launch(g.appId)}
                style={{
                  padding: '6px 8px',
                  background: '#262f38',
                  color: '#fff',
                  border: '1px solid #334155',
                  borderRadius: 6,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  fontSize: 11.5,
                }}
              >
                <img src={g.icon} alt="" style={{ width: 18, height: 18 }} />
                <span>{g.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Linux Bottom Panel */}
      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          height: 36,
          background: '#1b2026',
          borderTop: '1px solid #10b981',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 8px',
          zIndex: 10000,
          color: '#f8fafc',
          fontSize: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              background: '#10b981',
              color: '#052e16',
              fontWeight: 800,
              border: 'none',
              borderRadius: 5,
              cursor: 'pointer',
            }}
          >
            <img src="/icons/os-linux.svg" alt="" style={{ width: 18, height: 18 }} />
            <span>Menu</span>
          </button>

          <button onClick={() => openApp('unix-terminal')} style={{ background: '#0f172a', color: '#4ade80', border: '1px solid #334155', borderRadius: 4, padding: '4px 8px', cursor: 'pointer', fontFamily: 'monospace' }}>
            $_ bash
          </button>
          <button onClick={() => openApp('maze3d')} style={{ background: '#0f172a', color: '#fff', border: '1px solid #334155', borderRadius: 4, padding: '4px 8px', cursor: 'pointer' }}>
            🧱 3D Maze
          </button>
          <button onClick={() => openApp('os-switcher')} style={{ background: '#0f172a', color: '#38bdf8', border: '1px solid #334155', borderRadius: 4, padding: '4px 8px', cursor: 'pointer' }}>
            💿 Switch OS
          </button>

          {windows.map((w) => (
            <button
              key={w.id}
              onClick={() => handleTaskWindowClick(w.id, w.minimized)}
              style={{
                background: activeWindowId === w.id ? '#334155' : '#242b33',
                color: '#fff',
                border: '1px solid #475569',
                borderRadius: 4,
                padding: '3px 9px',
                cursor: 'pointer',
                fontSize: 11,
                maxWidth: 150,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {w.title}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ cursor: 'pointer' }} onClick={() => setMuted(!muted)}>{muted ? '🔇' : '🔊'}</span>
          <span>{clock}</span>
          <button onClick={() => onShowModal('turnoff')} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 14 }}>⏻</button>
        </div>
      </div>
    </>
  );
};

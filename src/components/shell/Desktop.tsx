import React, { useState, useRef } from 'react';
import { useOS } from '../../context/OSContext';
import { useSound } from '../../context/SoundContext';

const GRID_W = 86;
const GRID_H = 84;

const BONZI_QUIPS = [
  'Hello friend! Did you hear? You\'ve got mail in your AOL Gmail inbox!',
  'Fun 2003 fact: 3D Pinball Space Cadet is just 1 of 3 tables from Full Tilt! Pinball!',
  'Why did the computer go to the doctor? Because it had a virus! Haha!',
  'Tip: Open "Install Software" on your desktop to install Winamp 2.91 or Retro Arcade!',
  'Remember to save your Notepad Mixtape before Mom picks up the kitchen phone!',
];

export const Desktop: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const {
    wallpaper,
    desktopIcons,
    moveDesktopIcon,
    removeDesktopIcon,
    openApp,
    createFile,
    addDesktopShortcut,
    hypercamOverlay,
    bonziOverlay,
    setBonziOverlay,
  } = useOS();
  const { playSound } = useSound();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; iconId?: string } | null>(null);
  const [marquee, setMarquee] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [bonziQuipIdx, setBonziQuipIdx] = useState(0);
  const draggingIconRef = useRef<{ id: string; startX: number; startY: number; origCol: number; origRow: number } | null>(
    null
  );

  const handleDesktopMouseDown = (e: React.MouseEvent) => {
    setCtxMenu(null);
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('.xp-desktop-icon, .xp-window, .xp-dropdown-menu, .bonzi-widget')) return;
    setSelectedIds([]);
    const startX = e.clientX;
    const startY = e.clientY;
    setMarquee({ x1: startX, y1: startY, x2: startX, y2: startY });

    const onMove = (ev: MouseEvent) => {
      const m = { x1: startX, y1: startY, x2: ev.clientX, y2: ev.clientY };
      setMarquee(m);
      const minX = Math.min(m.x1, m.x2);
      const maxX = Math.max(m.x1, m.x2);
      const minY = Math.min(m.y1, m.y2);
      const maxY = Math.max(m.y1, m.y2);
      const hits = desktopIcons
        .filter((ic) => {
          const ix = 12 + ic.gridCol * GRID_W + 38;
          const iy = 12 + ic.gridRow * GRID_H + 38;
          return ix >= minX && ix <= maxX && iy >= minY && iy <= maxY;
        })
        .map((ic) => ic.id);
      setSelectedIds(hits);
    };

    const onUp = () => {
      setMarquee(null);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const handleIconMouseDown = (e: React.MouseEvent, id: string, col: number, row: number) => {
    e.stopPropagation();
    setCtxMenu(null);
    setSelectedIds([id]);
    if (e.button !== 0) return;
    draggingIconRef.current = { id, startX: e.clientX, startY: e.clientY, origCol: col, origRow: row };

    const onMove = (ev: MouseEvent) => {
      if (!draggingIconRef.current) return;
      const dx = ev.clientX - draggingIconRef.current.startX;
      const dy = ev.clientY - draggingIconRef.current.startY;
      if (Math.abs(dx) > 18 || Math.abs(dy) > 18) {
        const newCol = Math.max(0, Math.round((12 + draggingIconRef.current.origCol * GRID_W + dx - 12) / GRID_W));
        const newRow = Math.max(0, Math.round((12 + draggingIconRef.current.origRow * GRID_H + dy - 12) / GRID_H));
        moveDesktopIcon(id, newCol, newRow);
      }
    };

    const onUp = () => {
      draggingIconRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <div
      onMouseDown={handleDesktopMouseDown}
      onContextMenu={(e) => {
        if ((e.target as HTMLElement).closest('.xp-window')) return;
        e.preventDefault();
        setCtxMenu({ x: e.clientX, y: e.clientY });
      }}
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        right: 0,
        bottom: 30,
        backgroundImage: `url("${wallpaper}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        overflow: 'hidden',
      }}
    >
      {/* Classic Unregistered HyperCam 2 Watermark (when HyperCam is active!) */}
      {hypercamOverlay && (
        <div
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            background: '#ffffff',
            color: '#000000',
            fontFamily: 'Arial, sans-serif',
            fontSize: 13,
            fontWeight: 700,
            padding: '2px 7px',
            borderRight: '1px solid #000',
            borderBottom: '1px solid #000',
            zIndex: 88888,
            pointerEvents: 'none',
          }}
        >
          Unregistered HyperCam 2
        </div>
      )}

      {/* Desktop Icons Grid */}
      {desktopIcons.map((ic) => {
        const selected = selectedIds.includes(ic.id);
        return (
          <div
            key={ic.id}
            className={`xp-desktop-icon ${selected ? 'selected' : ''}`}
            style={{
              left: 12 + ic.gridCol * GRID_W,
              top: 12 + ic.gridRow * GRID_H,
            }}
            onMouseDown={(e) => handleIconMouseDown(e, ic.id, ic.gridCol, ic.gridRow)}
            onDoubleClick={() => openApp(ic.appId, ic.payload)}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setSelectedIds([ic.id]);
              setCtxMenu({ x: e.clientX, y: e.clientY, iconId: ic.id });
            }}
          >
            <img src={ic.icon} alt={ic.label} />
            <span>{ic.label}</span>
          </div>
        );
      })}

      {/* Rubber-band Selection Box */}
      {marquee && (
        <div
          style={{
            position: 'fixed',
            left: Math.min(marquee.x1, marquee.x2),
            top: Math.min(marquee.y1, marquee.y2),
            width: Math.abs(marquee.x2 - marquee.x1),
            height: Math.abs(marquee.y2 - marquee.y1),
            border: '1px dotted #d6e7ff',
            background: 'rgba(49, 106, 197, 0.28)',
            pointerEvents: 'none',
            zIndex: 40,
          }}
        />
      )}

      {/* Right-Click Context Menu */}
      {ctxMenu && (
        <div
          className="xp-dropdown-menu"
          style={{
            position: 'fixed',
            left: Math.min(ctxMenu.x, window.innerWidth - 195),
            top: Math.min(ctxMenu.y, window.innerHeight - 220),
            zIndex: 80000,
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {ctxMenu.iconId ? (
            <>
              <div
                className="xp-dropdown-option"
                style={{ fontWeight: 700 }}
                onClick={() => {
                  const target = desktopIcons.find((d) => d.id === ctxMenu.iconId);
                  if (target) openApp(target.appId, target.payload);
                  setCtxMenu(null);
                }}
              >
                Open
              </div>
              <div className="xp-dropdown-sep" />
              <div
                className="xp-dropdown-option"
                onClick={() => {
                  if (ctxMenu.iconId) removeDesktopIcon(ctxMenu.iconId);
                  setCtxMenu(null);
                }}
              >
                Delete Shortcut
              </div>
              <div
                className="xp-dropdown-option"
                onClick={() => {
                  openApp('control-panel', { section: 'system' });
                  setCtxMenu(null);
                }}
              >
                Properties
              </div>
            </>
          ) : (
            <>
              <div
                className="xp-dropdown-option"
                onClick={() => {
                  playSound('menuClick');
                  setCtxMenu(null);
                }}
              >
                Refresh
              </div>
              <div className="xp-dropdown-sep" />
              <div
                className="xp-dropdown-option"
                onClick={() => {
                  const f = createFile('my-docs', `Note_${Date.now().toString().slice(-4)}.txt`, '');
                  addDesktopShortcut({
                    label: f.name,
                    icon: '/icons/327(32x32).png',
                    appId: 'notepad',
                    payload: { fileId: f.id, title: `${f.name} - Notepad` },
                  });
                  setCtxMenu(null);
                }}
              >
                New Text Document
              </div>
              <div
                className="xp-dropdown-option"
                style={{ fontWeight: 700 }}
                onClick={() => {
                  openApp('arena-ai');
                  setCtxMenu(null);
                }}
              >
                ✨ Open Arena AI Agent
              </div>
              <div
                className="xp-dropdown-option"
                onClick={() => {
                  openApp('slingo');
                  setCtxMenu(null);
                }}
              >
                🎰 Play Slingo Deluxe
              </div>
              <div
                className="xp-dropdown-option"
                onClick={() => {
                  openApp('windows-update');
                  setCtxMenu(null);
                }}
              >
                🛡️ Windows Update
              </div>
              <div className="xp-dropdown-sep" />
              <div
                className="xp-dropdown-option"
                onClick={() => {
                  openApp('software-center');
                  setCtxMenu(null);
                }}
              >
                Install New Software...
              </div>
              <div
                className="xp-dropdown-option"
                onClick={() => {
                  openApp('aol-dialer');
                  setCtxMenu(null);
                }}
              >
                Dial America Online 9.0
              </div>
              <div className="xp-dropdown-sep" />
              <div
                className="xp-dropdown-option"
                style={{ fontWeight: 700 }}
                onClick={() => {
                  openApp('control-panel', { section: 'display' });
                  setCtxMenu(null);
                }}
              >
                Properties
              </div>
            </>
          )}
        </div>
      )}

      {/* BonziBUDDY Desktop Companion Widget (when installed!) */}
      {bonziOverlay && (
        <div
          className="bonzi-widget"
          style={{
            position: 'fixed',
            right: 26,
            bottom: 48,
            zIndex: 7500,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 6,
          }}
        >
          <div
            style={{
              background: '#ffffe1',
              border: '1px solid #000',
              borderRadius: 10,
              padding: '8px 11px',
              maxWidth: 235,
              fontSize: 11,
              boxShadow: '2px 3px 6px rgba(0,0,0,0.35)',
            }}
          >
            <div style={{ fontWeight: 700, color: '#6b21a8', marginBottom: 3 }}>🦍 BonziBUDDY says:</div>
            <div>{BONZI_QUIPS[bonziQuipIdx % BONZI_QUIPS.length]}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
              <button
                className="xp-btn"
                style={{ padding: '1px 7px', minHeight: 19, fontSize: 10 }}
                onClick={() => {
                  const next = bonziQuipIdx + 1;
                  setBonziQuipIdx(next);
                  if ('speechSynthesis' in window) {
                    const u = new SpeechSynthesisUtterance(BONZI_QUIPS[next % BONZI_QUIPS.length]);
                    u.pitch = 1.35;
                    u.rate = 1.05;
                    window.speechSynthesis.speak(u);
                  }
                }}
              >
                Tell Joke / Speak
              </button>
              <button
                className="xp-btn"
                style={{ padding: '1px 7px', minHeight: 19, fontSize: 10 }}
                onClick={() => setBonziOverlay(false)}
              >
                Hide
              </button>
            </div>
          </div>
          <div
            onClick={() => setBonziQuipIdx((i) => i + 1)}
            style={{
              width: 62,
              height: 62,
              borderRadius: '50%',
              background: 'radial-gradient(circle at 35% 30%, #c084fc, #7e22ce)',
              border: '2px solid #fff',
              boxShadow: '0 4px 10px rgba(0,0,0,0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 34,
              cursor: 'pointer',
            }}
            title="Click BonziBUDDY!"
          >
            🦍
          </div>
        </div>
      )}

      {/* Open Application Windows */}
      {children}
    </div>
  );
};

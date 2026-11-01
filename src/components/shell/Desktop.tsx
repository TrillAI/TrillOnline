import React, { useState, useRef } from 'react';
import { useOS } from '../../context/OSContext';
import { useSound } from '../../context/SoundContext';
import { BonziCompanionOverlay } from './BonziCompanion';

const GRID_W = 86;
const GRID_H = 82;

export const Desktop: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const {
    osType,
    wallpaper,
    desktopIcons,
    moveDesktopIcon,
    removeDesktopIcon,
    openApp,
    createFile,
    addDesktopShortcut,
    hypercamOverlay,
    triggerBonziSwing,
  } = useOS();
  const { playSound } = useSound();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; iconId?: string } | null>(null);
  const [marquee, setMarquee] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const draggingIconRef = useRef<{ id: string; startX: number; startY: number; origCol: number; origRow: number } | null>(
    null
  );
  const getOSIconLabelAndImg = (ic: (typeof desktopIcons)[number]): { label: string; icon: string } => {
    if (osType === 'winxp') return { label: ic.label, icon: ic.icon };
    if (ic.id === 'di-mycomp') {
      if (osType === 'win10') return { label: 'This PC', icon: '/icons/os-win10.svg' };
      if (osType === 'macos') return { label: 'Macintosh HD', icon: '/icons/os-macos.svg' };
      if (osType === 'debian') return { label: 'Debian Root (/)', icon: '/icons/os-debian.svg' };
      if (osType === 'centos') return { label: 'CentOS Root (/)', icon: '/icons/os-centos.svg' };
      return { label: 'File System (/)', icon: '/icons/os-linux.svg' };
    }
    if (ic.id === 'di-mydocs') {
      if (osType === 'macos') return { label: 'Documents', icon: ic.icon };
      if (osType === 'linux' || osType === 'debian' || osType === 'centos') return { label: '/home/user', icon: ic.icon };
      return { label: 'Documents', icon: ic.icon };
    }
    if (ic.id === 'di-ie') {
      if (osType === 'win10') return { label: 'Microsoft Edge', icon: ic.icon };
      if (osType === 'macos') return { label: 'Safari Web', icon: ic.icon };
      return { label: 'Firefox Web', icon: ic.icon };
    }
    if (ic.id === 'di-recycle') {
      if (osType === 'win10') return { label: 'Recycle Bin', icon: ic.icon };
      return { label: 'Trash', icon: ic.icon };
    }
    return { label: ic.label, icon: ic.icon };
  };

  const iconTopOffset = osType === 'macos' || osType === 'debian' || osType === 'centos' ? 36 : 12;

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
        bottom: 0,
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
        const adapted = getOSIconLabelAndImg(ic);
        return (
          <div
            key={ic.id}
            className={`xp-desktop-icon ${selected ? 'selected' : ''}`}
            style={{
              left: 12 + ic.gridCol * GRID_W,
              top: iconTopOffset + ic.gridRow * GRID_H,
            }}
            onMouseDown={(e) => handleIconMouseDown(e, ic.id, ic.gridCol, ic.gridRow)}
            onDoubleClick={() => openApp(ic.appId, ic.payload)}
            onPointerUp={(e) => {
              if (e.pointerType === 'touch') {
                openApp(ic.appId, ic.payload);
              }
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setSelectedIds([ic.id]);
              setCtxMenu({ x: e.clientX, y: e.clientY, iconId: ic.id });
            }}
          >
            <img src={adapted.icon} alt={adapted.label} />
            <span>{adapted.label}</span>
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
                  openApp('os-switcher');
                  setCtxMenu(null);
                }}
              >
                💿 Switch OS (XP / Win10 / Mac / Linux / Debian / CentOS)
              </div>
              <div
                className="xp-dropdown-option"
                style={{ fontWeight: 700 }}
                onClick={() => {
                  triggerBonziSwing('bonzi');
                  setCtxMenu(null);
                }}
              >
                🟣 Summon BonziBUDDY (Swing In!)
              </div>
              <div
                className="xp-dropdown-option"
                onClick={() => {
                  openApp('maze3d');
                  setCtxMenu(null);
                }}
              >
                🧱 Play Old-School 3D Brick Maze
              </div>
              <div
                className="xp-dropdown-option"
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

      {/* Accurate Animated BonziBUDDY Purple Monkey (Swings in on a Web, Talks & Sings!) */}
      <BonziCompanionOverlay />

      {/* Open Application Windows */}
      {children}
    </div>
  );
};

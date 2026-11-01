import React, { useRef } from 'react';
import { useOS, WindowInstance } from '../../context/OSContext';

interface WindowFrameProps {
  win: WindowInstance;
  children: React.ReactNode;
}

export const WindowFrame: React.FC<WindowFrameProps> = ({ win, children }) => {
  const { activeWindowId, focusWindow, closeWindow, minimizeWindow, toggleMaximizeWindow, moveWindow, resizeWindow } =
    useOS();
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  if (win.minimized) return null;

  const isActive = activeWindowId === win.id;

  const handleTitleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.xp-window-controls')) return;
    focusWindow(win.id);
    if (win.maximized) return;
    e.preventDefault();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: win.x,
      origY: win.y,
    };

    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const nx = Math.max(-win.width + 90, Math.min(window.innerWidth - 60, dragRef.current.origX + (ev.clientX - dragRef.current.startX)));
      const ny = Math.max(0, Math.min(window.innerHeight - 60, dragRef.current.origY + (ev.clientY - dragRef.current.startY)));
      moveWindow(win.id, nx, ny);
    };

    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const startResize = (dir: string) => (e: React.MouseEvent) => {
    if (!win.resizable || win.maximized) return;
    e.preventDefault();
    e.stopPropagation();
    focusWindow(win.id);
    const startX = e.clientX;
    const startY = e.clientY;
    const orig = { x: win.x, y: win.y, w: win.width, h: win.height };

    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      let nx = orig.x;
      let ny = orig.y;
      let nw = orig.w;
      let nh = orig.h;

      if (dir.includes('e')) nw = Math.max(win.minWidth, orig.w + dx);
      if (dir.includes('s')) nh = Math.max(win.minHeight, orig.h + dy);
      if (dir.includes('w')) {
        const candW = orig.w - dx;
        if (candW >= win.minWidth) {
          nw = candW;
          nx = orig.x + dx;
        }
      }
      if (dir.includes('n')) {
        const candH = orig.h - dy;
        if (candH >= win.minHeight && orig.y + dy >= 0) {
          nh = candH;
          ny = orig.y + dy;
        }
      }
      resizeWindow(win.id, nx, ny, nw, nh);
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const style: React.CSSProperties = win.maximized
    ? {
        left: 0,
        top: 0,
        width: '100vw',
        height: 'calc(100vh - 30px)',
        borderRadius: 0,
        borderLeftWidth: 0,
        borderRightWidth: 0,
        borderBottomWidth: 0,
        zIndex: win.zIndex,
      }
    : {
        left: win.x,
        top: win.y,
        width: win.width,
        height: win.height,
        zIndex: win.zIndex,
      };

  return (
    <div
      className={`xp-window ${isActive ? 'active' : 'inactive'}`}
      style={style}
      onMouseDown={() => {
        if (!isActive) focusWindow(win.id);
      }}
    >
      {/* Luna Title Bar */}
      <div
        className="xp-titlebar"
        style={win.maximized ? { borderRadius: 0 } : undefined}
        onMouseDown={handleTitleMouseDown}
        onDoubleClick={() => {
          if (win.resizable) toggleMaximizeWindow(win.id);
        }}
      >
        <div className="xp-titlebar-left">
          <img src={win.icon} alt="" className="xp-titlebar-icon" />
          <span className="xp-titlebar-text">{win.title}</span>
        </div>
        <div className="xp-window-controls">
          <button
            className="xp-win-ctrl-btn"
            title="Minimize"
            onClick={(e) => {
              e.stopPropagation();
              minimizeWindow(win.id);
            }}
          >
            <svg width="9" height="9" viewBox="0 0 9 9">
              <rect x="1" y="6" width="6" height="2" fill="#fff" />
            </svg>
          </button>
          {win.resizable && (
            <button
              className="xp-win-ctrl-btn"
              title={win.maximized ? 'Restore Down' : 'Maximize'}
              onClick={(e) => {
                e.stopPropagation();
                toggleMaximizeWindow(win.id);
              }}
            >
              {win.maximized ? (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <rect x="3" y="1" width="6" height="5" stroke="#fff" strokeWidth="1.3" />
                  <rect x="1" y="3" width="6" height="6" fill="#205be0" stroke="#fff" strokeWidth="1.3" />
                </svg>
              ) : (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <rect x="1" y="1.5" width="8" height="7" stroke="#fff" strokeWidth="1.4" />
                  <line x1="1" y1="2.5" x2="9" y2="2.5" stroke="#fff" strokeWidth="2" />
                </svg>
              )}
            </button>
          )}
          <button
            className="xp-win-ctrl-btn close"
            title="Close"
            onClick={(e) => {
              e.stopPropagation();
              closeWindow(win.id);
            }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10">
              <path d="M2 2 L8 8 M8 2 L2 8" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Window Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', position: 'relative' }}>
        {children}
      </div>

      {/* 8-Direction Resize Handles */}
      {win.resizable && !win.maximized && (
        <>
          <div onMouseDown={startResize('e')} style={{ position: 'absolute', top: 8, right: -2, bottom: 8, width: 6, cursor: 'ew-resize' }} />
          <div onMouseDown={startResize('w')} style={{ position: 'absolute', top: 8, left: -2, bottom: 8, width: 6, cursor: 'ew-resize' }} />
          <div onMouseDown={startResize('s')} style={{ position: 'absolute', left: 8, right: 8, bottom: -2, height: 6, cursor: 'ns-resize' }} />
          <div onMouseDown={startResize('n')} style={{ position: 'absolute', left: 8, right: 8, top: -2, height: 5, cursor: 'ns-resize' }} />
          <div onMouseDown={startResize('se')} style={{ position: 'absolute', right: -2, bottom: -2, width: 12, height: 12, cursor: 'nwse-resize' }} />
          <div onMouseDown={startResize('sw')} style={{ position: 'absolute', left: -2, bottom: -2, width: 12, height: 12, cursor: 'nesw-resize' }} />
        </>
      )}
    </div>
  );
};

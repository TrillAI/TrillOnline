import React, { useRef } from 'react';
import { WindowInstance, useOS } from '../../context/OSContext';

interface WindowFrameProps {
  win: WindowInstance;
  children: React.ReactNode;
}

export const WindowFrame: React.FC<WindowFrameProps> = ({ win, children }) => {
  const {
    osType,
    activeWindowId,
    focusWindow,
    closeWindow,
    minimizeWindow,
    toggleMaximizeWindow,
    moveWindow,
    resizeWindow,
  } = useOS();

  const isActive = activeWindowId === win.id;
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const resizeRef = useRef<{
    dir: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
  } | null>(null);

  if (win.minimized) return null;

  const topBarOffset = osType === 'macos' || osType === 'debian' || osType === 'centos' ? 28 : 0;
  const bottomBarOffset =
    osType === 'win10' ? 40 : osType === 'macos' ? 62 : osType === 'linux' ? 36 : osType === 'debian' ? 54 : 30;

  const handleTitleMouseDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    focusWindow(win.id);
    if (win.maximized) return;
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: win.x,
      origY: win.y,
    };
  };

  const handleTitlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const nx = Math.max(-win.width + 100, Math.min(window.innerWidth - 60, dragRef.current.origX + dx));
    const ny = Math.max(topBarOffset, Math.min(window.innerHeight - 60, dragRef.current.origY + dy));
    moveWindow(win.id, nx, ny);
  };

  const handleTitlePointerUp = () => {
    dragRef.current = null;
  };

  const startResize = (dir: string) => (e: React.PointerEvent) => {
    e.stopPropagation();
    focusWindow(win.id);
    if (win.maximized || !win.resizable) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    resizeRef.current = {
      dir,
      startX: e.clientX,
      startY: e.clientY,
      origX: win.x,
      origY: win.y,
      origW: win.width,
      origH: win.height,
    };
  };

  const onResizeMove = (e: React.PointerEvent) => {
    const r = resizeRef.current;
    if (!r) return;
    const dx = e.clientX - r.startX;
    const dy = e.clientY - r.startY;
    let nx = r.origX;
    let ny = r.origY;
    let nw = r.origW;
    let nh = r.origH;

    if (r.dir.includes('e')) nw = Math.max(win.minWidth, r.origW + dx);
    if (r.dir.includes('s')) nh = Math.max(win.minHeight, r.origH + dy);
    if (r.dir.includes('w')) {
      const candidateW = r.origW - dx;
      if (candidateW >= win.minWidth) {
        nw = candidateW;
        nx = r.origX + dx;
      }
    }
    if (r.dir.includes('n')) {
      const candidateH = r.origH - dy;
      if (candidateH >= win.minHeight) {
        nh = candidateH;
        ny = Math.max(topBarOffset, r.origY + dy);
      }
    }
    resizeWindow(win.id, nx, ny, nw, nh);
  };

  const onResizeEnd = () => {
    resizeRef.current = null;
  };

  const style: React.CSSProperties = win.maximized
    ? {
        left: 0,
        top: topBarOffset,
        width: '100vw',
        height: `calc(100vh - ${topBarOffset + bottomBarOffset}px)`,
        zIndex: win.zIndex,
        borderRadius: 0,
      }
    : {
        left: win.x,
        top: Math.max(topBarOffset, win.y),
        width: Math.min(win.width, window.innerWidth - 8),
        height: Math.min(win.height, window.innerHeight - (topBarOffset + bottomBarOffset + 6)),
        zIndex: win.zIndex,
        ...(osType === 'win10'
          ? { borderRadius: 2, border: isActive ? '1px solid #0078d4' : '1px solid #475569' }
          : osType === 'macos'
          ? { borderRadius: 10, border: '1px solid rgba(0,0,0,0.28)', overflow: 'hidden' }
          : osType === 'winxp'
          ? {}
          : { borderRadius: 7, border: '1px solid #334155', overflow: 'hidden' }),
      };

  const renderNonXPTitlebar = () => {
    if (osType === 'macos') {
      return (
        <div
          onPointerDown={handleTitleMouseDown}
          onPointerMove={handleTitlePointerMove}
          onPointerUp={handleTitlePointerUp}
          onDoubleClick={() => win.resizable && toggleMaximizeWindow(win.id)}
          style={{
            height: 30,
            background: isActive
              ? 'linear-gradient(180deg, #f1f5f9 0%, #cbd5e1 100%)'
              : '#e2e8f0',
            borderBottom: '1px solid #94a3b8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 10px',
            userSelect: 'none',
            touchAction: 'none',
          }}
        >
          {/* Mac OS Traffic Lights on Left */}
          <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
            <button
              onClick={() => closeWindow(win.id)}
              title="Close"
              style={{ width: 12, height: 12, borderRadius: '50%', border: '1px solid #dc2626', background: '#ff5f56', cursor: 'pointer', padding: 0 }}
            />
            <button
              onClick={() => minimizeWindow(win.id)}
              title="Minimize"
              style={{ width: 12, height: 12, borderRadius: '50%', border: '1px solid #ca8a04', background: '#ffbd2e', cursor: 'pointer', padding: 0 }}
            />
            {win.resizable && (
              <button
                onClick={() => toggleMaximizeWindow(win.id)}
                title="Zoom"
                style={{ width: 12, height: 12, borderRadius: '50%', border: '1px solid #16a34a', background: '#27c93f', cursor: 'pointer', padding: 0 }}
              />
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: '#1e293b' }}>
            <img src={win.icon} alt="" style={{ width: 15, height: 15 }} />
            <span>{win.title}</span>
          </div>
          <div style={{ width: 44 }} />
        </div>
      );
    }

    if (osType === 'win10') {
      return (
        <div
          onPointerDown={handleTitleMouseDown}
          onPointerMove={handleTitlePointerMove}
          onPointerUp={handleTitlePointerUp}
          onDoubleClick={() => win.resizable && toggleMaximizeWindow(win.id)}
          style={{
            height: 30,
            background: isActive ? '#ffffff' : '#f1f5f9',
            color: isActive ? '#0f172a' : '#64748b',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingLeft: 10,
            userSelect: 'none',
            touchAction: 'none',
            fontFamily: '"Segoe UI", Tahoma, sans-serif',
            fontSize: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
            <img src={win.icon} alt="" style={{ width: 16, height: 16 }} />
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{win.title}</span>
          </div>
          <div style={{ display: 'flex', height: '100%' }}>
            <button onClick={() => minimizeWindow(win.id)} style={{ width: 42, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13 }}>─</button>
            {win.resizable && (
              <button onClick={() => toggleMaximizeWindow(win.id)} style={{ width: 42, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12 }}>
                {win.maximized ? '❐' : '□'}
              </button>
            )}
            <button onClick={() => closeWindow(win.id)} style={{ width: 44, border: 'none', background: '#e81123', color: '#fff', cursor: 'pointer', fontSize: 13 }}>✕</button>
          </div>
        </div>
      );
    }

    // Linux / Debian / CentOS Adwaita Dark Titlebar
    const unixAccent = osType === 'debian' ? '#d70a53' : osType === 'centos' ? '#9333ea' : '#10b981';
    return (
      <div
        onPointerDown={handleTitleMouseDown}
        onPointerMove={handleTitlePointerMove}
        onPointerUp={handleTitlePointerUp}
        onDoubleClick={() => win.resizable && toggleMaximizeWindow(win.id)}
        style={{
          height: 30,
          background: isActive ? '#1f242d' : '#2d333f',
          color: '#f8fafc',
          borderBottom: `2px solid ${isActive ? unixAccent : '#475569'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 8px',
          userSelect: 'none',
          touchAction: 'none',
          fontSize: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, overflow: 'hidden' }}>
          <img src={win.icon} alt="" style={{ width: 15, height: 15 }} />
          <span style={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {win.title}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 5 }}>
          <button
            onClick={() => minimizeWindow(win.id)}
            style={{ width: 22, height: 22, borderRadius: '50%', border: 'none', background: '#334155', color: '#fff', cursor: 'pointer', fontSize: 11 }}
          >
            _
          </button>
          {win.resizable && (
            <button
              onClick={() => toggleMaximizeWindow(win.id)}
              style={{ width: 22, height: 22, borderRadius: '50%', border: 'none', background: '#334155', color: '#fff', cursor: 'pointer', fontSize: 11 }}
            >
              □
            </button>
          )}
          <button
            onClick={() => closeWindow(win.id)}
            style={{ width: 22, height: 22, borderRadius: '50%', border: 'none', background: unixAccent, color: '#fff', cursor: 'pointer', fontSize: 11, fontWeight: 800 }}
          >
            ✕
          </button>
        </div>
      </div>
    );
  };

  return (
    <div
      className={`xp-window ${isActive ? '' : 'inactive'}`}
      style={style}
      onMouseDown={() => focusWindow(win.id)}
    >
      {osType === 'winxp' ? (
        <div
          className={`xp-titlebar ${isActive ? '' : 'inactive'}`}
          onPointerDown={handleTitleMouseDown}
          onPointerMove={handleTitlePointerMove}
          onPointerUp={handleTitlePointerUp}
          onDoubleClick={() => win.resizable && toggleMaximizeWindow(win.id)}
          style={{ touchAction: 'none' }}
        >
          <img src={win.icon} alt="" className="xp-titlebar-icon" />
          <div className="xp-titlebar-text">{win.title}</div>
          <div className="xp-title-controls">
            <button className="xp-ctrl-btn" title="Minimize" onClick={() => minimizeWindow(win.id)}>
              <span style={{ display: 'block', width: 8, height: 2, background: '#fff', marginTop: 8 }} />
            </button>
            {win.resizable && (
              <button
                className="xp-ctrl-btn"
                title={win.maximized ? 'Restore' : 'Maximize'}
                onClick={() => toggleMaximizeWindow(win.id)}
              >
                <span
                  style={{
                    display: 'block',
                    width: 9,
                    height: 8,
                    border: '1.5px solid #fff',
                    borderTopWidth: 2.5,
                  }}
                />
              </button>
            )}
            <button className="xp-ctrl-btn close" title="Close" onClick={() => closeWindow(win.id)}>
              ✕
            </button>
          </div>
        </div>
      ) : (
        renderNonXPTitlebar()
      )}

      {/* Window Body */}
      <div className="xp-window-body">{children}</div>

      {/* 8-Way Resize Handles */}
      {win.resizable && !win.maximized && (
        <>
          <div onPointerDown={startResize('e')} onPointerMove={onResizeMove} onPointerUp={onResizeEnd} style={{ position: 'absolute', right: -3, top: 8, bottom: 8, width: 6, cursor: 'ew-resize', touchAction: 'none' }} />
          <div onPointerDown={startResize('w')} onPointerMove={onResizeMove} onPointerUp={onResizeEnd} style={{ position: 'absolute', left: -3, top: 8, bottom: 8, width: 6, cursor: 'ew-resize', touchAction: 'none' }} />
          <div onPointerDown={startResize('s')} onPointerMove={onResizeMove} onPointerUp={onResizeEnd} style={{ position: 'absolute', bottom: -3, left: 8, right: 8, height: 6, cursor: 'ns-resize', touchAction: 'none' }} />
          <div onPointerDown={startResize('se')} onPointerMove={onResizeMove} onPointerUp={onResizeEnd} style={{ position: 'absolute', right: -4, bottom: -4, width: 12, height: 12, cursor: 'nwse-resize', touchAction: 'none' }} />
          <div onPointerDown={startResize('sw')} onPointerMove={onResizeMove} onPointerUp={onResizeEnd} style={{ position: 'absolute', left: -4, bottom: -4, width: 12, height: 12, cursor: 'nesw-resize', touchAction: 'none' }} />
        </>
      )}
    </div>
  );
};

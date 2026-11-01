import React, { useRef, useState } from 'react';

export const PinballApp: React.FC = () => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const sendKey = (key: string, code: string, keyCode: number, action: 'keydown' | 'keyup') => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: 'pinball-key', key, code, keyCode, action },
      '*'
    );
  };

  const tapKey = (key: string, code: string, keyCode: number, holdMs = 140) => {
    sendKey(key, code, keyCode, 'keydown');
    window.setTimeout(() => sendKey(key, code, keyCode, 'keyup'), holdMs);
    iframeRef.current?.focus();
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#000', minHeight: 0 }}>
      {/* XP Classic Menu Bar */}
      <div className="xp-menubar">
        <span className="xp-menu-item" onClick={() => tapKey('F2', 'F2', 113)}>
          New Game (F2)
        </span>
        <span className="xp-menu-item" onClick={() => tapKey(' ', 'Space', 32, 650)}>
          Launch Ball (Hold Space)
        </span>
        <span className="xp-menu-item" onClick={() => setShowHelp((v) => !v)}>
          Controls Help
        </span>
      </div>

      {showHelp && (
        <div
          style={{
            background: '#ffffe1',
            borderBottom: '1px solid #888',
            padding: '5px 10px',
            fontSize: 11,
            color: '#000',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span>
            <b>Controls:</b> <code>Z</code> = Left Flipper &nbsp;|&nbsp; <code>/</code> = Right Flipper &nbsp;|&nbsp;{' '}
            <b>Hold</b> <code>Space</code> = Plunger Launch &nbsp;|&nbsp; <code>X</code> / <code>.</code> = Bump Table &nbsp;|&nbsp;{' '}
            <code>F2</code> = New Game
          </span>
          <span style={{ cursor: 'pointer', fontWeight: 700 }} onClick={() => setShowHelp(false)}>
            ✕
          </span>
        </div>
      )}

      {/* Actual Space Cadet Pinball WebAssembly Canvas */}
      <iframe
        ref={iframeRef}
        src="/pinball/embed.html"
        title="3D Pinball - Space Cadet"
        style={{ flex: 1, width: '100%', border: 'none', background: '#000' }}
      />

      {/* Optional Mouse/Touch Controls Footer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 10px',
          background: '#1e293b',
          borderTop: '1px solid #334155',
          fontSize: 11,
          color: '#cbd5e1',
        }}
      >
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            className="xp-btn"
            onMouseDown={() => sendKey('z', 'KeyZ', 90, 'keydown')}
            onMouseUp={() => sendKey('z', 'KeyZ', 90, 'keyup')}
          >
            ⬅ Left Flipper (Z)
          </button>
          <button
            className="xp-btn"
            onMouseDown={() => sendKey('/', 'Slash', 191, 'keydown')}
            onMouseUp={() => sendKey('/', 'Slash', 191, 'keyup')}
          >
            Right Flipper (/) ➡
          </button>
        </div>
        <button
          className="xp-btn xp-btn-primary"
          onMouseDown={() => sendKey(' ', 'Space', 32, 'keydown')}
          onMouseUp={() => sendKey(' ', 'Space', 32, 'keyup')}
        >
          🚀 Hold to Launch (Space)
        </button>
      </div>
    </div>
  );
};

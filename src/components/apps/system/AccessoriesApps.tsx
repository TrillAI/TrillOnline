import React, { useState, useRef, useEffect } from 'react';
import { useOS } from '../../../context/OSContext';

/* ============================================================================
   1. NOTEPAD
   ============================================================================ */
export const NotepadApp: React.FC<{ windowId: string; payload?: Record<string, unknown> }> = ({
  windowId,
  payload,
}) => {
  const { vfs, createFile, updateFileContent, updateWindowTitle, pushBalloon } = useOS();
  const initialFile = vfs.find((n) => n.id === payload?.fileId);

  const [fileId, setFileId] = useState<string | null>(initialFile?.id || null);
  const [text, setText] = useState<string>(initialFile?.content || '');
  const [wordWrap, setWordWrap] = useState(true);

  const handleSave = () => {
    if (fileId) {
      updateFileContent(fileId, text);
      pushBalloon('Notepad Saved', 'Saved changes to My Documents.');
    } else {
      const name = prompt('Save file in My Documents as:', 'Notes.txt');
      if (!name) return;
      const node = createFile('my-docs', name.endsWith('.txt') ? name : `${name}.txt`, text);
      setFileId(node.id);
      updateWindowTitle(windowId, `${node.name} - Notepad`);
      pushBalloon('Notepad Saved', `Saved ${node.name} in My Documents.`);
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#fff', minHeight: 0 }}>
      <div className="xp-menubar">
        <span
          className="xp-menu-item"
          onClick={() => {
            setFileId(null);
            setText('');
            updateWindowTitle(windowId, 'Untitled - Notepad');
          }}
        >
          New
        </span>
        <span className="xp-menu-item" onClick={handleSave}>
          Save
        </span>
        <span
          className="xp-menu-item"
          onClick={() => setText((t) => `${t}${new Date().toLocaleTimeString()} ${new Date().toLocaleDateString()}`)}
        >
          Insert Time/Date (F5)
        </span>
        <span className="xp-menu-item" onClick={() => setWordWrap((w) => !w)}>
          {wordWrap ? '✓ ' : ''}Word Wrap
        </span>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type notes here..."
        style={{
          flex: 1,
          border: 'none',
          outline: 'none',
          padding: 8,
          resize: 'none',
          fontFamily: "'Lucida Console', 'Courier New', monospace",
          fontSize: 13,
          whiteSpace: wordWrap ? 'pre-wrap' : 'pre',
        }}
      />
    </div>
  );
};

/* ============================================================================
   2. MS PAINT (mspaint.exe)
   ============================================================================ */
const PAINT_COLORS = [
  '#000000', '#808080', '#800000', '#808000', '#008000', '#008080', '#000080', '#800080', '#808040', '#004040', '#0080ff', '#004080', '#4000ff', '#804000',
  '#ffffff', '#c0c0c0', '#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff', '#ffff80', '#00ff80', '#80ffff', '#8080ff', '#ff0080', '#ff8040',
];

export const PaintApp: React.FC = () => {
  const { createFile, setWallpaper, pushBalloon } = useOS();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [tool, setTool] = useState<'pencil' | 'brush' | 'spray' | 'eraser' | 'line' | 'rect' | 'circle'>('brush');
  const [color, setColor] = useState('#0000ff');
  const [size, setSize] = useState(4);
  const drawingRef = useRef<{ active: boolean; x0: number; y0: number; snapshot?: ImageData }>({
    active: false,
    x0: 0,
    y0: 0,
  });

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, c.width, c.height);
  }, []);

  const getPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    const { x, y } = getPos(e);
    drawingRef.current = {
      active: true,
      x0: x,
      y0: y,
      snapshot: ctx.getImageData(0, 0, c.width, c.height),
    };
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const onMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current.active) return;
    const c = canvasRef.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    const { x, y } = getPos(e);

    if (tool === 'pencil' || tool === 'brush' || tool === 'eraser') {
      ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
      ctx.lineWidth = tool === 'pencil' ? 1.5 : tool === 'eraser' ? size * 3 : size;
      ctx.lineCap = 'round';
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (tool === 'spray') {
      ctx.fillStyle = color;
      for (let i = 0; i < 18; i++) {
        const ang = Math.random() * Math.PI * 2;
        const rad = Math.random() * (size * 3.2);
        ctx.fillRect(x + Math.cos(ang) * rad, y + Math.sin(ang) * rad, 1.5, 1.5);
      }
    } else if (drawingRef.current.snapshot) {
      ctx.putImageData(drawingRef.current.snapshot, 0, 0);
      ctx.strokeStyle = color;
      ctx.lineWidth = size;
      const { x0, y0 } = drawingRef.current;
      if (tool === 'line') {
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x, y);
        ctx.stroke();
      } else if (tool === 'rect') {
        ctx.strokeRect(x0, y0, x - x0, y - y0);
      } else if (tool === 'circle') {
        ctx.beginPath();
        ctx.ellipse((x0 + x) / 2, (y0 + y) / 2, Math.abs(x - x0) / 2, Math.abs(y - y0) / 2, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  };

  const onUp = () => {
    drawingRef.current.active = false;
  };

  const clearCanvas = () => {
    const c = canvasRef.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, c.width, c.height);
  };

  const savePainting = () => {
    const c = canvasRef.current;
    if (!c) return;
    const dataUrl = c.toDataURL('image/png');
    const name = `Drawing_${Date.now().toString().slice(-4)}.png`;
    createFile('my-pics', name, dataUrl, 'image/png');
    pushBalloon('Saved to My Pictures', `${name} was saved inside My Pictures!`);
  };

  const setAsWallpaper = () => {
    const c = canvasRef.current;
    if (!c) return;
    setWallpaper(c.toDataURL('image/png'));
    pushBalloon('Wallpaper Updated', 'Your Paint artwork is now your Windows XP Desktop Background!');
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#ece9d8', fontSize: 11, minHeight: 0 }}>
      <div className="xp-menubar">
        <span className="xp-menu-item" onClick={clearCanvas}>
          New / Clear
        </span>
        <span className="xp-menu-item" onClick={savePainting}>
          Save to My Pictures
        </span>
        <span className="xp-menu-item" onClick={setAsWallpaper}>
          Set as Desktop Background
        </span>
      </div>

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* Left Classic Paint Tool Palette */}
        <div style={{ width: 62, padding: 5, borderRight: '1px solid #aca899', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {(
            [
              { id: 'pencil', icon: '✏️', label: 'Pencil' },
              { id: 'brush', icon: '🖌️', label: 'Brush' },
              { id: 'spray', icon: '💨', label: 'Airbrush' },
              { id: 'eraser', icon: '🧽', label: 'Eraser' },
              { id: 'line', icon: '📏', label: 'Line' },
              { id: 'rect', icon: '▭', label: 'Rect' },
              { id: 'circle', icon: '◯', label: 'Ellipse' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              title={t.label}
              className={tool === t.id ? 'xp-bevel-sunken' : 'xp-bevel-raised'}
              style={{
                height: 28,
                background: tool === t.id ? '#fff' : '#ece9d8',
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              {t.icon}
            </button>
          ))}
          <div style={{ marginTop: 8, textAlign: 'center', fontSize: 10 }}>Size: {size}px</div>
          <input
            type="range"
            min={1}
            max={14}
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>

        {/* Drawing Area */}
        <div style={{ flex: 1, background: '#808080', padding: 8, overflow: 'auto' }}>
          <canvas
            ref={canvasRef}
            width={600}
            height={380}
            onMouseDown={onDown}
            onMouseMove={onMove}
            onMouseUp={onUp}
            onMouseLeave={onUp}
            style={{ background: '#fff', cursor: 'crosshair', boxShadow: '2px 2px 6px rgba(0,0,0,0.4)' }}
          />
        </div>
      </div>

      {/* Bottom 28-Color Palette */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderTop: '1px solid #aca899' }}>
        <div
          className="xp-bevel-sunken"
          style={{ width: 28, height: 28, background: color }}
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(14, 16px)', gap: 2 }}>
          {PAINT_COLORS.map((c) => (
            <div
              key={c}
              onClick={() => setColor(c)}
              style={{
                width: 16,
                height: 16,
                background: c,
                border: '1px solid #555',
                cursor: 'pointer',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
   3. CALCULATOR (calc.exe)
   ============================================================================ */
export const CalculatorApp: React.FC = () => {
  const [display, setDisplay] = useState('0');
  const [prevVal, setPrevVal] = useState<number | null>(null);
  const [op, setOp] = useState<string | null>(null);
  const [fresh, setFresh] = useState(true);

  const inputDigit = (d: string) => {
    if (fresh) {
      setDisplay(d === '.' ? '0.' : d);
      setFresh(false);
    } else {
      if (d === '.' && display.includes('.')) return;
      setDisplay(display === '0' && d !== '.' ? d : display + d);
    }
  };

  const applyOp = (nextOp: string) => {
    const cur = parseFloat(display);
    if (prevVal !== null && op && !fresh) {
      let res = cur;
      if (op === '+') res = prevVal + cur;
      if (op === '-') res = prevVal - cur;
      if (op === '*') res = prevVal * cur;
      if (op === '/') res = cur !== 0 ? prevVal / cur : 0;
      setDisplay(String(Number(res.toFixed(8))));
      setPrevVal(res);
    } else {
      setPrevVal(cur);
    }
    setOp(nextOp === '=' ? null : nextOp);
    setFresh(true);
  };

  return (
    <div style={{ flex: 1, padding: 10, background: '#ece9d8', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <input
        readOnly
        className="xp-input"
        value={display}
        style={{ textAlign: 'right', fontSize: 16, height: 30, fontFamily: 'Tahoma' }}
      />
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="xp-btn" style={{ flex: 1, color: '#b91c1c' }} onClick={() => setDisplay(display.slice(0, -1) || '0')}>
          Backspace
        </button>
        <button className="xp-btn" style={{ flex: 1, color: '#b91c1c' }} onClick={() => setDisplay('0')}>
          CE
        </button>
        <button
          className="xp-btn"
          style={{ flex: 1, color: '#b91c1c' }}
          onClick={() => {
            setDisplay('0');
            setPrevVal(null);
            setOp(null);
            setFresh(true);
          }}
        >
          C
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 5, flex: 1 }}>
        {[
          '7', '8', '9', '/',
          '4', '5', '6', '*',
          '1', '2', '3', '-',
          '0', '.', '=', '+',
        ].map((k) => {
          const isOp = ['/', '*', '-', '+', '='].includes(k);
          return (
            <button
              key={k}
              className="xp-btn"
              style={{ color: isOp ? '#dc2626' : '#1d4ed8', fontWeight: 700 }}
              onClick={() => (isOp ? applyOp(k) : inputDigit(k))}
            >
              {k}
            </button>
          );
        })}
      </div>
    </div>
  );
};

/* ============================================================================
   4. WINDOWS PICTURE AND FAX VIEWER
   ============================================================================ */
export const PictureViewerApp: React.FC<{ payload?: Record<string, unknown> }> = ({ payload }) => {
  const { setWallpaper, pushBalloon } = useOS();
  const src = (payload?.src as string) || '/wallpapers/bliss.jpg';
  const [rot, setRot] = useState(0);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#eef2f6', minHeight: 0 }}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: 12 }}>
        <img
          src={src}
          alt="Preview"
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            transform: `rotate(${rot}deg)`,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}
        />
      </div>
      <div style={{ height: 36, background: '#ece9d8', borderTop: '1px solid #aca899', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <button className="xp-btn" onClick={() => setRot((r) => (r - 90) % 360)}>⟲ Rotate Left</button>
        <button className="xp-btn" onClick={() => setRot((r) => (r + 90) % 360)}>⟳ Rotate Right</button>
        <button
          className="xp-btn xp-btn-primary"
          onClick={() => {
            setWallpaper(src);
            pushBalloon('Desktop Wallpaper Set', 'Image applied as your Windows XP background!');
          }}
        >
          🖼️ Set as Desktop Wallpaper
        </button>
      </div>
    </div>
  );
};

import React from 'react';
import { useOS } from '../../context/OSContext';
import { WindowsXPFlagSVG } from '../apps/aol/AOLGraphics';

interface ShutdownModalProps {
  mode: 'turnoff' | 'logoff';
  onClose: () => void;
}

export const ShutdownModal: React.FC<ShutdownModalProps> = ({ mode, onClose }) => {
  const { triggerShutdown, setScreensaverActive } = useOS();

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'grayscale(0.95)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 90000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 342,
          border: '2px solid #002373',
          boxShadow: '0 8px 28px rgba(0,0,0,0.65)',
          fontFamily: 'Tahoma, sans-serif',
          overflow: 'hidden',
        }}
      >
        {/* Top Blue Header */}
        <div
          style={{
            height: 44,
            background: 'linear-gradient(90deg, #00309c 0%, #2c64d4 100%)',
            borderBottom: '2px solid #f49b38',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 14px',
            color: '#fff',
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 700 }}>
            {mode === 'turnoff' ? 'Turn off computer' : 'Log Off Windows'}
          </span>
          <WindowsXPFlagSVG size={26} />
        </div>

        {/* Center Blue Body */}
        <div
          style={{
            background: 'linear-gradient(180deg, #6487dc 0%, #4d73cc 100%)',
            padding: '28px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-around',
            color: '#fff',
          }}
        >
          {mode === 'turnoff' ? (
            <>
              <div
                onClick={() => {
                  onClose();
                  setScreensaverActive(true);
                }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, cursor: 'pointer' }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 5,
                    border: '1.5px solid #fff',
                    background: 'linear-gradient(180deg, #ffca4f 0%, #e0860b 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 17,
                    boxShadow: '0 2px 5px rgba(0,0,0,0.4)',
                  }}
                >
                  ☾
                </div>
                <span style={{ fontSize: 11, fontWeight: 700 }}>Stand By</span>
              </div>

              <div
                onClick={() => {
                  onClose();
                  triggerShutdown('shutdown');
                }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, cursor: 'pointer' }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 5,
                    border: '1.5px solid #fff',
                    background: 'linear-gradient(180deg, #ff7057 0%, #cc290e 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 17,
                    boxShadow: '0 2px 5px rgba(0,0,0,0.4)',
                  }}
                >
                  ⏻
                </div>
                <span style={{ fontSize: 11, fontWeight: 700 }}>Turn Off</span>
              </div>

              <div
                onClick={() => {
                  onClose();
                  triggerShutdown('restart');
                }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, cursor: 'pointer' }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 5,
                    border: '1.5px solid #fff',
                    background: 'linear-gradient(180deg, #5ed658 0%, #1c8c17 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 17,
                    boxShadow: '0 2px 5px rgba(0,0,0,0.4)',
                  }}
                >
                  ↻
                </div>
                <span style={{ fontSize: 11, fontWeight: 700 }}>Restart</span>
              </div>
            </>
          ) : (
            <>
              <div
                onClick={() => {
                  onClose();
                  triggerShutdown('logoff');
                }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, cursor: 'pointer' }}
              >
                <img src="/icons/290.png" alt="Switch" style={{ width: 32, height: 32 }} />
                <span style={{ fontSize: 11, fontWeight: 700 }}>Switch User</span>
              </div>
              <div
                onClick={() => {
                  onClose();
                  triggerShutdown('logoff');
                }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, cursor: 'pointer' }}
              >
                <img src="/icons/546(32x32).png" alt="Log Off" style={{ width: 32, height: 32 }} />
                <span style={{ fontSize: 11, fontWeight: 700 }}>Log Off</span>
              </div>
            </>
          )}
        </div>

        {/* Bottom Footer */}
        <div
          style={{
            height: 40,
            background: '#00309c',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            padding: '0 14px',
          }}
        >
          <button className="xp-btn" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

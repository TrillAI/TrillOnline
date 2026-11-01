import React, { useState, useEffect } from 'react';
import { useOS } from '../../context/OSContext';
import { useSound } from '../../context/SoundContext';
import { WindowsXPFlagSVG } from '../apps/aol/AOLGraphics';

export const WelcomeScreen: React.FC = () => {
  const { bootPhase, setBootPhase, username, userAvatar, loginToDesktop, triggerShutdown } = useOS();
  const { unlockAudio } = useSound();
  const [loggingIn, setLoggingIn] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    setLoggingIn(false);
    setHovered(false);
  }, [bootPhase]);

  const handleLogin = () => {
    if (loggingIn) return;
    unlockAudio();
    setLoggingIn(true);
    window.setTimeout(() => {
      loginToDesktop();
    }, 600);
  };

  if (bootPhase === 'powered_off') {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: '#000000',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 22,
          color: '#ff9933',
          fontFamily: 'Tahoma, sans-serif',
          zIndex: 99999,
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 0.4, textAlign: 'center', padding: '0 20px' }}>
          It is now safe to turn off your computer.
        </div>
        <button
          onClick={() => {
            unlockAudio();
            setBootPhase('black');
          }}
          style={{
            padding: '10px 26px',
            borderRadius: 6,
            border: '2px solid #45b649',
            background: 'linear-gradient(180deg, #43b047 0%, #247827 100%)',
            color: '#fff',
            fontWeight: 700,
            fontSize: 14,
            cursor: 'pointer',
            boxShadow: '0 0 18px rgba(69, 182, 73, 0.45)',
          }}
        >
          ⏻ Power On PC
        </button>
      </div>
    );
  }

  if (bootPhase !== 'welcome' && bootPhase !== 'shutting_down') return null;

  const isShuttingDown = bootPhase === 'shutting_down';
  const tileActive = hovered || loggingIn;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        background: '#5a7edc',
        fontFamily: 'Tahoma, "Trebuchet MS", sans-serif',
        zIndex: 99998,
        userSelect: 'none',
      }}
    >
      <style>{`
        @media (max-width: 720px) {
          .xp-welcome-grid {
            grid-template-columns: 1fr !important;
            grid-template-rows: auto 1px auto;
            align-content: center;
            gap: 22px;
            padding: 0 20px;
          }
          .xp-welcome-left {
            align-items: center !important;
            padding-right: 0 !important;
            text-align: center !important;
          }
          .xp-welcome-left-text {
            text-align: center !important;
          }
          .xp-welcome-divider {
            width: 74% !important;
            height: 1px !important;
            margin: 0 auto;
            background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.68) 50%, transparent 100%) !important;
          }
          .xp-welcome-right {
            padding-left: 0 !important;
            display: flex;
            justify-content: center;
          }
          .xp-welcome-footer-note {
            display: none !important;
          }
        }
      `}</style>

      {/* Top Deep Royal Blue Header Bar */}
      <div
        style={{
          height: 82,
          background: '#00309c',
          position: 'relative',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: 2,
            background: 'linear-gradient(90deg, #466dcd 0%, #c8ddff 35%, #ffffff 50%, #7aa1e8 85%, #00309c 100%)',
          }}
        />
      </div>

      {/* Main Split Blue Welcome Canvas */}
      <div
        className="xp-welcome-grid"
        style={{
          flex: 1,
          position: 'relative',
          background:
            'radial-gradient(circle at 18% 20%, rgba(145, 182, 248, 0.62) 0%, rgba(90, 126, 220, 1) 52%, rgba(72, 108, 206, 1) 100%)',
          display: 'grid',
          gridTemplateColumns: '1fr 2px 1fr',
          alignItems: 'center',
        }}
      >
        {isShuttingDown ? (
          <div
            style={{
              gridColumn: '1 / -1',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 14,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <WindowsXPFlagSVG size={58} />
              <div>
                <div style={{ color: '#fff', fontSize: 12 }}>Microsoft®</div>
                <div style={{ color: '#fff', fontSize: 36, fontWeight: 700, lineHeight: 1 }}>
                  Windows<sup style={{ color: '#ff7b29', fontSize: 17 }}>xp</sup>
                </div>
              </div>
            </div>
            <div style={{ color: '#fff', fontSize: 19, fontWeight: 600, textShadow: '1px 1px 2px rgba(0,0,0,0.45)' }}>
              Windows is shutting down...
            </div>
          </div>
        ) : (
          <>
            {/* Left Side: Windows XP Logo + Instruction (Switches to italic "Welcome" upon click) */}
            <div
              className="xp-welcome-left"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                paddingRight: 44,
                gap: 18,
              }}
            >
              {loggingIn ? (
                <div
                  style={{
                    color: '#ffffff',
                    fontFamily: '"Trebuchet MS", Arial, sans-serif',
                    fontStyle: 'italic',
                    fontWeight: 700,
                    fontSize: 44,
                    letterSpacing: -0.5,
                    textShadow: '2px 3px 5px rgba(0, 22, 85, 0.55)',
                  }}
                >
                  Welcome
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <WindowsXPFlagSVG size={64} />
                    <div style={{ marginTop: 2, textAlign: 'right' }}>
                      <div style={{ color: '#fff', fontSize: 11, opacity: 0.92 }}>Microsoft®</div>
                      <div
                        style={{
                          color: '#fff',
                          fontSize: 38,
                          fontWeight: 700,
                          letterSpacing: -0.8,
                          lineHeight: 0.96,
                          textShadow: '1px 2px 3px rgba(0, 22, 85, 0.45)',
                        }}
                      >
                        Windows<sup style={{ color: '#ff7324', fontSize: 17, marginLeft: 2 }}>xp</sup>
                      </div>
                    </div>
                  </div>
                  <div
                    className="xp-welcome-left-text"
                    style={{
                      color: '#ffffff',
                      fontSize: 17,
                      fontWeight: 500,
                      textAlign: 'right',
                      textShadow: '1px 1px 2px rgba(0, 22, 85, 0.45)',
                    }}
                  >
                    To begin, click your user name
                  </div>
                </>
              )}
            </div>

            {/* Center Vertical Fade Divider */}
            <div
              className="xp-welcome-divider"
              style={{
                width: 1,
                height: '66%',
                background:
                  'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.68) 50%, transparent 100%)',
              }}
            />

            {/* Right Side: Passwordless Clickable User Tile */}
            <div className="xp-welcome-right" style={{ paddingLeft: 40 }}>
              <button
                type="button"
                onClick={handleLogin}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                onFocus={() => setHovered(true)}
                onBlur={() => setHovered(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  width: 330,
                  maxWidth: '90vw',
                  padding: '9px 14px',
                  borderRadius: 8,
                  background: tileActive
                    ? 'linear-gradient(90deg, rgba(13, 56, 158, 0.96) 0%, rgba(40, 92, 204, 0.76) 68%, rgba(90, 126, 220, 0) 100%)'
                    : 'linear-gradient(90deg, rgba(24, 72, 178, 0.38) 0%, rgba(64, 108, 212, 0.18) 68%, rgba(90, 126, 220, 0) 100%)',
                  border: tileActive
                    ? '1px solid rgba(255, 255, 255, 0.65)'
                    : '1px solid rgba(255, 255, 255, 0.22)',
                  borderRight: 'none',
                  boxShadow: tileActive ? '0 3px 12px rgba(0, 20, 80, 0.28)' : 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                  outline: 'none',
                  transition: 'all 0.14s ease',
                }}
              >
                <img
                  src={userAvatar}
                  alt={username}
                  style={{
                    width: 58,
                    height: 58,
                    borderRadius: 5,
                    border: tileActive ? '2px solid #ffd452' : '2px solid #ffffff',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.45)',
                    objectFit: 'cover',
                    flexShrink: 0,
                    transition: 'border-color 0.14s ease',
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      color: '#fff',
                      fontSize: 19,
                      fontWeight: 600,
                      textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {username}
                  </div>

                  {loggingIn ? (
                    <div style={{ color: '#cfe2ff', fontSize: 12, fontWeight: 700, marginTop: 4 }}>
                      Loading your personal settings...
                    </div>
                  ) : (
                    <div
                      style={{
                        color: tileActive ? '#ffd97d' : '#dbe8ff',
                        fontSize: 11,
                        fontWeight: 600,
                        marginTop: 3,
                        opacity: tileActive ? 1 : 0.85,
                      }}
                    >
                      Click to log on
                    </div>
                  )}
                </div>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Bottom Deep Royal Blue Footer Bar */}
      <div
        style={{
          height: 78,
          background: '#00309c',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 34px',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            height: 2,
            background: 'linear-gradient(90deg, #00309c 0%, #f59432 30%, #ffd280 50%, #f59432 70%, #00309c 100%)',
          }}
        />
        {!isShuttingDown && (
          <>
            <button
              onClick={() => {
                unlockAudio();
                triggerShutdown('shutdown');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                background: 'transparent',
                border: 'none',
                color: '#fff',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              <span
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 4,
                  border: '1px solid #fff',
                  background: 'linear-gradient(180deg, #ff7b63 0%, #d93316 65%, #9c1b06 100%)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                }}
              >
                ⏻
              </span>
              <span>Turn off computer</span>
            </button>
            <div
              className="xp-welcome-footer-note"
              style={{ color: '#b8cff8', fontSize: 11, maxWidth: 360, textAlign: 'right', lineHeight: 1.35 }}
            >
              After you log on, you can add or change accounts.
              <br />
              Just go to Control Panel and click User Accounts.
            </div>
          </>
        )}
      </div>
    </div>
  );
};

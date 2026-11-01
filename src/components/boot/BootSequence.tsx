import React, { useEffect, useState } from 'react';
import { useOS } from '../../context/OSContext';
import { useSound } from '../../context/SoundContext';
import { WindowsXPFlagSVG } from '../apps/aol/AOLGraphics';

export const BootSequence: React.FC = () => {
  const { bootPhase, setBootPhase } = useOS();
  const { playPostBeep, unlockAudio } = useSound();
  const [memCount, setMemCount] = useState(65536);
  const [fadeInLogo, setFadeInLogo] = useState(false);

  useEffect(() => {
    if (bootPhase === 'black') {
      const t = window.setTimeout(() => {
        setBootPhase('bios');
      }, 1100);
      return () => clearTimeout(t);
    }

    if (bootPhase === 'bios') {
      playPostBeep();
      setMemCount(65536);
      const iv = window.setInterval(() => {
        setMemCount((m) => Math.min(524288, m + 98304));
      }, 160);
      const t = window.setTimeout(() => {
        setBootPhase('booting');
      }, 1450);
      return () => {
        clearInterval(iv);
        clearTimeout(t);
      };
    }

    if (bootPhase === 'booting') {
      setFadeInLogo(false);
      const f = window.setTimeout(() => setFadeInLogo(true), 80);
      const t = window.setTimeout(() => {
        setBootPhase('welcome');
      }, 4100);
      return () => {
        clearTimeout(f);
        clearTimeout(t);
      };
    }
  }, [bootPhase, setBootPhase, playPostBeep]);

  if (bootPhase === 'black') {
    return (
      <div
        onClick={unlockAudio}
        style={{
          position: 'fixed',
          inset: 0,
          background: '#000000',
          cursor: 'none',
          zIndex: 99999,
        }}
      />
    );
  }

  if (bootPhase === 'bios') {
    return (
      <div
        onClick={unlockAudio}
        style={{
          position: 'fixed',
          inset: 0,
          background: '#000000',
          color: '#cccccc',
          fontFamily: "'Courier New', Courier, monospace",
          fontSize: 15,
          padding: '28px 36px',
          lineHeight: 1.55,
          cursor: 'none',
          zIndex: 99999,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ color: '#fff', fontWeight: 700 }}>
              Award Modular BIOS v6.00PG, An Energy Star Ally
            </div>
            <div>Copyright (C) 1984-2003, Award Software, Inc.</div>
            <br />
            <div style={{ color: '#fff' }}>Intel(R) Pentium(R) 4 CPU 2.80GHz</div>
            <div>Memory Test : {memCount}K OK</div>
            <br />
            <div>Award Plug and Play BIOS Extension v1.0A</div>
            <div>Detecting IDE Primary Master ... WDC WD800JB-00JJC0 (80.0GB)</div>
            <div>Detecting IDE Primary Slave  ... SONY CD-RW CRX230E [AOL 9.0 Disc]</div>
            <div>Detecting PCI Modem          ... U.S. Robotics 56K Faxmodem V.90</div>
          </div>
          <div
            style={{
              border: '2px solid #4fa64f',
              padding: '6px 12px',
              color: '#eab308',
              fontWeight: 700,
              textAlign: 'right',
              fontSize: 13,
            }}
          >
            <div style={{ color: '#4fa64f' }}>ENERGY STAR</div>
            <div>EPA POLLUTION PREVENTER</div>
          </div>
        </div>
        <div style={{ position: 'absolute', bottom: 26, left: 36, color: '#aaa', fontSize: 13 }}>
          Press DEL to enter SETUP &nbsp;&nbsp;|&nbsp;&nbsp; Booting Microsoft Windows XP Professional...
        </div>
      </div>
    );
  }

  if (bootPhase === 'booting') {
    return (
      <div
        onClick={unlockAudio}
        style={{
          position: 'fixed',
          inset: 0,
          background: '#000000',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'none',
          zIndex: 99999,
          opacity: fadeInLogo ? 1 : 0,
          transition: 'opacity 0.45s ease-in',
        }}
      >
        <style>{`
          @keyframes xpBootTrack {
            0% { transform: translateX(-52px); }
            100% { transform: translateX(162px); }
          }
        `}</style>

        {/* Center Windows XP Logo Lockup (Exact match to Image 6) */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 56 }}>
          <div style={{ marginLeft: 56, marginBottom: 4 }}>
            <WindowsXPFlagSVG size={98} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <span
              style={{
                color: '#ffffff',
                fontFamily: 'Tahoma, Arial, sans-serif',
                fontSize: 16,
                letterSpacing: 0.4,
                marginBottom: -6,
              }}
            >
              Microsoft<sup style={{ fontSize: 10 }}>®</sup>
            </span>
            <div style={{ display: 'flex', alignItems: 'flex-start' }}>
              <span
                style={{
                  color: '#ffffff',
                  fontFamily: "'Franklin Gothic Medium', 'Trebuchet MS', Arial, sans-serif",
                  fontWeight: 700,
                  fontSize: 54,
                  letterSpacing: -1.5,
                  lineHeight: 1,
                }}
              >
                Windows
              </span>
              <span
                style={{
                  color: '#eb6525',
                  fontFamily: "'Franklin Gothic Medium', 'Trebuchet MS', Arial, sans-serif",
                  fontWeight: 800,
                  fontSize: 25,
                  marginLeft: 3,
                  marginTop: 3,
                }}
              >
                xp
              </span>
            </div>
          </div>
        </div>

        {/* Classic Rounded Silver Track with 3 Blue Scrolling Blocks */}
        <div
          style={{
            width: 162,
            height: 17,
            borderRadius: 5,
            border: '2px solid #9c9c9c',
            background: '#000',
            padding: '2px 2px',
            overflow: 'hidden',
            position: 'relative',
            boxShadow: 'inset 0 0 2px #000',
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: 3,
              animation: 'xpBootTrack 1.55s linear infinite',
            }}
          >
            {[0, 1, 2].map((idx) => (
              <div
                key={idx}
                style={{
                  width: 10,
                  height: 9,
                  borderRadius: 1,
                  background: 'linear-gradient(180deg, #8ab7ff 0%, #2d66eb 45%, #183da8 100%)',
                  boxShadow: '0 0 3px rgba(65, 130, 255, 0.7)',
                  flexShrink: 0,
                }}
              />
            ))}
          </div>
        </div>

        {/* Bottom Copyright & Microsoft Wordmark (Exact match to Image 6) */}
        <div
          style={{
            position: 'absolute',
            bottom: 26,
            left: 34,
            color: '#d8d8d8',
            fontSize: 13,
            fontFamily: 'Tahoma, sans-serif',
          }}
        >
          Copyright © Microsoft Corporation
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: 24,
            right: 36,
            color: '#ffffff',
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontStyle: 'italic',
            fontWeight: 900,
            fontSize: 20,
            letterSpacing: -0.6,
          }}
        >
          Microsoft<sup style={{ fontSize: 8, fontStyle: 'normal' }}>®</sup>
        </div>
      </div>
    );
  }

  return null;
};

import React, { useEffect, useState } from 'react';
import { useOS, OS_METADATA, OSType } from '../../context/OSContext';
import { useSound } from '../../context/SoundContext';
import { WindowsXPFlagSVG } from '../apps/aol/AOLGraphics';

const ALL_OS: OSType[] = ['winxp', 'win10', 'macos', 'linux', 'debian', 'centos'];

export const BootSequence: React.FC = () => {
  const { bootPhase, setBootPhase, osType, switchOperatingSystem } = useOS();
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
      }, 1750);
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
      }, 3900);
      return () => {
        clearTimeout(f);
        clearTimeout(t);
      };
    }
  }, [bootPhase, setBootPhase, playPostBeep]);

  // First thing visible on load MUST be a pure #000000 black screen!
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
          zIndex: 99999,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ color: '#fff', fontWeight: 700 }}>
              Award Modular BIOS v6.00PG, An Energy Star Ally — TrillXP Multi-OS Edition
            </div>
            <div>Copyright (C) 1984-2003, Award Software, Inc.</div>
            <br />
            <div style={{ color: '#fff' }}>Intel(R) Pentium(R) 4 / Multi-Boot Virtualizer 2.80GHz</div>
            <div>Memory Test : {memCount}K OK</div>
            <br />
            <div>Detecting Primary Partition 0 ... Microsoft Windows XP Professional SP3</div>
            <div>Detecting Multi-OS Images     ... Windows 10 • Mac OS • Linux • Debian 12 • CentOS</div>
            <div>Detecting Retro Vault         ... 3D Brick Maze • BonziBUDDY • 20 Classic PC Games</div>
            <div>Verifying Companion Package   ... TrillXP.apk (ai.trill.trillxp — V1+V2 OK)</div>
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
            <div>MULTI-OS BOOTLOADER</div>
          </div>
        </div>

        {/* Optional GRUB / Multi-Boot Quick OS Selector */}
        <div style={{ position: 'absolute', bottom: 26, left: 36, right: 36 }}>
          <div style={{ color: '#fde047', fontSize: 12.5, marginBottom: 6 }}>
            GRUB Multi-Boot Target: <b>{OS_METADATA[osType].name}</b> (click to boot a different OS, or wait for auto-boot):
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {ALL_OS.map((id) => (
              <button
                key={id}
                onClick={(e) => {
                  e.stopPropagation();
                  unlockAudio();
                  switchOperatingSystem(id, true);
                }}
                style={{
                  background: osType === id ? '#ffffff' : '#111827',
                  color: osType === id ? '#000000' : '#cbd5e1',
                  border: '1px solid #64748b',
                  padding: '3px 10px',
                  fontFamily: 'inherit',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {OS_METADATA[id].shortName}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (bootPhase === 'booting') {
    // 1. Windows 10 Boot Screen
    if (osType === 'win10') {
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
            gap: 48,
            zIndex: 99999,
            opacity: fadeInLogo ? 1 : 0,
            transition: 'opacity 0.4s ease',
          }}
        >
          <style>{`@keyframes win10Spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          <img src="/icons/os-win10.svg" alt="Windows 10" style={{ width: 96, height: 96 }} />
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              border: '3px solid rgba(255,255,255,0.18)',
              borderTopColor: '#ffffff',
              animation: 'win10Spin 0.95s linear infinite',
            }}
          />
        </div>
      );
    }

    // 2. Mac OS Apple Boot Screen
    if (osType === 'macos') {
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
            gap: 42,
            zIndex: 99999,
            opacity: fadeInLogo ? 1 : 0,
            transition: 'opacity 0.4s ease',
          }}
        >
          <style>{`@keyframes macBar { 0% { width: 8%; } 100% { width: 100%; } }`}</style>
          <div style={{ fontSize: 82, color: '#ffffff', lineHeight: 1 }}></div>
          <div style={{ width: 190, height: 6, borderRadius: 99, background: '#333', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: '#ffffff', animation: 'macBar 3.6s ease-out forwards' }} />
          </div>
        </div>
      );
    }

    // 3. Linux / Debian / CentOS Kernel & systemd Boot Screen
    if (osType === 'linux' || osType === 'debian' || osType === 'centos') {
      const meta = OS_METADATA[osType];
      return (
        <div
          onClick={unlockAudio}
          style={{
            position: 'fixed',
            inset: 0,
            background: '#000000',
            color: '#e2e8f0',
            fontFamily: '"Courier New", monospace',
            fontSize: 13.5,
            padding: '28px 36px',
            lineHeight: 1.6,
            zIndex: 99999,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <img src={meta.icon} alt="" style={{ width: 48, height: 48 }} />
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#fff' }}>Booting {meta.name}</div>
              <div style={{ color: '#94a3b8' }}>Linux version {meta.kernel} (gcc 12.2.0) #1 SMP PREEMPT_DYNAMIC</div>
            </div>
          </div>
          <div>[<span style={{ color: '#4ade80' }}>  OK  </span>] Mounted Persistent VFS Root Partition (/dev/nvme0n1p2).</div>
          <div>[<span style={{ color: '#4ade80' }}>  OK  </span>] Reached target Network &amp; Sound Subsystem (WebAudio DSP).</div>
          <div>[<span style={{ color: '#4ade80' }}>  OK  </span>] Initialized Retro Classics Layer (3D Maze, Oregon Trail, BonziBUDDY).</div>
          <div>[<span style={{ color: '#4ade80' }}>  OK  </span>] Started Graphical Display Manager ({osType === 'linux' ? 'LightDM' : 'GDM3'})...</div>
        </div>
      );
    }

    // 4. Default Authentic Microsoft Windows XP / TrillXP Boot Screen!
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

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 56 }}>
          <div style={{ marginLeft: 56, marginBottom: 4 }}>
            <WindowsXPFlagSVG size={98} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <span
              style={{
                color: '#ffffff',
                fontFamily: 'Tahoma, Arial, sans-serif',
                fontSize: 15,
                letterSpacing: 0.4,
                marginBottom: -6,
              }}
            >
              Microsoft<sup style={{ fontSize: 10 }}>®</sup> Windows<sup style={{ fontSize: 10 }}>®</sup>
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
                Trill
              </span>
              <span
                style={{
                  color: '#eb6525',
                  fontFamily: "'Franklin Gothic Medium', 'Trebuchet MS', Arial, sans-serif",
                  fontWeight: 800,
                  fontSize: 27,
                  marginLeft: 3,
                  marginTop: 3,
                }}
              >
                xp
              </span>
            </div>
            <span
              style={{
                color: '#cbd5e1',
                fontFamily: 'Tahoma, Arial, sans-serif',
                fontSize: 12,
                letterSpacing: 0.8,
                marginTop: 4,
              }}
            >
              Multi-OS Retro Time Machine &amp; Educator Museum
            </span>
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
          Copyright © Microsoft Corporation • TrillXP Multi-OS Edition
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

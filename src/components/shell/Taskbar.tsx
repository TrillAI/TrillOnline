import React, { useState, useEffect } from 'react';
import { useOS } from '../../context/OSContext';
import { useSound } from '../../context/SoundContext';
import { StartMenu } from './StartMenu';
import { MultiOSShellChrome } from './MultiOSShells';
import { WindowsXPFlagSVG } from '../apps/aol/AOLGraphics';

interface TaskbarProps {
  onShowModal: (mode: 'turnoff' | 'logoff') => void;
}

export const Taskbar: React.FC<TaskbarProps> = ({ onShowModal }) => {
  const {
    osType,
    windows,
    activeWindowId,
    focusWindow,
    minimizeWindow,
    openApp,
    aolConnected,
    unreadInboxCount,
    balloon,
    dismissBalloon,
    triggerBonziSwing,
  } = useOS();
  const { volume, muted, setVolume, setMuted, playSound } = useSound();

  const [startOpen, setStartOpen] = useState(false);
  const [volumeOpen, setVolumeOpen] = useState(false);
  const [clockText, setClockText] = useState('');
  const [modemBlink, setModemBlink] = useState(false);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setClockText(
        now.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        })
      );
    };
    updateClock();
    const iv = window.setInterval(updateClock, 15000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (!aolConnected) return;
    const iv = window.setInterval(() => setModemBlink((b) => !b), 700);
    return () => clearInterval(iv);
  }, [aolConnected]);

  useEffect(() => {
    const closeMenus = () => {
      setStartOpen(false);
      setVolumeOpen(false);
    };
    window.addEventListener('click', closeMenus);
    return () => window.removeEventListener('click', closeMenus);
  }, []);

  if (osType !== 'winxp') {
    return <MultiOSShellChrome onShowModal={onShowModal} />;
  }

  return (
    <>
      {startOpen && (
        <StartMenu
          onClose={() => setStartOpen(false)}
          onShowModal={(m) => onShowModal(m)}
        />
      )}

      {/* Volume Popup Slider */}
      {volumeOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="xp-bevel-raised"
          style={{
            position: 'fixed',
            right: 48,
            bottom: 32,
            width: 96,
            background: '#ece9d8',
            padding: '10px 8px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            zIndex: 10010,
            fontSize: 11,
          }}
        >
          <div style={{ fontWeight: 700 }}>Volume</div>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(volume * 100)}
            onChange={(e) => setVolume(Number(e.target.value) / 100)}
            onMouseUp={() => playSound('ding')}
            style={{ width: 76 }}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={muted}
              onChange={(e) => setMuted(e.target.checked)}
            />
            Mute
          </label>
        </div>
      )}

      {/* Yellow XP Balloon Notification */}
      {balloon && (
        <div
          className="xp-balloon"
          onClick={() => {
            if (balloon.onClickApp) openApp(balloon.onClickApp);
            dismissBalloon();
          }}
          style={{ cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
              {balloon.icon && <img src={balloon.icon} alt="" style={{ width: 16, height: 16 }} />}
              <span>{balloon.title}</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                dismissBalloon();
              }}
              style={{
                background: 'none',
                border: '1px solid #aaa',
                borderRadius: 2,
                width: 15,
                height: 15,
                fontSize: 10,
                lineHeight: 1,
                cursor: 'pointer',
                padding: 0,
              }}
            >
              ✕
            </button>
          </div>
          <div style={{ lineHeight: 1.35 }}>{balloon.message}</div>
        </div>
      )}

      {/* Main Taskbar */}
      <div
        className="xp-taskbar"
        onContextMenu={(e) => {
          e.preventDefault();
          openApp('taskmgr');
        }}
      >
        {/* Glossy Green Start Button */}
        <button
          className={`xp-start-btn ${startOpen ? 'active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            playSound('startClick');
            setStartOpen((v) => !v);
            setVolumeOpen(false);
          }}
        >
          <WindowsXPFlagSVG size={20} />
          <span>start</span>
        </button>

        {/* Classic XP Quick Launch Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '0 6px 0 2px',
            borderRight: '1px solid rgba(255,255,255,0.22)',
            marginRight: 2,
            flexShrink: 0,
          }}
        >
          <img
            src="/icons/trillxp.svg"
            alt="TrillXP Museum"
            title="TrillXP 2000s Time Capsule & Educator Museum (Alt+M)"
            onClick={() => openApp('trillxp-museum')}
            style={{ width: 17, height: 17, cursor: 'pointer' }}
          />
          <img
            src="/icons/android-apk.svg"
            alt="TrillXP.apk"
            title="Download Official TrillXP.apk for Android"
            onClick={() => openApp('apk-installer')}
            style={{ width: 17, height: 17, cursor: 'pointer' }}
          />
          <img
            src="/icons/896(16x16).png"
            alt="IE6"
            title="Launch Internet Explorer Browser"
            onClick={() => openApp('ie')}
            style={{ width: 17, height: 17, cursor: 'pointer' }}
          />
          <img
            src="/icons/arena-ai.svg"
            alt="Arena AI"
            title="Arena AI Agent — OS Copilot, Code, Images & Video (Alt+A)"
            onClick={() => openApp('arena-ai')}
            style={{ width: 17, height: 17, cursor: 'pointer' }}
          />
          <img
            src="/icons/slingo.svg"
            alt="Slingo"
            title="Launch Slingo Deluxe (Classic AOL Casino)"
            onClick={() => openApp('slingo')}
            style={{ width: 17, height: 17, cursor: 'pointer' }}
          />
          <img
            src="/icons/powershell.svg"
            alt="PowerShell"
            title="Windows PowerShell 1.0 (Alt+P)"
            onClick={() => openApp('powershell')}
            style={{ width: 17, height: 17, cursor: 'pointer' }}
          />
        </div>

        {/* Running Window Task Strip */}
        <div className="xp-task-list">
          {windows.map((w) => {
            const isActive = activeWindowId === w.id && !w.minimized;
            return (
              <div
                key={w.id}
                className={`xp-task-item ${isActive ? 'active' : ''}`}
                onClick={() => {
                  if (isActive) {
                    minimizeWindow(w.id);
                  } else {
                    focusWindow(w.id);
                  }
                }}
                title={w.title}
              >
                <img src={w.icon} alt="" style={{ width: 15, height: 15, flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{w.title}</span>
              </div>
            );
          })}
        </div>

        {/* System Tray / Notification Area */}
        <div className="xp-systray">
          {/* Unread Gmail Indicator */}
          {unreadInboxCount > 0 && (
            <img
              src="/icons/luna16/mail_unread.png"
              alt="You've Got Mail"
              title={`You've Got Mail! (${unreadInboxCount} unread in Gmail)`}
              onClick={() => openApp('aol-mailbox')}
              style={{ width: 16, height: 16, cursor: 'pointer' }}
            />
          )}

          {/* AOL Dial-Up Modem Tray Status */}
          <div
            onClick={() => openApp(aolConnected ? 'aol-desktop' : 'aol-dialer')}
            title={
              aolConnected
                ? 'America Online Connected\nSpeed: 56.0 Kbps (959-262-8674)'
                : 'Dial-Up Disconnected (Click to Dial AOL 9.0)'
            }
            style={{
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              opacity: aolConnected ? 1 : 0.55,
              filter: aolConnected && modemBlink ? 'brightness(1.35)' : 'none',
            }}
          >
            <img src="/icons/luna16/net_modem.png" alt="Modem" style={{ width: 16, height: 16 }} />
          </div>

          {/* Quick OS Switcher & BonziBUDDY Tray Icons */}
          <img
            src="/icons/os-switcher.svg"
            alt="Switch OS"
            title="Switch Operating System (Windows XP • Windows 10 • Mac OS • Linux • Debian • CentOS)"
            onClick={() => openApp('os-switcher')}
            style={{ width: 16, height: 16, cursor: 'pointer' }}
          />
          <img
            src="/icons/bonzi.svg"
            alt="BonziBUDDY"
            title="Summon BonziBUDDY (Swings in on a web, talks & sings!)"
            onClick={() => triggerBonziSwing('bonzi')}
            style={{ width: 16, height: 16, cursor: 'pointer' }}
          />

          {/* Arena AI OS Copilot Tray Icon */}
          <img
            src="/icons/arena-ai.svg"
            alt="Arena AI"
            title="Arena AI Agent Built-In (Tasks, Images & Video)"
            onClick={() => openApp('arena-ai')}
            style={{ width: 15, height: 15, cursor: 'pointer' }}
          />

          {/* Windows Update Yellow Shield */}
          <img
            src="/icons/luna16/secure_warn.png"
            alt="Windows Update"
            title="Microsoft Windows Update — Click to check for updates"
            onClick={() => openApp('windows-update')}
            style={{ width: 16, height: 16, cursor: 'pointer' }}
          />

          {/* Windows Security Shield */}
          <img
            src="/icons/luna16/secure_safe.png"
            alt="Security"
            title="Windows XP Security Center: Protected"
            onClick={() => openApp('control-panel', { section: 'security' })}
            style={{ width: 16, height: 16, cursor: 'pointer' }}
          />

          {/* Master Volume Speaker */}
          <img
            src={muted || volume === 0 ? '/icons/luna16/volume_off.png' : '/icons/690(16x16).png'}
            alt="Volume"
            title={muted ? 'Volume: Muted' : `Volume: ${Math.round(volume * 100)}%`}
            onClick={(e) => {
              e.stopPropagation();
              setVolumeOpen((v) => !v);
              setStartOpen(false);
            }}
            style={{ width: 16, height: 16, cursor: 'pointer' }}
          />

          {/* Clock */}
          <span
            onDoubleClick={() => openApp('control-panel', { section: 'datetime' })}
            title={new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
            style={{ marginLeft: 3, cursor: 'default', whiteSpace: 'nowrap' }}
          >
            {clockText}
          </span>
        </div>
      </div>
    </>
  );
};

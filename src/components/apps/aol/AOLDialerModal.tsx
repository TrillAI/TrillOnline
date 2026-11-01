import React, { useState, useEffect, useRef } from 'react';
import { useOS } from '../../../context/OSContext';
import { useSound } from '../../../context/SoundContext';
import {
  AOLClassicLogo,
  RunningManSVG,
  AOLPeopleTriangleSVG,
} from './AOLGraphics';

interface AOLDialerModalProps {
  windowId: string;
}

export const AOLDialerModal: React.FC<AOLDialerModalProps> = ({ windowId }) => {
  const {
    aolConnected,
    aolScreenName,
    setAolScreenName,
    connectAOL,
    disconnectAOL,
    closeWindow,
    openApp,
  } = useOS();
  const {
    playDialSequence,
    startModemHandshake,
    stopModemHandshake,
    unlockAudio,
  } = useSound();

  const [screenName, setScreenName] = useState(aolScreenName || 'xp.user@gmail.com');
  const [password, setPassword] = useState('********');
  const [phoneNum, setPhoneNum] = useState('959-262-8674');
  const [dialing, setDialing] = useState(false);
  const [stage, setStage] = useState<1 | 2 | 3>(1);
  const [statusText, setStatusText] = useState('Initializing V.90 56K modem...');

  const cleanupRef = useRef<(() => void) | null>(null);
  const timersRef = useRef<number[]>([]);

  const clearAllTimers = () => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    stopModemHandshake();
  };

  useEffect(() => {
    return () => clearAllTimers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startDialupProcess = () => {
    unlockAudio();
    clearAllTimers();
    setDialing(true);
    setStage(1);
    setStatusText(`Dialing ${phoneNum}...`);

    // Play real DTMF phone tones for 959-262-8674
    cleanupRef.current = playDialSequence(phoneNum);

    // Stage 2: Connecting + 56K Modem Handshake Screech (Panel 2 Running Man w/ Speed Lines)
    const t1 = window.setTimeout(() => {
      setStage(2);
      setStatusText('Connecting...');
      startModemHandshake();
    }, 2200);

    const t2 = window.setTimeout(() => {
      setStatusText('Negotiating V.90 56,000 bps protocol...');
    }, 4100);

    const t3 = window.setTimeout(() => {
      setStatusText('Checking screen name & Gmail bridge...');
    }, 5600);

    // Stage 3: Connected! Panel 3 AOL Triangle + People raising arms
    const t4 = window.setTimeout(() => {
      setStage(3);
      setStatusText('Connected to America Online at 56,000 bps!');
      stopModemHandshake();
    }, 6900);

    // Finish -> Open AOL Desktop 9.8.2 + Play "Welcome!" + "You've got mail!"
    const t5 = window.setTimeout(() => {
      connectAOL(screenName);
      closeWindow(windowId);
    }, 8300);

    timersRef.current = [t1, t2, t3, t4, t5];
  };

  const handleCancel = () => {
    clearAllTimers();
    setDialing(false);
    setStage(1);
  };

  const handleFastConnect = () => {
    clearAllTimers();
    connectAOL(screenName);
    closeWindow(windowId);
  };

  // EXACT 3-Panel Dial-Up Screen matching Images 1, 2, & 3!
  if (dialing) {
    return (
      <div
        style={{
          flex: 1,
          background: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          paddingBottom: 14,
        }}
      >
        {/* Classic Striped Sub-Header (Image 3) */}
        <div className="aol-dialer-titlebar">
          <span>Connecting To America Online...</span>
        </div>

        {/* Top AMERICA Online Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 6 }}>
          <AOLClassicLogo width={220} />
        </div>

        {/* 3 Framed Periwinkle Blue Panels (Exact match to Images 1, 2, & 3) */}
        <div className="aol-dialer-panels">
          {/* Panel 1: Running Man */}
          <div className="aol-dialer-panel-outer">
            <div className="aol-dialer-panel-inner">
              {stage >= 1 && <RunningManSVG size={62} />}
            </div>
          </div>

          {/* Panel 2: Running Man with Speed Lines */}
          <div className="aol-dialer-panel-outer">
            <div className="aol-dialer-panel-inner">
              {stage >= 2 && <RunningManSVG size={62} speedLines />}
            </div>
          </div>

          {/* Panel 3: AOL Triangle with Happy People */}
          <div className="aol-dialer-panel-outer">
            <div className="aol-dialer-panel-inner">
              {stage >= 3 && <AOLPeopleTriangleSVG size={74} />}
            </div>
          </div>
        </div>

        {/* Status Text + Black Rule + Blue Cancel Button */}
        <div style={{ textAlign: 'center', padding: '0 36px' }}>
          <div
            style={{
              fontSize: 12,
              color: '#333',
              marginBottom: 6,
              minHeight: 18,
              fontFamily: 'Tahoma, Arial, sans-serif',
            }}
          >
            {statusText}
          </div>
          <div style={{ height: 2, background: '#111', marginBottom: 12 }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
            <button className="aol-cancel-btn" onClick={handleCancel}>
              Cancel
            </button>
            <button
              onClick={handleFastConnect}
              style={{
                background: 'none',
                border: 'none',
                color: '#0055aa',
                textDecoration: 'underline',
                fontSize: 11,
                cursor: 'pointer',
              }}
            >
              Skip Modem Wait »
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Classic AOL 9.0 Sign On Screen
  return (
    <div
      style={{
        flex: 1,
        background: 'linear-gradient(180deg, #0b3a82 0%, #1c5ab5 45%, #e8f1fb 45.5%, #ffffff 100%)',
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      {/* Top Banner */}
      <div
        style={{
          background: '#fff',
          borderRadius: 6,
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 3px 10px rgba(0,0,0,0.3)',
        }}
      >
        <AOLClassicLogo width={185} />
        <div style={{ textAlign: 'right', fontSize: 11, color: '#0c357a' }}>
          <div style={{ fontWeight: 800 }}>Version 9.0 Optimized SE</div>
          <div style={{ color: '#16793b', fontWeight: 700 }}>✓ Gmail Mailbox Bridge Ready</div>
        </div>
      </div>

      {/* Sign On Form Card */}
      <div
        style={{
          background: '#f5f8fc',
          border: '2px solid #1b4f9c',
          borderRadius: 6,
          padding: '14px 18px',
          display: 'grid',
          gridTemplateColumns: '108px 1fr',
          gap: 16,
          alignItems: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
        }}
      >
        <div
          style={{
            background: '#cbd2ff',
            border: '2px solid #092c68',
            borderRadius: 4,
            height: 118,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
          }}
        >
          <RunningManSVG size={62} speedLines={aolConnected} />
          <span style={{ fontSize: 10, fontWeight: 700, color: '#092c68' }}>
            {aolConnected ? 'ONLINE (56K)' : '56K MODEM'}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 11 }}>
          <div>
            <label style={{ fontWeight: 700, color: '#0b2d6b', display: 'block', marginBottom: 2 }}>
              Select Screen Name / Gmail Address:
            </label>
            <input
              className="xp-input"
              style={{ width: '100%', fontWeight: 700 }}
              value={screenName}
              onChange={(e) => setScreenName(e.target.value)}
              placeholder="yourname@gmail.com"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <label style={{ fontWeight: 700, color: '#0b2d6b', display: 'block', marginBottom: 2 }}>
                Password:
              </label>
              <input
                type="password"
                className="xp-input"
                style={{ width: '100%' }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label style={{ fontWeight: 700, color: '#0b2d6b', display: 'block', marginBottom: 2 }}>
                Access Number (56K):
              </label>
              <input
                className="xp-input"
                style={{ width: '100%' }}
                value={phoneNum}
                onChange={(e) => setPhoneNum(e.target.value)}
              />
            </div>
          </div>

          <div style={{ fontSize: 10, color: '#475569' }}>
            Speaker Volume: High (Modem audio + &ldquo;You&apos;ve Got Mail!&rdquo; enabled)
          </div>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="xp-btn"
            onClick={() => openApp('aol-mailbox', { tab: 'connect' })}
          >
            ⚙️ Gmail Setup
          </button>
          {aolConnected && (
            <button className="xp-btn" onClick={disconnectAOL}>
              Sign Off Modem
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {aolConnected && (
            <button
              className="xp-btn"
              onClick={() => {
                openApp('aol-desktop');
                closeWindow(windowId);
              }}
            >
              Open AOL Desktop
            </button>
          )}
          <button
            onClick={startDialupProcess}
            style={{
              background: 'linear-gradient(180deg, #2b88d9 0%, #0b4f9c 100%)',
              color: '#fff',
              border: '2px solid #062b59',
              borderRadius: 5,
              padding: '6px 22px',
              fontWeight: 800,
              fontSize: 13,
              cursor: 'pointer',
              boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
            }}
          >
            ⚡ SIGN ON (Dial 56K)
          </button>
        </div>
      </div>
    </div>
  );
};

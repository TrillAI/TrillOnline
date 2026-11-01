import React, { useState } from 'react';
import { useOS } from '../../../context/OSContext';
import { useSound } from '../../../context/SoundContext';
import { RunningManSVG } from './AOLGraphics';

interface AIMBuddy {
  name: string;
  group: 'AIM Bots' | 'Buddies' | 'Family';
  online: boolean;
  away?: string;
}

const BUDDIES: AIMBuddy[] = [
  { name: 'SmarterChild', group: 'AIM Bots', online: true },
  { name: 'AOL System Msg', group: 'AIM Bots', online: true },
  { name: 'xXSk8erBoi2004Xx', group: 'Buddies', online: true },
  { name: 'Sarah_XP', group: 'Buddies', online: true, away: '~*In my room listening to Linkin Park, leave a msg*~' },
  { name: 'TomFromMySpace', group: 'Buddies', online: true },
  { name: 'CoolUncleBob99', group: 'Family', online: false },
];

function generateBuddyReply(buddy: string, text: string): string {
  const q = text.toLowerCase();
  if (buddy === 'SmarterChild') {
    if (q.includes('weather')) return '🌤️ Current 2004 Forecast: 72°F and sunny over the Bliss hills in Sonoma!';
    if (q.includes('joke')) return 'Why do Java programmers wear glasses? Because they don\'t C#! :-D';
    if (q.includes('time') || q.includes('date')) return `It is currently ${new Date().toLocaleTimeString()}! Type "trivia", "horoscope", or "joke" for more!`;
    if (q.includes('trivia')) return '🧠 Trivia: What year did Microsoft Windows XP launch? (Hint: October 25, 2001!)';
    if (q.includes('2001')) return '🎉 CORRECT!! Windows XP launched on October 25, 2001!';
    return `Hi there! I'm SmarterChild 🤖! Ask me for "weather", "joke", "trivia", or tell me what XP game you're playing!`;
  }
  if (buddy === 'AOL System Msg') {
    return 'Hello! Your Gmail mailbox is bridged smoothly under AOL Desktop 9.8.2. Have a great session!';
  }
  if (buddy === 'Sarah_XP') {
    return 'Auto-Response from Sarah_XP: ~*brb homework / burning a CD!! leave ur #*~ <3';
  }
  if (buddy === 'TomFromMySpace') {
    return 'Hey friend!! Thanks for keeping me in your Top 8!! :-)';
  }
  const sk8Replies = [
    'yo!! u playing 3D Pinball Space Cadet rn??',
    'brb mom needs to use the landline lol',
    'dude check out Winamp 2.91 in the Software Installer, it goes hard!!',
    'asl?? jk lol did u check ur AOL Gmail inbox?',
  ];
  return sk8Replies[Math.floor(Math.random() * sk8Replies.length)];
}

export const AIMMessenger: React.FC<{ dockedInAOL?: boolean }> = ({ dockedInAOL = false }) => {
  const { aolScreenName } = useOS();
  const { playSound } = useSound();

  const screenLabel = aolScreenName.split('@')[0] || 'Kirsle';
  const [signedOn, setSignedOn] = useState(dockedInAOL);
  const [snInput, setSnInput] = useState(screenLabel);
  const [activeBuddy, setActiveBuddy] = useState<string>('SmarterChild');
  const [warningLevel, setWarningLevel] = useState(0);
  const [awayMessage, setAwayMessage] = useState('');
  const [draft, setDraft] = useState('');
  const [chats, setChats] = useState<Record<string, Array<{ from: string; text: string; isMe: boolean }>>>({
    'AOL System Msg': [
      {
        from: 'AOL System Msg',
        text: 'Hello! Welcome to AOL Instant Messenger 5.9 on Windows XP. Click SmarterChild or any buddy to chat live!',
        isMe: false,
      },
    ],
    SmarterChild: [
      {
        from: 'SmarterChild',
        text: 'Hey! Welcome back to AIM! Type "joke", "weather", or "trivia" anytime :-)',
        isMe: false,
      },
    ],
  });

  const sendIM = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    const msgText = draft.trim();
    const target = activeBuddy;
    setDraft('');
    playSound('aimSend');
    setChats((prev) => ({
      ...prev,
      [target]: [...(prev[target] || []), { from: snInput, text: msgText, isMe: true }],
    }));

    window.setTimeout(() => {
      playSound('aimReceive');
      const reply = generateBuddyReply(target, msgText);
      setChats((prev) => ({
        ...prev,
        [target]: [...(prev[target] || []), { from: target, text: reply, isMe: false }],
      }));
    }, 850);
  };

  // Classic AIM 5.9 Sign-On Card (Exact match to Image 5 left window!)
  if (!signedOn && !dockedInAOL) {
    return (
      <div
        style={{
          flex: 1,
          background: '#ece9d8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
        }}
      >
        <div
          style={{
            width: 248,
            border: '2px solid #0054e3',
            borderRadius: 6,
            background: '#ece9d8',
            padding: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.28)',
          }}
        >
          <div className="aim-hero-banner">
            <RunningManSVG size={68} />
            <div style={{ fontWeight: 700, fontSize: 13, marginTop: 4 }}>AOL Instant Messenger™</div>
          </div>

          <div className="aim-signon-card">
            <label style={{ fontWeight: 700, fontStyle: 'italic', color: '#0c2d6b' }}>
              ScreenName 🔑
            </label>
            <input
              className="xp-input"
              value={snInput}
              onChange={(e) => setSnInput(e.target.value)}
            />
            <span style={{ color: '#0038a8', textDecoration: 'underline', fontSize: 10 }}>
              Get a Screen Name
            </span>

            <label style={{ fontWeight: 700, marginTop: 4 }}>Password</label>
            <input
              type="password"
              className="xp-input"
              defaultValue="savedpass"
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <input type="checkbox" defaultChecked /> Save password
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <input type="checkbox" /> Auto-login
              </label>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 8,
                paddingTop: 6,
                borderTop: '1px solid #ccc',
              }}
            >
              <span style={{ fontSize: 10, color: '#555' }}>Version: 5.9.3861</span>
              <button
                className="xp-btn xp-btn-primary"
                onClick={() => {
                  playSound('aimDoorOpen');
                  setSignedOn(true);
                }}
              >
                🏃 Sign On
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Docked narrow Buddy List (for right side of AOL Desktop 9.8.2 — Image 4!)
  if (dockedInAOL) {
    return (
      <div
        className="aol-subwindow"
        style={{ width: 205, flexShrink: 0, display: 'flex', flexDirection: 'column' }}
      >
        <div className="aol-subwindow-title">
          <span>🏃 AIM Buddy List®</span>
        </div>
        <div style={{ padding: 6, background: '#eef5fc', borderBottom: '1px solid #b5cde6', fontSize: 11 }}>
          <select className="xp-select" style={{ width: '100%' }} defaultValue="online">
            <option value="online">Show Everyone (5/6)</option>
            <option value="away">{awayMessage ? 'Away Message On' : 'Available'}</option>
          </select>
        </div>
        <div style={{ flex: 1, background: '#fff', padding: 6, overflowY: 'auto', fontSize: 11 }}>
          {(['AIM Bots', 'Buddies', 'Family'] as const).map((grp) => {
            const list = BUDDIES.filter((b) => b.group === grp);
            return (
              <div key={grp} style={{ marginBottom: 6 }}>
                <div style={{ fontWeight: 700, color: '#0d366f' }}>
                  ⊟ {grp} ({list.filter((x) => x.online).length}/{list.length})
                </div>
                {list.map((b) => (
                  <div
                    key={b.name}
                    onClick={() => {
                      if (b.online) {
                        playSound('aimRing');
                        setActiveBuddy(b.name);
                      }
                    }}
                    style={{
                      padding: '2px 4px 2px 14px',
                      cursor: b.online ? 'pointer' : 'default',
                      color: b.online ? '#111' : '#999',
                      background: activeBuddy === b.name ? '#dbeafe' : 'transparent',
                      borderRadius: 2,
                    }}
                  >
                    {b.online ? '🟢' : '⚪'} {b.name}
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Mini Quick IM Drawer */}
        <form
          onSubmit={sendIM}
          style={{
            borderTop: '2px solid #7ea4cf',
            background: '#dcebfa',
            padding: 6,
            fontSize: 10,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <div style={{ fontWeight: 700, color: '#0d366f' }}>IM with {activeBuddy}:</div>
          <div
            style={{
              height: 82,
              background: '#fff',
              border: '1px solid #96b8df',
              padding: 4,
              overflowY: 'auto',
              fontSize: 10,
            }}
          >
            {(chats[activeBuddy] || []).map((m, idx) => (
              <div key={idx} style={{ marginBottom: 3 }}>
                <b style={{ color: m.isMe ? '#dc2626' : '#1d4ed8' }}>{m.from}:</b> {m.text}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 3 }}>
            <input
              className="xp-input"
              style={{ flex: 1, fontSize: 10 }}
              placeholder="Send IM..."
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            <button type="submit" className="aol-pill-btn" style={{ padding: '2px 6px', fontSize: 10 }}>
              Send
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Full Standalone AIM Buddy List + Classic Instant Message Window (Exact match to Image 5!)
  return (
    <div
      style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '190px 1fr',
        background: '#ece9d8',
        minHeight: 0,
      }}
    >
      {/* Left: Buddy List */}
      <div
        style={{
          borderRight: '2px solid #aca899',
          display: 'flex',
          flexDirection: 'column',
          background: '#fff',
        }}
      >
        <div
          style={{
            background: '#0058a8',
            color: '#fff',
            padding: '6px 8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          <span>🏃 {snInput}&apos;s Buddies</span>
          <button
            onClick={() => {
              playSound('aimDoorSlam');
              setSignedOn(false);
            }}
            style={{
              fontSize: 9,
              background: '#e2e8f0',
              border: 'none',
              borderRadius: 2,
              padding: '1px 5px',
              cursor: 'pointer',
            }}
          >
            Sign Off
          </button>
        </div>
        <div style={{ flex: 1, padding: 6, overflowY: 'auto', fontSize: 11 }}>
          {(['AIM Bots', 'Buddies', 'Family'] as const).map((grp) => (
            <div key={grp} style={{ marginBottom: 8 }}>
              <div style={{ fontWeight: 700 }}>⊟ {grp}</div>
              {BUDDIES.filter((b) => b.group === grp).map((b) => (
                <div
                  key={b.name}
                  onClick={() => b.online && setActiveBuddy(b.name)}
                  style={{
                    padding: '3px 6px 3px 14px',
                    cursor: b.online ? 'pointer' : 'default',
                    color: b.online ? '#000' : '#999',
                    background: activeBuddy === b.name ? '#316ac5' : 'transparent',
                    ...(activeBuddy === b.name ? { color: '#fff', fontWeight: 700 } : {}),
                  }}
                >
                  {b.online ? '🏃' : '💤'} {b.name}
                </div>
              ))}
            </div>
          ))}
        </div>
        <div style={{ padding: 6, background: '#ece9d8', borderTop: '1px solid #ccc', fontSize: 10 }}>
          <input
            className="xp-input"
            style={{ width: '100%' }}
            placeholder="Set Away Message..."
            value={awayMessage}
            onChange={(e) => setAwayMessage(e.target.value)}
          />
        </div>
      </div>

      {/* Right: Classic AIM Instant Message Window (Image 5 right window!) */}
      <form onSubmit={sendIM} style={{ display: 'flex', flexDirection: 'column', padding: 8, gap: 6, minHeight: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
          <span>
            Chatting with <b>{activeBuddy}</b>
          </span>
          <span>
            {activeBuddy}&apos;s Warning Level: <b>{warningLevel}%</b>
          </span>
        </div>

        {/* Transcript Box */}
        <div
          className="xp-bevel-sunken"
          style={{
            flex: 1,
            background: '#fff',
            padding: 8,
            overflowY: 'auto',
            fontFamily: "'Times New Roman', Georgia, serif",
            fontSize: 14,
            lineHeight: 1.4,
          }}
        >
          {(chats[activeBuddy] || []).map((m, idx) => (
            <div key={idx} style={{ marginBottom: 5 }}>
              <b style={{ color: m.isMe ? '#cc0000' : '#0000cc' }}>{m.from}: </b>
              <span>{m.text}</span>
            </div>
          ))}
        </div>

        {/* Classic AIM Formatting Strip */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: '#ece9d8',
            border: '1px solid #aca899',
            padding: '2px 8px',
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          <span style={{ color: '#0038a8' }}>A</span>
          <span style={{ background: '#0038a8', color: '#fff', padding: '0 3px' }}>A</span>
          <b>B</b>
          <i>I</i>
          <u>u</u>
          <span style={{ color: '#0038a8', textDecoration: 'underline' }}>link</span>
          <span style={{ cursor: 'pointer' }} onClick={() => setDraft((d) => d + ' :-) ')}>
            😊
          </span>
          <span style={{ cursor: 'pointer' }} onClick={() => setDraft((d) => d + ' :-O ')}>
            😮
          </span>
          <span style={{ cursor: 'pointer' }} onClick={() => setDraft((d) => d + ' B-) ')}>
            😎
          </span>
        </div>

        {/* Message Input */}
        <textarea
          className="xp-textarea"
          style={{ height: 64, resize: 'none', fontFamily: "'Times New Roman', serif", fontSize: 14 }}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendIM(e);
            }
          }}
          placeholder={`Message ${activeBuddy}...`}
        />

        {/* Bottom AIM Action Buttons (Warn, Block, Expressions, Send) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              className="xp-btn"
              onClick={() => {
                playSound('exclamation');
                setWarningLevel((w) => Math.min(100, w + 10));
              }}
            >
              ⚡ Warn
            </button>
            <button
              type="button"
              className="xp-btn"
              onClick={() => playSound('aimRing')}
            >
              🔔 Ring Buddy
            </button>
          </div>
          <button type="submit" className="xp-btn xp-btn-primary" style={{ fontWeight: 700, padding: '4px 18px' }}>
            📨 Send
          </button>
        </div>
      </form>
    </div>
  );
};

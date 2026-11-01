import React, { useState, useRef, useEffect } from 'react';
import { useOS, BuiltinAppId, XPTheme } from '../../../context/OSContext';
import { useSound } from '../../../context/SoundContext';
import { WindowsXPFlagSVG } from '../aol/AOLGraphics';

/* ============================================================================
   1. TRILLXP TIME CAPSULE & 2000s DIGITAL MUSEUM (trillxp-museum)
   Purpose: Let veterans relive the early-2000s PC era — and educate anyone
   who missed Dial-Up, AOL CDs, Windows XP, AIM, Classic PC Games & Shells!
   ============================================================================ */
interface MuseumExhibit {
  id: string;
  year: string;
  icon: string;
  title: string;
  headline: string;
  story: string;
  thenVsNow: { then: string; now: string };
  didYouKnow: string;
  tryAppId: BuiltinAppId;
  tryLabel: string;
}

const EXHIBITS: MuseumExhibit[] = [
  {
    id: 'xp-2001',
    year: 'Oct 25, 2001',
    icon: '/icons/windows.png',
    title: 'Windows XP & The "Bliss" Hill',
    headline: 'When family computers gained the green Start button and blue Luna taskbar',
    story:
      'Released in October 2001, Windows XP unified Microsoft’s consumer (Windows 95/98/ME) and business (Windows NT/2000) kernels. Its default "Bliss" wallpaper—an unedited 1996 medium-format photograph of a Sonoma County, California hill by Charles O’Rear—became the most-viewed photograph in human history.',
    thenVsNow: {
      then: '512 MB RAM, 80 GB spinning IDE hard drive, local folders in My Documents — zero cloud sync.',
      now: '16–64 GB RAM, NVMe SSDs, instant cloud sync across phones & laptops.',
    },
    didYouKnow:
      'Ambient composer Brian Eno composed the iconic Windows XP startup sound on a Mac despite Microsoft asking for a piece "3.25 seconds long that felt optimistic, futuristic, and emotional."',
    tryAppId: 'control-panel',
    tryLabel: 'Try Luna, Royale & Zune Themes',
  },
  {
    id: 'dialup-aol',
    year: '1997–2004',
    icon: '/icons/luna32/net_modem.png',
    title: '56K Dial-Up & AOL Free Trial CDs',
    headline: 'You literally heard two computers screaming math at each other over the phone line',
    story:
      'Before broadband Wi-Fi, getting online meant dialing a local phone number through a 56K V.90 modem. That famous 15-second screech was your PC negotiating modulation frequencies over copper telephone wires. If someone in your house picked up the kitchen landline, your connection instantly died!',
    thenVsNow: {
      then: '56 Kbps (~5 KB/sec): downloading one 4 MB MP3 song took ~12–15 minutes and tied up the house phone.',
      now: '500 Mbps–1 Gbps fiber/5G: 4 MB arrives in ~0.04 seconds on always-on Wi-Fi.',
    },
    didYouKnow:
      'At one point around 2000, roughly HALF of all CDs manufactured worldwide had an America Online (AOL) logo on them, and voice actor Elwood Edwards recorded "Welcome! You’ve got mail!" in his living room on a cassette deck for $200.',
    tryAppId: 'aol-dialer',
    tryLabel: 'Dial Into AOL 9.0 (Hear 56K Handshake!)',
  },
  {
    id: 'slingo-era',
    year: '1998–2005',
    icon: '/icons/slingo.svg',
    title: 'AOL Keyword: SLINGO & The Devil Laugh',
    headline: 'How a New Jersey businessman’s Slots + Bingo mashup took over AOL Game Parlor',
    story:
      'Created by Sal Falciglia Sr. in 1994 and launched on America Online in 1996, Slingo combined a 5×5 Bingo card with 5 slot reels underneath. Millions of families competed for 20-spin Full Cards in AOL chat rooms while praying the cackling Slingo Devil wouldn’t slice their score in half!',
    thenVsNow: {
      then: '20 strategic spins alongside live chatters in AOL Game Parlor rooms.',
      now: 'Preserved right here in TrillXP with the real Devil laugh, Winged Cherub rescue, and Deluxe powerups!',
    },
    didYouKnow:
      'On Spins 17–20 in classic Slingo, every spin cost points out of your own score unless you saved up golden Free Spin tokens earlier in the round!',
    tryAppId: 'slingo',
    tryLabel: 'Play Classic AOL Slingo Deluxe',
  },
  {
    id: 'aim-chat',
    year: '1997–2006',
    icon: '/icons/msn.png',
    title: 'AIM Buddy Lists & Cryptic Away Messages',
    headline: 'Before texting or DMs, social life lived in a narrow yellow Buddy List window',
    story:
      'After school, teenagers rushed to the family desktop PC to sign into AOL Instant Messenger (AIM 5.9). Hearing the creaking door-open sound meant your crush just signed on; the door-slam meant someone logged off. Crafting poetic song-lyric Away Messages was an art form.',
    thenVsNow: {
      then: 'You had to sit physically at the desk — "BRB, dinner" Away Messages told friends where you went.',
      now: 'Smartphones keep messaging in everyone’s pocket 24/7.',
    },
    didYouKnow:
      'AIM let you customize fonts and colors per buddy and packed playful "Buddy Icons" in tiny 48×48 GIF/BMP squares.',
    tryAppId: 'aim',
    tryLabel: 'Open AIM 5.9 Buddy List',
  },
  {
    id: 'classic-games',
    year: '1990–2004',
    icon: '/icons/pinball.png',
    title: 'Built-In PC Classics: Solitaire to Space Cadet',
    headline: 'Games secretly designed to teach mouse skills — and legends like SkiFree & JezzBall',
    story:
      'Microsoft originally bundled Solitaire (1990) to secretly teach people how to smoothly click-and-drag a mouse, and Minesweeper (1992) to train left-click vs right-click precision! Meanwhile, Space Cadet 3D Pinball, Spider Solitaire, SkiFree (with its inescapable Yeti!), and JezzBall defined rainy afternoons.',
    thenVsNow: {
      then: 'Zero microtransactions, zero internet required, 100% instant fun right in Start → All Programs → Games.',
      now: 'All 12 classic games preserved in TrillXP with zero-lag 60fps card dragging and touch support!',
    },
    didYouKnow:
      'In SkiFree, pressing the "F" key activates fast turbo skiing — the ONLY way to actually outrun the Abominable Snow Monster past 2,000 meters!',
    tryAppId: 'skifree',
    tryLabel: 'Play SkiFree (Outrun the Yeti!)',
  },
  {
    id: 'shells-shareware',
    year: '1981 → 2006',
    icon: '/icons/powershell.svg',
    title: 'From MS-DOS CMD to Monad (PowerShell 1.0)',
    headline: 'How Windows evolved from 1980s text batch scripts to structured object pipelines',
    story:
      'Windows XP shipped with cmd.exe (inheriting DIR, CD, and CLS from 1981 MS-DOS) and in 2006 received KB926139: Windows PowerShell 1.0 (codenamed "Monad"), introducing Verb-Noun cmdlets like Get-Process and object pipelines in its signature royal-blue console.',
    thenVsNow: {
      then: 'Installing software meant downloading standalone .EXE Setup Wizards (like Winamp 2.91 or WinRAR’s famous 40-day trial that politely never locked you out!).',
      now: 'Both cmd.exe, PowerShell 1.0, .EXE Setup Wizards, AND a real Android TrillXP.apk are built right in!',
    },
    didYouKnow:
      'Winamp’s 1997 intro track ("Winamp, it really whips the llama’s ass!") was inspired by comedic eccentric musician Wesley Willis.',
    tryAppId: 'powershell',
    tryLabel: 'Open Windows PowerShell 1.0',
  },
];

const SCAVENGER_QUESTS: Array<{ id: string; label: string; appId: BuiltinAppId }> = [
  { id: 'q1', label: 'Dial into AOL 9.0 and hear "Welcome! You’ve got mail!"', appId: 'aol-dialer' },
  { id: 'q2', label: 'Spin the reels in Classic Slingo & hear the Devil laugh', appId: 'slingo' },
  { id: 'q3', label: 'Drag a stack of cards live in Solitaire or Spider Solitaire', appId: 'solitaire' },
  { id: 'q4', label: 'Ski past 2,000m in SkiFree and meet the Abominable Yeti', appId: 'skifree' },
  { id: 'q5', label: 'Run Get-Process or Get-ComputerInfo inside PowerShell 1.0', appId: 'powershell' },
  { id: 'q6', label: 'Install Winamp 2.91 or WinRAR via the .EXE Setup Wizard', appId: 'software-center' },
  { id: 'q7', label: 'Download the signed TrillXP.apk Android package', appId: 'apk-installer' },
];

export const TrillXPMuseumApp: React.FC = () => {
  const { openApp } = useOS();
  const { playSound, startModemHandshake, stopModemHandshake } = useSound();

  const [activeTab, setActiveTab] = useState<'exhibits' | 'soundboard' | 'quests'>('exhibits');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [completedQuests, setCompletedQuests] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('trillxp_quests') || '[]');
    } catch {
      return [];
    }
  });

  const toggleQuest = (id: string) => {
    setCompletedQuests((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      localStorage.setItem('trillxp_quests', JSON.stringify(next));
      return next;
    });
  };

  const ex = EXHIBITS[selectedIdx];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#ece9d8', minHeight: 0, fontSize: 11 }}>
      {/* Royal Blue TrillXP Museum Hero Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #00309c 0%, #245edb 58%, #3b82f6 100%)',
          color: '#fff',
          padding: '12px 16px',
          borderBottom: '3px solid #f59432',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <WindowsXPFlagSVG size={44} />
          <div>
            <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: -0.3 }}>
              Trill<span style={{ color: '#fde047' }}>XP</span> — Interactive 2000s Time Capsule &amp; Educator Guide
            </div>
            <div style={{ fontSize: 11, color: '#dbeafe' }}>
              Go back and relive the early-2000s PC era — or teach anyone who missed Dial-Up, AOL, AIM &amp; Windows XP!
            </div>
          </div>
        </div>

        <button
          className="xp-btn xp-btn-primary"
          style={{ color: '#000', fontWeight: 700 }}
          onClick={() => openApp('apk-installer')}
        >
          📱 Get TrillXP.apk for Android
        </button>
      </div>

      {/* Navigation Tabs */}
      <div style={{ padding: '8px 10px 0 10px', background: '#ece9d8' }}>
        <div className="xp-tabs">
          <div className={`xp-tab ${activeTab === 'exhibits' ? 'active' : ''}`} onClick={() => setActiveTab('exhibits')}>
            🏛️ Interactive Era Exhibits ({EXHIBITS.length})
          </div>
          <div
            className={`xp-tab ${activeTab === 'soundboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('soundboard')}
          >
            🔊 Iconic 2000s Sound Museum
          </div>
          <div className={`xp-tab ${activeTab === 'quests' ? 'active' : ''}`} onClick={() => setActiveTab('quests')}>
            🎓 Time-Traveler Checklist ({completedQuests.length}/{SCAVENGER_QUESTS.length})
          </div>
        </div>
      </div>

      {/* Tab Body */}
      <div style={{ flex: 1, padding: '0 10px 10px 10px', display: 'flex', minHeight: 0 }}>
        <div className="xp-tab-panel" style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
          {activeTab === 'exhibits' && (
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '215px 1fr', gap: 12, minHeight: 0 }}>
              {/* Left Timeline Selector */}
              <div
                className="xp-bevel-sunken"
                style={{ background: '#fff', overflowY: 'auto', padding: 4 }}
              >
                {EXHIBITS.map((item, idx) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedIdx(idx)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '7px 8px',
                      borderRadius: 4,
                      cursor: 'pointer',
                      background: idx === selectedIdx ? '#316ac5' : 'transparent',
                      color: idx === selectedIdx ? '#fff' : '#000',
                      marginBottom: 2,
                    }}
                  >
                    <img src={item.icon} alt="" style={{ width: 22, height: 22, flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 9, opacity: 0.8 }}>{item.year}</div>
                      <div style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.title}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Right Exhibit Story + Then-vs-Now + Launch Button */}
              <div style={{ overflowY: 'auto', paddingRight: 4, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <img src={ex.icon} alt="" style={{ width: 36, height: 36 }} />
                  <div>
                    <span
                      style={{
                        background: '#dbeafe',
                        color: '#1e40af',
                        fontWeight: 800,
                        padding: '1px 6px',
                        borderRadius: 3,
                        fontSize: 10,
                      }}
                    >
                      ERA ARTIFACT • {ex.year}
                    </span>
                    <h3 style={{ margin: '3px 0 0 0', fontSize: 16, color: '#003399' }}>{ex.title}</h3>
                  </div>
                </div>

                <div style={{ fontWeight: 700, fontSize: 12, color: '#334155' }}>{ex.headline}</div>
                <div style={{ lineHeight: 1.55, fontSize: 12, color: '#111827' }}>{ex.story}</div>

                {/* Then vs Now Educational Comparison */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div
                    style={{
                      background: '#fffbeb',
                      border: '1px solid #f59e0b',
                      borderRadius: 6,
                      padding: 9,
                    }}
                  >
                    <div style={{ fontWeight: 800, color: '#92400e', marginBottom: 4 }}>🕰️ BACK IN 2001–2004</div>
                    <div style={{ lineHeight: 1.4 }}>{ex.thenVsNow.then}</div>
                  </div>
                  <div
                    style={{
                      background: '#f0fdf4',
                      border: '1px solid #22c55e',
                      borderRadius: 6,
                      padding: 9,
                    }}
                  >
                    <div style={{ fontWeight: 800, color: '#166534', marginBottom: 4 }}>🚀 TODAY / IN TRILLXP</div>
                    <div style={{ lineHeight: 1.4 }}>{ex.thenVsNow.now}</div>
                  </div>
                </div>

                <div
                  style={{
                    background: '#eff6ff',
                    borderLeft: '4px solid #2563eb',
                    padding: '8px 10px',
                    borderRadius: 4,
                    lineHeight: 1.45,
                  }}
                >
                  <b>💡 Historian Fact:</b> {ex.didYouKnow}
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 4 }}>
                  <button
                    className="xp-btn xp-btn-primary"
                    style={{ padding: '6px 14px', fontWeight: 700 }}
                    onClick={() => openApp(ex.tryAppId)}
                  >
                    ▶ {ex.tryLabel}
                  </button>
                  <button
                    className="xp-btn"
                    onClick={() => setSelectedIdx((selectedIdx + 1) % EXHIBITS.length)}
                  >
                    Next Exhibit →
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'soundboard' && (
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 12 }}>
                Every person who grew up around a family PC between 1998 and 2006 has these sounds permanently etched into memory. Click any artifact below to hear it and learn what it meant:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  {
                    title: '🎹 Windows XP Startup (Brian Eno, 2001)',
                    desc: 'Played through Beige Altec Lansing desk speakers as the green Bliss hill appeared.',
                    play: () => playSound('startup'),
                  },
                  {
                    title: '📞 56K V.90 Modem Handshake Screech',
                    desc: 'Analog audio tones negotiating baud rate & error correction over copper phone wire.',
                    play: () => {
                      startModemHandshake();
                      window.setTimeout(() => stopModemHandshake(), 5500);
                    },
                  },
                  {
                    title: '📬 America Online — "You’ve Got Mail!"',
                    desc: 'Recorded by Elwood Edwards in 1989; greeted 30+ million AOL households daily.',
                    play: () => playSound('youveGotMail'),
                  },
                  {
                    title: '😈 Classic AOL Slingo — The Devil Laugh!',
                    desc: 'The dreaded villain laugh right before your Slingo score got sliced in half!',
                    play: () => playSound('devilLaugh'),
                  },
                  {
                    title: '👼 Slingo Winged Cherub Harp & Arrow',
                    desc: 'Pure relief when the Cherub shot the Devil and saved your Full Card run!',
                    play: () => playSound('cherubHarp'),
                  },
                  {
                    title: '🚪 AIM Buddy Door Open & Ring',
                    desc: 'Signaled your best friend just logged onto AOL Instant Messenger after school.',
                    play: () => playSound('aimRing'),
                  },
                  {
                    title: '🛑 Windows XP Critical Stop Chord',
                    desc: 'The unmistakable orchestral thud when an XP error dialog popped up!',
                    play: () => playSound('critical'),
                  },
                  {
                    title: '🌙 Windows XP Shutdown Chord',
                    desc: 'Time to turn off the CRT monitor and go to sleep.',
                    play: () => playSound('shutdown'),
                  },
                ].map((snd) => (
                  <div
                    key={snd.title}
                    style={{
                      background: '#fff',
                      border: '1px solid #cbd5e1',
                      borderRadius: 6,
                      padding: 10,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: 6,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: '#003399' }}>{snd.title}</div>
                      <div style={{ color: '#475569', marginTop: 2 }}>{snd.desc}</div>
                    </div>
                    <button className="xp-btn" style={{ alignSelf: 'flex-start' }} onClick={snd.play}>
                      🔊 Play Artifact Audio
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'quests' && (
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 12, marginBottom: 4 }}>
                <b>Hands-On 2000s PC Field Trip:</b> Check off each classic experience below or click{' '}
                <b>Launch ▶</b> to try it live inside TrillXP!
              </div>
              {SCAVENGER_QUESTS.map((q) => {
                const done = completedQuests.includes(q.id);
                return (
                  <div
                    key={q.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: done ? '#f0fdf4' : '#fff',
                      border: done ? '1px solid #22c55e' : '1px solid #cbd5e1',
                      borderRadius: 6,
                      padding: '8px 10px',
                      gap: 10,
                    }}
                  >
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flex: 1 }}>
                      <input type="checkbox" checked={done} onChange={() => toggleQuest(q.id)} />
                      <span style={{ fontWeight: 600, textDecoration: done ? 'line-through' : 'none' }}>
                        {q.label}
                      </span>
                    </label>
                    <button
                      className="xp-btn xp-btn-primary"
                      onClick={() => {
                        if (!done) toggleQuest(q.id);
                        openApp(q.appId);
                      }}
                    >
                      Launch ▶
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
   2. TRILLXP ANDROID APK DOWNLOADER & MOBILE CENTER (apk-installer)
   Provides the real cryptographically signed `/downloads/TrillXP.apk`!
   ============================================================================ */
export const TrillXPApkApp: React.FC = () => {
  const { playSound } = useSound();
  const [downloaded, setDownloaded] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);
  const isNativeAndroidApp =
    typeof window !== 'undefined' && window.location.hostname === 'trillxp.local';

  const handleDownloadApk = () => {
    playSound('hardwareInsert');
    setDownloaded(true);
    if (isNativeAndroidApp) return;
    const link = document.createElement('a');
    link.href = '/downloads/TrillXP.apk';
    link.download = 'TrillXP.apk';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#ece9d8', minHeight: 0, fontSize: 11, overflowY: 'auto' }}>
      {/* Top Green/Blue Android + XP Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #064e3b 0%, #15803d 55%, #1d4ed8 100%)',
          color: '#fff',
          padding: '14px 18px',
          borderBottom: '3px solid #fde047',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/icons/android-apk.svg" alt="TrillXP APK" style={{ width: 46, height: 46 }} />
          <div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>TrillXP for Android — Official Signed APK (v1.1.0)</div>
            <div style={{ color: '#dcfce7', fontSize: 11 }}>
              Full Self-Contained Offline Windows XP OS • Package: <b>ai.trill.trillxp</b> (v1.1.0)
            </div>
          </div>
        </div>

        <button
          onClick={handleDownloadApk}
          style={{
            padding: '10px 18px',
            borderRadius: 6,
            border: '2px solid #fde047',
            background: 'linear-gradient(180deg, #4ade80 0%, #16a34a 100%)',
            color: '#052e16',
            fontWeight: 900,
            fontSize: 13,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.35)',
          }}
        >
          ⬇ Download TrillXP.apk
        </button>
      </div>

      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {isNativeAndroidApp && (
          <div
            style={{
              background: '#dcfce7',
              border: '2px solid #16a34a',
              borderRadius: 6,
              padding: '10px 12px',
              color: '#14532d',
              fontWeight: 800,
            }}
          >
            ✅ You are currently running natively inside the official TrillXP Android App (<b>ai.trill.trillxp</b> v1.1.0)!
          </div>
        )}
        {downloaded && !isNativeAndroidApp && (
          <div
            style={{
              background: '#dcfce7',
              border: '1px solid #16a34a',
              borderRadius: 6,
              padding: '8px 12px',
              color: '#14532d',
              fontWeight: 700,
            }}
          >
            ✅ Download started: <b>TrillXP.apk</b>! On Android, tap the downloaded file in Notifications or Files to install TrillXP.
          </div>
        )}

        {/* Package Technical & Cryptographic Verification Card */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #94a3b8',
            borderRadius: 6,
            padding: 12,
          }}
        >
          <div style={{ fontWeight: 800, fontSize: 12, color: '#003399', marginBottom: 8 }}>
            📦 Verified Android Package Manifest &amp; Signature Details
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', rowGap: 5, fontSize: 11 }}>
            <b>File URL:</b>
            <span>
              <a href="/downloads/TrillXP.apk" download="TrillXP.apk" style={{ color: '#1d4ed8', fontWeight: 700 }}>
                /downloads/TrillXP.apk
              </a>{' '}
              (Direct binary download)
            </span>
            <b>Application ID:</b>
            <span style={{ fontFamily: 'monospace' }}>ai.trill.trillxp</span>
            <b>Main Activity:</b>
            <span style={{ fontFamily: 'monospace' }}>ai.trill.trillxp.MainActivity (Fullscreen Hardware WebView)</span>
            <b>Android SDK Support:</b>
            <span>Min SDK 21 (Android 5.0 Lollipop) → Target SDK 33 (Android 13/14+)</span>
            <b>Signing Schemes:</b>
            <span style={{ color: '#15803d', fontWeight: 700 }}>
              ✓ APK Signature Scheme v2 (0x7109871a) + ✓ JAR v1 (RSA-2048 SHA-256)
            </span>
            <b>4-Byte Zipalign:</b>
            <span>✓ Aligned (`resources.arsc` &amp; `ic_launcher.png` stored uncompressed on 4B boundary)</span>
          </div>
        </div>

        {/* Two Ways to Install on Mobile */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: 6, padding: 10 }}>
            <div style={{ fontWeight: 800, color: '#15803d', marginBottom: 6 }}>
              🤖 Option 1: Install Native TrillXP.apk (Android)
            </div>
            <ol style={{ margin: 0, paddingLeft: 18, lineHeight: 1.5 }}>
              <li>
                Click <b>Download TrillXP.apk</b> above (or visit <code>/downloads/TrillXP.apk</code> on your phone).
              </li>
              <li>
                Open the downloaded <b>TrillXP.apk</b> on your Android phone or tablet (if upgrading from v1.0.0, uninstall the old app first, then tap <b>Install</b>).
              </li>
              <li>If prompted, allow <i>Install from this browser</i> and tap <b>Install</b>.</li>
              <li>
                Or install over USB ADB:{' '}
                <code style={{ background: '#f1f5f9', padding: '1px 4px' }}>adb install TrillXP.apk</code>{' '}
                <button
                  className="xp-btn"
                  style={{ padding: '0 6px', fontSize: 10 }}
                  onClick={() => {
                    navigator.clipboard?.writeText('adb install TrillXP.apk');
                    setCopiedCmd(true);
                  }}
                >
                  {copiedCmd ? 'Copied!' : 'Copy'}
                </button>
              </li>
            </ol>
          </div>

          <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: 6, padding: 10 }}>
            <div style={{ fontWeight: 800, color: '#1d4ed8', marginBottom: 6 }}>
              📲 Option 2: Instant Fullscreen Web App (iOS &amp; Android PWA)
            </div>
            <ol style={{ margin: 0, paddingLeft: 18, lineHeight: 1.5 }}>
              <li>Open TrillXP in Safari (iPhone/iPad) or Chrome (Android).</li>
              <li>
                Tap <b>Share → Add to Home Screen</b> (iOS) or <b>Menu ⋮ → Install App</b> (Android).
              </li>
              <li>
                Launches fullscreen with pull-to-refresh locked, touch card dragging enabled, and offline IndexedDB storage!
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
   3. WORDPAD (wordpad.exe — Classic Rich-Text Editor in Accessories)
   ============================================================================ */
export const WordPadApp: React.FC<{ payload?: Record<string, unknown> }> = ({ payload }) => {
  const { vfs, createFile } = useOS();
  const { playSound } = useSound();
  const editorRef = useRef<HTMLDivElement | null>(null);
  const existingNode = payload?.fileId ? vfs.find((n) => n.id === payload.fileId) : undefined;
  const [docName, setDocName] = useState(existingNode?.name || 'My 2003 Time Capsule.rtf');
  const [fontName, setFontName] = useState('Georgia');
  const [fontSize, setFontSize] = useState('3');

  useEffect(() => {
    if (existingNode?.content && editorRef.current) {
      editorRef.current.innerHTML = existingNode.content;
    }
  }, [existingNode?.id, existingNode?.content]);

  const execFmt = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
  };

  const handleSave = () => {
    const html = editorRef.current?.innerHTML || '';
    const saveName = docName.endsWith('.rtf') || docName.endsWith('.html') ? docName : `${docName}.rtf`;
    createFile('my-docs', saveName, html, saveName.endsWith('.rtf') ? 'text/rtf' : 'text/html');
    playSound('ding');
    alert(`Saved "${saveName}" to My Documents!`);
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#ece9d8', minHeight: 0, fontSize: 11 }}>
      <div className="xp-menubar">
        <span className="xp-menu-item" onClick={handleSave}>
          💾 Save to My Documents
        </span>
        <span
          className="xp-menu-item"
          onClick={() => {
            if (editorRef.current) {
              editorRef.current.innerHTML =
                '<h2>October 2003 — School Computer Lab Notes</h2><p>1. Finish History essay before 4:00 PM.</p><p>2. Sign onto <b>AIM</b> and check <b>AOL Keyword: SLINGO</b>!</p><p>3. Try to beat the Yeti in <i>SkiFree</i>.</p>';
            }
          }}
        >
          Load 2003 Essay Template
        </span>
      </div>

      {/* Classic XP WordPad Formatting Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 8px',
          borderBottom: '1px solid #aca899',
          flexWrap: 'wrap',
        }}
      >
        <input
          className="xp-input"
          style={{ width: 165 }}
          value={docName}
          onChange={(e) => setDocName(e.target.value)}
        />
        <select
          value={fontName}
          onChange={(e) => {
            setFontName(e.target.value);
            execFmt('fontName', e.target.value);
          }}
          style={{ fontSize: 11, padding: 2 }}
        >
          <option value="Georgia">Georgia</option>
          <option value="Times New Roman">Times New Roman</option>
          <option value="Tahoma">Tahoma</option>
          <option value="Comic Sans MS">Comic Sans MS (2003 Classic!)</option>
          <option value="Courier New">Courier New</option>
        </select>
        <select
          value={fontSize}
          onChange={(e) => {
            setFontSize(e.target.value);
            execFmt('fontSize', e.target.value);
          }}
          style={{ fontSize: 11, padding: 2 }}
        >
          <option value="2">10 pt</option>
          <option value="3">12 pt</option>
          <option value="4">14 pt</option>
          <option value="5">18 pt</option>
          <option value="6">24 pt</option>
        </select>

        <button className="xp-btn" style={{ fontWeight: 900 }} onClick={() => execFmt('bold')}>
          B
        </button>
        <button className="xp-btn" style={{ fontStyle: 'italic' }} onClick={() => execFmt('italic')}>
          I
        </button>
        <button className="xp-btn" style={{ textDecoration: 'underline' }} onClick={() => execFmt('underline')}>
          U
        </button>
        <button className="xp-btn" onClick={() => execFmt('insertUnorderedList')}>
          • List
        </button>
        <input
          type="color"
          defaultValue="#003399"
          title="Text Color"
          onChange={(e) => execFmt('foreColor', e.target.value)}
          style={{ width: 24, height: 22, padding: 0, border: 'none', cursor: 'pointer' }}
        />
      </div>

      {/* Ruler */}
      <div
        style={{
          height: 18,
          background: '#fff',
          borderBottom: '1px solid #94a3b8',
          padding: '0 24px',
          fontSize: 9,
          color: '#64748b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {['1', '2', '3', '4', '5', '6', '7'].map((inch) => (
          <span key={inch}>| &nbsp; · &nbsp; {inch} &nbsp; ·</span>
        ))}
      </div>

      {/* Page Canvas */}
      <div style={{ flex: 1, background: '#808080', padding: 14, overflowY: 'auto', minHeight: 0 }}>
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          style={{
            minHeight: '100%',
            maxWidth: 620,
            margin: '0 auto',
            background: '#ffffff',
            boxShadow: '0 2px 8px rgba(0,0,0,0.45)',
            padding: '24px 32px',
            outline: 'none',
            fontFamily: 'Georgia, serif',
            fontSize: 14,
            lineHeight: 1.55,
            color: '#111',
            userSelect: 'text',
            WebkitUserSelect: 'text',
          }}
        >
          <h2 style={{ marginTop: 0, color: '#003399' }}>Welcome to TrillXP WordPad!</h2>
          <p>
            Before Google Docs existed in the browser, <b>WordPad</b> came pre-installed on every Windows PC for writing rich-formatted school papers, letters, and game walkthroughs.
          </p>
          <p>
            Try switching the font above to <b>Comic Sans MS</b> for authentic 2002 vibes, then click <b>Save to My Documents</b>!
          </p>
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
   4. REGISTRY EDITOR (regedit.exe — Live Interactive Windows XP Registry!)
   ============================================================================ */
export const RegeditApp: React.FC = () => {
  const { theme, setTheme, hypercamOverlay, setHypercamOverlay, bonziOverlay, setBonziOverlay, username } = useOS();
  const [selectedKey, setSelectedKey] = useState<'trillxp' | 'winnt' | 'themes'>('trillxp');

  const cycleTheme = () => {
    const order: XPTheme[] = ['blue', 'royale', 'zune', 'olive', 'silver'];
    setTheme(order[(order.indexOf(theme) + 1) % order.length]);
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#ece9d8', minHeight: 0, fontSize: 11 }}>
      <div className="xp-menubar">
        <span className="xp-menu-item">File</span>
        <span className="xp-menu-item">Edit</span>
        <span className="xp-menu-item">View</span>
        <span className="xp-menu-item">Favorites</span>
      </div>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '235px 1fr', gap: 4, padding: 4, minHeight: 0 }}>
        {/* Left Hive Tree */}
        <div className="xp-bevel-sunken" style={{ background: '#fff', padding: 6, overflowY: 'auto', lineHeight: 1.7 }}>
          <div style={{ fontWeight: 700 }}>💻 My Computer</div>
          <div style={{ paddingLeft: 12 }}>📁 HKEY_CLASSES_ROOT</div>
          <div style={{ paddingLeft: 12 }}>
            📂 <b>HKEY_CURRENT_USER</b>
            <div style={{ paddingLeft: 14 }}>
              📂 Software
              <div
                onClick={() => setSelectedKey('trillxp')}
                style={{
                  paddingLeft: 14,
                  cursor: 'pointer',
                  background: selectedKey === 'trillxp' ? '#316ac5' : 'transparent',
                  color: selectedKey === 'trillxp' ? '#fff' : '#000',
                }}
              >
                📂 TrillXP (Click to edit live!)
              </div>
              <div
                onClick={() => setSelectedKey('themes')}
                style={{
                  paddingLeft: 14,
                  cursor: 'pointer',
                  background: selectedKey === 'themes' ? '#316ac5' : 'transparent',
                  color: selectedKey === 'themes' ? '#fff' : '#000',
                }}
              >
                📂 VisualStyles
              </div>
            </div>
          </div>
          <div style={{ paddingLeft: 12 }}>
            📂 <b>HKEY_LOCAL_MACHINE</b>
            <div
              onClick={() => setSelectedKey('winnt')}
              style={{
                paddingLeft: 14,
                cursor: 'pointer',
                background: selectedKey === 'winnt' ? '#316ac5' : 'transparent',
                color: selectedKey === 'winnt' ? '#fff' : '#000',
              }}
            >
              📂 CurrentVersion
            </div>
          </div>
        </div>

        {/* Right Values Table */}
        <div className="xp-bevel-sunken" style={{ background: '#fff', padding: 8, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', textAlign: 'left', borderBottom: '1px solid #cbd5e1' }}>
                <th style={{ padding: 4 }}>Name</th>
                <th style={{ padding: 4 }}>Type</th>
                <th style={{ padding: 4 }}>Data (Double-click to toggle!)</th>
              </tr>
            </thead>
            <tbody>
              {selectedKey === 'trillxp' && (
                <>
                  <tr>
                    <td style={{ padding: 4 }}>ab (Default)</td>
                    <td style={{ padding: 4 }}>REG_SZ</td>
                    <td style={{ padding: 4 }}>"TrillXP Interactive Time Capsule"</td>
                  </tr>
                  <tr
                    style={{ cursor: 'pointer', background: '#fef9c3' }}
                    onDoubleClick={() => setHypercamOverlay(!hypercamOverlay)}
                  >
                    <td style={{ padding: 4 }}>🔢 UnregisteredHyperCam2</td>
                    <td style={{ padding: 4 }}>REG_DWORD</td>
                    <td style={{ padding: 4 }}>
                      0x0000000{hypercamOverlay ? '1 (Enabled)' : '0 (Disabled)'} — <i>Double-click!</i>
                    </td>
                  </tr>
                  <tr
                    style={{ cursor: 'pointer', background: '#fef9c3' }}
                    onDoubleClick={() => setBonziOverlay(!bonziOverlay)}
                  >
                    <td style={{ padding: 4 }}>🔢 BonziDesktopBuddy</td>
                    <td style={{ padding: 4 }}>REG_DWORD</td>
                    <td style={{ padding: 4 }}>
                      0x0000000{bonziOverlay ? '1 (Enabled)' : '0 (Disabled)'} — <i>Double-click!</i>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: 4 }}>ab AndroidApkPackage</td>
                    <td style={{ padding: 4 }}>REG_SZ</td>
                    <td style={{ padding: 4 }}>ai.trill.trillxp (/downloads/TrillXP.apk)</td>
                  </tr>
                </>
              )}

              {selectedKey === 'themes' && (
                <tr style={{ cursor: 'pointer', background: '#dbeafe' }} onDoubleClick={cycleTheme}>
                  <td style={{ padding: 4 }}>ab ColorScheme</td>
                  <td style={{ padding: 4 }}>REG_SZ</td>
                  <td style={{ padding: 4 }}>
                    "{theme}" — <i>Double-click to cycle Luna / Royale / Zune!</i>
                  </td>
                </tr>
              )}

              {selectedKey === 'winnt' && (
                <>
                  <tr>
                    <td style={{ padding: 4 }}>ab ProductName</td>
                    <td style={{ padding: 4 }}>REG_SZ</td>
                    <td style={{ padding: 4 }}>TrillXP (Microsoft Windows XP Professional)</td>
                  </tr>
                  <tr>
                    <td style={{ padding: 4 }}>ab CSDVersion</td>
                    <td style={{ padding: 4 }}>REG_SZ</td>
                    <td style={{ padding: 4 }}>Service Pack 3</td>
                  </tr>
                  <tr>
                    <td style={{ padding: 4 }}>ab RegisteredOwner</td>
                    <td style={{ padding: 4 }}>REG_SZ</td>
                    <td style={{ padding: 4 }}>{username}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ height: 20, padding: '2px 8px', borderTop: '1px solid #aca899', color: '#444' }}>
        My Computer\HKEY_CURRENT_USER\Software\{selectedKey}
      </div>
    </div>
  );
};

/* ============================================================================
   5. ABOUT TRILLXP / WINVER (winver.exe)
   ============================================================================ */
export const WinVerApp: React.FC<{ windowId: string }> = ({ windowId }) => {
  const { closeWindow, openApp, username } = useOS();

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#ece9d8', fontSize: 11 }}>
      <div
        style={{
          background: 'linear-gradient(90deg, #00309c 0%, #245edb 65%, #60a5fa 100%)',
          color: '#fff',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          borderBottom: '3px solid #f59432',
        }}
      >
        <WindowsXPFlagSVG size={42} />
        <div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>
            Trill<span style={{ color: '#fde047' }}>XP</span> Professional
          </div>
          <div style={{ fontSize: 11, color: '#dbeafe' }}>
            2000s PC Time Machine &amp; Interactive Educational Edition
          </div>
        </div>
      </div>

      <div style={{ flex: 1, padding: 14, lineHeight: 1.5, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <div>
            <b>TrillXP</b> (Windows XP Version 5.1, Build 2600.xpsp_sp3_gdr : Service Pack 3)
          </div>
          <div style={{ marginTop: 6 }}>
            Created so anyone can step back in time to experience early-2000s personal computing firsthand — or educate friends, students, and younger generations who missed 56K Dial-Up, AOL 9.0, AIM, Classic Slingo, PC games, CMD &amp; PowerShell!
          </div>
          <div style={{ marginTop: 8 }}>
            Registered to: <b>{username}</b> • Physical Memory Available: <b>524,288 KB RAM</b>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid #aca899' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="xp-btn" onClick={() => openApp('trillxp-museum')}>
              🏛️ Open Museum
            </button>
            <button className="xp-btn" onClick={() => openApp('apk-installer')}>
              📱 Get TrillXP.apk
            </button>
          </div>
          <button className="xp-btn xp-btn-primary" onClick={() => closeWindow(windowId)}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { useOS, INSTALLABLE_CATALOG } from '../../../context/OSContext';
import { useSound } from '../../../context/SoundContext';
import { AOLMailbox } from './AOLMailbox';
import { AIMMessenger } from './AIMMessenger';
import { AOLMailboxIconSVG, RunningManSVG } from './AOLGraphics';

export const AOLDesktop: React.FC = () => {
  const {
    aolConnected,
    unreadInboxCount,
    gmailConfig,
    disconnectAOL,
    openApp,
    launchInstallerWizard,
    installedPackages,
  } = useOS();
  const { playSound } = useSound();

  const [activeView, setActiveView] = useState<'mailbox' | 'welcome' | 'softpedia' | 'news'>('mailbox');
  const [keywordInput, setKeywordInput] = useState('AOL Keyword: Mail');
  const [searchInput, setSearchInput] = useState('');
  const [showAIMDock, setShowAIMDock] = useState(true);

  const handleKeywordGo = (e: React.FormEvent) => {
    e.preventDefault();
    const k = keywordInput.toLowerCase();
    if (k.includes('mail') || k.includes('gmail')) setActiveView('mailbox');
    else if (k.includes('slingo')) openApp('slingo');
    else if (k.includes('arena')) openApp('arena-ai');
    else if (k.includes('welcome')) setActiveView('welcome');
    else if (k.includes('news') || k.includes('weather') || k.includes('finance')) setActiveView('news');
    else if (k.includes('game') || k.includes('pinball')) openApp('slingo');
    else setActiveView('softpedia');
  };

  return (
    <div className="aol-desktop-shell">
      {/* Top AOL Menu Bar (Image 4) */}
      <div className="aol-menubar">
        {[
          'File',
          'Edit',
          'Mail',
          'News',
          'Finance',
          'Entertainment',
          'Lifestyle',
          'Community',
          'Services',
          'Safety',
          'Window',
          'Keyword',
        ].map((item) => (
          <span
            key={item}
            className="aol-menubar-item"
            onClick={() => {
              if (item === 'Mail') setActiveView('mailbox');
              else if (item === 'News' || item === 'Finance') setActiveView('news');
              else if (item === 'Entertainment') openApp('pinball');
              else setActiveView('welcome');
            }}
          >
            {item}
          </span>
        ))}
        <span
          className="aol-menubar-item"
          style={{ fontWeight: 700, color: '#991b1b' }}
          onClick={disconnectAOL}
        >
          Sign Off
        </span>
        <span className="aol-menubar-item" onClick={() => openApp('tour-xp')}>
          Help
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: aolConnected ? '#15803d' : '#b45309' }}>
          {aolConnected ? '● Connected (56.0 Kbps)' : '○ Offline Mode (Click AOL 9.0 to Dial)'}
        </span>
      </div>

      {/* Iconic AOL 9.8.2 Toolbar (Exact match to Image 4!) */}
      <div className="aol-toolbar">
        <div className="aol-tool-group">
          <button
            className="aol-tool-btn"
            onClick={() => {
              setActiveView('mailbox');
              if (unreadInboxCount > 0) playSound('youveGotMail');
            }}
          >
            <div style={{ position: 'relative' }}>
              <AOLMailboxIconSVG size={28} hasUnread={unreadInboxCount > 0} />
              {unreadInboxCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: -3,
                    right: -6,
                    background: '#dc2626',
                    color: '#fff',
                    borderRadius: 8,
                    padding: '0 4px',
                    fontSize: 9,
                    fontWeight: 800,
                  }}
                >
                  {unreadInboxCount}
                </span>
              )}
            </div>
            <span>Read</span>
          </button>

          <button
            className="aol-tool-btn"
            onClick={() => openApp('aol-mailbox', { tab: 'write' })}
          >
            <span style={{ fontSize: 21 }}>📝</span>
            <span>Write</span>
          </button>

          <button
            className="aol-tool-btn"
            onClick={() => setShowAIMDock((v) => !v)}
          >
            <RunningManSVG size={25} />
            <span>IM</span>
          </button>

          <button
            className="aol-tool-btn"
            onClick={() => setActiveView('softpedia')}
          >
            <span style={{ fontSize: 21 }}>🔭</span>
            <span>Explore</span>
          </button>

          <button
            className="aol-tool-btn"
            onClick={() => setActiveView('news')}
          >
            <span style={{ fontSize: 21 }}>📰</span>
            <span>Local News</span>
          </button>

          <button
            className="aol-tool-btn"
            onClick={() => openApp('aol-mailbox', { tab: 'connect' })}
          >
            <span style={{ fontSize: 21 }}>⚙️</span>
            <span>Gmail Setup</span>
          </button>

          <button
            className="aol-tool-btn"
            onClick={() => openApp('wmplayer')}
          >
            <span style={{ fontSize: 21 }}>📻</span>
            <span>AOL Radio</span>
          </button>
        </div>

        {/* Right Rounded Ribbon (Games, Moviefone, PC Checkup, Weather, Aol. circle) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="aol-tool-ribbon">
            <button className="aol-tool-btn" style={{ height: 42 }} onClick={() => openApp('slingo')}>
              <span style={{ fontSize: 18 }}>🎰</span>
              <span>Slingo</span>
            </button>
            <button className="aol-tool-btn" style={{ height: 42 }} onClick={() => openApp('arena-ai')}>
              <span style={{ fontSize: 18 }}>✨</span>
              <span>Arena AI</span>
            </button>
            <button className="aol-tool-btn" style={{ height: 42 }} onClick={() => setActiveView('softpedia')}>
              <span style={{ fontSize: 18 }}>💾</span>
              <span>Downloads</span>
            </button>
            <button className="aol-tool-btn" style={{ height: 42 }} onClick={() => setActiveView('news')}>
              <span style={{ fontSize: 18 }}>⛅</span>
              <span>Weather</span>
            </button>
          </div>
          <div
            onClick={() => setActiveView('welcome')}
            style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              background: 'radial-gradient(circle at 35% 30%, #4aa3f0, #0d4b96)',
              border: '2px solid #fff',
              color: '#fff',
              fontWeight: 900,
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 2px 5px rgba(0,0,0,0.28)',
            }}
          >
            Aol.
          </div>
        </div>
      </div>

      {/* Navigation & Keyword Bar (Exact match to Image 4!) */}
      <form onSubmit={handleKeywordGo} className="aol-navbar">
        <button type="button" className="aol-pill-btn" onClick={() => setActiveView('welcome')}>
          Welcome
        </button>
        <button type="button" className="aol-pill-btn" onClick={() => setActiveView('mailbox')}>
          Mailbox
        </button>
        <button type="button" className="aol-pill-btn" onClick={() => setActiveView('softpedia')}>
          Softpedia
        </button>
        <input
          className="xp-input"
          style={{ flex: 1, height: 23 }}
          value={keywordInput}
          onChange={(e) => setKeywordInput(e.target.value)}
          placeholder="Type AOL Keyword or Web Address..."
        />
        <button type="submit" className="aol-pill-btn">
          Go
        </button>
        <input
          className="xp-input"
          style={{ width: 155, height: 23 }}
          placeholder="Search the Web..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <button
          type="button"
          className="aol-search-pink-btn"
          onClick={() => setActiveView('softpedia')}
        >
          Search
        </button>
      </form>

      {/* Main MDI Workspace */}
      <div style={{ flex: 1, display: 'flex', gap: 8, padding: 8, minHeight: 0, overflow: 'hidden' }}>
        {/* Left/Center Active Child Window */}
        <div className="aol-subwindow" style={{ flex: 1, minWidth: 0 }}>
          {activeView === 'mailbox' && (
            <>
              <div className="aol-subwindow-title">
                <span>📬 {gmailConfig.email}&apos;s Mailbox — Powered by Gmail</span>
                <div style={{ display: 'flex', gap: 5 }}>
                  <button
                    className="aol-pill-btn"
                    style={{ padding: '1px 7px', fontSize: 10 }}
                    onClick={() => playSound('youveGotMail')}
                  >
                    🔊 Play &ldquo;You&apos;ve Got Mail&rdquo;
                  </button>
                  <button
                    className="aol-pill-btn"
                    style={{ padding: '1px 7px', fontSize: 10 }}
                    onClick={() => setActiveView('softpedia')}
                  >
                    Browse Softpedia
                  </button>
                </div>
              </div>
              <AOLMailbox embedded />
            </>
          )}

          {activeView === 'softpedia' && (
            <>
              <div className="aol-subwindow-title">
                <span>🌐 Softpedia - Free Windows XP Downloads Encyclopedia</span>
              </div>
              <div style={{ flex: 1, background: '#fff', overflowY: 'auto' }}>
                {/* Exact Softpedia Royal Blue Header Banner from Image 4! */}
                <div
                  style={{
                    background: 'linear-gradient(180deg, #003e85 0%, #002b60 100%)',
                    color: '#fff',
                    padding: '12px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: 0.8 }}>SOFTPEDIA®</div>
                  <div style={{ display: 'flex', gap: 18, fontSize: 12, fontWeight: 700 }}>
                    <span>WINDOWS XP APPS ▾</span>
                    <span>GAMES ▾</span>
                    <span>DRIVERS ▾</span>
                    <span>NEWS</span>
                  </div>
                </div>
                <div
                  style={{
                    background: '#eef4fb',
                    padding: '8px 18px',
                    borderBottom: '1px solid #cddbef',
                    fontSize: 11,
                    color: '#334155',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>⬇ 3,143,208,758 served Windows XP downloads — 100% Clean Verified .EXE Installers</span>
                  <span style={{ fontWeight: 700, color: '#0369a1' }}>Click any app to run InstallShield Setup.exe!</span>
                </div>

                <div style={{ padding: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 10 }}>
                  {INSTALLABLE_CATALOG.map((pkg) => {
                    const isInstalled = installedPackages.some((p) => p.id === pkg.id);
                    return (
                      <div
                        key={pkg.id}
                        style={{
                          border: '1px solid #cbd5e1',
                          borderRadius: 5,
                          padding: 10,
                          background: '#f8fafc',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: 8,
                        }}
                      >
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <img src={pkg.icon} alt="" style={{ width: 34, height: 34, objectFit: 'contain' }} />
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 12, color: '#0f172a' }}>
                              {pkg.name} {pkg.version}
                            </div>
                            <div style={{ fontSize: 10, color: '#64748b' }}>
                              {pkg.installerFile} • {pkg.sizeMB} MB
                            </div>
                          </div>
                        </div>
                        <div style={{ fontSize: 11, color: '#334155', lineHeight: 1.35 }}>
                          {pkg.description}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#eab308', fontSize: 12 }}>★★★★★</span>
                          {isInstalled ? (
                            <button className="xp-btn" onClick={() => openApp(pkg.appId)}>
                              ✓ Open Installed App
                            </button>
                          ) : (
                            <button
                              className="aol-pill-btn"
                              onClick={() => launchInstallerWizard(pkg)}
                            >
                              ⬇ Download & Run .EXE
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {activeView === 'welcome' && (
            <>
              <div className="aol-subwindow-title">
                <span>🌟 Welcome, {gmailConfig.email}!</span>
              </div>
              <div style={{ flex: 1, background: '#fff', padding: 18, overflowY: 'auto' }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '175px 1fr',
                    gap: 18,
                    alignItems: 'center',
                    background: 'linear-gradient(135deg, #eef6ff 0%, #d4e6fb 100%)',
                    border: '1px solid #96bbed',
                    borderRadius: 8,
                    padding: 16,
                    marginBottom: 14,
                  }}
                >
                  <div
                    onClick={() => {
                      playSound('youveGotMail');
                      setActiveView('mailbox');
                    }}
                    style={{
                      background: '#fff',
                      border: '2px solid #2b6cb0',
                      borderRadius: 8,
                      padding: 12,
                      textAlign: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <AOLMailboxIconSVG size={56} hasUnread={unreadInboxCount > 0} />
                    <div style={{ fontWeight: 800, color: '#0d3b82', fontSize: 13, marginTop: 4 }}>
                      {unreadInboxCount > 0 ? "YOU'VE GOT MAIL!" : 'Check Gmail'}
                    </div>
                    <div style={{ fontSize: 11, color: '#475569' }}>{unreadInboxCount} Unread in Gmail</div>
                  </div>
                  <div>
                    <h2 style={{ margin: '0 0 6px', color: '#0b3575', fontSize: 18 }}>
                      Welcome to America Online 9.8 + Gmail!
                    </h2>
                    <p style={{ margin: '0 0 10px', fontSize: 12, color: '#334155', lineHeight: 1.45 }}>
                      Your classic AOL experience is live on Windows XP Professional! Read and send Gmail under the
                      authentic AOL Mailbox UI, chat with SmarterChild on AIM, download Windows XP `.EXE` apps on
                      Softpedia, or play Space Cadet Pinball!
                    </p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button className="aol-pill-btn" onClick={() => setActiveView('mailbox')}>
                        📬 Open Gmail Mailbox
                      </button>
                      <button className="aol-pill-btn" onClick={() => setActiveView('softpedia')}>
                        ⬇ Download XP Software
                      </button>
                      <button className="aol-pill-btn" onClick={() => openApp('pinball')}>
                        🛸 Play 3D Pinball
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeView === 'news' && (
            <>
              <div className="aol-subwindow-title">
                <span>📰 AOL News, Weather & Finance Channel</span>
              </div>
              <div style={{ flex: 1, background: '#fff', padding: 16, overflowY: 'auto', fontSize: 12 }}>
                <h3 style={{ marginTop: 0, color: '#0c357a' }}>Top Headlines on AOL Today</h3>
                <ul style={{ lineHeight: 1.8 }}>
                  <li>
                    <b>Tech Spotlight:</b> Google launches Gmail with 1,000 MB of free storage — now accessible inside
                    your classic AOL 9.8 Mailbox!
                  </li>
                  <li>
                    <b>PC Gaming:</b> Maxis & Microsoft&apos;s <i>3D Pinball: Space Cadet</i> sets office productivity
                    records worldwide.
                  </li>
                  <li>
                    <b>Weather:</b> 72°F Sunny skies over Sonoma County&apos;s iconic green Bliss hills.
                  </li>
                  <li>
                    <b>Markets:</b> MSFT ▲ +2.4% &nbsp;|&nbsp; TWX ▲ +1.8% &nbsp;|&nbsp; GOOG ▲ +5.1%
                  </li>
                </ul>
              </div>
            </>
          )}
        </div>

        {/* Right Docked AIM Buddy List (Exact match to Image 4!) */}
        {showAIMDock && <AIMMessenger dockedInAOL />}
      </div>
    </div>
  );
};

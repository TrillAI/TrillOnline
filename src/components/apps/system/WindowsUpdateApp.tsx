import React, { useState } from 'react';
import { useOS } from '../../../context/OSContext';
import { useSound } from '../../../context/SoundContext';
import { WindowsXPFlagSVG } from '../aol/AOLGraphics';

export interface WindowsKBUpdate {
  kbId: string;
  title: string;
  category: 'High Priority' | 'Software, Optional' | 'Feature Pack';
  sizeMB: number;
  date: string;
  description: string;
  actionHint?: string;
}

export const WINDOWS_UPDATE_CATALOG: WindowsKBUpdate[] = [
  {
    kbId: 'KB984201',
    title: 'Arena AI Agent v2.5 — Deep Windows XP OS Copilot & Persistent VFS Integration',
    category: 'Feature Pack',
    sizeMB: 6.4,
    date: '2026-11-01',
    description:
      'Integrates Arena AI Agent natively into Windows XP Shell, Explorer Common Tasks, Taskbar Quick Launch, and https://arena.ai/agent with persistent IndexedDB image, WebM video, and app generation.',
    actionHint: 'Arena AI Agent',
  },
  {
    kbId: 'KB936929',
    title: 'Windows XP Official Royale & Zune Visual Styles Pack (SP3 Rollup)',
    category: 'Software, Optional',
    sizeMB: 3.2,
    date: '2008-05-06',
    description:
      'Installs Microsoft Windows XP Media Center Edition "Royale" glossy blue and "Zune" dark charcoal/orange themes into Display Properties.',
    actionHint: 'Control Panel -> Display',
  },
  {
    kbId: 'KB984205',
    title: 'AOL Slingo Deluxe Championship Edition & Hall of Fame Update',
    category: 'Feature Pack',
    sizeMB: 4.1,
    date: '2026-11-01',
    description:
      'Adds Classic AOL Slingo & Slingo Deluxe Powerups (Vision, Devil Shield, 2x Multiplier), Cherub Rescue animations, and persistent High Scores.',
    actionHint: 'Slingo Deluxe',
  },
  {
    kbId: 'KB984210',
    title: 'Internet Explorer 6 SP3 Turbo Web Reader, Persistent Tabs & Search Companion',
    category: 'High Priority',
    sizeMB: 5.8,
    date: '2026-11-01',
    description:
      'Upgrades classic Internet Explorer 6 with ultra-fast parallel live web search, anti-X-Frame Turbo Reader engine, persistent tabs, Favorites, and offline page saving.',
    actionHint: 'Internet Explorer 6',
  },
  {
    kbId: 'KB890830',
    title: 'Windows XP Malicious Software Removal Tool & Security Center Definitions',
    category: 'High Priority',
    sizeMB: 1.9,
    date: '2026-11-01',
    description:
      'Keeps your Windows XP Security Center green and verified while browsing the open web and downloading .EXE packages.',
  },
];

export const WindowsUpdateApp: React.FC = () => {
  const { installedUpdates, installWindowsUpdate, openApp, setTheme } = useOS();
  const { playSound } = useSound();

  const [stage, setStage] = useState<'home' | 'scanning' | 'results' | 'installing' | 'complete' | 'history'>('home');
  const [selectedKbs, setSelectedKbs] = useState<string[]>([]);
  const [installProgress, setInstallProgress] = useState(0);
  const [currentKbLabel, setCurrentKbLabel] = useState('');

  const pendingUpdates = WINDOWS_UPDATE_CATALOG.filter((u) => !installedUpdates.includes(u.kbId));

  const startScan = (express: boolean) => {
    playSound('startClick');
    setStage('scanning');
    window.setTimeout(() => {
      const toSelect = express
        ? pendingUpdates.map((u) => u.kbId)
        : pendingUpdates.filter((u) => u.category === 'High Priority').map((u) => u.kbId);
      setSelectedKbs(toSelect.length > 0 ? toSelect : pendingUpdates.map((u) => u.kbId));
      setStage('results');
    }, 1150);
  };

  const runInstall = async () => {
    if (selectedKbs.length === 0) return;
    setStage('installing');
    setInstallProgress(0);
    for (let i = 0; i < selectedKbs.length; i++) {
      const kb = WINDOWS_UPDATE_CATALOG.find((u) => u.kbId === selectedKbs[i]);
      setCurrentKbLabel(kb ? `${kb.kbId}: ${kb.title}` : selectedKbs[i]);
      for (let p = 1; p <= 4; p++) {
        await new Promise((r) => setTimeout(r, 170));
        setInstallProgress(Math.round(((i + p / 4) / selectedKbs.length) * 100));
      }
      installWindowsUpdate(selectedKbs[i], kb?.title);
    }
    setStage('complete');
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#ffffff', fontSize: 11, minHeight: 0 }}>
      {/* Top Classic Microsoft Windows Update v5 Banner */}
      <div
        style={{
          background: 'linear-gradient(90deg, #003399 0%, #1d5ed6 62%, #6396f2 100%)',
          color: '#fff',
          padding: '10px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '3px solid #f59e0b',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <WindowsXPFlagSVG size={34} />
          <div>
            <div style={{ fontSize: 10, opacity: 0.9 }}>Microsoft®</div>
            <div style={{ fontSize: 19, fontWeight: 700, lineHeight: 1 }}>Windows Update</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="xp-btn" onClick={() => setStage('home')}>
            🏠 Welcome
          </button>
          <button className="xp-btn" onClick={() => setStage('history')}>
            📜 View Update History ({installedUpdates.length})
          </button>
        </div>
      </div>

      {/* Main Content Split */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* Left Sidebar */}
        <div
          style={{
            width: 195,
            background: '#eef4fd',
            borderRight: '1px solid #b6cef2',
            padding: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            flexShrink: 0,
          }}
        >
          <div style={{ background: '#fff', border: '1px solid #96bbed', borderRadius: 5, padding: 10 }}>
            <div style={{ fontWeight: 700, color: '#003399', marginBottom: 6 }}>Windows Update Options</div>
            <div
              style={{ color: '#1d4ed8', cursor: 'pointer', marginBottom: 5 }}
              onClick={() => startScan(true)}
            >
              ▸ Express Scan (Recommended)
            </div>
            <div
              style={{ color: '#1d4ed8', cursor: 'pointer', marginBottom: 5 }}
              onClick={() => startScan(false)}
            >
              ▸ Custom Scan
            </div>
            <div
              style={{ color: '#1d4ed8', cursor: 'pointer', marginBottom: 5 }}
              onClick={() => setStage('history')}
            >
              ▸ Review installation history
            </div>
            <div
              style={{ color: '#1d4ed8', cursor: 'pointer' }}
              onClick={() => openApp('arena-ai')}
            >
              ▸ Open Arena AI Agent
            </div>
          </div>

          <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 5, padding: 10, fontSize: 10.5, lineHeight: 1.4 }}>
            <div style={{ fontWeight: 700, color: '#92400e', marginBottom: 4 }}>🛡️ Automatic Updates: ON</div>
            All installed KB updates and feature packs are stored permanently in your Windows XP Persistent Storage.
          </div>
        </div>

        {/* Right Primary Stage */}
        <div style={{ flex: 1, padding: 20, overflowY: 'auto' }}>
          {stage === 'home' && (
            <div>
              <h2 style={{ margin: '0 0 8px', color: '#003399', fontSize: 18 }}>
                Keep your Windows XP computer up-to-date
              </h2>
              <p style={{ color: '#334155', lineHeight: 1.5, marginBottom: 16 }}>
                Select an installation method below to check for critical security updates, new XP visual themes
                (Royale & Zune), Slingo Deluxe packs, and Arena AI Agent OS enhancements.
              </p>

              <div
                onClick={() => startScan(true)}
                style={{
                  border: '2px solid #2563eb',
                  borderRadius: 6,
                  padding: 14,
                  background: 'linear-gradient(180deg, #eff6ff 0%, #dbeafe 100%)',
                  marginBottom: 12,
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: '#1e3a8a' }}>
                    ⚡ Express (Recommended)
                  </div>
                  <div style={{ color: '#334155', marginTop: 3 }}>
                    Quickly find and install all high-priority updates and OS feature rollups ({pendingUpdates.length}{' '}
                    available).
                  </div>
                </div>
                <button className="xp-btn xp-btn-primary">Express Scan →</button>
              </div>

              <div
                onClick={() => startScan(false)}
                style={{
                  border: '1px solid #cbd5e1',
                  borderRadius: 6,
                  padding: 14,
                  background: '#f8fafc',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>🔧 Custom</div>
                  <div style={{ color: '#475569', marginTop: 3 }}>
                    Choose individually from High Priority, Optional Software, and Feature Packs.
                  </div>
                </div>
                <button className="xp-btn">Custom Scan →</button>
              </div>
            </div>
          )}

          {stage === 'scanning' && (
            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#003399', marginBottom: 12 }}>
                Checking for the latest updates for your computer...
              </div>
              <div
                style={{
                  width: 340,
                  height: 18,
                  margin: '0 auto',
                  border: '1px solid #688caf',
                  borderRadius: 3,
                  padding: 2,
                  background: '#fff',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: '65%',
                    height: '100%',
                    background: 'repeating-linear-gradient(90deg, #3ec23e 0px, #3ec23e 10px, #fff 10px, #fff 12px)',
                  }}
                />
              </div>
            </div>
          )}

          {stage === 'results' && (
            <div>
              {pendingUpdates.length === 0 ? (
                <div style={{ padding: 20, background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 6 }}>
                  <div style={{ fontWeight: 800, fontSize: 15, color: '#15803d', marginBottom: 6 }}>
                    ✅ Your computer is completely up to date!
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    All {WINDOWS_UPDATE_CATALOG.length} Windows XP SP3, IE6 Turbo, Slingo Deluxe, and Arena AI updates are installed.
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="xp-btn xp-btn-primary" onClick={() => setTheme('royale')}>
                      🎨 Try Royale Theme
                    </button>
                    <button className="xp-btn" onClick={() => setTheme('zune')}>
                      🟠 Try Zune Theme
                    </button>
                    <button className="xp-btn" onClick={() => openApp('arena-ai')}>
                      ✨ Open Arena AI Agent
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 15, color: '#003399' }}>
                        Review and install updates ({pendingUpdates.length} available)
                      </div>
                      <div style={{ color: '#475569' }}>Select the updates you want to install on Windows XP:</div>
                    </div>
                    <button
                      className="xp-btn xp-btn-primary"
                      disabled={selectedKbs.length === 0}
                      onClick={() => void runInstall()}
                    >
                      ⬇ Install Updates ({selectedKbs.length})
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {pendingUpdates.map((u) => {
                      const checked = selectedKbs.includes(u.kbId);
                      return (
                        <label
                          key={u.kbId}
                          style={{
                            display: 'flex',
                            gap: 10,
                            alignItems: 'flex-start',
                            padding: 10,
                            border: '1px solid #cbd5e1',
                            borderRadius: 6,
                            background: checked ? '#eff6ff' : '#fff',
                            cursor: 'pointer',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              setSelectedKbs((prev) =>
                                e.target.checked ? [...prev, u.kbId] : prev.filter((id) => id !== u.kbId)
                              );
                            }}
                            style={{ marginTop: 3 }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: 12, color: '#0f172a' }}>
                              {u.title}{' '}
                              <span style={{ color: '#64748b', fontWeight: 400 }}>
                                ({u.kbId} • {u.sizeMB} MB)
                              </span>
                            </div>
                            <div style={{ color: '#475569', marginTop: 3, lineHeight: 1.4 }}>{u.description}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {stage === 'installing' && (
            <div style={{ padding: '30px 16px' }}>
              <div style={{ fontWeight: 800, fontSize: 15, color: '#003399', marginBottom: 8 }}>
                Installing Windows Updates... ({installProgress}%)
              </div>
              <div style={{ marginBottom: 10, color: '#334155' }}>Currently installing: {currentKbLabel}</div>
              <div
                style={{
                  width: '100%',
                  height: 20,
                  border: '1px solid #688caf',
                  borderRadius: 3,
                  padding: 2,
                  background: '#fff',
                }}
              >
                <div
                  style={{
                    width: `${installProgress}%`,
                    height: '100%',
                    background: 'linear-gradient(180deg, #52d452 0%, #269926 100%)',
                    transition: 'width 0.15s linear',
                  }}
                />
              </div>
            </div>
          )}

          {stage === 'complete' && (
            <div style={{ padding: 20, background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 6 }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#15803d', marginBottom: 8 }}>
                ✅ Updates Were Successfully Installed!
              </div>
              <div style={{ marginBottom: 14, lineHeight: 1.5 }}>
                Your Windows XP system has been upgraded and saved to persistent OS storage. No restart is required!
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="xp-btn xp-btn-primary" onClick={() => setTheme('royale')}>
                  🎨 Switch to Royale Glossy Theme
                </button>
                <button className="xp-btn" onClick={() => setTheme('zune')}>
                  🟠 Switch to Zune Dark Theme
                </button>
                <button className="xp-btn" onClick={() => openApp('arena-ai')}>
                  ✨ Launch Arena AI Agent
                </button>
                <button className="xp-btn" onClick={() => openApp('slingo')}>
                  🎰 Play Slingo Deluxe
                </button>
              </div>
            </div>
          )}

          {stage === 'history' && (
            <div>
              <h3 style={{ marginTop: 0, color: '#003399' }}>Installed Updates History</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {WINDOWS_UPDATE_CATALOG.map((u) => {
                  const isInst = installedUpdates.includes(u.kbId);
                  return (
                    <div
                      key={u.kbId}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 10px',
                        border: '1px solid #cbd5e1',
                        borderRadius: 5,
                        background: isInst ? '#f8fafc' : '#fff7ed',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700 }}>
                          {u.kbId} — {u.title}
                        </div>
                        <div style={{ fontSize: 10, color: '#64748b' }}>{u.category}</div>
                      </div>
                      <span
                        style={{
                          fontWeight: 700,
                          color: isInst ? '#16a34a' : '#d97706',
                        }}
                      >
                        {isInst ? '✓ Installed' : 'Available'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

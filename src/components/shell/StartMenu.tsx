import React, { useState } from 'react';
import { useOS, BuiltinAppId } from '../../context/OSContext';

interface StartMenuProps {
  onClose: () => void;
  onShowModal: (mode: 'turnoff' | 'logoff') => void;
}

export const StartMenu: React.FC<StartMenuProps> = ({ onClose, onShowModal }) => {
  const { username, userAvatar, openApp, installedPackages } = useOS();
  const [allProgramsOpen, setAllProgramsOpen] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState<'accessories' | 'games' | 'aol' | null>(null);

  const launch = (appId: BuiltinAppId, payload?: Record<string, unknown>) => {
    openApp(appId, payload);
    onClose();
  };

  return (
    <div className="xp-startmenu" onClick={(e) => e.stopPropagation()}>
      {/* Top Glossy User Header */}
      <div className="xp-startmenu-header">
        <img src={userAvatar} alt={username} className="xp-startmenu-avatar" />
        <span className="xp-startmenu-username">{username}</span>
      </div>

      {/* Two-Column Body */}
      <div className="xp-startmenu-body">
        {/* Left White Column: Pinned + Most Used + All Programs */}
        <div className="xp-startmenu-left">
          <div>
            {/* Pinned Internet, E-mail & Arena AI Copilot */}
            <div className="xp-sm-item" onClick={() => launch('ie')}>
              <img src="/icons/ie.png" alt="" style={{ width: 28, height: 28 }} />
              <div>
                <div style={{ fontWeight: 700 }}>Internet</div>
                <span className="xp-sm-sub">Internet Explorer 6</span>
              </div>
            </div>
            <div className="xp-sm-item" onClick={() => launch('aol-mailbox')}>
              <img src="/icons/887(32x32).png" alt="" style={{ width: 28, height: 28 }} />
              <div>
                <div style={{ fontWeight: 700 }}>E-mail (Gmail)</div>
                <span className="xp-sm-sub">AOL 9.8 Mailbox UI</span>
              </div>
            </div>
            <div className="xp-sm-item" onClick={() => launch('arena-ai')}>
              <img src="/icons/arena-ai.svg" alt="" style={{ width: 28, height: 28 }} />
              <div>
                <div style={{ fontWeight: 700 }}>Arena AI Agent</div>
                <span className="xp-sm-sub">Tasks, Images & Video</span>
              </div>
            </div>

            <div className="xp-sm-sep" />

            {/* Frequently Used Programs */}
            <div className="xp-sm-item" onClick={() => launch('slingo')}>
              <img src="/icons/slingo.svg" alt="" style={{ width: 24, height: 24 }} />
              <span style={{ fontWeight: 700 }}>Slingo Deluxe</span>
            </div>
            <div className="xp-sm-item" onClick={() => launch('aol-dialer')}>
              <img src="/icons/luna32/net_modem.png" alt="" style={{ width: 24, height: 24 }} />
              <span>America Online 9.0</span>
            </div>
            <div className="xp-sm-item" onClick={() => launch('wmplayer')}>
              <img src="/icons/846(32x32).png" alt="" style={{ width: 24, height: 24 }} />
              <span>Windows Media Player</span>
            </div>
            <div className="xp-sm-item" onClick={() => launch('aim')}>
              <img src="/icons/msn.png" alt="" style={{ width: 24, height: 24 }} />
              <span>AIM Instant Messenger</span>
            </div>
            <div className="xp-sm-item" onClick={() => launch('software-center')}>
              <img src="/icons/luna32/file_generic_installer.png" alt="" style={{ width: 24, height: 24 }} />
              <span>Install Software (.EXE)</span>
            </div>
            <div className="xp-sm-item" onClick={() => launch('windows-update')}>
              <img src="/icons/luna32/secure_warn.png" alt="" style={{ width: 24, height: 24 }} />
              <span>Windows Update</span>
            </div>
          </div>

          {/* All Programs Footer Trigger */}
          <div style={{ position: 'relative' }}>
            <div className="xp-sm-sep" />
            <div
              className="xp-sm-item"
              onMouseEnter={() => setAllProgramsOpen(true)}
              onClick={() => setAllProgramsOpen((v) => !v)}
              style={{ justifyContent: 'center', fontWeight: 700, padding: '6px 8px', gap: 10 }}
            >
              <span>All Programs</span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 17,
                  height: 17,
                  borderRadius: 3,
                  background: '#3ca83c',
                  color: '#fff',
                  fontSize: 10,
                }}
              >
                ▶
              </span>
            </div>

            {/* Cascading All Programs Menu */}
            {allProgramsOpen && (
              <div
                onMouseLeave={() => {
                  setAllProgramsOpen(false);
                  setActiveSubmenu(null);
                }}
                style={{
                  position: 'absolute',
                  left: '98%',
                  bottom: 0,
                  width: 226,
                  background: '#fff',
                  border: '1px solid #4880d8',
                  borderLeft: '4px solid #4880d8',
                  boxShadow: '4px 4px 12px rgba(0,0,0,0.4)',
                  padding: 3,
                  zIndex: 10020,
                }}
              >
                <div className="xp-sm-item" onClick={() => launch('windows-update')}>
                  <img src="/icons/luna16/secure_warn.png" alt="" style={{ width: 16, height: 16 }} />
                  <span style={{ fontWeight: 700 }}>Windows Update</span>
                </div>
                <div className="xp-sm-item" onClick={() => launch('software-center')}>
                  <img src="/icons/227(16x16).png" alt="" style={{ width: 16, height: 16 }} />
                  <span>Set Program Access & Install</span>
                </div>
                <div className="xp-sm-item" onClick={() => launch('arena-ai')}>
                  <img src="/icons/arena-ai.svg" alt="" style={{ width: 16, height: 16 }} />
                  <span style={{ fontWeight: 700 }}>Arena AI Agent</span>
                </div>
                <div className="xp-sm-sep" />

                {/* Accessories Folder */}
                <div
                  className="xp-sm-item"
                  onMouseEnter={() => setActiveSubmenu('accessories')}
                  style={{ justifyContent: 'space-between', position: 'relative' }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <img src="/icons/358(16x16).png" alt="" style={{ width: 16, height: 16 }} />
                    Accessories
                  </span>
                  <span>▶</span>

                  {activeSubmenu === 'accessories' && (
                    <div
                      style={{
                        position: 'absolute',
                        left: '100%',
                        bottom: -18,
                        width: 196,
                        background: '#fff',
                        border: '1px solid #4880d8',
                        borderLeft: '4px solid #4880d8',
                        boxShadow: '4px 4px 12px rgba(0,0,0,0.4)',
                        padding: 3,
                        color: '#000',
                      }}
                    >
                      <div className="xp-sm-item" onClick={() => launch('calculator')}>
                        <img src="/icons/74(16x16).png" alt="" style={{ width: 16, height: 16 }} />
                        <span>Calculator</span>
                      </div>
                      <div className="xp-sm-item" onClick={() => launch('cmd')}>
                        <img src="/icons/56(16x16).png" alt="" style={{ width: 16, height: 16 }} />
                        <span>Command Prompt</span>
                      </div>
                      <div className="xp-sm-item" onClick={() => launch('notepad')}>
                        <img src="/icons/327(16x16).png" alt="" style={{ width: 16, height: 16 }} />
                        <span>Notepad</span>
                      </div>
                      <div className="xp-sm-item" onClick={() => launch('paint')}>
                        <img src="/icons/680(16x16).png" alt="" style={{ width: 16, height: 16 }} />
                        <span>Paint</span>
                      </div>
                      <div className="xp-sm-item" onClick={() => launch('explorer', { folderId: 'root' })}>
                        <img src="/icons/156(16x16).png" alt="" style={{ width: 16, height: 16 }} />
                        <span>Windows Explorer</span>
                      </div>
                      <div className="xp-sm-item" onClick={() => launch('taskmgr')}>
                        <img src="/icons/luna16/monitor.png" alt="" style={{ width: 16, height: 16 }} />
                        <span>Task Manager</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Games Folder (Slingo Deluxe + ALL 6 ORIGINAL XP GAMES!) */}
                <div
                  className="xp-sm-item"
                  onMouseEnter={() => setActiveSubmenu('games')}
                  style={{ justifyContent: 'space-between', position: 'relative' }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <img src="/icons/358(16x16).png" alt="" style={{ width: 16, height: 16 }} />
                    <b>Games</b>
                  </span>
                  <span>▶</span>

                  {activeSubmenu === 'games' && (
                    <div
                      style={{
                        position: 'absolute',
                        left: '100%',
                        bottom: -24,
                        width: 222,
                        background: '#fff',
                        border: '1px solid #4880d8',
                        borderLeft: '4px solid #4880d8',
                        boxShadow: '4px 4px 12px rgba(0,0,0,0.4)',
                        padding: 3,
                        color: '#000',
                      }}
                    >
                      <div className="xp-sm-item" onClick={() => launch('slingo')} style={{ background: '#fff7d6' }}>
                        <img src="/icons/slingo.svg" alt="" style={{ width: 16, height: 16 }} />
                        <span style={{ fontWeight: 700 }}>Slingo Deluxe (AOL)</span>
                      </div>
                      <div className="xp-sm-item" onClick={() => launch('pinball')}>
                        <img src="/icons/pinball.png" alt="" style={{ width: 16, height: 16 }} />
                        <span>3D Pinball - Space Cadet</span>
                      </div>
                      <div className="xp-sm-item" onClick={() => launch('freecell')}>
                        <img src="/icons/freecell.png" alt="" style={{ width: 16, height: 16 }} />
                        <span>FreeCell</span>
                      </div>
                      <div className="xp-sm-item" onClick={() => launch('hearts')}>
                        <img src="/icons/heart.png" alt="" style={{ width: 16, height: 16 }} />
                        <span>Hearts</span>
                      </div>
                      <div className="xp-sm-item" onClick={() => launch('minesweeper')}>
                        <img src="/icons/minesweeper/mine-icon.png" alt="" style={{ width: 16, height: 16 }} />
                        <span>Minesweeper</span>
                      </div>
                      <div className="xp-sm-item" onClick={() => launch('solitaire')}>
                        <img src="/icons/solitaire.png" alt="" style={{ width: 16, height: 16 }} />
                        <span>Solitaire</span>
                      </div>
                      <div className="xp-sm-item" onClick={() => launch('spider')}>
                        <img src="/icons/spider.png" alt="" style={{ width: 16, height: 16 }} />
                        <span>Spider Solitaire</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* America Online Folder */}
                <div
                  className="xp-sm-item"
                  onMouseEnter={() => setActiveSubmenu('aol')}
                  style={{ justifyContent: 'space-between', position: 'relative' }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <img src="/icons/358(16x16).png" alt="" style={{ width: 16, height: 16 }} />
                    America Online
                  </span>
                  <span>▶</span>

                  {activeSubmenu === 'aol' && (
                    <div
                      style={{
                        position: 'absolute',
                        left: '100%',
                        bottom: -10,
                        width: 215,
                        background: '#fff',
                        border: '1px solid #4880d8',
                        borderLeft: '4px solid #4880d8',
                        boxShadow: '4px 4px 12px rgba(0,0,0,0.4)',
                        padding: 3,
                        color: '#000',
                      }}
                    >
                      <div className="xp-sm-item" onClick={() => launch('aol-dialer')}>
                        <img src="/icons/luna16/net_modem.png" alt="" style={{ width: 16, height: 16 }} />
                        <span>America Online 9.0 Dial-Up</span>
                      </div>
                      <div className="xp-sm-item" onClick={() => launch('aol-desktop')}>
                        <img src="/icons/luna16/net_internet.png" alt="" style={{ width: 16, height: 16 }} />
                        <span>AOL Desktop 9.8.2</span>
                      </div>
                      <div className="xp-sm-item" onClick={() => launch('aol-mailbox')}>
                        <img src="/icons/luna16/mail_unread.png" alt="" style={{ width: 16, height: 16 }} />
                        <span>AOL Mailbox (Gmail)</span>
                      </div>
                      <div className="xp-sm-item" onClick={() => launch('aim')}>
                        <img src="/icons/luna16/im.png" alt="" style={{ width: 16, height: 16 }} />
                        <span>AOL Instant Messenger 5.9</span>
                      </div>
                      <div className="xp-sm-item" onClick={() => launch('slingo')}>
                        <img src="/icons/slingo.svg" alt="" style={{ width: 16, height: 16 }} />
                        <span>AOL Slingo Deluxe</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="xp-sm-sep" />

                <div className="xp-sm-item" onMouseEnter={() => setActiveSubmenu(null)} onClick={() => launch('ie')}>
                  <img src="/icons/896(16x16).png" alt="" style={{ width: 16, height: 16 }} />
                  <span>Internet Explorer 6</span>
                </div>
                <div className="xp-sm-item" onMouseEnter={() => setActiveSubmenu(null)} onClick={() => launch('wmplayer')}>
                  <img src="/icons/846(16x16).png" alt="" style={{ width: 16, height: 16 }} />
                  <span>Windows Media Player</span>
                </div>

                {/* Newly Installed Programs */}
                {installedPackages.length > 0 && (
                  <>
                    <div className="xp-sm-sep" />
                    <div style={{ fontSize: 10, color: '#215dc6', fontWeight: 700, padding: '2px 6px' }}>
                      Newly Installed Programs
                    </div>
                    {installedPackages.map((pkg) => (
                      <div
                        key={pkg.id}
                        className="xp-sm-item"
                        onClick={() => launch(pkg.appId)}
                        style={{ background: '#fff7d6' }}
                      >
                        <img src={pkg.icon} alt="" style={{ width: 16, height: 16 }} />
                        <span style={{ fontWeight: 600 }}>{pkg.name}</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Blue Column: System Folders & Utilities */}
        <div className="xp-startmenu-right">
          <div className="xp-sm-item" onClick={() => launch('explorer', { folderId: 'my-docs' })}>
            <img src="/icons/308(32x32).png" alt="" style={{ width: 22, height: 22 }} />
            <span style={{ fontWeight: 700 }}>My Documents</span>
          </div>
          <div className="xp-sm-item" onClick={() => launch('explorer', { folderId: 'my-pics' })}>
            <img src="/icons/307(32x32).png" alt="" style={{ width: 22, height: 22 }} />
            <span style={{ fontWeight: 700 }}>My Pictures</span>
          </div>
          <div className="xp-sm-item" onClick={() => launch('explorer', { folderId: 'my-videos' })}>
            <img src="/icons/luna32/folder_videos.png" alt="" style={{ width: 22, height: 22 }} />
            <span style={{ fontWeight: 700 }}>My Videos</span>
          </div>
          <div className="xp-sm-item" onClick={() => launch('explorer', { folderId: 'my-music' })}>
            <img src="/icons/550(32x32).png" alt="" style={{ width: 22, height: 22 }} />
            <span style={{ fontWeight: 700 }}>My Music</span>
          </div>
          <div className="xp-sm-item" onClick={() => launch('explorer', { folderId: 'root' })}>
            <img src="/icons/676(32x32).png" alt="" style={{ width: 22, height: 22 }} />
            <span style={{ fontWeight: 700 }}>My Computer</span>
          </div>

          <div className="xp-sm-sep-right" />

          <div className="xp-sm-item" onClick={() => launch('control-panel')}>
            <img src="/icons/300(32x32).png" alt="" style={{ width: 22, height: 22 }} />
            <span>Control Panel</span>
          </div>
          <div className="xp-sm-item" onClick={() => launch('software-center')}>
            <img src="/icons/227(32x32).png" alt="" style={{ width: 22, height: 22 }} />
            <span>Add or Remove Programs</span>
          </div>
          <div className="xp-sm-item" onClick={() => launch('aol-dialer')}>
            <img src="/icons/309(32x32).png" alt="" style={{ width: 22, height: 22 }} />
            <span>Connect To (AOL 56K)</span>
          </div>

          <div className="xp-sm-sep-right" />

          <div className="xp-sm-item" onClick={() => launch('tour-xp')}>
            <img src="/icons/747(32x32).png" alt="" style={{ width: 22, height: 22 }} />
            <span>Help and Support</span>
          </div>
          <div className="xp-sm-item" onClick={() => launch('ie', { url: 'http://www.google.com' })}>
            <img src="/icons/299(32x32).png" alt="" style={{ width: 22, height: 22 }} />
            <span>Search the Web</span>
          </div>
          <div className="xp-sm-item" onClick={() => launch('run-dialog')}>
            <img src="/icons/743(32x32).png" alt="" style={{ width: 22, height: 22 }} />
            <span>Run...</span>
          </div>
        </div>
      </div>

      {/* Bottom Footer: Log Off & Turn Off Computer */}
      <div className="xp-startmenu-footer">
        <button
          className="xp-sm-footer-btn"
          onClick={() => {
            onClose();
            onShowModal('logoff');
          }}
        >
          <img src="/icons/546(32x32).png" alt="" style={{ width: 20, height: 20 }} />
          <span>Log Off</span>
        </button>
        <button
          className="xp-sm-footer-btn"
          onClick={() => {
            onClose();
            onShowModal('turnoff');
          }}
        >
          <img src="/icons/310(32x32).png" alt="" style={{ width: 20, height: 20 }} />
          <span>Turn Off Computer</span>
        </button>
      </div>
    </div>
  );
};

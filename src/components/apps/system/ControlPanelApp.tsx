import React, { useState } from 'react';
import { useOS, ScreensaverType, XPTheme } from '../../../context/OSContext';
import { useSound, SoundEffect } from '../../../context/SoundContext';
import { WindowsXPFlagSVG } from '../aol/AOLGraphics';

const WALLPAPERS = [
  { name: 'Bliss (Windows XP Default)', url: '/wallpapers/bliss.jpg' },
  { name: 'Windows 10 Hero Blue', url: '/wallpapers/win10-hero.svg' },
  { name: 'Mac OS X Aqua Aurora', url: '/wallpapers/macos-aqua.svg' },
  { name: 'GNU/Linux Tux Night', url: '/wallpapers/linux-tux.svg' },
  { name: 'Debian 12 Bookworm Emerald', url: '/wallpapers/debian-bookworm.svg' },
  { name: 'CentOS Enterprise Facets', url: '/wallpapers/centos-stream.svg' },
  { name: 'Azul', url: '/wallpapers/azul.jpg' },
  { name: 'Ascent', url: '/wallpapers/ascent.jpg' },
  { name: 'Autumn', url: '/wallpapers/autumn.jpg' },
  { name: 'Tulips', url: '/wallpapers/tulips.jpg' },
  { name: 'Red Moon Desert', url: '/wallpapers/redmoon.jpg' },
  { name: 'Vortec Space', url: '/wallpapers/vortec.jpg' },
  { name: 'Peace', url: '/wallpapers/peace.jpg' },
  { name: 'Stonehenge', url: '/wallpapers/stoneh.jpg' },
  { name: 'Crystal', url: '/wallpapers/crystal.jpg' },
  { name: 'Radiance', url: '/wallpapers/radiance.jpg' },
  { name: 'Wind', url: '/wallpapers/wind.jpg' },
];

const AVATARS = [
  'chess',
  'duck',
  'frog',
  'dog',
  'cat',
  'skater',
  'soccer',
  'guitar',
  'astro',
  'butterfl',
  'beach',
  'car',
];

const SOUND_TESTS: Array<{ label: string; effect: SoundEffect }> = [
  { label: '🎵 Windows XP Startup', effect: 'startup' },
  { label: '🎵 Windows XP Shutdown', effect: 'shutdown' },
  { label: '🔑 Windows Logon', effect: 'logon' },
  { label: '🔒 Windows Logoff', effect: 'logoff' },
  { label: '📬 AOL "You\'ve Got Mail!"', effect: 'youveGotMail' },
  { label: '💬 XP Balloon Notification', effect: 'balloon' },
  { label: '🔔 XP Ding', effect: 'ding' },
  { label: '❌ XP Error / Critical Stop', effect: 'error' },
  { label: '⚠️ XP Exclamation', effect: 'exclamation' },
  { label: '🗑️ Empty Recycle Bin', effect: 'recycle' },
  { label: '🔌 Hardware Insert', effect: 'hardwareInsert' },
  { label: '🏃 AIM Receive IM', effect: 'aimReceive' },
];

export const ControlPanelApp: React.FC<{ payload?: Record<string, unknown> }> = ({ payload }) => {
  const {
    username,
    setUsername,
    userAvatar,
    setUserAvatar,
    theme,
    setTheme,
    wallpaper,
    setWallpaper,
    screensaver,
    setScreensaver,
    setScreensaverActive,
    openApp,
  } = useOS();
  const { volume, muted, setVolume, setMuted, playSound, startModemHandshake, stopModemHandshake } = useSound();

  const [section, setSection] = useState<'home' | 'display' | 'sounds' | 'users' | 'system' | 'security' | 'datetime'>(
    (payload?.section as 'home') || 'home'
  );
  const [nameInput, setNameInput] = useState(username);

  const handleCustomWallpaper = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setWallpaper(String(reader.result || ''));
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#ece9d8', fontSize: 11, minHeight: 0 }}>
      {section !== 'home' && (
        <div style={{ padding: '5px 10px', borderBottom: '1px solid #aca899', display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="xp-btn" onClick={() => setSection('home')}>
            ← Control Panel Home
          </button>
        </div>
      )}

      {/* Authentic Royal Blue XP Category Home */}
      {section === 'home' && (
        <div
          style={{
            flex: 1,
            background: 'linear-gradient(180deg, #5a7edc 0%, #4668c5 100%)',
            padding: '22px 28px',
            color: '#fff',
            overflowY: 'auto',
          }}
        >
          <h2 style={{ margin: '0 0 18px', fontSize: 20, fontWeight: 700 }}>Pick a category</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            {[
              {
                title: 'Appearance and Themes',
                desc: 'Change Desktop Bliss wallpaper, Luna Blue/Olive/Silver themes, or Screen Saver',
                icon: '/icons/luna48/control_display.png',
                action: () => setSection('display'),
              },
              {
                title: 'Add or Remove Programs',
                desc: 'Install new .EXE programs, custom web apps, or uninstall software',
                icon: '/icons/luna48/file_generic_installer.png',
                action: () => openApp('software-center'),
              },
              {
                title: 'Sounds, Speech, and Audio Devices',
                desc: 'Adjust master volume and preview all Windows XP & AOL sounds',
                icon: '/icons/luna48/volume_on.png',
                action: () => setSection('sounds'),
              },
              {
                title: 'Network and Internet Connections',
                desc: 'America Online 56K Dial-Up Modem & Gmail Mailbox Bridge',
                icon: '/icons/luna48/net_modem.png',
                action: () => openApp('aol-dialer'),
              },
              {
                title: 'User Accounts',
                desc: 'Change user name and classic Windows XP account picture',
                icon: '/icons/luna48/people.png',
                action: () => setSection('users'),
              },
              {
                title: 'Performance and Maintenance',
                desc: 'View Windows XP Professional Service Pack 3 System Properties',
                icon: '/icons/luna48/computer.png',
                action: () => setSection('system'),
              },
              {
                title: 'Security Center',
                desc: 'Check Windows Firewall, Automatic Updates, and Virus Protection',
                icon: '/icons/luna48/secure_safe.png',
                action: () => setSection('security'),
              },
              {
                title: 'Date, Time, Language, and Regional Options',
                desc: 'View system calendar and local clock settings',
                icon: '/icons/luna48/calendar.png',
                action: () => setSection('datetime'),
              },
            ].map((cat) => (
              <div
                key={cat.title}
                onClick={cat.action}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: 10,
                  borderRadius: 6,
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.22)',
                  cursor: 'pointer',
                }}
              >
                <img src={cat.icon} alt="" style={{ width: 40, height: 40 }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{cat.title}</div>
                  <div style={{ fontSize: 11, color: '#dbeafe', marginTop: 2 }}>{cat.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Display Properties */}
      {section === 'display' && (
        <div style={{ flex: 1, padding: 16, overflowY: 'auto', display: 'grid', gridTemplateColumns: '230px 1fr', gap: 18 }}>
          {/* Monitor Preview */}
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: 210,
                height: 155,
                margin: '0 auto 12px',
                border: '10px solid #475569',
                borderRadius: 8,
                backgroundImage: `url("${wallpaper}")`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
              }}
            />
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Windows XP Color Scheme:</div>
            <select
              className="xp-select"
              style={{ width: '100%', marginBottom: 12 }}
              value={theme}
              onChange={(e) => setTheme(e.target.value as XPTheme)}
            >
              <option value="blue">Default (Luna Blue)</option>
              <option value="olive">Olive Green</option>
              <option value="silver">Silver</option>
              <option value="royale">Royale (Media Center Glossy)</option>
              <option value="zune">Zune (Dark Charcoal & Orange)</option>
            </select>

            <div style={{ fontWeight: 700, marginBottom: 6 }}>Screen Saver:</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <select
                className="xp-select"
                style={{ flex: 1 }}
                value={screensaver}
                onChange={(e) => setScreensaver(e.target.value as ScreensaverType)}
              >
                <option value="maze3d">3D Brick Maze (Windows 95 OpenGL)</option>
                <option value="pipes3d">3D Metallic Pipes (Windows 98/XP)</option>
                <option value="starfield">3D Starfield</option>
                <option value="xpflag">Windows XP Logo</option>
                <option value="mystify">Mystify Polygons</option>
                <option value="none">(None)</option>
              </select>
              <button className="xp-btn" onClick={() => setScreensaverActive(true)}>
                Preview
              </button>
            </div>
          </div>

          {/* Wallpaper List */}
          <div>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Select Desktop Background:</div>
            <div
              style={{
                height: 230,
                background: '#fff',
                border: '1px solid #7f9db9',
                overflowY: 'auto',
                padding: 4,
                marginBottom: 10,
              }}
            >
              {WALLPAPERS.map((wp) => (
                <div
                  key={wp.url}
                  onClick={() => setWallpaper(wp.url)}
                  style={{
                    padding: '4px 8px',
                    cursor: 'pointer',
                    background: wallpaper === wp.url ? '#316ac5' : 'transparent',
                    color: wallpaper === wp.url ? '#fff' : '#000',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <span>🖼️</span>
                  <span>{wp.name}</span>
                </div>
              ))}
            </div>
            <label className="xp-btn" style={{ cursor: 'pointer' }}>
              Browse Custom Image...
              <input type="file" accept="image/*" hidden onChange={handleCustomWallpaper} />
            </label>
          </div>
        </div>
      )}

      {/* Sounds and Audio Devices */}
      {section === 'sounds' && (
        <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
          <div className="xp-tab-panel" style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Device Volume</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <img src="/icons/luna48/volume_on.png" alt="" style={{ width: 38, height: 38 }} />
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(volume * 100)}
                onChange={(e) => setVolume(Number(e.target.value) / 100)}
                style={{ width: 220 }}
              />
              <span>{Math.round(volume * 100)}%</span>
              <label style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <input type="checkbox" checked={muted} onChange={(e) => setMuted(e.target.checked)} />
                Mute all sounds
              </label>
            </div>
          </div>

          <div className="xp-tab-panel">
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
              Windows XP & America Online Sound Scheme Tester (Click to Play)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {SOUND_TESTS.map((st) => (
                <button key={st.effect} className="xp-btn" onClick={() => playSound(st.effect)}>
                  ▶ {st.label}
                </button>
              ))}
              <button className="xp-btn" onClick={startModemHandshake}>
                ▶ 📞 56K Modem Screech
              </button>
              <button className="xp-btn" onClick={stopModemHandshake}>
                ⏹ Stop Modem Audio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Accounts */}
      {section === 'users' && (
        <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
          <div className="xp-tab-panel">
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
              <img
                src={userAvatar}
                alt=""
                style={{ width: 58, height: 58, borderRadius: 5, border: '2px solid #316ac5' }}
              />
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{username}</div>
                <div style={{ color: '#555' }}>Computer administrator</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
              <b>Account Name:</b>
              <input className="xp-input" value={nameInput} onChange={(e) => setNameInput(e.target.value)} />
              <button className="xp-btn xp-btn-primary" onClick={() => setUsername(nameInput)}>
                Change Name
              </button>
            </div>

            <div style={{ fontWeight: 700, marginBottom: 8 }}>Pick a new picture for your account:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {AVATARS.map((av) => {
                const url = `/userpics/${av}.bmp`;
                return (
                  <img
                    key={av}
                    src={url}
                    alt={av}
                    onClick={() => setUserAvatar(url)}
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 4,
                      border: userAvatar === url ? '3px solid #2563eb' : '1px solid #999',
                      cursor: 'pointer',
                    }}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* System Properties */}
      {section === 'system' && (
        <div style={{ flex: 1, padding: 20, display: 'grid', gridTemplateColumns: '140px 1fr', gap: 20, alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <WindowsXPFlagSVG size={84} />
          </div>
          <div style={{ lineHeight: 1.7, fontSize: 12 }}>
            <b>System:</b>
            <div style={{ paddingLeft: 14 }}>
              Microsoft Windows XP
              <br />
              Professional
              <br />
              Version 2002
              <br />
              Service Pack 3
            </div>
            <b style={{ display: 'block', marginTop: 10 }}>Registered to:</b>
            <div style={{ paddingLeft: 14 }}>
              {username}
              <br />
              55274-OEM-0011903-00102
            </div>
            <b style={{ display: 'block', marginTop: 10 }}>Computer:</b>
            <div style={{ paddingLeft: 14 }}>
              Intel(R) Pentium(R) 4 CPU 2.80GHz
              <br />
              2.80 GHz, 512 MB of RAM
            </div>
          </div>
        </div>
      )}

      {/* Security Center */}
      {section === 'security' && (
        <div style={{ flex: 1, padding: 18 }}>
          <div className="xp-tab-panel">
            <h3 style={{ margin: '0 0 10px', color: '#15803d' }}>🛡️ Windows XP Security Essentials</h3>
            <p>🟢 <b>Firewall:</b> ON — Protecting your 56K AOL & Internet Explorer 6 connections.</p>
            <p>🟢 <b>Automatic Updates:</b> ON — Service Pack 3 + Arena AI Copilot installed.</p>
            <p>🟢 <b>Virus Protection:</b> ON — All Softpedia & Software Installer packages verified safe.</p>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="xp-btn xp-btn-primary" onClick={() => openApp('windows-update')}>
                🛡️ Open Microsoft Windows Update
              </button>
              <button className="xp-btn" onClick={() => openApp('arena-ai')}>
                ✨ Open Arena AI Agent
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Date and Time */}
      {section === 'datetime' && (
        <div style={{ flex: 1, padding: 18 }}>
          <div className="xp-tab-panel" style={{ textAlign: 'center', padding: 24 }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#0c357a' }}>
              {new Date().toLocaleTimeString()}
            </div>
            <div style={{ fontSize: 14, marginTop: 6 }}>
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>
            <div style={{ marginTop: 10, color: '#555' }}>Time zone: Coordinated Universal / Local Browser Time</div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import {
  useOS,
  INSTALLABLE_CATALOG,
  InstallablePackage,
} from '../../../context/OSContext';

const CUSTOM_ICONS = [
  '/icons/luna48/file_generic_executable.png',
  '/icons/luna48/gamepad.png',
  '/icons/luna48/file_html.png',
  '/icons/luna48/media_player.png',
  '/icons/luna48/net_internet.png',
  '/icons/winamp.png',
];

export const SoftwareCenter: React.FC = () => {
  const {
    installedPackages,
    launchInstallerWizard,
    uninstallPackage,
    openApp,
  } = useOS();

  const [tab, setTab] = useState<'catalog' | 'installed' | 'custom'>('catalog');
  const [customName, setCustomName] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [customHtml, setCustomHtml] = useState('');
  const [customIcon, setCustomIcon] = useState(CUSTOM_ICONS[0]);

  const handleInstallCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;
    if (!customUrl.trim() && !customHtml.trim()) return;

    const slug = `${Date.now().toString(36)}`;
    const pkg: InstallablePackage = {
      id: `custom-pkg-${slug}`,
      appId: `custom:${slug}`,
      name: customName.trim(),
      version: '1.0',
      publisher: 'Custom User Installer',
      installerFile: `${customName.trim().replace(/\s+/g, '_')}_setup.exe`,
      sizeMB: 1.5,
      icon: customIcon,
      category: 'Custom',
      description: customUrl
        ? `Custom installed Web Application pointing to ${customUrl}`
        : 'Custom uploaded HTML5 Windows XP Application',
      customUrl: customUrl.trim() || undefined,
      customHtml: customHtml || undefined,
    };
    launchInstallerWizard(pkg);
    setCustomName('');
    setCustomUrl('');
    setCustomHtml('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!customName) setCustomName(file.name.replace(/\.[^.]+$/, ''));
    const reader = new FileReader();
    reader.onload = () => {
      setCustomHtml(String(reader.result || ''));
    };
    reader.readAsText(file);
  };

  return (
    <div style={{ flex: 1, display: 'flex', background: '#ece9d8', fontSize: 11, minHeight: 0 }}>
      {/* Authentic Left Vertical XP Add/Remove Sidebar */}
      <div
        style={{
          width: 118,
          background: 'linear-gradient(180deg, #6b88c4 0%, #4d6bb3 100%)',
          padding: 6,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          borderRight: '1px solid #3c548c',
        }}
      >
        {[
          { id: 'catalog' as const, label: 'Add New Programs (.EXE)', icon: '/icons/luna32/file_generic_installer.png' },
          { id: 'installed' as const, label: `Change or Remove (${installedPackages.length})`, icon: '/icons/luna32/folder_programs.png' },
          { id: 'custom' as const, label: 'Install Custom App / HTML', icon: '/icons/luna32/file_html.png' },
        ].map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 5,
                padding: '9px 6px',
                borderRadius: 5,
                border: active ? '1px solid #f59e0b' : '1px solid transparent',
                background: active ? '#fff' : 'rgba(255,255,255,0.12)',
                color: active ? '#0b2d6b' : '#fff',
                fontWeight: 700,
                fontSize: 10,
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              <img src={item.icon} alt="" style={{ width: 28, height: 28 }} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Right Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: 12 }}>
        {tab === 'catalog' && (
          <>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0c357a' }}>
                Add Programs from XP Software Catalog
              </div>
              <div style={{ color: '#475569' }}>
                Click <b>Install (.EXE)</b> on any program below to launch its multi-step Windows XP InstallShield Setup
                Wizard! Installed programs appear on your Desktop, Start → All Programs, and <code>C:\Program Files</code>.
              </div>
            </div>

            <div
              style={{
                flex: 1,
                background: '#fff',
                border: '1px solid #7f9db9',
                overflowY: 'auto',
                padding: 8,
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              {INSTALLABLE_CATALOG.map((pkg) => {
                const isInstalled = installedPackages.some((p) => p.id === pkg.id);
                return (
                  <div
                    key={pkg.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      padding: '8px 10px',
                      borderRadius: 4,
                      border: '1px solid #dbe4f0',
                      background: isInstalled ? '#f0fdf4' : '#f8fafc',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                      <img src={pkg.icon} alt="" style={{ width: 34, height: 34, objectFit: 'contain' }} />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 12 }}>
                          {pkg.name} <span style={{ fontWeight: 400, color: '#64748b' }}>v{pkg.version}</span>
                        </div>
                        <div style={{ color: '#334155', marginTop: 2 }}>{pkg.description}</div>
                        <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
                          Installer: <code>{pkg.installerFile}</code> • Size: {pkg.sizeMB} MB • Publisher: {pkg.publisher}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      {isInstalled ? (
                        <>
                          <button className="xp-btn xp-btn-primary" onClick={() => openApp(pkg.appId)}>
                            Open App
                          </button>
                          <button className="xp-btn" onClick={() => uninstallPackage(pkg.id)}>
                            Remove
                          </button>
                        </>
                      ) : (
                        <button
                          className="xp-btn xp-btn-primary"
                          onClick={() => launchInstallerWizard(pkg)}
                        >
                          ⬇ Install (.EXE)
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {tab === 'installed' && (
          <>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0c357a' }}>
                Currently Installed Programs ({installedPackages.length})
              </div>
              <div style={{ color: '#475569' }}>
                Manage, launch, or uninstall software packages installed in <code>C:\Program Files</code>.
              </div>
            </div>

            <div
              style={{
                flex: 1,
                background: '#fff',
                border: '1px solid #7f9db9',
                overflowY: 'auto',
                padding: 8,
              }}
            >
              {installedPackages.length === 0 ? (
                <div style={{ padding: 28, textAlign: 'center', color: '#64748b' }}>
                  No third-party packages installed yet. Click <b>Add New Programs (.EXE)</b> on the left to install
                  Winamp 2.91, Retro Arcade Pack, WinRAR, mIRC, Code Studio, or custom apps!
                </div>
              ) : (
                installedPackages.map((pkg) => (
                  <div
                    key={pkg.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderBottom: '1px solid #e2e8f0',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <img src={pkg.icon} alt="" style={{ width: 28, height: 28 }} />
                      <div>
                        <div style={{ fontWeight: 700 }}>
                          {pkg.name} {pkg.version}
                        </div>
                        <div style={{ fontSize: 10, color: '#64748b' }}>
                          {pkg.publisher} • Size: {pkg.sizeMB} MB
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="xp-btn" onClick={() => openApp(pkg.appId)}>
                        Launch
                      </button>
                      <button className="xp-btn" onClick={() => uninstallPackage(pkg.id)}>
                        Change/Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {tab === 'custom' && (
          <form
            onSubmit={handleInstallCustom}
            style={{
              flex: 1,
              background: '#fff',
              border: '1px solid #7f9db9',
              padding: 14,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0c357a' }}>
                Install Custom Web App or Upload .HTML Application
              </div>
              <div style={{ color: '#475569' }}>
                Turn any website URL or local <code>.html</code> file into a native Windows XP application with Desktop &
                Start Menu icons!
              </div>
            </div>

            <div>
              <label style={{ fontWeight: 700, display: 'block', marginBottom: 3 }}>Application Name:</label>
              <input
                required
                className="xp-input"
                style={{ width: '100%' }}
                placeholder="e.g., Wikipedia Encyclopedia / My Retro Game"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontWeight: 700, display: 'block', marginBottom: 3 }}>
                Option A — Website / Web App URL (Embeddable):
              </label>
              <input
                className="xp-input"
                style={{ width: '100%' }}
                placeholder="https://en.m.wikipedia.org/wiki/Windows_XP"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontWeight: 700, display: 'block', marginBottom: 3 }}>
                Option B — Upload a Local <code>.html</code> App File from Your PC:
              </label>
              <input type="file" accept=".html,.htm" onChange={handleFileUpload} />
              {customHtml && (
                <span style={{ color: '#15803d', fontWeight: 700, marginLeft: 8 }}>
                  ✓ Loaded HTML ({customHtml.length} chars)
                </span>
              )}
            </div>

            <div>
              <label style={{ fontWeight: 700, display: 'block', marginBottom: 5 }}>Choose Windows XP Icon:</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {CUSTOM_ICONS.map((ic) => (
                  <div
                    key={ic}
                    onClick={() => setCustomIcon(ic)}
                    style={{
                      padding: 5,
                      borderRadius: 4,
                      border: customIcon === ic ? '2px solid #2563eb' : '1px solid #cbd5e1',
                      background: customIcon === ic ? '#eff6ff' : '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    <img src={ic} alt="" style={{ width: 28, height: 28 }} />
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="xp-btn xp-btn-primary">
                🚀 Generate & Run Setup.exe Wizard
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

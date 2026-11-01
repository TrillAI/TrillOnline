import React, { useState, useEffect } from 'react';
import {
  useOS,
  INSTALLABLE_CATALOG,
  InstallablePackage,
} from '../../../context/OSContext';

interface SetupWizardProps {
  windowId: string;
  payload?: Record<string, unknown>;
}

export const SetupWizard: React.FC<SetupWizardProps> = ({ windowId, payload }) => {
  const { completePackageInstall, closeWindow, openApp } = useOS();

  const resolvedPkg: InstallablePackage =
    (payload?.pkg as InstallablePackage) ||
    INSTALLABLE_CATALOG.find((p) => p.id === payload?.pkgId) ||
    INSTALLABLE_CATALOG[0];

  const [step, setStep] = useState<'welcome' | 'license' | 'options' | 'installing' | 'done'>('welcome');
  const [accepted, setAccepted] = useState(true);
  const [desktopShortcut, setDesktopShortcut] = useState(true);
  const [launchAfter, setLaunchAfter] = useState(true);
  const [progress, setProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState('');

  useEffect(() => {
    if (step !== 'installing') return;
    const files = [
      `C:\\Program Files\\${resolvedPkg.name}\\${resolvedPkg.installerFile}`,
      `C:\\Program Files\\${resolvedPkg.name}\\core32.dll`,
      `C:\\Program Files\\${resolvedPkg.name}\\skin_luna.dat`,
      `C:\\Program Files\\${resolvedPkg.name}\\audio_drv.dll`,
      `C:\\Program Files\\${resolvedPkg.name}\\readme.txt`,
      `Registering HKLM\\SOFTWARE\\${resolvedPkg.publisher}\\${resolvedPkg.name}...`,
    ];
    let p = 0;
    const iv = window.setInterval(() => {
      p += 9;
      const fIdx = Math.min(files.length - 1, Math.floor((p / 100) * files.length));
      setCurrentFile(files[fIdx]);
      if (p >= 100) {
        clearInterval(iv);
        setProgress(100);
        completePackageInstall(resolvedPkg, desktopShortcut);
        window.setTimeout(() => setStep('done'), 320);
      } else {
        setProgress(p);
      }
    }, 170);
    return () => clearInterval(iv);
  }, [step, resolvedPkg, desktopShortcut, completePackageInstall]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#ece9d8', fontSize: 11 }}>
      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {step === 'welcome' || step === 'done' ? (
          <>
            {/* Classic InstallShield Deep Blue Left Banner */}
            <div
              style={{
                width: 158,
                background: 'linear-gradient(180deg, #0a246a 0%, #1e4ea8 60%, #3a7bd5 100%)',
                padding: 16,
                color: '#fff',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderRight: '1px solid #999',
              }}
            >
              <div style={{ textAlign: 'center', marginTop: 12 }}>
                <img
                  src={resolvedPkg.icon}
                  alt=""
                  style={{ width: 54, height: 54, objectFit: 'contain', filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.5))' }}
                />
                <div style={{ fontWeight: 700, marginTop: 8, fontSize: 12 }}>{resolvedPkg.name}</div>
                <div style={{ fontSize: 10, opacity: 0.8 }}>v{resolvedPkg.version}</div>
              </div>
              <div style={{ fontSize: 10, opacity: 0.75, textAlign: 'center' }}>
                InstallShield® Wizard
                <br />
                Windows XP Certified
              </div>
            </div>

            <div style={{ flex: 1, background: '#fff', padding: '20px 22px' }}>
              {step === 'welcome' ? (
                <>
                  <h3 style={{ margin: '0 0 10px', fontSize: 15, color: '#000' }}>
                    Welcome to the {resolvedPkg.name} {resolvedPkg.version} Setup Wizard
                  </h3>
                  <p style={{ lineHeight: 1.5, color: '#333' }}>
                    This wizard will guide you through the installation of <b>{resolvedPkg.name}</b> ({resolvedPkg.sizeMB} MB)
                    by {resolvedPkg.publisher} onto your Windows XP computer.
                  </p>
                  <p style={{ lineHeight: 1.5, color: '#333' }}>{resolvedPkg.description}</p>
                  <p style={{ marginTop: 18, color: '#555' }}>
                    It is recommended that you close all other applications before starting Setup. Click <b>Next</b> to
                    continue.
                  </p>
                </>
              ) : (
                <>
                  <h3 style={{ margin: '0 0 10px', fontSize: 15, color: '#000' }}>
                    Completing the {resolvedPkg.name} Setup Wizard
                  </h3>
                  <p style={{ lineHeight: 1.5, color: '#333' }}>
                    <b>{resolvedPkg.name}</b> has been installed on your computer inside{' '}
                    <code>C:\Program Files\{resolvedPkg.name}</code> and added to <b>Start → All Programs</b>!
                  </p>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 18, cursor: 'pointer', fontWeight: 700 }}>
                    <input
                      type="checkbox"
                      checked={launchAfter}
                      onChange={(e) => setLaunchAfter(e.target.checked)}
                    />
                    Run {resolvedPkg.name} now
                  </label>
                  <p style={{ marginTop: 22, color: '#555' }}>Click <b>Finish</b> to close Setup.</p>
                </>
              )}
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* White Wizard Sub-header */}
            <div
              style={{
                background: '#fff',
                borderBottom: '1px solid #aca899',
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 12 }}>
                  {step === 'license'
                    ? 'License Agreement'
                    : step === 'options'
                    ? 'Choose Install Location & Shortcuts'
                    : 'Installing Files...'}
                </div>
                <div style={{ color: '#555', fontSize: 11 }}>
                  {step === 'license'
                    ? `Please review the license terms before installing ${resolvedPkg.name}.`
                    : step === 'options'
                    ? `Choose the folder in which to install ${resolvedPkg.name}.`
                    : `Please wait while ${resolvedPkg.name} is being installed.`}
                </div>
              </div>
              <img src={resolvedPkg.icon} alt="" style={{ width: 32, height: 32, objectFit: 'contain' }} />
            </div>

            <div style={{ flex: 1, padding: '14px 18px' }}>
              {step === 'license' && (
                <>
                  <textarea
                    readOnly
                    className="xp-textarea"
                    style={{ width: '100%', height: 155, resize: 'none', marginBottom: 10 }}
                    value={`END-USER SOFTWARE LICENSE AGREEMENT
${resolvedPkg.name} Version ${resolvedPkg.version}
Publisher: ${resolvedPkg.publisher}

1. GRANT OF LICENSE: You are granted a perpetual nostalgic license to install and run ${resolvedPkg.name} on Microsoft Windows XP Professional.
2. FEATURES: Includes full desktop integration, Start Menu shortcuts, and clean uninstallation via Control Panel -> Add or Remove Programs.`}
                  />
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5, cursor: 'pointer' }}>
                    <input type="radio" checked={accepted} onChange={() => setAccepted(true)} />I accept the terms in
                    the License Agreement
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input type="radio" checked={!accepted} onChange={() => setAccepted(false)} />I do not accept the
                    terms in the License Agreement
                  </label>
                </>
              )}

              {step === 'options' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>Destination Folder:</div>
                    <input
                      readOnly
                      className="xp-input"
                      style={{ width: '100%', background: '#f8f8f5' }}
                      value={`C:\\Program Files\\${resolvedPkg.name} ${resolvedPkg.version}`}
                    />
                  </div>
                  <div style={{ borderTop: '1px solid #d4d0c8', paddingTop: 10 }}>
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>Additional Icons:</div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={desktopShortcut}
                        onChange={(e) => setDesktopShortcut(e.target.checked)}
                      />
                      Create a <b>Desktop</b> icon
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                      <input type="checkbox" checked readOnly />
                      Create a <b>Start Menu → All Programs</b> shortcut
                    </label>
                  </div>
                  <div style={{ color: '#555', marginTop: 8 }}>
                    Space required: {resolvedPkg.sizeMB} MB &nbsp;|&nbsp; Space available on C:\: 64.2 GB
                  </div>
                </div>
              )}

              {step === 'installing' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
                  <div style={{ fontWeight: 700 }}>Extracting: {currentFile}</div>
                  {/* Authentic Chunky Green Windows XP Progress Bar */}
                  <div
                    style={{
                      height: 20,
                      background: '#fff',
                      border: '1px solid #686868',
                      borderRadius: 3,
                      padding: 2,
                      display: 'flex',
                      gap: 2,
                    }}
                  >
                    {Array.from({ length: Math.floor(progress / 5) }).map((_, idx) => (
                      <div
                        key={idx}
                        style={{
                          width: '4.6%',
                          height: '100%',
                          background: 'linear-gradient(180deg, #8df27e 0%, #2fc223 55%, #1f9116 100%)',
                          borderRadius: 1,
                        }}
                      />
                    ))}
                  </div>
                  <div style={{ color: '#555' }}>{progress}% complete</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Wizard Navigation Buttons */}
      <div
        style={{
          height: 44,
          borderTop: '1px solid #aca899',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 8,
          padding: '0 14px',
        }}
      >
        {step === 'welcome' && (
          <>
            <button className="xp-btn xp-btn-primary" onClick={() => setStep('license')}>
              Next &gt;
            </button>
            <button className="xp-btn" onClick={() => closeWindow(windowId)}>
              Cancel
            </button>
          </>
        )}
        {step === 'license' && (
          <>
            <button className="xp-btn" onClick={() => setStep('welcome')}>
              &lt; Back
            </button>
            <button
              className="xp-btn xp-btn-primary"
              disabled={!accepted}
              onClick={() => setStep('options')}
            >
              Next &gt;
            </button>
            <button className="xp-btn" onClick={() => closeWindow(windowId)}>
              Cancel
            </button>
          </>
        )}
        {step === 'options' && (
          <>
            <button className="xp-btn" onClick={() => setStep('license')}>
              &lt; Back
            </button>
            <button className="xp-btn xp-btn-primary" onClick={() => setStep('installing')}>
              Install &gt;
            </button>
            <button className="xp-btn" onClick={() => closeWindow(windowId)}>
              Cancel
            </button>
          </>
        )}
        {step === 'installing' && (
          <button className="xp-btn" disabled>
            Installing...
          </button>
        )}
        {step === 'done' && (
          <button
            className="xp-btn xp-btn-primary"
            onClick={() => {
              if (launchAfter) openApp(resolvedPkg.appId);
              closeWindow(windowId);
            }}
          >
            Finish
          </button>
        )}
      </div>
    </div>
  );
};

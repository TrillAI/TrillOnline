import React, { useState, useEffect, useRef } from 'react';
import { SoundProvider } from './context/SoundContext';
import { OSProvider, useOS, WindowInstance } from './context/OSContext';
import { BootSequence } from './components/boot/BootSequence';
import { WelcomeScreen } from './components/boot/WelcomeScreen';
import { ShutdownModal } from './components/boot/ShutdownModal';
import { Screensaver } from './components/boot/Screensaver';
import { Desktop } from './components/shell/Desktop';
import { WindowFrame } from './components/shell/WindowFrame';
import { Taskbar } from './components/shell/Taskbar';

// AOL + AIM + Gmail
import { AOLDialerModal } from './components/apps/aol/AOLDialerModal';
import { AOLDesktop } from './components/apps/aol/AOLDesktop';
import { AOLMailbox } from './components/apps/aol/AOLMailbox';
import { AIMMessenger } from './components/apps/aol/AIMMessenger';

// Classic AOL Slingo + Original Windows XP Games
import { SlingoApp } from './components/apps/games/SlingoApp';
import { PinballApp } from './components/apps/games/PinballApp';
import { MinesweeperApp } from './components/apps/games/MinesweeperApp';
import { SolitaireApp } from './components/apps/games/SolitaireApp';
import { SpiderSolitaireApp } from './components/apps/games/SpiderSolitaireApp';
import { FreeCellApp } from './components/apps/games/FreeCellApp';
import { HeartsApp } from './components/apps/games/HeartsApp';
import {
  SkiFreeApp,
  JezzBallApp,
  MahjongTitansApp,
  CheckersXPApp,
  TetrisXPApp,
} from './components/apps/games/ExtraClassicGames';

// Arena AI Agent & Windows Update
import { ArenaAgentApp } from './components/apps/arena/ArenaAgentApp';
import { WindowsUpdateApp } from './components/apps/system/WindowsUpdateApp';

// Software Installer & Installable Apps
import { SoftwareCenter } from './components/apps/installer/SoftwareCenter';
import { SetupWizard } from './components/apps/installer/SetupWizard';
import {
  WinampApp,
  ArcadePackApp,
  WinRARApp,
  MIRCApp,
  CodeStudioApp,
  LimeWireApp,
  BonziSettingsApp,
  HyperCamApp,
  CustomWebAppRunner,
} from './components/apps/installer/InstalledApps';

// System & Accessories
import { ExplorerApp } from './components/apps/system/ExplorerApp';
import { InternetExplorerApp } from './components/apps/system/InternetExplorerApp';
import { ControlPanelApp } from './components/apps/system/ControlPanelApp';
import {
  NotepadApp,
  PaintApp,
  CalculatorApp,
  PictureViewerApp,
} from './components/apps/system/AccessoriesApps';
import {
  MediaPlayerApp,
  CommandPromptApp,
  TaskManagerApp,
  RunDialogApp,
  TourXPApp,
} from './components/apps/system/SystemUtilitiesApps';
import { PowerShellApp } from './components/apps/system/PowerShellApp';
import {
  TrillXPMuseumApp,
  TrillXPApkApp,
  WordPadApp,
  RegeditApp,
  WinVerApp,
} from './components/apps/system/TrillXPApps';

const renderAppContent = (win: WindowInstance) => {
  switch (win.appId) {
    case 'explorer':
      return <ExplorerApp windowId={win.id} payload={win.payload} />;
    case 'recycle-bin':
      return <ExplorerApp windowId={win.id} isRecycleBin payload={win.payload} />;
    case 'ie':
      return <InternetExplorerApp windowId={win.id} payload={win.payload} />;
    case 'aol-dialer':
      return <AOLDialerModal windowId={win.id} />;
    case 'aol-desktop':
      return <AOLDesktop />;
    case 'aol-mailbox':
      return (
        <AOLMailbox
          initialTab={(win.payload?.tab as 'mail' | 'write' | 'connect') || 'mail'}
        />
      );
    case 'aim':
      return <AIMMessenger />;
    case 'slingo':
      return <SlingoApp />;
    case 'arena-ai':
      return <ArenaAgentApp initialPrompt={win.payload?.prompt as string | undefined} />;
    case 'windows-update':
      return <WindowsUpdateApp />;
    case 'pinball':
      return <PinballApp />;
    case 'minesweeper':
      return <MinesweeperApp />;
    case 'solitaire':
      return <SolitaireApp />;
    case 'spider':
      return <SpiderSolitaireApp />;
    case 'freecell':
      return <FreeCellApp />;
    case 'hearts':
      return <HeartsApp />;
    case 'skifree':
      return <SkiFreeApp />;
    case 'jezzball':
      return <JezzBallApp />;
    case 'mahjong':
      return <MahjongTitansApp />;
    case 'checkers':
      return <CheckersXPApp />;
    case 'tetris':
      return <TetrisXPApp />;
    case 'notepad':
      return <NotepadApp windowId={win.id} payload={win.payload} />;
    case 'wordpad':
      return <WordPadApp payload={win.payload} />;
    case 'paint':
      return <PaintApp />;
    case 'calculator':
      return <CalculatorApp />;
    case 'picture-viewer':
      return <PictureViewerApp payload={win.payload} />;
    case 'wmplayer':
      return <MediaPlayerApp payload={win.payload} />;
    case 'cmd':
      return <CommandPromptApp />;
    case 'powershell':
      return <PowerShellApp />;
    case 'regedit':
      return <RegeditApp />;
    case 'winver':
      return <WinVerApp windowId={win.id} />;
    case 'trillxp-museum':
      return <TrillXPMuseumApp />;
    case 'apk-installer':
      return <TrillXPApkApp />;
    case 'taskmgr':
      return <TaskManagerApp />;
    case 'control-panel':
      return <ControlPanelApp payload={win.payload} />;
    case 'software-center':
      return <SoftwareCenter />;
    case 'setup-wizard':
      return <SetupWizard windowId={win.id} payload={win.payload} />;
    case 'run-dialog':
      return <RunDialogApp windowId={win.id} />;
    case 'tour-xp':
      return <TourXPApp />;
    case 'winamp':
      return <WinampApp />;
    case 'arcade-pack':
      return <ArcadePackApp />;
    case 'winrar':
      return <WinRARApp />;
    case 'mirc':
      return <MIRCApp />;
    case 'code-studio':
      return <CodeStudioApp />;
    case 'limewire':
      return <LimeWireApp />;
    case 'bonzibuddy':
      return <BonziSettingsApp />;
    case 'hypercam':
      return <HyperCamApp />;
    default:
      if (win.appId.startsWith('custom:')) {
        return <CustomWebAppRunner appId={win.appId} />;
      }
      return <div style={{ padding: 20 }}>Unknown application: {win.appId}</div>;
  }
};

const WindowsXPShell: React.FC = () => {
  const { bootPhase, theme, windows, openApp } = useOS();
  const [shutdownModal, setShutdownModal] = useState<'turnoff' | 'logoff' | null>(null);
  const touchStartYRef = useRef<number>(0);

  // Completely block pull-down-to-refresh across mobile & touch browsers while allowing inner window scrolling
  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        touchStartYRef.current = e.touches[0].clientY;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const dy = e.touches[0].clientY - touchStartYRef.current;
      if (dy <= 0) return; // scrolling down inside content (finger moving up) is always fine

      // Finger pulling downward: walk up DOM to see if an inner scrollable element has scrollTop > 0
      let el = e.target as HTMLElement | null;
      while (el && el !== document.body && el !== document.documentElement) {
        const style = window.getComputedStyle(el);
        const overflowY = style.overflowY;
        const canScroll = (overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight;
        if (canScroll && el.scrollTop > 0) {
          return; // allow normal upward scroll inside this window pane
        }
        el = el.parentElement;
      }

      // At top boundary or on non-scrollable OS shell -> block browser pull-to-refresh!
      if (e.cancelable) {
        e.preventDefault();
      }
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (bootPhase !== 'desktop') return;
      if (
        (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'escape') ||
        (e.ctrlKey && e.altKey && e.key === 'Delete')
      ) {
        e.preventDefault();
        openApp('taskmgr');
      } else if (e.altKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        openApp('run-dialog');
      } else if (e.altKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        openApp('arena-ai');
      } else if (e.altKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        openApp('powershell');
      } else if (e.altKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        openApp('trillxp-museum');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [bootPhase, openApp]);

  return (
    <div
      className={`xp-theme-${theme}`}
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        overscrollBehavior: 'none',
      }}
    >
      <BootSequence />
      <WelcomeScreen />
      <Screensaver />

      {bootPhase === 'desktop' && (
        <>
          <Desktop>
            {windows.map((win) => (
              <WindowFrame key={win.id} win={win}>
                {renderAppContent(win)}
              </WindowFrame>
            ))}
          </Desktop>

          <Taskbar onShowModal={(m) => setShutdownModal(m)} />

          {shutdownModal && (
            <ShutdownModal
              mode={shutdownModal}
              onClose={() => setShutdownModal(null)}
            />
          )}
        </>
      )}
    </div>
  );
};

export const App: React.FC = () => (
  <SoundProvider>
    <OSProvider>
      <WindowsXPShell />
    </OSProvider>
  </SoundProvider>
);

export default App;

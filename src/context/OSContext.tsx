import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useSound } from './SoundContext';
import {
  GmailConnectionConfig,
  GmailMessage,
  INITIAL_DEMO_GMAIL_MESSAGES,
  MailFolder,
  createSimulatedIncomingGmail,
  fetchGmailMessagesWithToken,
  modifyGmailLabelsWithToken,
  sendGmailWithToken,
} from '../services/gmailService';
import {
  idbGet,
  persistHybrid,
  loadLocalFast,
  requestPersistentQuota,
} from '../services/persistentStorage';

export type BootPhase = 'black' | 'bios' | 'booting' | 'welcome' | 'desktop' | 'shutting_down' | 'powered_off';
export type XPTheme = 'blue' | 'olive' | 'silver' | 'royale' | 'zune';
export type ScreensaverType = 'none' | 'starfield' | 'xpflag' | 'mystify';

export type BuiltinAppId =
  | 'explorer'
  | 'recycle-bin'
  | 'ie'
  | 'aol-dialer'
  | 'aol-desktop'
  | 'aol-mailbox'
  | 'aim'
  | 'pinball'
  | 'minesweeper'
  | 'solitaire'
  | 'spider'
  | 'freecell'
  | 'hearts'
  | 'slingo'
  | 'arena-ai'
  | 'windows-update'
  | 'notepad'
  | 'paint'
  | 'wmplayer'
  | 'calculator'
  | 'cmd'
  | 'taskmgr'
  | 'control-panel'
  | 'software-center'
  | 'setup-wizard'
  | 'run-dialog'
  | 'tour-xp'
  | 'picture-viewer'
  // Installable catalog apps:
  | 'winamp'
  | 'arcade-pack'
  | 'winrar'
  | 'mirc'
  | 'code-studio'
  | 'limewire'
  | 'bonzibuddy'
  | 'hypercam'
  // Custom user-installed or Arena AI generated web/html apps:
  | `custom:${string}`;

export interface InstallablePackage {
  id: string;
  appId: BuiltinAppId;
  name: string;
  version: string;
  publisher: string;
  installerFile: string;
  sizeMB: number;
  icon: string;
  category: 'Multimedia' | 'Internet & Chat' | 'Utilities' | 'Games & Fun' | 'Developer' | 'Custom';
  description: string;
  customUrl?: string;
  customHtml?: string;
}

export const INSTALLABLE_CATALOG: InstallablePackage[] = [
  {
    id: 'pkg-winamp',
    appId: 'winamp',
    name: 'Winamp Media Player',
    version: '2.91',
    publisher: 'Nullsoft, Inc.',
    installerFile: 'winamp291_full.exe',
    sizeMB: 3.4,
    icon: '/icons/winamp.png',
    category: 'Multimedia',
    description:
      "It really whips the llama's ass! Classic dark-skinned MP3 & synth player with live 10-band equalizer and spectrum analyzer.",
  },
  {
    id: 'pkg-arcade',
    appId: 'arcade-pack',
    name: 'Microsoft Plus! Retro Arcade Pack',
    version: '2003.1',
    publisher: 'Microsoft / RetroGames',
    installerFile: 'plus_arcade_setup.exe',
    sizeMB: 2.8,
    icon: '/icons/luna48/gamepad.png',
    category: 'Games & Fun',
    description:
      'Adds classic playable arcade action right on your Windows XP desktop!',
  },
  {
    id: 'pkg-winrar',
    appId: 'winrar',
    name: 'WinRAR Archiver (40-Day Trial)',
    version: '3.40',
    publisher: 'Alexander Roshal',
    installerFile: 'wrar340.exe',
    sizeMB: 1.1,
    icon: '/icons/luna48/folder_compressed.png',
    category: 'Utilities',
    description:
      'Legendary archive manager with the famous perpetual 40-day evaluation reminder. Pack and unpack archives in C:\\!',
  },
  {
    id: 'pkg-mirc',
    appId: 'mirc',
    name: 'mIRC Internet Relay Chat',
    version: '6.16',
    publisher: 'mIRC Co. Ltd.',
    installerFile: 'mirc616.exe',
    sizeMB: 1.9,
    icon: '/icons/luna48/people.png',
    category: 'Internet & Chat',
    description:
      'Classic IRC chat client with live channels (#windowsxp, #2004-gaming, #trivia) and interactive channel bots!',
  },
  {
    id: 'pkg-codestudio',
    appId: 'code-studio',
    name: 'XP Web & Script Studio',
    version: '1.5',
    publisher: 'TrillSoft Corp.',
    installerFile: 'xp_codestudio_setup.exe',
    sizeMB: 4.6,
    icon: '/icons/luna48/file_html.png',
    category: 'Developer',
    description:
      'Write HTML, CSS, and JavaScript with live preview and turn your creations into standalone installed XP programs!',
  },
  {
    id: 'pkg-limewire',
    appId: 'limewire',
    name: 'LimeWire P2P (Safe Nostalgia Sim)',
    version: '4.18.8',
    publisher: 'Lime Wire LLC',
    installerFile: 'LimeWireWin.exe',
    sizeMB: 4.2,
    icon: '/icons/luna48/net_upload.png',
    category: 'Multimedia',
    description:
      '100% virus-free nostalgia simulator! Search & download retro synth tracks, wallpapers, and text zines into My Documents.',
  },
  {
    id: 'pkg-bonzi',
    appId: 'bonzibuddy',
    name: 'BonziBUDDY Desktop Companion',
    version: '3.6',
    publisher: 'BONZI.COM Software',
    installerFile: 'bonzibuddy_setup.exe',
    sizeMB: 2.5,
    icon: '/userpics/frog.bmp',
    category: 'Games & Fun',
    description:
      'Interactive nostalgic desktop buddy who hangs out on your XP desktop telling corny 2000s jokes, facts, and speaking aloud!',
  },
  {
    id: 'pkg-hypercam',
    appId: 'hypercam',
    name: 'HyperCam 2 Screen Studio',
    version: '2.14.02',
    publisher: 'Hyperionics Technology',
    installerFile: 'HyCam2.exe',
    sizeMB: 0.9,
    icon: '/icons/luna48/camcorder.png',
    category: 'Multimedia',
    description:
      'Adds the iconic "Unregistered HyperCam 2" top-left watermark + 009 Sound System synth player for authentic 2007 tutorials!',
  },
];

export interface VFSNode {
  id: string;
  name: string;
  type: 'drive' | 'folder' | 'file' | 'shortcut';
  parentId: string | null;
  icon?: string;
  content?: string; // text, HTML, or dataURL (image/png, video/webm)
  mime?: string;
  targetAppId?: BuiltinAppId;
  targetPayload?: Record<string, unknown>;
  sizeBytes?: number;
  modifiedAt: string;
  deletedFromParentId?: string | null;
}

export interface DesktopIconItem {
  id: string;
  label: string;
  icon: string;
  appId: BuiltinAppId;
  payload?: Record<string, unknown>;
  gridCol: number;
  gridRow: number;
}

export interface WindowInstance {
  id: string;
  appId: BuiltinAppId;
  title: string;
  icon: string;
  x: number;
  y: number;
  width: number;
  height: number;
  minWidth: number;
  minHeight: number;
  minimized: boolean;
  maximized: boolean;
  resizable: boolean;
  zIndex: number;
  payload?: Record<string, unknown>;
}

export interface BalloonNotification {
  id: string;
  title: string;
  message: string;
  icon?: string;
  onClickApp?: BuiltinAppId;
}

interface OSContextValue {
  bootPhase: BootPhase;
  setBootPhase: (phase: BootPhase) => void;
  loginToDesktop: () => void;
  triggerShutdown: (mode: 'shutdown' | 'restart' | 'logoff') => void;

  username: string;
  setUsername: (name: string) => void;
  userAvatar: string;
  setUserAvatar: (url: string) => void;
  theme: XPTheme;
  setTheme: (t: XPTheme) => void;
  wallpaper: string;
  setWallpaper: (url: string) => void;
  screensaver: ScreensaverType;
  setScreensaver: (s: ScreensaverType) => void;
  screensaverActive: boolean;
  setScreensaverActive: (active: boolean) => void;

  windows: WindowInstance[];
  activeWindowId: string | null;
  openApp: (appId: BuiltinAppId, payload?: Record<string, unknown>) => string;
  closeWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  toggleMaximizeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  moveWindow: (id: string, x: number, y: number) => void;
  resizeWindow: (id: string, x: number, y: number, w: number, h: number) => void;
  updateWindowTitle: (id: string, title: string) => void;

  desktopIcons: DesktopIconItem[];
  moveDesktopIcon: (id: string, col: number, row: number) => void;
  removeDesktopIcon: (id: string) => void;
  addDesktopShortcut: (item: Omit<DesktopIconItem, 'id' | 'gridCol' | 'gridRow'>) => void;

  vfs: VFSNode[];
  recycleBinItems: VFSNode[];
  createFile: (parentId: string, name: string, content: string, mime?: string, customIcon?: string) => VFSNode;
  createFolder: (parentId: string, name: string, customIcon?: string) => VFSNode;
  updateFileContent: (fileId: string, content: string) => void;
  renameNode: (nodeId: string, newName: string) => void;
  deleteNodeToRecycleBin: (nodeId: string) => void;
  restoreNodeFromRecycleBin: (nodeId: string) => void;
  emptyRecycleBin: () => void;

  installedPackages: InstallablePackage[];
  launchInstallerWizard: (pkg: InstallablePackage) => void;
  completePackageInstall: (pkg: InstallablePackage, addDesktopIcon: boolean) => void;
  uninstallPackage: (pkgId: string) => void;

  installedUpdates: string[];
  installWindowsUpdate: (kbId: string, title?: string) => void;

  hypercamOverlay: boolean;
  setHypercamOverlay: (v: boolean) => void;
  bonziOverlay: boolean;
  setBonziOverlay: (v: boolean) => void;

  aolConnected: boolean;
  aolScreenName: string;
  setAolScreenName: (sn: string) => void;
  connectAOL: (screenName?: string) => void;
  disconnectAOL: () => void;

  gmailConfig: GmailConnectionConfig;
  setGmailConfig: React.Dispatch<React.SetStateAction<GmailConnectionConfig>>;
  gmailMessages: GmailMessage[];
  unreadInboxCount: number;
  markMailRead: (id: string, unread?: boolean) => void;
  toggleMailStar: (id: string) => void;
  moveMailFolder: (id: string, folder: MailFolder) => void;
  deleteMailForever: (id: string) => void;
  sendGmailMessage: (to: string, subject: string, body: string) => Promise<void>;
  simulateIncomingGmail: () => GmailMessage;
  syncRealGmailOAuth: (accessToken: string, clientId?: string) => Promise<number>;
  syncRealGmailImap: (email: string, appPassword: string) => Promise<number>;

  balloon: BalloonNotification | null;
  pushBalloon: (title: string, message: string, icon?: string, onClickApp?: BuiltinAppId) => void;
  dismissBalloon: () => void;
}

const REQUIRED_SYSTEM_NODES: VFSNode[] = [
  { id: 'c:', name: 'Local Disk (C:)', type: 'drive', parentId: null, icon: '/icons/334(48x48).png', modifiedAt: '2001-10-25' },
  { id: 'd:', name: 'AOL 9.0 Free 1045 Hrs (D:)', type: 'drive', parentId: null, icon: '/icons/111(48x48).png', modifiedAt: '2003-08-14' },
  { id: 'c-windows', name: 'WINDOWS', type: 'folder', parentId: 'c:', modifiedAt: '2001-10-25' },
  { id: 'c-progfiles', name: 'Program Files', type: 'folder', parentId: 'c:', modifiedAt: '2001-10-25' },
  { id: 'c-prog-aol', name: 'America Online 9.0', type: 'folder', parentId: 'c-progfiles', modifiedAt: '2003-09-01' },
  { id: 'c-prog-arena', name: 'Arena AI Agent', type: 'folder', parentId: 'c-progfiles', icon: '/icons/arena-ai.svg', modifiedAt: '2026-11-01' },
  { id: 'c-prog-games', name: 'Windows NT Pinball', type: 'folder', parentId: 'c-progfiles', modifiedAt: '2001-10-25' },
  { id: 'c-docs-root', name: 'Documents and Settings', type: 'folder', parentId: 'c:', modifiedAt: '2001-10-25' },
  { id: 'my-docs', name: 'My Documents', type: 'folder', parentId: 'c-docs-root', icon: '/icons/308(32x32).png', modifiedAt: '2026-11-01' },
  { id: 'my-pics', name: 'My Pictures', type: 'folder', parentId: 'my-docs', icon: '/icons/307(32x32).png', modifiedAt: '2026-11-01' },
  { id: 'arena-pics', name: 'Arena AI', type: 'folder', parentId: 'my-pics', icon: '/icons/luna48/folder_pictures.png', modifiedAt: '2026-11-01' },
  { id: 'my-videos', name: 'My Videos', type: 'folder', parentId: 'my-docs', icon: '/icons/luna48/folder_videos.png', modifiedAt: '2026-11-01' },
  { id: 'arena-vids', name: 'Arena AI', type: 'folder', parentId: 'my-videos', icon: '/icons/luna48/folder_videos.png', modifiedAt: '2026-11-01' },
  { id: 'my-music', name: 'My Music', type: 'folder', parentId: 'my-docs', icon: '/icons/550(32x32).png', modifiedAt: '2026-11-01' },
  { id: 'arena-projects', name: 'Arena AI Projects', type: 'folder', parentId: 'my-docs', icon: '/icons/arena-ai.svg', modifiedAt: '2026-11-01' },
  { id: 'saved-web', name: 'Saved Web Pages', type: 'folder', parentId: 'my-docs', icon: '/icons/luna48/file_html.png', modifiedAt: '2026-11-01' },
  { id: 'shared-dl', name: 'Downloads & Installers', type: 'folder', parentId: 'my-docs', icon: '/icons/luna48/folder_shared.png', modifiedAt: '2026-11-01' },
];

const DEFAULT_VFS: VFSNode[] = [
  ...REQUIRED_SYSTEM_NODES,
  {
    id: 'welcome-txt',
    name: 'Welcome to Windows XP.txt',
    type: 'file',
    parentId: 'my-docs',
    mime: 'text/plain',
    sizeBytes: 820,
    modifiedAt: '2026-11-01',
    content: `Microsoft Windows XP Professional (Service Pack 3)
====================================================
Welcome to your persistent browser-based Windows XP OS!

Featured Highlights:
1. Arena AI Agent (Built into the OS + https://arena.ai/agent in IE6):
   - Run autonomous multi-step coding & OS tasks
   - Generate HD .PNG Images -> saved to My Documents\\My Pictures\\Arena AI
   - Generate Real Playable .WEBM Videos -> saved to My Documents\\My Videos\\Arena AI
   - Build interactive Web Apps & pin them directly to your XP Desktop!
2. Fast, Persistent Old Internet Explorer 6:
   - Browse the real web with persistent tabs, Favorites, History, and Turbo Reader!
3. Classic AOL Slingo Deluxe + All 6 Original XP Games:
   - Slingo Deluxe, 3D Pinball Space Cadet, Minesweeper, Solitaire, Spider Solitaire, FreeCell, Hearts!
4. America Online 9.0 56K Dial-Up + Gmail Mailbox + Windows Update!`,
  },
  {
    id: 'todo-txt',
    name: '2004_Summer_Mixtape.txt',
    type: 'file',
    parentId: 'my-docs',
    mime: 'text/plain',
    sizeBytes: 280,
    modifiedAt: '2004-07-12',
    content: `CD-R 700MB Burn List:
1. Linkin Park - Numb
2. OutKast - Hey Ya!
3. Avril Lavigne - Sk8er Boi
4. Green Day - Boulevard of Broken Dreams
5. Blink-182 - I Miss You
6. Evanescence - Bring Me To Life`,
  },
  {
    id: 'pic-bliss',
    name: 'Bliss_Sonoma.jpg',
    type: 'file',
    parentId: 'my-pics',
    mime: 'image/jpeg',
    content: '/wallpapers/bliss.jpg',
    sizeBytes: 51200,
    modifiedAt: '2001-10-25',
  },
  {
    id: 'pic-tulips',
    name: 'Tulips.jpg',
    type: 'file',
    parentId: 'my-pics',
    mime: 'image/jpeg',
    content: '/wallpapers/tulips.jpg',
    sizeBytes: 73400,
    modifiedAt: '2001-10-25',
  },
  {
    id: 'd-aol-setup',
    name: 'Setup_AOL90.exe',
    type: 'shortcut',
    parentId: 'd:',
    icon: '/icons/luna48/disc_cdrom.png',
    targetAppId: 'aol-dialer',
    sizeBytes: 42991616,
    modifiedAt: '2003-08-14',
  },
  {
    id: 'dl-winamp-exe',
    name: 'winamp291_full.exe',
    type: 'shortcut',
    parentId: 'shared-dl',
    icon: '/icons/luna48/file_generic_installer.png',
    targetAppId: 'setup-wizard',
    targetPayload: { pkgId: 'pkg-winamp' },
    sizeBytes: 3565158,
    modifiedAt: '2026-11-01',
  },
  {
    id: 'dl-arcade-exe',
    name: 'plus_arcade_setup.exe',
    type: 'shortcut',
    parentId: 'shared-dl',
    icon: '/icons/luna48/file_generic_installer.png',
    targetAppId: 'setup-wizard',
    targetPayload: { pkgId: 'pkg-arcade' },
    sizeBytes: 2936012,
    modifiedAt: '2026-11-01',
  },
];

const DEFAULT_DESKTOP_ICONS: DesktopIconItem[] = [
  { id: 'di-mycomp', label: 'My Computer', icon: '/icons/676(32x32).png', appId: 'explorer', payload: { folderId: 'root' }, gridCol: 0, gridRow: 0 },
  { id: 'di-mydocs', label: 'My Documents', icon: '/icons/308(32x32).png', appId: 'explorer', payload: { folderId: 'my-docs' }, gridCol: 0, gridRow: 1 },
  { id: 'di-ie', label: 'Internet Explorer', icon: '/icons/ie.png', appId: 'ie', gridCol: 0, gridRow: 2 },
  { id: 'di-recycle', label: 'Recycle Bin', icon: '/icons/luna48/bin.png', appId: 'recycle-bin', gridCol: 0, gridRow: 3 },
  { id: 'di-install', label: 'Install Software', icon: '/icons/luna48/file_generic_installer.png', appId: 'software-center', gridCol: 0, gridRow: 4 },
  { id: 'di-winupdate', label: 'Windows Update', icon: '/icons/luna48/secure_warn.png', appId: 'windows-update', gridCol: 0, gridRow: 5 },

  { id: 'di-arena', label: 'Arena AI Agent', icon: '/icons/arena-ai.svg', appId: 'arena-ai', gridCol: 1, gridRow: 0 },
  { id: 'di-slingo', label: 'Slingo Deluxe', icon: '/icons/slingo.svg', appId: 'slingo', gridCol: 1, gridRow: 1 },
  { id: 'di-aol', label: 'America Online 9.0', icon: '/icons/luna48/net_modem.png', appId: 'aol-dialer', gridCol: 1, gridRow: 2 },
  { id: 'di-aolmail', label: 'AOL Mail (Gmail)', icon: '/icons/luna48/mail_unread.png', appId: 'aol-mailbox', gridCol: 1, gridRow: 3 },
  { id: 'di-aim', label: 'AIM Messenger', icon: '/icons/luna48/im.png', appId: 'aim', gridCol: 1, gridRow: 4 },
  { id: 'di-pinball', label: '3D Pinball', icon: '/icons/pinball.png', appId: 'pinball', gridCol: 1, gridRow: 5 },

  { id: 'di-mines', label: 'Minesweeper', icon: '/icons/minesweeper/mine-icon.png', appId: 'minesweeper', gridCol: 2, gridRow: 0 },
  { id: 'di-sol', label: 'Solitaire', icon: '/icons/solitaire.png', appId: 'solitaire', gridCol: 2, gridRow: 1 },
  { id: 'di-spider', label: 'Spider Solitaire', icon: '/icons/spider.png', appId: 'spider', gridCol: 2, gridRow: 2 },
];

const APP_DEFAULTS: Record<string, { title: string; icon: string; w: number; h: number; minW?: number; minH?: number; resizable?: boolean }> = {
  explorer: { title: 'My Computer', icon: '/icons/676(16x16).png', w: 740, h: 500, minW: 480, minH: 320 },
  'recycle-bin': { title: 'Recycle Bin', icon: '/icons/luna16/bin.png', w: 660, h: 440, minW: 420, minH: 280 },
  ie: { title: 'Microsoft Internet Explorer', icon: '/icons/896(16x16).png', w: 940, h: 615, minW: 540, minH: 380 },
  'aol-dialer': { title: 'America Online 9.0 Sign On', icon: '/icons/luna16/net_modem.png', w: 505, h: 405, minW: 505, minH: 405, resizable: false },
  'aol-desktop': { title: 'AOL Desktop 9.8.2 - Connected, Signed-On', icon: '/icons/luna16/net_modem.png', w: 960, h: 635, minW: 720, minH: 480 },
  'aol-mailbox': { title: "Gmail's AOL Mailbox", icon: '/icons/luna16/mail_unread.png', w: 760, h: 530, minW: 600, minH: 410 },
  aim: { title: 'AIM - Buddy List', icon: '/icons/luna16/im.png', w: 630, h: 470, minW: 480, minH: 360 },
  pinball: { title: '3D Pinball for Windows - Space Cadet', icon: '/icons/pinball.png', w: 628, h: 486, minW: 520, minH: 410 },
  minesweeper: { title: 'Minesweeper', icon: '/icons/minesweeper/mine-icon.png', w: 320, h: 380, minW: 220, minH: 280 },
  solitaire: { title: 'Solitaire', icon: '/icons/solitaire.png', w: 680, h: 510, minW: 560, minH: 420 },
  spider: { title: 'Spider Solitaire', icon: '/icons/spider.png', w: 800, h: 550, minW: 680, minH: 450 },
  freecell: { title: 'FreeCell', icon: '/icons/freecell.png', w: 690, h: 510, minW: 580, minH: 420 },
  hearts: { title: 'The Microsoft Hearts Network', icon: '/icons/heart.png', w: 680, h: 510, minW: 560, minH: 430 },
  slingo: { title: 'Slingo Deluxe — Classic AOL Edition', icon: '/icons/slingo.svg', w: 760, h: 590, minW: 580, minH: 500 },
  'arena-ai': { title: 'Arena AI Agent — Windows XP Copilot & Studio', icon: '/icons/arena-ai.svg', w: 960, h: 620, minW: 640, minH: 440 },
  'windows-update': { title: 'Microsoft Windows Update', icon: '/icons/luna16/secure_warn.png', w: 760, h: 530, minW: 560, minH: 400 },
  notepad: { title: 'Untitled - Notepad', icon: '/icons/327(16x16).png', w: 560, h: 400, minW: 320, minH: 220 },
  paint: { title: 'untitled - Paint', icon: '/icons/680(16x16).png', w: 720, h: 520, minW: 480, minH: 360 },
  wmplayer: { title: 'Windows Media Player', icon: '/icons/846(16x16).png', w: 720, h: 510, minW: 480, minH: 360 },
  calculator: { title: 'Calculator', icon: '/icons/74(16x16).png', w: 274, h: 288, minW: 274, minH: 288, resizable: false },
  cmd: { title: 'C:\\WINDOWS\\system32\\cmd.exe', icon: '/icons/56(16x16).png', w: 640, h: 400, minW: 400, minH: 240 },
  taskmgr: { title: 'Windows Task Manager', icon: '/icons/luna16/monitor.png', w: 450, h: 465, minW: 390, minH: 400 },
  'control-panel': { title: 'Control Panel', icon: '/icons/300(16x16).png', w: 720, h: 500, minW: 540, minH: 380 },
  'software-center': { title: 'Add or Remove Programs - Software Installer', icon: '/icons/luna32/file_generic_installer.png', w: 770, h: 535, minW: 600, minH: 420 },
  'setup-wizard': { title: 'InstallShield Wizard', icon: '/icons/luna32/file_generic_installer.png', w: 515, h: 392, minW: 515, minH: 392, resizable: false },
  'run-dialog': { title: 'Run', icon: '/icons/743(32x32).png', w: 390, h: 215, minW: 390, minH: 215, resizable: false },
  'tour-xp': { title: 'Welcome to Windows XP Tour', icon: '/icons/853(32x32).png', w: 710, h: 500, minW: 560, minH: 400 },
  'picture-viewer': { title: 'Windows Picture and Fax Viewer', icon: '/icons/307(32x32).png', w: 660, h: 495, minW: 400, minH: 300 },
  winamp: { title: 'Winamp 2.91', icon: '/icons/winamp.png', w: 360, h: 425, minW: 340, minH: 380 },
  'arcade-pack': { title: 'Plus! Retro Arcade Pack XP', icon: '/icons/luna32/gamepad.png', w: 560, h: 510, minW: 480, minH: 460 },
  winrar: { title: 'WinRAR 3.40 (40-day evaluation copy)', icon: '/icons/luna32/folder_compressed.png', w: 600, h: 430, minW: 460, minH: 340 },
  mirc: { title: 'mIRC 6.16 - [#windowsxp]', icon: '/icons/luna32/people.png', w: 660, h: 450, minW: 480, minH: 320 },
  'code-studio': { title: 'XP Web & Script Studio', icon: '/icons/luna32/file_html.png', w: 780, h: 520, minW: 560, minH: 380 },
  limewire: { title: 'LimeWire PRO 4.18.8 (Safe Simulator)', icon: '/icons/luna32/net_upload.png', w: 680, h: 460, minW: 520, minH: 360 },
  bonzibuddy: { title: 'BonziBUDDY Settings', icon: '/userpics/frog.bmp', w: 380, h: 300, minW: 340, minH: 260 },
  hypercam: { title: 'HyperCam 2', icon: '/icons/luna32/camcorder.png', w: 400, h: 330, minW: 360, minH: 300 },
};

function mergeRequiredSystemNodes(existing: VFSNode[]): VFSNode[] {
  const existingIds = new Set(existing.map((n) => n.id));
  const missing = REQUIRED_SYSTEM_NODES.filter((req) => !existingIds.has(req.id));
  return missing.length > 0 ? [...missing, ...existing] : existing;
}

function mergeRequiredDesktopIcons(existing: DesktopIconItem[]): DesktopIconItem[] {
  const existingIds = new Set(existing.map((i) => i.id));
  const mustHave = DEFAULT_DESKTOP_ICONS.filter((d) =>
    ['di-arena', 'di-slingo', 'di-winupdate'].includes(d.id) && !existingIds.has(d.id)
  );
  if (mustHave.length === 0) return existing;
  const occupied = new Set(existing.map((p) => `${p.gridCol},${p.gridRow}`));
  const placed = mustHave.map((item) => {
    let col = item.gridCol;
    let row = item.gridRow;
    if (occupied.has(`${col},${row}`)) {
      outer: for (let c = 2; c < 12; c++) {
        for (let r = 0; r < 7; r++) {
          if (!occupied.has(`${c},${r}`)) {
            col = c;
            row = r;
            break outer;
          }
        }
      }
    }
    occupied.add(`${col},${row}`);
    return { ...item, gridCol: col, gridRow: row };
  });
  return [...existing, ...placed];
}

const OSContext = createContext<OSContextValue | null>(null);

export const OSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { playSound, playAOLWelcome, playAOLGoodbye, stopModemHandshake, unlockAudio } = useSound();

  // Always start on pure black screen -> BIOS -> XP boot animation -> Clickable passwordless Welcome login screen!
  const [bootPhase, setBootPhase] = useState<BootPhase>('black');
  const startupPlayedOnBootRef = useRef<boolean>(false);
  const idbHydratedRef = useRef<boolean>(false);

  useEffect(() => {
    void requestPersistentQuota();
  }, []);

  useEffect(() => {
    if (bootPhase === 'black') {
      startupPlayedOnBootRef.current = false;
    } else if (bootPhase === 'welcome' && !startupPlayedOnBootRef.current) {
      playSound('startup').then((ok) => {
        startupPlayedOnBootRef.current = ok;
      });
    }
  }, [bootPhase, playSound]);

  const [username, setUsernameState] = useState<string>(() => loadLocalFast('xp_username', 'Administrator'));
  const [userAvatar, setUserAvatarState] = useState<string>(() => loadLocalFast('xp_avatar', '/userpics/chess.bmp'));
  const [theme, setThemeState] = useState<XPTheme>(() => loadLocalFast('xp_theme', 'blue'));
  const [wallpaper, setWallpaperState] = useState<string>(() => loadLocalFast('xp_wallpaper', '/wallpapers/bliss.jpg'));
  const [screensaver, setScreensaverState] = useState<ScreensaverType>(() =>
    loadLocalFast('xp_screensaver', 'starfield')
  );
  const [screensaverActive, setScreensaverActive] = useState(false);

  const [vfs, setVfs] = useState<VFSNode[]>(() =>
    mergeRequiredSystemNodes(loadLocalFast('xp_vfs_v1', DEFAULT_VFS))
  );
  const [recycleBinItems, setRecycleBinItems] = useState<VFSNode[]>(() =>
    loadLocalFast('xp_recycle_v1', [])
  );
  const [desktopIcons, setDesktopIcons] = useState<DesktopIconItem[]>(() =>
    mergeRequiredDesktopIcons(loadLocalFast('xp_desktop_icons_v1', DEFAULT_DESKTOP_ICONS))
  );
  const [installedPackages, setInstalledPackages] = useState<InstallablePackage[]>(() =>
    loadLocalFast('xp_installed_pkgs_v1', [])
  );
  const [installedUpdates, setInstalledUpdates] = useState<string[]>(() =>
    loadLocalFast('xp_installed_updates_v1', ['KB893803', 'KB984201'])
  );

  // Hydrate full large payloads (VFS with generated PNGs/WebM videos, etc.) from IndexedDB
  useEffect(() => {
    let mounted = true;
    (async () => {
      const [idbVfs, idbRecycle, idbIcons, idbPkgs, idbUpdates, idbWall] = await Promise.all([
        idbGet<VFSNode[]>('xp_vfs_v1'),
        idbGet<VFSNode[]>('xp_recycle_v1'),
        idbGet<DesktopIconItem[]>('xp_desktop_icons_v1'),
        idbGet<InstallablePackage[]>('xp_installed_pkgs_v1'),
        idbGet<string[]>('xp_installed_updates_v1'),
        idbGet<string>('xp_wallpaper'),
      ]);
      if (!mounted) return;
      if (idbVfs && idbVfs.length > 0) setVfs(mergeRequiredSystemNodes(idbVfs));
      if (idbRecycle) setRecycleBinItems(idbRecycle);
      if (idbIcons && idbIcons.length > 0) setDesktopIcons(mergeRequiredDesktopIcons(idbIcons));
      if (idbPkgs) setInstalledPackages(idbPkgs);
      if (idbUpdates) setInstalledUpdates(idbUpdates);
      if (idbWall) setWallpaperState(idbWall);
      idbHydratedRef.current = true;
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const [windows, setWindows] = useState<WindowInstance[]>([]);
  const [activeWindowId, setActiveWindowId] = useState<string | null>(null);
  const [zCounter, setZCounter] = useState(100);

  const [hypercamOverlay, setHypercamOverlay] = useState(false);
  const [bonziOverlay, setBonziOverlay] = useState(false);

  const [aolConnected, setAolConnected] = useState(false);
  const [aolScreenName, setAolScreenName] = useState<string>(() =>
    loadLocalFast('xp_aol_screenname', 'xp.user@gmail.com')
  );

  const [gmailConfig, setGmailConfig] = useState<GmailConnectionConfig>(() =>
    loadLocalFast('xp_gmail_config_v1', {
      mode: 'demo',
      email: 'xp.user@gmail.com',
    })
  );
  const [gmailMessages, setGmailMessages] = useState<GmailMessage[]>(() =>
    loadLocalFast('xp_gmail_msgs_v1', INITIAL_DEMO_GMAIL_MESSAGES)
  );

  const [balloon, setBalloon] = useState<BalloonNotification | null>(null);

  // Persist OS changes safely to IndexedDB + localStorage
  useEffect(() => persistHybrid('xp_username', username), [username]);
  useEffect(() => persistHybrid('xp_avatar', userAvatar), [userAvatar]);
  useEffect(() => persistHybrid('xp_theme', theme), [theme]);
  useEffect(() => persistHybrid('xp_wallpaper', wallpaper), [wallpaper]);
  useEffect(() => persistHybrid('xp_screensaver', screensaver), [screensaver]);
  useEffect(() => {
    persistHybrid('xp_vfs_v1', vfs);
  }, [vfs]);
  useEffect(() => persistHybrid('xp_recycle_v1', recycleBinItems), [recycleBinItems]);
  useEffect(() => persistHybrid('xp_desktop_icons_v1', desktopIcons), [desktopIcons]);
  useEffect(() => persistHybrid('xp_installed_pkgs_v1', installedPackages), [installedPackages]);
  useEffect(() => persistHybrid('xp_installed_updates_v1', installedUpdates), [installedUpdates]);
  useEffect(() => persistHybrid('xp_aol_screenname', aolScreenName), [aolScreenName]);
  useEffect(() => persistHybrid('xp_gmail_config_v1', gmailConfig), [gmailConfig]);
  useEffect(() => persistHybrid('xp_gmail_msgs_v1', gmailMessages), [gmailMessages]);

  // Update Recycle Bin icon dynamically
  useEffect(() => {
    const iconPath = recycleBinItems.length > 0 ? '/icons/luna48/bin_full.png' : '/icons/luna48/bin.png';
    setDesktopIcons((prev) =>
      prev.map((ic) => (ic.id === 'di-recycle' && ic.icon !== iconPath ? { ...ic, icon: iconPath } : ic))
    );
  }, [recycleBinItems.length]);

  const unreadInboxCount = gmailMessages.filter((m) => m.folder === 'inbox' && m.unread).length;

  const pushBalloon = useCallback(
    (title: string, message: string, icon?: string, onClickApp?: BuiltinAppId) => {
      playSound('balloon');
      const id = `bal-${Date.now()}`;
      setBalloon({ id, title, message, icon, onClickApp });
      window.setTimeout(() => {
        setBalloon((cur) => (cur?.id === id ? null : cur));
      }, 8500);
    },
    [playSound]
  );

  const dismissBalloon = useCallback(() => setBalloon(null), []);

  const loginToDesktop = useCallback(() => {
    unlockAudio();
    if (startupPlayedOnBootRef.current) {
      playSound('logon');
    } else {
      playSound('startup');
      startupPlayedOnBootRef.current = true;
    }
    setBootPhase('desktop');
    window.setTimeout(() => {
      pushBalloon(
        'Arena AI Copilot & Windows Update Ready',
        'Launch "Arena AI Agent" to run tasks or generate images/videos into persistent storage, play Slingo Deluxe, or browse in IE6!',
        '/icons/arena-ai.svg',
        'arena-ai'
      );
    }, 1800);
  }, [unlockAudio, playSound, pushBalloon]);

  const triggerShutdown = useCallback(
    (mode: 'shutdown' | 'restart' | 'logoff') => {
      stopModemHandshake();
      if (mode === 'logoff') {
        playSound('logoff');
        setWindows([]);
        setActiveWindowId(null);
        setBootPhase('welcome');
        return;
      }
      playSound('shutdown');
      setBootPhase('shutting_down');
      window.setTimeout(() => {
        setWindows([]);
        setActiveWindowId(null);
        setAolConnected(false);
        if (mode === 'restart') {
          setBootPhase('black');
        } else {
          setBootPhase('powered_off');
        }
      }, 3300);
    },
    [playSound, stopModemHandshake]
  );

  const setUsername = useCallback((n: string) => setUsernameState(n.trim() || 'Administrator'), []);
  const setUserAvatar = useCallback((u: string) => setUserAvatarState(u), []);
  const setTheme = useCallback((t: XPTheme) => setThemeState(t), []);
  const setWallpaper = useCallback((u: string) => setWallpaperState(u), []);
  const setScreensaver = useCallback((s: ScreensaverType) => setScreensaverState(s), []);

  const openApp = useCallback(
    (appId: BuiltinAppId, payload?: Record<string, unknown>): string => {
      if (appId === 'bonzibuddy') {
        setBonziOverlay(true);
      }
      if (appId === 'hypercam') {
        setHypercamOverlay(true);
      }

      const multiInstanceApps: BuiltinAppId[] = ['explorer', 'notepad', 'picture-viewer', 'setup-wizard'];
      if (!multiInstanceApps.includes(appId)) {
        const existing = windows.find((w) => w.appId === appId);
        if (existing) {
          setZCounter((z) => {
            const nextZ = z + 1;
            setWindows((prev) =>
              prev.map((w) =>
                w.id === existing.id
                  ? { ...w, minimized: false, zIndex: nextZ, payload: payload || w.payload }
                  : w
              )
            );
            return nextZ;
          });
          setActiveWindowId(existing.id);
          return existing.id;
        }
      }

      let meta = APP_DEFAULTS[appId];
      if (!meta && appId.startsWith('custom:')) {
        const customPkg = installedPackages.find((p) => p.appId === appId);
        meta = {
          title: customPkg?.name || 'Installed Application',
          icon: customPkg?.icon || '/icons/luna32/file_generic_executable.png',
          w: 760,
          h: 520,
          minW: 400,
          minH: 300,
        };
      }
      if (!meta) {
        meta = { title: 'Application', icon: '/icons/luna16/file_generic_executable.png', w: 600, h: 420 };
      }

      const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
      const vh = typeof window !== 'undefined' ? window.innerHeight - 30 : 760;
      const w = Math.min(meta.w, vw - 16);
      const h = Math.min(meta.h, vh - 12);
      const offset = (windows.length % 7) * 22;
      const x = Math.max(8, Math.min(vw - w - 8, Math.round((vw - w) / 2 - 30 + offset)));
      const y = Math.max(4, Math.min(vh - h - 4, Math.round((vh - h) / 2 - 14 + offset)));

      const id = `win-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      let initialTitle = meta.title;
      if (appId === 'aol-mailbox') {
        initialTitle = `${gmailConfig.email}'s Mailbox (Gmail via AOL)`;
      } else if (payload?.title && typeof payload.title === 'string') {
        initialTitle = payload.title;
      }

      setZCounter((z) => {
        const nextZ = z + 1;
        const win: WindowInstance = {
          id,
          appId,
          title: initialTitle,
          icon: meta.icon,
          x,
          y,
          width: w,
          height: h,
          minWidth: meta.minW || 300,
          minHeight: meta.minH || 220,
          minimized: false,
          maximized: false,
          resizable: meta.resizable !== false,
          zIndex: nextZ,
          payload,
        };
        setWindows((prev) => [...prev, win]);
        setActiveWindowId(id);
        return nextZ;
      });

      playSound('startClick');
      return id;
    },
    [windows, installedPackages, gmailConfig.email, playSound]
  );

  const closeWindow = useCallback((id: string) => {
    setWindows((prev) => {
      const remaining = prev.filter((w) => w.id !== id);
      const top = remaining
        .filter((w) => !w.minimized)
        .sort((a, b) => b.zIndex - a.zIndex)[0];
      setActiveWindowId(top ? top.id : null);
      return remaining;
    });
  }, []);

  const minimizeWindow = useCallback(
    (id: string) => {
      playSound('minimize');
      setWindows((prev) => {
        const updated = prev.map((w) => (w.id === id ? { ...w, minimized: true } : w));
        const top = updated
          .filter((w) => !w.minimized)
          .sort((a, b) => b.zIndex - a.zIndex)[0];
        setActiveWindowId(top ? top.id : null);
        return updated;
      });
    },
    [playSound]
  );

  const toggleMaximizeWindow = useCallback(
    (id: string) => {
      playSound('restore');
      setWindows((prev) =>
        prev.map((w) => (w.id === id && w.resizable ? { ...w, maximized: !w.maximized } : w))
      );
    },
    [playSound]
  );

  const focusWindow = useCallback((id: string) => {
    setZCounter((z) => {
      const nextZ = z + 1;
      setWindows((prev) =>
        prev.map((w) => (w.id === id ? { ...w, minimized: false, zIndex: nextZ } : w))
      );
      setActiveWindowId(id);
      return nextZ;
    });
  }, []);

  const moveWindow = useCallback((id: string, x: number, y: number) => {
    setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, x, y } : w)));
  }, []);

  const resizeWindow = useCallback((id: string, x: number, y: number, width: number, height: number) => {
    setWindows((prev) =>
      prev.map((w) =>
        w.id === id
          ? {
              ...w,
              x,
              y,
              width: Math.max(w.minWidth, width),
              height: Math.max(w.minHeight, height),
            }
          : w
      )
    );
  }, []);

  const updateWindowTitle = useCallback((id: string, title: string) => {
    setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, title } : w)));
  }, []);

  // Desktop Icons
  const moveDesktopIcon = useCallback((id: string, gridCol: number, gridRow: number) => {
    setDesktopIcons((prev) =>
      prev.map((ic) => (ic.id === id ? { ...ic, gridCol: Math.max(0, gridCol), gridRow: Math.max(0, gridRow) } : ic))
    );
  }, []);

  const removeDesktopIcon = useCallback(
    (id: string) => {
      if (['di-mycomp', 'di-recycle'].includes(id)) {
        playSound('error');
        return;
      }
      playSound('recycle');
      setDesktopIcons((prev) => prev.filter((ic) => ic.id !== id));
    },
    [playSound]
  );

  const addDesktopShortcut = useCallback(
    (item: Omit<DesktopIconItem, 'id' | 'gridCol' | 'gridRow'>) => {
      setDesktopIcons((prev) => {
        if (prev.some((p) => p.appId === item.appId && p.label === item.label)) return prev;
        const occupied = new Set(prev.map((p) => `${p.gridCol},${p.gridRow}`));
        let col = 2;
        let row = 0;
        for (let c = 0; c < 12; c++) {
          let found = false;
          for (let r = 0; r < 7; r++) {
            if (!occupied.has(`${c},${r}`)) {
              col = c;
              row = r;
              found = true;
              break;
            }
          }
          if (found) break;
        }
        return [...prev, { ...item, id: `di-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, gridCol: col, gridRow: row }];
      });
    },
    []
  );

  // Persistent Virtual Filesystem
  const createFile = useCallback(
    (parentId: string, name: string, content: string, mime = 'text/plain', customIcon?: string): VFSNode => {
      const node: VFSNode = {
        id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name,
        type: 'file',
        parentId,
        icon: customIcon,
        content,
        mime,
        sizeBytes: content.length,
        modifiedAt: new Date().toISOString().slice(0, 10),
      };
      setVfs((prev) => [...prev, node]);
      return node;
    },
    []
  );

  const createFolder = useCallback((parentId: string, name: string, customIcon?: string): VFSNode => {
    const node: VFSNode = {
      id: `dir-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      type: 'folder',
      parentId,
      icon: customIcon,
      modifiedAt: new Date().toISOString().slice(0, 10),
    };
    setVfs((prev) => [...prev, node]);
    return node;
  }, []);

  const updateFileContent = useCallback((fileId: string, content: string) => {
    setVfs((prev) =>
      prev.map((n) =>
        n.id === fileId
          ? { ...n, content, sizeBytes: content.length, modifiedAt: new Date().toISOString().slice(0, 10) }
          : n
      )
    );
  }, []);

  const renameNode = useCallback((nodeId: string, newName: string) => {
    if (!newName.trim()) return;
    setVfs((prev) => prev.map((n) => (n.id === nodeId ? { ...n, name: newName.trim() } : n)));
  }, []);

  const deleteNodeToRecycleBin = useCallback(
    (nodeId: string) => {
      const target = vfs.find((n) => n.id === nodeId);
      if (!target || target.type === 'drive') {
        playSound('error');
        return;
      }
      playSound('recycle');
      setVfs((prev) => prev.filter((n) => n.id !== nodeId));
      setRecycleBinItems((prev) => [
        ...prev,
        { ...target, deletedFromParentId: target.parentId, parentId: 'recycle' },
      ]);
    },
    [vfs, playSound]
  );

  const restoreNodeFromRecycleBin = useCallback((nodeId: string) => {
    setRecycleBinItems((prev) => {
      const target = prev.find((n) => n.id === nodeId);
      if (!target) return prev;
      setVfs((v) => [...v, { ...target, parentId: target.deletedFromParentId || 'my-docs' }]);
      return prev.filter((n) => n.id !== nodeId);
    });
  }, []);

  const emptyRecycleBin = useCallback(() => {
    playSound('recycle');
    setRecycleBinItems([]);
  }, [playSound]);

  // Software Installer
  const launchInstallerWizard = useCallback(
    (pkg: InstallablePackage) => {
      openApp('setup-wizard', { pkg, title: `${pkg.name} ${pkg.version} Setup` });
    },
    [openApp]
  );

  const completePackageInstall = useCallback(
    (pkg: InstallablePackage, addDesktopIcon: boolean) => {
      setInstalledPackages((prev) => {
        const filtered = prev.filter((p) => p.id !== pkg.id);
        return [...filtered, pkg];
      });
      setVfs((prev) => {
        const folderName = `${pkg.name} ${pkg.version}`;
        if (prev.some((n) => n.parentId === 'c-progfiles' && n.name === folderName)) return prev;
        const folderId = `prog-${pkg.id}`;
        return [
          ...prev,
          { id: folderId, name: folderName, type: 'folder', parentId: 'c-progfiles', modifiedAt: new Date().toISOString().slice(0, 10) },
          {
            id: `${folderId}-exe`,
            name: `${pkg.name}.exe`,
            type: 'shortcut',
            parentId: folderId,
            icon: pkg.icon,
            targetAppId: pkg.appId,
            sizeBytes: Math.round(pkg.sizeMB * 1048576),
            modifiedAt: new Date().toISOString().slice(0, 10),
          },
        ];
      });
      if (addDesktopIcon) {
        addDesktopShortcut({ label: pkg.name, icon: pkg.icon, appId: pkg.appId });
      }
      playSound('hardwareInsert');
      pushBalloon(
        'New Program Installed',
        `${pkg.name} (${pkg.version}) is now installed in C:\\Program Files and Start -> All Programs!`,
        pkg.icon,
        pkg.appId
      );
    },
    [addDesktopShortcut, playSound, pushBalloon]
  );

  const uninstallPackage = useCallback(
    (pkgId: string) => {
      const target = installedPackages.find((p) => p.id === pkgId);
      if (!target) return;
      if (target.appId === 'bonzibuddy') setBonziOverlay(false);
      if (target.appId === 'hypercam') setHypercamOverlay(false);
      setInstalledPackages((prev) => prev.filter((p) => p.id !== pkgId));
      setDesktopIcons((prev) => prev.filter((ic) => ic.appId !== target.appId));
      setWindows((prev) => prev.filter((w) => w.appId !== target.appId));
      setVfs((prev) => prev.filter((n) => !n.id.startsWith(`prog-${pkgId}`)));
      playSound('hardwareRemove');
      pushBalloon('Program Removed', `${target.name} was uninstalled from your computer.`);
    },
    [installedPackages, playSound, pushBalloon]
  );

  // Windows Update Installer
  const installWindowsUpdate = useCallback(
    (kbId: string, title?: string) => {
      setInstalledUpdates((prev) => (prev.includes(kbId) ? prev : [...prev, kbId]));
      playSound('hardwareInsert');
      if (title) {
        pushBalloon(
          'Windows Update Installed',
          `${kbId}: ${title} has been installed to persistent OS storage.`,
          '/icons/luna32/secure_safe.png',
          'windows-update'
        );
      }
    },
    [playSound, pushBalloon]
  );

  // AOL & Gmail Connection
  const connectAOL = useCallback(
    (screenName?: string) => {
      const sn = screenName || aolScreenName;
      setAolScreenName(sn);
      if (sn.includes('@')) {
        setGmailConfig((prev) => ({ ...prev, email: sn }));
      }
      setAolConnected(true);
      playAOLWelcome();
      openApp('aol-desktop');
      pushBalloon(
        'America Online Connected',
        'Connected at 56,000 bps (V.90) via 959-262-8674.',
        '/icons/luna32/net_modem.png',
        'aol-desktop'
      );
      const hasUnread = gmailMessages.some((m) => m.folder === 'inbox' && m.unread);
      if (hasUnread) {
        window.setTimeout(() => {
          playSound('youveGotMail');
        }, 1250);
      }
    },
    [aolScreenName, gmailMessages, openApp, playAOLWelcome, playSound, pushBalloon]
  );

  const disconnectAOL = useCallback(() => {
    stopModemHandshake();
    setAolConnected(false);
    playAOLGoodbye();
    setWindows((prev) => prev.filter((w) => w.appId !== 'aol-desktop'));
    pushBalloon('America Online Signed Off', 'Modem disconnected from 959-262-8674.');
  }, [playAOLGoodbye, pushBalloon, stopModemHandshake]);

  // Gmail operations
  const markMailRead = useCallback(
    (id: string, unread = false) => {
      setGmailMessages((prev) => prev.map((m) => (m.id === id ? { ...m, unread } : m)));
      if (gmailConfig.mode === 'oauth' && gmailConfig.accessToken) {
        modifyGmailLabelsWithToken(
          gmailConfig.accessToken,
          id,
          unread ? ['UNREAD'] : [],
          unread ? [] : ['UNREAD']
        );
      }
    },
    [gmailConfig]
  );

  const toggleMailStar = useCallback(
    (id: string) => {
      setGmailMessages((prev) =>
        prev.map((m) => {
          if (m.id !== id) return m;
          const nextStar = !m.starred;
          if (gmailConfig.mode === 'oauth' && gmailConfig.accessToken) {
            modifyGmailLabelsWithToken(
              gmailConfig.accessToken,
              id,
              nextStar ? ['STARRED'] : [],
              nextStar ? [] : ['STARRED']
            );
          }
          return { ...m, starred: nextStar };
        })
      );
    },
    [gmailConfig]
  );

  const moveMailFolder = useCallback(
    (id: string, folder: MailFolder) => {
      setGmailMessages((prev) => prev.map((m) => (m.id === id ? { ...m, folder } : m)));
      if (gmailConfig.mode === 'oauth' && gmailConfig.accessToken) {
        if (folder === 'trash') {
          modifyGmailLabelsWithToken(gmailConfig.accessToken, id, ['TRASH'], ['INBOX']);
        } else if (folder === 'spam') {
          modifyGmailLabelsWithToken(gmailConfig.accessToken, id, ['SPAM'], ['INBOX']);
        }
      }
    },
    [gmailConfig]
  );

  const deleteMailForever = useCallback((id: string) => {
    setGmailMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const sendGmailMessage = useCallback(
    async (to: string, subject: string, body: string) => {
      if (gmailConfig.mode === 'oauth' && gmailConfig.accessToken) {
        await sendGmailWithToken(gmailConfig.accessToken, gmailConfig.email, to, subject, body);
      } else if (gmailConfig.mode === 'imap' && gmailConfig.appPassword) {
        const res = await fetch('/api/gmail/smtp-send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: gmailConfig.email,
            appPassword: gmailConfig.appPassword,
            to,
            subject,
            body,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'SMTP send failed');
      }
      const sentMsg: GmailMessage = {
        id: `gmail-sent-${Date.now()}`,
        threadId: `th-${Date.now()}`,
        folder: 'sent',
        from: gmailConfig.email,
        fromEmail: gmailConfig.email,
        to,
        subject: subject || '(No Subject)',
        date: new Date().toISOString(),
        unread: false,
        starred: false,
        snippet: body.slice(0, 120),
        body,
      };
      setGmailMessages((prev) => [sentMsg, ...prev]);
      playSound('aimSend');
    },
    [gmailConfig, playSound]
  );

  const simulateIncomingGmail = useCallback(() => {
    const msg = createSimulatedIncomingGmail(gmailConfig.email);
    setGmailMessages((prev) => [msg, ...prev]);
    playSound('youveGotMail');
    pushBalloon(
      "You've Got Mail! (Gmail)",
      `From ${msg.from}: "${msg.subject}"`,
      '/icons/luna32/mail_unread.png',
      'aol-mailbox'
    );
    return msg;
  }, [gmailConfig.email, playSound, pushBalloon]);

  const syncRealGmailOAuth = useCallback(
    async (accessToken: string, clientId?: string): Promise<number> => {
      const { email, messages } = await fetchGmailMessagesWithToken(accessToken, 30);
      setGmailConfig({
        mode: 'oauth',
        email,
        accessToken,
        oauthClientId: clientId,
        lastSynced: new Date().toISOString(),
      });
      setAolScreenName(email);
      setGmailMessages(messages);
      const unread = messages.filter((m) => m.folder === 'inbox' && m.unread).length;
      if (unread > 0) {
        playSound('youveGotMail');
      }
      pushBalloon(
        'Gmail Live Connected!',
        `Synced ${messages.length} messages (${unread} unread) from ${email} into AOL Mailbox!`,
        '/icons/luna32/mail_unread.png',
        'aol-mailbox'
      );
      return messages.length;
    },
    [playSound, pushBalloon]
  );

  const syncRealGmailImap = useCallback(
    async (email: string, appPassword: string): Promise<number> => {
      const res = await fetch('/api/gmail/imap-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, appPassword, limit: 25 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'IMAP sync failed');
      const messages: GmailMessage[] = data.messages || [];
      setGmailConfig({
        mode: 'imap',
        email,
        appPassword,
        lastSynced: new Date().toISOString(),
      });
      setAolScreenName(email);
      setGmailMessages(messages);
      const unread = messages.filter((m) => m.folder === 'inbox' && m.unread).length;
      if (unread > 0) {
        playSound('youveGotMail');
      }
      return messages.length;
    },
    [playSound]
  );

  return (
    <OSContext.Provider
      value={{
        bootPhase,
        setBootPhase,
        loginToDesktop,
        triggerShutdown,
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
        screensaverActive,
        setScreensaverActive,
        windows,
        activeWindowId,
        openApp,
        closeWindow,
        minimizeWindow,
        toggleMaximizeWindow,
        focusWindow,
        moveWindow,
        resizeWindow,
        updateWindowTitle,
        desktopIcons,
        moveDesktopIcon,
        removeDesktopIcon,
        addDesktopShortcut,
        vfs,
        recycleBinItems,
        createFile,
        createFolder,
        updateFileContent,
        renameNode,
        deleteNodeToRecycleBin,
        restoreNodeFromRecycleBin,
        emptyRecycleBin,
        installedPackages,
        launchInstallerWizard,
        completePackageInstall,
        uninstallPackage,
        installedUpdates,
        installWindowsUpdate,
        hypercamOverlay,
        setHypercamOverlay,
        bonziOverlay,
        setBonziOverlay,
        aolConnected,
        aolScreenName,
        setAolScreenName,
        connectAOL,
        disconnectAOL,
        gmailConfig,
        setGmailConfig,
        gmailMessages,
        unreadInboxCount,
        markMailRead,
        toggleMailStar,
        moveMailFolder,
        deleteMailForever,
        sendGmailMessage,
        simulateIncomingGmail,
        syncRealGmailOAuth,
        syncRealGmailImap,
        balloon,
        pushBalloon,
        dismissBalloon,
      }}
    >
      {children}
    </OSContext.Provider>
  );
};

export const useOS = () => {
  const ctx = useContext(OSContext);
  if (!ctx) throw new Error('useOS must be used inside OSProvider');
  return ctx;
};

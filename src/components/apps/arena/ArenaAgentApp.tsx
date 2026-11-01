import React, { useState, useEffect, useRef } from 'react';
import {
  useOS,
  INSTALLABLE_CATALOG,
  XPTheme,
  BuiltinAppId,
} from '../../../context/OSContext';
import { useSound } from '../../../context/SoundContext';
import {
  idbGet,
  persistHybrid,
  loadLocalFast,
  getStorageEstimate,
} from '../../../services/persistentStorage';
import {
  ArenaMessage,
  ArenaToolStep,
  ArenaArtifact,
  ArenaSettingsConfig,
  generateArenaImage,
  generateArenaVideo,
  synthesizeArenaWebApp,
} from '../../../services/arenaAiEngine';

interface ArenaAgentAppProps {
  embeddedInIE?: boolean;
  initialPrompt?: string;
  initialFolderId?: string;
}

const QUICK_PROMPTS = [
  {
    icon: '🎨',
    label: 'Generate Cyberpunk City Image',
    prompt: 'Generate an image of a cyberpunk neon city skyline at sunset with highway reflections',
  },
  {
    icon: '🎬',
    label: 'Generate Synthwave Highway Video',
    prompt: 'Generate a video of a neon synthwave highway flyover under a glowing retro sun',
  },
  {
    icon: '🎹',
    label: 'Build a Beat Studio App',
    prompt: 'Build an interactive chiptune drum machine & synth beat studio app and save it to My Documents',
  },
  {
    icon: '🛸',
    label: 'Build a Space Shooter Game',
    prompt: 'Create a playable StarDefender arcade space game and pin it to my XP Desktop',
  },
  {
    icon: '🖥️',
    label: 'Switch XP Theme & Bliss Remix',
    prompt: 'Switch my Windows XP theme to Royale and generate a starry aurora mountain wallpaper',
  },
  {
    icon: '🎰',
    label: 'Launch Slingo Deluxe',
    prompt: 'Open Slingo Deluxe and create a lucky strategy notes file in My Documents',
  },
];

const INITIAL_WELCOME_MESSAGES: ArenaMessage[] = [
  {
    id: 'arena-welcome-1',
    role: 'assistant',
    modelBadge: 'Arena AI Agent • Windows XP OS Built-In',
    timestamp: 'Ready',
    text: `Welcome to **Arena AI Agent** — natively built into **Microsoft Windows XP** (and accessible via \`https://arena.ai/agent\` in Internet Explorer 6)!

Everything I create is automatically saved to your **Windows XP Persistent Storage** (\`My Documents\`, \`My Pictures\\Arena AI\`, and \`My Videos\\Arena AI\`) and survives reboots & refreshes:
• **Autonomous Coding & App Tasks**: Ask me to build web apps, games, calculators, or notes — preview live, edit code, open in IE6, or pin as a Desktop \`.EXE\`!
• **HD Image Generation + Side-by-Side Battle**: Ask me to *"generate an image of..."* (saved to \`My Pictures\\Arena AI\` + 1-click Set as Wallpaper).
• **Real Video Generation (\`.webm\`)**: Ask me to *"generate a video of..."* (encoded at 30fps and saved to \`My Videos\\Arena AI\` for Windows Media Player!).
• **OS Copilot Control**: Ask me to switch XP themes (\`Blue\`, \`Olive\`, \`Silver\`, \`Royale\`, \`Zune\`), install software, or open apps like **Slingo Deluxe**!`,
  },
];

export const ArenaAgentApp: React.FC<ArenaAgentAppProps> = ({
  embeddedInIE = false,
  initialPrompt,
}) => {
  const {
    vfs,
    createFile,
    createFolder,
    updateFileContent,
    openApp,
    setTheme,
    setWallpaper,
    completePackageInstall,
    launchInstallerWizard,
    pushBalloon,
  } = useOS();
  const { playSound } = useSound();

  const [activeTab, setActiveTab] = useState<'agent' | 'image' | 'video' | 'files' | 'settings'>('agent');
  const [settings, setSettings] = useState<ArenaSettingsConfig>(() =>
    loadLocalFast('xp_arena_settings_v1', {
      provider: 'builtin',
      apiKey: '',
      model: 'arena-agent-pro',
      uiSkin: embeddedInIE ? 'arena-studio' : 'xp-native',
    })
  );

  const [messages, setMessages] = useState<ArenaMessage[]>(() =>
    loadLocalFast('xp_arena_messages_v1', INITIAL_WELCOME_MESSAGES)
  );
  const [input, setInput] = useState(initialPrompt || '');
  const [busy, setBusy] = useState(false);
  const [videoEncodePct, setVideoEncodePct] = useState<number | null>(null);

  // Right workspace inspector state
  const [showWorkspacePane, setShowWorkspacePane] = useState(true);
  const [workspaceView, setWorkspaceView] = useState<'preview' | 'code' | 'vfs'>('preview');
  const [selectedArtifact, setSelectedArtifact] = useState<ArenaArtifact | null>(null);
  const [codeDraft, setCodeDraft] = useState('');

  // Dedicated Image & Video studio inputs
  const [imgPrompt, setImgPrompt] = useState('Windows XP Sonoma Bliss green hills under northern lights aurora borealis');
  const [battleMode, setBattleMode] = useState(true);
  const [vidPrompt, setVidPrompt] = useState('Cyberpunk neon city highway at midnight with glowing synthwave sun');
  const [storageInfo, setStorageInfo] = useState<{ usedMB: number; quotaMB: number }>({ usedMB: 2.4, quotaMB: 1024 });

  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const hydratedRef = useRef(false);

  // Hydrate persistent Arena AI chat history from IndexedDB
  useEffect(() => {
    let mounted = true;
    (async () => {
      const savedMsgs = await idbGet<ArenaMessage[]>('xp_arena_messages_v1');
      if (mounted && savedMsgs && savedMsgs.length > 0) {
        setMessages(savedMsgs);
      }
      const savedSettings = await idbGet<ArenaSettingsConfig>('xp_arena_settings_v1');
      if (mounted && savedSettings) {
        setSettings(savedSettings);
      }
      const est = await getStorageEstimate();
      if (mounted) setStorageInfo(est);
      hydratedRef.current = true;
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;
    persistHybrid('xp_arena_messages_v1', messages);
    void getStorageEstimate().then(setStorageInfo);
  }, [messages]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    persistHybrid('xp_arena_settings_v1', settings);
  }, [settings]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  // Keep code editor synced with selected artifact's VFS file
  useEffect(() => {
    if (!selectedArtifact) return;
    const node = vfs.find((n) => n.id === selectedArtifact.vfsId);
    if (node && typeof node.content === 'string' && !node.mime?.startsWith('image/') && !node.mime?.startsWith('video/')) {
      setCodeDraft(node.content);
    }
  }, [selectedArtifact, vfs]);

  const slugify = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 28) || 'artifact';

  const pinArtifactAsDesktopApp = (art: ArenaArtifact) => {
    const node = vfs.find((n) => n.id === art.vfsId);
    if (!node || !node.content) return;
    const customAppId: BuiltinAppId = `custom:arena-${Date.now().toString().slice(-5)}`;
    completePackageInstall(
      {
        id: `pkg-arena-${Date.now()}`,
        appId: customAppId,
        name: art.title,
        version: '1.0',
        publisher: 'Arena AI Agent',
        installerFile: `${slugify(art.title)}_setup.exe`,
        sizeMB: 0.4,
        icon: '/icons/arena-ai.svg',
        category: 'Custom',
        description: `Generated by Arena AI Agent (${art.pathDisplay})`,
        customHtml: node.content,
      },
      true
    );
  };

  // Core Autonomous Agent Execution Loop
  const handleRunAgentPrompt = async (rawPrompt?: string) => {
    const promptText = (rawPrompt ?? input).trim();
    if (!promptText || busy) return;
    setInput('');
    setBusy(true);
    setActiveTab('agent');

    const userMsg: ArenaMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: promptText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const assistantId = `a-${Date.now() + 1}`;
    const steps: ArenaToolStep[] = [
      {
        id: 'st-think',
        tool: 'thinking',
        label: 'Analyzing request & planning Windows XP OS + VFS tool actions...',
        status: 'running',
      },
    ];

    setMessages((prev) => [
      ...prev,
      userMsg,
      {
        id: assistantId,
        role: 'assistant',
        modelBadge:
          settings.provider !== 'builtin' && settings.apiKey
            ? `${settings.model} (Live API)`
            : 'Arena-Agent-XP (Claude / Gemini / GPT Ensemble)',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: '',
        steps: [...steps],
        artifacts: [],
      },
    ]);

    const updateAssistant = (patch: Partial<ArenaMessage>) => {
      setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, ...patch } : m)));
    };

    await new Promise((r) => setTimeout(r, 380));
    steps[0] = { ...steps[0], status: 'completed', label: 'Planned execution steps & persistent storage targets' };
    updateAssistant({ steps: [...steps] });

    const lower = promptText.toLowerCase();
    const createdArtifacts: ArenaArtifact[] = [];
    const summaryBullets: string[] = [];
    let battlePairResult: ArenaMessage['battle'] | undefined;

    // 1. Detect OS Theme / App / Software Install Commands
    const themeMatch: { kw: string; theme: XPTheme; label: string }[] = [
      { kw: 'royale', theme: 'royale', label: 'Royale (Media Center Glossy Blue)' },
      { kw: 'zune', theme: 'zune', label: 'Zune (Dark Charcoal & Orange)' },
      { kw: 'silver', theme: 'silver', label: 'Luna Silver' },
      { kw: 'olive', theme: 'olive', label: 'Luna Olive Green' },
      { kw: 'luna blue', theme: 'blue', label: 'Luna Blue' },
    ];
    for (const tm of themeMatch) {
      if (lower.includes(tm.kw)) {
        const st: ArenaToolStep = {
          id: `st-theme-${tm.theme}`,
          tool: 'os_action',
          label: `os.set_theme("${tm.theme}") → ${tm.label}`,
          status: 'completed',
        };
        steps.push(st);
        updateAssistant({ steps: [...steps] });
        setTheme(tm.theme);
        summaryBullets.push(`Switched Windows XP visual style to **${tm.label}**.`);
        break;
      }
    }

    // Open XP apps if requested
    const appTriggers: { kws: string[]; appId: BuiltinAppId; name: string }[] = [
      { kws: ['open slingo', 'launch slingo', 'play slingo'], appId: 'slingo', name: 'Slingo Deluxe' },
      { kws: ['open pinball', 'play pinball', 'space cadet'], appId: 'pinball', name: '3D Pinball Space Cadet' },
      { kws: ['open minesweeper', 'play minesweeper'], appId: 'minesweeper', name: 'Minesweeper' },
      { kws: ['open solitaire'], appId: 'solitaire', name: 'Solitaire' },
      { kws: ['open aol', 'dial aol'], appId: 'aol-dialer', name: 'America Online 9.0' },
      { kws: ['windows update', 'check for update'], appId: 'windows-update', name: 'Windows Update' },
    ];
    for (const trig of appTriggers) {
      if (trig.kws.some((k) => lower.includes(k))) {
        steps.push({
          id: `st-open-${trig.appId}`,
          tool: 'os_action',
          label: `os.open_app("${trig.appId}") → Launched ${trig.name}`,
          status: 'completed',
        });
        updateAssistant({ steps: [...steps] });
        openApp(trig.appId);
        summaryBullets.push(`Launched **${trig.name}** on your Windows XP desktop.`);
      }
    }

    // Install software from catalog if requested
    for (const pkg of INSTALLABLE_CATALOG) {
      if (lower.includes('install') && lower.includes(pkg.appId.split('-')[0])) {
        steps.push({
          id: `st-inst-${pkg.id}`,
          tool: 'os_action',
          label: `os.launch_installer("${pkg.installerFile}")`,
          status: 'completed',
        });
        updateAssistant({ steps: [...steps] });
        launchInstallerWizard(pkg);
        summaryBullets.push(`Opened Setup Wizard for **${pkg.name} ${pkg.version}**.`);
      }
    }

    // 2. Detect VIDEO Generation Request
    const wantsVideo =
      lower.includes('video') ||
      lower.includes('animation') ||
      lower.includes('movie') ||
      lower.includes('clip') ||
      lower.includes('timelapse') ||
      lower.includes('flyover');

    if (wantsVideo) {
      const vidStepId = `st-vid-${Date.now()}`;
      steps.push({
        id: vidStepId,
        tool: 'generate_video',
        label: `Synthesizing 30fps WebM video for "${promptText.slice(0, 48)}..."`,
        status: 'running',
      });
      updateAssistant({ steps: [...steps] });

      const vidRes = await generateArenaVideo(promptText, (pct) => setVideoEncodePct(pct));
      setVideoEncodePct(null);

      const fileName = `vid_${slugify(promptText)}_${Date.now().toString().slice(-4)}.webm`;
      const savedNode = createFile('arena-vids', fileName, vidRes.dataUrl, vidRes.mime, '/icons/luna48/file_generic_video_project.png');
      const art: ArenaArtifact = {
        id: `art-${savedNode.id}`,
        kind: 'video',
        title: fileName,
        vfsId: savedNode.id,
        pathDisplay: `C:\\Documents and Settings\\Administrator\\My Documents\\My Videos\\Arena AI\\${fileName}`,
        mime: vidRes.mime,
        previewSrc: vidRes.dataUrl,
        modelName: vidRes.model,
      };
      createdArtifacts.push(art);
      setSelectedArtifact(art);
      setWorkspaceView('preview');

      const idx = steps.findIndex((s) => s.id === vidStepId);
      if (idx !== -1) {
        steps[idx] = {
          ...steps[idx],
          status: 'completed',
          label: `Saved video to My Videos\\Arena AI\\${fileName}`,
          vfsFileId: savedNode.id,
        };
      }
      updateAssistant({ steps: [...steps], artifacts: [...createdArtifacts] });
      playSound('ding');
      pushBalloon(
        'Arena AI Video Saved!',
        `${fileName} was saved to My Documents\\My Videos\\Arena AI in persistent OS storage.`,
        '/icons/arena-ai.svg',
        'wmplayer'
      );
      summaryBullets.push(
        `Generated playable **WebM video** (\`${fileName}\`) and saved it persistently to \`My Videos\\Arena AI\`.`
      );
    }

    // 3. Detect IMAGE / WALLPAPER Generation Request
    const wantsImage =
      !wantsVideo &&
      (lower.includes('image') ||
        lower.includes('picture') ||
        lower.includes('photo') ||
        lower.includes('wallpaper') ||
        lower.includes('draw') ||
        lower.includes('paint') ||
        lower.includes('poster') ||
        lower.includes('illustration') ||
        lower.includes('art'));

    if (wantsImage) {
      const imgStepId = `st-img-${Date.now()}`;
      steps.push({
        id: imgStepId,
        tool: 'generate_image',
        label: battleMode
          ? 'Generating Side-by-Side Candidate Images (Model A vs Model B)...'
          : 'Generating HD PNG Image & saving to My Pictures\\Arena AI...',
        status: 'running',
      });
      updateAssistant({ steps: [...steps] });
      await new Promise((r) => setTimeout(r, 260));

      const imgA = await generateArenaImage(promptText, 0, settings);
      const fileA = `img_${slugify(promptText)}_A_${Date.now().toString().slice(-4)}.png`;
      const nodeA = createFile('arena-pics', fileA, imgA.dataUrl, 'image/png');

      const artA: ArenaArtifact = {
        id: `art-${nodeA.id}`,
        kind: 'image',
        title: fileA,
        vfsId: nodeA.id,
        pathDisplay: `C:\\Documents and Settings\\Administrator\\My Documents\\My Pictures\\Arena AI\\${fileA}`,
        mime: 'image/png',
        previewSrc: imgA.dataUrl,
        modelName: imgA.model,
      };
      createdArtifacts.push(artA);
      setSelectedArtifact(artA);
      setWorkspaceView('preview');

      if (battleMode) {
        const imgB = await generateArenaImage(promptText, 1, settings);
        const fileB = `img_${slugify(promptText)}_B_${Date.now().toString().slice(-4)}.png`;
        const nodeB = createFile('arena-pics', fileB, imgB.dataUrl, 'image/png');
        createdArtifacts.push({
          id: `art-${nodeB.id}`,
          kind: 'image',
          title: fileB,
          vfsId: nodeB.id,
          pathDisplay: `C:\\Documents and Settings\\Administrator\\My Documents\\My Pictures\\Arena AI\\${fileB}`,
          mime: 'image/png',
          previewSrc: imgB.dataUrl,
          modelName: imgB.model,
        });
        battlePairResult = {
          id: `bat-${Date.now()}`,
          prompt: promptText,
          optionA: { model: imgA.model, dataUrl: imgA.dataUrl, vfsId: nodeA.id },
          optionB: { model: imgB.model, dataUrl: imgB.dataUrl, vfsId: nodeB.id },
        };
      }

      if (lower.includes('wallpaper') || lower.includes('background')) {
        setWallpaper(imgA.dataUrl);
        summaryBullets.push(`Applied the generated HD image directly as your **Windows XP Desktop Wallpaper**!`);
      }

      const idx = steps.findIndex((s) => s.id === imgStepId);
      if (idx !== -1) {
        steps[idx] = {
          ...steps[idx],
          status: 'completed',
          label: `Saved HD PNG${battleMode ? 's' : ''} to My Pictures\\Arena AI\\${fileA}`,
          vfsFileId: nodeA.id,
        };
      }
      updateAssistant({ steps: [...steps], artifacts: [...createdArtifacts], battle: battlePairResult });
      playSound('ding');
      summaryBullets.push(
        `Generated HD image${battleMode ? ' battle pair' : ''} and saved persistently to \`My Pictures\\Arena AI\`.`
      );
    }

    // 4. Detect WEB APP / CODE / FILE / NOTES Creation Request (or general task!)
    const wantsCodeOrFile =
      !wantsVideo &&
      !wantsImage &&
      (lower.includes('build') ||
        lower.includes('create') ||
        lower.includes('make') ||
        lower.includes('app') ||
        lower.includes('website') ||
        lower.includes('page') ||
        lower.includes('game') ||
        lower.includes('calculator') ||
        lower.includes('studio') ||
        lower.includes('file') ||
        lower.includes('note') ||
        lower.includes('write') ||
        lower.includes('script') ||
        summaryBullets.length === 0);

    if (wantsCodeOrFile) {
      if (lower.includes('note') || lower.includes('.txt') || lower.includes('document')) {
        const noteName = `${slugify(promptText)}_${Date.now().toString().slice(-3)}.txt`;
        const noteBody = `Arena AI Agent — Generated Document
======================================
Created: ${new Date().toLocaleString()}
Request: ${promptText}

Key Notes & Action Plan:
1. Stored permanently in Windows XP Persistent Storage (My Documents).
2. Double-click this file anytime in My Computer / Explorer to edit in Notepad!
3. Tip: In Slingo Deluxe, save Free Spin tokens for Spins 17–20 (worth up to 2,000 pts each) and prioritize center/diagonal squares with Jokers!
`;
        const node = createFile('my-docs', noteName, noteBody, 'text/plain');
        steps.push({
          id: `st-write-${node.id}`,
          tool: 'write_file',
          label: `write_file("My Documents\\${noteName}")`,
          status: 'completed',
          vfsFileId: node.id,
        });
        const art: ArenaArtifact = {
          id: `art-${node.id}`,
          kind: 'file',
          title: noteName,
          vfsId: node.id,
          pathDisplay: `C:\\Documents and Settings\\Administrator\\My Documents\\${noteName}`,
          mime: 'text/plain',
          previewSrc: noteBody,
        };
        createdArtifacts.push(art);
        setSelectedArtifact(art);
        setWorkspaceView('code');
        summaryBullets.push(`Created text file **\`${noteName}\`** in \`My Documents\`.`);
      } else {
        // Synthesize full interactive HTML/JS Web App Project in My Documents\Arena AI Projects!
        const synth = synthesizeArenaWebApp(promptText);
        const projFolder = createFolder('arena-projects', synth.appName, '/icons/luna48/folder_programs.png');
        steps.push({
          id: `st-mkdir-${projFolder.id}`,
          tool: 'mkdir',
          label: `mkdir("My Documents\\Arena AI Projects\\${synth.appName}")`,
          status: 'completed',
        });
        updateAssistant({ steps: [...steps] });
        await new Promise((r) => setTimeout(r, 240));

        const htmlNode = createFile(projFolder.id, 'index.html', synth.html, 'text/html', '/icons/luna48/file_html.png');
        const readmeNode = createFile(projFolder.id, 'README.md', synth.readme, 'text/plain');

        steps.push(
          {
            id: `st-wf-${htmlNode.id}`,
            tool: 'write_file',
            label: `write_file("${synth.appName}\\index.html") — ${synth.html.length.toLocaleString()} bytes`,
            status: 'completed',
            vfsFileId: htmlNode.id,
          },
          {
            id: `st-wf-${readmeNode.id}`,
            tool: 'write_file',
            label: `write_file("${synth.appName}\\README.md")`,
            status: 'completed',
            vfsFileId: readmeNode.id,
          },
          {
            id: `st-ver-${htmlNode.id}`,
            tool: 'verify_preview',
            label: `Verified live interactive preview & saved to persistent IndexedDB VFS`,
            status: 'completed',
          }
        );

        const appArt: ArenaArtifact = {
          id: `art-${htmlNode.id}`,
          kind: 'webapp',
          title: synth.appName,
          vfsId: htmlNode.id,
          pathDisplay: `C:\\Documents and Settings\\Administrator\\My Documents\\Arena AI Projects\\${synth.appName}\\index.html`,
          mime: 'text/html',
          previewSrc: synth.html,
          modelName: 'Arena-Code-Agent',
        };
        createdArtifacts.push(appArt);
        setSelectedArtifact(appArt);
        setWorkspaceView('preview');

        if (lower.includes('desktop') || lower.includes('pin') || lower.includes('install')) {
          pinArtifactAsDesktopApp(appArt);
          summaryBullets.push(`Pinned **${synth.appName}** directly onto your **Windows XP Desktop** & Start Menu!`);
        }

        summaryBullets.push(synth.summary);
        summaryBullets.push(
          `Saved project files persistently under \`My Documents\\Arena AI Projects\\${synth.appName}\`.`
        );
      }
    }

    updateAssistant({
      steps: [...steps],
      artifacts: [...createdArtifacts],
      battle: battlePairResult,
      text:
        summaryBullets.length > 0
          ? summaryBullets.map((b) => `• ${b}`).join('\n')
          : 'Completed task and synced changes to Windows XP Persistent Storage.',
    });
    setBusy(false);
  };

  // Dedicated Image Studio handler
  const handleStudioGenerateImage = () => {
    if (!imgPrompt.trim()) return;
    void handleRunAgentPrompt(`Generate an image of ${imgPrompt.trim()}`);
  };

  // Dedicated Video Studio handler
  const handleStudioGenerateVideo = () => {
    if (!vidPrompt.trim()) return;
    void handleRunAgentPrompt(`Generate a video of ${vidPrompt.trim()}`);
  };

  // Collect all Arena-created persistent files from VFS
  const arenaVfsFiles = vfs.filter(
    (n) =>
      n.type === 'file' &&
      (n.parentId === 'arena-pics' ||
        n.parentId === 'arena-vids' ||
        vfs.some((p) => p.id === n.parentId && p.parentId === 'arena-projects'))
  );

  const isStudioDark = settings.uiSkin === 'arena-studio';

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: isStudioDark ? '#0b0f19' : '#ece9d8',
        color: isStudioDark ? '#f1f5f9' : '#0f172a',
        fontFamily: 'Tahoma, system-ui, sans-serif',
        fontSize: 11,
        minHeight: 0,
        overflow: 'hidden',
      }}
    >
      {/* Top Header / Navigation Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 12px',
          background: isStudioDark
            ? 'linear-gradient(90deg, #0f172a 0%, #1e1b4b 100%)'
            : 'linear-gradient(90deg, #00309c 0%, #245edb 65%, #3b82f6 100%)',
          color: '#fff',
          borderBottom: isStudioDark ? '1px solid #334155' : '2px solid #f59e0b',
          flexShrink: 0,
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src="/icons/arena-ai.svg" alt="Arena AI" style={{ width: 24, height: 24 }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 13, letterSpacing: 0.2 }}>
              Arena AI Agent {embeddedInIE ? '— arena.ai/agent' : '— Built-In Windows XP Copilot'}
            </div>
            <div style={{ fontSize: 10, color: '#bfdbfe' }}>
              Autonomous Tasks • Code & Apps • Image & Video Gen • Persistent VFS ({storageInfo.usedMB} MB used)
            </div>
          </div>
        </div>

        {/* Mode Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {[
            { id: 'agent', label: '🤖 Agent Mode' },
            { id: 'image', label: '🎨 Image Gen' },
            { id: 'video', label: '🎬 Video Gen' },
            { id: 'files', label: `💾 Saved Files (${arenaVfsFiles.length})` },
            { id: 'settings', label: '⚙️ Settings' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id as typeof activeTab)}
              style={{
                padding: '4px 10px',
                borderRadius: 4,
                border: activeTab === t.id ? '1px solid #fde047' : '1px solid rgba(255,255,255,0.28)',
                background:
                  activeTab === t.id
                    ? 'linear-gradient(180deg, #facc15 0%, #eab308 100%)'
                    : 'rgba(255,255,255,0.12)',
                color: activeTab === t.id ? '#1e293b' : '#ffffff',
                fontWeight: 700,
                fontSize: 11,
                cursor: 'pointer',
              }}
            >
              {t.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowWorkspacePane((v) => !v)}
            style={{
              padding: '4px 8px',
              borderRadius: 4,
              border: '1px solid rgba(255,255,255,0.35)',
              background: 'rgba(0,0,0,0.25)',
              color: '#fff',
              fontSize: 10,
              cursor: 'pointer',
            }}
            title="Toggle Live Preview & Code Pane"
          >
            {showWorkspacePane ? '◫ Hide Pane' : '◫ Show Pane'}
          </button>
        </div>
      </div>

      {/* Main Split Workspace */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
        {/* Left / Primary Column */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
          {activeTab === 'agent' && (
            <>
              {/* Quick Starter Chips */}
              <div
                style={{
                  display: 'flex',
                  gap: 6,
                  padding: '6px 10px',
                  overflowX: 'auto',
                  borderBottom: isStudioDark ? '1px solid #1e293b' : '1px solid #d4d0c8',
                  background: isStudioDark ? '#0f172a' : '#f7f5ec',
                  flexShrink: 0,
                }}
              >
                {QUICK_PROMPTS.map((qp) => (
                  <button
                    key={qp.label}
                    type="button"
                    disabled={busy}
                    onClick={() => void handleRunAgentPrompt(qp.prompt)}
                    style={{
                      whiteSpace: 'nowrap',
                      padding: '3px 9px',
                      borderRadius: 12,
                      border: isStudioDark ? '1px solid #334155' : '1px solid #93c5fd',
                      background: isStudioDark ? '#1e293b' : '#eff6ff',
                      color: isStudioDark ? '#e2e8f0' : '#1e3a8a',
                      fontSize: 10,
                      fontWeight: 600,
                      cursor: busy ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {qp.icon} {qp.label}
                  </button>
                ))}
              </div>

              {/* Conversation & Tool-Call Stream */}
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  background: isStudioDark ? '#0b0f19' : '#ffffff',
                }}
              >
                {messages.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      alignSelf: m.role === 'user' ? 'flex-end' : 'stretch',
                      maxWidth: m.role === 'user' ? '82%' : '100%',
                      background:
                        m.role === 'user'
                          ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)'
                          : isStudioDark
                          ? '#111827'
                          : '#f8fafc',
                      color: m.role === 'user' ? '#ffffff' : isStudioDark ? '#f1f5f9' : '#0f172a',
                      border:
                        m.role === 'user'
                          ? 'none'
                          : isStudioDark
                          ? '1px solid #1f2937'
                          : '1px solid #cbd5e1',
                      borderRadius: 8,
                      padding: '9px 12px',
                    }}
                  >
                    {m.role === 'assistant' && (
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: 10,
                          color: isStudioDark ? '#93c5fd' : '#1d4ed8',
                          fontWeight: 700,
                          marginBottom: 6,
                        }}
                      >
                        <span>✨ {m.modelBadge || 'Arena AI Agent'}</span>
                        <span style={{ opacity: 0.7 }}>{m.timestamp}</span>
                      </div>
                    )}

                    {/* Tool-Call Trace Pills (arena.ai/agent style!) */}
                    {m.steps && m.steps.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                        {m.steps.map((st) => (
                          <div
                            key={st.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 7,
                              padding: '4px 8px',
                              borderRadius: 5,
                              fontSize: 10,
                              fontFamily: "'Lucida Console', monospace",
                              background: isStudioDark ? '#1e293b' : '#eef2ff',
                              border: isStudioDark ? '1px solid #334155' : '1px solid #c7d2fe',
                              color: isStudioDark ? '#cbd5e1' : '#1e3a8a',
                            }}
                          >
                            <span>
                              {st.status === 'running'
                                ? '⏳'
                                : st.tool === 'thinking'
                                ? '💭'
                                : st.tool === 'generate_image'
                                ? '🎨'
                                : st.tool === 'generate_video'
                                ? '🎬'
                                : st.tool === 'os_action'
                                ? '⚙️'
                                : '📝'}
                            </span>
                            <span style={{ flex: 1 }}>{st.label}</span>
                            <span style={{ color: st.status === 'completed' ? '#16a34a' : '#f59e0b', fontWeight: 700 }}>
                              {st.status === 'completed' ? 'DONE' : 'RUNNING'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Side-by-Side Arena Model Battle UI when present */}
                    {m.battle && (
                      <div
                        style={{
                          marginBottom: 8,
                          padding: 8,
                          borderRadius: 6,
                          background: isStudioDark ? '#0f172a' : '#eff6ff',
                          border: '1px solid #60a5fa',
                        }}
                      >
                        <div style={{ fontWeight: 800, fontSize: 11, marginBottom: 6, color: '#2563eb' }}>
                          ⚔️ Arena Image Battle — Vote for the Better Model! (Both saved to My Pictures\Arena AI)
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          {(['A', 'B'] as const).map((side) => {
                            const opt = side === 'A' ? m.battle!.optionA : m.battle!.optionB;
                            const isWinner = m.battle!.voted === side;
                            return (
                              <div
                                key={side}
                                style={{
                                  border: isWinner ? '2px solid #16a34a' : '1px solid #94a3b8',
                                  borderRadius: 6,
                                  padding: 6,
                                  background: isStudioDark ? '#1e293b' : '#fff',
                                }}
                              >
                                <img
                                  src={opt.dataUrl}
                                  alt={`Option ${side}`}
                                  style={{ width: '100%', height: 135, objectFit: 'cover', borderRadius: 4 }}
                                />
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 }}>
                                  <span style={{ fontWeight: 700, fontSize: 10 }}>
                                    {m.battle!.voted ? `${side}: ${opt.model}` : `Model ${side}`}
                                  </span>
                                  <div style={{ display: 'flex', gap: 4 }}>
                                    <button
                                      className="xp-btn"
                                      style={{ padding: '1px 7px', minHeight: 20, fontSize: 10 }}
                                      onClick={() => {
                                        setMessages((prev) =>
                                          prev.map((msg) =>
                                            msg.id === m.id && msg.battle
                                              ? { ...msg, battle: { ...msg.battle, voted: side } }
                                              : msg
                                          )
                                        );
                                        playSound('ding');
                                      }}
                                    >
                                      {isWinner ? '🏆 Winner' : `Vote ${side}`}
                                    </button>
                                    <button
                                      className="xp-btn"
                                      style={{ padding: '1px 7px', minHeight: 20, fontSize: 10 }}
                                      onClick={() => setWallpaper(opt.dataUrl)}
                                    >
                                      Wallpaper
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Inline Artifact Action Cards */}
                    {m.artifacts && m.artifacts.length > 0 && !m.battle && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
                        {m.artifacts.map((art) => (
                          <div
                            key={art.id}
                            style={{
                              padding: 8,
                              borderRadius: 6,
                              border: '1px solid #93c5fd',
                              background: isStudioDark ? '#1e293b' : '#eff6ff',
                            }}
                          >
                            {art.kind === 'image' && art.previewSrc && (
                              <img
                                src={art.previewSrc}
                                alt={art.title}
                                style={{ width: '100%', maxHeight: 210, objectFit: 'cover', borderRadius: 4, marginBottom: 6 }}
                              />
                            )}
                            {art.kind === 'video' && art.previewSrc && (
                              <video
                                src={art.previewSrc}
                                controls
                                autoPlay
                                loop
                                muted
                                style={{ width: '100%', maxHeight: 210, borderRadius: 4, background: '#000', marginBottom: 6 }}
                              />
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <div>
                                <div style={{ fontWeight: 700 }}>{art.title}</div>
                                <div style={{ fontSize: 9.5, opacity: 0.75 }}>{art.pathDisplay}</div>
                              </div>
                              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                                <button
                                  className="xp-btn"
                                  style={{ padding: '2px 8px', minHeight: 20, fontSize: 10 }}
                                  onClick={() => {
                                    setSelectedArtifact(art);
                                    setShowWorkspacePane(true);
                                    setWorkspaceView('preview');
                                  }}
                                >
                                  👁 Preview
                                </button>
                                {art.kind === 'image' && art.previewSrc && (
                                  <button
                                    className="xp-btn"
                                    style={{ padding: '2px 8px', minHeight: 20, fontSize: 10 }}
                                    onClick={() => setWallpaper(art.previewSrc!)}
                                  >
                                    🖼 Set Wallpaper
                                  </button>
                                )}
                                {art.kind === 'video' && (
                                  <button
                                    className="xp-btn"
                                    style={{ padding: '2px 8px', minHeight: 20, fontSize: 10 }}
                                    onClick={() => openApp('wmplayer', { vfsId: art.vfsId, title: `${art.title} - Windows Media Player` })}
                                  >
                                    ▶ Open in WMP9
                                  </button>
                                )}
                                {art.kind === 'webapp' && (
                                  <>
                                    <button
                                      className="xp-btn"
                                      style={{ padding: '2px 8px', minHeight: 20, fontSize: 10 }}
                                      onClick={() => openApp('ie', { url: `vfs://${art.vfsId}` })}
                                    >
                                      🌐 Open in IE6
                                    </button>
                                    <button
                                      className="xp-btn xp-btn-primary"
                                      style={{ padding: '2px 8px', minHeight: 20, fontSize: 10 }}
                                      onClick={() => pinArtifactAsDesktopApp(art)}
                                    >
                                      📌 Pin to XP Desktop
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Message Text */}
                    <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5, fontSize: 11.5 }}>{m.text}</div>
                  </div>
                ))}

                {videoEncodePct !== null && (
                  <div
                    style={{
                      padding: '8px 12px',
                      borderRadius: 6,
                      background: '#1e293b',
                      color: '#fde047',
                      fontWeight: 700,
                    }}
                  >
                    🎬 Encoding 30fps WebM Video Stream to Persistent VFS... {videoEncodePct}%
                  </div>
                )}

                <div ref={chatBottomRef} />
              </div>

              {/* Prompt Composer */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleRunAgentPrompt();
                }}
                style={{
                  display: 'flex',
                  gap: 8,
                  padding: 10,
                  borderTop: isStudioDark ? '1px solid #1e293b' : '1px solid #aca899',
                  background: isStudioDark ? '#0f172a' : '#ece9d8',
                }}
              >
                <input
                  className="xp-input"
                  style={{
                    flex: 1,
                    height: 32,
                    fontSize: 12,
                    padding: '4px 10px',
                    background: isStudioDark ? '#1e293b' : '#ffffff',
                    color: isStudioDark ? '#ffffff' : '#000000',
                  }}
                  placeholder="Ask Arena AI to build an app, generate an image or video, create files, or control Windows XP..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={busy}
                />
                <button
                  type="submit"
                  disabled={busy || !input.trim()}
                  className="xp-btn xp-btn-primary"
                  style={{ height: 32, padding: '0 16px', fontWeight: 700 }}
                >
                  {busy ? '⏳ Working...' : '✨ Run Agent'}
                </button>
              </form>
            </>
          )}

          {/* Dedicated Image Studio Tab */}
          {activeTab === 'image' && (
            <div style={{ flex: 1, padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontWeight: 800, fontSize: 15 }}>
                🎨 Arena AI Image Studio — Saved Automatically to <code style={{ fontSize: 12 }}>My Pictures\Arena AI</code>
              </div>
              <textarea
                className="xp-input"
                rows={3}
                style={{ width: '100%', padding: 8, fontSize: 12, color: '#000', background: '#fff' }}
                value={imgPrompt}
                onChange={(e) => setImgPrompt(e.target.value)}
                placeholder="Describe any image to generate..."
              />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 700 }}>
                  <input type="checkbox" checked={battleMode} onChange={(e) => setBattleMode(e.target.checked)} />
                  ⚔️ Arena Side-by-Side Battle Mode (Generate 2 models & compare!)
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="xp-btn" onClick={() => openApp('explorer', { folderId: 'arena-pics' })}>
                    📂 Open My Pictures\Arena AI
                  </button>
                  <button className="xp-btn xp-btn-primary" disabled={busy} onClick={handleStudioGenerateImage}>
                    🎨 Generate HD Image
                  </button>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10, marginTop: 6 }}>
                {vfs
                  .filter((n) => n.parentId === 'arena-pics' && n.content)
                  .slice()
                  .reverse()
                  .map((node) => (
                    <div
                      key={node.id}
                      style={{
                        border: '1px solid #94a3b8',
                        borderRadius: 6,
                        padding: 6,
                        background: isStudioDark ? '#1e293b' : '#fff',
                      }}
                    >
                      <img
                        src={node.content}
                        alt={node.name}
                        style={{ width: '100%', height: 110, objectFit: 'cover', borderRadius: 4 }}
                      />
                      <div style={{ fontWeight: 700, fontSize: 10, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {node.name}
                      </div>
                      <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                        <button
                          className="xp-btn"
                          style={{ flex: 1, fontSize: 9.5, padding: '1px 4px', minHeight: 19 }}
                          onClick={() => node.content && setWallpaper(node.content)}
                        >
                          Wallpaper
                        </button>
                        <button
                          className="xp-btn"
                          style={{ flex: 1, fontSize: 9.5, padding: '1px 4px', minHeight: 19 }}
                          onClick={() =>
                            openApp('picture-viewer', { src: node.content, title: `${node.name} - Picture Viewer` })
                          }
                        >
                          Open
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Dedicated Video Studio Tab */}
          {activeTab === 'video' && (
            <div style={{ flex: 1, padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontWeight: 800, fontSize: 15 }}>
                🎬 Arena AI Video Synthesizer — Real 30fps <code style={{ fontSize: 12 }}>.webm</code> Videos Saved to{' '}
                <code style={{ fontSize: 12 }}>My Videos\Arena AI</code>
              </div>
              <textarea
                className="xp-input"
                rows={3}
                style={{ width: '100%', padding: 8, fontSize: 12, color: '#000', background: '#fff' }}
                value={vidPrompt}
                onChange={(e) => setVidPrompt(e.target.value)}
                placeholder="Describe any motion scene to synthesize into a WebM video..."
              />
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[
                  'Cyberpunk neon highway flyover at midnight',
                  'Windows XP Sonoma Bliss clouds rolling across green hills',
                  'Golden sunset ocean waves shimmering',
                  'Deep space ringed planet & spiral galaxy',
                  'Matrix green digital code rain',
                ].map((preset) => (
                  <button
                    key={preset}
                    className="xp-btn"
                    style={{ fontSize: 10 }}
                    onClick={() => setVidPrompt(preset)}
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button className="xp-btn" onClick={() => openApp('explorer', { folderId: 'arena-vids' })}>
                  📂 Open My Videos\Arena AI
                </button>
                <button className="xp-btn xp-btn-primary" disabled={busy} onClick={handleStudioGenerateVideo}>
                  {busy ? '🎬 Rendering Video...' : '🎬 Generate .WEBM Video'}
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
                {vfs
                  .filter((n) => n.parentId === 'arena-vids' && n.content)
                  .slice()
                  .reverse()
                  .map((node) => (
                    <div
                      key={node.id}
                      style={{
                        border: '1px solid #94a3b8',
                        borderRadius: 6,
                        padding: 6,
                        background: isStudioDark ? '#1e293b' : '#fff',
                      }}
                    >
                      <video
                        src={node.content}
                        controls
                        loop
                        muted
                        style={{ width: '100%', height: 124, background: '#000', borderRadius: 4 }}
                      />
                      <div style={{ fontWeight: 700, fontSize: 10, marginTop: 4 }}>{node.name}</div>
                      <button
                        className="xp-btn"
                        style={{ width: '100%', marginTop: 4, fontSize: 10 }}
                        onClick={() =>
                          openApp('wmplayer', { vfsId: node.id, title: `${node.name} - Windows Media Player` })
                        }
                      >
                        ▶ Play in Windows Media Player 9
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Persistent Saved Files Tab */}
          {activeTab === 'files' && (
            <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>
                    💾 Arena AI Persistent Files in Windows XP Virtual Hard Drive
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.8 }}>
                    Stored in IndexedDB Persistent Storage ({storageInfo.usedMB} MB used of {storageInfo.quotaMB} MB quota)
                  </div>
                </div>
                <button className="xp-btn" onClick={() => openApp('explorer', { folderId: 'my-docs' })}>
                  📂 Browse in Windows Explorer
                </button>
              </div>

              {arenaVfsFiles.length === 0 ? (
                <div style={{ padding: 20, opacity: 0.7 }}>
                  No Arena AI files generated yet — run any prompt in Agent Mode, Image Gen, or Video Gen!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {arenaVfsFiles
                    .slice()
                    .reverse()
                    .map((f) => (
                      <div
                        key={f.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '7px 10px',
                          borderRadius: 5,
                          border: '1px solid #94a3b8',
                          background: isStudioDark ? '#1e293b' : '#fff',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700 }}>{f.name}</div>
                          <div style={{ fontSize: 10, opacity: 0.75 }}>
                            {f.mime} • {Math.max(1, Math.round((f.sizeBytes || 0) / 1024))} KB • {f.modifiedAt}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {f.mime?.startsWith('image/') && (
                            <button
                              className="xp-btn"
                              onClick={() => openApp('picture-viewer', { src: f.content, title: f.name })}
                            >
                              View Image
                            </button>
                          )}
                          {f.mime?.startsWith('video/') && (
                            <button
                              className="xp-btn"
                              onClick={() => openApp('wmplayer', { vfsId: f.id, title: f.name })}
                            >
                              Play Video
                            </button>
                          )}
                          {f.mime === 'text/html' && (
                            <button className="xp-btn" onClick={() => openApp('ie', { url: `vfs://${f.id}` })}>
                              Open in IE6
                            </button>
                          )}
                          {!f.mime?.startsWith('image/') && !f.mime?.startsWith('video/') && (
                            <button
                              className="xp-btn"
                              onClick={() => openApp('notepad', { fileId: f.id, title: `${f.name} - Notepad` })}
                            >
                              Edit in Notepad
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div style={{ flex: 1, padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontWeight: 800, fontSize: 15 }}>⚙️ Arena AI OS Integration Settings</div>
              <div
                style={{
                  padding: 12,
                  borderRadius: 6,
                  border: '1px solid #94a3b8',
                  background: isStudioDark ? '#1e293b' : '#fff',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>Interface Appearance:</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className={`xp-btn ${settings.uiSkin === 'xp-native' ? 'xp-btn-primary' : ''}`}
                      onClick={() => setSettings((s) => ({ ...s, uiSkin: 'xp-native' }))}
                    >
                      🪟 Windows XP Native Luna Skin
                    </button>
                    <button
                      className={`xp-btn ${settings.uiSkin === 'arena-studio' ? 'xp-btn-primary' : ''}`}
                      onClick={() => setSettings((s) => ({ ...s, uiSkin: 'arena-studio' }))}
                    >
                      🌙 arena.ai/agent Dark Studio Skin
                    </button>
                  </div>
                </div>

                <div>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>
                    Engine Provider (Works 100% Built-In Offline/Zero-Key, or Connect Live Cloud API):
                  </div>
                  <select
                    className="xp-input"
                    style={{ width: 280, height: 26, color: '#000', background: '#fff' }}
                    value={settings.provider}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, provider: e.target.value as ArenaSettingsConfig['provider'] }))
                    }
                  >
                    <option value="builtin">Built-In Arena XP Autonomous Engine (No Key Needed)</option>
                    <option value="openai">OpenAI Live API (DALL·E 3 + GPT)</option>
                    <option value="openrouter">OpenRouter Live Multi-Model API</option>
                  </select>
                </div>

                {settings.provider !== 'builtin' && (
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>API Key (Stored Locally in Your Browser):</div>
                    <input
                      type="password"
                      className="xp-input"
                      style={{ width: '100%', maxWidth: 420, color: '#000', background: '#fff' }}
                      placeholder="sk-..."
                      value={settings.apiKey}
                      onChange={(e) => setSettings((s) => ({ ...s, apiKey: e.target.value }))}
                    />
                  </div>
                )}

                <div>
                  <button
                    className="xp-btn"
                    onClick={() => {
                      setMessages(INITIAL_WELCOME_MESSAGES);
                      playSound('recycle');
                    }}
                  >
                    🧹 Clear Chat History (Keep Saved VFS Files)
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Live Preview / Code / VFS Inspector Pane (arena.ai/agent split view!) */}
        {showWorkspacePane && (
          <div
            style={{
              width: '40%',
              minWidth: 270,
              borderLeft: isStudioDark ? '1px solid #334155' : '2px solid #aca899',
              display: 'flex',
              flexDirection: 'column',
              background: isStudioDark ? '#0f172a' : '#f5f3e8',
              minHeight: 0,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '5px 8px',
                borderBottom: isStudioDark ? '1px solid #334155' : '1px solid #aca899',
                gap: 4,
              }}
            >
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  className="xp-btn"
                  style={{ padding: '2px 8px', minHeight: 21, fontWeight: workspaceView === 'preview' ? 700 : 400 }}
                  onClick={() => setWorkspaceView('preview')}
                >
                  ▶ Live Preview
                </button>
                <button
                  className="xp-btn"
                  style={{ padding: '2px 8px', minHeight: 21, fontWeight: workspaceView === 'code' ? 700 : 400 }}
                  onClick={() => setWorkspaceView('code')}
                >
                  {'</>'} Source
                </button>
                <button
                  className="xp-btn"
                  style={{ padding: '2px 8px', minHeight: 21, fontWeight: workspaceView === 'vfs' ? 700 : 400 }}
                  onClick={() => setWorkspaceView('vfs')}
                >
                  📁 VFS ({arenaVfsFiles.length})
                </button>
              </div>
              {selectedArtifact?.kind === 'webapp' && (
                <button
                  className="xp-btn xp-btn-primary"
                  style={{ padding: '2px 7px', minHeight: 21, fontSize: 10 }}
                  onClick={() => pinArtifactAsDesktopApp(selectedArtifact)}
                >
                  📌 Pin to Desktop
                </button>
              )}
            </div>

            <div style={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
              {workspaceView === 'preview' && (
                <>
                  {!selectedArtifact ? (
                    <div
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 20,
                        textAlign: 'center',
                        opacity: 0.72,
                      }}
                    >
                      <img src="/icons/arena-ai.svg" alt="" style={{ width: 48, height: 48, marginBottom: 8 }} />
                      <div style={{ fontWeight: 700, fontSize: 12 }}>Live Agent Artifact Workspace</div>
                      <div style={{ marginTop: 4 }}>
                        Generated web apps, HD images, and 30fps WebM videos appear right here and save automatically to
                        Windows XP Persistent Storage.
                      </div>
                    </div>
                  ) : selectedArtifact.kind === 'webapp' ? (
                    <iframe
                      title={selectedArtifact.title}
                      srcDoc={vfs.find((n) => n.id === selectedArtifact.vfsId)?.content || selectedArtifact.previewSrc}
                      style={{ flex: 1, width: '100%', border: 'none', background: '#fff' }}
                    />
                  ) : selectedArtifact.kind === 'image' ? (
                    <div style={{ padding: 12, textAlign: 'center' }}>
                      <img
                        src={selectedArtifact.previewSrc}
                        alt={selectedArtifact.title}
                        style={{ width: '100%', borderRadius: 6, border: '1px solid #64748b' }}
                      />
                      <div style={{ marginTop: 8, display: 'flex', justifyContent: 'center', gap: 8 }}>
                        <button
                          className="xp-btn xp-btn-primary"
                          onClick={() => selectedArtifact.previewSrc && setWallpaper(selectedArtifact.previewSrc)}
                        >
                          🖼 Set as XP Desktop Wallpaper
                        </button>
                        <a
                          href={selectedArtifact.previewSrc}
                          download={selectedArtifact.title}
                          className="xp-btn"
                          style={{ textDecoration: 'none' }}
                        >
                          ⬇ Download PNG
                        </a>
                      </div>
                    </div>
                  ) : selectedArtifact.kind === 'video' ? (
                    <div style={{ padding: 12, textAlign: 'center' }}>
                      <video
                        src={selectedArtifact.previewSrc}
                        controls
                        autoPlay
                        loop
                        style={{ width: '100%', borderRadius: 6, background: '#000' }}
                      />
                      <div style={{ marginTop: 8, display: 'flex', justifyContent: 'center', gap: 8 }}>
                        <button
                          className="xp-btn xp-btn-primary"
                          onClick={() =>
                            openApp('wmplayer', {
                              vfsId: selectedArtifact.vfsId,
                              title: `${selectedArtifact.title} - Windows Media Player`,
                            })
                          }
                        >
                          ▶ Open in Windows Media Player
                        </button>
                        <a
                          href={selectedArtifact.previewSrc}
                          download={selectedArtifact.title}
                          className="xp-btn"
                          style={{ textDecoration: 'none' }}
                        >
                          ⬇ Download WebM
                        </a>
                      </div>
                    </div>
                  ) : (
                    <pre style={{ padding: 12, margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                      {selectedArtifact.previewSrc}
                    </pre>
                  )}
                </>
              )}

              {workspaceView === 'code' && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                  <textarea
                    value={codeDraft}
                    onChange={(e) => setCodeDraft(e.target.value)}
                    placeholder="Select a generated HTML/text artifact to inspect and live-edit its source in VFS..."
                    style={{
                      flex: 1,
                      border: 'none',
                      outline: 'none',
                      padding: 10,
                      fontFamily: "'Lucida Console', monospace",
                      fontSize: 11,
                      background: '#0f172a',
                      color: '#e2e8f0',
                      resize: 'none',
                    }}
                  />
                  {selectedArtifact && (
                    <div style={{ padding: 6, display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                      <button
                        className="xp-btn xp-btn-primary"
                        onClick={() => {
                          updateFileContent(selectedArtifact.vfsId, codeDraft);
                          setWorkspaceView('preview');
                          playSound('ding');
                        }}
                      >
                        💾 Save Changes to Persistent VFS & Preview
                      </button>
                    </div>
                  )}
                </div>
              )}

              {workspaceView === 'vfs' && (
                <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {arenaVfsFiles.map((f) => (
                    <div
                      key={f.id}
                      onClick={() => {
                        setSelectedArtifact({
                          id: `art-${f.id}`,
                          kind: f.mime?.startsWith('image/')
                            ? 'image'
                            : f.mime?.startsWith('video/')
                            ? 'video'
                            : f.mime === 'text/html'
                            ? 'webapp'
                            : 'file',
                          title: f.name,
                          vfsId: f.id,
                          pathDisplay: f.name,
                          mime: f.mime || 'text/plain',
                          previewSrc: f.content,
                        });
                        setWorkspaceView('preview');
                      }}
                      style={{
                        padding: '6px 8px',
                        borderRadius: 4,
                        border: '1px solid #94a3b8',
                        background: isStudioDark ? '#1e293b' : '#fff',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ fontWeight: 700 }}>{f.name}</div>
                      <div style={{ fontSize: 10, opacity: 0.7 }}>{f.mime}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState, useRef, useEffect } from 'react';
import { useOS, INSTALLABLE_CATALOG, BuiltinAppId } from '../../../context/OSContext';

const PS_CMDS = [
  'Get-Help',
  'Get-ChildItem',
  'Set-Location',
  'Get-Location',
  'Get-Content',
  'Set-Content',
  'New-Item',
  'Remove-Item',
  'Get-Process',
  'Stop-Process',
  'Get-Service',
  'Get-ComputerInfo',
  'Get-HotFix',
  'Test-Connection',
  'Start-Process',
  'Get-TrillApk',
  'Get-TrillPackage',
  'Install-TrillPackage',
  'Clear-Host',
];

const FOLDER_DISPLAY_PATHS: Record<string, string> = {
  root: 'C:\\',
  'c:': 'C:\\',
  'c-windows': 'C:\\WINDOWS',
  'c-progfiles': 'C:\\Program Files',
  'c-docs-root': 'C:\\Documents and Settings',
  'my-docs': 'C:\\Documents and Settings\\Administrator\\My Documents',
  'my-pics': 'C:\\Documents and Settings\\Administrator\\My Documents\\My Pictures',
  'my-videos': 'C:\\Documents and Settings\\Administrator\\My Documents\\My Videos',
  'my-music': 'C:\\Documents and Settings\\Administrator\\My Documents\\My Music',
  'shared-dl': 'C:\\Documents and Settings\\Administrator\\Downloads',
};

export const PowerShellApp: React.FC = () => {
  const {
    vfs,
    windows,
    closeWindow,
    openApp,
    createFile,
    createFolder,
    deleteNodeToRecycleBin,
    launchInstallerWizard,
    aolConnected,
  } = useOS();

  const [cwdId, setCwdId] = useState<string>('my-docs');
  const [lines, setLines] = useState<Array<{ text: string; color?: string }>>([
    { text: 'Windows PowerShell 1.0 (Monad — KB926139 for Windows XP SP3)' },
    { text: 'Copyright (C) 2006 Microsoft Corporation. TrillXP Preservation Shell.' },
    { text: '' },
    {
      text: 'Tip: Try Get-Help, Get-ChildItem (ls), Get-Process (ps), Get-ComputerInfo, Get-TrillApk, or 1..5 | % { $_ * $_ }',
      color: '#fde047',
    },
    { text: '' },
  ]);
  const [input, setInput] = useState('');
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [histCursor, setHistCursor] = useState<number>(-1);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView();
  }, [lines]);

  const currentPath =
    FOLDER_DISPLAY_PATHS[cwdId] ||
    `C:\\Documents and Settings\\Administrator\\${vfs.find((n) => n.id === cwdId)?.name || 'My Documents'}`;

  const appendOut = (items: Array<string | { text: string; color?: string }>) => {
    setLines((prev) => [
      ...prev,
      ...items.map((it) => (typeof it === 'string' ? { text: it } : it)),
    ]);
  };

  const evaluateSingleStage = (expr: string): string[] => {
    const trimmed = expr.trim();
    const lower = trimmed.toLowerCase();

    if (!trimmed) return [];

    // Built-in PowerShell variables
    if (lower === '$psversiontable') {
      return [
        'Name                           Value',
        '----                           -----',
        'PSVersion                      1.0.9567.1 (Monad)',
        'PSEdition                      Desktop (Windows XP SP3)',
        'OS                             TrillXP [Microsoft Windows NT 5.1.2600 SP3]',
        'Platform                       Win32NT / WebAssembly + IndexedDB',
      ];
    }
    if (lower.startsWith('$env:')) {
      const key = trimmed.slice(5).toUpperCase();
      const envMap: Record<string, string> = {
        OS: 'Windows_NT',
        COMPUTERNAME: 'TRILLXP-2004',
        USERNAME: 'Administrator',
        SYSTEMROOT: 'C:\\WINDOWS',
        PROCESSOR_IDENTIFIER: 'x86 Family 15 Model 2 Stepping 9, GenuineIntel Pentium 4 2.80GHz',
      };
      return [envMap[key] ?? `Environment variable '${key}' is not set. Try $env:OS, $env:COMPUTERNAME, $env:USERNAME`];
    }

    // Range generator: e.g. 1..8
    const rangeMatch = trimmed.match(/^(-?\d+)\.\.(-?\d+)$/);
    if (rangeMatch) {
      const a = Number(rangeMatch[1]);
      const b = Number(rangeMatch[2]);
      const step = a <= b ? 1 : -1;
      const res: string[] = [];
      for (let k = a; step > 0 ? k <= b : k >= b; k += step) {
        if (res.length > 50) break;
        res.push(String(k));
      }
      return res;
    }

    // Safe numeric arithmetic
    if (/^[0-9+\-*/().\s]+$/.test(trimmed) && /[0-9]/.test(trimmed)) {
      try {
        // eslint-disable-next-line no-new-func
        const val = Function(`"use strict"; return (${trimmed});`)();
        return [String(val)];
      } catch {
        // fall through
      }
    }

    const parts = trimmed.split(/\s+/);
    const verb = parts[0].toLowerCase();
    const arg = parts.slice(1).join(' ').replace(/^["']|["']$/g, '');

    if (verb === 'help' || verb === 'get-help' || verb === 'man') {
      return [
        'TOPIC: TrillXP Windows PowerShell 1.0 Cmdlets & Aliases',
        '',
        '  Get-ChildItem (ls, dir)      Lists files and folders in current VFS directory',
        '  Set-Location (cd) <folder>   Changes working directory (cd .., cd C:\\, cd "My Pictures")',
        '  Get-Location (pwd)           Displays current directory path',
        '  Get-Content (cat, type) <f>  Reads text content of a VFS file',
        '  New-Item -ItemType Directory <name> / mkdir <name>   Creates a persistent folder',
        '  Set-Content <file> <value>   Writes persistent file into current folder',
        '  Remove-Item (rm, del) <name> Moves file/folder to Recycle Bin',
        '  Get-Process (ps)             Lists live running TrillXP window & system processes',
        '  Stop-Process <name|id>       Closes a running application window',
        '  Get-Service                  Lists Windows XP background services',
        '  Get-ComputerInfo / sysinfo   Displays TrillXP hardware & historical OS profile',
        '  Get-HotFix                   Lists installed Windows Update KB patches',
        '  Test-Connection <host>       Sends ICMP echo requests',
        '  Start-Process <app>          Launches app (slingo, sol, spider, skifree, jezzball, mahjong, arena, cmd)',
        '  Get-TrillApk                 Displays & downloads signed Android package (/downloads/TrillXP.apk)',
        '  Get-TrillPackage             Lists installable .EXE software packages',
        '  Install-TrillPackage <id>    Opens .EXE Setup Wizard',
        '  Clear-Host (cls, clear)      Clears console screen',
      ];
    }

    if (verb === 'pwd' || verb === 'get-location' || verb === 'gl') {
      return ['', 'Path', '----', currentPath, ''];
    }

    if (verb === 'ls' || verb === 'dir' || verb === 'gci' || verb === 'get-childitem') {
      const items = vfs.filter((n) => n.parentId === cwdId);
      const out = [
        '',
        `    Directory: ${currentPath}`,
        '',
        'Mode                LastWriteTime     Length Name',
        '----                -------------     ------ ----',
      ];
      items.forEach((n) => {
        const mode = n.type === 'folder' || n.type === 'drive' ? 'd----' : '-a---';
        const len = n.type === 'folder' ? '        ' : String(n.sizeBytes || (n.content?.length ?? 512)).padStart(8);
        out.push(`${mode.padEnd(19)} ${n.modifiedAt.padEnd(16)} ${len} ${n.name}`);
      });
      if (items.length === 0) out.push('  (empty directory)');
      out.push('');
      return out;
    }

    if (verb === 'cd' || verb === 'sl' || verb === 'set-location') {
      if (!arg || arg === '~') {
        setCwdId('my-docs');
        return [];
      }
      if (arg === '\\' || arg.toLowerCase() === 'c:\\' || arg.toLowerCase() === 'c:') {
        setCwdId('c:');
        return [];
      }
      if (arg === '..') {
        const curNode = vfs.find((n) => n.id === cwdId);
        if (curNode?.parentId) setCwdId(curNode.parentId);
        return [];
      }
      const child = vfs.find(
        (n) =>
          (n.parentId === cwdId || cwdId === 'c:') &&
          (n.type === 'folder' || n.type === 'drive') &&
          n.name.toLowerCase() === arg.toLowerCase()
      );
      if (child) {
        setCwdId(child.id);
        return [];
      }
      return [`Set-Location : Cannot find path '${arg}' because it does not exist.`];
    }

    if (verb === 'cat' || verb === 'type' || verb === 'gc' || verb === 'get-content') {
      const file = vfs.find(
        (n) => n.parentId === cwdId && n.name.toLowerCase() === arg.toLowerCase()
      );
      if (!file) return [`Get-Content : Cannot find file '${arg}' in ${currentPath}.`];
      return (file.content || '(Binary or shortcut item)').split('\n');
    }

    if (verb === 'mkdir' || verb === 'md' || verb === 'new-item') {
      const folderName = arg.replace(/-itemtype\s+directory\s*/i, '').trim() || 'New Folder';
      createFolder(cwdId, folderName);
      return [`    Directory created: ${currentPath}\\${folderName}`];
    }

    if (verb === 'set-content' || verb === 'sc') {
      const fileName = parts[1];
      const body = parts.slice(2).join(' ').replace(/^["']|["']$/g, '');
      if (!fileName) return ['Usage: Set-Content <filename.txt> "Your text here"'];
      createFile(cwdId, fileName, body, 'text/plain');
      return [`Wrote ${body.length} bytes to ${currentPath}\\${fileName}`];
    }

    if (verb === 'rm' || verb === 'del' || verb === 'remove-item') {
      const target = vfs.find((n) => n.parentId === cwdId && n.name.toLowerCase() === arg.toLowerCase());
      if (!target) return [`Remove-Item : Cannot find '${arg}' in ${currentPath}.`];
      deleteNodeToRecycleBin(target.id);
      return [`Moved '${target.name}' to Recycle Bin.`];
    }

    if (verb === 'ps' || verb === 'gps' || verb === 'get-process') {
      const rows = [
        '',
        'Handles  NPM(K)    PM(K)      WS(K)     Id  ProcessName',
        '-------  ------    -----      -----     --  -----------',
        '    412      14    18420      22140    400  explorer',
        '    218       9    31200      36800    712  arena_agent',
        '    164       6    12104      14020    884  svchost',
        ...(aolConnected
          ? ['    195       8    24880      28900   1104  waol']
          : []),
        ...windows.map((w, idx) => {
          const pid = String(1400 + idx * 44).padStart(6);
          return `    128       5    14200      17640 ${pid}  ${w.appId}`;
        }),
        '',
      ];
      return rows;
    }

    if (verb === 'kill' || verb === 'spps' || verb === 'stop-process') {
      const win = windows.find(
        (w) => w.appId.toLowerCase() === arg.toLowerCase() || w.title.toLowerCase().includes(arg.toLowerCase())
      );
      if (!win) return [`Stop-Process : Cannot find a window process matching '${arg}'.`];
      closeWindow(win.id);
      return [`Terminated process '${win.appId}' (${win.title}).`];
    }

    if (verb === 'gsv' || verb === 'get-service') {
      return [
        '',
        'Status   Name               DisplayName',
        '------   ----               -----------',
        'Running  ArenaAgentSvc      Arena AI Autonomous OS Copilot',
        'Running  AudioSrv           Windows Audio (XP + AOL + Slingo)',
        'Running  IndexedDBVfs       TrillXP Persistent Storage Service',
        `${aolConnected ? 'Running ' : 'Stopped '} AolModem56K        America Online V.90 Dial-Up Adapter`,
        'Running  Themes             Luna / Royale / Zune Visual Styles',
        'Running  wuauserv           Microsoft Windows Update',
        '',
      ];
    }

    if (verb === 'get-hotfix') {
      return [
        'Source        Description      HotFixID      InstalledBy',
        '------        -----------      --------      -----------',
        'TRILLXP-2004  Service Pack     KB936929      Administrator',
        'TRILLXP-2004  PowerShell 1.0   KB926139      Administrator',
        'TRILLXP-2004  Arena AI Engine  KB202601      Administrator',
      ];
    }

    if (verb === 'get-computerinfo' || verb === 'sysinfo') {
      return [
        'WindowsProductName      : TrillXP (Microsoft Windows XP Professional SP3)',
        'Purpose                 : Interactive 2000s Time Machine & Digital History Museum',
        'OsVersion               : 5.1.2600 Service Pack 3',
        'CsProcessors            : Intel(R) Pentium(R) 4 CPU 2.80GHz',
        'CsTotalPhysicalMemory   : 536,870,912 bytes (512 MB)',
        'NetworkAdapter          : U.S. Robotics 56K V.90 + Persistent Turbo Web Proxy',
        'AndroidApkPath          : /downloads/TrillXP.apk (Package: ai.trill.trillxp)',
      ];
    }

    if (verb === 'ping' || verb === 'test-connection') {
      const host = arg || 'arena.ai';
      return [
        `Source        Destination     IPV4Address      Bytes    Time(ms)`,
        `------        -----------     -----------      -----    --------`,
        `TRILLXP-2004  ${host.padEnd(15)} 104.18.26.120    32       14`,
        `TRILLXP-2004  ${host.padEnd(15)} 104.18.26.120    32       12`,
      ];
    }

    if (verb === 'get-trillapk') {
      const a = document.createElement('a');
      a.href = '/downloads/TrillXP.apk';
      a.download = 'TrillXP.apk';
      a.click();
      return [
        'Downloading signed Android package: /downloads/TrillXP.apk',
        '  Package Name : ai.trill.trillxp',
        '  Version      : 1.0.0 (API 21 - 33)',
        '  Signature    : APK Signature Scheme v2 + JAR v1 (RSA-2048 Verified)',
      ];
    }

    if (verb === 'get-trillpackage') {
      return [
        'AppId           Version   SizeMB  Name',
        '-----           -------   ------  ----',
        ...INSTALLABLE_CATALOG.map(
          (p) => `${p.appId.padEnd(15)} ${p.version.padEnd(9)} ${String(p.sizeMB).padEnd(7)} ${p.name}`
        ),
      ];
    }

    if (verb === 'install-trillpackage') {
      const pkg = INSTALLABLE_CATALOG.find(
        (p) => p.appId.includes(arg.toLowerCase()) || p.name.toLowerCase().includes(arg.toLowerCase())
      );
      if (!pkg) return [`Install-TrillPackage : Package '${arg}' not found. Run Get-TrillPackage.`];
      launchInstallerWizard(pkg);
      return [`Launching Setup Wizard for ${pkg.name} (${pkg.installerFile})...`];
    }

    if (verb === 'start' || verb === 'saps' || verb === 'start-process' || verb === 'cmd') {
      const target = verb === 'cmd' ? 'cmd' : arg.toLowerCase().replace(/\.exe$/, '');
      const appMap: Record<string, BuiltinAppId> = {
        cmd: 'cmd',
        powershell: 'powershell',
        arena: 'arena-ai',
        'arena-ai': 'arena-ai',
        slingo: 'slingo',
        sol: 'solitaire',
        solitaire: 'solitaire',
        spider: 'spider',
        freecell: 'freecell',
        hearts: 'hearts',
        pinball: 'pinball',
        winmine: 'minesweeper',
        minesweeper: 'minesweeper',
        skifree: 'skifree',
        jezzball: 'jezzball',
        mahjong: 'mahjong',
        checkers: 'checkers',
        tetris: 'tetris',
        museum: 'trillxp-museum',
        apk: 'apk-installer',
        wordpad: 'wordpad',
        regedit: 'regedit',
        winver: 'winver',
        notepad: 'notepad',
        mspaint: 'paint',
        paint: 'paint',
        calc: 'calculator',
        iexplore: 'ie',
        aol: 'aol-dialer',
        aim: 'aim',
      };
      if (appMap[target]) {
        openApp(appMap[target]);
        return [`Started process '${target}.exe'.`];
      }
      return [`Start-Process : Cannot find executable '${target}'.`];
    }

    return [
      `The term '${parts[0]}' is not recognized as the name of a cmdlet, function, script file, or operable program.`,
      `Type 'Get-Help' to see available TrillXP PowerShell cmdlets.`,
    ];
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = input.trim();
    setInput('');
    const promptLine = `PS ${currentPath}> ${raw}`;

    if (!raw) {
      appendOut([promptLine]);
      return;
    }

    setCmdHistory((prev) => [...prev, raw]);
    setHistCursor(-1);

    if (/^(cls|clear|clear-host)$/i.test(raw)) {
      setLines([]);
      return;
    }

    // Pipeline evaluation: stage1 | stage2
    const stages = raw.split('|').map((s) => s.trim());
    let output = evaluateSingleStage(stages[0]);

    for (let i = 1; i < stages.length; i++) {
      const st = stages[i];
      const firstMatch = st.match(/select(?:-object)?\s+-first\s+(\d+)/i);
      const whereMatch = st.match(/(?:where(?:-object)?|\?)\s+(.+)/i);
      const foreachMatch = st.match(/(?:foreach(?:-object)?|%)\s*\{\s*(.+)\s*\}/i);
      const measureMatch = /^measure(?:-object)?$/i.test(st);

      if (firstMatch) {
        output = output.slice(0, Number(firstMatch[1]));
      } else if (measureMatch) {
        output = [`Count    : ${output.filter((x) => x.trim().length > 0).length}`];
      } else if (whereMatch) {
        const needle = whereMatch[1].replace(/[{}$_'"\s-like*]/gi, '').toLowerCase();
        output = output.filter((ln) => ln.toLowerCase().includes(needle));
      } else if (foreachMatch) {
        const body = foreachMatch[1];
        output = output.map((item) => {
          const expr = body.replace(/\$_/g, item.trim());
          if (/^[0-9+\-*/().\s]+$/.test(expr)) {
            try {
              // eslint-disable-next-line no-new-func
              return String(Function(`"use strict"; return (${expr});`)());
            } catch {
              return expr;
            }
          }
          return expr;
        });
      }
    }

    const isErr = output.some((ln) => /is not recognized|Cannot find/.test(ln));
    appendOut([
      promptLine,
      ...output.map((text) => ({ text, color: isErr ? '#f87171' : '#eeedf0' })),
    ]);
  };

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      style={{
        flex: 1,
        background: '#012456',
        color: '#eeedf0',
        fontFamily: "'Lucida Console', 'Consolas', 'Courier New', monospace",
        fontSize: 13,
        padding: '8px 10px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'text',
      }}
    >
      {lines.map((ln, idx) => (
        <div
          key={idx}
          style={{
            whiteSpace: 'pre-wrap',
            minHeight: 16,
            color: ln.color || '#eeedf0',
            lineHeight: 1.35,
          }}
        >
          {ln.text}
        </div>
      ))}

      <form onSubmit={handleSubmit} style={{ display: 'flex', alignItems: 'center', marginTop: 2 }}>
        <span style={{ color: '#eeedf0', whiteSpace: 'pre' }}>{`PS ${currentPath}> `}</span>
        <input
          ref={inputRef}
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              if (cmdHistory.length === 0) return;
              const nextIdx = histCursor === -1 ? cmdHistory.length - 1 : Math.max(0, histCursor - 1);
              setHistCursor(nextIdx);
              setInput(cmdHistory[nextIdx]);
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              if (histCursor === -1) return;
              if (histCursor >= cmdHistory.length - 1) {
                setHistCursor(-1);
                setInput('');
              } else {
                setHistCursor(histCursor + 1);
                setInput(cmdHistory[histCursor + 1]);
              }
            } else if (e.key === 'Tab') {
              e.preventDefault();
              const q = input.trim().toLowerCase();
              const hit = PS_CMDS.find((c) => c.toLowerCase().startsWith(q));
              if (hit) setInput(hit + ' ');
            }
          }}
          style={{
            flex: 1,
            background: 'transparent',
            color: '#fde047',
            border: 'none',
            outline: 'none',
            fontFamily: 'inherit',
            fontSize: 'inherit',
          }}
        />
      </form>
      <div ref={bottomRef} />
    </div>
  );
};

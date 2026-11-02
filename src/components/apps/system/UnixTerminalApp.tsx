import React, { useState, useRef, useEffect } from 'react';
import { useOS, OS_METADATA, OSType } from '../../../context/OSContext';

const NEOFETCH_ART: Record<OSType, { color: string; lines: string[] }> = {
  linux: {
    color: '#fde047',
    lines: [
      '        .--.        ',
      '       |o_o |       ',
      '       |:_/ |       ',
      '      //   \\ \\      ',
      '     (|     | )     ',
      "    /'\\_   _/`\\     ",
      '    \\___)=(___/     ',
    ],
  },
  debian: {
    color: '#f43f5e',
    lines: [
      '       _,met$$$$$gg.    ',
      '    ,g$$$$$$$$$$$$$$$P. ',
      '  ,g$$P"     """Y$$.".  ',
      ' ,$$P\'              `$$$.',
      '\',$$P       ,ggs.     `$$b:',
      '`d$$\'     ,$P"\'   .    $$$',
      ' $$P      d$\'     ,    $$P',
      ' $$:      $$.   -    ,d$$\'',
      ' $$;      Y$b._   _,d$P\'  ',
      ' `$$b      "-.__          ',
    ],
  },
  centos: {
    color: '#c084fc',
    lines: [
      '        ..          ',
      '      .PLTJ.        ',
      '     <><><><>       ',
      '   KKSSV\' 4KKK LJ   ',
      '   KKV\' 4KKKKK LJ   ',
      '   V\' 4KKKKKKK LJ   ',
      '     <><><><>       ',
      '      \'VJJV\'        ',
    ],
  },
  macos: {
    color: '#38bdf8',
    lines: [
      '          .:`       ',
      '       .--``        ',
      '   .:::::::::::.    ',
      '  ::::::::::::::    ',
      '  ::::::::::::`     ',
      '  `::::::::::::.    ',
      '   `::::::::::::    ',
      '     `""`  `""`     ',
    ],
  },
  win10: {
    color: '#00a4ef',
    lines: [
      '  ################  ################',
      '  ################  ################',
      '  ################  ################',
      '                                    ',
      '  ################  ################',
      '  ################  ################',
      '  ################  ################',
    ],
  },
  winxp: {
    color: '#4ade80',
    lines: [
      '   ,.=:!!t3Z3z.,    ',
      '  :tt:::tt333EE3    ',
      '  Et:::ztt33EEEL @Ee',
      ' ;tt:::tt333EE7 ;EEEEEEtt',
      ' :Et:::zt333EEQ. $EEEEEtt',
      '  it::::tt333EEF @EEEEEEtt',
    ],
  },
};

export const UnixTerminalApp: React.FC = () => {
  const {
    osType,
    switchOperatingSystem,
    username,
    vfs,
    createFile,
    openApp,
    triggerBonziSwing,
  } = useOS();

  const shellName = osType === 'macos' ? 'zsh 5.9' : 'GNU bash 5.2.15';
  const hostMap: Record<OSType, string> = {
    winxp: 'trillxp-cygwin',
    win10: 'trill-wsl2',
    macos: 'MacBook-Pro',
    linux: 'tux-desktop',
    debian: 'debian-bookworm',
    centos: 'centos-workstation',
  };
  const userSlug = username.toLowerCase().replace(/[^a-z0-9]/g, '') || 'user';
  const host = hostMap[osType];

  const [cwd, setCwd] = useState<string>(`~`);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<Array<{ text: string; color?: string }>>([
    {
      text: `Welcome to ${OS_METADATA[osType].name} (${OS_METADATA[osType].kernel})`,
      color: '#4ade80',
    },
    {
      text: `Shell: ${shellName} • Type 'neofetch', 'help', 'ls', 'uname -a', 'apt/yum/brew', 'os <name>', 'maze', or 'bonzi'.`,
      color: '#94a3b8',
    },
  ]);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const promptStr =
    osType === 'macos'
      ? `${userSlug}@${host} ${cwd} %`
      : osType === 'centos'
      ? `[${userSlug}@${host} ${cwd}]$`
      : `${userSlug}@${host}:${cwd}$`;

  const runCommand = (raw: string) => {
    const trimmed = raw.trim();
    const out: Array<{ text: string; color?: string }> = [{ text: `${promptStr} ${raw}`, color: '#f8fafc' }];
    if (!trimmed) {
      setHistory((h) => [...h, ...out]);
      return;
    }

    const parts = trimmed.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    if (cmd === 'clear') {
      setHistory([]);
      return;
    } else if (cmd === 'help') {
      out.push({
        text: [
          'Available Unix / Linux / macOS commands:',
          '  neofetch              Show ASCII OS logo, kernel, uptime, shell & memory',
          '  uname -a              Print operating system kernel info',
          '  lsb_release -a        Print Linux distribution release info',
          '  ls / ll               List files in persistent VFS My Documents',
          '  cat <filename>        Read file contents from VFS',
          '  touch <filename>      Create a file in My Documents',
          '  whoami / hostname     Show active user & host',
          '  df -h / free -m       Show disk & RAM telemetry',
          '  sudo apt update       Debian/Linux APT package manager simulator',
          '  sudo yum update       CentOS/RHEL YUM/DNF package manager simulator',
          '  brew install <pkg>    macOS Homebrew simulator',
          '  os <xp|win10|macos|linux|debian|centos>  Live-switch operating system!',
          '  maze / bonzi / oregon Launch 3D Maze, BonziBUDDY swing, or Oregon Trail',
          '  clear                 Clear terminal screen',
        ].join('\n'),
        color: '#cbd5e1',
      });
    } else if (cmd === 'neofetch' || cmd === 'fastfetch') {
      const art = NEOFETCH_ART[osType];
      const info = [
        `${userSlug}@${host}`,
        '--------------------------',
        `OS: ${OS_METADATA[osType].name}`,
        `Kernel: ${OS_METADATA[osType].kernel}`,
        `Uptime: 42 mins`,
        `Packages: ${osType === 'debian' ? '2184 (dpkg)' : osType === 'centos' ? '1642 (rpm)' : osType === 'macos' ? '148 (brew)' : '1920'}`,
        `Shell: ${shellName}`,
        `DE: ${osType === 'macos' ? 'Aqua / Quartz Compositor' : osType === 'debian' ? 'GNOME 43.9' : osType === 'centos' ? 'GNOME Classic' : osType === 'linux' ? 'Cinnamon 6.0' : 'Luna / Fluent'}`,
        `Memory: 412MiB / 4096MiB`,
      ];
      const maxLen = Math.max(art.lines.length, info.length);
      const combined: string[] = [];
      for (let i = 0; i < maxLen; i++) {
        const left = (art.lines[i] || '').padEnd(38, ' ');
        const right = info[i] || '';
        combined.push(`${left}  ${right}`);
      }
      out.push({ text: combined.join('\n'), color: art.color });
    } else if (cmd === 'uname') {
      out.push({
        text: `${OS_METADATA[osType].shortName} ${host} ${OS_METADATA[osType].kernel} #1 SMP PREEMPT_DYNAMIC x86_64`,
        color: '#38bdf8',
      });
    } else if (cmd === 'lsb_release') {
      out.push({
        text: `Distributor ID:\t${OS_METADATA[osType].shortName}\nDescription:\t${OS_METADATA[osType].name}\nRelease:\t${OS_METADATA[osType].year}`,
      });
    } else if (cmd === 'whoami') {
      out.push({ text: userSlug });
    } else if (cmd === 'hostname') {
      out.push({ text: host });
    } else if (cmd === 'pwd') {
      out.push({ text: cwd === '~' ? `/Users/${userSlug}` : cwd });
    } else if (cmd === 'ls' || cmd === 'll') {
      const docs = vfs.filter((n) => n.parentId === 'my-docs');
      if (docs.length === 0) {
        out.push({ text: '(empty)' });
      } else {
        out.push({
          text: docs
            .map((d) =>
              cmd === 'll'
                ? `${d.type === 'folder' ? 'drwxr-xr-x' : '-rw-r--r--'}  1 ${userSlug}  staff  ${String(
                    d.sizeBytes || 512
                  ).padStart(7, ' ')}  ${d.name}`
                : d.name
            )
            .join(cmd === 'll' ? '\n' : '   '),
          color: '#93c5fd',
        });
      }
    } else if (cmd === 'cat') {
      const target = args.join(' ');
      const found = vfs.find((n) => n.name.toLowerCase() === target.toLowerCase());
      out.push({
        text: found ? found.content || '[Binary file]' : `cat: ${target || '(missing filename)'}: No such file`,
        color: found ? '#e2e8f0' : '#f87171',
      });
    } else if (cmd === 'touch') {
      const fn = args[0] || 'notes.txt';
      createFile('my-docs', fn, `Created from ${shellName} on ${OS_METADATA[osType].name}\n`);
      out.push({ text: `Created /home/${userSlug}/Documents/${fn}`, color: '#4ade80' });
    } else if (cmd === 'df') {
      out.push({
        text: [
          'Filesystem      Size  Used Avail Use% Mounted on',
          '/dev/nvme0n1p2   80G   14G   66G  18% /',
          'tmpfs           2.0G   12M  2.0G   1% /run',
        ].join('\n'),
      });
    } else if (cmd === 'free') {
      out.push({
        text: [
          '               total        used        free      shared  buff/cache   available',
          'Mem:            4096         412        2890          34         794        3520',
        ].join('\n'),
      });
    } else if (cmd === 'sudo' || cmd === 'apt' || cmd === 'yum' || cmd === 'dnf' || cmd === 'brew') {
      const full = trimmed.toLowerCase();
      if (full.includes('apt')) {
        out.push({
          text: [
            'Hit:1 http://deb.debian.org/debian bookworm InRelease',
            'Hit:2 http://security.debian.org/debian-security bookworm-security InRelease',
            'Reading package lists... Done',
            'Building dependency tree... Done',
            'All packages are up to date.',
          ].join('\n'),
          color: '#4ade80',
        });
      } else if (full.includes('yum') || full.includes('dnf')) {
        out.push({
          text: [
            'CentOS Stream - BaseOS                                      4.8 MB/s | 3.9 MB     00:00',
            'CentOS Stream - AppStream                                   6.2 MB/s | 8.4 MB     00:01',
            'Dependencies resolved. Nothing to do. Complete!',
          ].join('\n'),
          color: '#c084fc',
        });
      } else if (full.includes('brew')) {
        out.push({
          text: '==> Homebrew 4.4.2 • Everything up-to-date on Darwin Aqua!',
          color: '#38bdf8',
        });
      } else {
        out.push({ text: `[sudo] command executed as root.` });
      }
    } else if (cmd === 'os') {
      const req = (args[0] || '').toLowerCase();
      const map: Record<string, OSType> = {
        xp: 'winxp',
        winxp: 'winxp',
        win10: 'win10',
        windows10: 'win10',
        mac: 'macos',
        macos: 'macos',
        linux: 'linux',
        debian: 'debian',
        centos: 'centos',
      };
      if (map[req]) {
        switchOperatingSystem(map[req], false);
        out.push({ text: `Switched live operating system to ${OS_METADATA[map[req]].name}!`, color: '#fde047' });
      } else {
        out.push({ text: 'Usage: os <winxp | win10 | macos | linux | debian | centos>', color: '#fde047' });
      }
    } else if (cmd === 'maze') {
      openApp('maze3d');
      out.push({ text: 'Launching Windows 95 3D Brick Maze...', color: '#4ade80' });
    } else if (cmd === 'bonzi') {
      triggerBonziSwing('bonzi');
      out.push({ text: 'BonziBUDDY swinging in on a web!', color: '#c084fc' });
    } else if (cmd === 'oregon') {
      openApp('oregon-trail');
      out.push({ text: 'Launching The Oregon Trail (1848)...', color: '#4ade80' });
    } else if (cmd === 'cd') {
      setCwd(args[0] || '~');
    } else {
      out.push({ text: `${cmd}: command not found (try 'help' or 'neofetch')`, color: '#f87171' });
    }

    setHistory((h) => [...h, ...out]);
  };

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      style={{
        flex: 1,
        background: osType === 'macos' ? '#1e1e2e' : '#0c0c0c',
        color: '#e2e8f0',
        fontFamily: '"JetBrains Mono", "Fira Code", "Courier New", monospace',
        fontSize: 12.5,
        padding: '10px 12px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        lineHeight: 1.45,
      }}
    >
      {history.map((item, idx) => (
        <pre
          key={idx}
          style={{
            margin: '0 0 4px 0',
            whiteSpace: 'pre-wrap',
            fontFamily: 'inherit',
            color: item.color || '#e2e8f0',
          }}
        >
          {item.text}
        </pre>
      ))}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          runCommand(input);
          setInput('');
        }}
        style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}
      >
        <span style={{ color: '#4ade80', fontWeight: 700, whiteSpace: 'nowrap' }}>{promptStr}</span>
        <input
          ref={inputRef}
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#ffffff',
            fontFamily: 'inherit',
            fontSize: 'inherit',
          }}
        />
      </form>
      <div ref={bottomRef} />
    </div>
  );
};

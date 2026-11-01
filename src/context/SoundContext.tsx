import React, { createContext, useContext, useRef, useState, useEffect, useCallback } from 'react';

export type SoundEffect =
  | 'startup'
  | 'shutdown'
  | 'logon'
  | 'logoff'
  | 'balloon'
  | 'ding'
  | 'error'
  | 'critical'
  | 'exclamation'
  | 'recycle'
  | 'minimize'
  | 'restore'
  | 'hardwareInsert'
  | 'hardwareRemove'
  | 'notify'
  | 'startClick'
  | 'menuClick'
  | 'gameWin'
  | 'gameLose'
  | 'youveGotMail'
  | 'aimSend'
  | 'aimReceive'
  | 'aimRing'
  | 'aimDoorOpen'
  | 'aimDoorSlam'
  | 'cardFlip'
  | 'cardPlace'
  | 'devilLaugh'
  | 'devilLaughAlt'
  | 'cherubHarp'
  | 'slingoWin'
  | 'slingoCoin'
  | 'slingoJoker'
  | 'slingoReelStop';

const SOUND_URLS: Partial<Record<SoundEffect, string>> = {
  startup: '/sounds/startup.wav',
  shutdown: '/sounds/shutdown.wav',
  logon: '/sounds/logon.wav',
  logoff: '/sounds/logoff.wav',
  balloon: '/sounds/balloon.wav',
  ding: '/sounds/ding.wav',
  error: '/sounds/error.wav',
  critical: '/sounds/critical-stop.wav',
  exclamation: '/sounds/exclamation.wav',
  recycle: '/sounds/recycle.wav',
  minimize: '/sounds/minimize.wav',
  restore: '/sounds/restore.wav',
  hardwareInsert: '/sounds/hardware-insert.wav',
  hardwareRemove: '/sounds/hardware-removed.wav',
  notify: '/sounds/notify.wav',
  startClick: '/sounds/start.wav',
  menuClick: '/sounds/menu-command.wav',
  gameWin: '/sounds/won.wav',
  gameLose: '/sounds/lost.wav',
  youveGotMail: '/sounds/youve-got-mail.mp3',
  aimSend: '/sounds/aim-send.wav',
  aimReceive: '/sounds/aim-receive.wav',
  aimRing: '/sounds/aim-ring.wav',
  cardFlip: '/sounds/card-flip.wav',
  cardPlace: '/sounds/card-place.wav',
  devilLaugh: '/sounds/slingo/devil-laugh-1.wav',
  devilLaughAlt: '/sounds/slingo/devil-laugh-2.wav',
  cherubHarp: '/sounds/slingo/cherub-harp.wav',
  slingoWin: '/sounds/slingo/slingo-win.wav',
  slingoCoin: '/sounds/slingo/coin-collect.wav',
  slingoJoker: '/sounds/slingo/joker-chime.wav',
  slingoReelStop: '/sounds/slingo/reel-stop.wav',
};

const DTMF_FREQS: Record<string, [number, number]> = {
  '1': [697, 1209],
  '2': [697, 1336],
  '3': [697, 1477],
  '4': [770, 1209],
  '5': [770, 1336],
  '6': [770, 1477],
  '7': [852, 1209],
  '8': [852, 1336],
  '9': [852, 1477],
  '*': [941, 1209],
  '0': [941, 1336],
  '#': [941, 1477],
};

interface SoundContextValue {
  volume: number;
  muted: boolean;
  setVolume: (v: number) => void;
  setMuted: (m: boolean) => void;
  unlockAudio: () => void;
  playSound: (effect: SoundEffect) => Promise<boolean>;
  playDialSequence: (digits: string) => () => void;
  startModemHandshake: () => void;
  stopModemHandshake: () => void;
  playAOLWelcome: () => void;
  playAOLGoodbye: () => void;
  playPostBeep: () => void;
}

const SoundContext = createContext<SoundContextValue | null>(null);

export const SoundProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [volume, setVolumeState] = useState<number>(() => {
    const saved = localStorage.getItem('xp_volume');
    return saved !== null ? Number(saved) : 0.85;
  });
  const [muted, setMutedState] = useState<boolean>(() => {
    return localStorage.getItem('xp_muted') === 'true';
  });

  const audioCtxRef = useRef<AudioContext | null>(null);
  const modemAudioRef = useRef<HTMLAudioElement | null>(null);
  const preloadedRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtxRef.current = new Ctx();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  }, []);

  const unlockAudio = useCallback(() => {
    try {
      const ctx = getAudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
    } catch {
      // Ignore
    }
  }, [getAudioCtx]);

  // Preload critical sounds immediately so startup & youve-got-mail have zero network lag
  useEffect(() => {
    Object.values(SOUND_URLS).forEach((url) => {
      if (!url) return;
      const a = new Audio(url);
      a.preload = 'auto';
      preloadedRef.current.set(url, a);
    });
    const modem = new Audio('/sounds/dialup-modem.mp3');
    modem.preload = 'auto';
    modemAudioRef.current = modem;

    const unlockHandler = () => unlockAudio();
    window.addEventListener('pointerdown', unlockHandler, { passive: true });
    window.addEventListener('keydown', unlockHandler, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', unlockHandler);
      window.removeEventListener('keydown', unlockHandler);
    };
  }, [unlockAudio]);

  const setVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    setVolumeState(clamped);
    localStorage.setItem('xp_volume', String(clamped));
    if (modemAudioRef.current) {
      modemAudioRef.current.volume = clamped * 0.65;
    }
  }, []);

  const setMuted = useCallback((m: boolean) => {
    setMutedState(m);
    localStorage.setItem('xp_muted', String(m));
    if (modemAudioRef.current) {
      modemAudioRef.current.muted = m;
    }
  }, []);

  const playDoorEffect = useCallback(
    (open: boolean) => {
      if (muted || volume <= 0) return;
      try {
        const ctx = getAudioCtx();
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = open ? 'sawtooth' : 'triangle';
        if (open) {
          osc.frequency.setValueAtTime(190, now);
          osc.frequency.exponentialRampToValueAtTime(340, now + 0.18);
          gain.gain.setValueAtTime(0.15 * volume, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
          osc.connect(gain).connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.23);
        } else {
          osc.frequency.setValueAtTime(160, now);
          osc.frequency.exponentialRampToValueAtTime(52, now + 0.16);
          gain.gain.setValueAtTime(0.28 * volume, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
          osc.connect(gain).connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.19);
        }
      } catch {
        // Ignore
      }
    },
    [getAudioCtx, muted, volume]
  );

  const playSound = useCallback(
    async (effect: SoundEffect): Promise<boolean> => {
      if (muted || volume <= 0) return true;
      unlockAudio();
      if (effect === 'aimDoorOpen') {
        playDoorEffect(true);
        return true;
      }
      if (effect === 'aimDoorSlam') {
        playDoorEffect(false);
        return true;
      }
      const url = SOUND_URLS[effect];
      if (!url) return false;
      try {
        const audio = new Audio(url);
        audio.volume = volume;
        await audio.play();
        return true;
      } catch {
        return false;
      }
    },
    [muted, volume, unlockAudio, playDoorEffect]
  );

  const playPostBeep = useCallback(() => {
    if (muted || volume <= 0) return;
    try {
      const ctx = getAudioCtx();
      if (ctx.state !== 'running') return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = 950;
      gain.gain.setValueAtTime(0.06 * volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {
      // Ignore
    }
  }, [getAudioCtx, muted, volume]);

  const playDialSequence = useCallback(
    (digits: string) => {
      let cancelled = false;
      const timers: number[] = [];
      if (muted || volume <= 0) return () => {};
      try {
        const ctx = getAudioCtx();
        // Brief US dial tone (350Hz + 440Hz) for 380ms
        const d1 = ctx.createOscillator();
        const d2 = ctx.createOscillator();
        const dg = ctx.createGain();
        d1.frequency.value = 350;
        d2.frequency.value = 440;
        dg.gain.value = 0.08 * volume;
        d1.connect(dg);
        d2.connect(dg);
        dg.connect(ctx.destination);
        d1.start();
        d2.start();
        d1.stop(ctx.currentTime + 0.36);
        d2.stop(ctx.currentTime + 0.36);

        const clean = digits.replace(/[^0-9*#]/g, '');
        clean.split('').forEach((ch, idx) => {
          const t = window.setTimeout(() => {
            if (cancelled) return;
            const pair = DTMF_FREQS[ch];
            if (!pair) return;
            const o1 = ctx.createOscillator();
            const o2 = ctx.createOscillator();
            const g = ctx.createGain();
            o1.frequency.value = pair[0];
            o2.frequency.value = pair[1];
            g.gain.setValueAtTime(0.1 * volume, ctx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.11);
            o1.connect(g);
            o2.connect(g);
            g.connect(ctx.destination);
            o1.start();
            o2.start();
            o1.stop(ctx.currentTime + 0.115);
            o2.stop(ctx.currentTime + 0.115);
          }, 420 + idx * 145);
          timers.push(t);
        });
      } catch {
        // Ignore
      }
      return () => {
        cancelled = true;
        timers.forEach((t) => clearTimeout(t));
      };
    },
    [getAudioCtx, muted, volume]
  );

  const startModemHandshake = useCallback(() => {
    if (muted || volume <= 0) return;
    try {
      if (!modemAudioRef.current) {
        modemAudioRef.current = new Audio('/sounds/dialup-modem.mp3');
      }
      const m = modemAudioRef.current;
      m.currentTime = 4.2; // Jump straight into crisp modem carrier + V.90 handshake screech
      m.volume = volume * 0.65;
      m.muted = muted;
      m.play().catch(() => {});
    } catch {
      // Ignore
    }
  }, [muted, volume]);

  const stopModemHandshake = useCallback(() => {
    if (modemAudioRef.current) {
      modemAudioRef.current.pause();
      modemAudioRef.current.currentTime = 0;
    }
  }, []);

  const speakPhrase = useCallback(
    (phrase: string) => {
      if (muted || volume <= 0) return;
      try {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utter = new SpeechSynthesisUtterance(phrase);
          utter.rate = 0.96;
          utter.pitch = 0.95;
          utter.volume = volume;
          const voices = window.speechSynthesis.getVoices();
          const preferred = voices.find(
            (v) => v.lang.startsWith('en') && /david|guy|daniel|google us|alex|male/i.test(v.name)
          );
          if (preferred) utter.voice = preferred;
          window.speechSynthesis.speak(utter);
        }
      } catch {
        // Ignore
      }
    },
    [muted, volume]
  );

  const playAOLWelcome = useCallback(() => {
    if (muted || volume <= 0) return;
    playSound('notify');
    speakPhrase('Welcome!');
  }, [muted, volume, playSound, speakPhrase]);

  const playAOLGoodbye = useCallback(() => {
    if (muted || volume <= 0) return;
    speakPhrase('Goodbye!');
  }, [muted, volume, speakPhrase]);

  return (
    <SoundContext.Provider
      value={{
        volume,
        muted,
        setVolume,
        setMuted,
        unlockAudio,
        playSound,
        playDialSequence,
        startModemHandshake,
        stopModemHandshake,
        playAOLWelcome,
        playAOLGoodbye,
        playPostBeep,
      }}
    >
      {children}
    </SoundContext.Provider>
  );
};

export const useSound = () => {
  const ctx = useContext(SoundContext);
  if (!ctx) throw new Error('useSound must be used inside SoundProvider');
  return ctx;
};

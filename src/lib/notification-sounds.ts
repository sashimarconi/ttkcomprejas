// Preset notification sounds via Web Audio API

export type RingtoneId = 'none' | 'cash_register' | 'coins' | 'kaching' | 'soft_chime' | 'bell' | 'custom';

export interface RingtonePreset {
  id: RingtoneId;
  label: string;
  description: string;
}

export const RINGTONE_PRESETS: RingtonePreset[] = [
  { id: 'none', label: 'Nenhum', description: 'Sem som de notificação' },
  { id: 'cash_register', label: 'Caixa Registradora', description: 'Som clássico de caixa registradora' },
  { id: 'coins', label: 'Moedas Caindo', description: 'Efeito de moedas tilintando' },
  { id: 'kaching', label: 'Ka-ching!', description: 'Som rápido e satisfatório de venda' },
  { id: 'soft_chime', label: 'Notificação Suave', description: 'Tom suave e elegante' },
  { id: 'bell', label: 'Sino', description: 'Sino clássico de notificação' },
];

// Singleton AudioContext — created on first user gesture and reused
let sharedCtx: AudioContext | null = null;
let gestureListenerAdded = false;
let audioPrimed = false;
let resumePromise: Promise<void> | null = null;

function ensureAudioContext(): AudioContext {
  if (!sharedCtx) {
    sharedCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return sharedCtx;
}

function primeAudioContext(ctx: AudioContext) {
  if (audioPrimed) return;

  const buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
  const source = ctx.createBufferSource();
  const gain = ctx.createGain();

  source.buffer = buffer;
  gain.gain.value = 0.0001;

  source.connect(gain);
  gain.connect(ctx.destination);
  source.start();

  audioPrimed = true;
}

function resumeAudioContext(ctx: AudioContext): Promise<void> {
  if (ctx.state === 'running') {
    primeAudioContext(ctx);
    return Promise.resolve();
  }

  if (!resumePromise) {
    resumePromise = ctx
      .resume()
      .then(() => {
        if (ctx.state === 'running') {
          primeAudioContext(ctx);
        }
      })
      .catch(() => {})
      .finally(() => {
        resumePromise = null;
      });
  }

  return resumePromise;
}

function withRunningAudioContext(callback: (ctx: AudioContext) => void) {
  const ctx = ensureAudioContext();

  if (ctx.state === 'running') {
    primeAudioContext(ctx);
    callback(ctx);
    return;
  }

  void resumeAudioContext(ctx).then(() => {
    if (ctx.state === 'running') {
      callback(ctx);
    }
  });
}

// Warm up AudioContext on first user click/keydown so it's ready for async events
function warmUpOnGesture() {
  if (gestureListenerAdded) return;
  gestureListenerAdded = true;

  const handler = () => {
    const ctx = ensureAudioContext();
    void resumeAudioContext(ctx);
    window.removeEventListener('click', handler);
    window.removeEventListener('keydown', handler);
    window.removeEventListener('pointerdown', handler);
  };
  window.addEventListener('click', handler, { once: false });
  window.addEventListener('keydown', handler, { once: false });
  window.addEventListener('pointerdown', handler, { once: false });
}

function resumeWhenVisible() {
  if (document.visibilityState === 'hidden') return;
  const ctx = ensureAudioContext();
  void resumeAudioContext(ctx);
}

// Call this early (e.g. on mount of admin layout)
if (typeof window !== 'undefined') {
  warmUpOnGesture();
  document.addEventListener('visibilitychange', resumeWhenVisible);
  window.addEventListener('focus', resumeWhenVisible);
}

function playTone(ctx: AudioContext, freq: number, start: number, duration: number, gain: number, type: OscillatorType = 'sine') {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
  g.gain.setValueAtTime(gain, ctx.currentTime + start);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(ctx.currentTime + start);
  osc.stop(ctx.currentTime + start + duration);
}

function playCashRegister() {
  withRunningAudioContext((ctx) => {
    playTone(ctx, 2200, 0, 0.08, 0.3);
    playTone(ctx, 2800, 0.1, 0.08, 0.3);
    playTone(ctx, 3400, 0.2, 0.15, 0.25);
  });
}

function playCoins() {
  withRunningAudioContext((ctx) => {
    for (let i = 0; i < 6; i++) {
      playTone(ctx, 3000 + Math.random() * 2000, i * 0.06, 0.05, 0.15 + Math.random() * 0.1);
    }
    playTone(ctx, 4500, 0.4, 0.3, 0.2);
  });
}

function playKaching() {
  withRunningAudioContext((ctx) => {
    playTone(ctx, 1800, 0, 0.05, 0.25);
    playTone(ctx, 3200, 0.06, 0.05, 0.3);
    playTone(ctx, 4000, 0.12, 0.25, 0.35);
  });
}

function playSoftChime() {
  withRunningAudioContext((ctx) => {
    playTone(ctx, 800, 0, 0.4, 0.15, 'sine');
    playTone(ctx, 1200, 0.15, 0.4, 0.12, 'sine');
    playTone(ctx, 1600, 0.3, 0.5, 0.1, 'sine');
  });
}

function playBell() {
  withRunningAudioContext((ctx) => {
    playTone(ctx, 2000, 0, 0.6, 0.3, 'sine');
    playTone(ctx, 4000, 0, 0.4, 0.1, 'sine');
    playTone(ctx, 6000, 0, 0.2, 0.05, 'sine');
  });
}

export function playRingtone(id: RingtoneId, customUrl?: string | null) {
  if (id === 'none') return;
  if (id === 'custom' && customUrl) {
    const audio = new Audio(customUrl);
    audio.volume = 0.7;
    audio.play().catch(() => {});
    return;
  }

  switch (id) {
    case 'cash_register': playCashRegister(); break;
    case 'coins': playCoins(); break;
    case 'kaching': playKaching(); break;
    case 'soft_chime': playSoftChime(); break;
    case 'bell': playBell(); break;
  }
}

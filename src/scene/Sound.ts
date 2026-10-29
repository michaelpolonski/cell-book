/**
 * צלילי הספר: קטעי CC0 אמיתיים מ-Freesound (ראו public/audio/CREDITS.md), בלי מוזיקה ובלי סינתזה.
 * Web Audio: נטען בעצלתיים בלחיצה הראשונה (מדיניות autoplay של הדפדפנים).
 */
export type Cue = 'pageTurn' | 'riffle' | 'flap' | 'pen' | 'stamp' | 'bookThud';

const FILES: Record<Cue, { file: string; gain: number; max?: number }> = {
  pageTurn: { file: 'pageTurn.mp3', gain: 0.55, max: 1.1 },
  riffle: { file: 'riffle.mp3', gain: 0.5, max: 1.4 },
  flap: { file: 'flap.mp3', gain: 0.5, max: 0.8 },
  pen: { file: 'pen.mp3', gain: 0.35, max: 1.2 },
  stamp: { file: 'stamp.mp3', gain: 0.7, max: 0.8 },
  bookThud: { file: 'bookThud.mp3', gain: 0.45, max: 1.0 },
};

class SoundBank {
  private ctx: AudioContext | null = null;
  private buffers = new Map<Cue, AudioBuffer>();
  loading: Promise<void> | null = null;
  muted = localStorage.getItem('cellbook.muted') === '1';

  constructor() {
    const unlock = () => { this.init(); removeEventListener('pointerdown', unlock); removeEventListener('keydown', unlock); };
    addEventListener('pointerdown', unlock);
    addEventListener('keydown', unlock);
  }

  private init() {
    if (this.ctx || typeof AudioContext === 'undefined') return;
    this.ctx = new AudioContext();
    const base = import.meta.env.BASE_URL + 'audio/';
    this.loading = Promise.all((Object.keys(FILES) as Cue[]).map(async (k) => {
      try {
        const res = await fetch(base + FILES[k].file);
        const buf = await this.ctx!.decodeAudioData(await res.arrayBuffer());
        this.buffers.set(k, buf);
      } catch { /* צליל חסר אינו שובר את הספר */ }
    })).then(() => {});
  }

  setMuted(m: boolean) {
    this.muted = m;
    localStorage.setItem('cellbook.muted', m ? '1' : '0');
  }

  play(cue: Cue, opts: { rate?: number; gain?: number } = {}) {
    if (this.muted || document.body.classList.contains('still')) return;
    this.init();
    const ctx = this.ctx;
    const buf = this.buffers.get(cue);
    if (!ctx || !buf) return;
    if (ctx.state === 'suspended') ctx.resume();
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = (opts.rate ?? 1) * (0.94 + Math.random() * 0.12);
    const g = ctx.createGain();
    const f = FILES[cue];
    const vol = f.gain * (opts.gain ?? 1);
    g.gain.value = vol;
    src.connect(g).connect(ctx.destination);
    src.start();
    if (f.max) {
      const end = ctx.currentTime + f.max;
      g.gain.setValueAtTime(vol, end - 0.15);
      g.gain.linearRampToValueAtTime(0, end);
      src.stop(end + 0.02);
    }
  }
}

export const sound = new SoundBank();

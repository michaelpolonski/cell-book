/** ההתקדמות של התלמיד: חותמות, ניבויים, דשים פתוחים וסימנייה. נשמר ב-localStorage. */
export type StepKey = 'predict' | 'watch' | 'try' | 'why' | 'stamp';

interface Saved {
  spread: number;
  stamps: number[];
  answers: Record<string, number>;   // ניבויים ותשובות במבחן
  flaps: string[];
  steps: Record<string, StepKey[]>;
  still?: boolean;
}

const KEY = 'cellbook.v1';
const empty = (): Saved => ({ spread: 0, stamps: [], answers: {}, flaps: [], steps: {} });

export class Progress {
  private d: Saved;
  private listeners = new Set<() => void>();

  constructor() {
    try { this.d = { ...empty(), ...JSON.parse(localStorage.getItem(KEY) || '{}') }; }
    catch { this.d = empty(); }
  }

  private save() {
    try { localStorage.setItem(KEY, JSON.stringify(this.d)); } catch { /* מצב פרטי */ }
    this.listeners.forEach((f) => f());
  }

  onChange(f: () => void) { this.listeners.add(f); }

  get spread() { return this.d.spread; }
  set spread(i: number) { this.d.spread = i; this.save(); }

  get still() { return this.d.still; }
  set still(v: boolean | undefined) { this.d.still = v; this.save(); }

  hasStamp(n: number) { return this.d.stamps.includes(n); }
  get stampCount() { return this.d.stamps.length; }
  addStamp(n: number) { if (!this.hasStamp(n)) { this.d.stamps.push(n); this.mark(n, 'stamp'); } }

  answer(key: string): number | undefined { return this.d.answers[key]; }
  setAnswer(key: string, i: number) { this.d.answers[key] = i; this.save(); }

  flapOpen(key: string) { return this.d.flaps.includes(key); }
  openFlap(key: string) { if (!this.flapOpen(key)) { this.d.flaps.push(key); this.save(); } }

  steps(n: number): StepKey[] { return this.d.steps[n] ?? []; }
  mark(n: number, s: StepKey) {
    const list = (this.d.steps[n] ??= []);
    if (!list.includes(s)) list.push(s);
    this.save();
  }

  reset() { const still = this.d.still; this.d = empty(); this.d.still = still; this.save(); }
}

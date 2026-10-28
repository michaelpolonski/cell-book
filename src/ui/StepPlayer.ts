/** נגן ההדגמה: כפתור הפעלה/השהיה, חמש נקודות צעדים וכיתוב. */
import { icons } from './icons';
import { h } from './components';

export interface PlayerHooks {
  playStep(i: number): Promise<void>;
  setPaused(p: boolean): void;
  onDone(): void;
  onStep?(i: number): void;
}

export class StepPlayer {
  readonly el: HTMLElement;
  private btn: HTMLButtonElement;
  private dots: HTMLButtonElement[] = [];
  private caption: HTMLElement;
  private state: 'idle' | 'playing' | 'paused' | 'done' = 'idle';
  private token = 0;
  private enabled = false;

  constructor(private steps: string[], private hooks: PlayerHooks) {
    this.el = h('div', { class: 'player' });
    this.btn = h('button', { type: 'button', class: 'play', 'aria-label': 'הפעל את ההדגמה' }, icons.play);
    const dots = h('div', { class: 'dots', role: 'group', 'aria-label': 'צעדי ההדגמה' });
    steps.forEach((_, i) => {
      const d = h('button', { type: 'button', class: 'dot', 'aria-label': `צעד ${i + 1}` }, String(i + 1));
      d.addEventListener('click', () => this.enabled && this.run(i));
      dots.append(d);
      this.dots.push(d);
    });
    this.caption = h('p', { class: 'caption', 'aria-live': 'polite' });
    this.btn.addEventListener('click', () => this.toggle());
    this.el.append(this.btn, dots, this.caption);
    this.setEnabled(false, 'סמן ניבוי לפני שמתחילים.');
  }

  setEnabled(on: boolean, hint = '') {
    this.enabled = on;
    this.el.classList.toggle('disabled', !on);
    this.btn.disabled = !on;
    this.dots.forEach((d) => (d.disabled = !on));
    if (!on) this.caption.innerHTML = hint;
    else if (this.state === 'idle') this.caption.innerHTML = 'לחץ על <b>הפעל</b> כדי לראות את ההדגמה בחמישה צעדים.';
  }

  private toggle() {
    if (this.state === 'playing') { this.state = 'paused'; this.hooks.setPaused(true); this.sync(); }
    else if (this.state === 'paused') { this.state = 'playing'; this.hooks.setPaused(false); this.sync(); }
    else this.run(0);
  }

  async run(from: number) {
    const tok = ++this.token;
    this.hooks.setPaused(false);
    this.state = 'playing';
    for (let i = from; i < this.steps.length; i++) {
      this.dots.forEach((d, k) => { d.classList.toggle('on', k === i); d.classList.toggle('seen', k < i); });
      this.caption.innerHTML = `<span class="n">${i + 1}</span> ${this.steps[i]}`;
      this.hooks.onStep?.(i);
      this.sync();
      await this.hooks.playStep(i);
      if (tok !== this.token) return;
    }
    this.state = 'done';
    this.dots.forEach((d) => { d.classList.remove('on'); d.classList.add('seen'); });
    this.sync();
    this.hooks.onDone();
  }

  /** עוצר כל ריצה (למשל כשעוברים ל"נסה בעצמך"). */
  stop() {
    this.token++;
    if (this.state !== 'done') this.state = 'idle';
    this.hooks.setPaused(false);
    this.dots.forEach((d) => d.classList.remove('on'));
    this.sync();
  }

  private sync() {
    const playing = this.state === 'playing';
    this.btn.innerHTML = playing ? icons.pause : this.state === 'done' ? icons.replay : icons.play;
    this.btn.setAttribute('aria-label', playing ? 'השהה את ההדגמה' : this.state === 'paused' ? 'המשך את ההדגמה' : 'הפעל את ההדגמה');
  }
}

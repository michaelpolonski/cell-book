/**
 * הספר: מחזיק את רשימת הכפולות, מהפך דפים (מימין לשמאל, כמו בספר עברי),
 * מנהל את הכתובת (#spread-3, #lesson-7, #quiz...) ואת סרגל הכלים.
 */
import type { BookCtx, SpreadDef, SpreadView } from './types';
import type { Progress } from './Progress';
import type { Stage3D } from '../render/Stage3D';
import { icons } from '../ui/icons';
import { h } from '../ui/components';
import type { World } from '../scene/World';
import { rasterizePage } from '../scene/PageRaster';
import { sound } from '../scene/Sound';

const mobileQuery = matchMedia('(max-width: 899px)');

export class Book {
  readonly el: HTMLElement;
  private cur = -1;
  private view: SpreadView | null = null;
  private spreadEl: HTMLElement | null = null;
  private turning: Promise<void> | null = null;
  private live: HTMLElement;
  private bar!: HTMLElement;
  private folio!: HTMLElement;
  readonly ctx: BookCtx;

  constructor(private defs: SpreadDef[], private stage: Stage3D | null, private progress: Progress, mount: HTMLElement, private world: World | null = null) {
    this.el = h('div', { class: 'book', role: 'region', 'aria-label': 'הספר', 'aria-roledescription': 'ספר' });
    this.live = h('div', { class: 'sr', 'aria-live': 'polite', 'aria-atomic': 'true' });
    mount.append(this.el, this.live, this.toolbar());
    this.ctx = {
      stage,
      progress,
      go: (id) => this.goId(id),
      pageOf: (id) => 2 * this.indexOf(id) + 1,
      announce: (t) => this.announce(t),
    };
    addEventListener('keydown', (e) => this.onKey(e));
    addEventListener('hashchange', () => this.route());
  }

  get index() { return this.cur; }
  indexOf(id: string) { return this.defs.findIndex((d) => d.id === id); }

  /** פותח את הספר לפי הכתובת, או בכריכה. */
  start() {
    if (!this.route()) this.go(0, true);
  }

  private route(): boolean {
    const m = location.hash.slice(1);
    if (!m) return false;
    const n = /^spread-(\d+)$/.exec(m);
    const i = n ? +n[1] : this.indexOf(m);
    if (i < 0 || i >= this.defs.length) return false;
    if (i !== this.cur) this.go(i, this.cur < 0);
    return true;
  }

  async goId(id: string) { const i = this.indexOf(id); if (i >= 0) await this.go(i); }
  next() { return this.go(this.cur + 1); }
  prev() { return this.go(this.cur - 1); }

  async go(i: number, instant = false): Promise<void> {
    if (this.turning) await this.turning;
    if (i === this.cur || i < 0 || i >= this.defs.length) return;
    const job = this.doGo(i, instant);
    this.turning = job.finally(() => { this.turning = null; });
    return this.turning;
  }

  private async doGo(i: number, instant: boolean): Promise<void> {
    const dir: 1 | -1 = i > this.cur ? 1 : -1;
    const jump = Math.abs(i - this.cur);
    const oldEl = this.spreadEl;
    const still = document.body.classList.contains('still');
    const world = this.world;
    const animate = !!oldEl && !instant && !still && !mobileQuery.matches && !!world;
    const sel = (el: HTMLElement, s: string) => el.querySelector(`:scope > .page-${s}`) as HTMLElement;

    // "הדפסה" של הכפולה הישנה (כולל תמונת האיור התלת-ממדי) לפני שמפרקים אותה
    let oldR: HTMLCanvasElement | null = null, oldL: HTMLCanvasElement | null = null;
    if (animate && oldEl && world) {
      const snap = world.snapshotStage();
      const extras = { stage: { canvas: snap, host: this.stage?.host ?? null } };
      [oldR, oldL] = await Promise.all([rasterizePage(sel(oldEl, 'right'), extras), rasterizePage(sel(oldEl, 'left'), extras)]);
    }
    this.view?.leave?.();

    const def = this.defs[i];
    const view = def.build(this.ctx, i);
    const el = h('div', { class: 'spread', 'data-id': def.id });
    el.append(view.right, view.left);
    // מוסתר בשקיפות (לא visibility) כדי שאפשר יהיה "להדפיס" אותו לטקסטורה
    if (animate) { el.style.opacity = '0'; el.style.pointerEvents = 'none'; }
    this.el.prepend(el);
    this.cur = i;
    this.view = view;
    this.spreadEl = el;
    this.progress.spread = i;
    history.replaceState(null, '', `#${def.id}`);
    this.updateBar();
    view.enter?.();
    this.announce(`${def.label}, עמודים ${2 * i + 1}–${2 * i + 2}`);

    if (!animate || !oldEl || !world || !oldR || !oldL) {
      oldEl?.remove();
      world?.track(this.el, el);
      if (oldEl && mobileQuery.matches) {
        this.el.scrollTop = 0;
        if (!still) el.animate([{ opacity: 0, transform: `translateX(${-dir * 24}px)` }, { opacity: 1, transform: 'none' }], { duration: 280, easing: 'ease-out' });
      }
      if (oldEl && !still) sound.play('pageTurn');
      view.afterTurn?.();
      return;
    }

    // הכפולה החדשה, מודפסת גם היא, ואז הדף מתהפך בתלת-ממד
    await document.fonts.ready;
    const [newR, newL] = await Promise.all([rasterizePage(sel(el, 'right')), rasterizePage(sel(el, 'left'))]);
    oldEl.style.opacity = '0';
    oldEl.inert = true;
    sound.play(jump > 1 ? 'riffle' : 'pageTurn');
    // קדימה (ספר עברי): הדף השמאלי מתרומם ונוחת ימינה
    await world.turn({
      dir,
      front: dir > 0 ? oldL : oldR,
      back: dir > 0 ? newR : newL,
      underLift: dir > 0 ? newL : newR,
      underLand: dir > 0 ? oldR : oldL,
      duration: jump > 1 ? 800 : 1050,
    });
    oldEl.remove();
    el.style.opacity = '';
    el.style.pointerEvents = '';
    world.track(this.el, el);
    view.afterTurn?.();
  }

  private onKey(e: KeyboardEvent) {
    const t = e.target as HTMLElement;
    if (t.closest('input, textarea, select, [contenteditable], dialog') || e.altKey || e.ctrlKey || e.metaKey) return;
    // ספר עברי: חץ שמאלה = הדף הבא
    if (e.key === 'ArrowLeft' || e.key === 'PageDown') { e.preventDefault(); this.next(); }
    else if (e.key === 'ArrowRight' || e.key === 'PageUp') { e.preventDefault(); this.prev(); }
    else if (e.key === 'Home') this.go(0);
    else if (e.key === 'End') this.go(this.defs.length - 1);
  }

  private announce(text: string) {
    this.live.textContent = '';
    requestAnimationFrame(() => (this.live.textContent = text));
  }

  // ---------- סרגל הכלים ----------
  private toolbar() {
    const bar = h('nav', { class: 'toolbar', 'aria-label': 'ניווט בספר' });
    const btn = (icon: string, label: string, fn: () => void, cls = '') => {
      const b = h('button', { type: 'button', class: `tb ${cls}`, 'aria-label': label, title: label }, `${icon}<span class="tb-text">${label}</span>`);
      b.addEventListener('click', fn);
      return b;
    };
    this.folio = h('span', { class: 'tb-folio', 'aria-live': 'off' });
    const still = btn(icons.still, 'מצב שקט', () => this.toggleStill(), 'tb-still');
    still.setAttribute('aria-pressed', String(document.body.classList.contains('still')));
    bar.append(
      btn(icons.contents, 'תוכן', () => this.goId('contents')),
      btn(icons.prev, 'הקודם', () => this.prev(), 'tb-prev'),
      this.folio,
      btn(icons.next, 'הבא', () => this.next(), 'tb-next'),
      btn(icons.glossary, 'מילון', () => this.goId('glossary')),
      btn(icons.quiz, 'מבחן', () => this.goId('quiz')),
      still,
      btn(icons.reset, 'איפוס', () => this.confirmReset()),
    );
    this.bar = bar;
    return bar;
  }

  private updateBar() {
    this.folio.innerHTML = `עמ׳ <bdi>${2 * this.cur + 1}–${2 * this.cur + 2}</bdi>`;
    (this.bar.querySelector('.tb-prev') as HTMLButtonElement).disabled = this.cur <= 0;
    (this.bar.querySelector('.tb-next') as HTMLButtonElement).disabled = this.cur >= this.defs.length - 1;
  }

  toggleStill(force?: boolean) {
    const on = force ?? !document.body.classList.contains('still');
    document.body.classList.toggle('still', on);
    if (this.stage) this.stage.still = on;
    if (this.world) this.world.still = on;
    this.bar?.querySelector('.tb-still')?.setAttribute('aria-pressed', String(on));
    if (force === undefined) this.progress.still = on;
  }

  private confirmReset() {
    const d = h('dialog', { class: 'dlg', 'aria-labelledby': 'dlgT' },
      `<h2 id="dlgT">להתחיל מחדש?</h2><p>הפעולה מוחקת את כל החותמות, הניבויים והתשובות שלך, ומחזירה את הספר לכריכה.</p>
       <form method="dialog" class="dlg-actions"><button value="ok" class="btn btn-rust">כן, למחוק</button><button value="no" class="btn" autofocus>ביטול</button></form>`);
    document.body.append(d);
    d.addEventListener('close', () => {
      if (d.returnValue === 'ok') {
        this.progress.reset();
        const i = this.cur;
        this.cur = -1;
        this.view?.leave?.();
        this.spreadEl?.remove();
        this.spreadEl = null;
        this.view = null;
        this.go(i === 0 ? 0 : 0, true);
      }
      d.remove();
    });
    d.showModal();
  }
}

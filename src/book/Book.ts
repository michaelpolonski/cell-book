/**
 * הספר: מחזיק את רשימת הכפולות, מהפך דפים (מימין לשמאל, כמו בספר עברי),
 * מנהל את הכתובת (#spread-3, #lesson-7, #quiz...) ואת סרגל הכלים.
 */
import type { BookCtx, SpreadDef, SpreadView } from './types';
import type { Progress } from './Progress';
import type { Stage3D } from '../render/Stage3D';
import { icons } from '../ui/icons';
import { h } from '../ui/components';

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

  constructor(private defs: SpreadDef[], private stage: Stage3D | null, private progress: Progress, mount: HTMLElement) {
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
    const dir = i > this.cur ? 1 : -1;
    const oldEl = this.spreadEl;

    // תמונה של ההדגמה הנוכחית, כדי שהדף המתהפך לא יהיה ריק
    if (oldEl && this.stage && oldEl.contains(this.stage.canvas)) {
      const img = new Image();
      img.src = this.stage.snapshot();
      img.className = 'stage-canvas';
      img.alt = '';
      this.stage.canvas.replaceWith(img);
    }
    this.view?.leave?.();

    const def = this.defs[i];
    const view = def.build(this.ctx, i);
    const el = h('div', { class: 'spread', 'data-id': def.id });
    el.append(view.right, view.left);
    this.el.prepend(el);
    this.cur = i;
    this.view = view;
    this.spreadEl = el;
    this.progress.spread = i;
    history.replaceState(null, '', `#${def.id}`);
    this.updateBar();
    view.enter?.();
    this.announce(`${def.label}, עמודים ${2 * i + 1}–${2 * i + 2}`);

    const still = document.body.classList.contains('still');
    if (!oldEl || instant) { oldEl?.remove(); view.afterTurn?.(); return; }
    if (still || mobileQuery.matches) {
      oldEl.remove();
      if (mobileQuery.matches) { this.el.scrollTop = 0; if (!still) el.animate([{ opacity: 0, transform: `translateX(${-dir * 24}px)` }, { opacity: 1, transform: 'none' }], { duration: 280, easing: 'ease-out' }); }
      view.afterTurn?.();
      return;
    }
    this.turning = this.flip(oldEl, el, dir).then(() => { this.turning = null; view.afterTurn?.(); });
    return this.turning;
  }

  /**
   * הפיכת דף. קדימה (dir=1): הדף השמאלי מתרומם ונופל ימינה, ומגלה את הכפולה החדשה.
   * אחורה: הדף הימני נופל שמאלה.
   */
  private async flip(oldEl: HTMLElement, newEl: HTMLElement, dir: number) {
    const sel = (el: HTMLElement, s: string) => el.querySelector(`:scope > .page-${s}`) as HTMLElement;
    const lifting = sel(oldEl, dir > 0 ? 'left' : 'right');
    const landing = sel(newEl, dir > 0 ? 'right' : 'left');
    const clone = (p: HTMLElement, cls: string) => {
      const c = p.cloneNode(true) as HTMLElement;
      c.querySelectorAll('[id]').forEach((x) => x.removeAttribute('id'));
      c.querySelectorAll('input').forEach((x) => x.removeAttribute('name'));
      c.classList.add('face', cls);
      c.setAttribute('aria-hidden', 'true');
      c.inert = true;
      return c;
    };
    const flipper = h('div', { class: `flipper ${dir > 0 ? 'from-left' : 'from-right'}` });
    const front = clone(lifting, 'front');
    const back = clone(landing, 'back');
    flipper.append(front, back);
    lifting.style.visibility = 'hidden';
    oldEl.classList.add('leaving');
    oldEl.inert = true;
    this.el.append(flipper);

    const dur = 950;
    const ease = 'cubic-bezier(.42,.08,.24,1)';
    const anim = flipper.animate(
      [
        { transform: 'rotateY(0deg)' },
        { transform: `rotateY(${dir * 90}deg) translateZ(30px)`, offset: 0.5 },
        { transform: `rotateY(${dir * 180}deg)` },
      ],
      { duration: dur, easing: ease },
    );
    // הצללה: הדף המתרומם מחשיך, הדף הנוחת מתבהר
    front.animate([{ ['--shade' as string]: 0 }, { ['--shade' as string]: 0.35 }], { duration: dur / 2, easing: 'ease-in', fill: 'forwards' });
    back.animate([{ ['--shade' as string]: 0.35 }, { ['--shade' as string]: 0 }], { duration: dur / 2, delay: dur / 2, easing: 'ease-out', fill: 'both' });
    await anim.finished.catch(() => {});
    oldEl.remove();
    flipper.remove();
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

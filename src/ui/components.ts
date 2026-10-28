/** רכיבי הדף: ניבוי, דש, מילים, חותמת. כל אחד מחזיר אלמנט מוכן. */
import { glossaryMap } from '../content/glossary';

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K, attrs: Record<string, string> = {}, html = '',
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  if (html) el.innerHTML = html;
  return el;
}

let uid = 0;

/** קבוצת תשובות לסימון ("סמן ניבוי"). onPick נקרא עם האינדקס שנבחר. */
export function tickGroup(question: string, options: string[], picked: number | undefined, onPick: (i: number) => void) {
  const id = `q${++uid}`;
  const wrap = h('fieldset', { class: 'ticks' });
  wrap.append(h('legend', {}, question));
  options.forEach((opt, i) => {
    const label = h('label', { class: 'tick-opt' });
    const input = h('input', { type: 'radio', name: id, value: String(i) });
    if (picked === i) input.checked = true;
    input.addEventListener('change', () => onPick(i));
    label.append(input, h('span', { class: 'box', 'aria-hidden': 'true' }), h('span', { class: 'opt-text' }, opt));
    wrap.append(label);
  });
  return wrap;
}

/** דש נייר שמרימים כדי לגלות את התשובה. */
export function flap(label: string, content: string, opts: { locked?: () => string | null; onOpen?: (el: HTMLElement) => void; open?: boolean } = {}) {
  const wrap = h('div', { class: 'flap' });
  const hidden = h('div', { class: 'flap-under', id: `fl${++uid}` }, content);
  const btn = h('button', { class: 'flap-cover', type: 'button', 'aria-expanded': 'false', 'aria-controls': hidden.id },
    `<span class="flap-label">${label}</span><span class="flap-corner" aria-hidden="true"></span>`);
  const msg = h('p', { class: 'flap-msg', role: 'status' });
  const open = () => {
    wrap.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');
    opts.onOpen?.(wrap);
  };
  btn.addEventListener('click', () => {
    if (wrap.classList.contains('open')) return;
    const reason = opts.locked?.();
    if (reason) { msg.textContent = reason; wrap.classList.add('shake'); setTimeout(() => wrap.classList.remove('shake'), 450); return; }
    msg.textContent = '';
    open();
  });
  wrap.append(hidden, btn, msg);
  if (opts.open) open();
  return { el: wrap, open };
}

/** "מילים בדף הזה": לחיצה על מילה מציגה את ההגדרה שלה מתחת. */
export function wordChips(words: string[], onGlossary: (term: string) => void) {
  const wrap = h('div', { class: 'words' });
  const list = h('div', { class: 'chips' });
  const def = h('p', { class: 'word-def', 'aria-live': 'polite' });
  for (const w of words) {
    const g = glossaryMap.get(w);
    const b = h('button', { type: 'button', class: 'chip', 'aria-pressed': 'false' }, w);
    b.addEventListener('click', () => {
      const on = b.getAttribute('aria-pressed') !== 'true';
      list.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', 'false'));
      b.setAttribute('aria-pressed', String(on));
      def.innerHTML = on && g ? `<b>${g.term}:</b> ${g.def} <button type="button" class="link">במילון ←</button>` : '';
      def.querySelector('.link')?.addEventListener('click', () => onGlossary(w));
    });
    list.append(b);
  }
  wrap.append(list, def);
  return wrap;
}

/** חותמת דיו אדומה, כמו של מורה. */
export function stampSvg(n: number | string, text = 'כל הכבוד') {
  return `<svg class="stamp" viewBox="0 0 120 120" aria-hidden="true">
    <defs><path id="sarc${n}" d="M20 60a40 40 0 1 1 80 0"/><path id="sarcb${n}" d="M24 64a36 36 0 0 0 72 0"/>
      <filter id="srough${n}"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="${String(n).length + 3}"/>
      <feDisplacementMap in="SourceGraphic" scale="2.5"/></filter></defs>
    <g filter="url(#srough${n})" fill="none" stroke="#9a3b2a">
      <circle cx="60" cy="60" r="54" stroke-width="4"/><circle cx="60" cy="60" r="46" stroke-width="1.5"/>
      <text fill="#9a3b2a" stroke="none" font-size="13" font-weight="700" letter-spacing="1"><textPath href="#sarc${n}" startOffset="50%" text-anchor="middle">${text}</textPath></text>
      <text fill="#9a3b2a" stroke="none" font-size="11" letter-spacing="1"><textPath href="#sarcb${n}" startOffset="50%" text-anchor="middle">כל תא ותא</textPath></text>
      <text x="60" y="71" fill="#9a3b2a" stroke="none" font-size="34" font-weight="800" text-anchor="middle">${n}</text>
    </g></svg>`;
}

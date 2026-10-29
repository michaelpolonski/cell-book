/**
 * צנצנות מולקולות: המודל החוזר של הספר. כל צנצנת מראה כמות אחת (ריכוז, נפח, ATP...).
 * המפלס עולה ויורד בתנועה רכה, וקווי ההצללה בנוזל מתאימים לסגנון הדיו של האיורים.
 */
let uid = 0;

interface Jar { root: HTMLElement; liquid: SVGRectElement; value: HTMLElement; level: number; target: number }

const JAR_PATH = 'M17 5h26v7c9 4 12 11 12 19v39q0 7-7 7H12q-7 0-7-7V31c0-8 3-15 12-19z';

export class Jars {
  /** כשסצנת ה-WebGL פעילה, הנוזל מצויר בה (זוהר + Bloom) ו-SVG מצייר רק את הזכוכית. */
  static glow = false;
  readonly el: HTMLElement;
  private jars = new Map<string, Jar>();
  private raf = 0;

  constructor() {
    this.el = document.createElement('div');
    this.el.className = 'jars';
    this.el.setAttribute('role', 'group');
    this.el.setAttribute('aria-label', 'צנצנות מולקולות');
  }

  add(key: string, label: string, color: string) {
    const id = `jar${++uid}`;
    const root = document.createElement('figure');
    root.className = 'jar';
    root.innerHTML = `
      <svg viewBox="0 0 60 80" aria-hidden="true">
        <defs>
          <clipPath id="${id}c"><path d="${JAR_PATH}"/></clipPath>
          <pattern id="${id}h" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="5" stroke="#1c2433" stroke-opacity=".35" stroke-width="1.2"/>
          </pattern>
        </defs>
        <g clip-path="url(#${id}c)">
          <rect class="liquid" x="0" y="77" width="60" height="80" fill="${color}"/>
          <rect class="liquid-h" x="0" y="77" width="60" height="80" fill="url(#${id}h)"/>
        </g>
        <path d="${JAR_PATH}" fill="none" stroke="#1c2433" stroke-width="1.8" stroke-linejoin="round"/>
        <path d="M14 3.5h32" stroke="#1c2433" stroke-width="2.4" stroke-linecap="round"/>
        <path d="M11 36v26" stroke="#fff" stroke-opacity=".55" stroke-width="2.5" stroke-linecap="round"/>
      </svg>
      <figcaption><span class="jar-label">${label}</span><bdi class="jar-value"></bdi></figcaption>`;
    this.el.appendChild(root);
    const svg = root.querySelector('svg')!;
    svg.dataset.color = color;
    svg.dataset.level = '0';
    if (Jars.glow) root.querySelectorAll<SVGRectElement>('.liquid, .liquid-h').forEach((r) => (r.style.display = 'none'));
    const liquid = root.querySelector('.liquid') as SVGRectElement;
    this.jars.set(key, { root, liquid, value: root.querySelector('.jar-value')!, level: 0, target: 0 });
    this.kick();
  }

  /** level בין 0 ל-1. text הוא הערך שמוצג מתחת לצנצנת. */
  set(key: string, level: number, text = '') {
    const j = this.jars.get(key);
    if (!j) return;
    j.target = Math.max(0, Math.min(1, level));
    (j.root.querySelector('svg') as SVGSVGElement).dataset.level = String(j.target);
    if (j.value.textContent !== text) j.value.textContent = text;
    j.root.setAttribute('aria-label', `${j.root.querySelector('.jar-label')!.textContent}: ${text}`);
    this.kick();
  }

  clear() {
    this.jars.clear();
    this.el.replaceChildren();
  }

  private kick() {
    if (!this.raf) this.raf = requestAnimationFrame(this.anim);
  }

  private anim = () => {
    this.raf = 0;
    let moving = false;
    const still = document.body.classList.contains('still');
    for (const j of this.jars.values()) {
      const d = j.target - j.level;
      j.level = still || Math.abs(d) < 0.002 ? j.target : j.level + d * 0.15;
      if (j.level !== j.target) moving = true;
      const y = 77 - j.level * 66;
      j.liquid.setAttribute('y', y.toFixed(2));
      (j.liquid.nextElementSibling as SVGRectElement).setAttribute('y', y.toFixed(2));
    }
    if (moving) this.kick();
  };
}

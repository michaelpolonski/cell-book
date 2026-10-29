/**
 * מדפיס עמוד HTML לקנבס דו-ממדי, כדי שהדף המתהפך בסצנת ה-Three.js יישא את אותו תוכן בדיוק.
 * כמו ב-Every Joule: הדף בתלת-ממד הוא טקסטורה מצוירת; ה-HTML נשאר לקוראי מסך ולאינטראקציה.
 * מצייר רקעים ומסגרות של רכיבים, SVG, תמונות וקנבסים, ואת הטקסט מילה אחר מילה במקום המדויק שלה.
 */
const HEB = /[\u0590-\u05FF]/;

const isClear = (c: string) => !c || c === 'transparent' || /rgba\([^)]*,\s*0\)$/.test(c);

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function svgToImage(svg: SVGSVGElement, color: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    try {
      const clone = svg.cloneNode(true) as SVGSVGElement;
      const r = svg.getBoundingClientRect();
      clone.setAttribute('width', String(r.width));
      clone.setAttribute('height', String(r.height));
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      clone.style.color = color;
      const xml = new XMLSerializer().serializeToString(clone).replace(/currentColor/g, color);
      const img = new Image();
      const t = setTimeout(() => resolve(null), 600);
      img.onload = () => { clearTimeout(t); resolve(img); };
      img.onerror = () => { clearTimeout(t); resolve(null); };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
    } catch { resolve(null); }
  });
}

export interface RasterExtras {
  /** תמונת הבמה התלת-ממדית (אם יש בעמוד), שמודבקת במקום ה-stage-box. */
  stage?: { canvas: HTMLCanvasElement | null; host: HTMLElement | null };
}

/** מחזיר קנבס שקוף בגודל העמוד (פיקסלים × dpr) עם תוכן העמוד. */
export async function rasterizePage(page: HTMLElement, extras: RasterExtras = {}, dpr = Math.min(2, devicePixelRatio || 1)): Promise<HTMLCanvasElement> {
  const pr = page.getBoundingClientRect();
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(pr.width * dpr));
  cv.height = Math.max(1, Math.round(pr.height * dpr));
  const g = cv.getContext('2d')!;
  g.scale(dpr, dpr);
  g.translate(-pr.left, -pr.top);
  g.save();
  g.beginPath();
  g.rect(pr.left, pr.top, pr.width, pr.height);
  g.clip();

  const visible = (el: Element) => {
    const cs = getComputedStyle(el);
    return cs.visibility !== 'hidden' && cs.display !== 'none' && parseFloat(cs.opacity) > 0.02;
  };
  const inPage = (r: DOMRect) => r.width > 0 && r.height > 0 && r.bottom > pr.top && r.top < pr.bottom && r.right > pr.left && r.left < pr.right;

  // שקיפות ופילטר מצטברים מההורים (למשל חותמת שעוד לא הושגה: שקופה ובגווני אפור)
  const eff = new Map<Element, { alpha: number; filter: string }>();
  const effective = (el: Element): { alpha: number; filter: string } => {
    if (el === page || !el.parentElement) return { alpha: 1, filter: 'none' };
    const hit = eff.get(el);
    if (hit) return hit;
    const up = effective(el.parentElement);
    const cs = getComputedStyle(el);
    const v = { alpha: up.alpha * parseFloat(cs.opacity), filter: cs.filter && cs.filter !== 'none' ? cs.filter : up.filter };
    eff.set(el, v);
    return v;
  };

  // 1) רקעים ומסגרות (לפי סדר המסמך, כך שילדים מצוירים מעל הוריהם)
  const all = [...page.querySelectorAll<HTMLElement>('*')];
  const images: Promise<void>[] = [];
  for (const el of all) {
    if (el.closest('svg') && !(el instanceof SVGSVGElement)) continue;
    const r = el.getBoundingClientRect();
    if (!inPage(r)) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    const ef = effective(el);
    const op = ef.alpha;
    if (op < 0.02) continue;
    g.globalAlpha = op;
    g.filter = ef.filter;

    if (el.classList.contains('stage-box') && extras.stage?.canvas && extras.stage.host === el) {
      g.drawImage(extras.stage.canvas, r.left, r.top, r.width, r.height);
    }

    const rad = parseFloat(cs.borderTopLeftRadius) || 0;
    if (!isClear(cs.backgroundColor)) {
      g.fillStyle = cs.backgroundColor;
      roundRect(g, r.left, r.top, r.width, r.height, rad);
      g.fill();
    }
    const bw = parseFloat(cs.borderTopWidth) || 0;
    if (bw > 0 && cs.borderTopStyle !== 'none' && !isClear(cs.borderTopColor)) {
      g.strokeStyle = cs.borderTopColor;
      g.lineWidth = bw;
      g.setLineDash(cs.borderTopStyle === 'dashed' ? [5, 4] : cs.borderTopStyle === 'dotted' ? [1.5, 3] : []);
      roundRect(g, r.left + bw / 2, r.top + bw / 2, r.width - bw, r.height - bw, rad);
      g.stroke();
      g.setLineDash([]);
    } else {
      const bb = parseFloat(cs.borderBottomWidth) || 0;
      if (bb > 0 && cs.borderBottomStyle !== 'none' && !isClear(cs.borderBottomColor)) {
        g.strokeStyle = cs.borderBottomColor;
        g.lineWidth = bb;
        g.setLineDash(cs.borderBottomStyle === 'dotted' ? [1.5, 3] : cs.borderBottomStyle === 'dashed' ? [5, 4] : []);
        g.beginPath();
        g.moveTo(r.left, r.bottom - bb / 2);
        g.lineTo(r.right, r.bottom - bb / 2);
        g.stroke();
        g.setLineDash([]);
      }
    }

    if (el instanceof HTMLInputElement && el.type === 'range') {
      const v = (parseFloat(el.value) - parseFloat(el.min || '0')) / ((parseFloat(el.max || '100') - parseFloat(el.min || '0')) || 1);
      const cy = (r.top + r.bottom) / 2;
      g.strokeStyle = 'rgba(28,36,51,0.25)'; g.lineWidth = 4; g.lineCap = 'round';
      g.beginPath(); g.moveTo(r.left + 6, cy); g.lineTo(r.right - 6, cy); g.stroke();
      const x = r.left + 6 + (r.width - 12) * v;
      g.strokeStyle = '#9a3b2a';
      g.beginPath(); g.moveTo(r.left + 6, cy); g.lineTo(x, cy); g.stroke();
      g.fillStyle = '#9a3b2a'; g.beginPath(); g.arc(x, cy, 7, 0, Math.PI * 2); g.fill();
    } else if (el instanceof SVGSVGElement) {
      const rr = r; const a = op;
      // נוזל הצנצנת מצויר ב-WebGL; בהדפסה מציירים אותו כאן
      if (el.dataset.level && el.closest('.jar')) {
        const lv = parseFloat(el.dataset.level) || 0;
        g.save();
        g.translate(r.left, r.top);
        g.scale(r.width / 60, r.height / 80);
        g.clip(new Path2D('M17 5h26v7c9 4 12 11 12 19v39q0 7-7 7H12q-7 0-7-7V31c0-8 3-15 12-19z'));
        g.fillStyle = el.dataset.color || '#9cc0de';
        const y = 77 - lv * 66;
        g.fillRect(0, y, 60, 80 - y);
        g.restore();
      }
      const flt = ef.filter;
      images.push(svgToImage(el, cs.color).then((img) => { if (img) { g.globalAlpha = a; g.filter = flt; g.drawImage(img, rr.left, rr.top, rr.width, rr.height); g.filter = 'none'; } }));
    } else if (el instanceof HTMLImageElement && el.complete) {
      try { g.drawImage(el, r.left, r.top, r.width, r.height); } catch { /* cross-origin */ }
    } else if (el instanceof HTMLCanvasElement) {
      try { g.drawImage(el, r.left, r.top, r.width, r.height); } catch { /* */ }
    }
  }
  await Promise.all(images);
  g.globalAlpha = 1;
  g.filter = 'none';

  // 2) טקסט: כל מילה בדיוק במקום שהדפדפן פרס אותה
  const walker = document.createTreeWalker(page, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  const styleCache = new Map<Element, { font: string; color: string; ok: boolean; alpha: number }>();
  for (let n = walker.nextNode() as Text | null; n; n = walker.nextNode() as Text | null) {
    const parent = n.parentElement;
    if (!parent || parent.closest('svg, script, style, .sr, option')) continue;
    let st = styleCache.get(parent);
    if (!st) {
      const cs = getComputedStyle(parent);
      let ok = visible(parent);
      let alpha = 1;
      for (let p: Element | null = parent; ok && p && p !== page; p = p.parentElement) {
        const pc = getComputedStyle(p);
        if (pc.display === 'none' || pc.visibility === 'hidden') ok = false;
        alpha *= parseFloat(pc.opacity);
      }
      st = { font: `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`, color: cs.color, ok, alpha };
      styleCache.set(parent, st);
    }
    if (!st.ok) continue;
    const text = n.data;
    const re = /\S+/g;
    let m: RegExpExecArray | null;
    g.font = st.font;
    g.fillStyle = st.color;
    g.globalAlpha = st.alpha;
    g.textBaseline = 'middle';
    while ((m = re.exec(text))) {
      range.setStart(n, m.index);
      range.setEnd(n, m.index + m[0].length);
      const rects = range.getClientRects();
      if (!rects.length) continue;
      const r = rects[0];
      if (!inPage(r)) continue;
      const rtl = HEB.test(m[0]);
      g.direction = rtl ? 'rtl' : 'ltr';
      g.textAlign = rtl ? 'right' : 'left';
      g.fillText(m[0], rtl ? r.right : r.left, (r.top + r.bottom) / 2 + 0.5);
    }
  }
  g.restore();
  return cv;
}

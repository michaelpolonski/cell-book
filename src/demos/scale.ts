/**
 * שיעור 1: עולם קטן – סדרי גודל.
 * מסע זום רציף על ציר לוגריתמי בין כף יד (10 cm) למולקולת מים (0.3 nm),
 * ואתגר סידור 5 עצמים מהקטן לגדול.
 */
import * as THREE from 'three';
import type { DemoFactory } from './types';
import { inked, sketchLines } from '../render/ink';
import { SCALE_ITEMS } from '../sim/models';

const CHALLENGE_POOL = [
  { id: 'molecule', label: 'מולקולת מים (0.3 nm)', rank: 0 },
  { id: 'ribosome', label: 'ריבוזום (25 nm)', rank: 1 },
  { id: 'bacterium', label: 'חיידק (2 µm)', rank: 2 },
  { id: 'rbc', label: 'תא דם אדום (8 µm)', rank: 3 },
  { id: 'plant', label: 'תא בצל (60 µm)', rank: 4 },
];

const factory: DemoFactory = (api) => {
  const { stage } = api;
  stage.camera.position.set(0, 1.8, 6.2);
  stage.setShadow(-1.45, 5.5, 3.2);

  // בניית 8 עצמים תלת-ממדיים שלאורך מסלול הזום כל אחד מופיע בקנה המידה שלו
  const nodes = SCALE_ITEMS.map((item, idx) => {
    const g = new THREE.Group();
    if (item.id === 'molecule') {
      const o = inked(new THREE.SphereGeometry(0.45, 24, 16), { color: '#d96a5b', outline: 0.02 });
      const h1 = inked(new THREE.SphereGeometry(0.28, 20, 14), { color: '#9cc0de', outline: 0.018 });
      const h2 = inked(new THREE.SphereGeometry(0.28, 20, 14), { color: '#9cc0de', outline: 0.018 });
      h1.group.position.set(0.48, 0.32, 0);
      h2.group.position.set(-0.48, 0.32, 0);
      g.add(o.group, h1.group, h2.group);
    } else if (item.id === 'ribosome') {
      const big = inked(new THREE.SphereGeometry(0.55, 24, 18), { color: '#d8b26e', outline: 0.02 });
      big.group.scale.set(1.15, 0.85, 0.95);
      const small = inked(new THREE.SphereGeometry(0.38, 22, 16), { color: '#e6c98a', outline: 0.018 });
      small.group.position.set(0, 0.48, 0.12);
      small.group.scale.set(1.1, 0.7, 0.9);
      g.add(big.group, small.group);
    } else if (item.id === 'virus') {
      const core = inked(new THREE.IcosahedronGeometry(0.62, 0), { color: '#9ab89e', outline: 0.02 });
      g.add(core.group);
    } else if (item.id === 'bacterium') {
      const body = inked(new THREE.CapsuleGeometry(0.38, 0.85, 12, 24), { color: '#d7c38a', outline: 0.02 });
      body.group.rotation.z = Math.PI / 2;
      g.add(body.group);
    } else if (item.id === 'rbc') {
      const rbc = inked(new THREE.TorusGeometry(0.55, 0.26, 18, 36), { color: '#d26a5c', outline: 0.02 });
      rbc.group.rotation.x = 0.9;
      g.add(rbc.group);
    } else if (item.id === 'plant') {
      const box = inked(new THREE.BoxGeometry(1.45, 0.95, 0.9), { color: '#a7bd84', opacity: 0.45, rim: 0.9 });
      const nuc = inked(new THREE.SphereGeometry(0.22, 20, 14), { color: '#c7a4c9', outline: 0.015 });
      nuc.group.position.set(-0.35, 0.1, 0);
      g.add(box.group, nuc.group);
    } else if (item.id === 'ovum') {
      const egg = inked(new THREE.SphereGeometry(0.82, 28, 20), { color: '#ecd5a6', opacity: 0.55, rim: 0.9 });
      const nuc = inked(new THREE.SphereGeometry(0.26, 20, 14), { color: '#c7a4c9', outline: 0.016 });
      g.add(egg.group, nuc.group);
    } else {
      const palm = inked(new THREE.BoxGeometry(1.1, 0.25, 1.3), { color: '#e3bfa3', outline: 0.02 });
      g.add(palm.group);
    }
    // טבעת קנה-מידה מצוירת בדיו סביב כל עצם
    const ring: number[] = [];
    for (let a = 0; a < 48; a++) {
      const t0 = (a / 48) * Math.PI * 2, t1 = ((a + 1) / 48) * Math.PI * 2;
      ring.push(Math.cos(t0) * 1.25, -0.85, Math.sin(t0) * 1.25, Math.cos(t1) * 1.25, -0.85, Math.sin(t1) * 1.25);
    }
    g.add(sketchLines(ring, 0.01));
    g.userData.idx = idx;
    stage.add(g);
    return g;
  });

  let zoomExp = 5;        // log10(um): מ-5 (כף יד) עד -3.5 (מולקולה)
  let zoomTarget = 5;
  let pickedOrder: string[] = [];
  let met = false, disposed = false;

  api.jars.add('scale', 'סדר גודל', '#9cc0de');
  api.jars.add('rel', 'יחס לכף יד', '#e9a865');
  api.jars.add('done', 'סידור נכון', '#9ab89e');

  const badge = document.createElement('div');
  badge.className = 'badge';
  const status = document.createElement('div');
  status.className = 'badge badge-status';
  api.overlay.append(badge, status);

  function nearestItem() {
    let best = SCALE_ITEMS[0], dBest = Infinity;
    for (const it of SCALE_ITEMS) {
      const d = Math.abs(it.exp - zoomExp);
      if (d < dBest) { dBest = d; best = it; }
    }
    return best;
  }

  function updateHud() {
    const it = nearestItem();
    badge.innerHTML = `<b>${it.name}</b> · קנה מידה: <bdi>${it.display}</bdi>`;
    status.innerHTML = it.hint;
    const norm = (zoomExp - (-3.5)) / (5 - (-3.5));
    api.jars.set('scale', norm, it.display);
    api.jars.set('rel', norm, `10^${Math.round(zoomExp - 5)}`);
    api.jars.set('done', pickedOrder.length / CHALLENGE_POOL.length, `${pickedOrder.length}/${CHALLENGE_POOL.length}`);
  }

  stage.onTick((dt, t) => {
    if (disposed || dt <= 0) return;
    zoomExp += (zoomTarget - zoomExp) * Math.min(1, dt * 4);
    nodes.forEach((g, idx) => {
      const item = SCALE_ITEMS[idx];
      const diff = item.exp - zoomExp;
      const dist = Math.abs(diff);
      g.visible = dist < 2.2;
      if (!g.visible) return;
      const s = Math.pow(2.1, -diff);
      const clamped = Math.max(0.05, Math.min(2.3, s));
      g.scale.setScalar(clamped);
      g.position.z = diff * 1.1;
      g.position.y = Math.sin(t * 1.4 + idx) * 0.06;
      g.rotation.y = t * 0.45 + idx * 0.5;
    });
    updateHud();
  });

  // פקדי "נסה בעצמך": מחוון זום + אתגר סידור מהקטן לגדול
  const shuffled = [CHALLENGE_POOL[3], CHALLENGE_POOL[0], CHALLENGE_POOL[4], CHALLENGE_POOL[1], CHALLENGE_POOL[2]];
  api.controls.innerHTML = `
    <label class="slider" style="flex:1 1 100%">
      <span>זום (מהקטן לגדול)</span>
      <input type="range" min="-3.5" max="5" step="0.05" value="0.9">
      <output><bdi>8 µm</bdi></output>
    </label>
    <div class="order-picks" style="display:flex;flex-wrap:wrap;gap:6px;width:100%"></div>
    <button type="button" class="btn" data-act="clear">נקה סדר</button>`;

  const range = api.controls.querySelector('input')!;
  const out = api.controls.querySelector('output')!;
  const picksBox = api.controls.querySelector('.order-picks') as HTMLElement;

  const renderPicks = () => {
    picksBox.innerHTML = '';
    for (const item of shuffled) {
      const pos = pickedOrder.indexOf(item.id);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.dataset.pick = item.id;
      b.setAttribute('aria-pressed', String(pos >= 0));
      b.innerHTML = pos >= 0 ? `<b>${pos + 1}.</b> ${item.label}` : item.label;
      b.addEventListener('click', () => {
        if (pickedOrder.includes(item.id)) return;
        const expected = CHALLENGE_POOL[pickedOrder.length];
        const scaleIt = SCALE_ITEMS.find((s) => s.id === item.id);
        if (scaleIt) { zoomTarget = scaleIt.exp; range.value = String(zoomTarget); }
        if (item.id === expected.id) {
          pickedOrder.push(item.id);
          renderPicks();
          if (pickedOrder.length === CHALLENGE_POOL.length && !met) {
            met = true;
            api.challengeMet();
          }
        } else {
          pickedOrder = [];
          api.say('לא הקטן ביותר שנותר – נסה שוב מהקטן ביותר (ננומטרים) לגדול ביותר.');
          renderPicks();
        }
      });
      picksBox.append(b);
    }
  };
  renderPicks();

  range.addEventListener('input', () => {
    zoomTarget = parseFloat(range.value);
    const it = nearestItem();
    out.innerHTML = `<bdi>${it.display}</bdi>`;
  });
  api.controls.querySelector('[data-act=clear]')!.addEventListener('click', () => {
    pickedOrder = [];
    renderPicks();
  });

  updateHud();

  const stepTargets = [5, 0.9, 0.3, -1.6, -3.5];
  return {
    async playStep(i) {
      stage.controls.enabled = false;
      zoomTarget = stepTargets[i] ?? 0.9;
      await stage.wait(3200);
    },
    enterTry() {
      stage.controls.enabled = true;
      zoomTarget = 0.9;
      range.value = '0.9';
    },
    enterDemo() {
      stage.controls.enabled = false;
      zoomTarget = 5;
    },
    dispose() {
      disposed = true;
      badge.remove();
      status.remove();
    },
  };
};

export default factory;

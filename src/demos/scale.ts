/**
 * שיעור 1: עולם קטן – סדרי גודל.
 * מסע זום קולנועי רציף בסגנון Powers of Ten בין כף יד (10 cm) למולקולת מים (0.3 nm):
 * כולל תנודת קשרים כימיים במולקולת המים, ריבוזום עם סרט mRNA, נגיף עם חלבוני ספייק,
 * חיידק עם שוטון מתפתל, תא דם אדום דו-קעור ותא צמח עם גרעין וחלולית.
 */
import * as THREE from 'three';
import type { DemoFactory } from './types';
import { upgrade } from '../render/models';
import { inked, organicTube, sketchLines, SpringScalar } from '../render/ink';
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
  stage.focusOn([0, 1.5, 5.8], [0, 0, 0], true);
  stage.setShadow(-1.45, 5.5, 3.2);

  let h1Ref: THREE.Object3D | null = null;
  let h2Ref: THREE.Object3D | null = null;
  let flagRef: THREE.Object3D | null = null;

  const nodes = SCALE_ITEMS.map((item) => {
    const g = new THREE.Group();
    if (item.id === 'molecule') {
      // מולקולת H₂O עם קשרים אלסטיים רוטטים וענן אלקטרונים עדין
      const cloud = inked(new THREE.SphereGeometry(0.75, 24, 18), { color: '#9cc0de', opacity: 0.18, rim: 0.7, wobble: 0.04 });
      const o = inked(new THREE.SphereGeometry(0.42, 28, 20), { color: '#d96a5b', outline: 0.02, wobble: 0.02, gloss: 0.85 });
      const h1 = inked(new THREE.SphereGeometry(0.26, 22, 16), { color: '#9cc0de', outline: 0.018, gloss: 0.8 });
      const h2 = inked(new THREE.SphereGeometry(0.26, 22, 16), { color: '#9cc0de', outline: 0.018, gloss: 0.8 });
      h1.group.position.set(0.52, 0.36, 0);
      h2.group.position.set(-0.52, 0.36, 0);
      h1Ref = h1.group; h2Ref = h2.group;
      const b1 = organicTube([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.52, 0.36, 0)], 0.06, { color: '#e6decb', wobble: 0.005 });
      const b2 = organicTube([new THREE.Vector3(0, 0, 0), new THREE.Vector3(-0.52, 0.36, 0)], 0.06, { color: '#e6decb', wobble: 0.005 });
      g.add(cloud.group, o.group, h1.group, h2.group, b1.group, b2.group);
    } else if (item.id === 'ribosome') {
      // ריבוזום דו-יחידתי (60S + 40S) שמתרגם סרט mRNA ומוציא שרשרת פוליפפטידית
      const big = inked(new THREE.SphereGeometry(0.52, 28, 20), { color: '#d8b26e', outline: 0.02, wobble: 0.035, wobbleFreq: 3.5 });
      big.group.scale.set(1.2, 0.88, 0.98);
      const small = inked(new THREE.SphereGeometry(0.38, 24, 18), { color: '#e6c98a', outline: 0.018, wobble: 0.03, wobbleFreq: 3.8 });
      small.group.position.set(0.05, 0.46, 0.14);
      small.group.scale.set(1.12, 0.72, 0.9);
      const mrna = organicTube([
        new THREE.Vector3(-0.95, 0.18, 0.2),
        new THREE.Vector3(-0.3, 0.24, 0.15),
        new THREE.Vector3(0.3, 0.22, 0.12),
        new THREE.Vector3(0.95, 0.12, 0.22),
      ], 0.035, { color: '#9a3b2a', wobble: 0.02 });
      const peptide = organicTube([
        new THREE.Vector3(0, -0.1, 0),
        new THREE.Vector3(-0.18, -0.45, 0.12),
        new THREE.Vector3(0.12, -0.78, -0.08),
      ], 0.045, { color: '#6fa3c7', wobble: 0.025 });
      g.add(big.group, small.group, mrna.group, peptide.group);
    } else if (item.id === 'virus') {
      // נגיף שפעת עם קפסיד עשרים-פאון וחלבוני ספייק בולטים
      const vslot = new THREE.Group();
      g.add(vslot);
      const core = inked(new THREE.IcosahedronGeometry(0.56, 1), { color: '#8fb394', outline: 0.02, wobble: 0.02 });
      vslot.add(core.group);
      upgrade(stage, vslot, 'virus', { size: 1.55, tint: '#8fb394', subsurface: 0.9, gloss: 0.7, wobble: 0.01 });
      const spikeGeo = new THREE.CylinderGeometry(0.045, 0.02, 0.22, 8);
      for (let k = 0; k < 18; k++) {
        const phi = Math.acos(1 - (2 * (k + 0.5)) / 18);
        const theta = Math.PI * (1 + Math.sqrt(5)) * k;
        const dir = new THREE.Vector3(
          Math.sin(phi) * Math.cos(theta),
          Math.cos(phi),
          Math.sin(phi) * Math.sin(theta),
        );
        const sp = inked(spikeGeo, { color: '#9a3b2a', outline: 0.008, wobble: 0.01 });
        sp.group.position.copy(dir).multiplyScalar(0.64);
        sp.group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        vslot.add(sp.group);
      }
    } else if (item.id === 'bacterium') {
      // חיידק אי-קולי עם קפסולה שקופה למחצה, DNA פנימי ושוטון לולייני
      const body = inked(new THREE.CapsuleGeometry(0.36, 0.78, 16, 28), { color: '#d7c38a', opacity: 0.72, rim: 0.9, wobble: 0.022 });
      body.group.rotation.z = Math.PI / 2;
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 24; i++) {
        const u = i / 24;
        pts.push(new THREE.Vector3(0.72 + u * 1.1, Math.sin(u * Math.PI * 4) * 0.16, Math.cos(u * Math.PI * 4) * 0.16));
      }
      const flag = organicTube(pts, 0.022, { color: '#1c2433', wobble: 0.02 });
      flagRef = flag.group;
      g.add(body.group, flag.group);
    } else if (item.id === 'rbc') {
      // תא דם אדום בצורת דיסקה דו-קעורה אמיתית (Evans & Fung)
      const geo = new THREE.SphereGeometry(0.75, 48, 32);
      const p = geo.attributes.position.array as Float32Array;
      for (let i = 0; i < p.length; i += 3) {
        const x = p[i] / 0.75, y = p[i + 1] / 0.75, z = p[i + 2] / 0.75;
        const r2 = x * x + z * z;
        const hd = 0.72 * Math.sqrt(Math.max(0, 1 - r2)) * (0.21 + 2.0 * r2 - 1.12 * r2 * r2);
        p[i + 1] = Math.sign(y) * hd * 0.75;
      }
      geo.computeVertexNormals();
      const rbc = inked(geo, { color: '#d25f52', outline: 0.02, wobble: 0.022, subsurface: 1.0, gloss: 0.7 });
      rbc.group.rotation.x = 0.65;
      const rslot = new THREE.Group();
      rslot.add(rbc.group);
      g.add(rslot);
      upgrade(stage, rslot, 'rbc', { size: 1.6, rotation: [0.65, 0, 0], tint: '#d25f52', subsurface: 1, gloss: 0.75, wobble: 0.015 });
    } else if (item.id === 'plant') {
      const wall = inked(new THREE.BoxGeometry(1.38, 0.92, 0.88), { color: '#a7bd84', opacity: 0.35, rim: 0.92, wobble: 0.008 });
      const vac = inked(new THREE.SphereGeometry(0.42, 24, 18), { color: '#9cc0de', opacity: 0.48, rim: 0.85, wobble: 0.025 });
      vac.group.scale.set(1.25, 0.85, 0.85);
      vac.group.position.set(0.12, 0, 0);
      const nuc = inked(new THREE.SphereGeometry(0.2, 22, 16), { color: '#c7a4c9', outline: 0.014, wobble: 0.018 });
      nuc.group.position.set(-0.42, 0.14, 0.1);
      g.add(wall.group, vac.group, nuc.group);
    } else if (item.id === 'ovum') {
      const zona = inked(new THREE.SphereGeometry(0.88, 32, 22), { color: '#f2dfb3', opacity: 0.32, rim: 0.92, wobble: 0.025 });
      const egg = inked(new THREE.SphereGeometry(0.72, 32, 22), { color: '#e8c48e', opacity: 0.78, rim: 0.85, wobble: 0.02 });
      const nuc = inked(new THREE.SphereGeometry(0.24, 22, 16), { color: '#c7a4c9', outline: 0.015 });
      nuc.group.position.set(0.12, 0.08, 0.1);
      g.add(zona.group, egg.group, nuc.group);
    } else {
      // כף יד תלת-ממדית עם חמש אצבעות
      const palm = inked(new THREE.BoxGeometry(0.85, 0.2, 0.9), { color: '#e3bfa3', outline: 0.018, wobble: 0.01 });
      palm.group.position.z = 0.2;
      g.add(palm.group);
      [-0.32, -0.11, 0.11, 0.32].forEach((x, fi) => {
        const len = 0.58 - Math.abs(fi - 1.5) * 0.07;
        const f = inked(new THREE.CapsuleGeometry(0.085, len, 8, 14), { color: '#e3bfa3', outline: 0.014, wobble: 0.008 });
        f.group.rotation.x = Math.PI / 2;
        f.group.position.set(x, 0, -0.45 - len * 0.35);
        g.add(f.group);
      });
      const thumb = inked(new THREE.CapsuleGeometry(0.09, 0.42, 8, 14), { color: '#e3bfa3', outline: 0.014, wobble: 0.008 });
      thumb.group.rotation.z = 0.8;
      thumb.group.position.set(0.58, 0, 0.15);
      g.add(thumb.group);
    }

    const ring: number[] = [];
    for (let a = 0; a < 48; a++) {
      const t0 = (a / 48) * Math.PI * 2, t1 = ((a + 1) / 48) * Math.PI * 2;
      ring.push(Math.cos(t0) * 1.25, -0.85, Math.sin(t0) * 1.25, Math.cos(t1) * 1.25, -0.85, Math.sin(t1) * 1.25);
    }
    g.add(sketchLines(ring, 0.01));
    stage.add(g);
    return g;
  });

  const zoomSpring = new SpringScalar(5, 5, 14, 5.8);
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
      const d = Math.abs(it.exp - zoomSpring.x);
      if (d < dBest) { dBest = d; best = it; }
    }
    return best;
  }

  function updateHud() {
    const it = nearestItem();
    badge.innerHTML = `<b>${it.name}</b> · קנה מידה: <bdi>${it.display}</bdi>`;
    status.innerHTML = it.hint;
    const norm = (zoomSpring.x - (-3.5)) / (5 - (-3.5));
    api.jars.set('scale', norm, it.display);
    api.jars.set('rel', norm, `10^${Math.round(zoomSpring.x - 5)}`);
    api.jars.set('done', pickedOrder.length / CHALLENGE_POOL.length, `${pickedOrder.length}/${CHALLENGE_POOL.length}`);
  }

  stage.onTick((dt, t) => {
    if (disposed || dt <= 0) return;
    const zoomExp = zoomSpring.step(Math.min(0.05, dt));
    if (h1Ref && h2Ref) {
      const vib = Math.sin(t * 7) * 0.04;
      h1Ref.position.set(0.52 + vib, 0.36 - vib * 0.5, 0);
      h2Ref.position.set(-0.52 - vib, 0.36 - vib * 0.5, 0);
    }
    if (flagRef) flagRef.rotation.x = t * 9;

    nodes.forEach((g, idx) => {
      const item = SCALE_ITEMS[idx];
      const diff = item.exp - zoomExp;
      const dist = Math.abs(diff);
      g.visible = dist < 2.3;
      if (!g.visible) return;
      const s = Math.pow(2.15, -diff);
      const clamped = Math.max(0.04, Math.min(2.35, s));
      g.scale.setScalar(clamped);
      g.position.z = diff * 1.15;
      g.position.y = Math.sin(t * 1.5 + idx) * 0.08;
      g.rotation.y = t * 0.48 + idx * 0.5;
    });
    updateHud();
  });

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
        if (scaleIt) { zoomSpring.target = scaleIt.exp; range.value = String(scaleIt.exp); }
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
    zoomSpring.target = parseFloat(range.value);
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
      zoomSpring.target = stepTargets[i] ?? 0.9;
      stage.focusOn([Math.sin(i) * 0.6, 1.45, 5.5], [0, 0, 0]);
      await stage.wait(3200);
    },
    enterTry() {
      stage.controls.enabled = true;
      zoomSpring.target = 0.9;
      range.value = '0.9';
      stage.focusOn([0, 1.5, 5.8], [0, 0, 0]);
    },
    enterDemo() {
      stage.controls.enabled = false;
      zoomSpring.target = 5;
      stage.focusOn([0, 1.5, 5.8], [0, 0, 0]);
    },
    dispose() {
      disposed = true;
      badge.remove();
      status.remove();
    },
  };
};

export default factory;

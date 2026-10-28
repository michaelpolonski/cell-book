/**
 * שיעור 7: דיפוזיה ואוסמוזה.
 *
 * מיכל זכוכית עם תמיסה, ובמרכזו תא (תא דם אדום או תא צמח). מולקולות מים (כחול)
 * נעות באקראי ועוברות דרך הקרום; המומס (כתום) לא עובר. הנפח של התא נקבע במודל
 * שב-sim/osmosis.ts, ומספר מולקולות המים שבתוכו עוקב אחרי הנפח, כך שרואים את
 * הזרימה נטו בעיניים.
 */
import * as THREE from 'three';
import type { DemoFactory } from './types';
import { inked, inkedInstances, sketchLines, mulberry32 } from '../render/ink';
import * as O from '../sim/osmosis';

const TANK = { x: 2.35, y: 1.25, z: 1.35 };
const LIQUID_TOP = 0.98;
const WATER_N = 230;
const W_IN0 = 30;            // מולקולות מים בתוך התא בנפח רגיל
const SOLUTE_IN = 12;        // מולקולות מומס בתוך התא (קבוע)
const SOLUTE_OUT_MAX = 56;   // מולקולות מומס בחוץ ב-3% מלח
const SOLUTE_N = SOLUTE_IN + SOLUTE_OUT_MAX;
const WATER_COLOR = new THREE.Color('#7fa6cc');
const WATER_HOT = new THREE.Color('#1f5f9e');
const SOLUTE_COLOR = new THREE.Color('#d98a3d');
const PLANT_W = new THREE.Vector3(1.45, 0.8, 0.95);

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (x: number) => { const t = clamp01(x); return t * t * (3 - 2 * t); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

interface Crossing { i: number; from: THREE.Vector3; to: THREE.Vector3; t: number }
interface Fragment { obj: THREE.Object3D; v: THREE.Vector3; spin: THREE.Vector3; life: number }

const factory: DemoFactory = (api) => {
  const { stage } = api;
  const rnd = mulberry32(7);
  const gauss = () => (rnd() + rnd() + rnd() - 1.5) * 1.15;
  stage.focusOn([0, 2.5, 6.6], [0, 0, 0], true);
  stage.setShadow(-TANK.y - 0.02, 6.4, 3.6);

  // ---------- המיכל ----------
  const tank = new THREE.Group();
  const { x: X, y: Y, z: Z } = TANK;
  const box = (x: number, y0: number, y1: number, z: number) => [
    -x, y0, -z, x, y0, -z, x, y0, -z, x, y0, z, x, y0, z, -x, y0, z, -x, y0, z, -x, y0, -z,
    -x, y1, -z, x, y1, -z, x, y1, -z, x, y1, z, x, y1, z, -x, y1, z, -x, y1, z, -x, y1, -z,
    -x, y0, -z, -x, y1, -z, x, y0, -z, x, y1, -z, x, y0, z, x, y1, z, -x, y0, z, -x, y1, z,
  ];
  tank.add(sketchLines(box(X, -Y, Y, Z), 0.018));
  const surf = sketchLines([-X, LIQUID_TOP, -Z, X, LIQUID_TOP, -Z, X, LIQUID_TOP, -Z, X, LIQUID_TOP, Z,
    X, LIQUID_TOP, Z, -X, LIQUID_TOP, Z, -X, LIQUID_TOP, Z, -X, LIQUID_TOP, -Z], 0.01, '#3c6e9e', 0.7);
  tank.add(surf);
  const liquid = inked(new THREE.BoxGeometry(2 * X, LIQUID_TOP + Y, 2 * Z), { color: '#b9cfe0', opacity: 0.12, hatch: 0.25 });
  liquid.group.position.y = (LIQUID_TOP - Y) / 2;
  liquid.mesh.renderOrder = 2;
  tank.add(liquid.group);
  stage.add(tank);

  // ---------- תא דם אדום (פיזור תת-משטחי וגליות ביולוגית חיה) ----------
  const sphere = new THREE.SphereGeometry(1, 72, 48);
  const unit = (sphere.attributes.position.array as Float32Array).slice();
  const animalGeo = sphere;
  const animal = inked(animalGeo, {
    color: '#d2584a', opacity: 0.48, hatch: 0.75, rim: 1, subsurface: 0.95, gloss: 0.65, wobble: 0.015, wobbleFreq: 3.2,
  });
  animal.mesh.renderOrder = 3;
  stage.add(animal.group);

  // ---------- תא צמח ----------
  const plant = new THREE.Group();
  const wallBody = inked(new THREE.BoxGeometry(PLANT_W.x * 2, PLANT_W.y * 2, PLANT_W.z * 2), {
    color: '#a7bd84', opacity: 0.16, hatch: 0.45, subsurface: 0.85,
  });
  wallBody.mesh.renderOrder = 3;
  plant.add(wallBody.group);
  const wx = PLANT_W.x, wy = PLANT_W.y, wz = PLANT_W.z;
  plant.add(sketchLines(box(wx, -wy, wy, wz), 0.014, '#3f5a2a', 0.9));
  plant.add(sketchLines(box(wx * 0.965, -wy * 0.94, wy * 0.94, wz * 0.95), 0.01, '#3f5a2a', 0.55));
  const membraneGeo = new THREE.SphereGeometry(1, 64, 40);
  const membrane = inked(membraneGeo, {
    color: '#b8cf8c', opacity: 0.4, hatch: 0.7, rim: 1, subsurface: 0.9, gloss: 0.6, wobble: 0.012, wobbleFreq: 2.8,
  });
  membrane.mesh.renderOrder = 4;
  plant.add(membrane.group);
  const vacuole = inked(new THREE.SphereGeometry(1, 40, 28), {
    color: '#98c6e3', opacity: 0.36, hatch: 0.4, rim: 0.85, subsurface: 0.95, gloss: 0.7, wobble: 0.014,
  });
  vacuole.mesh.renderOrder = 5;
  plant.add(vacuole.group);
  const nucleus = inked(new THREE.SphereGeometry(0.17, 24, 16), {
    color: '#c7a4c9', outline: 0.012, subsurface: 0.85, gloss: 0.55,
  });
  plant.add(nucleus.group);
  const chloroDirs = Array.from({ length: 8 }, () => new THREE.Vector3(gauss(), gauss() * 0.6, gauss()).normalize());
  const chloros = chloroDirs.map(() => {
    const c = inked(new THREE.SphereGeometry(1, 16, 10), {
      color: '#5f9440', outline: 0.01, subsurface: 0.85, gloss: 0.55,
    });
    c.group.scale.set(0.13, 0.06, 0.085);
    c.group.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
    plant.add(c.group);
    return c.group;
  });
  stage.add(plant);

  // ---------- מולקולות ----------
  const water = inkedInstances(new THREE.IcosahedronGeometry(0.05, 1), WATER_N, { color: '#7fa6cc', hatch: 0.4, outline: 0.012 });
  const solute = inkedInstances(new THREE.IcosahedronGeometry(0.085, 1), SOLUTE_N, { color: '#d98a3d', hatch: 0.7, outline: 0.014 });
  for (let i = 0; i < WATER_N; i++) water.mesh.setColorAt(i, WATER_COLOR);
  for (let i = 0; i < SOLUTE_N; i++) solute.mesh.setColorAt(i, SOLUTE_COLOR);
  stage.add(water.group);
  stage.add(solute.group);

  const wPos = Array.from({ length: WATER_N }, () => new THREE.Vector3());
  const wVel = Array.from({ length: WATER_N }, () => new THREE.Vector3());
  const wIn = new Uint8Array(WATER_N);
  const wHot = new Float32Array(WATER_N);
  const sPos = Array.from({ length: SOLUTE_N }, () => new THREE.Vector3());
  const sVel = Array.from({ length: SOLUTE_N }, () => new THREE.Vector3());
  const sIn = new Uint8Array(SOLUTE_N);
  const sScale = new Float32Array(SOLUTE_N);
  let crossings: Crossing[] = [];
  let fragments: Fragment[] = [];

  // ---------- מצב ----------
  let cell = O.newCell('animal');
  let cOut = O.ISOTONIC;
  let cOutTarget = O.ISOTONIC;
  let mode: 'demo' | 'try' = 'demo';
  let exchangeEvery = 1.1;
  let exchangeT = 0, crossT = 0, hudT = 0;
  let hold = 0, met = false, disposed = false;
  let shapedV = -1, shapedType = '';
  const radii = new THREE.Vector3(1, 0.3, 1);

  function shapeAnimal(V: number) {
    const t = smooth((V - 1) / 0.42);
    const c = clamp01((1 - V) / 0.45);
    const R = 1.05, grow = 1 + 0.22 * t, shrink = 1 - 0.3 * c;
    const p = animalGeo.attributes.position.array as Float32Array;
    for (let i = 0; i < p.length; i += 3) {
      const ux = unit[i], uy = unit[i + 1], uz = unit[i + 2];
      const r2 = ux * ux + uz * uz;
      // צורת הדיסקה הקעורה של תא דם אדום (Evans & Fung, 1972)
      const hd = 0.8 * Math.sqrt(Math.max(0, 1 - r2)) * (0.207 + 2.003 * r2 - 1.123 * r2 * r2);
      const x = lerp(ux * R, ux * 0.95, t);
      const y = lerp(Math.sign(uy) * hd * R, uy * 0.95, t);
      const z = lerp(uz * R, uz * 0.95, t);
      const spike = c > 0
        ? 1 + 0.26 * c * Math.pow(Math.max(0, Math.sin(9 * Math.atan2(uz, ux)) * Math.sin(5 * Math.acos(Math.max(-1, Math.min(1, uy))))), 3)
        : 1;
      const k = grow * shrink * spike;
      p[i] = x * k; p[i + 1] = y * k; p[i + 2] = z * k;
    }
    animalGeo.attributes.position.needsUpdate = true;
    animalGeo.computeVertexNormals();
    const s = grow * shrink * 0.78;
    radii.set(lerp(R, 0.95, t) * s, Math.max(0.2, lerp(0.34, 0.95, t) * s), lerp(R, 0.95, t) * s);
  }

  function shapePlant(V: number) {
    const s = 0.955 - (1 - V) * 0.85;               // 0.955 בטורגור, ~0.62 בפלזמוליזה
    const e = 2 + 2.6 * clamp01((V - 0.6) / 0.4);    // מקופסתי (צמוד לדופן) לעגול
    const p = membraneGeo.attributes.position.array as Float32Array;
    const u = membraneGeo.userData.unit as Float32Array;
    for (let i = 0; i < p.length; i += 3) {
      for (let k = 0; k < 3; k++) {
        const v = u[i + k];
        p[i + k] = Math.sign(v) * Math.pow(Math.abs(v), 2 / e) * PLANT_W.getComponent(k) * s;
      }
    }
    membraneGeo.attributes.position.needsUpdate = true;
    membraneGeo.computeVertexNormals();
    const vs = Math.max(0.05, (s - 0.42) / 0.535);
    vacuole.group.scale.set(PLANT_W.x * 0.62 * vs, PLANT_W.y * 0.62 * vs, PLANT_W.z * 0.62 * vs);
    vacuole.group.position.set(0.12 * s, 0, 0);
    nucleus.group.position.set(-PLANT_W.x * 0.66 * s, 0.12 * s, 0.25 * s);
    chloroDirs.forEach((d, i) => chloros[i].position.set(d.x * PLANT_W.x * 0.8 * s, d.y * PLANT_W.y * 0.75 * s, d.z * PLANT_W.z * 0.8 * s));
    radii.set(PLANT_W.x * s * 0.82, PLANT_W.y * s * 0.8, PLANT_W.z * s * 0.82);
    wallBody.group.scale.setScalar(1 + 0.025 * O.turgor(cell, cOut));
  }
  membraneGeo.userData.unit = (membraneGeo.attributes.position.array as Float32Array).slice();

  function reshape(force = false) {
    if (!force && Math.abs(cell.V - shapedV) < 0.002 && shapedType === cell.type) return;
    shapedV = cell.V; shapedType = cell.type;
    if (cell.type === 'animal') shapeAnimal(cell.V); else shapePlant(cell.V);
  }

  /** ערך q<1 = בתוך האליפסואיד של התא. */
  const q = (p: THREE.Vector3, scale = 1) =>
    (p.x / (radii.x * scale)) ** 2 + (p.y / (radii.y * scale)) ** 2 + (p.z / (radii.z * scale)) ** 2;

  const randomInside = (out: THREE.Vector3) => {
    do out.set((rnd() * 2 - 1) * radii.x, (rnd() * 2 - 1) * radii.y, (rnd() * 2 - 1) * radii.z);
    while (q(out) > 0.8);
    return out;
  };
  const randomOutside = (out: THREE.Vector3) => {
    do out.set((rnd() * 2 - 1) * (X - 0.1), lerp(-Y + 0.1, LIQUID_TOP - 0.1, rnd()), (rnd() * 2 - 1) * (Z - 0.1));
    while (q(out, 1.15) < 1);
    return out;
  };

  function newCell(type: O.CellType) {
    cell = O.newCell(type);
    animal.group.visible = type === 'animal';
    plant.visible = type === 'plant';
    fragments.forEach((f) => stage.root.remove(f.obj));
    fragments = [];
    crossings = [];
    reshape(true);
    for (let i = 0; i < WATER_N; i++) {
      wIn[i] = i < W_IN0 ? 1 : 0;
      wHot[i] = 0;
      if (wIn[i]) randomInside(wPos[i]); else randomOutside(wPos[i]);
      wVel[i].set(gauss(), gauss(), gauss()).multiplyScalar(0.3);
    }
    for (let i = 0; i < SOLUTE_N; i++) {
      sIn[i] = i < SOLUTE_IN ? 1 : 0;
      if (sIn[i]) randomInside(sPos[i]); else randomOutside(sPos[i]);
      sVel[i].set(0, 0, 0);
      sScale[i] = sIn[i] ? 1 : 0;
    }
    hold = 0;
  }

  // ---------- התפוצצות ----------
  function burst() {
    animal.group.visible = false;
    const frag = new THREE.TorusGeometry(0.32, 0.03, 6, 14, 1.3);
    for (let k = 0; k < 14; k++) {
      const f = inked(frag, { color: '#d26a5c', outline: 0.01 });
      const d = new THREE.Vector3(gauss(), gauss() * 0.5, gauss()).normalize();
      f.group.position.copy(d).multiplyScalar(1.0);
      f.group.lookAt(d.clone().multiplyScalar(3));
      stage.add(f.group);
      fragments.push({ obj: f.group, v: d.multiplyScalar(0.9 + rnd() * 0.8), spin: new THREE.Vector3(gauss(), gauss(), gauss()).multiplyScalar(2), life: 2.4 });
    }
    for (let i = 0; i < WATER_N; i++) if (wIn[i]) { wIn[i] = 0; wVel[i].copy(wPos[i]).normalize().multiplyScalar(1.2); }
    for (let i = 0; i < SOLUTE_N; i++) if (sIn[i]) { sIn[i] = 0; sVel[i].copy(sPos[i]).normalize().multiplyScalar(0.9); }
    crossings = [];
    api.say('המוליזה: הקרום נקרע והתוכן של התא נשפך החוצה.');
  }

  // ---------- תנועה ----------
  const tmp = new THREE.Vector3();
  const col = new THREE.Color();
  const m = new THREE.Matrix4();
  function confine(p: THREE.Vector3, v: THREE.Vector3, inside: boolean, r: number) {
    if (!cell.burst || cell.type === 'plant') {
      if (inside) {
        const qq = q(p);
        if (qq > 0.82) { p.multiplyScalar(Math.sqrt(0.82 / qq)); v.multiplyScalar(-0.6); }
      } else {
        const qq = q(p, 1.12);
        if (qq < 1) { p.multiplyScalar(1 / Math.sqrt(Math.max(qq, 1e-4))); v.multiplyScalar(-0.6); }
      }
    }
    if (Math.abs(p.x) > X - r) { p.x = Math.sign(p.x) * (X - r); v.x *= -1; }
    if (Math.abs(p.z) > Z - r) { p.z = Math.sign(p.z) * (Z - r); v.z *= -1; }
    if (p.y < -Y + r) { p.y = -Y + r; v.y *= -1; }
    if (p.y > LIQUID_TOP - r) { p.y = LIQUID_TOP - r; v.y *= -1; }
  }

  function startCrossing(i: number, inward: boolean) {
    const from = wPos[i].clone();
    const dir = tmp.set(from.x / radii.x, from.y / radii.y, from.z / radii.z);
    if (dir.lengthSq() < 1e-6) dir.set(1, 0, 0);
    dir.normalize();
    const f = inward ? 0.55 : 1.32;
    const to = new THREE.Vector3(dir.x * radii.x * f, dir.y * radii.y * f, dir.z * radii.z * f);
    wIn[i] = inward ? 1 : 0;
    wHot[i] = 1;
    crossings.push({ i, from, to, t: 0 });
  }
  const crossingSet = () => new Set(crossings.map((c) => c.i));

  function pickWater(inside: boolean, busy: Set<number>) {
    let best = -1, bestQ = Infinity;
    for (let k = 0; k < 24; k++) {
      const i = Math.floor(rnd() * WATER_N);
      if (busy.has(i) || wIn[i] !== (inside ? 1 : 0)) continue;
      const qq = inside ? -q(wPos[i]) : q(wPos[i]);
      if (qq < bestQ) { bestQ = qq; best = i; }
    }
    return best;
  }

  stage.onTick((dt) => {
    if (disposed || dt <= 0) return;
    const dc = cOutTarget - cOut;
    cOut += Math.sign(dc) * Math.min(Math.abs(dc), 1.6 * dt);

    const wasBurst = cell.burst;
    cell = O.step(cell, cOut, dt);
    if (cell.burst && !wasBurst) burst();
    if (!cell.burst) reshape();

    const busy = crossingSet();
    if (!cell.burst) {
      crossT += dt;
      if (crossT > 0.07) {
        crossT = 0;
        let inside = 0;
        for (let i = 0; i < WATER_N; i++) inside += wIn[i];
        const target = Math.round(W_IN0 * cell.V);
        if (inside < target) { const i = pickWater(false, busy); if (i >= 0) startCrossing(i, true); }
        else if (inside > target) { const i = pickWater(true, busy); if (i >= 0) startCrossing(i, false); }
      }
      exchangeT += dt;
      if (exchangeT > exchangeEvery) {
        exchangeT = 0;
        const a = pickWater(false, busy), b = pickWater(true, busy);
        if (a >= 0 && b >= 0) { startCrossing(a, true); startCrossing(b, false); }
      }
    }

    for (const c of crossings) {
      c.t = Math.min(1, c.t + dt / 0.75);
      wPos[c.i].lerpVectors(c.from, c.to, smooth(c.t));
    }
    crossings = crossings.filter((c) => c.t < 1);
    const moving = crossingSet();

    for (let i = 0; i < WATER_N; i++) {
      if (!moving.has(i)) {
        const v = wVel[i];
        v.x += gauss() * 2.2 * dt; v.y += gauss() * 2.2 * dt; v.z += gauss() * 2.2 * dt;
        v.multiplyScalar(Math.pow(0.35, dt));
        wPos[i].addScaledVector(v, dt);
        confine(wPos[i], v, wIn[i] === 1, 0.06);
      }
      wHot[i] = Math.max(0, wHot[i] - dt * 0.9);
      m.makeTranslation(wPos[i].x, wPos[i].y, wPos[i].z);
      water.mesh.setMatrixAt(i, m);
      water.mesh.setColorAt(i, col.lerpColors(WATER_COLOR, WATER_HOT, Math.min(1, wHot[i] * 1.5)));
    }
    water.mesh.instanceMatrix.needsUpdate = true;
    water.mesh.instanceColor!.needsUpdate = true;

    const nOut = Math.round((cOut / 3) * SOLUTE_OUT_MAX);
    let outIdx = 0;
    for (let i = 0; i < SOLUTE_N; i++) {
      let target = 1;
      if (i >= SOLUTE_IN) { target = outIdx < nOut ? 1 : 0; outIdx++; }
      sScale[i] += (target - sScale[i]) * Math.min(1, dt * 4);
      const v = sVel[i];
      v.x += gauss() * 1.2 * dt; v.y += gauss() * 1.2 * dt; v.z += gauss() * 1.2 * dt;
      v.multiplyScalar(Math.pow(0.3, dt));
      sPos[i].addScaledVector(v, dt);
      confine(sPos[i], v, sIn[i] === 1, 0.09);
      const s = Math.max(0.0001, sScale[i]);
      m.makeScale(s, s, s).setPosition(sPos[i]);
      solute.mesh.setMatrixAt(i, m);
    }
    solute.mesh.instanceMatrix.needsUpdate = true;

    for (const f of fragments) {
      f.life -= dt;
      f.obj.position.addScaledVector(f.v, dt);
      f.v.multiplyScalar(Math.pow(0.4, dt));
      f.obj.rotation.x += f.spin.x * dt; f.obj.rotation.y += f.spin.y * dt;
      f.obj.scale.setScalar(Math.max(0.001, Math.min(1, f.life)));
    }
    fragments = fragments.filter((f) => { if (f.life > 0) return true; stage.root.remove(f.obj); return false; });

    if (mode === 'try' && !met) {
      const ok = cell.type === 'animal' && !cell.burst && Math.abs(cell.V - 1) < 0.03 && Math.abs(cOut - O.ISOTONIC) <= 0.06;
      hold = ok ? hold + dt : Math.max(0, hold - dt * 2);
      if (hold >= 3) { met = true; api.challengeMet(); }
    }

    hudT += dt;
    if (hudT > 0.1) { hudT = 0; hud(); }
  });

  // ---------- מדדים ----------
  api.jars.add('in', 'מומס בתוך התא', '#e9a865');
  api.jars.add('out', 'מומס בתמיסה', '#e9a865');
  api.jars.add('vol', 'נפח התא', '#9cc0de');
  const badge = document.createElement('div');
  badge.className = 'badge';
  const status = document.createElement('div');
  status.className = 'badge badge-status';
  api.overlay.append(badge, status);

  function hud() {
    const ton = O.tonicity(cOut);
    badge.innerHTML = `התמיסה <b>${O.TONICITY_HE[ton]}</b> · <bdi>${cOut.toFixed(2)}%</bdi> מלח`;
    badge.dataset.ton = ton;
    let s = '';
    if (cell.burst) s = 'המוליזה: הקרום נקרע';
    else if (cell.type === 'animal') s = cell.V > 1.08 ? 'התא מתנפח' : cell.V < 0.92 ? 'התא מתכווץ' : 'נפח רגיל';
    else s = cell.V < 0.97 ? 'פלזמוליזה: הקרום מתרחק מהדופן' : O.turgor(cell, cOut) > 0.05 ? 'טורגור: התא לוחץ על הדופן' : 'נפח רגיל';
    if (mode === 'try' && !met && hold > 0.05) s += ` · יציב <bdi>${hold.toFixed(1)}/3</bdi> שנ׳`;
    status.innerHTML = s;
    status.dataset.state = cell.burst ? 'burst' : '';
    const ci = O.cIn(cell.V);
    api.jars.set('in', cell.burst ? 0 : ci / 2, cell.burst ? '—' : `${ci.toFixed(2)}%`);
    api.jars.set('out', cOut / 2, `${cOut.toFixed(2)}%`);
    api.jars.set('vol', cell.burst ? 0 : cell.V / 1.5, cell.burst ? 'נקרע' : `${Math.round(cell.V * 100)}%`);
  }

  // ---------- פקדים של "נסה בעצמך" ----------
  api.controls.innerHTML = `
    <div class="seg" role="group" aria-label="סוג התא">
      <button type="button" data-type="animal" aria-pressed="true">תא דם אדום</button>
      <button type="button" data-type="plant" aria-pressed="false">תא צמח</button>
    </div>
    <label class="slider">
      <span>ריכוז המלח בתמיסה</span>
      <input type="range" min="0" max="3" step="0.05" value="2">
      <output><bdi>2.00%</bdi></output>
    </label>
    <button type="button" class="btn" data-act="new">תא חדש</button>`;
  const range = api.controls.querySelector('input')!;
  const out = api.controls.querySelector('output')!;
  const segBtns = [...api.controls.querySelectorAll<HTMLButtonElement>('.seg button')];
  range.addEventListener('input', () => {
    cOut = cOutTarget = parseFloat(range.value);
    out.innerHTML = `<bdi>${cOutTarget.toFixed(2)}%</bdi>`;
  });
  segBtns.forEach((b) => b.addEventListener('click', () => {
    segBtns.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    newCell(b.dataset.type as O.CellType);
  }));
  api.controls.querySelector('[data-act=new]')!.addEventListener('click', () => newCell(cell.type));

  const setRange = (v: number) => { range.value = String(v); out.innerHTML = `<bdi>${v.toFixed(2)}%</bdi>`; };

  async function until(cond: () => boolean, maxMs: number) {
    let t = 0;
    while (!disposed && !cond() && t < maxMs) { await stage.wait(100); t += 100; }
  }

  newCell('animal');
  hud();

  return {
    async playStep(i) {
      mode = 'demo';
      stage.controls.enabled = false;
      switch (i) {
        case 0:
          stage.focusOn([0, 2.5, 6.4], [0, 0, 0]);
          newCell('animal'); cOut = cOutTarget = O.ISOTONIC; exchangeEvery = 1.1;
          await stage.wait(4200);
          break;
        case 1:
          stage.focusOn([0.4, 1.8, 4.9], [0, 0, 0]);
          if (cell.burst) newCell('animal');
          cOut = cOutTarget = O.ISOTONIC; exchangeEvery = 0.22;
          await stage.wait(5000);
          exchangeEvery = 1.1;
          break;
        case 2:
          stage.focusOn([0, 2.1, 5.5], [0, 0, 0]);
          if (cell.burst || cell.V < 0.95) newCell('animal');
          cOutTarget = 0;
          await until(() => cell.V > 1.3 || cell.burst, 6000);
          break;
        case 3:
          stage.focusOn([0, 2.2, 5.8], [0, 0, 0]);
          cOutTarget = 0;
          await until(() => cell.burst, 5000);
          await stage.wait(2600);
          break;
        case 4:
          stage.focusOn([-0.4, 2.1, 5.5], [0, 0, 0]);
          newCell('animal'); cOut = O.ISOTONIC; cOutTarget = 2.5;
          await stage.wait(5200);
          break;
      }
    },
    enterTry() {
      mode = 'try';
      exchangeEvery = 1.1;
      stage.focusOn([0, 2.5, 6.6], [0, 0, 0]);
      segBtns.forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.type === 'animal')));
      newCell('animal');
      cOut = cOutTarget = 2.0;
      setRange(2.0);
      stage.controls.enabled = true;
    },
    enterDemo() {
      mode = 'demo';
      stage.controls.enabled = false;
      stage.focusOn([0, 2.5, 6.4], [0, 0, 0]);
      newCell('animal');
      cOut = cOutTarget = O.ISOTONIC;
    },
    dispose() {
      disposed = true;
      badge.remove(); status.remove();
    },
  };
};

export default factory;

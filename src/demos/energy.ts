/**
 * שיעור 11: אנרגיה בתא – מיטוכונדריה וכלורופלסט.
 * מחזור החומרים והאנרגיה בין כלורופלסט (פוטוסינתזה באור) לבין מיטוכונדריה (נשימה תאית).
 */
import * as THREE from 'three';
import type { DemoFactory } from './types';
import { inked, sketchLines } from '../render/ink';

const factory: DemoFactory = (api) => {
  const { stage } = api;
  stage.camera.position.set(0, 2.2, 6.4);
  stage.setShadow(-1.45, 5.6, 3.0);

  // ימין: כלורופלסט (ירוק, עם דיסקיות תילקואידים)
  const chloro = new THREE.Group();
  chloro.position.set(1.4, 0, 0);
  const cShell = inked(new THREE.SphereGeometry(0.95, 28, 20), { color: '#6f9a45', opacity: 0.42, rim: 0.9 });
  cShell.group.scale.set(1.2, 0.72, 0.85);
  chloro.add(cShell.group);
  for (let s = -1; s <= 1; s++) {
    const stack = inked(new THREE.CylinderGeometry(0.22, 0.22, 0.42, 16), { color: '#4c7a2b', outline: 0.012 });
    stack.group.position.set(s * 0.42, 0, 0);
    chloro.add(stack.group);
  }
  stage.add(chloro);

  // שמאל: מיטוכונדריה (כתומה, עם קפלי קריסטה)
  const mito = new THREE.Group();
  mito.position.set(-1.4, 0, 0);
  const mShell = inked(new THREE.CapsuleGeometry(0.55, 0.75, 16, 24), { color: '#d98a3d', opacity: 0.45, rim: 0.9 });
  mShell.group.rotation.z = Math.PI / 2;
  const cristae = inked(new THREE.TorusKnotGeometry(0.32, 0.05, 48, 8, 2, 3), { color: '#9a3b2a', outline: 0.01 });
  mito.add(mShell.group, cristae.group);
  stage.add(mito);

  // קשתות זרימה: למעלה גלוקוז + חמצן מהכלורופלסט למיטוכונדריה; למטה CO₂ + מים בכיוון ההפוך
  const topArc: number[] = [];
  const botArc: number[] = [];
  for (let i = 0; i < 32; i++) {
    const u0 = i / 32, u1 = (i + 1) / 32;
    const x0 = 1.1 - u0 * 2.2, x1 = 1.1 - u1 * 2.2;
    topArc.push(x0, Math.sin(u0 * Math.PI) * 0.85 + 0.25, 0, x1, Math.sin(u1 * Math.PI) * 0.85 + 0.25, 0);
    botArc.push(-x0, -Math.sin(u0 * Math.PI) * 0.85 - 0.25, 0, -x1, -Math.sin(u1 * Math.PI) * 0.85 - 0.25, 0);
  }
  stage.add(sketchLines(topArc, 0.01, '#4c7a2b'));
  stage.add(sketchLines(botArc, 0.01, '#6fa3c7'));

  const glucOrb = inked(new THREE.SphereGeometry(0.15, 16, 12), { color: '#e6b86a', outline: 0.012 });
  const co2Orb = inked(new THREE.SphereGeometry(0.14, 16, 12), { color: '#7fa6cc', outline: 0.012 });
  stage.add(glucOrb.group, co2Orb.group);

  let light = 0.7;   // עוצמת אור (0..1)
  let o2 = 0.65;
  let glucose = 0.65;
  let atp = 0.55;
  let flowT = 0;
  let met = false, disposed = false;

  api.jars.add('gluc', 'גלוקוז', '#e9a865');
  api.jars.add('o2', 'חמצן (O₂)', '#9cc0de');
  api.jars.add('atp', 'אנרגיה (ATP)', '#d97a6c');

  const badge = document.createElement('div');
  badge.className = 'badge';
  const status = document.createElement('div');
  status.className = 'badge badge-status';
  api.overlay.append(badge, status);

  function updateHud() {
    badge.innerHTML = `אור: <b><bdi>${Math.round(light * 100)}%</bdi></b> · ימין: כלורופלסט · שמאל: מיטוכונדריה`;
    status.innerHTML = light < 0.1
      ? 'חושך: אין פוטוסינתזה – הצמח רק צורך חמצן ומפיק ATP בנשימה תאית'
      : `פוטוסינתזה מייצרת גלוקוז וחמצן · נשימה תאית מפיקה ATP (<bdi>${Math.round(atp * 100)}%</bdi>)`;
    api.jars.set('gluc', glucose, `${Math.round(glucose * 100)}%`);
    api.jars.set('o2', o2, `${Math.round(o2 * 100)}%`);
    api.jars.set('atp', atp, `${Math.round(atp * 100)}%`);
  }

  stage.onTick((dt) => {
    if (disposed || dt <= 0) return;
    // פוטוסינתזה תלויה באור; נשימה תאית פועלת תמיד כשיש גלוקוז וחמצן
    const photo = light * 0.22;
    const resp = Math.min(glucose, o2) * 0.16;
    glucose = Math.max(0.08, Math.min(1, glucose + (photo - resp * 0.7) * dt));
    o2 = Math.max(0.08, Math.min(1, o2 + (photo - resp * 0.65) * dt));
    atp = Math.max(0.1, Math.min(1, atp + (resp * 1.35 - 0.08) * dt));

    flowT = (flowT + dt * (0.25 + photo * 2)) % 1;
    glucOrb.group.visible = light > 0.08;
    glucOrb.group.position.set(1.1 - flowT * 2.2, Math.sin(flowT * Math.PI) * 0.85 + 0.25, 0);
    co2Orb.group.position.set(-1.1 + flowT * 2.2, -Math.sin(flowT * Math.PI) * 0.85 - 0.25, 0);

    if (!met && atp >= 0.8 && o2 >= 0.5) {
      met = true;
      api.challengeMet();
    }
    updateHud();
  });

  api.controls.innerHTML = `
    <label class="slider" style="flex:1 1 240px">
      <span>עוצמת האור</span>
      <input type="range" min="0" max="1" step="0.05" value="0.3">
      <output><bdi>30%</bdi></output>
    </label>
    <button type="button" class="btn" data-act="dark">חושך מוחלט</button>
    <button type="button" class="btn btn-rust" data-act="sun">אור שמש מלא</button>`;

  const range = api.controls.querySelector('input')!;
  const out = api.controls.querySelector('output')!;
  const setLight = (v: number) => {
    light = v;
    range.value = String(v);
    out.innerHTML = `<bdi>${Math.round(v * 100)}%</bdi>`;
    updateHud();
  };
  range.addEventListener('input', () => setLight(parseFloat(range.value)));
  api.controls.querySelector('[data-act=dark]')!.addEventListener('click', () => setLight(0));
  api.controls.querySelector('[data-act=sun]')!.addEventListener('click', () => setLight(1));

  updateHud();

  return {
    async playStep(i) {
      stage.controls.enabled = false;
      light = i >= 2 ? 0.9 : 0.3;
      await stage.wait(3000);
    },
    enterTry() {
      stage.controls.enabled = true;
      o2 = 0.45; glucose = 0.5; atp = 0.45;
      setLight(0.3);
    },
    enterDemo() {
      stage.controls.enabled = false;
      setLight(0.7);
    },
    dispose() {
      disposed = true;
      badge.remove();
      status.remove();
    },
  };
};

export default factory;

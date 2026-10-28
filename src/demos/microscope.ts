/**
 * שיעור 2: המיקרוסקופ ותורת התא.
 * מיקרוסקופ תלת-ממדי לצד עינית חיה שבה רואים קליפת בצל (או תאי לחי)
 * בהגדלות ×40 / ×100 / ×400, עם מיקוד וצביעת יוד.
 */
import * as THREE from 'three';
import type { DemoFactory } from './types';
import { inked, sketchLines } from '../render/ink';
import { totalMagnification } from '../sim/models';

const factory: DemoFactory = (api) => {
  const { stage } = api;
  stage.camera.position.set(0, 2.1, 6.4);
  stage.setShadow(-1.45, 5.2, 3.0);

  // מיקרוסקופ תלת-ממדי בצד ימין, ושדה ראייה עגול בצד שמאל
  const scope = new THREE.Group();
  scope.position.x = 1.35;
  const base = inked(new THREE.BoxGeometry(1.3, 0.22, 1.5), { color: '#4a5568', outline: 0.02 });
  base.group.position.y = -1.25;
  const arm = inked(new THREE.CylinderGeometry(0.14, 0.18, 2.1, 16), { color: '#d8cfc0', outline: 0.02 });
  arm.group.position.set(0.42, -0.2, -0.25);
  arm.group.rotation.z = 0.18;
  const stagePlate = inked(new THREE.BoxGeometry(1.15, 0.09, 1.15), { color: '#2d3748', outline: 0.018 });
  stagePlate.group.position.set(-0.05, -0.35, 0);
  const slide = inked(new THREE.BoxGeometry(0.85, 0.03, 0.32), { color: '#b9cfe0', opacity: 0.55, rim: 0.9 });
  slide.group.position.set(-0.05, -0.28, 0);
  const tube = inked(new THREE.CylinderGeometry(0.16, 0.16, 0.95, 20), { color: '#e6decb', outline: 0.02 });
  tube.group.position.set(-0.08, 0.85, 0);
  tube.group.rotation.z = -0.22;
  const turret = new THREE.Group();
  turret.position.set(-0.05, 0.25, 0);
  const objColors = ['#d98a3d', '#6fa3c7', '#9a3b2a'];
  [0, 1, 2].forEach((k) => {
    const a = (k / 3) * Math.PI * 2;
    const lens = inked(new THREE.CylinderGeometry(0.07, 0.055, 0.28 + k * 0.08, 14), { color: objColors[k], outline: 0.015 });
    lens.group.position.set(Math.sin(a) * 0.2, -0.16, Math.cos(a) * 0.2);
    turret.add(lens.group);
  });
  const knob = inked(new THREE.CylinderGeometry(0.2, 0.2, 0.14, 20), { color: '#9a3b2a', outline: 0.015 });
  knob.group.rotation.x = Math.PI / 2;
  knob.group.position.set(0.42, -0.55, 0);
  scope.add(base.group, arm.group, stagePlate.group, slide.group, tube.group, turret, knob.group);
  stage.add(scope);

  // שדה ראייה עגול של תאי בצל בצד שמאל
  const field = new THREE.Group();
  field.position.set(-1.15, 0.05, 0);
  const rim = inked(new THREE.TorusGeometry(1.32, 0.06, 14, 48), { color: '#1c2433', outline: 0.01 });
  field.add(rim.group);

  const cellsGroup = new THREE.Group();
  const nuclei: THREE.Mesh[] = [];
  const walls: THREE.Mesh[] = [];
  for (let row = -2; row <= 2; row++) {
    for (let col = -2; col <= 2; col++) {
      const cx = col * 0.56 + (row % 2) * 0.26;
      const cy = row * 0.36;
      if (cx * cx + cy * cy > 1.15 * 1.15) continue;
      const cell = inked(new THREE.BoxGeometry(0.5, 0.31, 0.06), { color: '#dce6c7', opacity: 0.75, rim: 0.9 });
      cell.group.position.set(cx, cy, 0);
      walls.push(cell.mesh);
      const nuc = inked(new THREE.SphereGeometry(0.065, 16, 12), { color: '#c48f65', opacity: 0.2, rim: 0.5 });
      nuc.group.position.set(cx + 0.05, cy, 0.04);
      nuclei.push(nuc.mesh);
      cellsGroup.add(cell.group, nuc.group);
    }
  }
  field.add(cellsGroup);
  field.add(sketchLines([-1.1, -1.15, 0.1, -0.3, -1.15, 0.1], 0.008, '#9a3b2a'));
  stage.add(field);

  let objective: 4 | 10 | 40 = 4;
  let focus = 0.35; // חד ב-0.50
  let stained = false;
  let met = false, disposed = false;

  api.jars.add('mag', 'הגדלה כוללת', '#9cc0de');
  api.jars.add('sharp', 'חדות תמונה', '#9ab89e');
  api.jars.add('stain', 'ניגודיות (צבען)', '#d98a3d');

  const badge = document.createElement('div');
  badge.className = 'badge';
  const status = document.createElement('div');
  status.className = 'badge badge-status';
  api.overlay.append(badge, status);

  function sharpness() {
    return Math.max(0, 1 - Math.abs(focus - 0.5) * 3.2);
  }

  function syncVisuals() {
    const mag = totalMagnification(10, objective);
    const scale = objective === 4 ? 0.85 : objective === 10 ? 1.35 : 2.15;
    cellsGroup.scale.setScalar(scale);
    const sh = sharpness();
    // טשטוש מדומה כשלא ממוקדים
    stageBoxFilter(1 - sh);
    nuclei.forEach((m) => {
      const mat = m.material as THREE.ShaderMaterial;
      mat.uniforms.uOpacity.value = stained ? 0.92 : 0.18;
      mat.uniforms.uColor.value.set(stained ? '#9a3b2a' : '#cbb89d');
    });
    walls.forEach((m) => {
      const mat = m.material as THREE.ShaderMaterial;
      mat.uniforms.uColor.value.set(stained ? '#edd6a4' : '#dce6c7');
    });
    const idx = objective === 4 ? 0 : objective === 10 ? 1 : 2;
    turret.rotation.y = (-idx / 3) * Math.PI * 2;
    knob.group.rotation.z = focus * Math.PI * 4;
    const cellUm = 60;
    badge.innerHTML = `הגדלה: <bdi>×10 × ×${objective} = ×${mag}</bdi> · תא בצל (<bdi>${cellUm} µm</bdi>)`;
    status.innerHTML = sh > 0.88
      ? (stained ? 'ממוקד וצבוע ביוד – הגרעין ברור!' : 'התמונה חדה · הוסף צבען כדי להבליט את הגרעין')
      : 'התמונה מטושטשת – סובב את בורג המיקוד';
    api.jars.set('mag', mag / 400, `×${mag}`);
    api.jars.set('sharp', sh, `${Math.round(sh * 100)}%`);
    api.jars.set('stain', stained ? 1 : 0.2, stained ? 'יוד פעיל' : 'ללא צבען');

    if (!met && objective === 40 && sh > 0.88 && stained) {
      met = true;
      api.challengeMet();
    }
  }

  function stageBoxFilter(_blur: number) {
    // משנה מעט את פישוט העומק כדי להמחיש חוסר מיקוד בתלת-ממד
    cellsGroup.position.z = (focus - 0.5) * 0.55;
  }

  stage.onTick((dt) => {
    if (disposed || dt <= 0) return;
    syncVisuals();
  });

  api.controls.innerHTML = `
    <div class="seg" role="group" aria-label="עצמית">
      <button type="button" data-obj="4" aria-pressed="true">עצמית ×4</button>
      <button type="button" data-obj="10" aria-pressed="false">עצמית ×10</button>
      <button type="button" data-obj="40" aria-pressed="false">עצמית ×40</button>
    </div>
    <label class="slider">
      <span>בורג מיקוד</span>
      <input type="range" min="0" max="1" step="0.02" value="0.2">
      <output><bdi>20%</bdi></output>
    </label>
    <button type="button" class="btn" data-act="stain" aria-pressed="false">הוסף טיפת יוד</button>`;

  const objBtns = [...api.controls.querySelectorAll<HTMLButtonElement>('[data-obj]')];
  const focusInput = api.controls.querySelector<HTMLInputElement>('input[type=range]')!;
  const focusOut = api.controls.querySelector('output')!;
  const stainBtn = api.controls.querySelector<HTMLButtonElement>('[data-act=stain]')!;

  objBtns.forEach((b) => b.addEventListener('click', () => {
    objective = Number(b.dataset.obj) as 4 | 10 | 40;
    objBtns.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    syncVisuals();
  }));
  focusInput.addEventListener('input', () => {
    focus = parseFloat(focusInput.value);
    focusOut.innerHTML = `<bdi>${Math.round(sharpness() * 100)}%</bdi>`;
    syncVisuals();
  });
  stainBtn.addEventListener('click', () => {
    stained = !stained;
    stainBtn.setAttribute('aria-pressed', String(stained));
    stainBtn.textContent = stained ? 'צבוע ביוד ✓' : 'הוסף טיפת יוד';
    syncVisuals();
  });

  syncVisuals();

  return {
    async playStep(i) {
      stage.controls.enabled = false;
      if (i === 0 || i === 1) { objective = 4; focus = 0.22; stained = false; }
      else if (i === 2) { objective = 4; focus = 0.5; stained = false; }
      else if (i === 3) { objective = 10; focus = 0.5; stained = true; }
      else { objective = 40; focus = 0.5; stained = true; }
      await stage.wait(3000);
    },
    enterTry() {
      stage.controls.enabled = true;
      objective = 4; focus = 0.2; stained = false;
      focusInput.value = '0.2';
      objBtns.forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.obj === '4')));
      stainBtn.setAttribute('aria-pressed', 'false');
      stainBtn.textContent = 'הוסף טיפת יוד';
      syncVisuals();
    },
    enterDemo() {
      stage.controls.enabled = false;
      objective = 4; focus = 0.35; stained = false;
      syncVisuals();
    },
    dispose() {
      disposed = true;
      badge.remove();
      status.remove();
    },
  };
};

export default factory;

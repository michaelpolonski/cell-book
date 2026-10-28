/**
 * שיעור 2: המיקרוסקופ ותורת התא.
 * מיקרוסקופ אור תלת-ממדי עם תנועת מצלמה קולנועית בין גוף המיקרוסקופ לבין שדה הראייה:
 * תאי אפידרמיס של בצל עם זרימה ציטופלזמית (ציקלוזיס), חלולית וגרעין שנצבע ביוד בהדרגה.
 */
import * as THREE from 'three';
import type { DemoFactory } from './types';
import { inked, sketchLines, SpringScalar } from '../render/ink';
import { totalMagnification } from '../sim/models';

const factory: DemoFactory = (api) => {
  const { stage } = api;
  stage.focusOn([0, 2.0, 6.2], [0, 0, 0], true);
  stage.setShadow(-1.45, 5.2, 3.0);

  // מיקרוסקופ תלת-ממדי בצד ימין
  const scope = new THREE.Group();
  scope.position.x = 1.38;
  const base = inked(new THREE.BoxGeometry(1.3, 0.22, 1.5), { color: '#4a5568', outline: 0.02, wobble: 0 });
  base.group.position.y = -1.25;
  const arm = inked(new THREE.CylinderGeometry(0.14, 0.18, 2.1, 16), { color: '#d8cfc0', outline: 0.02, wobble: 0 });
  arm.group.position.set(0.42, -0.2, -0.25);
  arm.group.rotation.z = 0.18;
  const lampGlow = inked(new THREE.ConeGeometry(0.42, 0.9, 20), { color: '#f7df8b', opacity: 0.25, rim: 0.4, wobble: 0.01 });
  lampGlow.group.position.set(-0.05, -0.8, 0);
  const stagePlate = inked(new THREE.BoxGeometry(1.15, 0.09, 1.15), { color: '#2d3748', outline: 0.018, wobble: 0 });
  stagePlate.group.position.set(-0.05, -0.35, 0);
  const slide = inked(new THREE.BoxGeometry(0.85, 0.03, 0.32), { color: '#b9cfe0', opacity: 0.55, rim: 0.9, wobble: 0 });
  slide.group.position.set(-0.05, -0.28, 0);
  const tube = inked(new THREE.CylinderGeometry(0.16, 0.16, 0.95, 20), { color: '#e6decb', outline: 0.02, wobble: 0 });
  tube.group.position.set(-0.08, 0.85, 0);
  tube.group.rotation.z = -0.22;
  const turret = new THREE.Group();
  turret.position.set(-0.05, 0.25, 0);
  const objColors = ['#d98a3d', '#6fa3c7', '#9a3b2a'];
  [0, 1, 2].forEach((k) => {
    const a = (k / 3) * Math.PI * 2;
    const lens = inked(new THREE.CylinderGeometry(0.07, 0.055, 0.28 + k * 0.08, 14), { color: objColors[k], outline: 0.015, wobble: 0 });
    lens.group.position.set(Math.sin(a) * 0.2, -0.16, Math.cos(a) * 0.2);
    turret.add(lens.group);
  });
  const knob = inked(new THREE.CylinderGeometry(0.2, 0.2, 0.14, 20), { color: '#9a3b2a', outline: 0.015, wobble: 0 });
  knob.group.rotation.x = Math.PI / 2;
  knob.group.position.set(0.42, -0.55, 0);
  scope.add(base.group, arm.group, lampGlow.group, stagePlate.group, slide.group, tube.group, turret, knob.group);
  stage.add(scope);

  // שדה ראייה עגול בצד שמאל עם זרימה ציטופלזמית (ציקלוזיס) בתוך תאי הבצל
  const field = new THREE.Group();
  field.position.set(-1.12, 0.05, 0);
  const lightDisc = inked(new THREE.CylinderGeometry(1.3, 1.3, 0.02, 48), { color: '#fbf5e4', opacity: 0.65, wobble: 0 });
  lightDisc.group.rotation.x = Math.PI / 2;
  lightDisc.group.position.z = -0.08;
  const rim = inked(new THREE.TorusGeometry(1.32, 0.065, 16, 52), { color: '#1c2433', outline: 0.01, wobble: 0 });
  field.add(lightDisc.group, rim.group);

  const cellsGroup = new THREE.Group();
  const nuclei: THREE.Mesh[] = [];
  const walls: THREE.Mesh[] = [];
  const granules: { obj: THREE.Object3D; cx: number; cy: number; phase: number }[] = [];

  for (let row = -2; row <= 2; row++) {
    for (let col = -2; col <= 2; col++) {
      const cx = col * 0.56 + (row % 2) * 0.26;
      const cy = row * 0.36;
      if (cx * cx + cy * cy > 1.12 * 1.12) continue;
      const cell = inked(new THREE.BoxGeometry(0.5, 0.31, 0.06), { color: '#dce6c7', opacity: 0.72, rim: 0.9, wobble: 0.006 });
      cell.group.position.set(cx, cy, 0);
      walls.push(cell.mesh);
      const nuc = inked(new THREE.SphereGeometry(0.068, 18, 14), { color: '#c48f65', opacity: 0.22, rim: 0.6, wobble: 0.015 });
      nuc.group.position.set(cx + 0.06, cy + 0.02, 0.04);
      nuclei.push(nuc.mesh);
      cellsGroup.add(cell.group, nuc.group);

      // גרגירים שנעים בזרם ציטופלזמי לאורך דפנות התא
      for (let g = 0; g < 2; g++) {
        const dot = inked(new THREE.SphereGeometry(0.022, 10, 8), { color: '#5f8a48', outline: 0.005 });
        cellsGroup.add(dot.group);
        granules.push({ obj: dot.group, cx, cy, phase: (row * 3 + col + g * 1.7) });
      }
    }
  }
  field.add(cellsGroup);
  field.add(sketchLines([-1.1, -1.15, 0.1, -0.3, -1.15, 0.1], 0.008, '#9a3b2a'));
  stage.add(field);

  let objective: 4 | 10 | 40 = 4;
  let focus = 0.35; // חד ב-0.50
  let stained = false;
  const scaleSpring = new SpringScalar(0.85, 0.85, 16, 6.0);
  const turretSpring = new SpringScalar(0, 0, 14, 5.5);
  const stainSpring = new SpringScalar(0, 0, 8, 4.5);
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

  function updateTargets() {
    scaleSpring.target = objective === 4 ? 0.85 : objective === 10 ? 1.35 : 2.18;
    const idx = objective === 4 ? 0 : objective === 10 ? 1 : 2;
    turretSpring.target = (-idx / 3) * Math.PI * 2;
    stainSpring.target = stained ? 1 : 0;

    const mag = totalMagnification(10, objective);
    const sh = sharpness();
    badge.innerHTML = `הגדלה: <bdi>×10 × ×${objective} = ×${mag}</bdi> · תא בצל (<bdi>60 µm</bdi>)`;
    status.innerHTML = sh > 0.88
      ? (stained ? 'ממוקד וצבוע ביוד – הגרעין והזרם הציטופלזמי ברורים!' : 'התמונה חדה · הוסף צבען כדי להבליט את הגרעין')
      : 'התמונה מטושטשת – סובב את בורג המיקוד';
    api.jars.set('mag', mag / 400, `×${mag}`);
    api.jars.set('sharp', sh, `${Math.round(sh * 100)}%`);
    api.jars.set('stain', stained ? 1 : 0.2, stained ? 'יוד פעיל' : 'ללא צבען');

    if (!met && objective === 40 && sh > 0.88 && stained) {
      met = true;
      api.challengeMet();
    }
  }

  stage.onTick((dt, t) => {
    if (disposed || dt <= 0) return;
    const s = scaleSpring.step(Math.min(0.05, dt));
    const tr = turretSpring.step(Math.min(0.05, dt));
    const st = stainSpring.step(Math.min(0.05, dt));

    cellsGroup.scale.setScalar(s);
    cellsGroup.position.z = (focus - 0.5) * 0.55;
    turret.rotation.y = tr;
    knob.group.rotation.z = focus * Math.PI * 4;
    stagePlate.group.position.y = -0.35 + (focus - 0.5) * 0.14;
    slide.group.position.y = stagePlate.group.position.y + 0.07;

    const nucColor = new THREE.Color('#cbb89d').lerp(new THREE.Color('#9a3b2a'), st);
    const wallColor = new THREE.Color('#dce6c7').lerp(new THREE.Color('#edd6a4'), st);
    nuclei.forEach((m) => {
      const mat = m.material as THREE.ShaderMaterial;
      mat.uniforms.uOpacity.value = 0.18 + st * 0.76;
      mat.uniforms.uColor.value.copy(nucColor);
    });
    walls.forEach((m) => {
      const mat = m.material as THREE.ShaderMaterial;
      mat.uniforms.uColor.value.copy(wallColor);
    });

    // תנועת ציקלוזיס של הגרגירים סביב דפנות כל תא
    for (const gr of granules) {
      const u = t * 0.85 + gr.phase;
      gr.obj.position.set(gr.cx + Math.cos(u) * 0.19, gr.cy + Math.sin(u) * 0.11, 0.035);
    }
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
    updateTargets();
  }));
  focusInput.addEventListener('input', () => {
    focus = parseFloat(focusInput.value);
    focusOut.innerHTML = `<bdi>${Math.round(sharpness() * 100)}%</bdi>`;
    updateTargets();
  });
  stainBtn.addEventListener('click', () => {
    stained = !stained;
    stainBtn.setAttribute('aria-pressed', String(stained));
    stainBtn.textContent = stained ? 'צבוע ביוד ✓' : 'הוסף טיפת יוד';
    updateTargets();
  });

  updateTargets();

  return {
    async playStep(i) {
      stage.controls.enabled = false;
      if (i === 0) {
        objective = 4; focus = 0.22; stained = false;
        stage.focusOn([1.1, 1.8, 5.2], [0.8, -0.1, 0]);
      } else if (i === 1) {
        objective = 4; focus = 0.22; stained = false;
        stage.focusOn([0, 1.9, 6.0], [0, 0, 0]);
      } else if (i === 2) {
        objective = 4; focus = 0.5; stained = false;
        stage.focusOn([-0.6, 1.4, 4.8], [-1.0, 0.05, 0]);
      } else if (i === 3) {
        objective = 10; focus = 0.5; stained = true;
        stage.focusOn([-0.8, 1.2, 4.5], [-1.1, 0.05, 0]);
      } else {
        objective = 40; focus = 0.5; stained = true;
        stage.focusOn([-1.0, 0.9, 4.1], [-1.12, 0.05, 0]);
      }
      updateTargets();
      await stage.wait(3000);
    },
    enterTry() {
      stage.controls.enabled = true;
      objective = 4; focus = 0.2; stained = false;
      focusInput.value = '0.2';
      objBtns.forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.obj === '4')));
      stainBtn.setAttribute('aria-pressed', 'false');
      stainBtn.textContent = 'הוסף טיפת יוד';
      stage.focusOn([0, 2.0, 6.2], [0, 0, 0]);
      updateTargets();
    },
    enterDemo() {
      stage.controls.enabled = false;
      objective = 4; focus = 0.35; stained = false;
      stage.focusOn([0, 2.0, 6.2], [0, 0, 0]);
      updateTargets();
    },
    dispose() {
      disposed = true;
      badge.remove();
      status.remove();
    },
  };
};

export default factory;

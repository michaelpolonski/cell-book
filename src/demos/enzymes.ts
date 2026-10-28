/**
 * שיעור 10: חומרי התא ואנזימים.
 * מודל תלת-ממדי של אנזים עם אתר פעיל ומצע (מנעול ומפתח),
 * מחווני טמפרטורה ו-pH, ודנטורציה בחום גבוה.
 */
import * as THREE from 'three';
import type { DemoFactory } from './types';
import { inked } from '../render/ink';
import { ENZYMES, enzymeRate } from '../sim/models';

const factory: DemoFactory = (api) => {
  const { stage } = api;
  stage.camera.position.set(0, 2.0, 6.2);
  stage.setShadow(-1.45, 5.2, 3.0);

  // גוף האנזים: טבעת פתוחה (הפתח הוא האתר הפעיל)
  const enzGroup = new THREE.Group();
  const body = inked(new THREE.TorusGeometry(0.85, 0.34, 22, 42, Math.PI * 1.55), { color: '#7fa6cc', outline: 0.02 });
  body.group.rotation.z = Math.PI * 0.72;
  enzGroup.add(body.group);
  stage.add(enzGroup);

  // מולקולת המצע (סובסטרט) שנכנסת לאתר הפעיל ומתפרקת לשני תוצרים
  const substrate = inked(new THREE.BoxGeometry(0.46, 0.34, 0.34), { color: '#e6b86a', outline: 0.016 });
  substrate.group.position.set(0, 1.35, 0);
  stage.add(substrate.group);

  const prod1 = inked(new THREE.SphereGeometry(0.18, 18, 12), { color: '#9ab89e', outline: 0.014 });
  const prod2 = inked(new THREE.SphereGeometry(0.18, 18, 12), { color: '#9ab89e', outline: 0.014 });
  prod1.group.visible = prod2.group.visible = false;
  stage.add(prod1.group, prod2.group);

  let enzymeKey: 'amylase' | 'pepsin' = 'amylase';
  let tempC = 37;
  let ph = 7.0;
  let cycle = 0;
  let met = false, disposed = false;

  api.jars.add('rate', 'קצב תגובה', '#9ab89e');
  api.jars.add('fit', 'שלמות אתר פעיל', '#9cc0de');
  api.jars.add('prod', 'תוצרים', '#e9a865');

  const badge = document.createElement('div');
  badge.className = 'badge';
  const status = document.createElement('div');
  status.className = 'badge badge-status';
  api.overlay.append(badge, status);

  function syncHud() {
    const prof = ENZYMES[enzymeKey];
    const rate = enzymeRate(prof, tempC, ph);
    const denatured = tempC >= prof.denatureTemp - 2;
    badge.innerHTML = `<b>${prof.name}</b> · טמפ׳: <bdi>${tempC}°C</bdi> · <bdi>pH ${ph.toFixed(1)}</bdi>`;
    status.innerHTML = denatured
      ? 'דנטורציה! החום הרס את המבנה המרחבי של האתר הפעיל'
      : `קצב פעילות האנזים: <b><bdi>${Math.round(rate * 100)}%</bdi></b>`;
    status.dataset.state = denatured ? 'burst' : '';
    const integrity = tempC <= prof.optTemp ? 1 : Math.max(0, 1 - (tempC - prof.optTemp) / (prof.denatureTemp - prof.optTemp));
    api.jars.set('rate', rate, `${Math.round(rate * 100)}%`);
    api.jars.set('fit', integrity, denatured ? 'הרוס' : `${Math.round(integrity * 100)}%`);
    api.jars.set('prod', rate, rate > 0.7 ? 'מהיר' : rate > 0.2 ? 'איטי' : 'אפס');

    // עיוות האנזים בדנטורציה
    const warp = 1 - integrity;
    enzGroup.scale.set(1 + warp * 0.45, 1 - warp * 0.35, 1);
    (body.mesh.material as THREE.ShaderMaterial).uniforms.uColor.value.set(denatured ? '#d96a5b' : '#7fa6cc');

    if (!met && enzymeKey === 'pepsin' && rate >= 0.9) {
      met = true;
      api.challengeMet();
    }
  }

  stage.onTick((dt, t) => {
    if (disposed || dt <= 0) return;
    const prof = ENZYMES[enzymeKey];
    const rate = enzymeRate(prof, tempC, ph);
    enzGroup.rotation.y = Math.sin(t * 0.6) * 0.25;
    cycle = (cycle + dt * (0.25 + rate * 1.4)) % 1;
    if (rate < 0.05) {
      substrate.group.visible = true;
      prod1.group.visible = prod2.group.visible = false;
      substrate.group.position.set(Math.sin(t * 2) * 0.3, 1.25, 0);
    } else if (cycle < 0.55) {
      const u = cycle / 0.55;
      substrate.group.visible = true;
      prod1.group.visible = prod2.group.visible = false;
      substrate.group.position.set(0, 1.35 * (1 - u), 0);
    } else {
      const u = (cycle - 0.55) / 0.45;
      substrate.group.visible = false;
      prod1.group.visible = prod2.group.visible = true;
      prod1.group.position.set(-0.25 - u * 0.9, u * 1.1, 0);
      prod2.group.position.set(0.25 + u * 0.9, u * 1.1, 0);
    }
  });

  api.controls.innerHTML = `
    <div class="seg" role="group" aria-label="סוג אנזים">
      <button type="button" data-enz="amylase" aria-pressed="true">עמילאז (רוק)</button>
      <button type="button" data-enz="pepsin" aria-pressed="false">פפסין (קיבה)</button>
    </div>
    <label class="slider">
      <span>טמפרטורה</span>
      <input type="range" data-k="temp" min="5" max="60" step="1" value="37">
      <output data-o="temp"><bdi>37°C</bdi></output>
    </label>
    <label class="slider">
      <span><bdi>pH</bdi></span>
      <input type="range" data-k="ph" min="1" max="10" step="0.5" value="7">
      <output data-o="ph"><bdi>7.0</bdi></output>
    </label>`;

  const enzBtns = [...api.controls.querySelectorAll<HTMLButtonElement>('[data-enz]')];
  const tempInput = api.controls.querySelector<HTMLInputElement>('[data-k=temp]')!;
  const tempOut = api.controls.querySelector('[data-o=temp]')!;
  const phInput = api.controls.querySelector<HTMLInputElement>('[data-k=ph]')!;
  const phOut = api.controls.querySelector('[data-o=ph]')!;

  enzBtns.forEach((b) => b.addEventListener('click', () => {
    enzymeKey = b.dataset.enz as 'amylase' | 'pepsin';
    enzBtns.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    syncHud();
  }));
  tempInput.addEventListener('input', () => {
    tempC = parseFloat(tempInput.value);
    tempOut.innerHTML = `<bdi>${tempC}°C</bdi>`;
    syncHud();
  });
  phInput.addEventListener('input', () => {
    ph = parseFloat(phInput.value);
    phOut.innerHTML = `<bdi>${ph.toFixed(1)}</bdi>`;
    syncHud();
  });

  syncHud();

  return {
    async playStep(i) {
      stage.controls.enabled = false;
      enzymeKey = 'amylase';
      if (i <= 2) { tempC = 37; ph = 7; }
      else if (i === 3) { tempC = 37; ph = 7; }
      else { tempC = 56; ph = 7; }
      syncHud();
      await stage.wait(3000);
    },
    enterTry() {
      stage.controls.enabled = true;
      enzymeKey = 'amylase'; tempC = 25; ph = 7;
      tempInput.value = '25'; tempOut.innerHTML = '<bdi>25°C</bdi>';
      phInput.value = '7'; phOut.innerHTML = '<bdi>7.0</bdi>';
      enzBtns.forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.enz === 'amylase')));
      syncHud();
    },
    enterDemo() {
      stage.controls.enabled = false;
      enzymeKey = 'amylase'; tempC = 37; ph = 7;
      syncHud();
    },
    dispose() {
      disposed = true;
      badge.remove();
      status.remove();
    },
  };
};

export default factory;

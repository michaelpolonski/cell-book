/**
 * שיעור 10: חומרי התא ואנזימים – מהדורה קולנועית וריאליסטית.
 * מודל תלת-ממדי של אנזים גלובולרי עם אתר פעיל שנסגר סביב הסובסטרט (התאמה מושרית / Induced Fit),
 * רטט תרמי שתלוי בטמפרטורה, ודנטורציה (פתיחת קיפולי החלבון) בחום גבוה.
 */
import * as THREE from 'three';
import type { DemoFactory } from './types';
import { inked, SpringScalar } from '../render/ink';
import { ENZYMES, enzymeRate } from '../sim/models';

const factory: DemoFactory = (api) => {
  const { stage } = api;
  stage.focusOn([0, 2.0, 5.8], [0, 0.15, 0], true);
  stage.setShadow(-1.45, 5.2, 3.0);

  // גוף האנזים: שתי אונות חלבוניות מקופלות שיוצרות אתר פעיל ביניהן (Induced Fit)
  const enzGroup = new THREE.Group();
  const body = inked(new THREE.TorusGeometry(0.82, 0.34, 28, 48, Math.PI * 1.52), {
    color: '#6fa3c7', outline: 0.02, subsurface: 0.9, gloss: 0.65, wobble: 0.016, wobbleFreq: 3.5,
  });
  body.group.rotation.z = Math.PI * 0.74;

  // שתי "לסתות" של האתר הפעיל שנסגרות קלות סביב המצע בזמן הקישור
  const jawLeft = inked(new THREE.SphereGeometry(0.32, 24, 18), {
    color: '#5b8fb5', outline: 0.015, subsurface: 0.88, gloss: 0.65, wobble: 0.014,
  });
  jawLeft.group.position.set(-0.55, 0.55, 0.08);
  const jawRight = inked(new THREE.SphereGeometry(0.32, 24, 18), {
    color: '#5b8fb5', outline: 0.015, subsurface: 0.88, gloss: 0.65, wobble: 0.014,
  });
  jawRight.group.position.set(0.55, 0.55, -0.08);

  enzGroup.add(body.group, jawLeft.group, jawRight.group);
  stage.add(enzGroup);

  // מולקולת המצע (סובסטרט דו-יחידתי) שנכנסת לאתר הפעיל ומתפרקת לשני תוצרים
  const substrate = new THREE.Group();
  const subA = inked(new THREE.SphereGeometry(0.21, 22, 16), {
    color: '#e6b86a', outline: 0.015, subsurface: 0.85, gloss: 0.7,
  });
  subA.group.position.x = -0.16;
  const subB = inked(new THREE.SphereGeometry(0.21, 22, 16), {
    color: '#e6b86a', outline: 0.015, subsurface: 0.85, gloss: 0.7,
  });
  subB.group.position.x = 0.16;
  substrate.add(subA.group, subB.group);
  substrate.position.set(0, 1.35, 0);
  stage.add(substrate);

  const prod1 = inked(new THREE.SphereGeometry(0.2, 22, 16), {
    color: '#7ab082', outline: 0.014, subsurface: 0.85, gloss: 0.75,
  });
  const prod2 = inked(new THREE.SphereGeometry(0.2, 22, 16), {
    color: '#7ab082', outline: 0.014, subsurface: 0.85, gloss: 0.75,
  });
  prod1.group.visible = prod2.group.visible = false;
  stage.add(prod1.group, prod2.group);

  let enzymeKey: 'amylase' | 'pepsin' = 'amylase';
  let tempC = 37;
  let ph = 7.0;
  let cycle = 0;
  const warpSpring = new SpringScalar(0, 65, 10);
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
      ? 'דנטורציה! החום הגבוה פתח את קשרי החלבון והרס את המבנה המרחבי של האתר הפעיל'
      : `קצב פעילות האנזים: <b><bdi>${Math.round(rate * 100)}%</bdi></b>`;
    status.dataset.state = denatured ? 'burst' : '';
    const integrity = tempC <= prof.optTemp ? 1 : Math.max(0, 1 - (tempC - prof.optTemp) / (prof.denatureTemp - prof.optTemp));
    api.jars.set('rate', rate, `${Math.round(rate * 100)}%`);
    api.jars.set('fit', integrity, denatured ? 'הרוס' : `${Math.round(integrity * 100)}%`);
    api.jars.set('prod', rate, rate > 0.7 ? 'מהיר' : rate > 0.2 ? 'איטי' : 'אפס');

    warpSpring.setTarget(1 - integrity);
    const colHex = denatured ? '#d96a5b' : (enzymeKey === 'pepsin' ? '#8c7ab8' : '#6fa3c7');
    (body.mesh.material as THREE.ShaderMaterial).uniforms.uColor.value.set(colHex);
    (jawLeft.mesh.material as THREE.ShaderMaterial).uniforms.uColor.value.set(colHex);
    (jawRight.mesh.material as THREE.ShaderMaterial).uniforms.uColor.value.set(colHex);

    if (!met && enzymeKey === 'pepsin' && rate >= 0.9) {
      met = true;
      api.challengeMet();
    }
  }

  stage.onTick((dt, t) => {
    if (disposed || dt <= 0) return;
    const prof = ENZYMES[enzymeKey];
    const rate = enzymeRate(prof, tempC, ph);
    const warp = warpSpring.step(dt);

    // רטט תרמי פרופורציונלי לטמפרטורה + עיוות בדנטורציה
    const jitter = (tempC / 60) * 0.025;
    enzGroup.position.set(Math.sin(t * 28) * jitter, Math.cos(t * 31) * jitter, 0);
    enzGroup.rotation.y = Math.sin(t * 0.65) * 0.28;
    enzGroup.scale.set(1 + warp * 0.48, 1 - warp * 0.36, 1 + warp * 0.2);

    cycle = (cycle + dt * (0.22 + rate * 1.45)) % 1;
    if (rate < 0.05) {
      substrate.visible = true;
      prod1.group.visible = prod2.group.visible = false;
      substrate.position.set(Math.sin(t * 2.2) * 0.35, 1.25 + Math.cos(t * 3) * 0.08, 0);
      jawLeft.group.position.x = -0.55 - warp * 0.3;
      jawRight.group.position.x = 0.55 + warp * 0.3;
      (body.mesh.material as THREE.ShaderMaterial).uniforms.uPulse.value = 0;
    } else if (cycle < 0.55) {
      const u = cycle / 0.55;
      const s = u * u * (3 - 2 * u);
      substrate.visible = true;
      prod1.group.visible = prod2.group.visible = false;
      substrate.position.set(0, 1.35 * (1 - s), 0);
      // התאמה מושרית (Induced Fit): הלסתות נסגרות סביב הסובסטרט כשהוא באתר הפעיל
      const pinch = Math.sin(s * Math.PI) * 0.14;
      jawLeft.group.position.x = -0.55 + pinch;
      jawRight.group.position.x = 0.55 - pinch;
      (body.mesh.material as THREE.ShaderMaterial).uniforms.uPulse.value = s > 0.7 ? (s - 0.7) * 2.5 : 0;
    } else {
      const u = (cycle - 0.55) / 0.45;
      substrate.visible = false;
      prod1.group.visible = prod2.group.visible = true;
      prod1.group.position.set(-0.22 - u * 0.95, u * 1.15, Math.sin(u * Math.PI) * 0.15);
      prod2.group.position.set(0.22 + u * 0.95, u * 1.15, -Math.sin(u * Math.PI) * 0.15);
      jawLeft.group.position.x = -0.55;
      jawRight.group.position.x = 0.55;
      (body.mesh.material as THREE.ShaderMaterial).uniforms.uPulse.value = Math.max(0, 0.7 - u * 1.5);
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
      if (i <= 2) {
        tempC = 37; ph = 7;
        stage.focusOn([0, 1.9, 5.4], [0, 0.2, 0]);
      } else if (i === 3) {
        tempC = 37; ph = 7;
        stage.focusOn([0.3, 1.7, 4.8], [0, 0.25, 0]);
      } else {
        tempC = 56; ph = 7;
        stage.focusOn([0, 2.0, 5.8], [0, 0.1, 0]);
      }
      syncHud();
      await stage.wait(3000);
    },
    enterTry() {
      stage.controls.enabled = true;
      enzymeKey = 'amylase'; tempC = 25; ph = 7;
      tempInput.value = '25'; tempOut.innerHTML = '<bdi>25°C</bdi>';
      phInput.value = '7'; phOut.innerHTML = '<bdi>7.0</bdi>';
      enzBtns.forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.enz === 'amylase')));
      stage.focusOn([0, 2.0, 5.8], [0, 0.15, 0]);
      syncHud();
    },
    enterDemo() {
      stage.controls.enabled = false;
      enzymeKey = 'amylase'; tempC = 37; ph = 7;
      stage.focusOn([0, 2.0, 5.8], [0, 0.15, 0]);
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

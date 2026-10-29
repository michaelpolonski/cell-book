/**
 * שיעור 11: אנרגיה בתא – מיטוכונדריה וכלורופלסט (מהדורה קולנועית וריאליסטית).
 * מחזור החומרים והאנרגיה בין כלורופלסט (פוטוסינתזה באור שמש עם ערימות גרנה וקרני אור)
 * לבין מיטוכונדריה (נשימה תאית עם קפלי קריסטה ופליטת מולקולות ATP זהובות).
 */
import * as THREE from 'three';
import type { DemoFactory } from './types';
import { upgrade } from '../render/models';
import { inked, sketchLines } from '../render/ink';

const factory: DemoFactory = (api) => {
  const { stage } = api;
  stage.focusOn([0, 2.2, 6.2], [0, 0, 0], true);
  stage.setShadow(-1.45, 5.6, 3.0);

  // ימין: כלורופלסט (ירוק, עם ערימות דיסקיות תילקואידים – גרנה – וגשרים ביניהן)
  const chloro = new THREE.Group();
  chloro.position.set(1.42, 0, 0);
  const cShell = inked(new THREE.SphereGeometry(0.96, 36, 26), {
    color: '#5f9440', opacity: 0.42, rim: 0.92, subsurface: 0.9, gloss: 0.65, wobble: 0.012,
  });
  cShell.group.scale.set(1.22, 0.74, 0.86);
  chloro.add(cShell.group);
  for (let s = -1; s <= 1; s++) {
    const granum = new THREE.Group();
    granum.position.set(s * 0.42, 0, 0);
    for (let d = -2; d <= 2; d++) {
      const disc = inked(new THREE.CylinderGeometry(0.19, 0.19, 0.055, 18), {
        color: '#2e591c', outline: 0.008, subsurface: 0.85, gloss: 0.6,
      });
      disc.group.position.y = d * 0.075;
      granum.add(disc.group);
    }
    chloro.add(granum);
  }
  // אלומת אור שמש זהובה שמאירה על הכלורופלסט מלמעלה
  const sunBeam = inked(new THREE.ConeGeometry(0.95, 1.85, 24, 1, true), {
    color: '#ffdd6b', opacity: 0.18, rim: 0.4,
  });
  sunBeam.group.position.set(0.15, 1.15, 0);
  chloro.add(sunBeam.group);
  stage.add(chloro);

  // שמאל: מיטוכונדריה (כתומה, עם מעטפת חיצונית שקופה למחצה וקפלי קריסטה מפורטים)
  const mito = new THREE.Group();
  mito.position.set(-1.42, 0, 0);
  const mShell = inked(new THREE.CapsuleGeometry(0.56, 0.78, 22, 32), {
    color: '#d98a3d', opacity: 0.44, rim: 0.92, subsurface: 0.9, gloss: 0.65, wobble: 0.012,
  });
  mShell.group.rotation.z = Math.PI / 2;
  const cristae = inked(new THREE.TorusKnotGeometry(0.32, 0.052, 64, 10, 2, 3), {
    color: '#9a3b2a', outline: 0.01, subsurface: 0.85, gloss: 0.6,
  });
  cristae.group.scale.set(1.25, 0.85, 0.85);
  mito.add(mShell.group, cristae.group);
  stage.add(mito);
  const mitoSlot = new THREE.Group();
  mito.add(mitoSlot);
  upgrade(stage, mitoSlot, 'mitochondria', { size: 2.1, rotation: [0.3, 0, 0], subsurface: 0.9, gloss: 0.65 }).then((m) => {
    if (!m) return;
    mShell.group.visible = cristae.group.visible = false;
    mitoSlot.children.forEach((c) => (c.visible = c === m.group));
    mitoMats.push(...m.materials);
  });
  const chloroSlot = new THREE.Group();
  chloro.add(chloroSlot);
  upgrade(stage, chloroSlot, 'chloroplast', { size: 2.3, subsurface: 0.9, gloss: 0.6 }).then((m) => {
    if (!m) return;
    chloro.children.forEach((c) => { if (c !== chloroSlot && c !== sunBeam.group) c.visible = false; });
    chloroSlot.children.forEach((c) => (c.visible = c === m.group));
    chloroMats.push(...m.materials);
  });
  const mitoMats: THREE.ShaderMaterial[] = [];
  const chloroMats: THREE.ShaderMaterial[] = [];

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

  // זרם חלקיקים לאורך הקשת העליונה (גלוקוז זהוב + חמצן אדום) והתחתונה (CO₂ אפור + מים כחולים)
  const topParticles = Array.from({ length: 4 }, (_, i) => {
    const isGluc = i % 2 === 0;
    const orb = inked(new THREE.SphereGeometry(isGluc ? 0.13 : 0.095, 18, 14), {
      color: isGluc ? '#e6b86a' : '#d96a5b', outline: 0.01, subsurface: 0.85, gloss: 0.75,
    });
    stage.add(orb.group);
    return { obj: orb.group, offset: i * 0.25 };
  });

  const botParticles = Array.from({ length: 4 }, (_, i) => {
    const isWater = i % 2 === 0;
    const orb = inked(new THREE.SphereGeometry(0.1, 18, 14), {
      color: isWater ? '#6fa3c7' : '#7c8594', outline: 0.01, subsurface: 0.85, gloss: 0.75,
    });
    stage.add(orb.group);
    return { obj: orb.group, offset: i * 0.25 };
  });

  // כוכבי ATP זהובים שמרחפים סביב המיטוכונדריה ככל שקצב הנשימה התאית עולה
  const atpSparks = Array.from({ length: 5 }, () => {
    const s = inked(new THREE.IcosahedronGeometry(0.08, 0), {
      color: '#f0b849', outline: 0.008, gloss: 0.85,
    });
    stage.add(s.group);
    return s.group;
  });

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

  stage.onTick((dt, t) => {
    if (disposed || dt <= 0) return;
    // פוטוסינתזה תלויה באור; נשימה תאית פועלת תמיד כשיש גלוקוז וחמצן
    const photo = light * 0.22;
    const resp = Math.min(glucose, o2) * 0.16;
    glucose = Math.max(0.08, Math.min(1, glucose + (photo - resp * 0.7) * dt));
    o2 = Math.max(0.08, Math.min(1, o2 + (photo - resp * 0.65) * dt));
    atp = Math.max(0.1, Math.min(1, atp + (resp * 1.35 - 0.08) * dt));

    (sunBeam.mesh.material as THREE.ShaderMaterial).uniforms.uOpacity.value = light * 0.24;
    (cShell.mesh.material as THREE.ShaderMaterial).uniforms.uPulse.value = light * 0.35;
    (cristae.mesh.material as THREE.ShaderMaterial).uniforms.uPulse.value = atp * 0.45;
    mitoMats.forEach((mm) => (mm.uniforms.uGlow.value = atp * 0.18));
    chloroMats.forEach((mm) => (mm.uniforms.uGlow.value = light * 0.15));

    flowT = (flowT + dt * (0.18 + photo * 1.8)) % 1;
    topParticles.forEach(({ obj, offset }) => {
      const u = (flowT + offset) % 1;
      obj.visible = light > 0.06;
      obj.position.set(1.1 - u * 2.2, Math.sin(u * Math.PI) * 0.85 + 0.25, Math.cos(u * Math.PI * 2) * 0.08);
    });
    botParticles.forEach(({ obj, offset }) => {
      const u = (flowT + offset) % 1;
      obj.position.set(-1.1 + u * 2.2, -Math.sin(u * Math.PI) * 0.85 - 0.25, -Math.cos(u * Math.PI * 2) * 0.08);
    });

    atpSparks.forEach((spark, i) => {
      const a = t * (1.2 + atp * 1.5) + (i / atpSparks.length) * Math.PI * 2;
      const r = 0.68 + Math.sin(t * 3 + i) * 0.08;
      spark.position.set(-1.42 + Math.cos(a) * r, Math.sin(a * 1.3) * 0.45, Math.sin(a) * 0.45);
      spark.scale.setScalar(0.5 + atp * 0.65);
      spark.rotation.y = t * 2 + i;
    });

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
      if (i === 0) {
        light = 0.75;
        stage.focusOn([0.9, 1.8, 5.0], [1.1, 0, 0]);
      } else if (i === 1) {
        light = 0.75;
        stage.focusOn([-0.9, 1.8, 5.0], [-1.1, 0, 0]);
      } else if (i === 2) {
        light = 0.95;
        stage.focusOn([0, 2.2, 6.2], [0, 0, 0]);
      } else {
        light = 0.0;
        stage.focusOn([0, 2.2, 6.2], [0, 0, 0]);
      }
      await stage.wait(3000);
    },
    enterTry() {
      stage.controls.enabled = true;
      o2 = 0.45; glucose = 0.5; atp = 0.45;
      stage.focusOn([0, 2.2, 6.2], [0, 0, 0]);
      setLight(0.3);
    },
    enterDemo() {
      stage.controls.enabled = false;
      stage.focusOn([0, 2.2, 6.2], [0, 0, 0]);
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

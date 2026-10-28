/**
 * שיעור 8: הובלה פעילה ומעבר של חומרים גדולים – מהדורה קולנועית וריאליסטית.
 * משאבת נתרן-אשלגן שצורכת ATP (המתפרק ל-ADP + קבוצת פוספט Pi) כדי לדחוף יונים
 * נגד מפל הריכוזים (3 יוני Na⁺ החוצה ו-2 יוני K⁺ פנימה), ולצדה שלפוחית של
 * אנדוציטוזה/אקסוציטוזה עם מטען חלבוני בתוכה.
 */
import * as THREE from 'three';
import type { DemoFactory } from './types';
import { inked, sketchLines, SpringScalar } from '../render/ink';

const factory: DemoFactory = (api) => {
  const { stage } = api;
  stage.focusOn([0, 2.0, 6.0], [0, 0, 0], true);
  stage.setShadow(-1.45, 5.5, 3.0);

  // קרום התא לאורך המרכז (גמיש וחי)
  const bilayer = inked(new THREE.BoxGeometry(4.6, 0.56, 1.45), {
    color: '#e6c98a', opacity: 0.44, rim: 0.92, subsurface: 0.88, gloss: 0.6, wobble: 0.014, wobbleFreq: 2.8,
  });
  stage.add(bilayer.group);
  stage.add(sketchLines([-2.3, 0.28, 0.72, 2.3, 0.28, 0.72, -2.3, -0.28, 0.72, 2.3, -0.28, 0.72], 0.01));

  // משאבת נתרן-אשלגן במרכז: שתי אונות טרנס-ממברנליות שמתנדנדות ודוחפות יונים
  const pump = new THREE.Group();
  const leftLobe = inked(new THREE.CapsuleGeometry(0.21, 0.68, 14, 22), {
    color: '#9a3b2a', outline: 0.016, subsurface: 0.85, gloss: 0.65,
  });
  leftLobe.group.position.x = -0.24;
  const rightLobe = inked(new THREE.CapsuleGeometry(0.21, 0.68, 14, 22), {
    color: '#9a3b2a', outline: 0.016, subsurface: 0.85, gloss: 0.65,
  });
  rightLobe.group.position.x = 0.24;
  pump.add(leftLobe.group, rightLobe.group);
  stage.add(pump);

  // יוני נתרן (Na⁺, כחול-סגול) ויוני אשלגן (K⁺, ירוק) שנעים דרך המשאבה
  const naIons = Array.from({ length: 3 }, (_, i) => {
    const ion = inked(new THREE.SphereGeometry(0.085, 16, 12), {
      color: '#6fa3c7', outline: 0.01, subsurface: 0.85, gloss: 0.75,
    });
    ion.group.position.set((i - 1) * 0.14, 0.85, 0.12);
    stage.add(ion.group);
    return ion.group;
  });
  const kIons = Array.from({ length: 2 }, (_, i) => {
    const ion = inked(new THREE.SphereGeometry(0.095, 16, 12), {
      color: '#5f9440', outline: 0.01, subsurface: 0.85, gloss: 0.75,
    });
    ion.group.position.set((i - 0.5) * 0.18, -0.85, -0.1);
    stage.add(ion.group);
    return ion.group;
  });

  // כדור ATP זהוב + קבוצת פוספט (Pi) שנצמדת למשאבה בזמן הפירוק
  const atpOrb = inked(new THREE.IcosahedronGeometry(0.16, 1), {
    color: '#f0b849', outline: 0.014, subsurface: 0.9, gloss: 0.8,
  });
  atpOrb.group.position.set(0.35, -0.82, 0.25);
  const piOrb = inked(new THREE.SphereGeometry(0.075, 14, 10), {
    color: '#ffdd6b', outline: 0.01, gloss: 0.85,
  });
  piOrb.group.position.set(0.28, -0.35, 0.22);
  piOrb.group.visible = false;
  stage.add(atpOrb.group, piOrb.group);

  // שלפוחית אנדוציטוזה/אקסוציטוזה בצד שמאל עם חלקיקי מטען בתוכה
  const vesicleGroup = new THREE.Group();
  vesicleGroup.position.set(-1.45, 0.8, 0);
  const vesicle = inked(new THREE.SphereGeometry(0.34, 28, 20), {
    color: '#7fa6cc', opacity: 0.48, rim: 0.95, subsurface: 0.9, gloss: 0.7, wobble: 0.02, wobbleFreq: 4.0,
  });
  vesicleGroup.add(vesicle.group);
  for (let i = 0; i < 4; i++) {
    const cargo = inked(new THREE.IcosahedronGeometry(0.07, 1), {
      color: '#d98a3d', outline: 0.008, gloss: 0.65,
    });
    const a = (i / 4) * Math.PI * 2;
    cargo.group.position.set(Math.cos(a) * 0.12, Math.sin(a) * 0.12, (i % 2 - 0.5) * 0.1);
    vesicleGroup.add(cargo.group);
  }
  stage.add(vesicleGroup);

  let kIn = 0.45;    // ריכוז אשלגן בתוך התא (0..1)
  let naOut = 0.50;  // ריכוז נתרן מחוץ לתא (0..1)
  let atp = 1.0;     // מלאי ATP (0..1)
  let stroke = 0;    // אנימציית פעימת משאבה (1..0)
  const vesYSpring = new SpringScalar(0.8, 45, 10);
  let met = false, disposed = false;

  api.jars.add('kin', 'אשלגן (K⁺) בתא', '#9ab89e');
  api.jars.add('naout', 'נתרן (Na⁺) בחוץ', '#9cc0de');
  api.jars.add('atp', 'מלאי ATP', '#d97a6c');

  const badge = document.createElement('div');
  badge.className = 'badge';
  const status = document.createElement('div');
  status.className = 'badge badge-status';
  api.overlay.append(badge, status);

  function updateHud(msg?: string) {
    badge.innerHTML = `מפל ריכוזים: <bdi>K⁺</bdi> בפנים <b><bdi>${Math.round(kIn * 100)}%</bdi></b> · <bdi>ATP</bdi>: <bdi>${Math.round(atp * 100)}%</bdi>`;
    if (msg) status.innerHTML = msg;
    api.jars.set('kin', kIn, `${Math.round(kIn * 100)}%`);
    api.jars.set('naout', naOut, `${Math.round(naOut * 100)}%`);
    api.jars.set('atp', atp, `${Math.round(atp * 100)}%`);
  }

  function pumpOnce() {
    if (atp < 0.1) {
      updateHud('אין די ATP! טען ATP מנשימה תאית כדי להמשיך לשאוב.');
      return;
    }
    atp = Math.max(0, atp - 0.14);
    kIn = Math.min(0.95, kIn + 0.14);
    naOut = Math.min(0.95, naOut + 0.12);
    stroke = 1.0;
    stage.focusOn([0.15, 1.75, 4.9], [0, 0, 0]);
    updateHud('המשאבה פירקה ATP ל-ADP+Pi ודחפה 3 יוני Na⁺ החוצה ו-2 יוני K⁺ פנימה!');
    if (kIn >= 0.8 && !met) {
      met = true;
      api.challengeMet();
    }
  }

  stage.onTick((dt, t) => {
    if (disposed || dt <= 0) return;
    // דליפה איטית בדיפוזיה חזרה במורד המפל
    kIn = Math.max(0.35, kIn - dt * 0.012);
    naOut = Math.max(0.35, naOut - dt * 0.01);
    stroke = Math.max(0, stroke - dt * 1.35);

    const tilt = Math.sin(stroke * Math.PI * 2) * 0.34;
    leftLobe.group.rotation.z = tilt;
    rightLobe.group.rotation.z = -tilt;
    (leftLobe.mesh.material as THREE.ShaderMaterial).uniforms.uPulse.value = stroke * 0.7;
    (rightLobe.mesh.material as THREE.ShaderMaterial).uniforms.uPulse.value = stroke * 0.7;

    // מסלול יוני Na⁺ (נשאבים מתוך התא החוצה כלפי מעלה) ויוני K⁺ (נשאבים פנימה כלפי מטה)
    const p = 1 - stroke;
    naIons.forEach((ion, i) => {
      const y = stroke > 0 ? -0.55 + p * 1.55 : 0.92 + Math.sin(t * 2.2 + i) * 0.08;
      ion.position.set((i - 1) * 0.15, y, 0.1);
    });
    kIons.forEach((ion, i) => {
      const y = stroke > 0 ? 0.55 - p * 1.5 : -0.88 + Math.cos(t * 2.0 + i) * 0.08;
      ion.position.set((i - 0.5) * 0.18, y, -0.1);
    });

    piOrb.group.visible = stroke > 0.15;
    atpOrb.group.scale.setScalar(0.55 + atp * 0.55 + stroke * 0.25);
    atpOrb.group.rotation.y = t * 1.8;

    const vy = vesYSpring.step(dt);
    vesicleGroup.position.y = vy;
    // מעיכה קלה של השלפוחית כשהיא חוצה את קרום התא
    const pinch = Math.max(0, 1 - Math.abs(vy) * 1.8);
    vesicleGroup.scale.set(1 + pinch * 0.22, 1 - pinch * 0.18, 1 + pinch * 0.22);

    updateHud();
  });

  api.controls.innerHTML = `
    <button type="button" class="btn btn-rust" data-act="pump">הפעל משאבה (צורך ATP)</button>
    <button type="button" class="btn" data-act="endo">אנדוציטוזה</button>
    <button type="button" class="btn" data-act="exo">אקסוציטוזה</button>
    <button type="button" class="btn" data-act="recharge">טען ATP</button>`;

  api.controls.querySelector('[data-act=pump]')!.addEventListener('click', pumpOnce);
  api.controls.querySelector('[data-act=endo]')!.addEventListener('click', () => {
    vesYSpring.setTarget(-0.8);
    atp = Math.max(0, atp - 0.08);
    stage.focusOn([-0.85, 1.75, 4.9], [-1.1, -0.2, 0]);
    updateHud('אנדוציטוזה: הקרום התקפל פנימה ובלע שלפוחית עם מולקולות גדולות לתוך התא.');
  });
  api.controls.querySelector('[data-act=exo]')!.addEventListener('click', () => {
    vesYSpring.setTarget(0.85);
    atp = Math.max(0, atp - 0.08);
    stage.focusOn([-0.85, 1.85, 4.9], [-1.1, 0.2, 0]);
    updateHud('אקסוציטוזה: השלפוחית התאחתה עם הקרום ופלטה את תוכנה אל מחוץ לתא.');
  });
  api.controls.querySelector('[data-act=recharge]')!.addEventListener('click', () => {
    atp = 1.0;
    stage.focusOn([0, 2.0, 6.0], [0, 0, 0]);
    updateHud('מלאי ה-ATP התמלא מחדש מנשימה תאית במיטוכונדריה.');
  });

  updateHud('לחץ על "הפעל משאבה" כדי לשאוב אשלגן פנימה נגד מפל הריכוזים.');

  return {
    async playStep(i) {
      stage.controls.enabled = false;
      if (i === 0) {
        kIn = 0.45; atp = 1;
        stage.focusOn([0, 2.0, 5.8], [0, 0, 0]);
      } else if (i === 1 || i === 2) {
        pumpOnce();
      } else if (i === 3) {
        vesYSpring.setTarget(-0.8);
        stage.focusOn([-0.85, 1.75, 4.9], [-1.1, -0.2, 0]);
      } else {
        vesYSpring.setTarget(0.85);
        stage.focusOn([-0.85, 1.85, 4.9], [-1.1, 0.2, 0]);
      }
      await stage.wait(3000);
    },
    enterTry() {
      stage.controls.enabled = true;
      kIn = 0.45; naOut = 0.5; atp = 1.0;
      stage.focusOn([0, 2.0, 6.0], [0, 0, 0]);
      updateHud('הבא את ריכוז האשלגן בתא ל-80% לפחות.');
    },
    enterDemo() {
      stage.controls.enabled = false;
      kIn = 0.45; naOut = 0.5; atp = 1.0;
      stage.focusOn([0, 2.0, 5.8], [0, 0, 0]);
      updateHud();
    },
    dispose() {
      disposed = true;
      badge.remove();
      status.remove();
    },
  };
};

export default factory;

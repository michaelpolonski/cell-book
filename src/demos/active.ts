/**
 * שיעור 8: הובלה פעילה ומעבר של חומרים גדולים.
 * משאבת נתרן-אשלגן שצורכת ATP כדי לדחוף יונים נגד מפל הריכוזים,
 * ולצדה שלפוחית של אנדוציטוזה/אקסוציטוזה.
 */
import * as THREE from 'three';
import type { DemoFactory } from './types';
import { inked, sketchLines } from '../render/ink';

const factory: DemoFactory = (api) => {
  const { stage } = api;
  stage.camera.position.set(0, 2.0, 6.2);
  stage.setShadow(-1.45, 5.5, 3.0);

  // קרום התא לאורך המרכז
  const bilayer = inked(new THREE.BoxGeometry(4.6, 0.55, 1.4), { color: '#e6c98a', opacity: 0.42, rim: 0.9 });
  stage.add(bilayer.group);
  stage.add(sketchLines([-2.3, 0.28, 0.7, 2.3, 0.28, 0.7, -2.3, -0.28, 0.7, 2.3, -0.28, 0.7], 0.01));

  // משאבת נתרן-אשלגן במרכז: שני חצאים שנפתחים כלפי מעלה או מטה
  const pump = new THREE.Group();
  const leftLobe = inked(new THREE.CapsuleGeometry(0.2, 0.65, 12, 18), { color: '#9a3b2a', outline: 0.016 });
  leftLobe.group.position.x = -0.22;
  const rightLobe = inked(new THREE.CapsuleGeometry(0.2, 0.65, 12, 18), { color: '#9a3b2a', outline: 0.016 });
  rightLobe.group.position.x = 0.22;
  pump.add(leftLobe.group, rightLobe.group);
  stage.add(pump);

  // כדור ATP זהוב שמתקרב למשאבה מלמטה (פנים התא)
  const atpOrb = inked(new THREE.IcosahedronGeometry(0.16, 1), { color: '#f0b849', outline: 0.014 });
  atpOrb.group.position.set(0, -0.85, 0.25);
  stage.add(atpOrb.group);

  // שלפוחית אנדוציטוזה/אקסוציטוזה בצד שמאל
  const vesicle = inked(new THREE.SphereGeometry(0.32, 22, 16), { color: '#7fa6cc', opacity: 0.55, rim: 0.9 });
  vesicle.group.position.set(-1.45, 0.75, 0);
  stage.add(vesicle.group);

  let kIn = 0.45;    // ריכוז אשלגן בתוך התא (0..1)
  let naOut = 0.50;  // ריכוז נתרן מחוץ לתא (0..1)
  let atp = 1.0;     // מלאי ATP (0..1)
  let stroke = 0;    // אנימציית פעימת משאבה
  let vesY = 0.75;
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
    stroke = 1;
    updateHud('המשאבה פירקה ATP ודחפה יונים נגד מפל הריכוזים!');
    if (kIn >= 0.8 && !met) {
      met = true;
      api.challengeMet();
    }
  }

  stage.onTick((dt) => {
    if (disposed || dt <= 0) return;
    // דליפה איטית בדיפוזיה חזרה במורד המפל
    kIn = Math.max(0.35, kIn - dt * 0.012);
    naOut = Math.max(0.35, naOut - dt * 0.01);
    stroke = Math.max(0, stroke - dt * 1.8);
    const tilt = (stroke - 0.5) * 0.45;
    leftLobe.group.rotation.z = tilt;
    rightLobe.group.rotation.z = -tilt;
    atpOrb.group.scale.setScalar(0.6 + atp * 0.6 + stroke * 0.35);
    vesicle.group.position.y += (vesY - vesicle.group.position.y) * Math.min(1, dt * 4);
    updateHud();
  });

  api.controls.innerHTML = `
    <button type="button" class="btn btn-rust" data-act="pump">הפעל משאבה (צורך ATP)</button>
    <button type="button" class="btn" data-act="endo">אנדוציטוזה</button>
    <button type="button" class="btn" data-act="exo">אקסוציטוזה</button>
    <button type="button" class="btn" data-act="recharge">טען ATP</button>`;

  api.controls.querySelector('[data-act=pump]')!.addEventListener('click', pumpOnce);
  api.controls.querySelector('[data-act=endo]')!.addEventListener('click', () => {
    vesY = -0.75;
    atp = Math.max(0, atp - 0.08);
    updateHud('אנדוציטוזה: הקרום התקפל פנימה ויצר שלפוחית בתוך התא.');
  });
  api.controls.querySelector('[data-act=exo]')!.addEventListener('click', () => {
    vesY = 0.85;
    atp = Math.max(0, atp - 0.08);
    updateHud('אקסוציטוזה: השלפוחית התאחתה עם הקרום ופלטה את תוכנה החוצה.');
  });
  api.controls.querySelector('[data-act=recharge]')!.addEventListener('click', () => {
    atp = 1.0;
    updateHud('מלאי ה-ATP התמלא מחדש מנשימה תאית.');
  });

  updateHud('לחץ על "הפעל משאבה" כדי לשאוב אשלגן פנימה נגד מפל הריכוזים.');

  return {
    async playStep(i) {
      stage.controls.enabled = false;
      if (i === 0) { kIn = 0.45; atp = 1; }
      else if (i === 1 || i === 2) pumpOnce();
      else if (i === 3) { vesY = -0.75; }
      else { vesY = 0.85; }
      await stage.wait(3000);
    },
    enterTry() {
      stage.controls.enabled = true;
      kIn = 0.45; naOut = 0.5; atp = 1.0;
      updateHud('הבא את ריכוז האשלגן בתא ל-80% לפחות.');
    },
    enterDemo() {
      stage.controls.enabled = false;
      kIn = 0.45; naOut = 0.5; atp = 1.0;
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

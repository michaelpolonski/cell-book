/**
 * שיעור 6: קרום התא – מודל הפסיפס הנוזלי (מהדורה קולנועית וריאליסטית).
 * דו-שכבה של פוספוליפידים עם ראשים הידרופיליים וזנבות הידרופוביים המתפתלים בגל תרמי חי,
 * מולקולות כולסטרול משובצות בין הזנבות, תעלת אקוופורין וחלבון נשא שמשנה את צורתו (Alternating Access)
 * בזמן מעבר גלוקוז, ובדיקת 5 מולקולות: O₂, CO₂, H₂O, גלוקוז, Na⁺.
 */
import * as THREE from 'three';
import type { DemoFactory } from './types';
import { upgrade } from '../render/models';
import { inked, inkedInstances, sketchLines } from '../render/ink';

interface Probe {
  id: string;
  label: string;
  color: string;
  way: 'lipid' | 'channel' | 'carrier';
  wayHe: string;
  xTarget: number;
  passes: boolean;
}

const PROBES: Probe[] = [
  { id: 'o2', label: 'חמצן (O₂)', color: '#d96a5b', way: 'lipid', wayHe: 'עובר בדיפוזיה פשוטה ישירות בין זנבות השומן (לא-קוטבי וקטן)', xTarget: 0.92, passes: true },
  { id: 'co2', label: 'פחמן דו-חמצני (CO₂)', color: '#7c8594', way: 'lipid', wayHe: 'עובר בדיפוזיה פשוטה ישירות דרך השומן (לא-קוטבי וקטן)', xTarget: 0.42, passes: true },
  { id: 'h2o', label: 'מים (H₂O)', color: '#6fa3c7', way: 'channel', wayHe: 'עובר באוסמוזה מהירה דרך תעלת אקוופורין ייעודית', xTarget: -0.38, passes: true },
  { id: 'glucose', label: 'גלוקוז', color: '#e6b86a', way: 'carrier', wayHe: 'נקשר לחלבון נשא ייחודי שמשנה את צורתו ומעביר אותו פנימה', xTarget: -1.28, passes: true },
  { id: 'na', label: 'יון נתרן (Na⁺)', color: '#c7a4c9', way: 'channel', wayHe: 'בעל מטען חשמלי – נדחה מהליבה ההידרופובית של השומן!', xTarget: 1.38, passes: false },
];

const factory: DemoFactory = (api) => {
  const { stage } = api;
  stage.focusOn([0, 1.9, 6.0], [0, 0, 0], true);
  stage.setShadow(-1.45, 5.6, 3.0);

  // דו-שכבה של פוספוליפידים: 3 שורות × 12 עמודות × 2 שכבות = 72 ראשים
  const cols = 12, rows = 3;
  const totalHeads = cols * rows * 2;
  const heads = inkedInstances(new THREE.SphereGeometry(0.125, 16, 12), totalHeads, {
    color: '#d98a3d', outline: 0.012, subsurface: 0.85, gloss: 0.65,
  });
  stage.add(heads.group);

  const tailSegs: number[] = [];
  const headBase: { x: number; y: number; z: number; s: number }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = (c - (cols - 1) / 2) * 0.4;
      const z = (r - 1) * 0.38;
      for (const s of [1, -1]) {
        const y = s * 0.48;
        headBase.push({ x, y, z, s });
        // שני זנבות חומצות שומן לכל ראש פוספוליפיד
        tailSegs.push(x - 0.04, y - s * 0.1, z, x - 0.05, s * 0.05, z);
        tailSegs.push(x + 0.04, y - s * 0.1, z, x + 0.05, s * 0.05, z);
      }
    }
  }
  const tails = sketchLines(tailSegs, 0.008, '#4a5568');
  const tailGeo = tails.geometry as THREE.BufferGeometry;
  const tailBasePos = (tailGeo.attributes.position.array as Float32Array).slice();
  stage.add(tails);

  // מולקולות כולסטרול זהובות משובצות בין הזנבות ההידרופוביים
  for (const cx of [-0.82, 0.12, 0.88, 1.65]) {
    const chol = inked(new THREE.CapsuleGeometry(0.045, 0.18, 8, 12), {
      color: '#f0b849', outline: 0.007, gloss: 0.55,
    });
    chol.group.position.set(cx, 0.18, 0);
    chol.group.rotation.z = 0.25;
    stage.add(chol.group);
  }

  // תעלת אקוופורין (כחולה, מבנה שעון-חול חלול)
  const channelGroup = new THREE.Group();
  channelGroup.position.set(-0.38, 0, 0);
  const chanTop = inked(new THREE.CylinderGeometry(0.26, 0.16, 0.58, 22), {
    color: '#6fa3c7', outline: 0.015, subsurface: 0.85, gloss: 0.6,
  });
  chanTop.group.position.y = 0.29;
  const chanBot = inked(new THREE.CylinderGeometry(0.16, 0.26, 0.58, 22), {
    color: '#6fa3c7', outline: 0.015, subsurface: 0.85, gloss: 0.6,
  });
  chanBot.group.position.y = -0.29;
  channelGroup.add(chanTop.group, chanBot.group);
  stage.add(channelGroup);

  // חלבון נשא (ירוק, שתי אונות שמתנדנדות ונפתחות לסירוגין – Alternating Access)
  const carrierGroup = new THREE.Group();
  carrierGroup.position.set(-1.28, 0, 0);
  const cLeft = inked(new THREE.CapsuleGeometry(0.14, 0.62, 12, 18), {
    color: '#6f9a45', outline: 0.014, subsurface: 0.85, gloss: 0.6,
  });
  cLeft.group.position.x = -0.14;
  const cRight = inked(new THREE.CapsuleGeometry(0.14, 0.62, 12, 18), {
    color: '#6f9a45', outline: 0.014, subsurface: 0.85, gloss: 0.6,
  });
  cRight.group.position.x = 0.14;
  carrierGroup.add(cLeft.group, cRight.group);
  stage.add(carrierGroup);

  // טבעת הדף חשמלי כש-Na⁺ נדחה מהשומן
  const repelRing = inked(new THREE.TorusGeometry(0.22, 0.018, 10, 28), {
    color: '#c7a4c9', opacity: 0.0, rim: 0.9,
  });
  repelRing.group.rotation.x = Math.PI / 2;
  repelRing.group.position.set(1.38, 0.52, 0);
  stage.add(repelRing.group);

  // המולקולה הנבדקת
  const ball = inked(new THREE.SphereGeometry(0.18, 24, 18), {
    color: '#d96a5b', outline: 0.016, subsurface: 0.85, gloss: 0.75,
  });
  ball.group.position.set(0.92, 1.2, 0);
  stage.add(ball.group);
  // מולקולת גלוקוז אמיתית (מודל מ-Sketchfab) כשבודקים גלוקוז
  const glucoseSlot = new THREE.Group();
  ball.group.add(glucoseSlot);
  let glucoseModel: THREE.Object3D | null = null;
  upgrade(stage, glucoseSlot, 'glucose', { size: 0.5, gloss: 0.8, subsurface: 0.6 }).then((m) => {
    if (!m) return;
    glucoseModel = m.group;
    syncGlucose();
  });
  const syncGlucose = () => {
    const g = curProbe.id === 'glucose' && !!glucoseModel;
    ball.mesh.visible = !g;
    if (ball.outline) ball.outline.visible = !g;
    glucoseSlot.visible = g;
  };

  let curProbe = PROBES[0];
  let animT = 0;
  const tested = new Set<string>();
  let met = false, disposed = false;
  const m = new THREE.Matrix4();

  api.jars.add('tested', 'חומרים שנבדקו', '#9cc0de');
  api.jars.add('lipid', 'מסיסות בשומן', '#e9a865');
  api.jars.add('pass', 'מעבר בקרום', '#9ab89e');

  const badge = document.createElement('div');
  badge.className = 'badge';
  const status = document.createElement('div');
  status.className = 'badge badge-status';
  api.overlay.append(badge, status);

  function launch(p: Probe) {
    curProbe = p;
    animT = 0;
    (ball.mesh.material as THREE.ShaderMaterial).uniforms.uColor.value.set(p.color);
    syncGlucose();
    badge.innerHTML = `נבדק: <b>${p.label}</b>`;
    status.innerHTML = p.wayHe;
    api.jars.set('tested', tested.size / PROBES.length, `${tested.size}/${PROBES.length}`);
    api.jars.set('lipid', p.way === 'lipid' ? 0.95 : 0.12, p.way === 'lipid' ? 'גבוהה' : 'נמוכה');
    api.jars.set('pass', p.passes ? 0.95 : 0.15, p.passes ? 'עובר' : 'נחסם בשומן');
  }

  stage.onTick((dt, t) => {
    if (disposed || dt <= 0) return;

    // תנועת גל תרמית של ראשי הפוספוליפידים וזנבותיהם
    headBase.forEach((h, i) => {
      const wave = Math.sin(t * 2.5 + h.x * 1.8 + h.z * 1.4) * 0.045;
      const sway = Math.cos(t * 2.1 + h.x * 2.2) * 0.02;
      m.makeTranslation(h.x + sway, h.y + wave, h.z);
      heads.mesh.setMatrixAt(i, m);
    });
    heads.mesh.instanceMatrix.needsUpdate = true;

    const tp = tailGeo.attributes.position.array as Float32Array;
    for (let i = 0; i < tp.length; i += 3) {
      const bx = tailBasePos[i], by = tailBasePos[i + 1], bz = tailBasePos[i + 2];
      const isTip = Math.abs(by) < 0.12;
      const sway = Math.sin(t * 3.8 + bx * 2.5 + bz * 1.8) * (isTip ? 0.055 : 0.02);
      const waveY = Math.sin(t * 2.5 + bx * 1.8 + bz * 1.4) * 0.045;
      tp[i] = bx + sway;
      tp[i + 1] = by + waveY;
    }
    tailGeo.attributes.position.needsUpdate = true;

    // תנועת המולקולה הנבדקת
    animT = (animT + dt * 0.58) % 1;
    const x = curProbe.xTarget;
    let y: number;
    if (curProbe.passes) {
      const s = animT * animT * (3 - 2 * animT);
      y = 1.3 - s * 2.6;
      (repelRing.mesh.material as THREE.ShaderMaterial).uniforms.uOpacity.value = 0;
    } else {
      // יון נתרן ללא תעלה פתוחה יורד אל פני השומן ומוחזר למעלה עם אדוות הדף
      const bounce = animT < 0.5 ? animT * 2 : (1 - animT) * 2;
      y = 1.3 - bounce * 0.76;
      const impact = Math.max(0, 1 - Math.abs(animT - 0.5) * 5);
      repelRing.group.scale.setScalar(0.6 + (1 - impact) * 1.1);
      (repelRing.mesh.material as THREE.ShaderMaterial).uniforms.uOpacity.value = impact * 0.65;
    }
    ball.group.position.set(x, y, 0);
    ball.group.rotation.y = t * 1.8;

    // תנועת חלבון הנשא (נפתח למעלה כשגלוקוז נכנס, ונפתח למטה כשהוא יוצא לתא)
    if (curProbe.way === 'carrier') {
      const rock = Math.cos(animT * Math.PI * 2) * 0.28;
      cLeft.group.rotation.z = rock;
      cRight.group.rotation.z = -rock;
    } else {
      cLeft.group.rotation.z *= 0.9;
      cRight.group.rotation.z *= 0.9;
    }
  });

  api.controls.innerHTML = `<div class="probe-chips" style="display:flex;flex-wrap:wrap;gap:6px;width:100%"></div>`;
  const chipsEl = api.controls.querySelector('.probe-chips')!;

  const renderButtons = () => {
    chipsEl.innerHTML = '';
    for (const p of PROBES) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.dataset.probe = p.id;
      b.setAttribute('aria-pressed', String(curProbe.id === p.id));
      b.textContent = tested.has(p.id) ? `✓ ${p.label}` : p.label;
      b.addEventListener('click', () => {
        tested.add(p.id);
        launch(p);
        stage.focusOn([p.xTarget * 0.45, 1.75, 5.4], [p.xTarget * 0.55, 0, 0]);
        renderButtons();
        if (tested.size >= PROBES.length && !met) {
          met = true;
          api.challengeMet();
        }
      });
      chipsEl.append(b);
    }
  };
  renderButtons();
  launch(PROBES[0]);

  return {
    async playStep(i) {
      stage.controls.enabled = false;
      const p = PROBES[i % PROBES.length];
      launch(p);
      stage.focusOn([p.xTarget * 0.45, 1.75, 5.4], [p.xTarget * 0.55, 0, 0]);
      await stage.wait(3000);
    },
    enterTry() {
      stage.controls.enabled = true;
      stage.focusOn([0, 1.9, 6.0], [0, 0, 0]);
      launch(PROBES[0]);
    },
    enterDemo() {
      stage.controls.enabled = false;
      launch(PROBES[0]);
    },
    dispose() {
      disposed = true;
      badge.remove();
      status.remove();
    },
  };
};

export default factory;

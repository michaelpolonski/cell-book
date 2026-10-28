/**
 * שיעור 6: קרום התא – מודל הפסיפס הנוזלי.
 * דו-שכבה של פוספוליפידים עם ראשים הידרופיליים וזנבות הידרופוביים רוטטים,
 * תעלת אקוופורין וחלבון נשא, ובדיקת 5 מולקולות: O₂, CO₂, H₂O, גלוקוז, Na⁺.
 */
import * as THREE from 'three';
import type { DemoFactory } from './types';
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
  { id: 'o2', label: 'חמצן (O₂)', color: '#d96a5b', way: 'lipid', wayHe: 'ישירות דרך השומן (לא-קוטבי וקטן)', xTarget: 0.9, passes: true },
  { id: 'co2', label: 'פחמן דו-חמצני (CO₂)', color: '#7c8594', way: 'lipid', wayHe: 'ישירות דרך השומן (לא-קוטבי וקטן)', xTarget: 0.4, passes: true },
  { id: 'h2o', label: 'מים (H₂O)', color: '#6fa3c7', way: 'channel', wayHe: 'דרך תעלת אקוופורין', xTarget: -0.35, passes: true },
  { id: 'glucose', label: 'גלוקוז', color: '#e6b86a', way: 'carrier', wayHe: 'דרך חלבון נשא ייחודי', xTarget: -1.25, passes: true },
  { id: 'na', label: 'יון נתרן (Na⁺)', color: '#c7a4c9', way: 'channel', wayHe: 'נדחה מהשומן – חייב תעלת יונים ייעודית', xTarget: 1.35, passes: false },
];

const factory: DemoFactory = (api) => {
  const { stage } = api;
  stage.camera.position.set(0, 1.9, 6.2);
  stage.setShadow(-1.45, 5.6, 3.0);

  // דו-שכבה של פוספוליפידים: 2 שורות × 11 עמודות × 2 שכבות = 44 ראשים
  const cols = 11, rows = 2;
  const totalHeads = cols * rows * 2;
  const heads = inkedInstances(new THREE.SphereGeometry(0.13, 14, 10), totalHeads, { color: '#d98a3d', outline: 0.012 });
  stage.add(heads.group);

  const tailSegs: number[] = [];
  const headBase: { x: number; y: number; z: number }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = (c - (cols - 1) / 2) * 0.42;
      const z = (r - 0.5) * 0.42;
      // דלג על מקום התעלה והנשא
      for (const s of [1, -1]) {
        const y = s * 0.46;
        headBase.push({ x, y, z });
        tailSegs.push(x - 0.04, y - s * 0.1, z, x - 0.04, s * 0.05, z);
        tailSegs.push(x + 0.04, y - s * 0.1, z, x + 0.04, s * 0.05, z);
      }
    }
  }
  const tails = sketchLines(tailSegs, 0.008, '#4a5568');
  stage.add(tails);

  // תעלת אקוופורין (כחולה) וחלבון נשא (ירוק)
  const channel = inked(new THREE.CylinderGeometry(0.24, 0.24, 1.18, 20), { color: '#6fa3c7', outline: 0.016 });
  channel.group.position.set(-0.35, 0, 0);
  const carrier = inked(new THREE.CylinderGeometry(0.28, 0.22, 1.22, 18), { color: '#7fa87f', outline: 0.016 });
  carrier.group.position.set(-1.25, 0, 0);
  stage.add(channel.group, carrier.group);

  // המולקולה הנבדקת
  const ball = inked(new THREE.SphereGeometry(0.18, 20, 14), { color: '#d96a5b', outline: 0.016 });
  ball.group.position.set(0.9, 1.2, 0);
  stage.add(ball.group);

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
    badge.innerHTML = `נבדק: <b>${p.label}</b>`;
    status.innerHTML = p.wayHe;
    api.jars.set('tested', tested.size / PROBES.length, `${tested.size}/${PROBES.length}`);
    api.jars.set('lipid', p.way === 'lipid' ? 0.95 : 0.12, p.way === 'lipid' ? 'גבוהה' : 'נמוכה');
    api.jars.set('pass', p.passes ? 0.95 : 0.15, p.passes ? 'עובר' : 'נחסם בשומן');
  }

  stage.onTick((dt, t) => {
    if (disposed || dt <= 0) return;
    headBase.forEach((h, i) => {
      const wave = Math.sin(t * 2.4 + h.x * 1.8) * 0.04;
      m.makeTranslation(h.x, h.y + wave, h.z);
      heads.mesh.setMatrixAt(i, m);
    });
    heads.mesh.instanceMatrix.needsUpdate = true;

    animT = (animT + dt * 0.65) % 1;
    const x = curProbe.xTarget;
    let y: number;
    if (curProbe.passes) {
      y = 1.25 - animT * 2.5;
    } else {
      // יון נתרן ללא תעלה פתוחה יורד אל פני השומן ומוחזר למעלה
      const bounce = animT < 0.5 ? animT * 2 : (1 - animT) * 2;
      y = 1.25 - bounce * 0.72;
    }
    ball.group.position.set(x, y, 0);
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
      launch(PROBES[i % PROBES.length]);
      await stage.wait(3000);
    },
    enterTry() {
      stage.controls.enabled = true;
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

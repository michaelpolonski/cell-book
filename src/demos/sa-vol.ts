/**
 * שיעור 9: למה תאים קטנים? יחס שטח פנים לנפח – מהדורה קולנועית וריאליסטית.
 * קוביית-תא שמשנה את גודלה (1..6 µm) או מתחלקת ל-n³ תאים קטנים,
 * עם ליבת חמצן פנימית שממחישה עד לאן מצליח החמצן לחדור בדיפוזיה,
 * וחישוב חי של שטח הפנים, הנפח, היחס ביניהם וזמן הדיפוזיה אל המרכז.
 */
import * as THREE from 'three';
import type { DemoFactory } from './types';
import { inked, sketchLines, SpringScalar } from '../render/ink';
import { cubeMetrics } from '../sim/models';

const factory: DemoFactory = (api) => {
  const { stage } = api;
  stage.focusOn([2.3, 2.2, 5.8], [0, 0, 0], true);
  stage.setShadow(-1.45, 5.2, 3.4);

  const cellsHolder = new THREE.Group();
  stage.add(cellsHolder);

  let side = 2;
  let subdiv = 1;
  const popSpring = new SpringScalar(1, 90, 11);
  let met = false, disposed = false;

  api.jars.add('sa', 'שטח פנים', '#9cc0de');
  api.jars.add('vol', 'נפח כולל', '#e9a865');
  api.jars.add('ratio', 'יחס שטח/נפח', '#9ab89e');

  const badge = document.createElement('div');
  badge.className = 'badge';
  const status = document.createElement('div');
  status.className = 'badge badge-status';
  api.overlay.append(badge, status);

  function rebuild() {
    while (cellsHolder.children.length) cellsHolder.remove(cellsHolder.children[0]);
    const m = cubeMetrics(side, subdiv);
    const visualTotal = 0.42 * side; // גודל בתצוגה
    const gap = subdiv > 1 ? 0.075 : 0;
    const cellVis = (visualTotal - gap * (subdiv - 1)) / subdiv;

    // ככל שהיחס שטח/נפח נמוך יותר, מרכז התא "מורעב" לחמצן (ליבה אדומה כהה באמצע)
    const starvedFrac = Math.max(0, Math.min(0.78, (3.2 - m.ratio) / 3.0));

    for (let x = 0; x < subdiv; x++) {
      for (let y = 0; y < subdiv; y++) {
        for (let z = 0; z < subdiv; z++) {
          const cellGroup = new THREE.Group();
          const ox = (x - (subdiv - 1) / 2) * (cellVis + gap);
          const oy = (y - (subdiv - 1) / 2) * (cellVis + gap);
          const oz = (z - (subdiv - 1) / 2) * (cellVis + gap);
          cellGroup.position.set(ox, oy, oz);

          const g = inked(new THREE.BoxGeometry(cellVis, cellVis, cellVis), {
            color: m.ratio >= 3 ? '#88b990' : m.ratio >= 1.8 ? '#e6c98a' : '#d97a6c',
            opacity: 0.44,
            rim: 0.92,
            subsurface: 0.9,
            gloss: 0.65,
            wobble: 0.008,
          });
          cellGroup.add(g.group);

          // גרעין/ליבת דיפוזיה במרכז כל תא: ירוק כשחמצן מגיע למרכז, אדום כשהמרכז רחוק מדי
          const coreSize = Math.max(0.18, starvedFrac > 0.05 ? starvedFrac : 0.28) * cellVis;
          const core = inked(new THREE.SphereGeometry(coreSize * 0.5, 16, 12), {
            color: starvedFrac > 0.15 ? '#9a3b2a' : '#3e7a4e',
            opacity: 0.72,
            outline: 0.006,
            subsurface: 0.85,
            gloss: 0.6,
          });
          cellGroup.add(core.group);

          const h = cellVis / 2;
          cellGroup.add(sketchLines([
            -h, -h, -h, h, -h, -h, h, -h, -h, h, -h, h, h, -h, h, -h, -h, h, -h, -h, h, -h, -h, -h,
            -h, h, -h, h, h, -h, h, h, -h, h, h, h, h, h, h, -h, h, h, -h, h, h, -h, h, -h,
          ], 0.008));
          cellsHolder.add(cellGroup);
        }
      }
    }

    popSpring.setInstant(0.84);
    popSpring.setTarget(1.0);

    badge.innerHTML = `שטח פנים: <bdi>${Math.round(m.surfaceArea)}</bdi> · נפח: <bdi>${Math.round(m.volume)}</bdi> · <b>יחס שטח/נפח: <bdi>${m.ratio.toFixed(2)}</bdi></b>`;
    status.innerHTML = `${m.count} תאים בגודל <bdi>${m.cellSide.toFixed(1)} µm</bdi> · זמן דיפוזיה למרכז: <bdi>${m.diffusionTimeSec.toFixed(1)} שנ׳</bdi>`;
    api.jars.set('sa', Math.min(1, m.surfaceArea / 648), `${Math.round(m.surfaceArea)}`);
    api.jars.set('vol', Math.min(1, m.volume / 216), `${Math.round(m.volume)}`);
    api.jars.set('ratio', Math.min(1, m.ratio / 6), m.ratio.toFixed(2));

    if (!met && side === 6 && m.ratio >= 3.0) {
      met = true;
      api.challengeMet();
    }
  }

  stage.onTick((dt, t) => {
    if (disposed || dt <= 0) return;
    cellsHolder.rotation.y = t * 0.35;
    cellsHolder.scale.setScalar(popSpring.step(dt));
  });

  api.controls.innerHTML = `
    <label class="slider">
      <span>אורך צלע כולל</span>
      <input type="range" data-k="side" min="1" max="6" step="1" value="2">
      <output data-o="side"><bdi>2 µm</bdi></output>
    </label>
    <div class="seg" role="group" aria-label="חלוקה לתאים">
      <button type="button" data-sub="1" aria-pressed="true">תא אחד (1³)</button>
      <button type="button" data-sub="2" aria-pressed="false">8 תאים (2³)</button>
      <button type="button" data-sub="3" aria-pressed="false">27 תאים (3³)</button>
    </div>`;

  const sideInput = api.controls.querySelector<HTMLInputElement>('[data-k=side]')!;
  const sideOut = api.controls.querySelector('[data-o=side]')!;
  const subBtns = [...api.controls.querySelectorAll<HTMLButtonElement>('[data-sub]')];

  sideInput.addEventListener('input', () => {
    side = parseInt(sideInput.value, 10);
    sideOut.innerHTML = `<bdi>${side} µm</bdi>`;
    rebuild();
  });
  subBtns.forEach((b) => b.addEventListener('click', () => {
    subdiv = parseInt(b.dataset.sub!, 10);
    subBtns.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    rebuild();
  }));

  rebuild();

  return {
    async playStep(i) {
      stage.controls.enabled = false;
      if (i <= 2) {
        side = 1; subdiv = 1;
        stage.focusOn([1.8, 1.8, 4.6], [0, 0, 0]);
      } else if (i === 3) {
        side = 4; subdiv = 1;
        stage.focusOn([2.3, 2.2, 5.8], [0, 0, 0]);
      } else {
        side = 4; subdiv = 3;
        stage.focusOn([2.3, 2.2, 5.8], [0, 0, 0]);
      }
      rebuild();
      await stage.wait(3000);
    },
    enterTry() {
      stage.controls.enabled = true;
      side = 4; subdiv = 1;
      sideInput.value = '4';
      sideOut.innerHTML = '<bdi>4 µm</bdi>';
      subBtns.forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.sub === '1')));
      stage.focusOn([2.4, 2.3, 6.0], [0, 0, 0]);
      rebuild();
    },
    enterDemo() {
      stage.controls.enabled = false;
      side = 2; subdiv = 1;
      stage.focusOn([2.2, 2.1, 5.4], [0, 0, 0]);
      rebuild();
    },
    dispose() {
      disposed = true;
      badge.remove();
      status.remove();
    },
  };
};

export default factory;

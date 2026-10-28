/**
 * שיעור 9: למה תאים קטנים? יחס שטח פנים לנפח.
 * קוביית-תא שמשנה את גודלה (1..6 µm) או מתחלקת ל-n³ תאים קטנים,
 * עם חישוב חי של שטח הפנים, הנפח, היחס ביניהם וזמן הדיפוזיה אל המרכז.
 */
import * as THREE from 'three';
import type { DemoFactory } from './types';
import { inked, sketchLines } from '../render/ink';
import { cubeMetrics } from '../sim/models';

const factory: DemoFactory = (api) => {
  const { stage } = api;
  stage.camera.position.set(2.4, 2.3, 6.0);
  stage.setShadow(-1.45, 5.2, 3.4);

  const cellsHolder = new THREE.Group();
  stage.add(cellsHolder);

  let side = 2;
  let subdiv = 1;
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
    const gap = subdiv > 1 ? 0.06 : 0;
    const cellVis = (visualTotal - gap * (subdiv - 1)) / subdiv;

    for (let x = 0; x < subdiv; x++) {
      for (let y = 0; y < subdiv; y++) {
        for (let z = 0; z < subdiv; z++) {
          const g = inked(new THREE.BoxGeometry(cellVis, cellVis, cellVis), {
            color: m.ratio >= 3 ? '#9ab89e' : m.ratio >= 1.8 ? '#e6c98a' : '#d97a6c',
            opacity: 0.52,
            rim: 0.9,
          });
          const ox = (x - (subdiv - 1) / 2) * (cellVis + gap);
          const oy = (y - (subdiv - 1) / 2) * (cellVis + gap);
          const oz = (z - (subdiv - 1) / 2) * (cellVis + gap);
          g.group.position.set(ox, oy, oz);
          const h = cellVis / 2;
          g.group.add(sketchLines([
            -h, -h, -h, h, -h, -h, h, -h, -h, h, -h, h, h, -h, h, -h, -h, h, -h, -h, h, -h, -h, -h,
            -h, h, -h, h, h, -h, h, h, -h, h, h, h, h, h, h, -h, h, h, -h, h, h, -h, h, -h,
          ], 0.008));
          cellsHolder.add(g.group);
        }
      }
    }

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
      if (i <= 2) { side = 1; subdiv = 1; }
      else if (i === 3) { side = 3; subdiv = 1; }
      else { side = 3; subdiv = 3; }
      rebuild();
      await stage.wait(3000);
    },
    enterTry() {
      stage.controls.enabled = true;
      side = 4; subdiv = 1;
      sideInput.value = '4';
      sideOut.innerHTML = '<bdi>4 µm</bdi>';
      subBtns.forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.sub === '1')));
      rebuild();
    },
    enterDemo() {
      stage.controls.enabled = false;
      side = 2; subdiv = 1;
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

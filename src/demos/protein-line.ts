/**
 * שיעור 5: פס הייצור של החלבון.
 * מסלול תלת-ממדי של חלבון הפרשה: גרעין ← ריבוזום על ER מחוספס ← שלפוחית הובלה ←
 * מערכת גולג׳י ← אקסוציטוזה בקרום התא.
 */
import * as THREE from 'three';
import type { DemoFactory } from './types';
import { inked, sketchLines } from '../render/ink';

interface Station { id: string; name: string; pos: THREE.Vector3; desc: string }

const STATIONS: Station[] = [
  { id: 'nucleus', name: '1. גרעין (שעתוק mRNA)', pos: new THREE.Vector3(1.85, 0.25, 0), desc: 'הוראת הבנייה מועתקת מה-DNA ל-mRNA.' },
  { id: 'rer', name: '2. ריבוזום ו-ER מחוספס', pos: new THREE.Vector3(0.9, -0.15, 0.15), desc: 'הריבוזום מרכיב את שרשרת חומצות האמינו והחלבון מתקפל.' },
  { id: 'ves1', name: '3. שלפוחית הובלה', pos: new THREE.Vector3(0.0, 0.25, -0.1), desc: 'החלבון נארז בשלפוחית שניתקת מה-ER.' },
  { id: 'golgi', name: '4. מערכת גולג׳י', pos: new THREE.Vector3(-0.9, -0.1, 0.1), desc: 'עיבוד סופי, סימון ומיון של החלבון ליעדו.' },
  { id: 'exo', name: '5. קרום התא (אקסוציטוזה)', pos: new THREE.Vector3(-1.95, 0.2, 0), desc: 'השלפוחית מתאחה עם קרום התא והחלבון מופרש החוצה.' },
];

const factory: DemoFactory = (api) => {
  const { stage } = api;
  stage.camera.position.set(0, 2.2, 6.4);
  stage.setShadow(-1.35, 5.8, 3.0);

  // תחנות המסלול בתלת-ממד (מימין לשמאל, כמו כיוון הקריאה בעברית)
  const nuc = inked(new THREE.SphereGeometry(0.55, 24, 18), { color: '#c7a4c9', outline: 0.018 });
  nuc.group.position.copy(STATIONS[0].pos);

  const rer = new THREE.Group();
  rer.position.copy(STATIONS[1].pos);
  for (let k = -1; k <= 1; k++) {
    const fold = inked(new THREE.BoxGeometry(0.52, 0.14, 0.65), { color: '#7fa6cc', outline: 0.014 });
    fold.group.position.y = k * 0.22;
    rer.add(fold.group);
  }

  const golgi = new THREE.Group();
  golgi.position.copy(STATIONS[3].pos);
  for (let k = -1; k <= 1; k++) {
    const sac = inked(new THREE.CylinderGeometry(0.36, 0.36, 0.1, 20), { color: '#e6b86a', outline: 0.014 });
    sac.group.position.y = k * 0.2;
    golgi.add(sac.group);
  }

  const mem = inked(new THREE.BoxGeometry(0.14, 1.55, 1.4), { color: '#d98a3d', opacity: 0.55, rim: 0.9 });
  mem.group.position.copy(STATIONS[4].pos);

  // קו מסלול מקווקו בין התחנות
  const pathSegs: number[] = [];
  for (let i = 0; i < STATIONS.length - 1; i++) {
    const a = STATIONS[i].pos, b = STATIONS[i + 1].pos;
    pathSegs.push(a.x, a.y, a.z, b.x, b.y, b.z);
  }
  const pathLine = sketchLines(pathSegs, 0.012, '#9a3b2a');

  // שלפוחית + חלבון זוהר שנע בין התחנות
  const cargo = new THREE.Group();
  const ves = inked(new THREE.SphereGeometry(0.24, 20, 14), { color: '#9cc0de', opacity: 0.42, rim: 0.9 });
  const prot = inked(new THREE.TorusKnotGeometry(0.1, 0.032, 36, 8), { color: '#9a3b2a', outline: 0.01 });
  cargo.add(ves.group, prot.group);
  cargo.position.copy(STATIONS[0].pos);

  stage.add(nuc.group, rer, golgi, mem.group, pathLine, cargo);

  let stationIdx = 0;
  let nextExpected = 0;
  let met = false, disposed = false;

  api.jars.add('step', 'תחנה במסלול', '#9cc0de');
  api.jars.add('fold', 'עיבוד החלבון', '#e9a865');
  api.jars.add('sec', 'הפרשה החוצה', '#9ab89e');

  const badge = document.createElement('div');
  badge.className = 'badge';
  const status = document.createElement('div');
  status.className = 'badge badge-status';
  api.overlay.append(badge, status);

  function updateHud() {
    const st = STATIONS[stationIdx];
    badge.innerHTML = `<b>${st.name}</b>`;
    status.innerHTML = st.desc;
    const p = (stationIdx + 1) / STATIONS.length;
    api.jars.set('step', p, `${stationIdx + 1}/${STATIONS.length}`);
    api.jars.set('fold', Math.min(1, stationIdx / 3), stationIdx >= 3 ? 'מוכן' : 'בתהליך');
    api.jars.set('sec', stationIdx === 4 ? 1 : 0.1, stationIdx === 4 ? 'הופרש!' : 'בתוך התא');
  }

  stage.onTick((dt, t) => {
    if (disposed || dt <= 0) return;
    const target = STATIONS[stationIdx].pos;
    cargo.position.lerp(target, Math.min(1, dt * 5));
    prot.group.rotation.y = t * 1.8;
    prot.group.rotation.x = t * 1.1;
    ves.group.visible = stationIdx >= 2;
  });

  // כפתורי התחנות בסדר מעורבב לאתגר
  const orderForButtons = [STATIONS[2], STATIONS[0], STATIONS[4], STATIONS[1], STATIONS[3]];
  api.controls.innerHTML = `
    <div class="station-picks" style="display:flex;flex-wrap:wrap;gap:6px;width:100%"></div>
    <button type="button" class="btn" data-act="reset">התחל מהגרעין</button>`;
  const picksEl = api.controls.querySelector('.station-picks')!;

  const renderButtons = () => {
    picksEl.innerHTML = '';
    for (const s of orderForButtons) {
      const idx = STATIONS.indexOf(s);
      const done = idx < nextExpected;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.dataset.st = s.id;
      b.setAttribute('aria-pressed', String(done));
      b.textContent = s.name.replace(/^\d+\.\s*/, '');
      b.addEventListener('click', () => {
        if (idx === nextExpected) {
          stationIdx = idx;
          nextExpected++;
          renderButtons();
          updateHud();
          if (nextExpected >= STATIONS.length && !met) {
            met = true;
            api.challengeMet();
          }
        } else {
          nextExpected = 0;
          stationIdx = 0;
          api.say('סדר לא נכון – התחל מהגרעין והתקדם תחנה אחר תחנה עד קרום התא.');
          renderButtons();
          updateHud();
        }
      });
      picksEl.append(b);
    }
  };
  renderButtons();

  api.controls.querySelector('[data-act=reset]')!.addEventListener('click', () => {
    nextExpected = 0;
    stationIdx = 0;
    renderButtons();
    updateHud();
  });

  updateHud();

  return {
    async playStep(i) {
      stage.controls.enabled = false;
      stationIdx = i;
      updateHud();
      await stage.wait(3000);
    },
    enterTry() {
      stage.controls.enabled = true;
      stationIdx = 0;
      nextExpected = 0;
      renderButtons();
      updateHud();
    },
    enterDemo() {
      stage.controls.enabled = false;
      stationIdx = 0;
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

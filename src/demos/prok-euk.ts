/**
 * שיעור 3: תא פרוקריוטי ותא אאוקריוטי.
 * השוואה תלת-ממדית קולנועית בין חיידק (עם שוטון מסתובב, ריסים, נוקלאואיד מפותל ופלסמיד)
 * לבין תא אאוקריוטי (גרעין, רשתית תוך-פלזמית, גולג׳י ומיטוכונדריה), עם מעברי מצלמה.
 */
import * as THREE from 'three';
import type { DemoFactory } from './types';
import { inked, organicTube } from '../render/ink';

interface Item { id: string; name: string; group: 'prok' | 'both' | 'euk' }

const ITEMS: Item[] = [
  { id: 'plasmid', name: 'פלסמיד (טבעת DNA)', group: 'prok' },
  { id: 'ribosome', name: 'ריבוזומים', group: 'both' },
  { id: 'membrane', name: 'קרום תא בררני', group: 'both' },
  { id: 'dna', name: 'חומר תורשתי (DNA)', group: 'both' },
  { id: 'nucleus', name: 'גרעין עטוף קרום', group: 'euk' },
  { id: 'mito', name: 'מיטוכונדריה', group: 'euk' },
];

const factory: DemoFactory = (api) => {
  const { stage } = api;
  stage.focusOn([0, 2.1, 6.4], [0, 0, 0], true);
  stage.setShadow(-1.4, 5.8, 3.2);

  // ---------- צד ימין: חיידק (פרוקריוט) ----------
  const prok = new THREE.Group();
  prok.position.set(1.55, 0, 0);
  const pShell = inked(new THREE.CapsuleGeometry(0.56, 0.92, 20, 32), {
    color: '#d9c48c', opacity: 0.36, rim: 0.95, wobble: 0.02, subsurface: 0.9,
  });
  pShell.group.rotation.z = Math.PI / 2;

  // נוקלאואיד תלת-ממדי מפותל בתוך הציטופלזמה של החיידק
  const nucPts: THREE.Vector3[] = [];
  for (let i = 0; i <= 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    nucPts.push(new THREE.Vector3(Math.cos(a) * 0.42, Math.sin(a * 3) * 0.16, Math.sin(a * 2) * 0.22));
  }
  const nucleoid = organicTube(nucPts, 0.028, { color: '#9a3b2a', closed: true, wobble: 0.015 });
  const plasmid = inked(new THREE.TorusGeometry(0.15, 0.028, 12, 28), { color: '#9a3b2a', outline: 0.01, wobble: 0.01 });
  plasmid.group.position.set(-0.48, -0.15, 0.18);

  // שוטון לולייני תלת-ממדי שמסתובב סביב צירו
  const flagPts: THREE.Vector3[] = [];
  for (let i = 0; i <= 28; i++) {
    const u = i / 28;
    flagPts.push(new THREE.Vector3(1.0 + u * 1.15, Math.sin(u * Math.PI * 4) * 0.15, Math.cos(u * Math.PI * 4) * 0.15));
  }
  const flagellum = organicTube(flagPts, 0.02, { color: '#1c2433', wobble: 0.01 });

  // ריבוזומים קטנים בציטופלזמה של החיידק
  const pRibos = new THREE.Group();
  [[-0.3, 0.2, -0.1], [0.1, -0.22, 0.15], [0.35, 0.18, 0.1], [-0.15, 0.05, -0.22]].forEach(([x, y, z]) => {
    const r = inked(new THREE.SphereGeometry(0.05, 12, 10), { color: '#d8b26e', outline: 0.008 });
    r.group.position.set(x, y, z);
    pRibos.add(r.group);
  });

  prok.add(pShell.group, nucleoid.group, plasmid.group, flagellum.group, pRibos);
  stage.add(prok);

  // ---------- צד שמאל: תא אאוקריוטי ----------
  const euk = new THREE.Group();
  euk.position.set(-1.35, 0, 0);
  const eShell = inked(new THREE.SphereGeometry(1.18, 40, 28), {
    color: '#df9b86', opacity: 0.32, rim: 0.95, wobble: 0.026, subsurface: 0.95,
  });
  const nuc = inked(new THREE.SphereGeometry(0.44, 28, 20), { color: '#c7a4c9', opacity: 0.78, outline: 0.015, wobble: 0.018 });
  nuc.group.position.set(-0.15, 0.12, 0);
  const nucleolus = inked(new THREE.SphereGeometry(0.16, 18, 14), { color: '#9a3b2a', outline: 0.01, wobble: 0.01 });
  nucleolus.group.position.set(-0.15, 0.12, 0);
  const mito1 = inked(new THREE.CapsuleGeometry(0.14, 0.28, 12, 18), { color: '#d98a3d', outline: 0.012, wobble: 0.015 });
  mito1.group.position.set(0.52, 0.25, 0.2);
  mito1.group.rotation.z = 0.6;
  const mito2 = inked(new THREE.CapsuleGeometry(0.13, 0.25, 12, 18), { color: '#d98a3d', outline: 0.012, wobble: 0.015 });
  mito2.group.position.set(0.35, -0.45, -0.15);
  mito2.group.rotation.z = -0.5;
  const er = inked(new THREE.TorusKnotGeometry(0.32, 0.048, 56, 10, 2, 3), { color: '#7fa6cc', outline: 0.01, wobble: 0.016 });
  er.group.position.set(-0.2, -0.32, 0.25);
  euk.add(eShell.group, nuc.group, nucleolus.group, mito1.group, mito2.group, er.group);
  stage.add(euk);

  let cutaway = true;
  let idx = 0;
  let solved = 0;
  let met = false, disposed = false;

  api.jars.add('prok', 'מורכבות חיידק', '#e9a865');
  api.jars.add('euk', 'מורכבות אאוקריוט', '#c7a4c9');
  api.jars.add('score', 'מיון נכון', '#9ab89e');
  api.jars.set('prok', 0.28, '~2 µm');
  api.jars.set('euk', 0.9, '~25 µm');
  api.jars.set('score', 0, `0/${ITEMS.length}`);

  const badge = document.createElement('div');
  badge.className = 'badge';
  const status = document.createElement('div');
  status.className = 'badge badge-status';
  api.overlay.append(badge, status);

  function syncCutaway() {
    (pShell.mesh.material as THREE.ShaderMaterial).uniforms.uOpacity.value = cutaway ? 0.34 : 0.88;
    (eShell.mesh.material as THREE.ShaderMaterial).uniforms.uOpacity.value = cutaway ? 0.30 : 0.88;
  }

  function updateHud() {
    const cur = ITEMS[idx];
    badge.innerHTML = 'ימין: <b>תא פרוקריוטי (חיידק)</b> · שמאל: <b>תא אאוקריוטי</b>';
    status.innerHTML = solved >= ITEMS.length
      ? 'מיינת נכון את כל 6 המבנים!'
      : `מיין עכשיו: <b>${cur.name}</b> (${solved}/${ITEMS.length})`;
    api.jars.set('score', solved / ITEMS.length, `${solved}/${ITEMS.length}`);
  }

  stage.onTick((dt, t) => {
    if (disposed || dt <= 0) return;
    prok.rotation.y = Math.sin(t * 0.55) * 0.32;
    prok.position.y = Math.sin(t * 1.4) * 0.06;
    flagellum.group.rotation.x = t * 10;
    plasmid.group.rotation.z = t * 1.2;
    euk.rotation.y = -Math.sin(t * 0.45) * 0.32;
    euk.position.y = Math.cos(t * 1.2) * 0.05;
  });

  api.controls.innerHTML = `
    <button type="button" class="btn" data-act="cut" aria-pressed="true">מבט חתך פתוח</button>
    <span class="prompt" style="font-weight:700">היכן נמצא: <b class="cur-item">${ITEMS[0].name}</b>?</span>
    <div class="seg" role="group" aria-label="מיון המבנה">
      <button type="button" data-ans="prok">בחיידק בלבד</button>
      <button type="button" data-ans="both">בשניהם</button>
      <button type="button" data-ans="euk">באאוקריוט בלבד</button>
    </div>`;

  const cutBtn = api.controls.querySelector<HTMLButtonElement>('[data-act=cut]')!;
  const curItemEl = api.controls.querySelector('.cur-item')!;
  cutBtn.addEventListener('click', () => {
    cutaway = !cutaway;
    cutBtn.setAttribute('aria-pressed', String(cutaway));
    cutBtn.textContent = cutaway ? 'מבט חתך פתוח' : 'מבט חיצוני';
    syncCutaway();
  });

  api.controls.querySelectorAll<HTMLButtonElement>('[data-ans]').forEach((b) => {
    b.addEventListener('click', () => {
      if (met) return;
      const cur = ITEMS[idx];
      if (b.dataset.ans === cur.group) {
        solved++;
        idx = (idx + 1) % ITEMS.length;
        curItemEl.textContent = ITEMS[idx].name;
        updateHud();
        if (solved >= ITEMS.length && !met) {
          met = true;
          api.challengeMet();
        }
      } else {
        solved = 0;
        idx = 0;
        curItemEl.textContent = ITEMS[0].name;
        api.say('לא מדויק – זכור שלשניהם יש קרום, ציטופלזמה, DNA וריבוזומים, ורק לאאוקריוט יש גרעין ואברונים עטופי קרום.');
        updateHud();
      }
    });
  });

  syncCutaway();
  updateHud();

  return {
    async playStep(i) {
      stage.controls.enabled = false;
      cutaway = i >= 1;
      syncCutaway();
      if (i === 2) stage.focusOn([1.3, 1.4, 4.4], [1.4, 0, 0]);
      else if (i === 3) stage.focusOn([-1.2, 1.4, 4.4], [-1.3, 0, 0]);
      else stage.focusOn([0, 2.1, 6.4], [0, 0, 0]);
      await stage.wait(3000);
    },
    enterTry() {
      stage.controls.enabled = true;
      cutaway = true;
      syncCutaway();
      stage.focusOn([0, 2.1, 6.4], [0, 0, 0]);
      updateHud();
    },
    enterDemo() {
      stage.controls.enabled = false;
      cutaway = true;
      syncCutaway();
      stage.focusOn([0, 2.1, 6.4], [0, 0, 0]);
    },
    dispose() {
      disposed = true;
      badge.remove();
      status.remove();
    },
  };
};

export default factory;

/**
 * שיעור 5: פס הייצור של החלבון – מהדורה קולנועית וריאליסטית.
 * מסלול תלת-ממדי של חלבון הפרשה: גרעין (שעתוק mRNA) ← ריבוזום על ER מחוספס ←
 * שלפוחית הובלה נעה על סיב שלד התא ← מערכת גולג׳י ← איחוי ואקסוציטוזה בקרום התא.
 */
import * as THREE from 'three';
import type { DemoFactory } from './types';
import { inked, organicTube, Spring3D } from '../render/ink';

interface Station {
  id: string;
  name: string;
  pos: THREE.Vector3;
  camPos: [number, number, number];
  desc: string;
}

const STATIONS: Station[] = [
  { id: 'nucleus', name: '1. גרעין (שעתוק mRNA)', pos: new THREE.Vector3(1.85, 0.25, 0), camPos: [1.5, 1.5, 4.3], desc: 'הוראת הבנייה מועתקת מה-DNA למולקולת שליח (mRNA) שיוצאת דרך נקבובית הגרעין.' },
  { id: 'rer', name: '2. ריבוזום ו-ER מחוספס', pos: new THREE.Vector3(0.9, -0.15, 0.18), camPos: [0.85, 1.35, 4.0], desc: 'הריבוזום קורא את ה-mRNA, מרכיב שרשרת חומצות אמינו והחלבון מתקפל בתוך ה-ER.' },
  { id: 'ves1', name: '3. שלפוחית הובלה', pos: new THREE.Vector3(0.0, 0.28, -0.08), camPos: [0.0, 1.5, 4.2], desc: 'החלבון נארז בשלפוחית שניתקת מה-ER וגולשת לאורך סיבי שלד התא.' },
  { id: 'golgi', name: '4. מערכת גולג׳י', pos: new THREE.Vector3(-0.92, -0.12, 0.12), camPos: [-0.85, 1.4, 4.0], desc: 'עיבוד סופי (כמו הוספת סוכרים), סימון ומיון של החלבון בשקי גולג׳י.' },
  { id: 'exo', name: '5. קרום התא (אקסוציטוזה)', pos: new THREE.Vector3(-1.95, 0.2, 0), camPos: [-1.45, 1.5, 4.3], desc: 'השלפוחית מתאחה עם קרום התא והחלבון מופרש בשלמותו אל מחוץ לתא!' },
];

const factory: DemoFactory = (api) => {
  const { stage } = api;
  stage.focusOn([0, 2.1, 6.2], [0, 0, 0], true);
  stage.setShadow(-1.35, 5.8, 3.0);

  // 1. גרעין עם נקבוביות וסרט mRNA יוצא
  const nucGroup = new THREE.Group();
  nucGroup.position.copy(STATIONS[0].pos);
  const nuc = inked(new THREE.SphereGeometry(0.56, 36, 26), {
    color: '#c7a4c9', opacity: 0.72, outline: 0.018, subsurface: 0.9, gloss: 0.55, wobble: 0.014,
  });
  const mrnaPts = [
    new THREE.Vector3(0.1, 0.05, 0),
    new THREE.Vector3(-0.22, 0.02, 0.08),
    new THREE.Vector3(-0.48, -0.08, 0.12),
    new THREE.Vector3(-0.75, -0.22, 0.15),
  ];
  const mrnaStrand = organicTube(mrnaPts, 0.025, {
    color: '#f0b849', outline: 0.008, gloss: 0.65, wobble: 0.012, wobbleFreq: 5.0, tubularSegments: 36,
  });
  nucGroup.add(nuc.group, mrnaStrand.group);

  // 2. רשתית תוך-פלזמית מחוספסת (RER) עם ריבוזומים צמודים
  const rer = new THREE.Group();
  rer.position.copy(STATIONS[1].pos);
  for (let k = -1; k <= 1; k++) {
    const fold = inked(new THREE.BoxGeometry(0.56, 0.12, 0.68), {
      color: '#6fa3c7', outline: 0.014, subsurface: 0.85, gloss: 0.55, wobble: 0.01,
    });
    fold.group.position.y = k * 0.22;
    rer.add(fold.group);
    // ריבוזומים קטנים על פני ה-RER
    for (let r = -1; r <= 1; r++) {
      const ribo = inked(new THREE.SphereGeometry(0.042, 12, 10), { color: '#9a3b2a', outline: 0.006 });
      ribo.group.position.set(r * 0.18, k * 0.22 + 0.075, 0.22);
      rer.add(ribo.group);
    }
  }

  // 4. מערכת גולג׳י (שקים קעורים מוערמים + שלפוחיות מנצות)
  const golgi = new THREE.Group();
  golgi.position.copy(STATIONS[3].pos);
  for (let k = -1.5; k <= 1.5; k += 1) {
    const sac = inked(new THREE.CylinderGeometry(0.38, 0.34, 0.085, 24), {
      color: '#e6b86a', outline: 0.013, subsurface: 0.88, gloss: 0.6, wobble: 0.01,
    });
    sac.group.position.y = k * 0.16;
    sac.group.rotation.z = 0.15;
    golgi.add(sac.group);
  }

  // 5. קרום התא בצד שמאל (דו-שכבה גמישה ונושמת)
  const mem = inked(new THREE.BoxGeometry(0.18, 1.75, 1.55), {
    color: '#d98a3d', opacity: 0.58, rim: 0.92, subsurface: 0.9, gloss: 0.65, wobble: 0.02, wobbleFreq: 3.2,
  });
  mem.group.position.copy(STATIONS[4].pos);

  // סיב שלד התא (מיקרוטובול) שמחבר בין התחנות במסילה חלקה
  const trackCurvePts = STATIONS.map((s) => s.pos.clone());
  const microtubule = organicTube(trackCurvePts, 0.018, {
    color: '#9ab89e', opacity: 0.45, outline: 0.006, gloss: 0.4, tubularSegments: 80,
  });

  // שלפוחית הובלה + חלבון מקופל זוהר שנע בין התחנות באמצעות קפיץ פיזיקלי
  const cargo = new THREE.Group();
  const ves = inked(new THREE.SphereGeometry(0.25, 28, 20), {
    color: '#88b9dc', opacity: 0.42, rim: 0.95, subsurface: 0.9, gloss: 0.75, wobble: 0.018, wobbleFreq: 4.5,
  });
  const prot = inked(new THREE.TorusKnotGeometry(0.11, 0.035, 48, 10), {
    color: '#9a3b2a', outline: 0.01, subsurface: 0.8, gloss: 0.7,
  });
  cargo.add(ves.group, prot.group);
  cargo.position.copy(STATIONS[0].pos);
  const cargoSpring = new Spring3D(STATIONS[0].pos.clone(), 55, 11);

  // מולקולות חלבון מופרשות מחוץ לתא (באקסוציטוזה)
  const secretedGroup = new THREE.Group();
  const secretedOrbs = Array.from({ length: 5 }, (_, i) => {
    const orb = inked(new THREE.TorusKnotGeometry(0.065, 0.022, 32, 8), {
      color: '#9a3b2a', outline: 0.008, gloss: 0.7,
    });
    orb.group.position.set(-2.25 - i * 0.18, 0.2 + Math.sin(i * 2) * 0.25, Math.cos(i * 2) * 0.25);
    secretedGroup.add(orb.group);
    return orb.group;
  });
  secretedGroup.visible = false;

  stage.add(nucGroup, rer, golgi, mem.group, microtubule.group, cargo, secretedGroup);

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

  function setStation(idx: number, focusCam = false) {
    stationIdx = idx;
    const st = STATIONS[stationIdx];
    cargoSpring.setTarget(st.pos.x, st.pos.y, st.pos.z);
    if (focusCam) {
      stage.focusOn(st.camPos, [st.pos.x * 0.65, st.pos.y, st.pos.z]);
    }
    updateHud();
  }

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
    cargo.position.copy(cargoSpring.step(dt));
    prot.group.rotation.y = t * 2.1;
    prot.group.rotation.x = t * 1.3;
    ves.group.visible = stationIdx >= 2 && stationIdx < 4;
    secretedGroup.visible = stationIdx === 4;
    if (stationIdx === 4) {
      secretedOrbs.forEach((orb, i) => {
        const wave = ((t * 0.7 + i * 0.2) % 1);
        orb.position.set(
          -2.05 - wave * 0.95,
          0.2 + Math.sin(t * 2 + i * 1.7) * 0.32 * wave,
          Math.cos(t * 1.8 + i * 1.4) * 0.28 * wave,
        );
        orb.rotation.y = t * 2 + i;
      });
    }
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
          nextExpected++;
          setStation(idx, true);
          renderButtons();
          if (nextExpected >= STATIONS.length && !met) {
            met = true;
            api.challengeMet();
          }
        } else {
          nextExpected = 0;
          setStation(0, false);
          stage.focusOn([0, 2.1, 6.2], [0, 0, 0]);
          api.say('סדר לא נכון – התחל מהגרעין והתקדם תחנה אחר תחנה עד קרום התא.');
          renderButtons();
        }
      });
      picksEl.append(b);
    }
  };
  renderButtons();

  api.controls.querySelector('[data-act=reset]')!.addEventListener('click', () => {
    nextExpected = 0;
    setStation(0, false);
    stage.focusOn([0, 2.1, 6.2], [0, 0, 0]);
    renderButtons();
  });

  updateHud();

  return {
    async playStep(i) {
      stage.controls.enabled = false;
      setStation(i, true);
      await stage.wait(3000);
    },
    enterTry() {
      stage.controls.enabled = true;
      nextExpected = 0;
      setStation(0, false);
      stage.focusOn([0, 2.1, 6.2], [0, 0, 0]);
      renderButtons();
    },
    enterDemo() {
      stage.controls.enabled = false;
      setStation(0, true);
    },
    dispose() {
      disposed = true;
      badge.remove();
      status.remove();
    },
  };
};

export default factory;

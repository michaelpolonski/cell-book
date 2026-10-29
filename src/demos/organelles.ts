/**
 * שיעור 4: סיור באברוני התא – מהדורה קולנועית וריאליסטית.
 * תא בעל חיים ותא צמח בתלת-ממד עם פיזור תת-משטחי, אברונים מפורטים (גרעין עם
 * נקבוביות וגרעינון, מיטוכונדריה עם קפלי קריסטה, רשתית תוך-פלזמית עם ריבוזומים,
 * מערכת גולג׳י, ליזוזומים, חלולית וכלורופלסטים עם ערימות תילקואידים),
 * ומצלמה קולנועית שמתמקדת על כל אברון שנבחר.
 */
import * as THREE from 'three';
import type { DemoFactory } from './types';
import { upgrade } from '../render/models';
import { inked, sketchLines, organicTube, mulberry32 } from '../render/ink';

interface OrganelleInfo {
  id: string;
  name: string;
  city: string;
  role: string;
  plantOnly?: boolean;
  camPos: [number, number, number];
  lookAt: [number, number, number];
}

const ORGANELLES: OrganelleInfo[] = [
  {
    id: 'nucleus', name: 'גרעין התא', city: 'העירייה והארכיון',
    role: 'שומר על ה-DNA ומנפיק הוראות (mRNA) דרך נקבוביות הגרעין לבניית חלבונים.',
    camPos: [-0.95, 1.35, 3.3], lookAt: [-0.62, 0.18, 0],
  },
  {
    id: 'mito', name: 'מיטוכונדריה', city: 'תחנת הכוח',
    role: 'מבצעת נשימה תאית על גבי קפלי הקריסטה ומפיקה אנרגיה זמינה (ATP) – גם בצמח וגם בבעל חיים!',
    camPos: [1.1, 1.35, 3.2], lookAt: [0.58, 0.15, 0.15],
  },
  {
    id: 'er', name: 'רשתית תוך-פלזמית וגולג׳י', city: 'בית החרושת והדואר',
    role: 'ייצור חלבונים בריבוזומים שעל ה-ER, עיבודם ואריזתם בשלפוחיות במערכת גולג׳י.',
    camPos: [-0.6, 1.15, 3.3], lookAt: [-0.38, -0.35, 0.28],
  },
  {
    id: 'lyso', name: 'ליזוזום', city: 'מכון המיחזור',
    role: 'מפרק חומרים, חיידקים ואברונים ישנים בעזרת אנזימי פירוק פעילים בסביבה חומצית.',
    camPos: [0.35, 1.55, 3.1], lookAt: [0.15, 0.52, -0.25],
  },
  {
    id: 'vacuole', name: 'חלולית ודופן תאית', city: 'מאגר המים והחומה',
    role: 'החלולית אוגרת מים ומומסים ולוחצת על הדופן הקשיחה מתאית ליצירת לחץ טורגור.',
    plantOnly: true,
    camPos: [0.45, 1.65, 3.8], lookAt: [0.22, -0.02, 0],
  },
  {
    id: 'chloro', name: 'כלורופלסט', city: 'הפאנל הסולארי',
    role: 'קולט אנרגיית אור בדיסקיות התילקואידים (גרנה) ומייצר גלוקוז וחמצן בפוטוסינתזה.',
    plantOnly: true,
    camPos: [1.25, 1.35, 3.3], lookAt: [0.85, 0.1, 0.1],
  },
];

const factory: DemoFactory = (api) => {
  const { stage } = api;
  const rnd = mulberry32(404);
  stage.focusOn([0, 2.3, 6.0], [0, 0, 0], true);
  stage.setShadow(-1.4, 5.4, 3.3);

  const root = new THREE.Group();
  stage.add(root);

  // קרום תא בעל חיים (נושם וגמיש)
  const animalMem = inked(new THREE.SphereGeometry(1.52, 48, 32), {
    color: '#e6b8a2', opacity: 0.3, rim: 0.95, subsurface: 0.9, gloss: 0.6, wobble: 0.022, wobbleFreq: 2.8,
  });

  // דופן תא צמח + קרום פנימי
  const plantGroup = new THREE.Group();
  const plantWall = inked(new THREE.BoxGeometry(2.95, 1.9, 2.05), {
    color: '#8fb369', opacity: 0.22, rim: 0.9, subsurface: 0.85, gloss: 0.4,
  });
  const wallWire = sketchLines([
    -1.47, -0.95, -1.02, 1.47, -0.95, -1.02, 1.47, -0.95, -1.02, 1.47, -0.95, 1.02,
    1.47, -0.95, 1.02, -1.47, -0.95, 1.02, -1.47, -0.95, 1.02, -1.47, -0.95, -1.02,
    -1.47, 0.95, -1.02, 1.47, 0.95, -1.02, 1.47, 0.95, -1.02, 1.47, 0.95, 1.02,
    1.47, 0.95, 1.02, -1.47, 0.95, 1.02, -1.47, 0.95, 1.02, -1.47, 0.95, -1.02,
  ], 0.015, '#3f5a2a');
  const plantInnerMem = inked(new THREE.BoxGeometry(2.76, 1.74, 1.88), {
    color: '#c4d99b', opacity: 0.16, rim: 0.85, wobble: 0.01, wobbleFreq: 2.5,
  });
  plantGroup.add(plantWall.group, wallWire, plantInnerMem.group);

  const meshes: Record<string, THREE.Object3D> = {};
  const highlightMats: Record<string, THREE.ShaderMaterial[]> = {};

  const registerMat = (id: string, m: THREE.ShaderMaterial) => {
    if (!highlightMats[id]) highlightMats[id] = [];
    highlightMats[id].push(m);
  };

  // 1. גרעין התא + גרעינון + כרומטין + נקבוביות גרעין
  const nucGroup = new THREE.Group();
  nucGroup.position.set(-0.62, 0.18, 0);
  const nucShell = inked(new THREE.SphereGeometry(0.46, 36, 26), {
    color: '#c7a4c9', opacity: 0.62, outline: 0.018, subsurface: 0.9, gloss: 0.55, wobble: 0.012,
  });
  const nucleolus = inked(new THREE.SphereGeometry(0.18, 24, 18), {
    color: '#7a457d', outline: 0.012, subsurface: 0.85, gloss: 0.65,
  });
  const chromPts: THREE.Vector3[] = [];
  for (let i = 0; i <= 48; i++) {
    const u = (i / 48) * Math.PI * 2;
    chromPts.push(new THREE.Vector3(Math.sin(u * 2) * 0.25, Math.cos(u * 3) * 0.22, Math.sin(u * 4) * 0.24));
  }
  const chromatin = organicTube(chromPts, 0.02, {
    color: '#9a3b2a', outline: 0.008, gloss: 0.5, closed: true, tubularSegments: 72,
  });
  nucGroup.add(nucShell.group, nucleolus.group, chromatin.group);
  for (let i = 0; i < 10; i++) {
    const phi = Math.acos(1 - 2 * ((i + 0.5) / 10));
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    const pore = inked(new THREE.TorusGeometry(0.055, 0.016, 8, 16), { color: '#6b4970', outline: 0.006 });
    const dir = new THREE.Vector3(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta));
    pore.group.position.copy(dir).multiplyScalar(0.45);
    pore.group.lookAt(dir.clone().multiplyScalar(2));
    nucGroup.add(pore.group);
  }
  meshes.nucleus = nucGroup;
  registerMat('nucleus', nucShell.mesh.material as THREE.ShaderMaterial);

  // 2. מיטוכונדריה עם מעטפת חיצונית שקופה למחצה וקפלי קריסטה בפנים
  const mito = new THREE.Group();
  [
    { pos: [0.64, 0.36, 0.26], rot: 0.6, s: 1.0 },
    { pos: [0.50, -0.42, -0.22], rot: -0.5, s: 0.9 },
  ].forEach(({ pos, rot, s }) => {
    const mg = new THREE.Group();
    const outer = inked(new THREE.CapsuleGeometry(0.16 * s, 0.34 * s, 14, 22), {
      color: '#d98a3d', opacity: 0.58, outline: 0.014, subsurface: 0.9, gloss: 0.6, wobble: 0.01,
    });
    const inner = inked(new THREE.TorusKnotGeometry(0.095 * s, 0.025 * s, 48, 8, 2, 3), {
      color: '#9a3b2a', outline: 0.008, gloss: 0.6,
    });
    inner.group.scale.set(1, 1.6, 1);
    mg.add(outer.group, inner.group);
    mg.position.set(pos[0], pos[1], pos[2]);
    mg.rotation.z = rot;
    mito.add(mg);
    registerMat('mito', outer.mesh.material as THREE.ShaderMaterial);
    upgrade(stage, mg, 'mitochondria', { size: 0.62 * s, rotation: [0, 0, Math.PI / 2], subsurface: 0.9, gloss: 0.6 })
      .then((m) => m?.materials.forEach((mat) => registerMat('mito', mat)));
  });
  meshes.mito = mito;

  // 3. רשתית תוך-פלזמית (ER) עם ריבוזומים + מערכת גולג׳י
  const erGroup = new THREE.Group();
  erGroup.position.set(-0.38, -0.36, 0.28);
  const erFold = inked(new THREE.TorusKnotGeometry(0.28, 0.055, 64, 12, 2, 3), {
    color: '#6fa3c7', outline: 0.012, subsurface: 0.85, gloss: 0.55, wobble: 0.012,
  });
  erGroup.add(erFold.group);
  registerMat('er', erFold.mesh.material as THREE.ShaderMaterial);
  // גולג׳י צמוד
  for (let k = -1; k <= 1; k++) {
    const cist = inked(new THREE.CylinderGeometry(0.2, 0.2, 0.045, 20), {
      color: '#e6b86a', outline: 0.01, subsurface: 0.85, gloss: 0.55,
    });
    cist.group.position.set(0.32, k * 0.09, -0.15);
    cist.group.rotation.z = -0.35;
    erGroup.add(cist.group);
    registerMat('er', cist.mesh.material as THREE.ShaderMaterial);
  }
  meshes.er = erGroup;

  // 4. ליזוזום (עם אנזימים פנימיים)
  const lysoGroup = new THREE.Group();
  lysoGroup.position.set(0.15, 0.54, -0.28);
  const lysoShell = inked(new THREE.SphereGeometry(0.22, 24, 18), {
    color: '#d96a5b', opacity: 0.65, outline: 0.014, subsurface: 0.9, gloss: 0.65, wobble: 0.015,
  });
  lysoGroup.add(lysoShell.group);
  for (let i = 0; i < 6; i++) {
    const enz = inked(new THREE.IcosahedronGeometry(0.04, 1), { color: '#f0b849', outline: 0.006 });
    enz.group.position.set((rnd() - 0.5) * 0.18, (rnd() - 0.5) * 0.18, (rnd() - 0.5) * 0.18);
    lysoGroup.add(enz.group);
  }
  meshes.lyso = lysoGroup;
  registerMat('lyso', lysoShell.mesh.material as THREE.ShaderMaterial);
  const lysoSlot = new THREE.Group();
  lysoGroup.add(lysoSlot);
  upgrade(stage, lysoSlot, 'lysosome', { size: 0.46, subsurface: 0.9, gloss: 0.65 }).then((m) => {
    if (!m) return;
    lysoGroup.children.forEach((c) => { if (c !== lysoSlot) c.visible = false; });
    lysoSlot.children.forEach((c) => (c.visible = c === m.group));
    m.materials.forEach((mat) => registerMat('lyso', mat));
  });

  // 5. חלולית מרכזית (תא צמח)
  const vacuole = inked(new THREE.SphereGeometry(0.65, 36, 26), {
    color: '#88b9dc', opacity: 0.42, rim: 0.9, subsurface: 0.95, gloss: 0.75, wobble: 0.018, wobbleFreq: 2.2,
  });
  vacuole.group.scale.set(1.05, 0.82, 0.85);
  vacuole.group.position.set(0.22, -0.04, 0);
  meshes.vacuole = vacuole.group;
  registerMat('vacuole', vacuole.mesh.material as THREE.ShaderMaterial);

  // 6. כלורופלסטים עם דיסקיות תילקואידים (גרנה) בפנים
  const chloro = new THREE.Group();
  [[-0.86, -0.45, -0.35], [0.86, 0.48, -0.28], [0.88, -0.42, 0.35]].forEach(([x, y, z]) => {
    const cg = new THREE.Group();
    const cShell = inked(new THREE.SphereGeometry(0.25, 24, 16), {
      color: '#5f9440', opacity: 0.55, outline: 0.012, subsurface: 0.9, gloss: 0.6,
    });
    cShell.group.scale.set(1.25, 0.58, 0.85);
    cg.add(cShell.group);
    for (let s = -1; s <= 1; s++) {
      const granum = inked(new THREE.CylinderGeometry(0.065, 0.065, 0.16, 12), {
        color: '#2e591c', outline: 0.006, gloss: 0.5,
      });
      granum.group.position.set(s * 0.11, 0, 0);
      cg.add(granum.group);
    }
    cg.position.set(x, y, z);
    chloro.add(cg);
    registerMat('chloro', cShell.mesh.material as THREE.ShaderMaterial);
    upgrade(stage, cg, 'chloroplast', { size: 0.62, subsurface: 0.9, gloss: 0.6 })
      .then((m) => m?.materials.forEach((mat) => registerMat('chloro', mat)));
  });
  meshes.chloro = chloro;

  root.add(animalMem.group, plantGroup, nucGroup, mito, erGroup, lysoGroup, vacuole.group, chloro);

  let cellType: 'animal' | 'plant' = 'plant';
  let cityMode = false;
  let activeId = 'nucleus';
  const visited = new Set<string>();
  let met = false, disposed = false;

  api.jars.add('seen', 'אברונים שנבדקו', '#9cc0de');
  api.jars.add('atp', 'ייצור ATP', '#d98a3d');
  api.jars.add('water', 'אגירת מים', '#9ab89e');

  const badge = document.createElement('div');
  badge.className = 'badge';
  const status = document.createElement('div');
  status.className = 'badge badge-status';
  api.overlay.append(badge, status);

  function focusActive(zoomIn = true) {
    const info = ORGANELLES.find((o) => o.id === activeId)!;
    if (zoomIn) {
      stage.focusOn(info.camPos, info.lookAt);
    } else {
      stage.focusOn([0, 2.3, 6.0], [0, 0, 0]);
    }
  }

  function syncScene(t = 0) {
    animalMem.group.visible = cellType === 'animal';
    plantGroup.visible = cellType === 'plant';
    vacuole.group.visible = cellType === 'plant';
    chloro.visible = cellType === 'plant';

    Object.entries(meshes).forEach(([id, obj]) => {
      const isSelected = id === activeId;
      const pulse = isSelected ? 1 + Math.sin(t * 5.5) * 0.08 : 1;
      if (id === 'vacuole') {
        obj.scale.set(1.05 * pulse, 0.82 * pulse, 0.85 * pulse);
      } else {
        obj.scale.setScalar(pulse);
      }
      (highlightMats[id] ?? []).forEach((mat) => {
        mat.uniforms.uPulse.value = isSelected ? 0.55 + 0.45 * Math.sin(t * 6.0) : 0;
      });
    });

    const info = ORGANELLES.find((o) => o.id === activeId)!;
    badge.innerHTML = cityMode
      ? `<b>${info.name}</b> = <b>${info.city}</b>`
      : `<b>${info.name}</b> (${cellType === 'plant' ? 'תא צמח' : 'תא בעל חיים'})`;
    status.innerHTML = info.role;
    api.jars.set('seen', visited.size / ORGANELLES.length, `${visited.size}/${ORGANELLES.length}`);
    api.jars.set('atp', 0.85, 'מיטוכונדריה');
    api.jars.set('water', cellType === 'plant' ? 0.9 : 0.35, cellType === 'plant' ? 'חלולית מלאה' : 'ללא חלולית');
  }

  stage.onTick((dt, t) => {
    if (disposed || dt <= 0) return;
    root.rotation.y = Math.sin(t * 0.35) * 0.22;
    chromatin.group.rotation.y = t * 0.25;
    syncScene(t);
  });

  api.controls.innerHTML = `
    <div class="seg" role="group" aria-label="סוג תא">
      <button type="button" data-cell="plant" aria-pressed="true">תא צמח</button>
      <button type="button" data-cell="animal" aria-pressed="false">תא בעל חיים</button>
    </div>
    <button type="button" class="btn" data-act="city" aria-pressed="false">אנלוגיית העיר</button>
    <div class="org-chips" style="display:flex;flex-wrap:wrap;gap:6px;width:100%"></div>`;

  const cellBtns = [...api.controls.querySelectorAll<HTMLButtonElement>('[data-cell]')];
  const cityBtn = api.controls.querySelector<HTMLButtonElement>('[data-act=city]')!;
  const chipsBox = api.controls.querySelector('.org-chips')!;

  const renderChips = () => {
    chipsBox.innerHTML = '';
    for (const o of ORGANELLES) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.dataset.org = o.id;
      b.setAttribute('aria-pressed', String(activeId === o.id));
      b.textContent = visited.has(o.id) ? `✓ ${o.name}` : o.name;
      b.addEventListener('click', () => {
        activeId = o.id;
        if (o.plantOnly && cellType !== 'plant') {
          cellType = 'plant';
          cellBtns.forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.cell === 'plant')));
        }
        visited.add(o.id);
        renderChips();
        syncScene();
        focusActive(true);
        if (visited.size >= ORGANELLES.length && !met) {
          met = true;
          api.challengeMet();
        }
      });
      chipsBox.append(b);
    }
  };
  renderChips();

  cellBtns.forEach((b) => b.addEventListener('click', () => {
    cellType = b.dataset.cell as 'animal' | 'plant';
    cellBtns.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    syncScene();
    stage.focusOn([0, 2.3, 6.0], [0, 0, 0]);
  }));
  cityBtn.addEventListener('click', () => {
    cityMode = !cityMode;
    cityBtn.setAttribute('aria-pressed', String(cityMode));
    syncScene();
  });

  syncScene();

  const stepOrgs = ['nucleus', 'mito', 'er', 'vacuole', 'chloro'];
  return {
    async playStep(i) {
      stage.controls.enabled = false;
      activeId = stepOrgs[i] ?? 'nucleus';
      cellType = i >= 3 ? 'plant' : 'animal';
      syncScene();
      focusActive(true);
      await stage.wait(3000);
    },
    enterTry() {
      stage.controls.enabled = true;
      cellType = 'plant';
      syncScene();
      stage.focusOn([0, 2.3, 6.0], [0, 0, 0]);
    },
    enterDemo() {
      stage.controls.enabled = false;
      activeId = 'nucleus';
      syncScene();
      focusActive(true);
    },
    dispose() {
      disposed = true;
      badge.remove();
      status.remove();
    },
  };
};

export default factory;

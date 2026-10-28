/**
 * שיעור 4: סיור באברוני התא.
 * תא בעל חיים ותא צמח בתלת-ממד, עם אנלוגיית העיר, לחיצה על כל אברון,
 * ואתגר היכרות עם כל 6 האברונים.
 */
import * as THREE from 'three';
import type { DemoFactory } from './types';
import { inked, sketchLines } from '../render/ink';

interface OrganelleInfo {
  id: string;
  name: string;
  city: string;
  role: string;
  plantOnly?: boolean;
}

const ORGANELLES: OrganelleInfo[] = [
  { id: 'nucleus', name: 'גרעין התא', city: 'העירייה והארכיון', role: 'שומר על ה-DNA ומנפיק הוראות (mRNA) לבניית חלבונים.' },
  { id: 'mito', name: 'מיטוכונדריה', city: 'תחנת הכוח', role: 'מבצעת נשימה תאית ומפיקה אנרגיה זמינה (ATP) – גם בצמח וגם בבעל חיים!' },
  { id: 'er', name: 'רשתית תוך-פלזמית וגולג׳י', city: 'בית החרושת והדואר', role: 'ייצור חלבונים ושומנים, עיבודם ואריזתם בשלפוחיות.' },
  { id: 'lyso', name: 'ליזוזום', city: 'מכון המיחזור', role: 'מפרק חומרים ואברונים ישנים בעזרת אנזימי פירוק.' },
  { id: 'vacuole', name: 'חלולית ודופן תאית', city: 'מאגר המים והחומה', role: 'החלולית אוגרת מים ולוחצת על הדופן הקשיחה (טורגור).', plantOnly: true },
  { id: 'chloro', name: 'כלורופלסט', city: 'הפאנל הסולארי', role: 'קולט אנרגיית אור ומייצר גלוקוז וחמצן בפוטוסינתזה.', plantOnly: true },
];

const factory: DemoFactory = (api) => {
  const { stage } = api;
  stage.camera.position.set(0, 2.3, 6.2);
  stage.setShadow(-1.4, 5.2, 3.2);

  const root = new THREE.Group();
  stage.add(root);

  const animalMem = inked(new THREE.SphereGeometry(1.45, 40, 28), { color: '#e6b8a2', opacity: 0.32, rim: 0.95 });
  const plantWall = inked(new THREE.BoxGeometry(2.9, 1.85, 2.0), { color: '#a7bd84', opacity: 0.25, rim: 0.9 });
  const wallWire = sketchLines([
    -1.45, -0.92, -1, 1.45, -0.92, -1, 1.45, -0.92, -1, 1.45, -0.92, 1,
    1.45, -0.92, 1, -1.45, -0.92, 1, -1.45, -0.92, 1, -1.45, -0.92, -1,
    -1.45, 0.92, -1, 1.45, 0.92, -1, 1.45, 0.92, -1, 1.45, 0.92, 1,
    1.45, 0.92, 1, -1.45, 0.92, 1, -1.45, 0.92, 1, -1.45, 0.92, -1,
  ], 0.015, '#3f5a2a');
  plantWall.group.add(wallWire);

  const meshes: Record<string, THREE.Object3D> = {};
  const nuc = inked(new THREE.SphereGeometry(0.45, 24, 18), { color: '#c7a4c9', outline: 0.018 });
  nuc.group.position.set(-0.55, 0.18, 0);
  meshes.nucleus = nuc.group;

  const mito = new THREE.Group();
  const m1 = inked(new THREE.CapsuleGeometry(0.15, 0.32, 10, 16), { color: '#d98a3d', outline: 0.014 });
  m1.group.position.set(0.62, 0.35, 0.25); m1.group.rotation.z = 0.6;
  const m2 = inked(new THREE.CapsuleGeometry(0.14, 0.28, 10, 16), { color: '#d98a3d', outline: 0.014 });
  m2.group.position.set(0.48, -0.42, -0.2); m2.group.rotation.z = -0.5;
  mito.add(m1.group, m2.group);
  meshes.mito = mito;

  const er = inked(new THREE.TorusKnotGeometry(0.32, 0.055, 56, 10, 2, 3), { color: '#7fa6cc', outline: 0.012 });
  er.group.position.set(-0.35, -0.36, 0.3);
  meshes.er = er.group;

  const lyso = inked(new THREE.SphereGeometry(0.2, 18, 14), { color: '#d96a5b', outline: 0.014 });
  lyso.group.position.set(0.15, 0.52, -0.35);
  meshes.lyso = lyso.group;

  const vacuole = inked(new THREE.BoxGeometry(1.15, 0.95, 0.95), { color: '#9cc0de', opacity: 0.42, rim: 0.85 });
  vacuole.group.position.set(0.22, -0.05, 0);
  meshes.vacuole = vacuole.group;

  const chloro = new THREE.Group();
  [[-0.85, -0.45, -0.35], [0.85, 0.48, -0.3], [0.88, -0.42, 0.35]].forEach(([x, y, z]) => {
    const c = inked(new THREE.SphereGeometry(0.22, 18, 12), { color: '#5f9440', outline: 0.012 });
    c.group.scale.set(1.2, 0.55, 0.8);
    c.group.position.set(x, y, z);
    chloro.add(c.group);
  });
  meshes.chloro = chloro;

  root.add(animalMem.group, plantWall.group, nuc.group, mito, er.group, lyso.group, vacuole.group, chloro);

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

  function syncScene(t = 0) {
    animalMem.group.visible = cellType === 'animal';
    plantWall.group.visible = cellType === 'plant';
    vacuole.group.visible = cellType === 'plant';
    chloro.visible = cellType === 'plant';
    Object.entries(meshes).forEach(([id, obj]) => {
      const pulse = id === activeId ? 1 + Math.sin(t * 6) * 0.08 : 1;
      obj.scale.setScalar(pulse);
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
    root.rotation.y = Math.sin(t * 0.35) * 0.3;
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
      await stage.wait(3000);
    },
    enterTry() {
      stage.controls.enabled = true;
      cellType = 'plant';
      syncScene();
    },
    enterDemo() {
      stage.controls.enabled = false;
      activeId = 'nucleus';
      syncScene();
    },
    dispose() {
      disposed = true;
      badge.remove();
      status.remove();
    },
  };
};

export default factory;

/**
 * ספריית המודלים מ-Sketchfab (CC-BY/CC0): טוען GLB מכווץ (meshopt) מ-public/models
 * וצובע אותו מחדש בשיידר הדיו של הספר, כדי שהמודל הריאליסטי ייראה כמו שאר האיורים
 * (hatching, קו מתאר, פיזור תת-משטחי וגליות ביולוגית). אנימציות מובנות רצות ב-AnimationMixer.
 * אם המודל לא קיים (למשל לפני שהורדו המודלים) – מוחזר null וההדגמה משתמשת במודל הפרוצדורלי.
 */
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { inkMaterial, outlineMaterial, type InkOptions } from './ink';

export interface ModelCredit {
  id: string; name: string; author: string; authorUrl: string; url: string; license: string; licenseUrl: string; usedIn: string;
}

const base = import.meta.env.BASE_URL + 'models/';
let creditsP: Promise<ModelCredit[]> | null = null;
export function modelCredits(): Promise<ModelCredit[]> {
  creditsP ??= fetch(base + 'credits.json').then((r) => (r.ok ? r.json() : [])).catch(() => []);
  return creditsP;
}

const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
const cache = new Map<string, Promise<GLTF | null>>();

function sampleTextureColor(tex: THREE.Texture | null | undefined): THREE.Color | null {
  const img = tex?.image as (CanvasImageSource & { width: number; height: number }) | undefined;
  if (!img || !img.width) return null;
  try {
    const c = document.createElement('canvas');
    c.width = c.height = 8;
    const g = c.getContext('2d')!;
    g.drawImage(img, 0, 0, 8, 8);
    const d = g.getImageData(0, 0, 8, 8).data;
    let r = 0, gg = 0, b = 0;
    for (let i = 0; i < d.length; i += 4) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; }
    const n = d.length / 4;
    return new THREE.Color().setRGB(r / n / 255, gg / n / 255, b / n / 255, THREE.SRGBColorSpace);
  } catch { return null; }
}

export interface ModelOptions extends InkOptions {
  /** גודל היעד (הממד הגדול ביותר) ביחידות הסצנה. */
  size?: number;
  /** לשמור את החומרים המקוריים (PBR) במקום צביעה בדיו. */
  keepMaterials?: boolean;
  /** צבע אחיד לכל המודל במקום הצבעים המקוריים. */
  tint?: THREE.ColorRepresentation;
}

export interface LoadedModel {
  group: THREE.Group;
  mixer: THREE.AnimationMixer | null;
  materials: THREE.ShaderMaterial[];
  credit: ModelCredit | undefined;
}

export async function loadModel(id: string, o: ModelOptions = {}): Promise<LoadedModel | null> {
  const credits = await modelCredits();
  const credit = credits.find((c) => c.id === id);
  if (!credit) return null;
  if (!cache.has(id)) cache.set(id, loader.loadAsync(base + `${id}.glb`).catch(() => null));
  const gltf = await cache.get(id)!;
  if (!gltf) return null;

  const animated = gltf.animations.length > 0;
  const src = gltf.scene;
  const scene = (animated ? src : src.clone(true)) as THREE.Group;
  scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(scene);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const k = (o.size ?? 1) / Math.max(size.x, size.y, size.z, 1e-6);
  const group = new THREE.Group();
  group.userData.credit = credit;
  const materials: THREE.ShaderMaterial[] = [];

  const makeMat = (orig: THREE.MeshStandardMaterial | undefined) => {
    let col = o.tint ? new THREE.Color(o.tint) : orig?.color?.clone() ?? new THREE.Color('#efe6d2');
    if (!o.tint && orig?.map) {
      const t = sampleTextureColor(orig.map);
      if (t) col = t.multiply(orig.color ?? new THREE.Color(1, 1, 1));
    }
    // משטחי חיתוך שחורים / טקסטורות כהות נראים כמו כתם דיו – מבהירים אותם לגוון "נייר" של הספר
    const hsl = { h: 0, s: 0, l: 0 };
    col.getHSL(hsl);
    if (hsl.l < 0.34) col.setHSL(hsl.h, Math.min(hsl.s, 0.55), 0.34 + hsl.l * 0.4);
    const opacity = o.opacity ?? (orig?.transparent ? Math.max(0.3, orig.opacity) : 1);
    return { col, opacity };
  };

  if (!animated && !o.keepMaterials) {
    // "אופים" את כל הטרנספורמציות לגיאומטריה, כדי שהגליות וקו המתאר יהיו ביחידות הסצנה
    const bake = new THREE.Matrix4().makeScale(k, k, k).multiply(new THREE.Matrix4().makeTranslation(-center.x, -center.y, -center.z));
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const geo = mesh.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(bake, mesh.matrixWorld));
      if (!geo.attributes.normal) geo.computeVertexNormals();
      const { col, opacity } = makeMat((Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshStandardMaterial);
      const mat = inkMaterial({ ...o, color: col, opacity, wobble: o.wobble ?? 0.006 });
      materials.push(mat);
      const m = new THREE.Mesh(geo, mat);
      group.add(m);
      if (opacity >= 1 && (o.outline ?? 0.012) > 0) {
        const ol = new THREE.Mesh(geo, outlineMaterial(o.outline ?? 0.012, 1, o.wobble ?? 0.006));
        ol.renderOrder = -1;
        group.add(ol);
      }
    });
  } else {
    if (!o.keepMaterials) {
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (!mesh.isMesh) return;
        const { col, opacity } = makeMat((Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshStandardMaterial);
        if ((mesh as THREE.SkinnedMesh).isSkinnedMesh || mesh.morphTargetInfluences) {
          // שיידר הדיו לא תומך ב-skinning: חומר רגיל במראה דומה
          mesh.material = new THREE.MeshStandardMaterial({ color: col, roughness: 0.55, transparent: opacity < 1, opacity });
          return;
        }
        const mat = inkMaterial({ ...o, color: col, opacity, wobble: 0 });
        mesh.material = mat;
        materials.push(mat);
      });
    }
    scene.position.sub(center);
    const holder = new THREE.Group();
    holder.add(scene);
    holder.scale.setScalar(k);
    group.add(holder);
  }

  let mixer: THREE.AnimationMixer | null = null;
  if (gltf.animations.length) {
    mixer = new THREE.AnimationMixer(scene);
    for (const clip of gltf.animations) mixer.clipAction(clip).play();
  }
  return { group, mixer, materials, credit };
}

/**
 * מחליף "משבצת" פרוצדורלית במודל מ-Sketchfab כשהוא קיים: מסתיר את הילדים הקיימים,
 * מוסיף את המודל (בגודל size), מריץ את האנימציה שלו, ומוסיף קרדיט ליוצר מתחת לאיור.
 */
export function upgrade(
  stage: { onTick(fn: (dt: number, t: number) => void): unknown; host: HTMLElement | null; root: THREE.Object3D },
  slot: THREE.Object3D,
  id: string,
  o: ModelOptions & { offset?: [number, number, number]; rotation?: [number, number, number] } = {},
): Promise<LoadedModel | null> {
  return loadModel(id, o).then((m) => {
    let p: THREE.Object3D | null = slot;
    while (p && p !== stage.root) p = p.parent;
    if (!m || !p) return null;
    slot.children.forEach((c) => (c.visible = false));
    if (o.offset) m.group.position.set(...o.offset);
    if (o.rotation) m.group.rotation.set(...o.rotation);
    slot.add(m.group);
    if (m.mixer) stage.onTick((dt) => m.mixer!.update(dt));
    const host = stage.host;
    if (host && m.credit) {
      let box = host.querySelector<HTMLElement>('.model-credits');
      if (!box) {
        box = document.createElement('div');
        box.className = 'model-credits';
        host.append(box);
      }
      if (!box.querySelector(`[data-id="${id}"]`)) {
        const a = document.createElement('a');
        a.dataset.id = id;
        a.href = m.credit.url;
        a.target = '_blank';
        a.rel = 'noopener';
        a.innerHTML = `<bdi>“${m.credit.name}” · ${m.credit.author} · ${m.credit.license}</bdi>`;
        box.append(a);
      }
    }
    return m;
  });
}

/**
 * הבמה התלת-ממדית של כל הדגמה. היא כבר לא מציירת לקנבס משלה:
 * היא מרנדרת ל-Render Target (HDR) בעזרת ה-renderer של העולם, והעולם מציג אותה ככרטיס
 * שמתרומם מהדף – בתוך אותה סצנה, עם אותו Bloom וצל על הנייר (כמו ב-Every Joule).
 * - מצלמה עם תנועת קפיץ מרוסנת ונשימה עדינה
 * - חלקיקי ציטופלזמה מרחפים (Brownian motes) לעומק ופרלקסה
 * - עדכון אוטומטי של uTime לתנודות אורגניות של קרומים ואברונים
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { animatedMaterials, disposeTree, mulberry32, Spring3D } from './ink';

type Ticker = (dt: number, t: number) => void;

export function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!c.getContext('webgl2');
  } catch {
    return false;
  }
}

const MOTE_COUNT = 95;

export class Stage3D {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  readonly controls: OrbitControls;
  /** כל תוכן ההדגמה נכנס לקבוצה הזאת. */
  readonly root = new THREE.Group();
  /** הפלט: טקסטורת HDR שהעולם מציג ככרטיס על הדף. */
  readonly target: THREE.WebGLRenderTarget;
  /** כמה פיקסלים האיור רשאי לחרוג ממסגרת הבמה כשהוא "קם" מהדף. */
  readonly margin = 34;
  /** 0 = עצור, 1 = מהירות רגילה. */
  timeScale = 1;
  still = false;
  host: HTMLElement | null = null;
  /** העולם מאזין כדי להפעיל את אנימציית השרטוט והקימה. */
  onLift: (() => void) | null = null;
  onFlatten: (() => void) | null = null;

  private tickers = new Set<Ticker>();
  private waits: { left: number; resolve: () => void }[] = [];
  private shadow: THREE.Mesh;
  private motes: THREE.Points;
  private moteBase: Float32Array;
  private camSpring = new Spring3D(new THREE.Vector3(0, 2.3, 6.2), 9, 4.8);
  private lookSpring = new Spring3D(new THREE.Vector3(0, 0, 0), 11, 5.2);
  private camGuided = true;
  private userDragging = false;
  private time = 0;
  private size = new THREE.Vector2(1, 1);
  private dpr = Math.min(devicePixelRatio || 1, 2);
  private dummy = document.createElement('div');

  constructor() {
    this.target = new THREE.WebGLRenderTarget(4, 4, {
      type: THREE.HalfFloatType,
      samples: 4,
      depthBuffer: true,
    });
    this.scene.add(this.root);
    const amb = new THREE.HemisphereLight(0xfff6e8, 0x6b5d4a, 1.4);
    const sun = new THREE.DirectionalLight(0xffffff, 1.6);
    sun.position.set(-2, 4, 3);
    this.scene.add(amb, sun);

    this.controls = new OrbitControls(this.camera, this.dummy);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = false;
    this.controls.minDistance = 2.4;
    this.controls.maxDistance = 12;
    this.controls.minPolarAngle = 0.25;
    this.controls.maxPolarAngle = 1.5;
    this.controls.addEventListener('start', () => { this.userDragging = true; this.camGuided = false; });
    this.controls.addEventListener('end', () => { this.userDragging = false; });

    // צל רך מתחת לאובייקט
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d')!;
    const grad = g.createRadialGradient(64, 64, 4, 64, 64, 64);
    grad.addColorStop(0, 'rgba(28,36,51,0.34)');
    grad.addColorStop(0.6, 'rgba(28,36,51,0.12)');
    grad.addColorStop(1, 'rgba(28,36,51,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    this.shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }),
    );
    this.shadow.rotation.x = -Math.PI / 2;
    this.scene.add(this.shadow);

    // חלקיקי סביבה מימית
    const rnd = mulberry32(42);
    const pos = new Float32Array(MOTE_COUNT * 3);
    for (let i = 0; i < MOTE_COUNT; i++) {
      pos[i * 3] = (rnd() - 0.5) * 6.5;
      pos[i * 3 + 1] = (rnd() - 0.5) * 3.4;
      pos[i * 3 + 2] = (rnd() - 0.5) * 4.2;
    }
    this.moteBase = pos.slice();
    const moteGeo = new THREE.BufferGeometry();
    moteGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const dotCanvas = document.createElement('canvas');
    dotCanvas.width = dotCanvas.height = 32;
    const dg = dotCanvas.getContext('2d')!;
    const dGrad = dg.createRadialGradient(16, 16, 1, 16, 16, 15);
    dGrad.addColorStop(0, 'rgba(60, 95, 130, 0.55)');
    dGrad.addColorStop(0.5, 'rgba(60, 95, 130, 0.22)');
    dGrad.addColorStop(1, 'rgba(60, 95, 130, 0)');
    dg.fillStyle = dGrad;
    dg.fillRect(0, 0, 32, 32);
    this.motes = new THREE.Points(moteGeo, new THREE.PointsMaterial({
      size: 0.14, map: new THREE.CanvasTexture(dotCanvas), transparent: true, depthWrite: false, opacity: 0.65,
    }));
    this.scene.add(this.motes);

    this.reset();
  }

  /** מחבר את הבמה למסגרת שלה בדף (אזור הגרירה של OrbitControls ומיקום הכרטיס). */
  attach(host: HTMLElement) {
    this.host = host;
    this.controls.disconnect();
    (this.controls as unknown as { domElement: HTMLElement }).domElement = host;
    this.controls.connect();
    host.style.touchAction = 'none';
  }

  setShadow(y: number, sx: number, sz: number) {
    this.shadow.position.set(0, y, 0);
    this.shadow.scale.set(sx, sz, 1);
  }

  /** תנועת מצלמה קולנועית: מחליקה את המצלמה ואת נקודת המבט בעזרת קפיץ מרוסן. */
  focusOn(camPos: [number, number, number], lookAt: [number, number, number] = [0, 0, 0], instant = false) {
    this.camGuided = true;
    this.camSpring.pos.copy(this.camera.position);
    this.lookSpring.pos.copy(this.controls.target);
    if (instant || this.still) {
      this.camSpring.snap(camPos[0], camPos[1], camPos[2]);
      this.lookSpring.snap(lookAt[0], lookAt[1], lookAt[2]);
      this.camera.position.set(camPos[0], camPos[1], camPos[2]);
      this.controls.target.set(lookAt[0], lookAt[1], lookAt[2]);
    } else {
      this.camSpring.target.set(camPos[0], camPos[1], camPos[2]);
      this.lookSpring.target.set(lookAt[0], lookAt[1], lookAt[2]);
    }
  }

  /** האיור משורטט בעט על הדף ואז "קם" ממנו (האנימציה עצמה בעולם). */
  lift() { this.onLift?.(); }
  /** משאיר את האיור שטוח על הדף (לפני ה-lift). */
  flatten() { this.onFlatten?.(); }

  add(...objs: THREE.Object3D[]) { this.root.add(...objs); return objs[0]; }

  onTick(fn: Ticker) { this.tickers.add(fn); return () => this.tickers.delete(fn); }

  /** מחכה זמן "של הסצנה": נעצר כשההדגמה בהשהיה. */
  wait(ms: number): Promise<void> {
    return new Promise((resolve) => this.waits.push({ left: ms / 1000, resolve }));
  }

  reset() {
    for (const c of [...this.root.children]) { this.root.remove(c); disposeTree(c); }
    this.tickers.clear();
    this.waits.forEach((w) => w.resolve());
    this.waits = [];
    this.timeScale = 1;
    this.controls.enabled = false;
    this.userDragging = false;
    this.focusOn([0, 2.3, 6.2], [0, 0, 0], true);
    this.controls.update();
    this.setShadow(-1.4, 4, 2.5);
  }

  private resize(renderer: THREE.WebGLRenderer) {
    if (!this.host) return;
    const r = this.host.getBoundingClientRect();
    const w = Math.max(2, Math.round(r.width)), h = Math.max(2, Math.round(r.height));
    if (w === this.size.x && h === this.size.y) return;
    this.size.set(w, h);
    const m = this.margin;
    this.target.setSize(Math.round((w + 2 * m) * this.dpr), Math.round((h + 2 * m) * this.dpr));
    this.camera.aspect = w / h;
    this.camera.zoom = Math.min(1, (w / h) / 1.1);
    // המסגרת הפנימית = המצלמה הרגילה; הכרטיס מרונדר עם שוליים סביבה, כדי שהאיור יוכל לחרוג מהמסגרת
    this.camera.setViewOffset(w, h, -m, -m, w + 2 * m, h + 2 * m);
    this.camera.updateProjectionMatrix();
    void renderer;
  }

  /** נקרא מלולאת העולם בכל פריים. */
  frame(renderer: THREE.WebGLRenderer, raw: number) {
    if (!this.host || !this.host.isConnected) return;
    this.resize(renderer);
    const dt = (this.still ? 0 : raw) * this.timeScale;
    this.time += dt;
    for (const mat of animatedMaterials) if (mat.uniforms.uTime) mat.uniforms.uTime.value = this.time;

    if (dt > 0) {
      const attr = this.motes.geometry.getAttribute('position') as THREE.BufferAttribute;
      const arr = attr.array as Float32Array;
      for (let i = 0; i < MOTE_COUNT; i++) {
        arr[i * 3] = this.moteBase[i * 3] + Math.sin(this.time * 0.65 + i * 1.3) * 0.18;
        arr[i * 3 + 1] = this.moteBase[i * 3 + 1] + Math.cos(this.time * 0.55 + i * 0.9) * 0.16;
        arr[i * 3 + 2] = this.moteBase[i * 3 + 2] + Math.sin(this.time * 0.45 + i * 1.7) * 0.15;
      }
      attr.needsUpdate = true;
    }

    if (this.camGuided && !this.userDragging && dt > 0) {
      this.camSpring.step(Math.min(0.05, dt));
      this.lookSpring.step(Math.min(0.05, dt));
      this.camera.position.set(
        this.camSpring.pos.x + Math.sin(this.time * 0.55) * 0.06,
        this.camSpring.pos.y + Math.cos(this.time * 0.42) * 0.04,
        this.camSpring.pos.z,
      );
      this.controls.target.copy(this.lookSpring.pos);
    }

    if (dt > 0) {
      for (const w of this.waits) w.left -= dt;
      const done = this.waits.filter((w) => w.left <= 0);
      this.waits = this.waits.filter((w) => w.left > 0);
      done.forEach((w) => w.resolve());
    }
    this.tickers.forEach((f) => f(dt, this.time));
    this.controls.update();
    this.render(renderer);
  }

  private render(renderer: THREE.WebGLRenderer) {
    const prevTarget = renderer.getRenderTarget();
    const prevClear = renderer.getClearColor(new THREE.Color());
    const prevAlpha = renderer.getClearAlpha();
    renderer.setRenderTarget(this.target);
    renderer.setClearColor(0x000000, 0);
    renderer.clear(true, true, false);
    renderer.render(this.scene, this.camera);
    renderer.setRenderTarget(prevTarget);
    renderer.setClearColor(prevClear, prevAlpha);
  }

  /** תמונה של הבמה (רק המסגרת הפנימית), לדף המתהפך. */
  snapshot(renderer: THREE.WebGLRenderer): HTMLCanvasElement | null {
    if (!this.host) return null;
    const W = this.target.width, H = this.target.height;
    if (W < 4 || H < 4) return null;
    const plain = new THREE.WebGLRenderTarget(W, H, { type: THREE.UnsignedByteType });
    const prevTarget = renderer.getRenderTarget();
    renderer.setRenderTarget(plain);
    renderer.setClearColor(0x000000, 0);
    renderer.clear(true, true, false);
    renderer.render(this.scene, this.camera);
    const px = new Uint8Array(W * H * 4);
    renderer.readRenderTargetPixels(plain, 0, 0, W, H, px);
    renderer.setRenderTarget(prevTarget);
    plain.dispose();
    const full = document.createElement('canvas');
    full.width = W; full.height = H;
    const g = full.getContext('2d')!;
    const img = g.createImageData(W, H);
    for (let y = 0; y < H; y++) {
      const src = (H - 1 - y) * W * 4;
      img.data.set(px.subarray(src, src + W * 4), y * W * 4);
    }
    // צבעים מוכפלים באלפא → רגילים
    for (let i = 0; i < img.data.length; i += 4) {
      const a = img.data[i + 3];
      if (a > 0 && a < 255) { const k = 255 / a; img.data[i] = Math.min(255, img.data[i] * k); img.data[i + 1] = Math.min(255, img.data[i + 1] * k); img.data[i + 2] = Math.min(255, img.data[i + 2] * k); }
    }
    g.putImageData(img, 0, 0);
    const m = Math.round(this.margin * this.dpr);
    const out = document.createElement('canvas');
    out.width = W - 2 * m; out.height = H - 2 * m;
    out.getContext('2d')!.drawImage(full, m, m, out.width, out.height, 0, 0, out.width, out.height);
    return out;
  }
}

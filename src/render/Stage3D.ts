/**
 * הבמה התלת-ממדית הקולנועית:
 * - מצלמה עם תנועת קפיץ מרוסנת (Spring-Damper Camera Choreography) ונשימה עדינה
 * - סביבה מימית חיה עם חלקיקי ציטופלזמה מרחפים (Brownian Motes) לעומק ופרלקסה
 * - עדכון אוטומטי של זמן ה-Shader (uTime) לתנודות אורגניות של קרומים ואברונים
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { animatedMaterials, disposeTree, mulberry32, Spring3D } from './ink';

type Ticker = (dt: number, t: number) => void;

export function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

const MOTE_COUNT = 95;

export class Stage3D {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  readonly controls: OrbitControls;
  /** כל תוכן ההדגמה נכנס לקבוצה הזאת, כדי שאפשר "להרים" אותו מהדף. */
  readonly root = new THREE.Group();
  /** 0 = עצור, 1 = מהירות רגילה. */
  timeScale = 1;
  still = false;

  private tickers = new Set<Ticker>();
  private waits: { left: number; resolve: () => void }[] = [];
  private shadow: THREE.Mesh;
  private motes: THREE.Points;
  private moteBase: Float32Array;
  private camSpring = new Spring3D(new THREE.Vector3(0, 2.3, 6.2), 9, 4.8);
  private lookSpring = new Spring3D(new THREE.Vector3(0, 0, 0), 11, 5.2);
  private camGuided = true;
  private userDragging = false;
  private liftT = 1;
  private host: HTMLElement | null = null;
  private ro = new ResizeObserver(() => this.resize());
  private last = performance.now();
  private time = 0;
  private running = false;

  constructor() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.domElement.className = 'stage-canvas';
    this.renderer.domElement.setAttribute('aria-hidden', 'true');
    this.scene.add(this.root);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = false;
    this.controls.minDistance = 2.4;
    this.controls.maxDistance = 12;
    this.controls.minPolarAngle = 0.25;
    this.controls.maxPolarAngle = 1.5;
    this.controls.addEventListener('start', () => { this.userDragging = true; this.camGuided = false; });
    this.controls.addEventListener('end', () => { this.userDragging = false; });

    // צל רך מתחת לאובייקט: מראה שהוא התרומם מהדף
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

    // חלקיקי סביבה מימית (Brownian cytoplasmic motes) לתחושת עומק וחיים
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

    this.motes = new THREE.Points(
      moteGeo,
      new THREE.PointsMaterial({
        size: 0.14,
        map: new THREE.CanvasTexture(dotCanvas),
        transparent: true,
        depthWrite: false,
        opacity: 0.65,
      }),
    );
    this.scene.add(this.motes);

    this.reset();
  }

  get canvas() { return this.renderer.domElement; }

  attach(host: HTMLElement) {
    if (this.host) this.ro.unobserve(this.host);
    this.host = host;
    host.appendChild(this.canvas);
    this.ro.observe(host);
    this.resize();
    if (!this.running) { this.running = true; this.last = performance.now(); requestAnimationFrame(this.loop); }
  }

  /** מגדיר את הצל: מרכז, גודל וגובה הרצפה. */
  setShadow(y: number, sx: number, sz: number) {
    this.shadow.position.set(0, y, 0);
    this.shadow.scale.set(sx, sz, 1);
  }

  /**
   * תנועת מצלמה קולנועית (בסגנון 3Blue1Brown / Drew Berry):
   * מחליקה את המצלמה ואת נקודת המבט בעזרת קפיץ מרוסן.
   */
  focusOn(
    camPos: [number, number, number],
    lookAt: [number, number, number] = [0, 0, 0],
    instant = false,
  ) {
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

  /** האנימציה שבה האיור "קם" מהדף: מתחיל שטוח כמו שרטוט, ומקבל נפח. */
  lift() {
    this.liftT = this.still ? 1 : 0;
    this.applyLift();
  }

  /** משאיר את האיור שטוח על הדף (לפני ה-lift). */
  flatten() { this.liftT = 0; this.applyLift(); }

  private applyLift() {
    const t = this.liftT;
    const e = t >= 1 ? 1 : 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2);
    this.root.scale.set(1, Math.max(0.02, e), 1);
    this.root.position.y = -0.4 * (1 - Math.min(1, e));
    (this.shadow.material as THREE.MeshBasicMaterial).opacity = Math.min(1, t * 1.4);
  }

  add(...objs: THREE.Object3D[]) { this.root.add(...objs); return objs[0]; }

  onTick(fn: Ticker) { this.tickers.add(fn); return () => this.tickers.delete(fn); }

  /** מחכה זמן "של הסצנה": נעצר כשההדגמה בהשהיה. */
  wait(ms: number): Promise<void> {
    return new Promise((resolve) => this.waits.push({ left: ms / 1000, resolve }));
  }

  /** מנקה את הסצנה לקראת הדגמה חדשה. */
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

  snapshot(): string {
    this.renderer.render(this.scene, this.camera);
    return this.canvas.toDataURL('image/png');
  }

  private resize() {
    if (!this.host) return;
    const w = Math.max(1, this.host.clientWidth), h = Math.max(1, this.host.clientHeight);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.zoom = Math.min(1, (w / h) / 1.1);
    this.camera.updateProjectionMatrix();
  }

  private loop = (now: number) => {
    requestAnimationFrame(this.loop);
    const raw = Math.min(0.12, (now - this.last) / 1000);
    this.last = now;
    if (!this.host || !this.canvas.isConnected) return;
    if (this.liftT < 1) { this.liftT = Math.min(1, this.liftT + raw / 1.1); this.applyLift(); }
    const dt = (this.still ? 0 : raw) * this.timeScale;
    this.time += dt;

    // עדכון הזמן בכל חומרי ה-Shader לתנודה ביולוגית רציפה
    for (const mat of animatedMaterials) {
      if (mat.uniforms.uTime) mat.uniforms.uTime.value = this.time;
    }

    // הנפשת החלקיקים המרחפים בציטופלזמה (תנועה בראונית עדינה)
    if (dt > 0) {
      const attr = this.motes.geometry.getAttribute('position') as THREE.BufferAttribute;
      const arr = attr.array as Float32Array;
      for (let i = 0; i < MOTE_COUNT; i++) {
        const bx = this.moteBase[i * 3];
        const by = this.moteBase[i * 3 + 1];
        const bz = this.moteBase[i * 3 + 2];
        arr[i * 3] = bx + Math.sin(this.time * 0.65 + i * 1.3) * 0.18;
        arr[i * 3 + 1] = by + Math.cos(this.time * 0.55 + i * 0.9) * 0.16;
        arr[i * 3 + 2] = bz + Math.sin(this.time * 0.45 + i * 1.7) * 0.15;
      }
      attr.needsUpdate = true;
    }

    // מצלמה קולנועית מונחית קפיץ + נשימה עדינה כשלא גוררים ידנית
    if (this.camGuided && !this.userDragging && dt > 0) {
      this.camSpring.step(Math.min(0.05, dt));
      this.lookSpring.step(Math.min(0.05, dt));
      const breatheX = Math.sin(this.time * 0.55) * 0.06;
      const breatheY = Math.cos(this.time * 0.42) * 0.04;
      this.camera.position.set(
        this.camSpring.pos.x + breatheX,
        this.camSpring.pos.y + breatheY,
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
    this.renderer.render(this.scene, this.camera);
  };
}

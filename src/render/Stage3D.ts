/**
 * הבמה התלת-ממדית המשותפת. יש רק renderer אחד בכל הספר: כשעוברים לכפולה אחרת
 * מעבירים את ה-canvas שלו למקום החדש ומנקים את הסצנה.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { disposeTree } from './ink';

type Ticker = (dt: number, t: number) => void;

export function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

export class Stage3D {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  readonly controls: OrbitControls;
  /** כל תוכן ההדגמה נכנס לקבוצה הזאת, כדי שאפשר "להרים" אותו מהדף. */
  readonly root = new THREE.Group();
  /** 0 = עצור, 1 = מהירות רגילה. */
  timeScale = 1;
  still = false;

  private tickers = new Set<Ticker>();
  private waits: { left: number; resolve: () => void }[] = [];
  private shadow: THREE.Mesh;
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
    this.controls.enablePan = false;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 12;
    this.controls.minPolarAngle = 0.25;
    this.controls.maxPolarAngle = 1.45;

    // צל רך מתחת לאובייקט: מראה שהוא באמת התרומם מהדף
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d')!;
    const grad = g.createRadialGradient(64, 64, 4, 64, 64, 64);
    grad.addColorStop(0, 'rgba(28,36,51,0.35)');
    grad.addColorStop(1, 'rgba(28,36,51,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    this.shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }),
    );
    this.shadow.rotation.x = -Math.PI / 2;
    this.scene.add(this.shadow);
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

  /** האנימציה שבה האיור "קם" מהדף: מתחיל שטוח כמו שרטוט, ומקבל נפח. */
  lift() {
    this.liftT = this.still ? 1 : 0;
    this.applyLift();
  }

  /** משאיר את האיור שטוח על הדף (לפני ה-lift). */
  flatten() { this.liftT = 0; this.applyLift(); }

  private applyLift() {
    const t = this.liftT;
    const e = t >= 1 ? 1 : 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2); // easeOutBack
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
    this.camera.position.set(0, 2.4, 6.2);
    this.controls.target.set(0, 0, 0);
    this.controls.enabled = false;
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
    // בדף צר מתרחקים קצת, כדי שכל ההדגמה תיכנס
    this.camera.zoom = Math.min(1, (w / h) / 1.1);
    this.camera.updateProjectionMatrix();
  }

  private loop = (now: number) => {
    requestAnimationFrame(this.loop);
    const raw = Math.min(0.12, (now - this.last) / 1000);
    this.last = now;
    if (!this.host || !this.canvas.isConnected) return;
    if (this.liftT < 1) { this.liftT = Math.min(1, this.liftT + raw / 1.1); this.applyLift(); }
    const dt = raw * this.timeScale;
    this.time += dt;
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

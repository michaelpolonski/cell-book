/**
 * העולם: סצנת Three.js אחת שמציירת את כל הספר, כמו ב-Every Joule.
 * - שולחן, כריכה, עובי הדפים, צל הספר ודפי נייר (טקסטורת סיבים וקפל שדרה) – הכל ב-WebGL.
 * - הדף המתהפך: גיאומטריה מתכופפת (vertex shader) עם תוכן העמוד המודפס משני צדיו.
 * - האיור "מתרומם מהדף": הבמה התלת-ממדית מצוירת לכרטיס עם צל שמתרחק מהנייר ובכתיבת עט.
 * - הצנצנות: נוזל זוהר ב-HDR שה-Bloom הופך לאור.
 * - Post-processing (pmndrs/postprocessing): Bloom, SMAA, Vignette וגרעיניות נייר.
 * המצלמה אורתוגרפית ביחידות של פיקסלי CSS, כך שה-HTML (טקסט, כפתורים, קוראי מסך) יושב בדיוק מעל הדף.
 */
import * as THREE from 'three';
import {
  EffectComposer, RenderPass, EffectPass, BloomEffect, SMAAEffect, VignetteEffect, NoiseEffect, BlendFunction,
} from 'postprocessing';
import type { Stage3D } from '../render/Stage3D';

const PAPER = new THREE.Color('#fbf5e8');
const INK = new THREE.Color('#1c2433');
const CLOTH = new THREE.Color('#2c3a5c');

const NOISE_GLSL = /* glsl */ `
  float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(h21(i), h21(i + vec2(1, 0)), u.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * vnoise(p); p *= 2.03; a *= 0.5; } return s; }
`;

const quadVS = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

/** מלבן ב-CSS → מיקום וגודל בעולם (Y הפוך). */
function placeRect(m: THREE.Object3D, r: { left: number; top: number; width: number; height: number }, z: number) {
  m.position.set(r.left + r.width / 2, -(r.top + r.height / 2), z);
  m.scale.set(Math.max(1e-3, r.width), Math.max(1e-3, r.height), 1);
}

function paperMaterial(side: number) {
  return new THREE.ShaderMaterial({
    vertexShader: quadVS,
    fragmentShader: /* glsl */ `
      uniform vec3 uPaper; uniform vec3 uInk; uniform float uSide; uniform vec2 uSize;
      uniform sampler2D uMap; uniform float uHasMap;
      varying vec2 vUv;
      ${NOISE_GLSL}
      void main() {
        vec2 px = vUv * uSize;
        float fib = fbm(px * vec2(0.035, 0.11)) * 0.6 + fbm(px * 0.6) * 0.4;
        vec3 col = uPaper * (0.965 + 0.05 * fib);
        // הצללה חמה במרכז הדף ופינות כהות מעט
        vec2 c = vUv - 0.5;
        col *= 1.012 - dot(c, c) * 0.06;
        // קפל השדרה: הנייר נכנס לשדרה ומחשיך (uSide: 1 = עמוד ימין, השדרה משמאלו; -1 = עמוד שמאל)
        if (uSide != 0.0) {
          float d = uSide > 0.0 ? vUv.x : 1.0 - vUv.x;
          float dpx = d * uSize.x;
          col *= 1.0 - 0.28 * exp(-dpx / 16.0) - 0.08 * exp(-dpx / 70.0);
          col += vec3(0.05) * exp(-pow((dpx - 24.0) / 9.0, 2.0));
        }
        if (uHasMap > 0.5) {
          vec4 t = texture2D(uMap, vUv);
          col = mix(col, t.rgb, t.a);
        }
        gl_FragColor = vec4(col, 1.0);
      }`,
    uniforms: {
      uPaper: { value: PAPER }, uInk: { value: INK }, uSide: { value: side },
      uSize: { value: new THREE.Vector2(600, 800) }, uMap: { value: null }, uHasMap: { value: 0 },
    },
  });
}

/** צנצנת: מסכה בצורת הצנצנת (אותו path כמו ב-SVG). */
const JAR_PATH = 'M17 5h26v7c9 4 12 11 12 19v39q0 7-7 7H12q-7 0-7-7V31c0-8 3-15 12-19z';
function jarMask() {
  const c = document.createElement('canvas');
  c.width = 120; c.height = 160;
  const g = c.getContext('2d')!;
  g.scale(2, 2);
  g.fillStyle = '#fff';
  g.fill(new Path2D(JAR_PATH));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

interface Liquid { mesh: THREE.Mesh; level: number }

interface TurnOpts {
  dir: 1 | -1;
  front: HTMLCanvasElement;   // הצד הגלוי של הדף המתרומם
  back: HTMLCanvasElement;    // הצד השני שלו (העמוד החדש)
  underLift: HTMLCanvasElement; // מה שמתגלה מתחתיו (העמוד החדש בצד הזה)
  underLand: HTMLCanvasElement; // העמוד הישן בצד שעליו הדף נוחת
  duration?: number;
}

export class World {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.OrthographicCamera(0, 1, 0, -1, -5000, 5000);
  private composer: EffectComposer;
  private table: THREE.Mesh;
  private bookGroup = new THREE.Group();
  private cover: THREE.Mesh;
  private edges: THREE.Mesh;
  private dropShadow: THREE.Mesh;
  private paperL: THREE.Mesh;
  private paperR: THREE.Mesh;
  private mobilePapers: THREE.Mesh[] = [];
  private card: THREE.Mesh;
  private cardShadow: THREE.Mesh;
  private leaf: THREE.Mesh;
  private leafShadow: THREE.Mesh;
  private liquids: Liquid[] = [];
  private liquidGeo = new THREE.PlaneGeometry(1, 1);
  private jarTex = jarMask();
  private bookEl: HTMLElement | null = null;
  private spreadEl: HTMLElement | null = null;
  private stage: Stage3D | null = null;
  private last = performance.now();
  private time = 0;
  private w = 1;
  private h = 1;
  private turnState: { t: number; dur: number; dir: number; resolve: () => void } | null = null;
  private turnTextures: THREE.Texture[] = [];
  /** 0 = האיור שטוח ומשורטט, 1 = התרומם לגמרי. */
  private lift = 1;
  private liftTarget = 1;
  private reveal = 1;
  private intro = 0;
  private pendingLift = false;
  private turnDone = 0;
  still = false;
  mobile = false;

  constructor(canvasHost: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance', stencil: false, depth: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    const cv = this.renderer.domElement;
    cv.id = 'world';
    cv.setAttribute('aria-hidden', 'true');
    canvasHost.prepend(cv);
    this.camera.position.z = 1000;

    // ---------- שולחן ----------
    this.table = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
      vertexShader: quadVS,
      fragmentShader: /* glsl */ `
        uniform vec2 uSize; varying vec2 vUv;
        ${NOISE_GLSL}
        void main() {
          vec2 px = vUv * uSize;
          // עץ אלון בהיר: סיבים ארוכים לרוחב + טבעות
          float grain = fbm(vec2(px.x * 0.004, px.y * 0.06));
          float rings = sin(px.y * 0.045 + grain * 9.0) * 0.5 + 0.5;
          vec3 a = vec3(0.70, 0.62, 0.52), b = vec3(0.60, 0.51, 0.41);
          vec3 col = mix(a, b, rings * 0.55 + grain * 0.35);
          col *= 0.92 + 0.12 * fbm(px * 0.02);
          vec2 c = vUv - vec2(0.5, 0.45);
          col *= 1.08 - dot(c, c) * 0.9;
          gl_FragColor = vec4(col, 1.0);
        }`,
      uniforms: { uSize: { value: new THREE.Vector2(1, 1) } },
      depthWrite: false,
    }));
    this.table.renderOrder = -10;
    this.scene.add(this.table);

    // ---------- הספר: צל, כריכה, עובי הדפים, נייר ----------
    this.dropShadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
      vertexShader: quadVS,
      fragmentShader: /* glsl */ `
        uniform vec2 uSize; uniform float uSoft; uniform float uAlpha; varying vec2 vUv;
        float sdBox(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
        void main() {
          vec2 p = (vUv - 0.5) * uSize;
          float d = sdBox(p, uSize * 0.5 - uSoft, 18.0);
          float a = 1.0 - smoothstep(-uSoft * 0.6, uSoft, d);
          gl_FragColor = vec4(0.09, 0.07, 0.05, a * uAlpha);
        }`,
      uniforms: { uSize: { value: new THREE.Vector2(1, 1) }, uSoft: { value: 46 }, uAlpha: { value: 0.5 } },
      transparent: true, depthWrite: false,
    }));
    this.cover = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
      vertexShader: quadVS,
      fragmentShader: /* glsl */ `
        uniform vec3 uCloth; uniform vec2 uSize; varying vec2 vUv;
        ${NOISE_GLSL}
        void main() {
          vec2 px = vUv * uSize;
          float weave = (sin(px.x * 2.2) * sin(px.y * 2.2)) * 0.5 + 0.5;
          vec3 col = uCloth * (0.86 + 0.1 * weave + 0.12 * fbm(px * 0.05));
          vec2 e = min(vUv, 1.0 - vUv) * uSize;
          col *= 0.7 + 0.3 * smoothstep(0.0, 6.0, min(e.x, e.y));
          gl_FragColor = vec4(col, 1.0);
        }`,
      uniforms: { uCloth: { value: CLOTH }, uSize: { value: new THREE.Vector2(1, 1) } },
    }));
    this.edges = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
      vertexShader: quadVS,
      fragmentShader: /* glsl */ `
        uniform vec2 uSize; uniform vec2 uInner; varying vec2 vUv;
        void main() {
          vec2 px = vUv * uSize;
          vec2 d = min(px, uSize - px);
          float m = min(d.x, d.y);
          // שכבות דפים דקות בשולי הספר
          float stripe = 0.5 + 0.5 * sin(m * 3.14159 * 1.4);
          vec3 col = mix(vec3(0.83, 0.79, 0.70), vec3(0.95, 0.92, 0.85), stripe);
          col *= 0.82 + 0.18 * smoothstep(0.0, 8.0, m);
          gl_FragColor = vec4(col, 1.0);
        }`,
      uniforms: { uSize: { value: new THREE.Vector2(1, 1) }, uInner: { value: new THREE.Vector2(1, 1) } },
    }));
    this.paperL = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), paperMaterial(-1));
    this.paperR = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), paperMaterial(1));
    this.bookGroup.add(this.dropShadow, this.cover, this.edges, this.paperL, this.paperR);
    this.scene.add(this.bookGroup);

    // ---------- כרטיס הבמה (האיור שמתרומם) וצלו על הנייר ----------
    this.cardShadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
      vertexShader: quadVS,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap; uniform float uLift; uniform vec2 uOff; uniform float uReveal; varying vec2 vUv;
        void main() {
          vec2 uv = vUv - uOff * uLift;
          float a = 0.0;
          // צל רך: כמה דגימות בתבנית טבעת, מתרכך ככל שהאיור עולה
          float r = 0.004 + 0.016 * uLift;
          for (int i = 0; i < 8; i++) {
            float ang = float(i) * 0.785398;
            a += texture2D(uMap, uv + vec2(cos(ang), sin(ang)) * r).a;
          }
          a = a / 8.0 * smoothstep(1.0, 0.0, vUv.x < 1.0 - uReveal ? 1.0 : 0.0);
          gl_FragColor = vec4(0.12, 0.09, 0.06, a * (0.16 + 0.22 * uLift));
        }`,
      uniforms: { uMap: { value: null }, uLift: { value: 1 }, uOff: { value: new THREE.Vector2(0.018, -0.03) }, uReveal: { value: 1 } },
      transparent: true, depthWrite: false,
    }));
    this.card = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
      vertexShader: quadVS,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap; uniform float uReveal; uniform float uLift; uniform float uTime; varying vec2 vUv;
        ${NOISE_GLSL}
        void main() {
          vec4 t = texture2D(uMap, vUv);
          // הפלט של הבמה הוא \"צבע תצוגה\"; ממירים ללינארי כדי שה-Bloom וה-sRGB הסופי יחזירו אותו בדיוק
          vec3 c = pow(max(t.rgb, 0.0), vec3(2.2));
          // כתיבת עט: חשיפה מימין לשמאל (כיוון הכתיבה בעברית) עם קצה מחוספס של דיו
          float edge = 1.0 - uReveal + (fbm(vUv * vec2(4.0, 40.0)) - 0.5) * 0.06;
          float m = smoothstep(edge - 0.015, edge + 0.015, vUv.x);
          // לפני שהאיור קם הוא נראה כמו שרטוט דיו שטוח על הנייר
          float lum = dot(c, vec3(0.3, 0.59, 0.11));
          vec3 sketch = mix(vec3(0.07, 0.09, 0.14), vec3(0.93, 0.89, 0.82), smoothstep(0.02, 0.6, lum));
          c = mix(sketch * t.a, c, smoothstep(0.0, 0.85, uLift));
          gl_FragColor = vec4(c * m, t.a * m);
        }`,
      uniforms: { uMap: { value: null }, uReveal: { value: 1 }, uLift: { value: 1 }, uTime: { value: 0 } },
      transparent: true, depthWrite: false, premultipliedAlpha: true,
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    }));
    this.card.visible = this.cardShadow.visible = false;
    this.scene.add(this.cardShadow, this.card);

    // ---------- הדף המתהפך ----------
    const leafGeo = new THREE.PlaneGeometry(1, 1, 48, 1);
    leafGeo.translate(0.5, 0, 0); // x ∈ [0,1]: 0 = השדרה, 1 = הקצה החיצוני
    this.leaf = new THREE.Mesh(leafGeo, new THREE.ShaderMaterial({
      vertexShader: /* glsl */ `
        uniform float uAngle; uniform float uCurl; uniform float uW; uniform float uH; uniform float uDir;
        varying vec2 vUv; varying float vShade;
        void main() {
          vUv = uv;
          float d = position.x * uW;          // מרחק מהשדרה
          float a = uCurl / uW;                // שינוי הזווית לאורך הדף (כיפוף)
          float th = uAngle;
          float x, z;
          if (abs(a) < 1e-5) { x = d * cos(th); z = d * sin(th); }
          else { x = (sin(th + a * d) - sin(th)) / a; z = (cos(th) - cos(th + a * d)) / a; }
          float phi = th + a * d;
          vShade = cos(phi);
          // uDir = -1: הדף מתחיל משמאל לשדרה (ספר עברי, קדימה); 1: מימין
          vec3 p = vec3(uDir * x, position.y * uH, z);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D uFront; uniform sampler2D uBack; uniform vec3 uPaper; uniform float uDir; uniform vec2 uSize;
        varying vec2 vUv; varying float vShade;
        ${NOISE_GLSL}
        void main() {
          // uv.x = 0 בשדרה; ממפים לטקסטורת העמוד לפי הצד
          vec2 uv = vUv;
          vec4 t;
          // במראה (uDir<0) כיוון המשולשים מתהפך, ולכן גם הצד ה"קדמי"
          bool front = gl_FrontFacing == (uDir > 0.0);
          if (front) t = texture2D(uFront, vec2(uDir < 0.0 ? 1.0 - uv.x : uv.x, uv.y));
          else t = texture2D(uBack, vec2(uDir < 0.0 ? uv.x : 1.0 - uv.x, uv.y));
          vec2 px = uv * uSize;
          vec3 paper = uPaper * (0.965 + 0.05 * fbm(px * vec2(0.035, 0.11)));
          vec3 col = mix(paper, t.rgb, t.a);
          float light = 0.62 + 0.38 * abs(vShade);
          col *= light;
          col *= 1.0 - 0.22 * exp(-uv.x * uSize.x / 22.0);
          gl_FragColor = vec4(col, 1.0);
        }`,
      uniforms: {
        uAngle: { value: 0 }, uCurl: { value: 0 }, uW: { value: 1 }, uH: { value: 1 }, uDir: { value: -1 },
        uFront: { value: null }, uBack: { value: null }, uPaper: { value: PAPER }, uSize: { value: new THREE.Vector2(1, 1) },
      },
      side: THREE.DoubleSide,
    }));
    this.leaf.visible = false;
    this.leafShadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
      vertexShader: quadVS,
      fragmentShader: /* glsl */ `
        uniform float uA; uniform float uDir; varying vec2 vUv;
        void main() {
          float x = uDir < 0.0 ? 1.0 - vUv.x : vUv.x; // 0 בשדרה
          float a = uA * (1.0 - smoothstep(0.0, 1.0, x)) * 0.55;
          gl_FragColor = vec4(0.1, 0.07, 0.04, a);
        }`,
      uniforms: { uA: { value: 0 }, uDir: { value: -1 } },
      transparent: true, depthWrite: false,
    }));
    this.leafShadow.visible = false;
    this.scene.add(this.leafShadow, this.leaf);

    // ---------- Post-processing ----------
    this.composer = new EffectComposer(this.renderer, { frameBufferType: THREE.HalfFloatType });
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    const bloom = new BloomEffect({ luminanceThreshold: 0.98, luminanceSmoothing: 0.12, intensity: 1.15, mipmapBlur: true, radius: 0.72 });
    const vignette = new VignetteEffect({ offset: 0.42, darkness: 0.38 });
    const noise = new NoiseEffect({ blendFunction: BlendFunction.SOFT_LIGHT, premultiply: false });
    noise.blendMode.opacity.value = 0.1;
    const smaa = new SMAAEffect();
    this.composer.addPass(new EffectPass(this.camera, bloom, vignette, noise, smaa));

    addEventListener('resize', () => this.resize());
    this.resize();
    requestAnimationFrame(this.loop);
  }

  /** האלמנטים שהעולם עוקב אחריהם: הספר והכפולה הנוכחית. */
  track(bookEl: HTMLElement, spreadEl: HTMLElement | null) {
    this.bookEl = bookEl;
    this.spreadEl = spreadEl;
  }

  attachStage(stage: Stage3D) {
    this.stage = stage;
    (this.card.material as THREE.ShaderMaterial).uniforms.uMap.value = stage.target.texture;
    (this.cardShadow.material as THREE.ShaderMaterial).uniforms.uMap.value = stage.target.texture;
  }

  /** האיור מתחיל כשרטוט שטוח שהעט מצייר, ואז מתרומם מהדף. */
  drawAndLift(): Promise<void> {
    if (this.still) { this.reveal = 1; this.lift = this.liftTarget = 1; return Promise.resolve(); }
    this.reveal = 0;
    this.lift = 0;
    this.liftTarget = 0;
    this.pendingLift = true;
    return Promise.resolve();
  }

  flatten() { this.reveal = 0; this.lift = 0; this.liftTarget = 0; this.pendingLift = false; }

  /** הפיכת דף בתלת-ממד. */
  turn(o: TurnOpts): Promise<void> {
    this.endTurn();
    const mk = (c: HTMLCanvasElement) => {
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
      t.generateMipmaps = true;
      t.minFilter = THREE.LinearMipmapLinearFilter;
      this.turnTextures.push(t);
      return t;
    };
    const lm = this.leaf.material as THREE.ShaderMaterial;
    lm.uniforms.uFront.value = mk(o.front);
    lm.uniforms.uBack.value = mk(o.back);
    lm.uniforms.uDir.value = o.dir > 0 ? -1 : 1;
    (this.leafShadow.material as THREE.ShaderMaterial).uniforms.uDir.value = o.dir > 0 ? 1 : -1;
    // מתחת לדף: בצד שממנו הוא מתרומם מתגלה העמוד החדש; בצד השני עדיין העמוד הישן
    const liftSide = o.dir > 0 ? this.paperL : this.paperR;
    const landSide = o.dir > 0 ? this.paperR : this.paperL;
    const setMap = (m: THREE.Mesh, c: HTMLCanvasElement) => {
      const u = (m.material as THREE.ShaderMaterial).uniforms;
      u.uMap.value = mk(c); u.uHasMap.value = 1;
    };
    setMap(liftSide, o.underLift);
    setMap(landSide, o.underLand);
    this.leaf.visible = this.leafShadow.visible = true;
    this.card.visible = this.cardShadow.visible = false;
    return new Promise((resolve) => {
      this.turnState = { t: 0, dur: (o.duration ?? 1050) / 1000, dir: o.dir, resolve };
      this.updateLeaf(0);
    });
  }

  private endTurn() {
    this.turnDone = 0;
    if (this.turnState) { const r = this.turnState.resolve; this.turnState = null; r(); }
    this.leaf.visible = this.leafShadow.visible = false;
    for (const m of [this.paperL, this.paperR]) {
      const u = (m.material as THREE.ShaderMaterial).uniforms;
      u.uMap.value = null; u.uHasMap.value = 0;
    }
    this.turnTextures.forEach((t) => t.dispose());
    this.turnTextures = [];
  }

  private updateLeaf(p: number) {
    const s = this.turnState;
    if (!s) return;
    const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
    const lm = this.leaf.material as THREE.ShaderMaterial;
    const book = this.bookRect();
    if (!book) return;
    const pw = book.width / 2;
    lm.uniforms.uW.value = pw;
    lm.uniforms.uH.value = book.height;
    (lm.uniforms.uSize.value as THREE.Vector2).set(pw, book.height);
    lm.uniforms.uAngle.value = e * Math.PI;
    // הקצה החיצוני מפגר אחרי השדרה בתחילת התנועה ומקדים בסופה – כמו נייר אמיתי
    lm.uniforms.uCurl.value = -Math.sin(e * Math.PI) * 0.85 * (1 - e * 0.4);
    const sx = book.left + pw;
    this.leaf.position.set(sx, -(book.top + book.height / 2), 40);
    // צל הדף על העמוד שמתחתיו
    const shadowOnLand = e > 0.5;
    const sh = this.leafShadow;
    const shW = pw * Math.abs(Math.cos(e * Math.PI)) + 30;
    const leftSide = (s.dir > 0) !== shadowOnLand; // forward: מתחיל משמאל
    placeRect(sh, { left: leftSide ? sx - shW : sx, top: book.top, width: shW, height: book.height }, 30);
    (sh.material as THREE.ShaderMaterial).uniforms.uA.value = Math.sin(e * Math.PI);
    (sh.material as THREE.ShaderMaterial).uniforms.uDir.value = leftSide ? 1 : -1;
  }

  private bookRect() {
    if (!this.bookEl) return null;
    const r = this.bookEl.getBoundingClientRect();
    if (r.width < 2) return null;
    return r;
  }

  snapshotStage(): HTMLCanvasElement | null {
    return this.stage?.snapshot(this.renderer) ?? null;
  }

  private resize() {
    this.w = innerWidth; this.h = innerHeight;
    this.renderer.setSize(this.w, this.h);
    this.composer.setSize(this.w, this.h);
    Object.assign(this.camera, { left: 0, right: this.w, top: 0, bottom: -this.h });
    this.camera.updateProjectionMatrix();
    placeRect(this.table, { left: 0, top: 0, width: this.w, height: this.h }, -200);
    ((this.table.material as THREE.ShaderMaterial).uniforms.uSize.value as THREE.Vector2).set(this.w, this.h);
    this.mobile = matchMedia('(max-width: 899px)').matches;
  }

  private layoutBook() {
    const r = this.bookRect();
    const desktop = !this.mobile && !!r;
    this.cover.visible = this.edges.visible = this.paperL.visible = this.paperR.visible = this.dropShadow.visible = desktop;
    this.mobilePapers.forEach((m) => (m.visible = false));
    if (desktop && r) {
      const k = 0.985 + 0.015 * this.intro;
      const g = this.bookGroup;
      g.position.set(r.left + r.width / 2, -(r.top + r.height / 2), 0);
      g.scale.set(k, k, 1);
      const local = (rr: { left: number; top: number; width: number; height: number }, z: number, m: THREE.Mesh) => {
        placeRect(m, { left: rr.left - (r.left + r.width / 2), top: rr.top - (r.top + r.height / 2), width: rr.width, height: rr.height }, z);
      };
      local({ left: r.left - 30, top: r.top - 12, width: r.width + 60, height: r.height + 52 }, -90, this.dropShadow);
      ((this.dropShadow.material as THREE.ShaderMaterial).uniforms.uSize.value as THREE.Vector2).set(r.width + 60, r.height + 52);
      (this.dropShadow.material as THREE.ShaderMaterial).uniforms.uAlpha.value = 0.55 * this.intro;
      local({ left: r.left - 14, top: r.top - 9, width: r.width + 28, height: r.height + 20 }, -80, this.cover);
      ((this.cover.material as THREE.ShaderMaterial).uniforms.uSize.value as THREE.Vector2).set(r.width + 28, r.height + 20);
      local({ left: r.left - 7, top: r.top - 2, width: r.width + 14, height: r.height + 9 }, -70, this.edges);
      ((this.edges.material as THREE.ShaderMaterial).uniforms.uSize.value as THREE.Vector2).set(r.width + 14, r.height + 9);
      const half = r.width / 2;
      local({ left: r.left, top: r.top, width: half, height: r.height }, -60, this.paperL);
      local({ left: r.left + half, top: r.top, width: half, height: r.height }, -60, this.paperR);
      ((this.paperL.material as THREE.ShaderMaterial).uniforms.uSize.value as THREE.Vector2).set(half, r.height);
      ((this.paperR.material as THREE.ShaderMaterial).uniforms.uSize.value as THREE.Vector2).set(half, r.height);
    } else if (this.spreadEl) {
      // טלפון: דף אחרי דף בגלילה – נייר מתחת לכל עמוד
      this.bookGroup.position.set(0, 0, 0);
      this.bookGroup.scale.set(1, 1, 1);
      const pages = [...this.spreadEl.querySelectorAll<HTMLElement>(':scope > .page')];
      while (this.mobilePapers.length < pages.length) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), paperMaterial(0));
        this.mobilePapers.push(m);
        this.scene.add(m);
      }
      pages.forEach((p, i) => {
        const pr = p.getBoundingClientRect();
        const m = this.mobilePapers[i];
        m.visible = true;
        placeRect(m, pr, -60);
        ((m.material as THREE.ShaderMaterial).uniforms.uSize.value as THREE.Vector2).set(pr.width, pr.height);
      });
    }
  }

  private layoutCard() {
    const st = this.stage;
    const host = st?.host;
    const show = !!st && !!host && host.isConnected && !this.turnState && getComputedStyle(host).visibility !== 'hidden';
    this.card.visible = this.cardShadow.visible = show;
    if (!show || !st || !host) return;
    const r = host.getBoundingClientRect();
    const m = st.margin;
    const rr = { left: r.left - m, top: r.top - m, width: r.width + 2 * m, height: r.height + 2 * m };
    const lift = this.lift;
    const ease = 1 - Math.pow(1 - lift, 3);
    placeRect(this.cardShadow, rr, 10);
    // האיור עולה מעט ומתקרב לצופה כשהוא מתרומם
    const s = 0.985 + 0.015 * ease;
    placeRect(this.card, { left: rr.left - (s - 1) * rr.width / 2 - 2 * ease, top: rr.top - (s - 1) * rr.height / 2 - 5 * ease, width: rr.width * s, height: rr.height * s }, 20);
    const cu = (this.card.material as THREE.ShaderMaterial).uniforms;
    cu.uReveal.value = this.reveal; cu.uLift.value = ease; cu.uTime.value = this.time;
    const su = (this.cardShadow.material as THREE.ShaderMaterial).uniforms;
    su.uLift.value = ease; su.uReveal.value = this.reveal;
  }

  private layoutJars() {
    const svgs = this.spreadEl && !this.turnState ? [...this.spreadEl.querySelectorAll<SVGSVGElement>('.jar svg')] : [];
    while (this.liquids.length < svgs.length) {
      const mesh = new THREE.Mesh(this.liquidGeo, new THREE.ShaderMaterial({
        vertexShader: quadVS,
        fragmentShader: /* glsl */ `
          uniform sampler2D uMask; uniform vec3 uColor; uniform float uLevel; uniform float uTime; uniform float uSeed;
          varying vec2 vUv;
          void main() {
            float mask = texture2D(uMask, vUv).r;
            // פני הנוזל: גלים עדינים שזזים כל הזמן (viewBox: נוזל בין y=77 ל-y=11)
            float y = 1.0 - vUv.y; // 0 למעלה
            float surface = (77.0 - uLevel * 66.0) / 80.0 + sin(vUv.x * 9.0 + uTime * 2.4 + uSeed) * 0.012 + sin(vUv.x * 17.0 - uTime * 3.1) * 0.006;
            float fill = smoothstep(surface - 0.004, surface + 0.004, y);
            float meniscus = exp(-pow((y - surface) * 90.0, 2.0));
            float depth = clamp((y - surface) * 2.0, 0.0, 1.0);
            // הנוזל זוהר (HDR) – ה-Bloom נותן את ההילה
            vec3 col = uColor * (1.25 + 0.55 * (1.0 - depth)) + vec3(1.0) * meniscus * 0.8;
            // בועות קטנות עולות
            vec2 bp = vec2(fract(vUv.x * 5.0 + uSeed), fract(y * 3.0 + uTime * 0.25 + uSeed));
            float bub = smoothstep(0.08, 0.0, length(bp - 0.5)) * 0.5;
            col += vec3(bub);
            float a = mask * fill * (uLevel > 0.002 ? 1.0 : 0.0);
            gl_FragColor = vec4(col, a * 0.92);
          }`,
        uniforms: { uMask: { value: this.jarTex }, uColor: { value: new THREE.Color() }, uLevel: { value: 0 }, uTime: { value: 0 }, uSeed: { value: Math.random() * 10 } },
        transparent: true, depthWrite: false,
      }));
      this.liquids.push({ mesh, level: 0 });
      this.scene.add(mesh);
    }
    this.liquids.forEach((l, i) => {
      const svg = svgs[i];
      l.mesh.visible = !!svg;
      if (!svg) return;
      const r = svg.getBoundingClientRect();
      placeRect(l.mesh, r, 5);
      const u = (l.mesh.material as THREE.ShaderMaterial).uniforms;
      const target = parseFloat(svg.dataset.level ?? '0') || 0;
      l.level += (target - l.level) * (this.still ? 1 : 0.12);
      u.uLevel.value = l.level;
      u.uTime.value = this.time;
      (u.uColor.value as THREE.Color).set(svg.dataset.color || '#9cc0de');
    });
  }

  private loop = (now: number) => {
    requestAnimationFrame(this.loop);
    // __cbTimeScale: האטה לבדיקות אוטומטיות (Playwright) של הדפדוף והקימה
    const raw = Math.min(0.1, (now - this.last) / 1000) * ((window as unknown as { __cbTimeScale?: number }).__cbTimeScale ?? 1);
    this.last = now;
    const dt = this.still ? 0 : raw;
    this.time += dt;
    this.intro = Math.min(1, this.intro + raw / 0.7);

    if (this.reveal < 1) this.reveal = this.still ? 1 : Math.min(1, this.reveal + raw / 0.85);
    else if (this.pendingLift) { this.pendingLift = false; this.liftTarget = 1; }
    if (this.lift !== this.liftTarget) {
      const d = this.liftTarget - this.lift;
      this.lift = this.still ? this.liftTarget : this.lift + Math.sign(d) * Math.min(Math.abs(d), raw / 1.1);
    }

    if (this.turnState) {
      const s = this.turnState;
      s.t += raw;
      const p = Math.min(1, s.t / s.dur);
      this.updateLeaf(p);
      if (p >= 1 && !this.turnDone) {
        // משחררים את הספר (ה-HTML החדש מוצג), ומנקים רק אחרי שני פריימים – בלי הבזק של דף ריק
        this.turnDone = 2;
        const r = s.resolve;
        s.resolve = () => {};
        r();
      } else if (this.turnDone && --this.turnDone === 0) this.endTurn();
    }

    this.layoutBook();
    this.stage?.frame(this.renderer, raw);
    this.layoutCard();
    this.layoutJars();
    this.composer.render(raw);
  };
}

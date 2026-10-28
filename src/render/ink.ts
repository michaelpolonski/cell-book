/**
 * מנוע הרינדור הביולוגי ("דיו חי"):
 * משלב שרטוט דיו והצללת קווים (hatching) עם תאורה תת-עורית (Subsurface Scattering),
 * ברק רטוב של רקמה חיה, קו מתאר Fresnel ותנודה אורגנית ב-GPU (Vertex Wobble)
 * בהשראת אנימציות התא של Drew Berry ו-3Blue1Brown.
 */
import * as THREE from 'three';

export const INK = '#1c2433';
export const RUST = '#9a3b2a';

/** אוסף חומרים שמתעדכנים בזמן אמת (uTime) בכל פריים. */
export const animatedMaterials = new Set<THREE.ShaderMaterial>();

const noiseGLSL = /* glsl */ `
  // תנודת גלים תלת-ממדית חלקה ומהירה ב-GPU ליצירת תנועה אורגנית של קרומים וחלבונים
  float bioWave(vec3 p, float t, float freq) {
    vec3 q = p * freq;
    float w1 = sin(q.x * 1.7 + q.y * 1.3 + t * 1.9) * cos(q.z * 1.5 - t * 1.4);
    float w2 = sin(q.y * 2.3 - q.z * 1.9 + t * 2.6) * 0.5;
    float w3 = cos(q.z * 2.9 + q.x * 2.1 - t * 2.1) * 0.25;
    return (w1 + w2 + w3) * 0.57;
  }
`;

const vertex = /* glsl */ `
  uniform float uOutline;
  uniform float uTime;
  uniform float uWobble;
  uniform float uWobbleFreq;
  varying vec3 vN;
  varying vec3 vV;
  varying vec3 vWPos;
  #ifdef USE_INSTANCING_COLOR
    varying vec3 vIC;
  #endif
  ${noiseGLSL}
  void main() {
    vec3 n = normalize(normal);
    vec3 displaced = position;
    if (uWobble > 0.0001) {
      float disp = bioWave(position, uTime, uWobbleFreq) * uWobble;
      displaced += n * disp;
      // קירוב נורמל מעודכן לתאורה חיה על פני הגל
      float eps = 0.08;
      float dx = bioWave(position + vec3(eps, 0.0, 0.0), uTime, uWobbleFreq) * uWobble - disp;
      float dy = bioWave(position + vec3(0.0, eps, 0.0), uTime, uWobbleFreq) * uWobble - disp;
      n = normalize(n - vec3(dx, dy, 0.0) * 2.2);
    }
    vec4 p = vec4(displaced + n * uOutline, 1.0);
    #ifdef USE_INSTANCING
      p = instanceMatrix * p;
      n = normalize(mat3(instanceMatrix) * n);
    #endif
    #ifdef USE_INSTANCING_COLOR
      vIC = instanceColor;
    #endif
    vec4 mv = modelViewMatrix * p;
    vec4 wp = modelMatrix * p;
    vWPos = wp.xyz;
    vN = normalize(normalMatrix * n);
    vV = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`;

const fragment = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uInk;
  uniform vec3 uLight;
  uniform float uHatch;
  uniform float uOpacity;
  uniform float uSpacing;
  uniform float uDpr;
  uniform float uRim;
  uniform float uSubsurface;
  uniform float uGloss;
  uniform float uPulse;
  uniform float uTime;
  varying vec3 vN;
  varying vec3 vV;
  varying vec3 vWPos;
  #ifdef USE_INSTANCING_COLOR
    varying vec3 vIC;
  #endif
  float lines(float c, float w) {
    float f = abs(fract(c / (uSpacing * uDpr)) - 0.5) * 2.0;
    return 1.0 - smoothstep(w, w + 0.25, f);
  }
  void main() {
    vec3 n = normalize(vN);
    if (!gl_FrontFacing) n = -n;
    vec3 l = normalize(uLight);
    vec3 v = normalize(vV);

    // Wrap lighting + Subsurface Scattering (SSS) לתחושה בשרית/ג'לטינית של אברונים וקרומים
    float ndl = dot(n, l);
    float wrap = clamp((ndl + 0.45) / 1.45, 0.0, 1.0);
    float tone = 0.20 + 0.80 * wrap;

    // פיזור אור תת-עורי חם באזור המעבר בין אור לצל
    float sssBand = smoothstep(-0.35, 0.25, ndl) * (1.0 - smoothstep(0.25, 0.85, ndl));
    float backScatter = pow(clamp(dot(-v, l) * 0.5 + 0.5, 0.0, 1.0), 2.0) * 0.35;

    // ברק עדין של סביבה מימית (Blinn-Phong)
    vec3 h = normalize(l + v);
    float spec = pow(max(dot(n, h), 0.0), 28.0) * uGloss;

    float rim = 1.0 - abs(dot(n, v));
    vec3 base = uColor;
    #ifdef USE_INSTANCING_COLOR
      base = vIC;
    #endif
    if (uPulse > 0.01) {
      base *= 1.0 + sin(uTime * 5.0) * 0.14 * uPulse;
    }

    // צבע תת-עורי חם ועשיר יותר
    vec3 sssColor = mix(base, vec3(0.95, 0.42, 0.30), 0.38);
    vec3 col = base * (0.78 + 0.26 * tone);
    col += sssColor * (sssBand * 0.28 + backScatter) * uSubsurface;
    col += vec3(1.0, 0.98, 0.92) * spec * 0.32;

    // קווי הצללה בדיו (Hatching) באזורים המוצלים
    vec2 fc = gl_FragCoord.xy;
    float ink = 0.0;
    ink = max(ink, lines(fc.x + fc.y, 0.15) * step(tone, 0.72));
    ink = max(ink, lines(fc.x - fc.y, 0.15) * step(tone, 0.48));
    ink = max(ink, lines(fc.x + fc.y + uSpacing * uDpr * 0.5, 0.11) * step(tone, 0.28));
    ink *= uHatch;

    col = mix(col, uInk, ink * 0.72);
    col = mix(col, uInk, smoothstep(0.58, 1.0, rim) * 0.42 * uHatch);

    // קו מתאר בקצוות לחומרים שקופים למחצה (קרומי תא, שלפוחיות, חלולית)
    float edge = pow(rim, 2.6) * uRim;
    col = mix(col, uInk, edge * 0.82);
    gl_FragColor = vec4(col, mix(uOpacity, min(1.0, uOpacity + 0.55), edge));
  }
`;

const outlineFragment = /* glsl */ `
  uniform vec3 uInk;
  uniform float uOpacity;
  void main() { gl_FragColor = vec4(uInk, uOpacity); }
`;

export interface InkOptions {
  color?: THREE.ColorRepresentation;
  hatch?: number;        // 0 = בלי קווי הצללה, 1 = מלא
  opacity?: number;
  outline?: number;      // עובי קו המתאר ביחידות עולם; 0 = בלי
  spacing?: number;      // מרווח בין קווי ההצללה בפיקסלים
  rim?: number;          // קו מתאר בקצוות לחומרים שקופים (0..1)
  wobble?: number;       // עוצמת התנודה האורגנית של המשטח (ברירת מחדל: 0.018)
  wobbleFreq?: number;   // תדירות מרחבית של הגלים על פני המשטח
  subsurface?: number;   // עוצמת פיזור האור התת-עורי (0..1)
  gloss?: number;        // ברק רטוב של רקמה ביולוגית (0..1)
  pulse?: number;        // פעימת הארה לאברון נבחר (0..1)
}

export function inkMaterial(o: InkOptions = {}): THREE.ShaderMaterial {
  const opacity = o.opacity ?? 1;
  const mat = new THREE.ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    transparent: opacity < 1,
    depthWrite: opacity >= 1,
    side: THREE.DoubleSide,
    uniforms: {
      uColor: { value: new THREE.Color(o.color ?? '#efe6d2') },
      uInk: { value: new THREE.Color(INK) },
      uLight: { value: new THREE.Vector3(-0.45, 0.88, 0.65) },
      uHatch: { value: o.hatch ?? 0.85 },
      uOpacity: { value: opacity },
      uSpacing: { value: o.spacing ?? 6 },
      uDpr: { value: Math.min(window.devicePixelRatio || 1, 2) },
      uOutline: { value: 0 },
      uRim: { value: o.rim ?? (opacity < 1 ? 0.85 : 0.25) },
      uTime: { value: 0 },
      uWobble: { value: o.wobble ?? 0.016 },
      uWobbleFreq: { value: o.wobbleFreq ?? 2.4 },
      uSubsurface: { value: o.subsurface ?? 0.85 },
      uGloss: { value: o.gloss ?? 0.55 },
      uPulse: { value: o.pulse ?? 0 },
    },
  });
  animatedMaterials.add(mat);
  return mat;
}

export function outlineMaterial(thickness: number, opacity = 1, wobble = 0.016, wobbleFreq = 2.4): THREE.ShaderMaterial {
  const mat = new THREE.ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: outlineFragment,
    side: THREE.BackSide,
    transparent: opacity < 1,
    depthWrite: opacity >= 1,
    uniforms: {
      uInk: { value: new THREE.Color(INK) },
      uOpacity: { value: opacity },
      uOutline: { value: thickness },
      uTime: { value: 0 },
      uWobble: { value: wobble },
      uWobbleFreq: { value: wobbleFreq },
    },
  });
  animatedMaterials.add(mat);
  return mat;
}

/** רשת עם חומר דיו ביולוגי, תנודה אורגנית וקו מתאר מתואם. */
export function inked(geometry: THREE.BufferGeometry, o: InkOptions = {}) {
  const group = new THREE.Group();
  const wobble = o.wobble ?? 0.016;
  const wobbleFreq = o.wobbleFreq ?? 2.4;
  const mesh = new THREE.Mesh(geometry, inkMaterial({ ...o, wobble, wobbleFreq }));
  group.add(mesh);
  let outline: THREE.Mesh | null = null;
  const t = o.outline ?? ((o.opacity ?? 1) < 1 ? 0 : 0.02);
  if (t > 0) {
    outline = new THREE.Mesh(
      geometry,
      outlineMaterial(t, Math.min(1, (o.opacity ?? 1) + 0.35), wobble, wobbleFreq),
    );
    outline.renderOrder = -1;
    group.add(outline);
  }
  return { group, mesh, outline };
}

/** InstancedMesh עם קו מתאר ותנודה אורגנית. */
export function inkedInstances(geometry: THREE.BufferGeometry, count: number, o: InkOptions = {}) {
  const wobble = o.wobble ?? 0.008;
  const wobbleFreq = o.wobbleFreq ?? 3.0;
  const mesh = new THREE.InstancedMesh(geometry, inkMaterial({ ...o, wobble, wobbleFreq }), count);
  const outline = new THREE.InstancedMesh(
    geometry,
    outlineMaterial(o.outline ?? 0.012, 1, wobble, wobbleFreq),
    count,
  );
  outline.instanceMatrix = mesh.instanceMatrix;
  mesh.frustumCulled = outline.frustumCulled = false;
  const group = new THREE.Group();
  group.add(outline, mesh);
  return { group, mesh, outline };
}

/** צינור תלת-ממדי אורגני וחלק על בסיס נקודות בקרה (למשל ל-DNA, שוטון, ER או מסלול). */
export function organicTube(
  points: THREE.Vector3[],
  radius = 0.045,
  o: InkOptions & { closed?: boolean; tubularSegments?: number } = {},
) {
  const curve = new THREE.CatmullRomCurve3(points, o.closed ?? false);
  const geo = new THREE.TubeGeometry(curve, o.tubularSegments ?? 48, radius, 12, o.closed ?? false);
  return { ...inked(geo, o), curve };
}

/** קווים בסגנון עט: כל קטע מצויר פעמיים עם סטייה קטנה, כמו שרטוט ביד. */
export function sketchLines(segments: number[], jitter = 0.012, color: THREE.ColorRepresentation = INK, opacity = 0.85) {
  const pts: number[] = [];
  const rnd = mulberry32(segments.length);
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < segments.length; i++) pts.push(segments[i] + (rnd() - 0.5) * jitter * (pass + 0.5));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  return new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color, transparent: true, opacity }));
}

/** קפיץ פיזיקלי (Damped Harmonic Oscillator) לתנועה טבעית עם אינרציה ושיכוך. */
export class SpringScalar {
  v = 0;
  constructor(public x: number, public target = x, public stiffness = 18, public damping = 6.5) {}
  step(dt: number): number {
    const f = (this.target - this.x) * this.stiffness - this.v * this.damping;
    this.v += f * dt;
    this.x += this.v * dt;
    return this.x;
  }
  setTarget(val: number) { this.target = val; }
  setInstant(val: number) { this.snap(val); }
  snap(val: number) { this.x = this.target = val; this.v = 0; }
}

export class Spring3D {
  readonly v = new THREE.Vector3();
  readonly target: THREE.Vector3;
  constructor(
    public readonly pos = new THREE.Vector3(),
    public stiffness = 14,
    public damping = 5.8,
  ) {
    this.target = pos.clone();
  }
  step(dt: number): THREE.Vector3 {
    const ax = (this.target.x - this.pos.x) * this.stiffness - this.v.x * this.damping;
    const ay = (this.target.y - this.pos.y) * this.stiffness - this.v.y * this.damping;
    const az = (this.target.z - this.pos.z) * this.stiffness - this.v.z * this.damping;
    this.v.x += ax * dt; this.v.y += ay * dt; this.v.z += az * dt;
    this.pos.x += this.v.x * dt; this.pos.y += this.v.y * dt; this.pos.z += this.v.z * dt;
    return this.pos;
  }
  setTarget(x: number, y: number, z: number) {
    this.target.set(x, y, z);
  }
  snap(x: number, y: number, z: number) {
    this.pos.set(x, y, z);
    this.target.set(x, y, z);
    this.v.set(0, 0, 0);
  }
}

/** מחולל אקראי קבוע (עם seed), כדי שהשרטוט ייראה אותו דבר בכל פעם. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function disposeTree(obj: THREE.Object3D) {
  obj.traverse((o) => {
    const m = o as THREE.Mesh;
    m.geometry?.dispose?.();
    const mat = m.material as THREE.Material | THREE.Material[] | undefined;
    const clean = (x: THREE.Material) => {
      animatedMaterials.delete(x as THREE.ShaderMaterial);
      x.dispose();
    };
    if (Array.isArray(mat)) mat.forEach(clean);
    else if (mat) clean(mat);
  });
}

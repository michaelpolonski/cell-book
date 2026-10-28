/**
 * סגנון "שרטוט דיו" לכל ההדגמות: הצללה מדורגת שהופכת לקווי הצללה (hatching)
 * בשלוש צפיפויות, וקו מתאר בשיטת inverted hull. ככה כל אובייקט תלת-ממדי נראה
 * כמו איור בספר שהתרומם מהדף.
 */
import * as THREE from 'three';

export const INK = '#1c2433';
export const RUST = '#9a3b2a';

const vertex = /* glsl */ `
  uniform float uOutline;
  varying vec3 vN;
  varying vec3 vV;
  #ifdef USE_INSTANCING_COLOR
    varying vec3 vIC;
  #endif
  void main() {
    vec3 n = normal;
    vec4 p = vec4(position + normal * uOutline, 1.0);
    #ifdef USE_INSTANCING
      p = instanceMatrix * p;
      n = mat3(instanceMatrix) * n;
    #endif
    #ifdef USE_INSTANCING_COLOR
      vIC = instanceColor;
    #endif
    vec4 mv = modelViewMatrix * p;
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
  varying vec3 vN;
  varying vec3 vV;
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
    float d = max(dot(n, normalize(uLight)), 0.0);
    float tone = 0.18 + 0.82 * d;
    float rim = 1.0 - abs(dot(n, normalize(vV)));
    vec3 base = uColor;
    #ifdef USE_INSTANCING_COLOR
      base = vIC;
    #endif
    vec2 fc = gl_FragCoord.xy;
    float ink = 0.0;
    ink = max(ink, lines(fc.x + fc.y, 0.16) * step(tone, 0.78));
    ink = max(ink, lines(fc.x - fc.y, 0.16) * step(tone, 0.52));
    ink = max(ink, lines(fc.x + fc.y + uSpacing * uDpr * 0.5, 0.12) * step(tone, 0.3));
    ink *= uHatch;
    vec3 col = base * (0.86 + 0.14 * tone);
    col = mix(col, uInk, ink * 0.8);
    col = mix(col, uInk, smoothstep(0.55, 1.0, rim) * 0.45 * uHatch);
    // שקופים: הקצה נעשה כהה ואטום, כמו קו עט סביב קרום
    float edge = pow(rim, 3.0) * uRim;
    col = mix(col, uInk, edge * 0.85);
    gl_FragColor = vec4(col, mix(uOpacity, 1.0, edge));
  }
`;

const outlineFragment = /* glsl */ `
  uniform vec3 uInk;
  uniform float uOpacity;
  void main() { gl_FragColor = vec4(uInk, uOpacity); }
`;

export interface InkOptions {
  color?: THREE.ColorRepresentation;
  hatch?: number;      // 0 = בלי קווי הצללה, 1 = מלא
  opacity?: number;
  outline?: number;    // עובי קו המתאר ביחידות עולם; 0 = בלי
  spacing?: number;    // מרווח בין קווי ההצללה בפיקסלים
  rim?: number;        // קו מתאר בקצוות לחומרים שקופים (0..1)
}

export function inkMaterial(o: InkOptions = {}): THREE.ShaderMaterial {
  const opacity = o.opacity ?? 1;
  return new THREE.ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    transparent: opacity < 1,
    depthWrite: opacity >= 1,
    side: THREE.DoubleSide,
    uniforms: {
      uColor: { value: new THREE.Color(o.color ?? '#efe6d2') },
      uInk: { value: new THREE.Color(INK) },
      uLight: { value: new THREE.Vector3(-0.4, 0.9, 0.6) },
      uHatch: { value: o.hatch ?? 1 },
      uOpacity: { value: opacity },
      uSpacing: { value: o.spacing ?? 6 },
      uDpr: { value: Math.min(window.devicePixelRatio || 1, 2) },
      uOutline: { value: 0 },
      uRim: { value: o.rim ?? 0 },
    },
  });
}

export function outlineMaterial(thickness: number, opacity = 1): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: outlineFragment,
    side: THREE.BackSide,
    transparent: opacity < 1,
    depthWrite: opacity >= 1,
    uniforms: {
      uInk: { value: new THREE.Color(INK) },
      uOpacity: { value: opacity },
      uOutline: { value: thickness },
    },
  });
}

/** רשת עם חומר דיו וקו מתאר. מחזיר קבוצה שבה `mesh` הוא הגוף ו-`outline` הוא הקו. */
export function inked(geometry: THREE.BufferGeometry, o: InkOptions = {}) {
  const group = new THREE.Group();
  const mesh = new THREE.Mesh(geometry, inkMaterial(o));
  group.add(mesh);
  let outline: THREE.Mesh | null = null;
  // לחומר שקוף אין inverted hull (הוא היה מכהה את כל הפנים): משתמשים ב-rim במקום
  const t = o.outline ?? ((o.opacity ?? 1) < 1 ? 0 : 0.02);
  if (t > 0) {
    outline = new THREE.Mesh(geometry, outlineMaterial(t, Math.min(1, (o.opacity ?? 1) + 0.35)));
    outline.renderOrder = -1;
    group.add(outline);
  }
  return { group, mesh, outline };
}

/** InstancedMesh עם קו מתאר שחולק איתו את אותן מטריצות. */
export function inkedInstances(geometry: THREE.BufferGeometry, count: number, o: InkOptions = {}) {
  const mesh = new THREE.InstancedMesh(geometry, inkMaterial(o), count);
  const outline = new THREE.InstancedMesh(geometry, outlineMaterial(o.outline ?? 0.012), count);
  outline.instanceMatrix = mesh.instanceMatrix;
  mesh.frustumCulled = outline.frustumCulled = false;
  const group = new THREE.Group();
  group.add(outline, mesh);
  return { group, mesh, outline };
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
    if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
    else mat?.dispose?.();
  });
}

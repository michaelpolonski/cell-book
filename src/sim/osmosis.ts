/**
 * מודל אוסמוזה פשוט של תא בודד בתמיסה.
 *
 * הכמות של המומס בתוך התא קבועה (הקרום לא מעביר אותו), ולכן הריכוז בפנים הוא
 * cIn = ISOTONIC / V, כאשר V הוא הנפח היחסי של התא (1 = נפח רגיל).
 * מים זורמים אל הצד שבו ריכוז המומס גבוה יותר: dV/dt ∝ (cIn − cOut).
 * כל הריכוזים נמדדים ב"אחוז מלח" (NaCl), כדי שיתאימו לשפה של מעבדת בית הספר.
 */

export const ISOTONIC = 0.9; // % NaCl, הריכוז שבתוך תא דם אדום

export type CellType = 'animal' | 'plant';
export type Tonicity = 'hypo' | 'iso' | 'hyper';

export const LIMITS = {
  animalBurst: 1.45, // מעל הנפח הזה הקרום נקרע (המוליזה)
  animalMin: 0.55,   // התא לא מתכווץ יותר מזה (קרנציה)
  plantMax: 1.0,     // הדופן לא מאפשרת לתא צמח לגדול מעבר לזה (טורגור)
  plantMin: 0.6,     // פלזמוליזה מלאה
} as const;

export const RATE = 1.1;     // קבוע החדירות של הקרום למים
export const MAX_RATE = 0.45; // הגבלה על קצב שינוי הנפח (לשנייה), כדי שהאנימציה תישאר קריאה

export interface OsmoState {
  type: CellType;
  V: number;
  burst: boolean;
}

export function newCell(type: CellType = 'animal'): OsmoState {
  return { type, V: 1, burst: false };
}

/** ריכוז המומס בתוך התא. */
export function cIn(V: number): number {
  return ISOTONIC / V;
}

/** כוח מניע לזרימת מים: חיובי = מים נכנסים לתא. */
export function waterDrive(V: number, cOut: number): number {
  return cIn(V) - cOut;
}

/** הנפח שאליו התא שואף אם לא היו לו מגבלות (קרום שנקרע או דופן). */
export function equilibriumVolume(cOut: number): number {
  return cOut <= 0 ? Infinity : ISOTONIC / cOut;
}

export function tonicity(cOut: number, inside = ISOTONIC, tol = 0.05): Tonicity {
  if (Math.abs(cOut - inside) <= tol) return 'iso';
  return cOut < inside ? 'hypo' : 'hyper';
}

export const TONICITY_HE: Record<Tonicity, string> = {
  hypo: 'היפוטונית',
  iso: 'איזוטונית',
  hyper: 'היפרטונית',
};

/** לחץ הטורגור (0..1) בתא צמח שנלחץ אל הדופן. */
export function turgor(s: OsmoState, cOut: number): number {
  if (s.type !== 'plant' || s.V < LIMITS.plantMax - 1e-6) return 0;
  return Math.max(0, Math.min(1, waterDrive(s.V, cOut) / ISOTONIC));
}

/** צעד אחד בזמן. מחזיר מצב חדש (לא משנה את המצב הקיים). */
export function step(s: OsmoState, cOut: number, dt: number): OsmoState {
  if (s.burst) return s;
  let dV = RATE * waterDrive(s.V, cOut);
  dV = Math.max(-MAX_RATE, Math.min(MAX_RATE, dV));
  let V = s.V + dV * dt;
  let burst = false;
  if (s.type === 'animal') {
    if (V >= LIMITS.animalBurst) { V = LIMITS.animalBurst; burst = true; }
    V = Math.max(V, LIMITS.animalMin);
  } else {
    V = Math.min(Math.max(V, LIMITS.plantMin), LIMITS.plantMax);
  }
  return { type: s.type, V, burst };
}

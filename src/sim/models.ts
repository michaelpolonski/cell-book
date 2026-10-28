/**
 * מודלים חישוביים של השיעורים והתרגילים הפתורים.
 * מופרדים מהתלת-ממד כדי שיהיו קלים לבדיקה.
 */

/** שיעור 1: סדרי גודל (הכל במיקרומטרים, µm). */
export interface ScaleItem {
  id: string;
  name: string;
  um: number;          // גודל אופייני במיקרומטרים
  display: string;     // תצוגה עם יחידה מתאימה
  exp: number;         // log10(um)
  hint: string;
}

export const SCALE_ITEMS: ScaleItem[] = [
  { id: 'molecule', name: 'מולקולת מים', um: 0.0003, display: '0.3 nm', exp: -3.5, hint: 'קטנה מאברון אלפי מונים' },
  { id: 'ribosome', name: 'ריבוזום', um: 0.025, display: '25 nm', exp: -1.6, hint: 'נראה רק במיקרוסקופ אלקטרונים' },
  { id: 'virus', name: 'נגיף שפעת', um: 0.1, display: '100 nm', exp: -1, hint: 'קטן מחיידק פי עשרה' },
  { id: 'bacterium', name: 'חיידק אי-קולי', um: 2, display: '2 µm', exp: 0.3, hint: 'בגודל של מיטוכונדריה' },
  { id: 'rbc', name: 'תא דם אדום', um: 8, display: '8 µm', exp: 0.9, hint: 'תא קטן של בעל חיים' },
  { id: 'plant', name: 'תא בצל', um: 60, display: '60 µm', exp: 1.78, hint: 'נראה היטב במיקרוסקופ אור' },
  { id: 'ovum', name: 'תא ביצית של אדם', um: 120, display: '120 µm', exp: 2.08, hint: 'על גבול הראייה בעין בלתי מזוינת' },
  { id: 'hand', name: 'רוחב כף יד', um: 100_000, display: '10 cm', exp: 5, hint: 'עולם היומיום' },
];

/** שיעור 2: חישוב הגדלה וגודל אמיתי במיקרוסקופ. */
export function totalMagnification(eyepiece: number, objective: number): number {
  return eyepiece * objective;
}

/** גודל אמיתי במיקרומטרים מתוך גודל התמונה במילימטרים וההגדלה הכוללת. */
export function realSizeUm(imageMm: number, magnification: number): number {
  return (imageMm * 1000) / magnification;
}

/** שיעור 9: שטח פנים, נפח ויחס שטח פנים לנפח של קובייה (או קובייה שחולקה ל-n³ תאים). */
export function cubeMetrics(sideUm: number, subdivisions = 1) {
  const n = Math.max(1, Math.round(subdivisions));
  const cellSide = sideUm / n;
  const count = n * n * n;
  const surfaceArea = count * 6 * cellSide * cellSide;
  const volume = sideUm * sideUm * sideUm;
  const ratio = surfaceArea / volume; // שווה ל-6 / cellSide
  // זמן אופייני לדיפוזיה עד המרכז: t ∝ (cellSide/2)²
  const diffusionTimeSec = Math.pow(cellSide / 2, 2) * 0.4;
  return { n, count, cellSide, surfaceArea, volume, ratio, diffusionTimeSec };
}

/** שיעור 10: קצב פעילות אנזים (0..1) לפי טמפרטורה ו-pH. */
export interface EnzymeProfile {
  id: string;
  name: string;
  optTemp: number;     // °C
  denatureTemp: number;// °C שבה הדנטורציה מלאה
  optPh: number;
  phWidth: number;
}

export const ENZYMES: Record<string, EnzymeProfile> = {
  amylase: { id: 'amylase', name: 'עמילאז (ברוק)', optTemp: 37, denatureTemp: 52, optPh: 7.0, phWidth: 1.6 },
  pepsin: { id: 'pepsin', name: 'פפסין (בקיבה)', optTemp: 37, denatureTemp: 52, optPh: 2.0, phWidth: 1.4 },
};

export function enzymeRate(profile: EnzymeProfile, tempC: number, ph: number): number {
  if (tempC <= 0 || tempC >= profile.denatureTemp) return 0;
  // עלייה עם הטמפרטורה עד האופטימום, וירידה תלולה בגלל דנטורציה מעליו
  let tFactor: number;
  if (tempC <= profile.optTemp) {
    tFactor = Math.pow(tempC / profile.optTemp, 1.55);
  } else {
    const u = (tempC - profile.optTemp) / (profile.denatureTemp - profile.optTemp);
    tFactor = Math.max(0, 1 - u * u * (3 - 2 * u));
  }
  const dp = (ph - profile.optPh) / profile.phWidth;
  const phFactor = Math.exp(-dp * dp * 1.4);
  return Math.max(0, Math.min(1, tFactor * phFactor));
}

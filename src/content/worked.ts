/**
 * תרגילים פתורים עם מספרים אקראיים (כמו ב-Every Joule):
 * בכל לחיצה על "הגרל מספרים חדשים" מתקבלת דוגמה חדשה עם פתרון מלא צעד-אחר-צעד.
 */
import { mulberry32 } from '../render/ink';
import { cubeMetrics, realSizeUm, totalMagnification } from '../sim/models';
import * as O from '../sim/osmosis';

export interface WorkedProblem {
  lesson: number;
  title: string;
  question: string;
  steps: string[];
  answer: string;
}

export function buildWorkedProblems(seed = 1): WorkedProblem[] {
  const rnd = mulberry32(seed);
  const pick = <T>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];

  // 1. מיקרוסקופ והגדלה (שיעור 2)
  const eyepiece = pick([10, 15]);
  const objective = pick([4, 10, 40]);
  const mag = totalMagnification(eyepiece, objective);
  const realUm = pick([20, 40, 50, 80, 100]);
  const imageMm = (realUm * mag) / 1000;

  // 2. יחס שטח פנים לנפח (שיעור 9)
  const side = pick([2, 3, 4, 5, 6]);
  const sub = pick([1, 2, 3]);
  const cm = cubeMetrics(side, sub);

  // 3. אוסמוזה (שיעור 7)
  const cOut = pick([0.2, 0.4, 0.9, 1.8, 2.6]);
  const ton = O.tonicity(cOut);
  const dirText = ton === 'iso'
    ? 'אין תנועה נטו של מים (קצב הכניסה שווה לקצב היציאה), ונפח התא נשאר קבוע'
    : ton === 'hypo'
    ? 'מים נכנסים לתא באוסמוזה (מריכוז מומסים נמוך לגבוה), והתא מתנפח'
    : 'מים יוצאים מהתא באוסמוזה אל התמיסה החיצונית, והתא מתכווץ';

  // 4. מאזן אנרגיה ונשימה תאית (שיעור 11)
  const glucMols = pick([2, 3, 4, 5, 6]);
  const atpPerGluc = 30;
  const totalAtp = glucMols * atpPerGluc;
  const o2Needed = glucMols * 6;

  return [
    {
      lesson: 2,
      title: 'חישוב הגדלה וגודל אמיתי במיקרוסקופ',
      question: `תלמיד מתבונן בתא דרך מיקרוסקופ שבו עינית <bdi>×${eyepiece}</bdi> ועצמית <bdi>×${objective}</bdi>. אורך התא בתמונה הנצפית הוא <bdi>${imageMm.toFixed(1)} mm</bdi>. מהו אורכו האמיתי של התא במיקרומטרים (<bdi>µm</bdi>)?`,
      steps: [
        `נחשב תחילה את ההגדלה הכוללת: <bdi>×${eyepiece} × ×${objective} = ×${mag}</bdi>.`,
        `נמיר את אורך התמונה ממילימטרים למיקרומטרים: <bdi>${imageMm.toFixed(1)} mm × 1,000 = ${(imageMm * 1000).toFixed(0)} µm</bdi>.`,
        `נחלק בהגדלה הכוללת: <bdi>${(imageMm * 1000).toFixed(0)} µm ÷ ${mag} = ${realSizeUm(imageMm, mag).toFixed(0)} µm</bdi>.`,
      ],
      answer: `${realSizeUm(imageMm, mag).toFixed(0)} µm`,
    },
    {
      lesson: 9,
      title: 'יחס שטח פנים לנפח של רקמת תאים',
      question: `רקמה קובייתית שאורך צלעה הכולל <bdi>${side} µm</bdi> מחולקת ל-<bdi>${cm.count}</bdi> תאים קובייתיים שווים (<bdi>${sub}×${sub}×${sub}</bdi>). מהו שטח הפנים הכולל, הנפח הכולל ויחס שטח הפנים לנפח?`,
      steps: [
        `אורך הצלע של כל תא בודד הוא <bdi>${side} ÷ ${sub} = ${cm.cellSide.toFixed(2)} µm</bdi>.`,
        `הנפח הכולל נשמר ושווה ל-<bdi>${side}³ = ${cm.volume} µm³</bdi>.`,
        `שטח הפנים הכולל של כל <bdi>${cm.count}</bdi> התאים הוא <bdi>${cm.count} × 6 × ${cm.cellSide.toFixed(2)}² = ${Math.round(cm.surfaceArea)} µm²</bdi>.`,
        `לכן יחס שטח הפנים לנפח הוא <bdi>${Math.round(cm.surfaceArea)} ÷ ${cm.volume} = ${cm.ratio.toFixed(2)} µm⁻¹</bdi>.`,
      ],
      answer: `שטח/נפח = ${cm.ratio.toFixed(2)}`,
    },
    {
      lesson: 7,
      title: 'חיזוי כיוון אוסמוזה ומצב התא',
      question: `תא דם אדום (שריכוז המומסים בתוכו שווה ערך ל-<bdi>${O.ISOTONIC}%</bdi> מלח) מוכנס לתמיסת מלח בריכוז <bdi>${cOut.toFixed(1)}%</bdi>. מהו סוג התמיסה ומה יקרה לתא?`,
      steps: [
        `נשווה את ריכוז התמיסה החיצונית (<bdi>${cOut.toFixed(1)}%</bdi>) לריכוז הפנימי (<bdi>${O.ISOTONIC}%</bdi>).`,
        `התמיסה החיצונית היא <b>${O.TONICITY_HE[ton]}</b> ביחס לתא.`,
        `${dirText}.`,
      ],
      answer: `תמיסה ${O.TONICITY_HE[ton]}`,
    },
    {
      lesson: 11,
      title: 'מאזן חמצן ו-ATP בנשימה תאית אווירנית',
      question: `תא שריר מפרק במלואן <bdi>${glucMols}</bdi> מולקולות גלוקוז בנשימה תאית אווירנית במיטוכונדריה (לפי כ-<bdi>${atpPerGluc}</bdi> מולקולות ATP לכל מולקולת גלוקוז). כמה מולקולות חמצן (<bdi>O₂</bdi>) נצרכות וכמה מולקולות ATP מופקות?`,
      steps: [
        `לפי משוואת הנשימה התאית: <bdi>C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O</bdi>, כל מולקולת גלוקוז צורכת <bdi>6</bdi> מולקולות חמצן.`,
        `לכן נצרכות <bdi>${glucMols} × 6 = ${o2Needed}</bdi> מולקולות <bdi>O₂</bdi> (ונפלטות <bdi>${o2Needed}</bdi> מולקולות <bdi>CO₂</bdi>).`,
        `מספר מולקולות ה-ATP שמופקות הוא <bdi>${glucMols} × ${atpPerGluc} = ${totalAtp}</bdi>.`,
      ],
      answer: `${o2Needed} O₂, ${totalAtp} ATP`,
    },
  ];
}

export interface SourceRef {
  title: string;
  org: string;
  note: string;
}

export const sources: SourceRef[] = [
  {
    title: 'תוכנית הלימודים בביולוגיה לכיתה י׳ – מבוא לביולוגיה של האדם בדגש הומאוסטזיס: התא – מבנה ופעילות',
    org: 'משרד החינוך, המזכירות הפדגוגית – הפיקוח על הוראת הביולוגיה',
    note: 'מפרט התכנים, מושגי היסוד והמיומנויות במדעי החיים לחטיבה העליונה.',
  },
  {
    title: 'התא – יחידת החיים (ספר לימוד לחטיבה העליונה)',
    org: 'המרכז להוראת המדעים, האוניברסיטה העברית בירושלים',
    note: 'מודלים של קרום התא, אוסמוזה בתאי בעלי חיים וצמחים, אנזימים ותהליכי אנרגיה בתא.',
  },
  {
    title: 'Molecular Biology of the Cell (7th Edition)',
    org: 'Alberts et al., Garland Science',
    note: 'נתוני סדרי גודל של תאים ואברונים, מסלול ההפרשה ומודל הפסיפס הנוזלי.',
  },
  {
    title: 'Improved determinations of red blood cell volume and geometry (Evans & Fung)',
    org: 'Microvascular Research',
    note: 'המשוואה הפרמטרית לצורת הדיסקה הקעורה של תא דם אדום במודל התלת-ממדי בשיעור 7.',
  },
];

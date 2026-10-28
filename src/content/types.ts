/** טיפוסים של תוכן הספר. הטקסט עצמו נמצא בקבצים שבתיקייה הזאת, מופרד מהקוד. */
import type { DemoFactory } from '../demos/types';

export interface Prediction {
  q: string;
  options: string[];
  correct: number;
}

export interface Lesson {
  n: number;
  title: string;
  /** משפט פתיחה קצר מתחת לכותרת. */
  lead: string;
  /** כותרת האיור שבדף השמאלי. */
  figure: string;
  prediction: Prediction;
  /** חמשת הצעדים של ההדגמה המונחית. */
  steps: [string, string, string, string, string];
  /** פסקאות ההסבר. מותר בהן HTML פשוט (<b>, <bdi>). */
  body: string[];
  /** ההסבר שמתחת לדש. */
  why: string;
  /** הוראה למצב "נסה בעצמך". */
  tryIt: string;
  /** נוסח האתגר. הבדיקה עצמה נמצאת במודול ההדגמה. */
  challenge: string;
  /** מפתחות במילון המונחים. */
  words: string[];
  demo: () => Promise<{ default: DemoFactory }>;
}

/** שורה בתוכן העניינים. שיעור שעוד אין לו תוכן מסומן "בהכנה". */
export interface CatalogEntry {
  n: number;
  title: string;
  lesson?: Lesson;
}

export interface GlossaryEntry {
  term: string;
  def: string;
}

export interface QuizQuestion {
  lesson: number;
  q: string;
  options: string[];
  correct: number;
  why: string;
}

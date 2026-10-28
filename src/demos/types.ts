import type { Stage3D } from '../render/Stage3D';
import type { Jars } from '../ui/Jars';

/** מה שהספר נותן לכל הדגמה. */
export interface DemoApi {
  stage: Stage3D;
  /** אזור הפקדים של "נסה בעצמך" (HTML). */
  controls: HTMLElement;
  /** שכבת HTML מעל ה-canvas, לתוויות ולמדדים. */
  overlay: HTMLElement;
  jars: Jars;
  /** קוראים לזה כשהתלמיד עמד באתגר. */
  challengeMet(): void;
  /** הודעה קצרה לקוראי מסך ולשורת הכיתוב. */
  say(text: string): void;
}

export interface DemoModule {
  /** מריץ צעד אחד (0..4) מתוך ההדגמה המונחית. */
  playStep(i: number): Promise<void>;
  /** מעבר למצב "נסה בעצמך": הפקדים פעילים והאתגר נבדק. */
  enterTry(): void;
  /** חזרה למצב ההדגמה (מצב התחלתי). */
  enterDemo(): void;
  dispose(): void;
}

export type DemoFactory = (api: DemoApi) => DemoModule;

import type { Stage3D } from '../render/Stage3D';
import type { Progress } from './Progress';

/** מה שכל כפולה מחזירה: שני דפים ושלושה רגעים במחזור החיים שלה. */
export interface SpreadView {
  right: HTMLElement;
  left: HTMLElement;
  /** נקרא מיד כשהכפולה נכנסת לספר (עוד לפני שהדף סיים להתהפך). */
  enter?(): void;
  /** נקרא כשהדף סיים להתהפך. */
  afterTurn?(): void;
  leave?(): void;
}

export interface SpreadDef {
  id: string;
  /** שם קצר להודעות לקוראי מסך. */
  label: string;
  build(ctx: BookCtx, index: number): SpreadView;
}

export interface BookCtx {
  stage: Stage3D | null;
  progress: Progress;
  go(id: string): Promise<void>;
  /** מספר העמוד הימני של כפולה לפי מזהה. */
  pageOf(id: string): number;
  announce(text: string): void;
}

/** בונה דף ספר: מסגרת, תוכן גלול ומספר עמוד. */
export function page(side: 'right' | 'left', num: number, ...content: (Node | string)[]) {
  const el = document.createElement('section');
  el.className = `page page-${side}`;
  const inner = document.createElement('div');
  inner.className = 'page-inner';
  inner.append(...content);
  const foot = document.createElement('footer');
  foot.className = 'folio';
  foot.textContent = String(num);
  el.append(inner, foot);
  return el;
}

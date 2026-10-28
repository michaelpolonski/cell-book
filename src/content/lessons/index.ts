import type { CatalogEntry, Lesson } from '../types';
import l01 from './01-scale';
import l02 from './02-microscope';
import l03 from './03-prok-euk';
import l04 from './04-organelles';
import l05 from './05-protein-line';
import l06 from './06-membrane';
import l07 from './07-osmosis';
import l08 from './08-active';
import l09 from './09-sa-vol';
import l10 from './10-enzymes';
import l11 from './11-energy';

export const readyLessons: Lesson[] = [l01, l02, l03, l04, l05, l06, l07, l08, l09, l10, l11];

export const catalog: CatalogEntry[] = readyLessons.map((lesson) => ({
  n: lesson.n,
  title: lesson.title,
  lesson,
}));

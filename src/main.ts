import '@fontsource-variable/frank-ruhl-libre';
import '@fontsource-variable/assistant';
import './styles/base.css';

import { Stage3D, hasWebGL } from './render/Stage3D';
import { Progress } from './book/Progress';
import { Book } from './book/Book';
import { coverSpread, contentsSpread, workedSpread, glossarySpread, quizSpread } from './book/ExtraSpreads';
import { lessonSpread } from './book/LessonSpread';
import { readyLessons } from './content/lessons';

const progress = new Progress();
const stage = hasWebGL() ? new Stage3D() : null;

const spreads = [
  coverSpread,
  contentsSpread,
  ...readyLessons.map(lessonSpread),
  workedSpread,
  glossarySpread,
  quizSpread,
];

const app = document.getElementById('app')!;
const book = new Book(spreads, stage, progress, app);

const preferStill = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (progress.still ?? preferStill) book.toggleStill(true);

book.start();
document.getElementById('loader')?.classList.add('done');

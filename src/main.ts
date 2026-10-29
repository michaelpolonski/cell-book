import '@fontsource-variable/frank-ruhl-libre';
import '@fontsource-variable/assistant';
import './styles/base.css';

import { Stage3D, hasWebGL } from './render/Stage3D';
import { Progress } from './book/Progress';
import { Book } from './book/Book';
import { coverSpread, contentsSpread, workedSpread, glossarySpread, quizSpread } from './book/ExtraSpreads';
import { lessonSpread } from './book/LessonSpread';
import { readyLessons } from './content/lessons';
import { World } from './scene/World';
import { Jars } from './ui/Jars';
import { sound } from './scene/Sound';

const progress = new Progress();
const gl = hasWebGL();

// כמו ב-Every Joule: כל הספר בסצנת Three.js אחת. ה-HTML יושב מעליה ומחזיק את הטקסט והכפתורים.
let world: World | null = null;
let stage: Stage3D | null = null;
if (gl) {
  try {
    world = new World(document.body);
    stage = new Stage3D();
    world.attachStage(stage);
    stage.onLift = () => { world!.drawAndLift(); sound.play('pen'); };
    stage.onFlatten = () => world!.flatten();
    Jars.glow = true;
    document.body.classList.add('world');
  } catch (e) {
    console.warn('WebGL world failed, falling back to HTML book', e);
    world = null; stage = null;
  }
}

const spreads = [
  coverSpread,
  contentsSpread,
  ...readyLessons.map(lessonSpread),
  workedSpread,
  glossarySpread,
  quizSpread,
];

const app = document.getElementById('app')!;
const book = new Book(spreads, stage, progress, app, world);

const preferStill = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (progress.still ?? preferStill) book.toggleStill(true);

document.fonts.ready.then(() => {
  book.start();
  document.getElementById('loader')?.classList.add('done');
  setTimeout(() => sound.play('bookThud'), 120);
});

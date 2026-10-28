/**
 * כפולה של שיעור: הדף הימני מכיל את הטקסט, הניבוי, הדש והמילים; הדף השמאלי מכיל
 * את הבמה התלת-ממדית, נגן ההדגמה, פקדי "נסה בעצמך", הצנצנות, האתגר והחותמת.
 */
import type { Lesson } from '../content/types';
import type { DemoModule } from '../demos/types';
import type { StepKey } from './Progress';
import { type SpreadDef, page } from './types';
import { Jars } from '../ui/Jars';
import { StepPlayer } from '../ui/StepPlayer';
import { h, tickGroup, flap, wordChips, stampSvg } from '../ui/components';
import { icons } from '../ui/icons';

const STEP_LABELS: [StepKey, string][] = [
  ['predict', 'סמן ניבוי לפני שמתחילים'],
  ['watch', 'צפה באיור שמתרומם מהדף'],
  ['try', 'נסה בעצמך: הצנצנות מראות לאן הכל הולך'],
  ['why', 'הרם את הדש כדי לגלות למה'],
  ['stamp', 'עמוד באתגר כדי לזכות בחותמת'],
];

export function lessonSpread(lesson: Lesson): SpreadDef {
  return {
    id: `lesson-${lesson.n}`,
    label: `שיעור ${lesson.n}: ${lesson.title}`,
    build(ctx, idx) {
      const { progress } = ctx;
      const ansKey = `pred.${lesson.n}`;
      const flapKey = `flap.${lesson.n}`;

      // ---------- דף ימין: טקסט ----------
      const ribbon = h('ol', { class: 'steps-ribbon', 'aria-label': 'שלבי השיעור' });
      const syncRibbon = () => {
        const done = new Set(progress.steps(lesson.n));
        ribbon.innerHTML = STEP_LABELS.map(([k, txt], i) =>
          `<li class="${done.has(k) ? 'done' : ''}"><span class="rn">${done.has(k) ? icons.tick : i + 1}</span><span>${txt}</span></li>`).join('');
      };
      syncRibbon();

      const predCard = h('section', { class: 'card card-pred' });
      predCard.append(h('div', { class: 'kicker' }, '1 · סמן ניבוי לפני שמתחילים'));
      const predTicks = tickGroup(lesson.prediction.q, lesson.prediction.options, progress.answer(ansKey), (i) => {
        progress.setAnswer(ansKey, i);
        progress.mark(lesson.n, 'predict');
        player.setEnabled(true);
        modeBar.classList.remove('locked');
        syncRibbon();
        if (whyFlapEl.classList.contains('open')) markCorrect();
      });
      predCard.append(predTicks);

      const markCorrect = () => {
        const picked = progress.answer(ansKey);
        predTicks.querySelectorAll('.tick-opt').forEach((el, i) => {
          el.classList.toggle('is-right', i === lesson.prediction.correct);
          el.classList.toggle('is-wrong', i === picked && i !== lesson.prediction.correct);
        });
      };

      const bodyEl = h('div', { class: 'prose' }, lesson.body.map((p) => `<p>${p}</p>`).join(''));

      const whyText = () => {
        const picked = progress.answer(ansKey);
        const right = picked === lesson.prediction.correct;
        const head = picked === undefined ? '' : right
          ? `<p class="verdict right"><b>צדקת!</b> ${lesson.prediction.options[lesson.prediction.correct]}.</p>`
          : `<p class="verdict wrong"><b>התשובה הנכונה:</b> ${lesson.prediction.options[lesson.prediction.correct]}.</p>`;
        return `${head}<p>${lesson.why}</p>`;
      };
      const whyHolder = h('div');
      const { el: whyFlapEl } = flap('4 · הרם את הדש כדי לגלות למה', '', {
        locked: () => (progress.answer(ansKey) === undefined ? 'סמן קודם ניבוי למעלה, ואז הרם את הדש.' : null),
        open: progress.flapOpen(flapKey),
        onOpen: (el) => {
          el.querySelector('.flap-under')!.innerHTML = whyText();
          progress.openFlap(flapKey);
          progress.mark(lesson.n, 'why');
          markCorrect();
          syncRibbon();
        },
      });
      whyHolder.append(whyFlapEl);

      const wordsSec = h('section', { class: 'words-sec' }, '<h3 class="subhead">מילים בדף הזה</h3>');
      wordsSec.append(wordChips(lesson.words, () => ctx.go('glossary')));

      const right = page(
        'right', 2 * idx + 1,
        h('header', { class: 'lesson-head' }, `<div class="eyebrow">שיעור ${lesson.n}</div><h1>${lesson.title}</h1><p class="lead">${lesson.lead}</p>`),
        ribbon,
        predCard,
        bodyEl,
        whyHolder,
        wordsSec,
      );

      // ---------- דף שמאל: במה ----------
      let demo: DemoModule | null = null;
      let active = true;
      const jars = new Jars();
      const stageBox = h('div', { class: 'stage-box' });
      const overlay = h('div', { class: 'stage-overlay' });
      stageBox.append(overlay);

      const modeBar = h('div', { class: `mode-tabs ${progress.answer(ansKey) === undefined ? 'locked' : ''}`, role: 'tablist' },
        `<button type="button" role="tab" data-m="demo" aria-selected="true">2 · ההדגמה בחמישה צעדים</button>
         <button type="button" role="tab" data-m="try" aria-selected="false">3 · נסה בעצמך</button>`);
      const controls = h('div', { class: 'try-controls', hidden: '' }, `<p class="try-hint">${lesson.tryIt}</p><div class="try-inputs"></div>`);
      const inputs = controls.querySelector('.try-inputs') as HTMLElement;

      const player = new StepPlayer(lesson.steps, {
        playStep: async (i) => {
          progress.mark(lesson.n, 'watch');
          syncRibbon();
          if (demo) await demo.playStep(i);
        },
        setPaused: (p) => { if (ctx.stage) ctx.stage.timeScale = p ? 0 : 1; },
        onDone: () => setMode('try'),
      });
      if (progress.answer(ansKey) !== undefined) player.setEnabled(true);

      const setMode = (m: 'demo' | 'try') => {
        if (m === 'try' && progress.answer(ansKey) === undefined) return;
        modeBar.querySelectorAll('[role=tab]').forEach((b) => b.setAttribute('aria-selected', String((b as HTMLElement).dataset.m === m)));
        player.el.hidden = m !== 'demo';
        controls.hidden = m !== 'try';
        if (m === 'try') {
          player.stop();
          progress.mark(lesson.n, 'try');
          syncRibbon();
          demo?.enterTry();
        } else {
          demo?.enterDemo();
        }
      };
      modeBar.querySelectorAll<HTMLButtonElement>('[role=tab]').forEach((b) =>
        b.addEventListener('click', () => setMode(b.dataset.m as 'demo' | 'try')),
      );

      const stampSlot = h('div', { class: `stamp-slot ${progress.hasStamp(lesson.n) ? 'stamped' : ''}` }, stampSvg(lesson.n));
      const challengeBox = h('section', { class: 'challenge' },
        `<div class="challenge-text"><div class="kicker">5 · האתגר</div><p>${lesson.challenge}</p></div>`);
      challengeBox.append(stampSlot);

      const left = page(
        'left', 2 * idx + 2,
        h('div', { class: 'fig-head' }, `<span class="fig-num">איור ${lesson.n}</span> ${lesson.figure}`),
        stageBox,
        modeBar,
        player.el,
        controls,
        jars.el,
        challengeBox,
      );

      return {
        right,
        left,
        enter() {
          if (!ctx.stage) {
            stageBox.append(h('p', { class: 'no-webgl' }, 'הדפדפן הזה לא מפעיל גרפיקה תלת-ממדית (WebGL). הטקסט, הניבוי והמבחן עובדים גם בלעדיה.'));
            return;
          }
          ctx.stage.reset();
          ctx.stage.attach(stageBox);
          ctx.stage.flatten();
          lesson.demo().then((m) => {
            if (!active || !ctx.stage) return;
            demo = m.default({
              stage: ctx.stage,
              controls: inputs,
              overlay,
              jars,
              say: (t) => ctx.announce(t),
              challengeMet: () => {
                progress.addStamp(lesson.n);
                stampSlot.classList.add('stamped', 'pop');
                syncRibbon();
                ctx.announce('עמדת באתגר! קיבלת חותמת.');
              },
            });
          });
        },
        afterTurn() { ctx.stage?.lift(); },
        leave() {
          active = false;
          player.stop();
          demo?.dispose();
          jars.clear();
        },
      };
    },
  };
}

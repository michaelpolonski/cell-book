/**
 * הדפים הראשונים והאחרונים של הספר:
 * כריכה + איך להשתמש בספר, תוכן עניינים, מילון מונחים ומבחן מסכם.
 */
import { type SpreadDef, page } from './types';
import { catalog, readyLessons } from '../content/lessons';
import { glossary } from '../content/glossary';
import { quiz } from '../content/quiz';
import { buildWorkedProblems, sources } from '../content/worked';
import { Jars } from '../ui/Jars';
import { h, tickGroup, flap, stampSvg } from '../ui/components';
import { icons } from '../ui/icons';

/** איור דיו דקורטיבי של תא לכריכה. */
const coverSvg = `<svg class="cover-art" viewBox="0 0 260 190" aria-hidden="true" fill="none" stroke="#1c2433" stroke-linecap="round">
  <defs>
    <pattern id="ch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
      <line x1="0" y1="0" x2="0" y2="6" stroke="#1c2433" stroke-opacity=".28" stroke-width="1"/>
    </pattern>
  </defs>
  <ellipse cx="130" cy="96" rx="108" ry="72" fill="#e9dec8" stroke-width="2.2"/>
  <ellipse cx="130" cy="96" rx="103" ry="67" stroke-dasharray="3 4" stroke-width="1.1"/>
  <ellipse cx="95" cy="88" rx="34" ry="28" fill="#d9c3cf" stroke-width="1.8"/>
  <ellipse cx="95" cy="88" rx="34" ry="28" fill="url(#ch)"/>
  <circle cx="90" cy="85" r="10" fill="#9a3b2a" fill-opacity=".55" stroke-width="1.4"/>
  <g transform="translate(168 68) rotate(-18)">
    <ellipse rx="24" ry="12" fill="#df9b7c" stroke-width="1.6"/>
    <path d="M-18 0c5-6 9 6 14 0s9 6 14 0 9-6 12 0" stroke-width="1.3"/>
  </g>
  <g transform="translate(162 122) rotate(22)">
    <ellipse rx="20" ry="10" fill="#df9b7c" stroke-width="1.6"/>
    <path d="M-14 0c4-5 7 5 11 0s7 5 11 0 6-5 9 0" stroke-width="1.3"/>
  </g>
  <path d="M56 58q18-10 38-4M52 122q22 14 48 8M132 54q16 8 10 24" stroke-width="1.3"/>
  <circle cx="62" cy="96" r="2"/><circle cx="70" cy="112" r="2"/><circle cx="136" cy="126" r="2"/><circle cx="144" cy="98" r="2"/><circle cx="122" cy="64" r="2"/>
</svg>`;

/** כפולה 0: כריכה (ימין) + איך להשתמש בספר וצנצנות לדוגמה (שמאל). */
export const coverSpread: SpreadDef = {
  id: 'cover',
  label: 'כריכה ואיך להשתמש בספר',
  build(ctx, idx) {
    const saved = ctx.progress.spread;
    const contBtn = saved > 0
      ? `<button type="button" class="btn" data-go="spread-${saved}">המשך מאיפה שעצרת (עמ׳ <bdi>${2 * saved + 1}</bdi>)</button>`
      : '';
    const right = page('right', 2 * idx + 1, h('div', { class: 'cover' }, `
      <div class="eyebrow">ביולוגיה לכיתה י׳ · מבוא לתא</div>
      <h1 class="book-title">כל תא ותא</h1>
      <p class="book-sub">ספר אינטראקטיבי שבו כל איור מתרומם מהדף, ואפשר לנבא, לנסות ולראות בעיניים איך התא עובד.</p>
      ${coverSvg}
      <div class="cover-actions">
        <button type="button" class="btn btn-rust" data-go="lesson-1">התחל בשיעור 1: עולם קטן ←</button>
        <button type="button" class="btn" data-go="contents">תוכן העניינים</button>
        ${contBtn}
      </div>
      <p class="cover-meta"><a href="teachers.html">דף למורים</a> · דפדוף במקשי החצים <kbd>←</kbd> <kbd>→</kbd></p>`));
    right.querySelectorAll<HTMLElement>('[data-go]').forEach((b) =>
      b.addEventListener('click', () => ctx.go(b.dataset.go!)),
    );

    const jars = new Jars();
    jars.add('w', 'מים בתא', '#9cc0de');
    jars.add('s', 'מומס', '#e9a865');
    jars.add('atp', 'ATP', '#d97a6c');
    const presets: [string, number, string, number, string, number, string][] = [
      ['תא במנוחה', 0.65, '65%', 0.35, '0.9%', 0.8, 'מלא'],
      ['במים מזוקקים', 0.95, '95%', 0.22, '0.6%', 0.8, 'מלא'],
      ['מאמץ (צריכת אנרגיה)', 0.65, '65%', 0.35, '0.9%', 0.2, 'נמוך'],
    ];
    const presetBar = h('div', { class: 'seg', role: 'group', 'aria-label': 'דוגמאות לצנצנות' });
    const applyPreset = (p: typeof presets[number], btn?: HTMLElement) => {
      presetBar.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === btn)));
      jars.set('w', p[1], p[2]); jars.set('s', p[3], p[4]); jars.set('atp', p[5], p[6]);
    };
    presets.forEach((p, i) => {
      const b = h('button', { type: 'button', 'aria-pressed': String(i === 0) }, p[0]);
      b.addEventListener('click', () => applyPreset(p, b));
      presetBar.append(b);
    });
    applyPreset(presets[0], presetBar.querySelector('button')!);

    const left = page('left', 2 * idx + 2,
      h('h2', {}, 'איך להשתמש בספר הזה'),
      h('ol', { class: 'how-list' }, `
        <li><b>סמן ניבוי לפני שמתחילים.</b> לפני שמפעילים את ההדגמה, חשוב רגע ונסה לנחש מה יקרה.</li>
        <li><b>צפה באיור שמתרומם מהדף.</b> לחץ על הפעל: ההדגמה רצה בחמישה צעדים קצרים.</li>
        <li><b>נסה בעצמך.</b> הזז את המחוונים, החלף מצבים וסובב את האיור עם העכבר או האצבע.</li>
        <li><b>הרם את הדש כדי לגלות למה.</b> מתחת לדש הנייר מחכה ההסבר המלא, כולל בדיקה של הניבוי שלך.</li>
        <li><b>עמוד באתגר כדי לזכות בחותמת.</b> לכל שיעור יש חותמת אדומה משלו, שנשמרת בתוכן העניינים.</li>`),
      h('h3', { class: 'subhead' }, 'הצנצנות בספר הזה'),
      h('p', {}, 'כל צנצנת היא מודל לכמות אחת בתא או סביבו: מים, מומס או אנרגיה (ATP). המפלס מראה כמה יש בכל רגע. לחץ כדי לראות איך הן מגיבות:'),
      presetBar,
      jars.el,
    );
    return { right, left, leave: () => jars.clear() };
  },
};

/** כפולה 1: תוכן העניינים. */
export const contentsSpread: SpreadDef = {
  id: 'contents',
  label: 'תוכן העניינים',
  build(ctx, idx) {
    const list = h('ol', { class: 'toc-list' });
    for (const c of catalog) {
      const li = h('li', { class: `toc-row ${c.lesson ? 'ready' : 'soon'}` });
      const stamped = ctx.progress.hasStamp(c.n);
      if (c.lesson) {
        const pg = ctx.pageOf(`lesson-${c.n}`);
        const btn = h('button', { type: 'button', class: 'toc-link' }, `
          <span class="toc-n">שיעור ${c.n}</span>
          <span class="toc-t">${c.title}</span>
          <span class="toc-dots" aria-hidden="true"></span>
          <span class="toc-stamp" title="${stamped ? 'הושלם – יש חותמת' : 'עוד אין חותמת'}">${stamped ? icons.tick : '○'}</span>
          <bdi class="toc-p">${pg}</bdi>`);
        btn.addEventListener('click', () => ctx.go(`lesson-${c.n}`));
        li.append(btn);
      } else {
        li.innerHTML = `<div class="toc-link"><span class="toc-n">שיעור ${c.n}</span><span class="toc-t">${c.title}</span><span class="toc-dots"></span><span class="toc-soon">בהכנה</span></div>`;
      }
      list.append(li);
    }

    const backLinks = h('div', { class: 'toc-back' }, `
      <h3 class="subhead">בסוף הספר</h3>
      <button type="button" class="toc-link" data-go="worked"><span>תרגילים פתורים ומקורות</span><span class="toc-dots"></span><bdi class="toc-p">${ctx.pageOf('worked')}</bdi></button>
      <button type="button" class="toc-link" data-go="glossary"><span>מילון מונחים</span><span class="toc-dots"></span><bdi class="toc-p">${ctx.pageOf('glossary')}</bdi></button>
      <button type="button" class="toc-link" data-go="quiz"><span>המבחן המסכם</span><span class="toc-dots"></span><bdi class="toc-p">${ctx.pageOf('quiz')}</bdi></button>`);
    backLinks.querySelectorAll<HTMLElement>('[data-go]').forEach((b) =>
      b.addEventListener('click', () => ctx.go(b.dataset.go!)),
    );

    const stampsGrid = h('div', { class: 'stamps-grid' });
    for (const l of readyLessons) {
      const got = ctx.progress.hasStamp(l.n);
      const cell = h('button', { type: 'button', class: `stamp-cell ${got ? 'got' : ''}`, title: `שיעור ${l.n}: ${l.title}` },
        `${stampSvg(l.n, got ? 'הושלם' : 'ממתין')}<span>שיעור ${l.n}: ${l.title}</span>`);
      cell.addEventListener('click', () => ctx.go(`lesson-${l.n}`));
      stampsGrid.append(cell);
    }

    const right = page('right', 2 * idx + 1,
      h('header', { class: 'lesson-head' }, '<div class="eyebrow">תוכן</div><h1>תוכן העניינים</h1><p class="lead">אחד-עשר שיעורים, מהמיקרוסקופ ועד האנרגיה בתא.</p>'),
      list,
      backLinks,
    );
    const left = page('left', 2 * idx + 2,
      h('h2', {}, 'החותמות שלך'),
      h('p', {}, `אספת <b>${ctx.progress.stampCount}</b> מתוך <b>${readyLessons.length}</b> חותמות זמינות. עמוד באתגר שבסוף כל שיעור כדי להחתים אותו.`),
      stampsGrid,
    );
    return { right, left };
  },
};

/** מילון מונחים: מחולק בין שני הדפים, עם מספרי עמודים לחיצים. */
export const glossarySpread: SpreadDef = {
  id: 'glossary',
  label: 'מילון מונחים',
  build(ctx, idx) {
    const sorted = [...glossary].sort((a, b) => a.term.localeCompare(b.term, 'he'));
    const mid = Math.ceil(sorted.length / 2);
    const renderList = (items: typeof sorted) => {
      const dl = h('dl', { class: 'gloss' });
      for (const g of items) {
        const lessons = readyLessons.filter((l) => l.words.includes(g.term));
        const dt = h('dt', {}, `<b>${g.term}</b>`);
        const links = h('span', { class: 'gloss-pages' });
        for (const l of lessons) {
          const pg = ctx.pageOf(`lesson-${l.n}`);
          const a = h('button', { type: 'button', class: 'pg-ref', title: `לשיעור ${l.n}: ${l.title}` }, `עמ׳ ${pg}`);
          a.addEventListener('click', () => ctx.go(`lesson-${l.n}`));
          links.append(a);
        }
        dt.append(links);
        dl.append(dt, h('dd', {}, g.def));
      }
      return dl;
    };
    const right = page('right', 2 * idx + 1,
      h('header', { class: 'lesson-head' }, '<div class="eyebrow">מונחים</div><h1>מילון מונחים</h1><p class="lead">כל מילת מפתח בספר, עם הגדרה קצרה. המספרים האדומים מובילים לעמוד שבו המונח מופיע.</p>'),
      renderList(sorted.slice(0, mid)),
    );
    const left = page('left', 2 * idx + 2, renderList(sorted.slice(mid)));
    return { right, left };
  },
};

/** המבחן המסכם: מסמנים תשובה ואז מרימים את הדש. */
export const quizSpread: SpreadDef = {
  id: 'quiz',
  label: 'המבחן המסכם',
  build(ctx, idx) {
    const scoreEl = h('p', { class: 'quiz-score', 'aria-live': 'polite' });
    const updateScore = () => {
      let opened = 0, right = 0;
      quiz.forEach((q, i) => {
        if (ctx.progress.flapOpen(`quiz.${i}`)) {
          opened++;
          if (ctx.progress.answer(`quiz.${i}`) === q.correct) right++;
        }
      });
      scoreEl.innerHTML = opened === 0
        ? 'סמן תשובה לכל שאלה, ואז הרם את הדש שלה כדי לבדוק.'
        : `בדקת <b>${opened}</b> מתוך <b>${quiz.length}</b> שאלות · <b>${right}</b> נכונות.`;
    };

    const renderQ = (q: typeof quiz[number], i: number) => {
      const aKey = `quiz.${i}`, fKey = `quiz.${i}`;
      const card = h('article', { class: 'card quiz-q' });
      card.append(h('div', { class: 'kicker' }, `שאלה ${i + 1} · שיעור ${q.lesson}`));
      let flEl: HTMLElement | null = null;
      const ticks = tickGroup(q.q, q.options, ctx.progress.answer(aKey), (pick) => {
        ctx.progress.setAnswer(aKey, pick);
        if (flEl?.classList.contains('open')) paint(flEl);
      });
      const paint = (el: HTMLElement) => {
        const p = ctx.progress.answer(aKey);
        ticks.querySelectorAll('.tick-opt').forEach((opt, k) => {
          opt.classList.toggle('is-right', k === q.correct);
          opt.classList.toggle('is-wrong', k === p && k !== q.correct);
        });
        const ok = p === q.correct;
        el.querySelector('.flap-under')!.innerHTML =
          `<p class="verdict ${ok ? 'right' : 'wrong'}"><b>${ok ? 'נכון!' : `התשובה הנכונה: ${q.options[q.correct]}`}</b></p><p>${q.why}</p>`;
        updateScore();
      };
      const fl = flap('הרם את הדש לבדיקה', '', {
        locked: () => (ctx.progress.answer(aKey) === undefined ? 'סמן קודם תשובה למעלה.' : null),
        open: ctx.progress.flapOpen(fKey),
        onOpen: (el) => { flEl = el; ctx.progress.openFlap(fKey); paint(el); },
      });
      flEl = fl.el;
      card.append(ticks, fl.el);
      return card;
    };

    const mid = Math.ceil(quiz.length / 2);
    updateScore();
    const right = page('right', 2 * idx + 1,
      h('header', { class: 'lesson-head' }, '<div class="eyebrow">בדיקה עצמית</div><h1>המבחן המסכם</h1>'),
      scoreEl,
      ...quiz.slice(0, mid).map((q, i) => renderQ(q, i)),
    );
    const left = page('left', 2 * idx + 2,
      ...quiz.slice(mid).map((q, i) => renderQ(q, i + mid)),
    );
    return { right, left };
  },
};

/** תרגילים פתורים עם מספרים אקראיים + רשימת מקורות. */
export const workedSpread: SpreadDef = {
  id: 'worked',
  label: 'תרגילים פתורים ומקורות',
  build(ctx, idx) {
    let seed = 1;
    const holder = h('div', { class: 'worked-list' });
    const reroll = h('button', { type: 'button', class: 'btn btn-rust', 'data-act': 'reroll' }, 'הגרל מספרים חדשים ↻');

    const render = () => {
      holder.innerHTML = '';
      for (const p of buildWorkedProblems(seed)) {
        const card = h('article', { class: 'card' });
        card.innerHTML = `
          <div class="kicker">שיעור ${p.lesson} · ${p.title}</div>
          <p style="margin:0 0 8px"><b>שאלה:</b> ${p.question}</p>`;
        const stepsHtml = `<ol class="how-list">${p.steps.map((s) => `<li>${s}</li>`).join('')}</ol>
          <p class="verdict right"><b>תשובה סופית:</b> <bdi>${p.answer}</bdi></p>`;
        const fl = flap('הרם את הדש לפתרון מלא צעד-אחר-צעד', stepsHtml);
        card.append(fl.el);
        holder.append(card);
      }
    };
    reroll.addEventListener('click', () => {
      seed++;
      render();
      ctx.announce('הוגרלו מספרים חדשים לתרגילים.');
    });
    render();

    const srcList = h('dl', { class: 'gloss' });
    for (const s of sources) {
      srcList.append(
        h('dt', {}, `<b>${s.title}</b> <span style="color:var(--rust);font-size:12.5px">${s.org}</span>`),
        h('dd', {}, s.note),
      );
    }

    const right = page('right', 2 * idx + 1,
      h('header', { class: 'lesson-head' }, '<div class="eyebrow">תרגול חישובי</div><h1>תרגילים פתורים</h1><p class="lead">פתור בעצמך ואז הרם את הדש לבדיקה. לחץ על הכפתור כדי להגריל נתונים חדשים.</p>'),
      reroll,
      holder,
    );
    const left = page('left', 2 * idx + 2,
      h('header', { class: 'lesson-head' }, '<div class="eyebrow">סימוכין</div><h1>מקורות וערכים מדעיים</h1><p class="lead">כל הגדלים, הריכוזים והמודלים בספר מבוססים על תוכנית הלימודים והספרות המדעית.</p>'),
      srcList,
    );
    return { right, left };
  },
};


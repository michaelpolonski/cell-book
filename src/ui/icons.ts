/** אייקונים בקו דק (SVG), בסגנון של הספר. */
const svg = (d: string, extra = '') =>
  `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" ${extra}>${d}</svg>`;

export const icons = {
  contents: svg('<path d="M5 6.5h14M5 12h14M5 17.5h9"/>'),
  // ב-RTL "הבא" מצביע שמאלה ו"הקודם" ימינה
  next: svg('<path d="M15 5l-7 7 7 7"/>'),
  prev: svg('<path d="M9 5l7 7-7 7"/>'),
  glossary: svg('<path d="M5 4.5h10.5A3.5 3.5 0 0 1 19 8v11.5H8.5A3.5 3.5 0 0 1 5 16z"/><path d="M5 16a3.5 3.5 0 0 1 3.5-3.5H19"/>'),
  quiz: svg('<path d="M4.5 12.5l4.5 4.5 10.5-11"/>'),
  still: svg('<path d="M12 4.5a7.5 7.5 0 0 1 0 15z" fill="currentColor"/><circle cx="12" cy="12" r="7.5"/>'),
  reset: svg('<path d="M5 12a7 7 0 1 0 2.1-5"/><path d="M5 4.5V9h4.5"/>'),
  play: svg('<path d="M8 5.5v13l10-6.5z" fill="currentColor"/>'),
  pause: svg('<path d="M8 5.5v13M16 5.5v13" stroke-width="3"/>'),
  replay: svg('<path d="M5 12a7 7 0 1 0 2.1-5"/><path d="M5 4.5V9h4.5"/>'),
  tick: svg('<path d="M5 12.5l4.5 4.5L19 7"/>', 'class="tick"'),
};

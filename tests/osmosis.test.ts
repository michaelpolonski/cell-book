import { describe, it, expect } from 'vitest';
import * as O from '../src/sim/osmosis';
import { SCALE_ITEMS, totalMagnification, realSizeUm, cubeMetrics, ENZYMES, enzymeRate } from '../src/sim/models';
import { buildWorkedProblems, sources } from '../src/content/worked';
import { readyLessons, catalog } from '../src/content/lessons';
import { glossaryMap } from '../src/content/glossary';
import { quiz } from '../src/content/quiz';

describe('osmosis model', () => {
  it('stays at V=1 in an isotonic solution', () => {
    let s = O.newCell('animal');
    for (let i = 0; i < 60; i++) s = O.step(s, O.ISOTONIC, 0.1);
    expect(s.V).toBeCloseTo(1, 5);
    expect(s.burst).toBe(false);
    expect(O.tonicity(O.ISOTONIC)).toBe('iso');
  });

  it('swells and bursts an animal cell in distilled water (hemolysis)', () => {
    let s = O.newCell('animal');
    for (let i = 0; i < 60; i++) s = O.step(s, 0, 0.1);
    expect(s.burst).toBe(true);
    expect(s.V).toBeCloseTo(O.LIMITS.animalBurst, 5);
  });

  it('shrinks an animal cell in a hypertonic solution', () => {
    let s = O.newCell('animal');
    for (let i = 0; i < 100; i++) s = O.step(s, 2.5, 0.1);
    expect(s.V).toBeLessThan(0.65);
    expect(s.V).toBeGreaterThanOrEqual(O.LIMITS.animalMin);
    expect(s.burst).toBe(false);
  });

  it('stops a plant cell at the wall and builds turgor instead of bursting', () => {
    let s = O.newCell('plant');
    for (let i = 0; i < 60; i++) s = O.step(s, 0, 0.1);
    expect(s.burst).toBe(false);
    expect(s.V).toBe(O.LIMITS.plantMax);
    expect(O.turgor(s, 0)).toBeCloseTo(1, 5);
  });

  it('plasmolyses a plant cell in a hypertonic solution', () => {
    let s = O.newCell('plant');
    for (let i = 0; i < 100; i++) s = O.step(s, 2.5, 0.1);
    expect(s.V).toBeCloseTo(O.LIMITS.plantMin, 2);
    expect(O.turgor(s, 2.5)).toBe(0);
  });
});

describe('quantitative biology models', () => {
  it('orders scale items strictly from smallest to largest', () => {
    for (let i = 1; i < SCALE_ITEMS.length; i++) {
      expect(SCALE_ITEMS[i].um).toBeGreaterThan(SCALE_ITEMS[i - 1].um);
      expect(SCALE_ITEMS[i].exp).toBeGreaterThan(SCALE_ITEMS[i - 1].exp);
    }
  });

  it('computes microscope magnification and real cell size accurately', () => {
    const mag = totalMagnification(10, 40);
    expect(mag).toBe(400);
    expect(realSizeUm(24, mag)).toBeCloseTo(60, 5);
  });

  it('computes surface-area-to-volume ratio and subdivision amplification', () => {
    const single = cubeMetrics(6, 1);
    expect(single.surfaceArea).toBe(216);
    expect(single.volume).toBe(216);
    expect(single.ratio).toBeCloseTo(1, 5);

    const divided = cubeMetrics(6, 3);
    expect(divided.count).toBe(27);
    expect(divided.volume).toBe(216);
    expect(divided.ratio).toBeCloseTo(3, 5);
  });

  it('peaks enzyme activity at optimum temperature and pH and drops to zero upon denaturation', () => {
    expect(enzymeRate(ENZYMES.amylase, 37, 7.0)).toBeCloseTo(1, 3);
    expect(enzymeRate(ENZYMES.pepsin, 37, 2.0)).toBeCloseTo(1, 3);
    expect(enzymeRate(ENZYMES.pepsin, 37, 7.0)).toBeLessThan(0.05);
    expect(enzymeRate(ENZYMES.amylase, 55, 7.0)).toBe(0);
  });

  it('generates deterministic randomized worked problems across seeds', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const probs = buildWorkedProblems(seed);
      expect(probs).toHaveLength(4);
      for (const p of probs) {
        expect(p.steps.length).toBeGreaterThanOrEqual(3);
        expect(p.answer.length).toBeGreaterThan(2);
      }
    }
    expect(sources.length).toBeGreaterThanOrEqual(3);
  });
});

describe('content contract across all 11 lessons', () => {
  it('has all 11 lessons ready with 5 steps, valid prediction, and glossary coverage', () => {
    expect(catalog).toHaveLength(11);
    expect(readyLessons).toHaveLength(11);
    readyLessons.forEach((l, idx) => {
      expect(l.n).toBe(idx + 1);
      expect(l.steps).toHaveLength(5);
      expect(l.prediction.options.length).toBeGreaterThanOrEqual(2);
      expect(l.prediction.correct).toBeGreaterThanOrEqual(0);
      expect(l.prediction.correct).toBeLessThan(l.prediction.options.length);
      expect(l.body.length).toBeGreaterThanOrEqual(2);
      for (const w of l.words) {
        expect(glossaryMap.has(w), `lesson ${l.n} missing glossary term: ${w}`).toBe(true);
      }
    });
  });

  it('covers all 11 lessons in the final quiz with valid answers', () => {
    expect(quiz.length).toBeGreaterThanOrEqual(11);
    const covered = new Set(quiz.map((q) => q.lesson));
    for (let n = 1; n <= 11; n++) expect(covered.has(n), `quiz missing lesson ${n}`).toBe(true);
    for (const q of quiz) {
      expect(q.correct).toBeGreaterThanOrEqual(0);
      expect(q.correct).toBeLessThan(q.options.length);
      expect(q.why.length).toBeGreaterThan(10);
    }
  });
});

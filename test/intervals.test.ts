import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { mergeIntervals, type Interval } from '../src/intervals';

// Recitation Part 2 (groups) and problem set Task 2.
// Read the spec in src/intervals/mergeIntervals.ts, then check your progress
// with `npm run mutants:intervals`.
//
// Label every property with its pattern, on the line above its `it(`:
//   // Pattern: invariant. The output is sorted.
// (invariant, algebraic, metamorphic, differential, or conditional)

// start + length, so start <= end always. Small numbers so intervals overlap and touch a lot.
const interval: fc.Arbitrary<Interval> = fc
  .tuple(fc.integer({ min: -10, max: 10 }), fc.nat(4))
  .map(([s, len]) => [s, s + len]);
const intervalList = fc.array(interval, { maxLength: 8 });

// check half points too (like 2.5) since the spec is about all real numbers
const point = fc.integer({ min: -30, max: 40 }).map(n => n / 2);

const covered = (xs: Interval[], p: number) => xs.some(([a, b]) => a <= p && p <= b);

describe('mergeIntervals', () => {
  // Pattern: invariant. Every input interval lies inside some output interval.
  it('every input interval lies inside some output interval', () => {
    fc.assert(
      fc.property(intervalList, xs => {
        const out = mergeIntervals(xs);
        const uncovered = xs.filter(([s, e]) => !out.some(([a, b]) => a <= s && e <= b));
        expect(uncovered).toEqual([]);
      }),
    );
  });

  // Pattern: invariant. The output is sorted and there's a gap between neighbouring intervals.
  it('output is sorted with gaps between intervals', () => {
    fc.assert(
      fc.property(intervalList, xs => {
        const out = mergeIntervals(xs);
        for (let i = 0; i + 1 < out.length; i++) expect(out[i][1]).toBeLessThan(out[i + 1][0]);
      }),
    );
  });

  // Pattern: differential. A point is covered by the output exactly when it's covered by the input.
  it('covers exactly the same points as the input', () => {
    fc.assert(
      fc.property(intervalList, fc.array(point, { maxLength: 20 }), (xs, ps) => {
        const out = mergeIntervals(xs);
        for (const p of ps) expect(covered(out, p)).toBe(covered(xs, p));
      }),
    );
  });

  // Pattern: metamorphic. Shuffling the input doesn't change the output.
  it('input order does not matter', () => {
    const listAndShuffled = intervalList.chain(xs =>
      fc.tuple(fc.constant(xs), fc.shuffledSubarray(xs, { minLength: xs.length, maxLength: xs.length })),
    );
    fc.assert(
      fc.property(listAndShuffled, ([xs, ys]) => {
        expect(mergeIntervals(ys)).toEqual(mergeIntervals(xs));
      }),
    );
  });

  // Pattern: algebraic. Merging twice is the same as merging once.
  it('is idempotent', () => {
    fc.assert(
      fc.property(intervalList, xs => {
        const once = mergeIntervals(xs);
        expect(mergeIntervals(once)).toEqual(once);
      }),
    );
  });

  // Pattern: conditional. If the input intervals don't overlap or touch, the output is just the input sorted.
  it('leaves already-separate intervals alone (just sorted)', () => {
    // build sorted intervals with a gap of at least 1 between them, then shuffle
    const separate = fc
      .tuple(fc.integer({ min: -20, max: 20 }), fc.array(fc.tuple(fc.integer({ min: 1, max: 3 }), fc.nat(3))))
      .map(([start, steps]) => {
        const sorted: Interval[] = [];
        let pos = start;
        for (const [gap, len] of steps) {
          sorted.push([pos, pos + len]);
          pos += len + gap;
        }
        return sorted;
      });
    const separateAndShuffled = separate.chain(sorted =>
      fc.tuple(fc.constant(sorted), fc.shuffledSubarray(sorted, { minLength: sorted.length, maxLength: sorted.length })),
    );
    fc.assert(
      fc.property(separateAndShuffled, ([sorted, shuffled]) => {
        expect(mergeIntervals(shuffled)).toEqual(sorted);
      }),
    );
  });

  // Pattern: invariant. The input isn't modified, even if you change the output afterwards.
  it('does not modify the input', () => {
    fc.assert(
      fc.property(intervalList, xs => {
        const before = structuredClone(xs);
        const out = mergeIntervals(xs);
        expect(xs).toEqual(before);
        for (const iv of out) iv[1] += 100;
        expect(xs).toEqual(before);
      }),
    );
  });

  // Pattern: conditional. If an interval has start > end or a non-integer endpoint, it throws a RangeError.
  it('rejects invalid intervals', () => {
    const bad = fc.oneof(
      interval.map(([s, e]): Interval => [e + 1, s]),
      interval.map(([s, e]): Interval => [s + 0.5, e + 1]),
    );
    fc.assert(
      fc.property(intervalList, bad, (xs, b) => {
        expect(() => mergeIntervals([...xs, b])).toThrow(RangeError);
      }),
    );
  });

  it('spec examples', () => {
    expect(mergeIntervals([])).toEqual([]);
    expect(mergeIntervals([[1, 3], [3, 5]])).toEqual([[1, 5]]);
    expect(mergeIntervals([[3, 4], [1, 2]])).toEqual([[1, 2], [3, 4]]);
  });
});

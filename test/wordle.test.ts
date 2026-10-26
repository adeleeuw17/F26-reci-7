import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { matchGuess } from '../src/wordle';

// Recitation Part 1: follow along with your TA, filling in the todos below.
// Problem set Task 1: keep adding properties until `npm run mutants:wordle`
// kills every mutant. Read the spec in src/wordle/matchGuess.ts.
//
// Label every property with its pattern, on the line above its `it(`:
//   // Pattern: invariant. The result always has exactly five colors.
// (invariant, algebraic, metamorphic, differential, or conditional)

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const wordFrom = (letters: string) =>
  fc.array(fc.constantFrom(...letters), { minLength: 5, maxLength: 5 }).map(cs => cs.join(''));

// Small alphabet so repeated letters show up, full alphabet for everything else.
const word = fc.oneof(wordFrom('ABC'), wordFrom(ALPHABET));
const pair = fc.oneof(
  fc.tuple(wordFrom('ABC'), wordFrom('ABC')),
  fc.tuple(wordFrom(ALPHABET), wordFrom(ALPHABET)),
);
const shuffledAlphabet = fc.shuffledSubarray([...ALPHABET], { minLength: 26, maxLength: 26 });

const count = (w: string, letter: string) => [...w].filter(c => c === letter).length;
// number of times `letter` in the guess got a G or Y
const credited = (guess: string, colors: string[], letter: string) =>
  [...guess].filter((c, i) => c === letter && colors[i] !== 'B').length;

describe('matchGuess', () => {
  // Pattern: invariant. The result always has exactly five colors.
  it('returns exactly five colors', () => {
    fc.assert(
      fc.property(word, word, (secret, guess) => {
        expect(matchGuess(secret, guess)).toHaveLength(5);
      }),
    );
  });

  // Pattern: invariant. Every color is G, Y, or B.
  it('only uses the colors G, Y, B', () => {
    fc.assert(
      fc.property(word, word, (secret, guess) => {
        for (const c of matchGuess(secret, guess)) expect(['G', 'Y', 'B']).toContain(c);
      }),
    );
  });

  // Pattern: conditional. If the guess is the secret, every color is green.
  it('guessing the secret gives all greens', () => {
    fc.assert(
      fc.property(word, secret => {
        expect(matchGuess(secret, secret)).toEqual(['G', 'G', 'G', 'G', 'G']);
      }),
    );
  });

  // Pattern: invariant. A letter never gets more G/Y than the secret has of it.
  it('never credits a letter more times than the secret contains it', () => {
    fc.assert(
      fc.property(pair, ([secret, guess]) => {
        const colors = matchGuess(secret, guess);
        for (const c of guess) expect(credited(guess, colors, c)).toBeLessThanOrEqual(count(secret, c));
      }),
    );
  });

  // Pattern: differential. Position i is green exactly when guess[i] === secret[i].
  it('greens are exactly the matching positions', () => {
    fc.assert(
      fc.property(pair, ([secret, guess]) => {
        const colors = matchGuess(secret, guess);
        for (let i = 0; i < 5; i++) expect(colors[i] === 'G').toBe(guess[i] === secret[i]);
      }),
    );
  });

  // Pattern: differential. Each letter gets min(count in secret, count in guess) G/Y.
  it('credits each letter as many times as both words have it', () => {
    fc.assert(
      fc.property(pair, ([secret, guess]) => {
        const colors = matchGuess(secret, guess);
        for (const c of guess) {
          expect(credited(guess, colors, c)).toBe(Math.min(count(secret, c), count(guess, c)));
        }
      }),
    );
  });

  // Pattern: invariant. Yellows go left to right, so for each letter no Y comes after a B.
  it('assigns yellows left to right', () => {
    fc.assert(
      fc.property(pair, ([secret, guess]) => {
        const colors = matchGuess(secret, guess);
        for (const letter of guess) {
          const seq = colors.filter((col, i) => guess[i] === letter && col !== 'G').join('');
          expect(seq).toMatch(/^Y*B*$/);
        }
      }),
    );
  });

  // Pattern: conditional. If the two words share no letters, every color is black.
  it('gives all blacks when the words share no letters', () => {
    // split a shuffled alphabet in half so the words can't share letters
    const disjoint = shuffledAlphabet.chain(abc =>
      fc.tuple(wordFrom(abc.slice(0, 13).join('')), wordFrom(abc.slice(13).join(''))),
    );
    fc.assert(
      fc.property(disjoint, ([secret, guess]) => {
        expect(matchGuess(secret, guess)).toEqual(['B', 'B', 'B', 'B', 'B']);
      }),
    );
  });

  // Pattern: metamorphic. Renaming letters the same way in both words doesn't change the colors.
  it('renaming letters does not change the result', () => {
    fc.assert(
      fc.property(pair, shuffledAlphabet, ([secret, guess], abc) => {
        const rename = (w: string) => [...w].map(c => abc[ALPHABET.indexOf(c)]).join('');
        expect(matchGuess(rename(secret), rename(guess))).toEqual(matchGuess(secret, guess));
      }),
    );
  });

  // Pattern: conditional. If a word isn't five uppercase letters, it throws a RangeError.
  it('rejects invalid words', () => {
    const bad = fc.oneof(
      word.map(w => w.toLowerCase()),
      word.map(w => w.slice(0, 4)),
      word.map(w => w + 'A'),
    );
    fc.assert(
      fc.property(word, bad, (good, b) => {
        expect(() => matchGuess(good, b)).toThrow(RangeError);
        expect(() => matchGuess(b, good)).toThrow(RangeError);
      }),
    );
  });

  it('matches the spec example', () => {
    expect(matchGuess('APPLE', 'ALLEY')).toEqual(['G', 'Y', 'B', 'Y', 'B']);
  });
});

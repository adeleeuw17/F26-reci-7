# Reflection

**Name / Andrew ID:** Alex de Leeuw / adeleeuw

**Recitation group members (Task 2):** Annie Min

---


### 1. Valid but weak

"Only uses the colors G, Y, B" didn't kill any Wordle mutants, since none of
them return a different color. It's still valid because the spec says every
color has to be G, Y, or B. It would catch a bug where the result starts as
[?, ?, ?, ?, ?] and the code forgets to set the B's, so matchGuess('AAAAA', 'BBBBB') would return question marks.


### 2. A generator problem, not a property problem

mergesIntegerNeighbors merges intervals that are one apart, like [1, 2]
and [3, 4]. My "covers the same points" property checks for this (it tests
half points like 2.5), but with a wide generator (numbers up to 1000) two
intervals were almost never exactly one apart, so it survived. I shrank the
ranges (starts -10..10, lengths 0..4) and then it got killed.

Before (wide generator, only the coverage property):
```
  ✘ mergesIntegerNeighbors  SURVIVED
Mutation score: 4/7 killed (57%)
```

After (small generator):
```
  ✔ mergesIntegerNeighbors  killed  by: covers exactly the same points as the input
Mutation score: 5/7 killed (71%)
```


### 3. Reading a counterexample

```
  ✔ mergesIntegerNeighbors  killed  by: covers exactly the same points as the input; ...
      Counterexample: [[[2,2],[-1,1]],[1.5,0]]
      AssertionError: expected true to be false // Object.is equality
```

The spec says the output has to cover the same points as the input,
including non-integers. [-1, 1] and [2, 2] don't cover 1.5, but the
mutant merges them into [-1, 2], which does. So the output covers a point
the input didn't.

### 4. Your project

The follow-up queue helpers in our OpenCode TUI project (steer vs. queue,
sending queued prompts when idle, cancelling).

- Differential: the queued prompts that get sent are the ones that weren't
  cancelled, in the order they were queued.
- Invariant: a queued prompt is only sent when the session is idle, one at
  a time.

Generator: a random list of events (send, cancel, turn starts, turn ends).
A naive one would cancel items that don't exist and rarely have a busy
session, so cancel should pick from the current queue and turns should
actually start and end.

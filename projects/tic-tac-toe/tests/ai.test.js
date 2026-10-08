// Tests for ai.js — run with `npm test` (node --test). No dependencies.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

import {
  EASY_WIN_CHANCE,
  RULES,
  WINNING_LINES,
  WIN_SCORE,
  bestMoves,
  chooseMove,
  compareMove,
  easyMove,
  emptyCells,
  evaluateMoves,
  explainScore,
  getWinner,
  isDraw,
  isGameOver,
  minimaxMove,
  otherPlayer,
  ruleBasedMove,
  ruleFor
} from "../ai.js";

/* ---------- helpers ------------------------------------------------------ */

const HUMAN = "X";
const AI = "O";
const CORNERS = [0, 2, 6, 8];
const SIDES = [1, 3, 5, 7];

/** board("XO.", ".X.", "..O") → ["X","O","","","X","","","","O"] */
function board(...rows) {
  const cells = rows.join("").split("");
  assert.equal(cells.length, 9, `a board needs 9 cells, got "${rows.join("")}"`);
  return cells.map(c => (c === "X" || c === "O" ? c : ""));
}

const show = cells => cells.map(c => c || ".").join("");

/** Always returns the same value: lets a test pick "the first", "the last"… option. */
const always = value => () => value;

/** Small seeded PRNG (mulberry32) so random-looking tests are repeatable. */
function seeded(seed) {
  return function () {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Every position reachable in a legal game where `first` moves first. */
function reachablePositions(first) {
  const seen = new Map();
  (function walk(cells, toMove) {
    const key = show(cells) + toMove;
    if (seen.has(key)) {
      return;
    }
    seen.set(key, { board: cells.slice(), toMove });
    if (isGameOver(cells)) {
      return;
    }
    for (const i of emptyCells(cells)) {
      cells[i] = toMove;
      walk(cells, otherPlayer(toMove));
      cells[i] = "";
    }
  })(Array(9).fill(""), first);
  return [...seen.values()];
}

const POSITIONS = [...reachablePositions(HUMAN), ...reachablePositions(AI)];
/** Positions where the AI (O) is about to move, from games started by either side. */
const AI_TO_MOVE = POSITIONS.filter(p => p.toMove === AI && !isGameOver(p.board));

/* ---------- board helpers ------------------------------------------------ */

describe("board helpers", () => {
  test("reachable-position generator finds the 5,478 legal positions", () => {
    assert.equal(reachablePositions(HUMAN).length, 5478);
    assert.equal(reachablePositions(AI).length, 5478);
  });

  test("getWinner detects all 8 lines, for both players", () => {
    assert.equal(WINNING_LINES.length, 8);
    for (const line of WINNING_LINES) {
      for (const player of [HUMAN, AI]) {
        const cells = Array(9).fill("");
        line.forEach(i => (cells[i] = player));
        // Two opponent marks elsewhere can never form a line of their own.
        emptyCells(cells).slice(0, 2).forEach(i => (cells[i] = otherPlayer(player)));
        assert.deepEqual(getWinner(cells), { player, line }, `line ${line} for ${player}: ${show(cells)}`);
      }
    }
  });

  test("getWinner returns null when nobody has three in a row", () => {
    assert.equal(getWinner(Array(9).fill("")), null);
    assert.equal(getWinner(board("XX.", "OO.", "...")), null);
    assert.equal(getWinner(board("XOX", "XOO", "OXX")), null); // full board, a draw
  });

  test("getWinner hands back a copy of the line", () => {
    const result = getWinner(board("XXX", "OO.", "..."));
    result.line.push(99);
    assert.deepEqual(WINNING_LINES[0], [0, 1, 2]);
  });

  test("isDraw is true only for a full board with no winner", () => {
    assert.equal(isDraw(board("XOX", "XOO", "OXX")), true);
    assert.equal(isDraw(board("XOX", "OXO", "OXX")), false); // full, but X has the diagonal
    assert.equal(isDraw(board("XO.", "...", "...")), false);
    assert.equal(isDraw(Array(9).fill("")), false);
  });

  test("emptyCells lists empty indices in board order", () => {
    assert.deepEqual(emptyCells(board("X.O", ".X.", "O..")), [1, 3, 5, 7, 8]);
    assert.deepEqual(emptyCells(board("XOX", "XOO", "OXX")), []);
    assert.deepEqual(emptyCells(Array(9).fill("")), [0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });

  test("otherPlayer swaps X and O", () => {
    assert.equal(otherPlayer("X"), "O");
    assert.equal(otherPlayer("O"), "X");
  });
});

/* ---------- medium: Lily's original rule-based AI ------------------------ */

describe("medium — Lily's original rule-based AI", () => {
  test("rule 1: takes a winning move, even when it could also block", () => {
    const cells = board("XOX", "XO.", "..."); // O wins at 7; X threatens 6
    assert.equal(ruleBasedMove(cells, AI), 7);
    assert.equal(ruleFor(cells, AI).name, "win");
  });

  test("rule 2: blocks the player's winning move before taking the center", () => {
    const cells = board("XO.", "X..", "..."); // X threatens 6; the center is free
    assert.equal(ruleBasedMove(cells, AI), 6);
    assert.equal(ruleFor(cells, AI).name, "block");
  });

  test("rule 3: takes the center when there is nothing to win or block", () => {
    assert.equal(ruleBasedMove(board("X..", "...", "..."), AI), 4);
    assert.equal(ruleBasedMove(Array(9).fill(""), AI), 4); // the AI opening the game
    assert.equal(ruleFor(Array(9).fill(""), AI).name, "center");
  });

  test("rule 4: otherwise takes a corner, chosen at random among the free ones", () => {
    const cells = board("...", ".X.", "...");
    const picks = [0, 0.3, 0.6, 0.99].map(r => ruleBasedMove(cells, AI, always(r)));
    assert.deepEqual(picks, [0, 2, 6, 8]);
    const random = seeded(4);
    for (let n = 0; n < 200; n++) {
      assert.ok(CORNERS.includes(ruleBasedMove(cells, AI, random)));
    }
    assert.equal(ruleFor(cells, AI).name, "corner");
  });

  test("rule 5: falls back to a side once the center and every corner are taken", () => {
    const cells = board("XOX", ".X.", "OXO"); // free: 3 and 5, no threats
    assert.equal(ruleBasedMove(cells, AI, always(0)), 3);
    assert.equal(ruleBasedMove(cells, AI, always(0.99)), 5);
    assert.equal(ruleFor(cells, AI).name, "side");
  });

  test("ruleFor agrees with the move ruleBasedMove makes, on every reachable position", () => {
    for (const { board: cells } of AI_TO_MOVE) {
      const move = ruleBasedMove(cells, AI, always(0.5));
      const rule = ruleFor(cells, AI).name;
      const after = cells.slice();
      after[move] = AI;
      const blocked = cells.slice();
      blocked[move] = HUMAN;
      const expected = getWinner(after)
        ? "win"
        : getWinner(blocked)
          ? "block"
          : move === 4
            ? "center"
            : CORNERS.includes(move)
              ? "corner"
              : "side";
      assert.equal(rule, expected, show(cells));
    }
  });

  test("never modifies the board it is given, and returns -1 on a full board", () => {
    const cells = board("XO.", "X..", "...");
    const before = cells.slice();
    ruleBasedMove(cells, AI);
    assert.deepEqual(cells, before);
    assert.equal(ruleBasedMove(board("XOX", "XOO", "OXX"), AI), -1);
    assert.equal(ruleFor(board("XOX", "XOO", "OXX"), AI), null);
  });

  test("RULES are listed in Lily's order", () => {
    assert.deepEqual(RULES.map(r => r.name), ["win", "block", "center", "corner", "side"]);
  });

  test("can be beaten with the opposite-corner fork (the reason Hard exists)", () => {
    for (const r of [0, 0.5, 0.99]) {
      const cells = Array(9).fill("");
      const play = (i, p) => {
        assert.equal(cells[i], "", `cell ${i} should be free`);
        cells[i] = p;
      };
      play(0, HUMAN); // corner
      play(ruleBasedMove(cells, AI, always(r)), AI); // rule 3: center
      assert.equal(cells[4], AI);
      play(8, HUMAN); // opposite corner
      const corner = ruleBasedMove(cells, AI, always(r)); // rule 4: a corner (2 or 6) — the mistake
      play(corner, AI);
      play(corner === 2 ? 6 : 2, HUMAN); // forced block… which creates two threats at once
      play(ruleBasedMove(cells, AI, always(r)), AI); // it can block only one
      const remaining = [3, 5, 7, 1].find(i => {
        if (cells[i] !== "") return false;
        const t = cells.slice();
        t[i] = HUMAN;
        return getWinner(t)?.player === HUMAN;
      });
      play(remaining, HUMAN);
      assert.equal(getWinner(cells)?.player, HUMAN, show(cells));
    }
  });

  const originalPath = fileURLToPath(new URL("../original/script.js", import.meta.url));
  test(
    "matches the untouched original/script.js move for move on every reachable position",
    { skip: existsSync(originalPath) ? false : "original/script.js not found" },
    () => {
      // Run Lily's original browser script in a sandbox with a stub DOM, then
      // drive its global getBestMove() directly.
      const stubElement = () => ({ textContent: "", addEventListener() {} });
      const sandbox = vm.createContext({
        document: { querySelectorAll: () => [], getElementById: stubElement },
        setTimeout: () => 0
      });
      vm.runInContext(readFileSync(originalPath, "utf8"), sandbox);
      const original = (cells, random) => {
        sandbox.__cells = cells;
        sandbox.__random = random;
        return vm.runInContext("board = __cells.slice(); Math.random = __random; getBestMove();", sandbox);
      };

      let compared = 0;
      for (const { board: cells } of AI_TO_MOVE) {
        for (const r of [0, 0.26, 0.51, 0.76, 0.999]) {
          assert.equal(ruleBasedMove(cells, AI, always(r)), original(cells, always(r)), `${show(cells)} r=${r}`);
          compared++;
        }
      }
      assert.ok(compared > 10000);
    }
  );
});

/* ---------- hard: minimax ------------------------------------------------ */

/**
 * Plays every possible game against Hard: the human tries every legal move,
 * and Hard tries every move it might pick (all of its equally-best moves).
 * Returns the tally of finished games. Fails if the human ever wins.
 */
function playEveryGame(firstPlayer) {
  const memo = new Map();
  const options = cells => {
    const key = show(cells);
    if (!memo.has(key)) {
      const best = bestMoves(cells, AI);
      assert.ok(best.length > 0, `no move for ${key}`);
      for (const r of [0, 0.5, 0.999]) {
        assert.ok(best.includes(minimaxMove(cells, AI, always(r))), `minimaxMove left its best moves on ${key}`);
      }
      memo.set(key, best);
    }
    return memo.get(key);
  };

  const tally = { games: 0, aiWins: 0, draws: 0 };
  (function play(cells, toMove) {
    const winner = getWinner(cells);
    if (winner) {
      assert.notEqual(winner.player, HUMAN, `the human beat Hard: ${show(cells)}`);
      tally.games++;
      tally.aiWins++;
      return;
    }
    if (isDraw(cells)) {
      tally.games++;
      tally.draws++;
      return;
    }
    const moves = toMove === HUMAN ? emptyCells(cells) : options(cells);
    for (const i of moves) {
      cells[i] = toMove;
      play(cells, otherPlayer(toMove));
      cells[i] = "";
    }
  })(Array(9).fill(""), firstPlayer);
  return tally;
}

/** Plain minimax, no pruning, memoised — the reference Hard is checked against. */
function referenceScores() {
  const memo = new Map();
  function value(cells, toMove, me, depth) {
    const winner = getWinner(cells);
    if (winner) return winner.player === me ? WIN_SCORE - depth : depth - WIN_SCORE;
    if (!cells.includes("")) return 0;
    const key = `${show(cells)}${toMove}${me}${depth}`;
    if (memo.has(key)) return memo.get(key);
    const scores = emptyCells(cells).map(i => {
      const next = cells.slice();
      next[i] = toMove;
      return value(next, otherPlayer(toMove), me, depth + 1);
    });
    const result = toMove === me ? Math.max(...scores) : Math.min(...scores);
    memo.set(key, result);
    return result;
  }
  return (cells, mover) =>
    emptyCells(cells).map(index => {
      const next = cells.slice();
      next[index] = mover;
      return { index, score: value(next, otherPlayer(mover), mover, 1) };
    });
}

describe("hard — minimax with alpha-beta pruning", () => {
  test("never loses: every possible human move sequence, human moves first", t => {
    const tally = playEveryGame(HUMAN);
    t.diagnostic(`human first: ${tally.games} complete games — AI won ${tally.aiWins}, drew ${tally.draws}, lost 0`);
    assert.ok(tally.games > 1000);
  });

  test("never loses: every possible human move sequence, AI moves first", t => {
    const tally = playEveryGame(AI);
    t.diagnostic(`AI first: ${tally.games} complete games — AI won ${tally.aiWins}, drew ${tally.draws}, lost 0`);
    assert.ok(tally.games > 1000);
  });

  test("evaluateMoves matches plain minimax exactly on every reachable position, for either side", () => {
    const reference = referenceScores();
    let checked = 0;
    for (const { board: cells, toMove } of POSITIONS) {
      if (isGameOver(cells)) continue;
      assert.deepEqual(evaluateMoves(cells, toMove), reference(cells, toMove), `${show(cells)} ${toMove} to move`);
      checked++;
    }
    assert.ok(checked > 8000);
  });

  test("prefers the fastest win", () => {
    const cells = board("XOX", ".O.", "X.."); // 7 wins now; 3 also wins, but later
    assert.deepEqual(evaluateMoves(cells, AI), [
      { index: 3, score: 7 },
      { index: 5, score: -8 },
      { index: 7, score: 9 },
      { index: 8, score: -8 }
    ]);
    assert.deepEqual(bestMoves(cells, AI), [7]);
  });

  test("prefers the slowest loss when every move loses", () => {
    const cells = board("XOO", "X..", ".X."); // lost either way; blocking at 6 lasts longest
    assert.deepEqual(evaluateMoves(cells, AI), [
      { index: 4, score: -8 },
      { index: 5, score: -8 },
      { index: 6, score: -6 },
      { index: 8, score: -8 }
    ]);
    assert.equal(minimaxMove(cells, AI), 6);
  });

  test("defends the opposite-corner fork that beats Medium", () => {
    const cells = board("X..", ".O.", "..X");
    const scores = Object.fromEntries(evaluateMoves(cells, AI).map(m => [m.index, m.score]));
    assert.deepEqual(scores, { 1: 0, 2: -6, 3: 0, 5: 0, 6: -6, 7: 0 });
    assert.deepEqual(bestMoves(cells, AI), SIDES);
  });

  test("breaks ties at random, so its games vary", () => {
    const empty = Array(9).fill("");
    assert.deepEqual(bestMoves(empty, AI), [0, 1, 2, 3, 4, 5, 6, 7, 8]); // every opening draws
    assert.equal(minimaxMove(empty, AI, always(0)), 0);
    assert.equal(minimaxMove(empty, AI, always(0.5)), 4);
    assert.equal(minimaxMove(empty, AI, always(0.999)), 8);
    const random = seeded(7);
    const openings = new Set(Array.from({ length: 60 }, () => minimaxMove(empty, AI, random)));
    assert.ok(openings.size >= 6, `only saw openings ${[...openings]}`);
  });

  test("evaluateMoves scores every empty cell, and nothing once the round is over", () => {
    assert.deepEqual(evaluateMoves(board("XO.", ".X.", "..."), AI).map(m => m.index), [2, 3, 5, 6, 7, 8]);
    assert.deepEqual(evaluateMoves(board("XXX", "OO.", "..."), AI), []);
    assert.deepEqual(evaluateMoves(board("XOX", "XOO", "OXX"), AI), []);
    assert.equal(minimaxMove(board("XOX", "XOO", "OXX"), AI), -1);
  });

  test("explainScore turns scores into outcomes and move counts", () => {
    assert.deepEqual(explainScore(9), { outcome: "win", moves: 1 });
    assert.deepEqual(explainScore(7), { outcome: "win", moves: 3 });
    assert.deepEqual(explainScore(0), { outcome: "draw", moves: 0 });
    assert.deepEqual(explainScore(-8), { outcome: "loss", moves: 2 });
  });

  test("compareMove tells a best move from a slower one and a real mistake", () => {
    assert.equal(compareMove(9, 9), "best");
    assert.equal(compareMove(0, 0), "best");
    assert.equal(compareMove(7, 9), "slower"); // still wins, later
    assert.equal(compareMove(-8, -6), "slower"); // still loses, sooner
    assert.equal(compareMove(0, 9), "worse"); // win → draw
    assert.equal(compareMove(-8, 7), "worse"); // win → loss
    assert.equal(compareMove(-6, 0), "worse"); // draw → loss (Medium vs the fork)
  });
});

/* ---------- easy ---------------------------------------------------------- */

describe("easy — mostly random", () => {
  test("always returns a legal move, on every reachable position", () => {
    const random = seeded(2026);
    for (const { board: cells } of AI_TO_MOVE) {
      const free = emptyCells(cells);
      for (let n = 0; n < 5; n++) {
        assert.ok(free.includes(easyMove(cells, AI, random)), show(cells));
      }
      for (const r of [0, 0.4999, 0.5, 0.999]) {
        assert.ok(free.includes(easyMove(cells, AI, always(r))), `${show(cells)} r=${r}`);
      }
    }
  });

  test("returns -1 when the board is full", () => {
    assert.equal(easyMove(board("XOX", "XOO", "OXX"), AI), -1);
  });

  test("takes the win when it looks, plays at random when it doesn't", () => {
    const cells = board("OO.", "XX.", "X.."); // O wins at 2
    assert.equal(easyMove(cells, AI, always(0.1)), 2); // looked: takes the win
    const notLooking = [0.9, 0.99]; // first call: don't look; second: pick the last free cell
    assert.equal(easyMove(cells, AI, () => notLooking.shift()), 8);
  });

  test("takes an immediate win about half the time", () => {
    const cells = board("OO.", "XX.", "X.."); // one winning cell among 4 free cells
    const random = seeded(99);
    const trials = 20000;
    let wins = 0;
    for (let n = 0; n < trials; n++) {
      if (easyMove(cells, AI, random) === 2) wins++;
    }
    // Looks half the time; when it doesn't, a random pick still lands on the win 1 time in 4.
    const expected = EASY_WIN_CHANCE + (1 - EASY_WIN_CHANCE) / 4;
    assert.ok(Math.abs(wins / trials - expected) < 0.02, `took the win ${((wins / trials) * 100).toFixed(1)}% of the time`);
  });
});

/* ---------- choosing a strategy ------------------------------------------ */

describe("chooseMove", () => {
  test("every difficulty can open the game when the AI moves first", () => {
    const empty = Array(9).fill("");
    for (const level of ["easy", "medium", "hard"]) {
      const move = chooseMove(level, empty, AI);
      assert.ok(Number.isInteger(move) && move >= 0 && move <= 8, `${level} opened with ${move}`);
    }
    assert.equal(chooseMove("medium", empty, AI), 4);
  });

  test("dispatches to the right strategy", () => {
    const cells = board("XO.", "X..", "...");
    assert.equal(chooseMove("medium", cells, AI), ruleBasedMove(cells, AI));
    assert.deepEqual([chooseMove("hard", cells, AI, always(0))], bestMoves(cells, AI).slice(0, 1));
    assert.equal(chooseMove("easy", cells, AI, always(0.9)), easyMove(cells, AI, always(0.9)));
  });

  test("works with the AI playing X as well", () => {
    const cells = board("OO.", "XX.", "...");
    assert.equal(chooseMove("medium", cells, "X"), 5); // X wins
    assert.equal(chooseMove("hard", cells, "X"), 5);
  });

  test("rejects an unknown difficulty", () => {
    assert.throws(() => chooseMove("impossible", Array(9).fill(""), AI), /Unknown difficulty/);
  });
});

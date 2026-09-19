/**
 * Integration: the Initiative Tracker's dice roller, driven through its real buttons and the real
 * js/initiative.js, with Math.random scripted so every roll is known.
 *
 * These pin what the user sees (the result line, the history entry, the alert on bad input). They
 * were written against the tracker's own former inline parser first, then re-run unchanged after the
 * tracker moved to the shared dice engine, so they show the behavior was preserved. The tests marked
 * INTENTIONAL are the few places where the shared engine's rules replace the old parser's.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadTracker, alertCalls } from '../helpers/initiative-harness.js';

// Make Math.random produce these die faces in order (each face on a die with the given sides).
function scriptDice(...faces) {
  const queue = faces.map(([face, sides]) => (face - 0.5) / sides);
  const spy = vi.spyOn(Math, 'random').mockImplementation(() => {
    if (!queue.length) throw new Error('more dice were rolled than the test scripted');
    return queue.shift();
  });
  return { spy, remaining: () => queue.length };
}

const $ = id => document.getElementById(id);
const click = el => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
const resultLine = () => $('dice-result').textContent;
const historyLines = () =>
  [...document.querySelectorAll('#dice-history-log > div')].map(d => d.textContent.replace(/^.*?: /, ''));
function rollCustom(text) {
  $('custom-dice-input').value = text;
  click($('roll-custom-dice'));
}

describe('Initiative Tracker dice roller', () => {
  beforeEach(async () => { await loadTracker([]); });
  afterEach(() => { vi.restoreAllMocks(); });

  describe('quick buttons', () => {
    it.each([[4], [6], [8], [10], [12], [20], [100]])('the d%i button rolls one die and logs it', sides => {
      scriptDice([3, sides]);
      click(document.querySelector(`.dice-btn[data-dice="${sides}"]`));

      expect(resultLine()).toBe(`🎲 Rolled 1d${sides}: [3] = 3`);
      expect(historyLines()).toEqual([`Rolled 1d${sides}: [3] = 3`]);
    });

    it('a face of 1 and a full-height face both come out as 1 and sides', () => {
      scriptDice([1, 20], [20, 20]);
      click(document.querySelector('.dice-btn[data-dice="20"]'));
      click(document.querySelector('.dice-btn[data-dice="20"]'));

      expect(historyLines()).toEqual(['Rolled 1d20: [20] = 20', 'Rolled 1d20: [1] = 1']);
    });
  });

  describe('advantage and disadvantage', () => {
    it('Adv keeps the higher of two d20s and shows both', () => {
      scriptDice([7, 20], [15, 20]);
      click($('roll-adv'));
      expect(resultLine()).toBe('🎲 Advantage (2d20kh1): [7, 15] → kept [15] = 15');
      expect(historyLines()).toEqual(['Advantage (2d20kh1): [7, 15] → kept [15] = 15']);
    });

    it('Dis keeps the lower of two d20s and shows both', () => {
      scriptDice([7, 20], [15, 20]);
      click($('roll-dis'));
      expect(resultLine()).toBe('🎲 Disadvantage (2d20kl1): [7, 15] → kept [7] = 7');
    });

    it.each([['adv', 'Rolled 2d20kh1: 2d20kh1 [7, 15] → kept [15] = 15'],
             ['dis', 'Rolled 2d20kl1: 2d20kl1 [7, 15] → kept [7] = 7']])(
      'typing "%s" in the custom box is a shortcut', (shortcut, line) => {
        scriptDice([7, 20], [15, 20]);
        rollCustom(shortcut);
        expect(resultLine()).toBe(`🎲 ${line}`);
      });
  });

  describe('custom expressions', () => {
    it('a positive modifier', () => {
      scriptDice([3, 6], [5, 6]);
      rollCustom('2d6+3');
      expect(resultLine()).toBe('🎲 Rolled 2d6+3: 2d6 [3, 5] +3 = 11');
      expect(historyLines()).toEqual(['Rolled 2d6+3: 2d6 [3, 5] +3 = 11']);
    });

    it('a negative modifier', () => {
      scriptDice([6, 8]);
      rollCustom('1d8-2');
      expect(resultLine()).toBe('🎲 Rolled 1d8-2: 1d8 [6] -2 = 4');
    });

    it('a zero-die-count shorthand such as d20+2', () => {
      scriptDice([9, 20]);
      rollCustom('d20+2');
      expect(resultLine()).toBe('🎲 Rolled d20+2: 1d20 [9] +2 = 11');
    });

    it('several dice groups and a flat modifier', () => {
      scriptDice([3, 6], [5, 6], [2, 4]);
      rollCustom('2d6+1d4+3');
      expect(resultLine()).toBe('🎲 Rolled 2d6+1d4+3: 2d6 [3, 5] 1d4 [2] +3 = 13');
    });

    it('a dice group subtracted from another', () => {
      scriptDice([6, 6], [4, 4]);
      rollCustom('1d6-1d4');
      expect(resultLine()).toBe('🎲 Rolled 1d6-1d4: 1d6 [6] -1d4 [4] = 2');
    });

    it('keep highest shows every die and the kept ones', () => {
      scriptDice([3, 6], [5, 6], [2, 6], [6, 6]);
      rollCustom('4d6kh3');
      expect(resultLine()).toBe('🎲 Rolled 4d6kh3: 4d6kh3 [3, 5, 2, 6] → kept [3, 5, 6] = 14');
    });

    it('keep lowest shows every die and the kept ones', () => {
      scriptDice([12, 20], [4, 20]);
      rollCustom('2d20kl1+1');
      expect(resultLine()).toBe('🎲 Rolled 2d20kl1+1: 2d20kl1 [12, 4] → kept [4] +1 = 5');
    });

    it('ignores case and spaces', () => {
      scriptDice([3, 6], [5, 6]);
      rollCustom(' 2D6 + 3 ');
      expect(resultLine()).toBe('🎲 Rolled 2d6 + 3: 2d6 [3, 5] +3 = 11'); // the text is echoed lowercased; the parts are parsed
    });

    it('a flat number rolls nothing and is its own total', () => {
      const dice = scriptDice();
      rollCustom('7');
      expect(resultLine()).toBe('🎲 Rolled 7: +7 = 7');
      expect(dice.spy).not.toHaveBeenCalled();
    });
  });

  describe('bad input', () => {
    it.each([['hello'], ['2d6+x'], ['++']])('%j shows the examples alert and logs nothing', text => {
      const dice = scriptDice();
      rollCustom(text);
      expect(alertCalls).toHaveLength(1);
      expect(alertCalls[0]).toMatch(/Invalid format/);
      expect(dice.spy).not.toHaveBeenCalled(); // rejected by the parser, not by a die throwing
      expect(historyLines()).toEqual([]);
      expect(resultLine()).toBe('');
    });

    it('an empty box does nothing at all', () => {
      rollCustom('   ');
      expect(alertCalls).toEqual([]);
      expect(historyLines()).toEqual([]);
    });
  });

  // The shared engine is stricter than the tracker's old scanner, which silently skipped whatever it
  // could not read. Each of these used to roll something other than what was typed.
  describe('INTENTIONAL: the shared engine rejects what the old scanner half-read (and absurd sizes)', () => {
    it.each([
      ['2d6+', 'a trailing operator'],
      ['1d0', 'a zero-sided die (used to roll nothing and total 0)'],
      ['0d6', 'zero dice (used to roll nothing and total 0)'],
      ['4d6kh5', 'keeping more dice than are rolled (used to keep them all)'],
      ['4d6kh0', 'keeping zero dice (used to keep them all)'],
      ['2d6 2d4', 'two groups with no operator between them'],
      ['1001d6', 'more dice than the limit (1000; used to roll them all)'],
      ['1d1000001', 'a die with more sides than the limit (1,000,000)'],
      ['2d6+99999999d6', 'a huge group in a later term (used to roll ~100 million dice)'],
      ['1d6' + '+1'.repeat(101), 'more than 200 characters (203)'],
      [Array(20000).fill('1000d6').join('+'), 'a 140,000-character run of full groups (used to roll ~20 million dice)']
    ])('%.40j (%s) is invalid', (text) => {
      const dice = scriptDice(...Array(10).fill([3, 6])); // plenty of dice: rejecting must not depend on running out
      rollCustom(text);
      expect(alertCalls).toHaveLength(1);
      expect(historyLines()).toEqual([]);
      expect(dice.remaining()).toBe(10); // and it rejected before rolling a single die
    });
  });
});

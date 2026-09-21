/**
 * Integration tests: numeric text in the Initiative Tracker's editors is read as a plain integer or rejected.
 * parseInt used to cut "1e3" to 1 and "30.5" to 30; those edits are now refused and the stored value put back.
 */
import { describe, it, expect } from 'vitest';
import { loadTracker, makeChar, alertCalls } from '../helpers/initiative-harness.js';

const saved = () => JSON.parse(localStorage.getItem('initiativeTrackerData'));
const edit = (selector, text) => {
  const input = document.querySelector(`#initiative-order ${selector}`);
  input.focus();
  input.value = text;
  input.blur();
};

describe('inline HP and initiative editors', () => {
  const rejected = ['1e3', '2E2', '30.5', '3abc', '', '   ', '--3', '+', '1_000'];
  const accepted = [['15', 15], ['015', 15], [' 15 ', 15], ['+15', 15]];

  for (const [field, selector, read] of [
    ['HP', '.health-input', c => c.currentHP],
    ['initiative', '.init-input', c => c.initiative],
  ]) {
    it.each(rejected)(`${field}: %j is rejected, nothing changes`, async text => {
      await loadTracker([makeChar('a', 'Alpha', 20)]);
      edit(selector, text);
      expect(read(saved().characters[0])).toBe(20);
      expect(saved().combatLog ?? []).toHaveLength(0);
    });
    it.each(accepted)(`${field}: %j is accepted as %i`, async (text, n) => {
      await loadTracker([makeChar('a', 'Alpha', 20)]);
      edit(selector, text);
      expect(read(saved().characters[0])).toBe(n);
    });
  }

  it('initiative accepts a negative number; HP floors at 0', async () => {
    await loadTracker([makeChar('a', 'Alpha', 20)]);
    edit('.init-input', '-3');
    expect(saved().characters[0].initiative).toBe(-3);
    edit('.health-input', '-3');
    expect(saved().characters[0].currentHP).toBe(0);
  });
});

describe('precision amount and bulk amount', () => {
  it('a precision amount of "1e3" is refused instead of applying 1', async () => {
    await loadTracker([makeChar('a', 'Alpha', 20)]);
    document.querySelector('#initiative-order .precision-amount').value = '1e3';
    document.querySelector('#initiative-order .precision-damage').click();
    expect(alertCalls.join()).toContain('positive amount');
    expect(saved().characters[0].currentHP).toBe(20);
  });
  it('a plain precision amount still applies', async () => {
    await loadTracker([makeChar('a', 'Alpha', 20)]);
    document.querySelector('#initiative-order .precision-amount').value = '007';
    document.querySelector('#initiative-order .precision-damage').click();
    expect(saved().characters[0].currentHP).toBe(13);
  });
});

import { describe, it, expect } from 'vitest';
import { buildTrackerCharacterFromCurrent } from '../../js/character/character-send-to.js';

// The Initiative Tracker payload is built from the current character; what goes wrong is reported through showAppToast.
function makeHost(char) {
  const toasts = [];
  return { toasts, getCurrentCharacter: () => char, showAppToast: (message, type) => toasts.push([message, type]) };
}

describe('buildTrackerCharacterFromCurrent', () => {
  it('builds a fresh PC entry from the sheet: full HP, no temp HP, initiative 0, no id', () => {
    const host = makeHost({ name: '  Tokena  ', maxHP: 44, currentHP: 31, tempHP: 5, ac: 17, conditions: 'Poisoned', concentrating: true });
    expect(buildTrackerCharacterFromCurrent(host)).toEqual({
      name: 'Tokena', type: 'PC', initiative: 0, currentHP: 44, maxHP: 44, tempHP: 0, ac: 17, notes: '',
      concentration: false, deathSaves: { s: 0, f: 0, stable: false }, status: [], concDamagePending: 0,
    });
    expect(host.toasts).toEqual([]);
  });

  it('falls back to current HP when max HP is missing or not positive', () => {
    expect(buildTrackerCharacterFromCurrent(makeHost({ name: 'A', maxHP: 0, currentHP: 23, ac: 12 })).maxHP).toBe(23);
    expect(buildTrackerCharacterFromCurrent(makeHost({ name: 'A', maxHP: '', currentHP: '9', ac: 12 })).currentHP).toBe(9);
  });

  it.each([
    ['no character', null, 'No character selected.'],
    ['a blank name', { name: '   ', maxHP: 10, ac: 10 }, 'Character needs a name before sending to the tracker.'],
    ['no HP at all', { name: 'A', maxHP: 0, currentHP: 0, ac: 10 }, 'Set a Max HP before sending to the tracker.'],
    ['a zero AC', { name: 'A', maxHP: 10, ac: 0 }, 'Set a valid AC before sending to the tracker.'],
    ['a text AC', { name: 'A', maxHP: 10, ac: 'high' }, 'Set a valid AC before sending to the tracker.'],
  ])('returns null and warns for %s', (_label, char, message) => {
    const host = makeHost(char);
    expect(buildTrackerCharacterFromCurrent(host)).toBeNull();
    expect(host.toasts).toEqual([[message, 'warning']]);
  });
});

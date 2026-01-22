// Sample test data fixtures

export const sampleCharacter = {
  id: 'test-char-1',
  name: 'Test Hero',
  level: 5,
  race: 'Human',
  class: 'Fighter',
  abilities: { str: 16, dex: 14, con: 15, int: 10, wis: 12, cha: 8 },
  maxHP: 44,
  currentHP: 44,
  ac: 18,
  proficiencyBonus: 3,
};

export const sampleCombatant = {
  id: 'test-combatant-1',
  name: 'Goblin',
  type: 'Enemy',
  initiative: 15,
  currentHP: 7,
  maxHP: 7,
  ac: 15,
};

export const sampleSpell = {
  name: 'Fireball',
  level: 3,
  school: 'Evocation',
  castingTime: '1 action',
  range: '150 feet',
  components: ['V', 'S', 'M'],
  duration: 'Instantaneous',
  description: 'A bright streak flashes from your pointing finger...',
  classes: ['Sorcerer', 'Wizard'],
};

export const sampleMulticlassCharacter = {
  id: 'test-multiclass-1',
  name: 'Multiclass Hero',
  level: 7,
  race: 'Half-Elf',
  classes: [
    { name: 'Fighter', level: 5 },
    { name: 'Wizard', level: 2 },
  ],
  abilities: { str: 16, dex: 14, con: 14, int: 14, wis: 10, cha: 12 },
  maxHP: 52,
  currentHP: 52,
  ac: 18,
  proficiencyBonus: 3,
};

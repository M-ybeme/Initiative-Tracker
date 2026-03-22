/**
 * Integration Tests: Character Sheet Data Round-Trips
 * Verifies data survives serialization, deserialization,
 * and recalculation across modules.
 */
import { describe, it, expect } from 'vitest';
import { serializeCharacter, deserializeCharacter } from '../../js/modules/storage.js';
import { recalcDerivedStats } from '../../js/modules/character-calculations.js';
import { normalizeSpellEntry } from '../../js/modules/character-spell-data.js';

const SKILL_CONFIGS = [
  { key: 'acrobatics',     ability: 'dex' },
  { key: 'animalHandling', ability: 'wis' },
  { key: 'arcana',         ability: 'int' },
  { key: 'athletics',      ability: 'str' },
  { key: 'deception',      ability: 'cha' },
  { key: 'history',        ability: 'int' },
  { key: 'insight',        ability: 'wis' },
  { key: 'intimidation',   ability: 'cha' },
  { key: 'investigation',  ability: 'int' },
  { key: 'medicine',       ability: 'wis' },
  { key: 'nature',         ability: 'int' },
  { key: 'perception',     ability: 'wis' },
  { key: 'performance',    ability: 'cha' },
  { key: 'persuasion',     ability: 'cha' },
  { key: 'religion',       ability: 'int' },
  { key: 'sleightOfHand',  ability: 'dex' },
  { key: 'stealth',        ability: 'dex' },
  { key: 'survival',       ability: 'wis' },
];

function makeWizardChar(ov = {}) {
  return {
    id: 'wiz-01', name: 'Elara', charClass: 'Wizard 7', level: 7,
    stats: { str: 8, dex: 14, con: 14, int: 18, wis: 12, cha: 10 },
    statMods: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
    savingThrows: {
      str: { prof: false, bonus: 0 }, dex: { prof: false, bonus: 0 },
      con: { prof: false, bonus: 0 }, int: { prof: true, bonus: 0 },
      wis: { prof: true, bonus: 0 }, cha: { prof: false, bonus: 0 },
    },
    skills: {
      arcana:      { prof: true,  exp: false, bonus: 0 },
      history:     { prof: true,  exp: false, bonus: 0 },
      perception:  { prof: false, exp: false, bonus: 0 },
      investigation:{ prof: true,  exp: true,  bonus: 0 },
    },
    maxHP: 42, currentHP: 28, tempHP: 0,
    hitDice: '7d6', hitDiceRemaining: '5d6',
    spellSlots: {
      1: { max: 4, used: 3 }, 2: { max: 3, used: 2 }, 3: { max: 3, used: 1 },
      4: { max: 1, used: 0 }, 5: { max: 0, used: 0 }, 6: { max: 0, used: 0 },
      7: { max: 0, used: 0 }, 8: { max: 0, used: 0 }, 9: { max: 0, used: 0 },
    },
    pactSlots: { level: 0, max: 0, used: 0 },
    spellList: [],
    attacks: [
      { name: 'Dagger', type: 'melee-weapon', toHit: '+4', damage: '1d4+2', damageType: 'Piercing' },
    ],
    proficiencyBonus: 0,
    ...ov,
  };
}

describe('character data round-trip', () => {
  it('serialize then deserialize produces identical data', () => {
    const char = makeWizardChar();
    const json = serializeCharacter(char);
    const loaded = deserializeCharacter(json);
    expect(loaded).toEqual(char);
  });

  it('attack array survives JSON round-trip intact', () => {
    const char = makeWizardChar({
      attacks: [
        { name: 'Dagger', type: 'melee-weapon', toHit: '+4', damage: '1d4+2', damageType: 'Piercing' },
        { name: 'Quarterstaff', type: 'melee-weapon', toHit: '+2', damage: '1d6-1', damageType: 'Bludgeoning' },
      ],
    });
    const loaded = deserializeCharacter(serializeCharacter(char));
    expect(loaded.attacks).toHaveLength(2);
    expect(loaded.attacks[0].name).toBe('Dagger');
    expect(loaded.attacks[0].damage).toBe('1d4+2');
    expect(loaded.attacks[1].name).toBe('Quarterstaff');
  });

  it('spell slots survive JSON round-trip with used counts', () => {
    const char = makeWizardChar();
    const loaded = deserializeCharacter(serializeCharacter(char));
    expect(loaded.spellSlots[1].max).toBe(4);
    expect(loaded.spellSlots[1].used).toBe(3);
    expect(loaded.spellSlots[2].used).toBe(2);
  });

  it('null character serializes to null', () => {
    expect(serializeCharacter(null)).toBeNull();
  });

  it('invalid JSON deserializes to null', () => {
    expect(deserializeCharacter('not-json')).toBeNull();
    expect(deserializeCharacter('')).toBeNull();
    expect(deserializeCharacter(null)).toBeNull();
  });
})

describe('recalcDerivedStats integration', () => {
  it('recomputes proficiency bonus from level', () => {
    const char = makeWizardChar({ level: 7, proficiencyBonus: 0 });
    recalcDerivedStats(char, SKILL_CONFIGS);
    expect(char.proficiencyBonus).toBe(3);
  });

  it('recomputes statMods from stats', () => {
    const char = makeWizardChar();
    recalcDerivedStats(char, SKILL_CONFIGS);
    expect(char.statMods.int).toBe(4);
    expect(char.statMods.str).toBe(-1);
    expect(char.statMods.dex).toBe(2);
    expect(char.statMods.wis).toBe(1);
  });

  it('recomputes saving throw bonuses from prof flags', () => {
    const char = makeWizardChar();
    recalcDerivedStats(char, SKILL_CONFIGS);
    expect(char.savingThrows.int.bonus).toBe(7); // mod +4 + pb 3
    expect(char.savingThrows.wis.bonus).toBe(4); // mod +1 + pb 3
    expect(char.savingThrows.str.bonus).toBe(-1); // mod -1, no prof
  });

  it('recomputes proficient skill bonus', () => {
    const char = makeWizardChar();
    recalcDerivedStats(char, SKILL_CONFIGS);
    expect(char.skills.arcana.bonus).toBe(7); // INT mod +4 + pb 3
    expect(char.skills.history.bonus).toBe(7);
  });

  it('expertise doubles proficiency bonus on skills', () => {
    const char = makeWizardChar();
    recalcDerivedStats(char, SKILL_CONFIGS);
    expect(char.skills.investigation.bonus).toBe(10); // INT mod +4 + pb*2 6
  });

  it('passive perception uses perception skill when proficient', () => {
    const charNoprof = makeWizardChar();
    recalcDerivedStats(charNoprof, SKILL_CONFIGS);
    expect(charNoprof.passivePerception).toBe(11); // 10 + WIS mod 1

    const charWithProf = makeWizardChar({
      skills: {
        arcana: { prof: false, exp: false, bonus: 0 },
        history: { prof: false, exp: false, bonus: 0 },
        perception: { prof: true, exp: false, bonus: 0 },
        investigation: { prof: false, exp: false, bonus: 0 },
      },
    });
    recalcDerivedStats(charWithProf, SKILL_CONFIGS);
    expect(charWithProf.passivePerception).toBe(14); // 10 + WIS mod 1 + pb 3
  });

  it('stale derived values are corrected after level change', () => {
    const char = makeWizardChar({ level: 1, proficiencyBonus: 999 });
    recalcDerivedStats(char, SKILL_CONFIGS);
    expect(char.proficiencyBonus).toBe(2); // level 1 = pb 2
  });

  it('serialize, deserialize, recalc produces correct derived values', () => {
    const char = makeWizardChar({ level: 7, proficiencyBonus: 0 });
    const loaded = deserializeCharacter(serializeCharacter(char));
    recalcDerivedStats(loaded, SKILL_CONFIGS);
    expect(loaded.proficiencyBonus).toBe(3);
    expect(loaded.statMods.int).toBe(4);
    expect(loaded.savingThrows.int.bonus).toBe(7);
    expect(loaded.skills.arcana.bonus).toBe(7);
  });
})

describe('normalizeSpellEntry integration', () => {
  const fakeLib = [
    {
      name: 'Fireball', title: 'Fireball', level: 3, school: 'Evocation',
      casting_time: '1 action', range: '150 feet', components: 'V, S, M',
      duration: 'Instantaneous', concentration: false,
      classes: ['Wizard', 'Sorcerer'], tags: ['damage', 'aoe'],
      body: 'A bright streak flashes...', damage_dice: '8d6',
    },
    {
      name: 'Bless', title: 'Bless', level: 1, school: 'Enchantment',
      casting_time: '1 action', range: '30 feet', components: 'V, S, M',
      duration: 'Up to 1 minute', concentration: true,
      classes: ['Cleric', 'Paladin'], tags: ['buff'],
      body: 'You bless up to three creatures...',
    },
  ];
  const lookup = name => fakeLib.find(s => s.name.toLowerCase() === name.toLowerCase()) || null;

  it('string input resolves from library', () => {
    const result = normalizeSpellEntry('Fireball', lookup);
    expect(result.name).toBe('Fireball');
    expect(result.level).toBe(3);
    expect(result.school).toBe('Evocation');
    expect(result.damage_dice).toBe('8d6');
  });

  it('concentration flag is pulled from library', () => {
    const bless = normalizeSpellEntry('Bless', lookup);
    expect(bless.concentration).toBe(true);
    const fireball = normalizeSpellEntry('Fireball', lookup);
    expect(fireball.concentration).toBe(false);
  });

  it('prepared flag is preserved from spell object', () => {
    const spell = { name: 'Fireball', prepared: true };
    const result = normalizeSpellEntry(spell, lookup);
    expect(result.prepared).toBe(true);
  });

  it('alwaysPrepared flag is preserved', () => {
    const spell = { name: 'Bless', alwaysPrepared: true, prepared: false };
    const result = normalizeSpellEntry(spell, lookup);
    expect(result.alwaysPrepared).toBe(true);
  });

  it('null input returns null', () => {
    expect(normalizeSpellEntry(null, lookup)).toBeNull();
    expect(normalizeSpellEntry(undefined, lookup)).toBeNull();
  });

  it('unknown spell string produces bare custom spell', () => {
    const result = normalizeSpellEntry('Homebrewed Zap', lookup);
    expect(result.name).toBe('Homebrewed Zap');
    expect(result.level).toBe(0);
    expect(result.source).toBe('custom');
  });

  it('normalized spell survives JSON round-trip', () => {
    const spell = normalizeSpellEntry('Fireball', lookup);
    const json = JSON.stringify(spell);
    const loaded = JSON.parse(json);
    expect(loaded.name).toBe('Fireball');
    expect(loaded.level).toBe(3);
    expect(loaded.damage_dice).toBe('8d6');
    expect(loaded.concentration).toBe(false);
  });

  it('spell list in character survives full serialize/deserialize', () => {
    const spells = ['Fireball', 'Bless'].map(n => normalizeSpellEntry(n, lookup));
    const char = makeWizardChar({ spellList: spells });
    const loaded = deserializeCharacter(serializeCharacter(char));
    expect(loaded.spellList).toHaveLength(2);
    expect(loaded.spellList[0].name).toBe('Fireball');
    expect(loaded.spellList[1].concentration).toBe(true);
  });
})

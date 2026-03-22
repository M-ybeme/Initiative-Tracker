/**
 * Character Spell Data Module
 *
 * Pure functions for spell slot lookups, spell normalization, and spell search.
 * No DOM access, no side effects, no global state.
 */

export const SPELL_SLOT_TABLES = {
  Wizard:    { 1:[2,0,0,0,0,0,0,0,0], 2:[3,0,0,0,0,0,0,0,0], 3:[4,2,0,0,0,0,0,0,0], 4:[4,3,0,0,0,0,0,0,0], 5:[4,3,2,0,0,0,0,0,0], 6:[4,3,3,0,0,0,0,0,0], 7:[4,3,3,1,0,0,0,0,0], 8:[4,3,3,2,0,0,0,0,0], 9:[4,3,3,3,1,0,0,0,0], 10:[4,3,3,3,2,0,0,0,0], 11:[4,3,3,3,2,1,0,0,0], 12:[4,3,3,3,2,1,0,0,0], 13:[4,3,3,3,2,1,1,0,0], 14:[4,3,3,3,2,1,1,0,0], 15:[4,3,3,3,2,1,1,1,0], 16:[4,3,3,3,2,1,1,1,0], 17:[4,3,3,3,2,1,1,1,1], 18:[4,3,3,3,3,1,1,1,1], 19:[4,3,3,3,3,2,1,1,1], 20:[4,3,3,3,3,2,2,1,1] },
  Sorcerer:  { 1:[2,0,0,0,0,0,0,0,0], 2:[3,0,0,0,0,0,0,0,0], 3:[4,2,0,0,0,0,0,0,0], 4:[4,3,0,0,0,0,0,0,0], 5:[4,3,2,0,0,0,0,0,0], 6:[4,3,3,0,0,0,0,0,0], 7:[4,3,3,1,0,0,0,0,0], 8:[4,3,3,2,0,0,0,0,0], 9:[4,3,3,3,1,0,0,0,0], 10:[4,3,3,3,2,0,0,0,0], 11:[4,3,3,3,2,1,0,0,0], 12:[4,3,3,3,2,1,0,0,0], 13:[4,3,3,3,2,1,1,0,0], 14:[4,3,3,3,2,1,1,0,0], 15:[4,3,3,3,2,1,1,1,0], 16:[4,3,3,3,2,1,1,1,0], 17:[4,3,3,3,2,1,1,1,1], 18:[4,3,3,3,3,1,1,1,1], 19:[4,3,3,3,3,2,1,1,1], 20:[4,3,3,3,3,2,2,1,1] },
  Bard:      { 1:[2,0,0,0,0,0,0,0,0], 2:[3,0,0,0,0,0,0,0,0], 3:[4,2,0,0,0,0,0,0,0], 4:[4,3,0,0,0,0,0,0,0], 5:[4,3,2,0,0,0,0,0,0], 6:[4,3,3,0,0,0,0,0,0], 7:[4,3,3,1,0,0,0,0,0], 8:[4,3,3,2,0,0,0,0,0], 9:[4,3,3,3,1,0,0,0,0], 10:[4,3,3,3,2,0,0,0,0], 11:[4,3,3,3,2,1,0,0,0], 12:[4,3,3,3,2,1,0,0,0], 13:[4,3,3,3,2,1,1,0,0], 14:[4,3,3,3,2,1,1,0,0], 15:[4,3,3,3,2,1,1,1,0], 16:[4,3,3,3,2,1,1,1,0], 17:[4,3,3,3,2,1,1,1,1], 18:[4,3,3,3,3,1,1,1,1], 19:[4,3,3,3,3,2,1,1,1], 20:[4,3,3,3,3,2,2,1,1] },
  Cleric:    { 1:[2,0,0,0,0,0,0,0,0], 2:[3,0,0,0,0,0,0,0,0], 3:[4,2,0,0,0,0,0,0,0], 4:[4,3,0,0,0,0,0,0,0], 5:[4,3,2,0,0,0,0,0,0], 6:[4,3,3,0,0,0,0,0,0], 7:[4,3,3,1,0,0,0,0,0], 8:[4,3,3,2,0,0,0,0,0], 9:[4,3,3,3,1,0,0,0,0], 10:[4,3,3,3,2,0,0,0,0], 11:[4,3,3,3,2,1,0,0,0], 12:[4,3,3,3,2,1,0,0,0], 13:[4,3,3,3,2,1,1,0,0], 14:[4,3,3,3,2,1,1,0,0], 15:[4,3,3,3,2,1,1,1,0], 16:[4,3,3,3,2,1,1,1,0], 17:[4,3,3,3,2,1,1,1,1], 18:[4,3,3,3,3,1,1,1,1], 19:[4,3,3,3,3,2,1,1,1], 20:[4,3,3,3,3,2,2,1,1] },
  Druid:     { 1:[2,0,0,0,0,0,0,0,0], 2:[3,0,0,0,0,0,0,0,0], 3:[4,2,0,0,0,0,0,0,0], 4:[4,3,0,0,0,0,0,0,0], 5:[4,3,2,0,0,0,0,0,0], 6:[4,3,3,0,0,0,0,0,0], 7:[4,3,3,1,0,0,0,0,0], 8:[4,3,3,2,0,0,0,0,0], 9:[4,3,3,3,1,0,0,0,0], 10:[4,3,3,3,2,0,0,0,0], 11:[4,3,3,3,2,1,0,0,0], 12:[4,3,3,3,2,1,0,0,0], 13:[4,3,3,3,2,1,1,0,0], 14:[4,3,3,3,2,1,1,0,0], 15:[4,3,3,3,2,1,1,1,0], 16:[4,3,3,3,2,1,1,1,0], 17:[4,3,3,3,2,1,1,1,1], 18:[4,3,3,3,3,1,1,1,1], 19:[4,3,3,3,3,2,1,1,1], 20:[4,3,3,3,3,2,2,1,1] },
  Paladin:   { 1:[0,0,0,0,0,0,0,0,0], 2:[2,0,0,0,0,0,0,0,0], 3:[3,0,0,0,0,0,0,0,0], 4:[3,0,0,0,0,0,0,0,0], 5:[4,2,0,0,0,0,0,0,0], 6:[4,2,0,0,0,0,0,0,0], 7:[4,3,0,0,0,0,0,0,0], 8:[4,3,0,0,0,0,0,0,0], 9:[4,3,2,0,0,0,0,0,0], 10:[4,3,2,0,0,0,0,0,0], 11:[4,3,3,0,0,0,0,0,0], 12:[4,3,3,0,0,0,0,0,0], 13:[4,3,3,1,0,0,0,0,0], 14:[4,3,3,1,0,0,0,0,0], 15:[4,3,3,2,0,0,0,0,0], 16:[4,3,3,2,0,0,0,0,0], 17:[4,3,3,3,1,0,0,0,0], 18:[4,3,3,3,1,0,0,0,0], 19:[4,3,3,3,2,0,0,0,0], 20:[4,3,3,3,2,0,0,0,0] },
  Ranger:    { 1:[0,0,0,0,0,0,0,0,0], 2:[2,0,0,0,0,0,0,0,0], 3:[3,0,0,0,0,0,0,0,0], 4:[3,0,0,0,0,0,0,0,0], 5:[4,2,0,0,0,0,0,0,0], 6:[4,2,0,0,0,0,0,0,0], 7:[4,3,0,0,0,0,0,0,0], 8:[4,3,0,0,0,0,0,0,0], 9:[4,3,2,0,0,0,0,0,0], 10:[4,3,2,0,0,0,0,0,0], 11:[4,3,3,0,0,0,0,0,0], 12:[4,3,3,0,0,0,0,0,0], 13:[4,3,3,1,0,0,0,0,0], 14:[4,3,3,1,0,0,0,0,0], 15:[4,3,3,2,0,0,0,0,0], 16:[4,3,3,2,0,0,0,0,0], 17:[4,3,3,3,1,0,0,0,0], 18:[4,3,3,3,1,0,0,0,0], 19:[4,3,3,3,2,0,0,0,0], 20:[4,3,3,3,2,0,0,0,0] },
  Artificer: { 1:[0,0,0,0,0,0,0,0,0], 2:[2,0,0,0,0,0,0,0,0], 3:[3,0,0,0,0,0,0,0,0], 4:[3,0,0,0,0,0,0,0,0], 5:[4,2,0,0,0,0,0,0,0], 6:[4,2,0,0,0,0,0,0,0], 7:[4,3,0,0,0,0,0,0,0], 8:[4,3,0,0,0,0,0,0,0], 9:[4,3,2,0,0,0,0,0,0], 10:[4,3,2,0,0,0,0,0,0], 11:[4,3,3,0,0,0,0,0,0], 12:[4,3,3,0,0,0,0,0,0], 13:[4,3,3,1,0,0,0,0,0], 14:[4,3,3,1,0,0,0,0,0], 15:[4,3,3,2,0,0,0,0,0], 16:[4,3,3,2,0,0,0,0,0], 17:[4,3,3,3,1,0,0,0,0], 18:[4,3,3,3,1,0,0,0,0], 19:[4,3,3,3,2,0,0,0,0], 20:[4,3,3,3,2,0,0,0,0] },
};
export function getSpellSlotsForClassLevel(className, level) {
  if (!className || className === "Warlock") return null;
  const table = SPELL_SLOT_TABLES[className];
  if (!table) return null;
  return table[level] || null;
}

export function getPactMagicSlots(level) {
  const pactMagic = {
    1:  { slots: 1, level: 1 }, 2:  { slots: 2, level: 1 }, 3:  { slots: 2, level: 2 },
    4:  { slots: 2, level: 2 }, 5:  { slots: 2, level: 3 }, 6:  { slots: 2, level: 3 },
    7:  { slots: 2, level: 4 }, 8:  { slots: 2, level: 4 }, 9:  { slots: 2, level: 5 },
    10: { slots: 2, level: 5 }, 11: { slots: 3, level: 5 }, 12: { slots: 3, level: 5 },
    13: { slots: 3, level: 5 }, 14: { slots: 3, level: 5 }, 15: { slots: 3, level: 5 },
    16: { slots: 3, level: 5 }, 17: { slots: 4, level: 5 }, 18: { slots: 4, level: 5 },
    19: { slots: 4, level: 5 }, 20: { slots: 4, level: 5 },
  };
  return pactMagic[level] || null;
}
export function normalizeSpellEntry(spellLike, spellLookupFn = () => null) {
  if (!spellLike) return null;

  if (typeof spellLike === "string") {
    const fromLib = spellLookupFn(spellLike);
    if (fromLib) {
      return {
        name:          fromLib.name  || fromLib.title || spellLike,
        title:         fromLib.title || fromLib.name  || spellLike,
        level:         fromLib.level ?? 0,
        school:        fromLib.school        || "",
        casting_time:  fromLib.casting_time  || "",
        range:         fromLib.range         || "",
        components:    fromLib.components    || "",
        duration:      fromLib.duration      || "",
        concentration: !!fromLib.concentration,
        classes:       Array.isArray(fromLib.classes) ? fromLib.classes : [],
        body:          fromLib.body || "",
        tags:          Array.isArray(fromLib.tags) ? fromLib.tags : [],
        source:        "builtin",
        ...(fromLib.damage_dice       && { damage_dice:       fromLib.damage_dice }),
        ...(fromLib.heal_dice         && { heal_dice:         fromLib.heal_dice }),
        ...(fromLib.save_dc_ability   && { save_dc_ability:   fromLib.save_dc_ability }),
        ...(fromLib.higher_level_dice && { higher_level_dice: fromLib.higher_level_dice }),
      };
    }
    return {
      name: spellLike, title: spellLike, level: 0, school: "",
      casting_time: "", range: "", components: "", duration: "",
      concentration: false, classes: [], body: "", tags: [],
      source: "custom", prepared: false,
    };
  }

  const baseName = spellLike.name || spellLike.title || "";
  if (!baseName) return null;

  const fromLib = spellLookupFn(baseName);
  const base = fromLib || spellLike;
  const castingTime = base.casting_time || base.castingTime || base.casting || "";

  return {
    name:          base.name  || base.title || baseName,
    title:         base.title || base.name  || baseName,
    level:         base.level ?? 0,
    school:        base.school     || "",
    casting_time:  castingTime,
    range:         base.range      || "",
    components:    base.components || "",
    duration:      base.duration   || "",
    concentration: !!base.concentration,
    classes:       Array.isArray(base.classes) ? base.classes : [],
    body:          base.body || "",
    tags:          Array.isArray(base.tags) ? base.tags : [],
    source:        spellLike.source || (fromLib ? "builtin" : "custom"),
    prepared:      !!(spellLike.prepared ?? base.prepared),
    ...(spellLike.alwaysPrepared ? { alwaysPrepared: true } : {}),
    ...(base.damage_dice       && { damage_dice:       base.damage_dice }),
    ...(base.heal_dice         && { heal_dice:         base.heal_dice }),
    ...(base.save_dc_ability   && { save_dc_ability:   base.save_dc_ability }),
    ...(base.higher_level_dice && { higher_level_dice: base.higher_level_dice }),
  };
}
export function searchSpells(term, spellList) {
  const q = (term || "").trim().toLowerCase();
  if (!q) return [];
  const list = Array.isArray(spellList) ? spellList : [];
  return list.filter(spell => {
    const name    = (spell.name   || "").toLowerCase();
    const title   = (spell.title  || "").toLowerCase();
    const school  = (spell.school || "").toLowerCase();
    const body    = (spell.body   || "").toLowerCase();
    const tagsArr = Array.isArray(spell.tags)    ? spell.tags    : [];
    const clsArr  = Array.isArray(spell.classes) ? spell.classes : [];
    return name.includes(q) || title.includes(q) || school.includes(q)
      || body.includes(q)
      || tagsArr.some(t => t.toLowerCase().includes(q))
      || clsArr.some(c => c.toLowerCase().includes(q));
  }).slice(0, 25);
}

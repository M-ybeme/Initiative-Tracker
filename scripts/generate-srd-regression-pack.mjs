#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const SPELLCASTING_PROGRESSIONS = {
  Barbarian: 'none',
  Bard: 'full',
  Cleric: 'full',
  Druid: 'full',
  Fighter: 'none',
  Monk: 'none',
  Paladin: 'half',
  Ranger: 'half',
  Rogue: 'none',
  Sorcerer: 'full',
  Warlock: 'full',
  Wizard: 'full',
  Artificer: 'half'
};

// QA needs access to a broader race list (Warforged, Genasi, etc.) for regression flows.
const QA_ALLOWLIST_OVERRIDES = {
  race: [
    'Dwarf',
    'Gnome',
    'Half-Elf',
    'Half-Orc',
    'Aarakocra',
    'Aasimar',
    'Bugbear',
    'Firbolg',
    'Goblin',
    'Goliath',
    'Hobgoblin',
    'Kenku',
    'Kobold',
    'Lizardfolk',
    'Orc',
    'Tabaxi',
    'Triton',
    'Yuan-ti Pureblood',
    'Genasi (Air)',
    'Genasi (Earth)',
    'Genasi (Fire)',
    'Genasi (Water)',
    'Centaur',
    'Loxodon',
    'Minotaur',
    'Simic Hybrid',
    'Vedalken',
    'Leonin',
    'Satyr',
    'Changeling',
    'Kalashtar',
    'Shifter',
    'Warforged',
    'Tortle',
    'Locathah',
    'Grung'
  ]
};

function createSandbox() {
  const sandbox = {
    window: {},
    console,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval
  };
  sandbox.window.window = sandbox.window;
  sandbox.window.console = console;
  sandbox.global = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox.window;
  return sandbox;
}

function runScript(sandbox, relativePath) {
  const absolutePath = path.resolve(repoRoot, relativePath);
  const code = fs.readFileSync(absolutePath, 'utf8');
  vm.runInNewContext(code, sandbox, { filename: relativePath });
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function applyAllowlistOverrides(target = {}, overrides = {}) {
  Object.entries(overrides).forEach(([key, values]) => {
    if (!Array.isArray(values) || values.length === 0) {
      return;
    }
    const next = Array.isArray(target[key]) ? target[key].slice() : [];
    const seen = new Set(next);
    values.forEach((value) => {
      if (!value || seen.has(value)) {
        return;
      }
      seen.add(value);
      next.push(value);
    });
    target[key] = next;
  });
  return target;
}

function toArray(value) {
  if (Array.isArray(value)) {
    return value.slice();
  }
  if (value == null) {
    return [];
  }
  return [value];
}

function normalizeFeatures(features = {}) {
  const normalized = {};
  Object.entries(features).forEach(([level, entries]) => {
    const value = Array.isArray(entries) ? entries : [entries].filter(Boolean);
    normalized[level] = value.map((entry) => String(entry));
  });
  return normalized;
}

function normalizeSpellSlots(spellSlots = {}) {
  const normalized = {};
  Object.keys(spellSlots)
    .map((key) => Number(key))
    .filter((level) => Number.isInteger(level) && level > 0)
    .sort((a, b) => a - b)
    .forEach((level) => {
      const slots = Array.isArray(spellSlots[level]) ? spellSlots[level] : [];
      normalized[level] = slots.map((value) => Number(value) || 0);
    });
  return normalized;
}

function normalizePactSlots(pactSlots = {}) {
  const normalized = {};
  Object.keys(pactSlots)
    .map((key) => Number(key))
    .filter((level) => Number.isInteger(level) && level > 0)
    .sort((a, b) => a - b)
    .forEach((level) => {
      const entry = pactSlots[level] || {};
      normalized[level] = {
        level: Number(entry.level) || 0,
        slots: Number(entry.slots) || 0
      };
    });
  return normalized;
}

function inferPrimaryAbility(value) {
  if (Array.isArray(value) && value.length) {
    return value[0];
  }
  if (typeof value === 'string') {
    return value;
  }
  return 'str';
}

function inferSpellcastingProgression(className = '', data = {}) {
  if (typeof data.spellcastingProgression === 'string') {
    return data.spellcastingProgression;
  }
  return SPELLCASTING_PROGRESSIONS[className] || 'none';
}

function formatEquipmentItem(item) {
  if (!item) return '';
  if (typeof item === 'string') {
    return item;
  }
  const parts = [item.name || 'Equipment'];
  if (item.quantity) {
    parts.push(`x${item.quantity}`);
  }
  if (item.notes) {
    parts.push(`(${item.notes})`);
  }
  return parts.join(' ');
}

function formatPrerequisites(prereq) {
  if (!prereq) {
    return [];
  }
  if (Array.isArray(prereq)) {
    return prereq.map(String);
  }
  if (typeof prereq === 'string') {
    return [prereq];
  }
  if (typeof prereq === 'object') {
    return Object.entries(prereq).map(([key, value]) => `${key.toUpperCase()} ${value}+`);
  }
  return [];
}

const sandbox = createSandbox();
[
  'data/srd/level-up-data.js',
  'data/srd/spells-data.js',
  'js/generated/srd-allowlist.js'
].forEach((scriptPath) => runScript(sandbox, scriptPath));

const { window } = sandbox;
const levelData = window.LevelUpData || {};
const spells = window.SPELLS_DATA || [];
const allowlist = clone(window.SRD_CONTENT_ALLOWLIST || {});
applyAllowlistOverrides(allowlist, QA_ALLOWLIST_OVERRIDES);

const records = [];
function pushRecord(type, id, payload) {
  if (!type || !id || payload == null) {
    return;
  }
  records.push({
    type,
    id,
    operation: 'add',
    payload: clone(payload)
  });
}

function addSpellRecords() {
  spells.forEach((spell) => {
    const id = (spell?.title || '').trim();
    if (!id) {
      return;
    }
    pushRecord('spell', id, {
      title: spell.title,
      level: Number(spell.level ?? 0),
      school: spell.school || 'Conjuration',
      casting: spell.casting_time || spell.casting || '1 action',
      range: spell.range || 'Self',
      components: spell.components || '',
      duration: spell.duration || 'Instantaneous',
      description: spell.body || spell.description || '',
      classes: toArray(spell.classes)
    });
  });
}

function addClassRecords() {
  const classes = levelData.CLASS_DATA || {};
  Object.entries(classes).forEach(([className, data]) => {
    const payload = {
      name: className,
      hitDice: data.hitDie ? `d${data.hitDie}` : 'd8',
      primaryAbility: inferPrimaryAbility(data.primaryAbility),
      savingThrows: Array.isArray(data.savingThrows) ? data.savingThrows.slice(0, 2) : [],
      armorProficiencies: toArray(data.armorProficiencies),
      weaponProficiencies: toArray(data.weaponProficiencies),
      toolProficiencies: toArray(data.toolProficiencies),
      spellcastingProgression: inferSpellcastingProgression(className, data),
      featuresByLevel: normalizeFeatures(data.features)
    };

    if (typeof data.spellcaster === 'boolean') {
      payload.spellcaster = data.spellcaster;
    }
    if (typeof data.spellcastingAbility === 'string' && data.spellcastingAbility.trim()) {
      payload.spellcastingAbility = data.spellcastingAbility.trim();
    }
    if (data.preparesSpells) {
      payload.preparesSpells = true;
    }
    if (data.spellSlots) {
      const normalizedSlots = normalizeSpellSlots(data.spellSlots);
      if (Object.keys(normalizedSlots).length > 0) {
        payload.spellSlots = normalizedSlots;
      }
    }
    if (data.pactMagic) {
      payload.pactMagic = true;
    }
    if (data.pactSlots) {
      const normalizedPactSlots = normalizePactSlots(data.pactSlots);
      if (Object.keys(normalizedPactSlots).length > 0) {
        payload.pactSlots = normalizedPactSlots;
      }
    }

    ['cantripsKnown', 'infusionsKnown', 'infusedItems'].forEach((key) => {
      if (data[key]) {
        payload[key] = clone(data[key]);
      }
    });

    const equipmentChoices = levelData.CLASS_EQUIPMENT_CHOICES?.[className];
    if (equipmentChoices) {
      payload.equipmentChoices = clone(equipmentChoices);
    }

    const defaultEquipment = levelData.DEFAULT_CLASS_EQUIPMENT?.[className];
    if (defaultEquipment) {
      payload.defaultEquipment = clone(defaultEquipment);
    }

    pushRecord('class', className, payload);
  });
}

function addSubclassRecords() {
  const subclasses = levelData.SUBCLASS_DATA || {};
  Object.entries(subclasses).forEach(([className, entry]) => {
    const options = entry?.options || {};
    Object.entries(options).forEach(([subclassName, data]) => {
      const payload = {
        parentClass: className,
        description: data.description || '',
        featuresByLevel: normalizeFeatures(data.features)
      };
      pushRecord('subclass', `${className}:${subclassName}`, payload);
    });
  });
}

function addFeatRecords() {
  const feats = levelData.FEATS || {};
  Object.entries(feats).forEach(([featName, feat]) => {
    pushRecord('feat', featName, {
      name: featName,
      summary: (feat.description || feat.summary || '').trim(),
      prerequisites: formatPrerequisites(feat.prerequisites)
    });
  });
}

function addBackgroundRecords() {
  const backgrounds = levelData.BACKGROUND_DATA || {};
  Object.entries(backgrounds).forEach(([backgroundName, background]) => {
    const profs = background.proficiencies || {};
    const profPayload = {
      skills: toArray(profs.skills),
      tools: toArray(profs.tools)
    };
    if (profs.languages != null) {
      profPayload.languages = profs.languages;
    }
    const equipment = Array.isArray(background.equipment)
      ? background.equipment.map(formatEquipmentItem).filter(Boolean)
      : [];
    const payload = {
      name: backgroundName,
      proficiencies: profPayload,
      equipment,
      feature: clone(background.feature || {})
    };
    pushRecord('background', backgroundName, payload);
  });
}

addSpellRecords();
addClassRecords();
addSubclassRecords();
addFeatRecords();
addBackgroundRecords();

records.sort((a, b) => {
  if (a.type === b.type) {
    return a.id.localeCompare(b.id);
  }
  return a.type.localeCompare(b.type);
});

const timestamp = new Date().toISOString();
const metadata = {
  id: 'com.dmstoolbox.srd.regression-pack',
  name: 'SRD Baseline Regression Pack',
  version: '1.0.0',
  license: 'CC-BY-4.0 (SRD 5.1)',
  toolVersion: '2.0.5',
  authors: ['DM\'s Toolbox Team'],
  source: 'Wizards of the Coast SRD 5.1',
  created: timestamp,
  updated: timestamp
};

const pack = {
  metadata,
  allowlist,
  records,
  notes: 'Automatically generated from data/srd assets for QA. Do not redistribute beyond internal testing.'
};

const outputDir = path.resolve(repoRoot, 'internal-roadmaps', 'test-packs');
fs.mkdirSync(outputDir, { recursive: true });
const outputPath = path.join(outputDir, 'srd-regression-pack.json');
fs.writeFileSync(outputPath, `${JSON.stringify(pack, null, 2)}\n`, 'utf8');

console.log(`SRD regression pack written to ${path.relative(repoRoot, outputPath)} (${records.length} records).`);

#!/usr/bin/env node

import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import vm from 'vm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const levelUpDataCache = new Map();

const SOURCES = [
  {
    type: 'race',
    file: path.join(ROOT_DIR, 'js', 'character-creation-wizard.js'),
    extractor: extractRacesFromWizard
  },
  {
    type: 'spell',
    file: path.join(ROOT_DIR, 'data', 'srd', 'spells-data.js'),
    extractor: extractSpellsFromDataset
  },
  {
    type: 'class',
    file: path.join(ROOT_DIR, 'data', 'srd', 'level-up-data.js'),
    extractor: extractClassesFromLevelUpData
  },
  {
    type: 'subclass',
    file: path.join(ROOT_DIR, 'data', 'srd', 'level-up-data.js'),
    extractor: extractSubclassesFromLevelUpData
  },
  {
    type: 'feat',
    file: path.join(ROOT_DIR, 'data', 'srd', 'level-up-data.js'),
    extractor: extractFeatsFromLevelUpData
  },
  {
    type: 'background',
    file: path.join(ROOT_DIR, 'data', 'srd', 'level-up-data.js'),
    extractor: extractBackgroundsFromLevelUpData
  },
  {
    type: 'weapon',
    file: path.join(ROOT_DIR, 'data', 'srd', 'level-up-data.js'),
    extractor: extractWeaponsFromLevelUpData
  },
  {
    type: 'equipment',
    file: path.join(ROOT_DIR, 'data', 'srd', 'level-up-data.js'),
    extractor: extractEquipmentFromLevelUpData
  },
  {
    type: 'beast',
    file: path.join(ROOT_DIR, 'data', 'srd', 'level-up-data.js'),
    extractor: extractBeastFormsFromLevelUpData
  },
  {
    type: 'racial-base-feature',
    file: path.join(ROOT_DIR, 'data', 'srd', 'level-up-data.js'),
    extractor: extractRacialBaseFeatures
  },
  {
    type: 'racial-feature',
    file: path.join(ROOT_DIR, 'data', 'srd', 'level-up-data.js'),
    extractor: extractRacialFeatures
  },
  {
    type: 'racial-scaling-feature',
    file: path.join(ROOT_DIR, 'data', 'srd', 'level-up-data.js'),
    extractor: extractRacialScalingFeatures
  },
  {
    type: 'racial-spell',
    file: path.join(ROOT_DIR, 'data', 'srd', 'level-up-data.js'),
    extractor: extractRacialSpells
  },
  {
    type: 'class-resource',
    file: path.join(ROOT_DIR, 'data', 'srd', 'level-up-data.js'),
    extractor: extractClassResources
  },
  {
    type: 'artificer-infusion',
    file: path.join(ROOT_DIR, 'data', 'srd', 'level-up-data.js'),
    extractor: extractArtificerInfusions
  },
  {
    type: 'class-equipment-default',
    file: path.join(ROOT_DIR, 'data', 'srd', 'level-up-data.js'),
    extractor: extractDefaultClassEquipment
  },
  {
    type: 'class-equipment-choice',
    file: path.join(ROOT_DIR, 'data', 'srd', 'level-up-data.js'),
    extractor: extractClassEquipmentChoices
  },
  {
    type: 'class-starting-gold',
    file: path.join(ROOT_DIR, 'data', 'srd', 'level-up-data.js'),
    extractor: extractClassStartingGold
  },
  {
    type: 'subclass-spell',
    file: path.join(ROOT_DIR, 'data', 'srd', 'level-up-data.js'),
    extractor: extractSubclassSpells
  },
  {
    type: 'subclass-cantrip',
    file: path.join(ROOT_DIR, 'data', 'srd', 'level-up-data.js'),
    extractor: extractSubclassBonusCantrips
  },
  {
    type: 'fighting-style',
    file: path.join(ROOT_DIR, 'data', 'srd', 'level-up-data.js'),
    extractor: extractFightingStyles
  },
  {
    type: 'pact-boon',
    file: path.join(ROOT_DIR, 'data', 'srd', 'level-up-data.js'),
    extractor: extractPactBoons
  },
  {
    type: 'eldritch-invocation',
    file: path.join(ROOT_DIR, 'data', 'srd', 'level-up-data.js'),
    extractor: extractEldritchInvocations
  },
  {
    type: 'metamagic',
    file: path.join(ROOT_DIR, 'data', 'srd', 'level-up-data.js'),
    extractor: extractMetamagic
  },
  {
    type: 'subrace',
    file: path.join(ROOT_DIR, 'data', 'srd', 'level-up-data.js'),
    extractor: extractSubraces
  }
];

async function main() {
  const entities = [];

  for (const source of SOURCES) {
    const raw = await readFile(source.file, 'utf8');
    const extracted = source.extractor(raw, source.file).map((entry) => ({
      ...entry,
      type: source.type,
      sourceFile: path.relative(ROOT_DIR, source.file)
    }));
    entities.push(...extracted);
  }

  const deduped = dedupeById(entities);

  const manifest = {
    version: 1,
    generatedAt: new Date().toISOString(),
    summary: buildSummary(deduped),
    entities: deduped.map((entry) => {
      const metadata = Object.assign({}, entry.metadata);
      metadata.displayText = entry.displayText;

      return {
        id: entry.id,
        type: entry.type,
        label: entry.label,
        groupHint: entry.groupHint,
        sourceFile: entry.sourceFile,
        srdCitation: null,
        nonSrdReason: null,
        status: 'unreviewed',
        notes: '',
        metadata
      };
    })
  };

  const outPath = path.join(ROOT_DIR, 'internal-roadmaps', 'manifests', 'srd-audit.json');
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify(manifest, null, 2));

  console.log(`Wrote ${manifest.entities.length} entities to ${path.relative(ROOT_DIR, outPath)}`);
}

function extractRacesFromWizard(fileContents) {
  const selectMatch = fileContents.match(/<select class="form-select" id="wizardRace">([\s\S]*?)<\/select>/);
  if (!selectMatch) {
    throw new Error('wizardRace <select> block not found');
  }

  const block = selectMatch[1];
  const tokens = block.matchAll(/<(optgroup|option)([^>]*)>([^<]*)/g);
  const entries = [];
  let currentGroup = 'Uncategorized';

  for (const token of tokens) {
    const [, tag, attrs, trailingText] = token;
    if (tag === 'optgroup') {
      const label = getAttr(attrs, 'label');
      if (label) currentGroup = label.trim();
      continue;
    }

    if (tag === 'option') {
      const value = getAttr(attrs, 'value');
      if (!value) continue;
      if (value.trim().length === 0) continue;
      const label = trailingText.trim();
      entries.push({
        id: value.trim(),
        label: value.trim(),
        displayText: label,
        groupHint: currentGroup
      });
    }
  }

  return entries;
}

function getAttr(attrChunk, name) {
  const regex = new RegExp(`${name}="([^"]*)"`);
  const match = attrChunk.match(regex);
  return match ? match[1] : null;
}

function dedupeById(entries) {
  const map = new Map();
  for (const entry of entries) {
    const key = `${entry.type}:${entry.id}`;
    if (!map.has(key)) {
      map.set(key, entry);
    }
  }
  return Array.from(map.values()).sort((a, b) => a.id.localeCompare(b.id));
}

function buildSummary(entries) {
  const summary = {};
  for (const entry of entries) {
    summary[entry.type] = (summary[entry.type] || 0) + 1;
  }
  return summary;
}

function extractSpellsFromDataset(fileContents, filePath) {
  const data = evaluateArrayFromFile(fileContents, filePath, 'SPELLS_DATA');
  return data.map((spell) => ({
    id: spell.title?.trim() || 'UNKNOWN_SPELL',
    label: spell.title?.trim() || 'Unknown Spell',
    displayText: spell.title?.trim() || 'Unknown Spell',
    groupHint: typeof spell.level === 'number' ? `Spell Level ${spell.level}` : 'Spell'
  }));
}

function evaluateArrayFromFile(code, filePath, varName) {
  const context = {
    window: {},
    console
  };
  const captureName = '__CAPTURED_DATA__';
  const wrapped = `${code}\n;globalThis.${captureName} = typeof ${varName} !== "undefined" ? ${varName} : (typeof window !== "undefined" ? window.${varName} : undefined);`;

  vm.runInNewContext(wrapped, context, { filename: filePath });
  const data = context[captureName];
  if (!Array.isArray(data)) {
    throw new Error(`Unable to extract ${varName} from ${filePath}`);
  }
  return data;
}

function getLevelUpDataInstance(fileContents, filePath) {
  if (levelUpDataCache.has(filePath)) {
    return levelUpDataCache.get(filePath);
  }

  const context = {
    window: {},
    console
  };

  vm.runInNewContext(fileContents, context, { filename: filePath });
  const levelUpData = context.window?.LevelUpData || context.LevelUpData;

  if (!levelUpData) {
    throw new Error(`Unable to evaluate LevelUpData from ${filePath}`);
  }

  levelUpDataCache.set(filePath, levelUpData);
  return levelUpData;
}

function extractClassesFromLevelUpData(fileContents, filePath) {
  const levelUpData = getLevelUpDataInstance(fileContents, filePath);
  const classes = levelUpData.CLASS_DATA || {};

  return Object.entries(classes).map(([id, info]) => {
    const metadata = {};
    if (Array.isArray(info.primaryAbility)) metadata.primaryAbility = info.primaryAbility;
    if (info.spellcaster) metadata.spellcaster = true;
    if (info.hitDie) metadata.hitDie = info.hitDie;

    return {
      id,
      label: id,
      displayText: id,
      groupHint: 'Class',
      metadata
    };
  });
}

function extractSubclassesFromLevelUpData(fileContents, filePath) {
  const levelUpData = getLevelUpDataInstance(fileContents, filePath);
  const subclasses = levelUpData.SUBCLASS_DATA || {};
  const entries = [];

  Object.entries(subclasses).forEach(([className, config]) => {
    const options = config?.options || {};
    Object.entries(options).forEach(([subclassName, details]) => {
      const metadata = { className };
      if (config?.selectionLevel) metadata.selectionLevel = config.selectionLevel;
      if (details?.description) metadata.description = details.description;

      entries.push({
        id: `${className}:${subclassName}`,
        label: subclassName,
        displayText: `${subclassName} (${className})`,
        groupHint: `${className} Subclasses`,
        metadata
      });
    });
  });

  return entries;
}

function extractFeatsFromLevelUpData(fileContents, filePath) {
  const levelUpData = getLevelUpDataInstance(fileContents, filePath);
  const feats = levelUpData.FEATS || {};

  return Object.entries(feats).map(([id, feat]) => {
    const metadata = {};
    if (feat.source) metadata.source = feat.source;
    if (feat.prerequisites) metadata.prerequisites = feat.prerequisites;

    return {
      id,
      label: feat.name || id,
      displayText: feat.name || id,
      groupHint: feat.source ? `Feat Source: ${feat.source}` : 'Feat',
      metadata
    };
  });
}

function extractBackgroundsFromLevelUpData(fileContents, filePath) {
  const levelUpData = getLevelUpDataInstance(fileContents, filePath);
  const backgrounds = levelUpData.BACKGROUND_DATA || {};

  return Object.entries(backgrounds).map(([id, bg]) => {
    const metadata = {};
    if (bg.feature?.name) metadata.featureName = bg.feature.name;
    if (bg.proficiencies) metadata.proficiencies = bg.proficiencies;
    if (typeof bg.startingGold === 'number') metadata.startingGold = bg.startingGold;

    return {
      id,
      label: id,
      displayText: bg.feature?.name ? `${id} (${bg.feature.name})` : id,
      groupHint: 'Background',
      metadata
    };
  });
}

function extractWeaponsFromLevelUpData(fileContents, filePath) {
  const levelUpData = getLevelUpDataInstance(fileContents, filePath);
  const entries = [];

  const pushWeapons = (list, category) => {
    if (!Array.isArray(list)) return;
    list.forEach((weapon) => {
      const metadata = {
        category,
        damage: weapon.damage,
        damageType: weapon.damageType,
        weight: weapon.weight,
        properties: weapon.properties
      };

      entries.push({
        id: `${weapon.name} (${category})`,
        label: weapon.name,
        displayText: `${weapon.name} (${category})`,
        groupHint: `${category} Weapons`,
        metadata
      });
    });
  };

  pushWeapons(levelUpData.SIMPLE_WEAPONS, 'Simple');
  pushWeapons(levelUpData.MARTIAL_WEAPONS, 'Martial');

  return entries;
}

function extractEquipmentFromLevelUpData(fileContents, filePath) {
  const levelUpData = getLevelUpDataInstance(fileContents, filePath);
  const equipment = levelUpData.EQUIPMENT_COSTS || {};

  return Object.entries(equipment).map(([name, cost]) => ({
    id: name,
    label: name,
    displayText: name,
    groupHint: 'Equipment',
    metadata: { cost }
  }));
}

function extractBeastFormsFromLevelUpData(fileContents, filePath) {
  const levelUpData = getLevelUpDataInstance(fileContents, filePath);
  const beastsByCR = levelUpData.BEAST_FORMS || {};
  const entries = [];

  Object.entries(beastsByCR).forEach(([crKey, beasts]) => {
    if (!Array.isArray(beasts)) return;
    beasts.forEach((beast) => {
      const crValue = beast.cr || crKey.replace(/^CR/, '');
      const metadata = {
        cr: crValue,
        ac: beast.ac,
        hp: beast.hp,
        speed: beast.speed,
        attacks: beast.attacks,
        traits: beast.traits
      };

      entries.push({
        id: `${beast.name} (CR ${crValue})`,
        label: beast.name,
        displayText: `${beast.name} (CR ${crValue})`,
        groupHint: `Beast CR ${crValue}`,
        metadata
      });
    });
  });

  return entries;
}

function extractRacialBaseFeatures(fileContents, filePath) {
  const levelUpData = getLevelUpDataInstance(fileContents, filePath);
  const base = levelUpData.RACIAL_BASE_FEATURES || {};

  return Object.entries(base).map(([race, details]) => ({
    id: `racial-base:${race}`,
    label: race,
    displayText: `${race} Base Traits`,
    groupHint: 'Racial Base Features',
    metadata: {
      size: details.size,
      speed: details.speed,
      languages: details.languages,
      traits: details.traits
    }
  }));
}

function extractRacialFeatures(fileContents, filePath) {
  const levelUpData = getLevelUpDataInstance(fileContents, filePath);
  const features = levelUpData.RACIAL_FEATURES || {};
  const entries = [];

  Object.entries(features).forEach(([race, levelMap]) => {
    Object.entries(levelMap || {}).forEach(([level, feature]) => {
      if (!feature) return;
      const featureName = feature.name || 'Feature';
      entries.push({
        id: `racial-feature:${race}:${level}:${featureName}`,
        label: featureName,
        displayText: `${featureName} (${race} lvl ${level})`,
        groupHint: `${race} Features`,
        metadata: {
          race,
          level,
          description: feature.description,
          options: feature.options
        }
      });
    });
  });

  return entries;
}

function extractRacialScalingFeatures(fileContents, filePath) {
  const levelUpData = getLevelUpDataInstance(fileContents, filePath);
  const scaling = levelUpData.RACIAL_SCALING_FEATURES || {};

  return Object.entries(scaling).map(([race, info]) => ({
    id: `racial-scaling:${race}:${info.name}`,
    label: info.name,
    displayText: `${info.name} (${race})`,
    groupHint: `${race} Scaling Features`,
    metadata: {
      race,
      description: info.description,
      scaling: info.scaling,
      note: info.note
    }
  }));
}

function extractRacialSpells(fileContents, filePath) {
  const levelUpData = getLevelUpDataInstance(fileContents, filePath);
  const racialSpells = levelUpData.RACIAL_SPELLS || {};
  const entries = [];

  Object.entries(racialSpells).forEach(([race, spellLevels]) => {
    Object.entries(spellLevels || {}).forEach(([level, spells]) => {
      (spells || []).forEach((spellEntry, idx) => {
        entries.push({
          id: `racial-spell:${race}:${level}:${spellEntry.spell}:${idx}`,
          label: spellEntry.spell,
          displayText: `${spellEntry.spell} (${race} lvl ${level})`,
          groupHint: `${race} Racial Spells`,
          metadata: {
            race,
            level,
            type: spellEntry.type,
            note: spellEntry.note
          }
        });
      });
    });
  });

  return entries;
}

function extractClassResources(fileContents, filePath) {
  const levelUpData = getLevelUpDataInstance(fileContents, filePath);
  const resources = levelUpData.CLASS_RESOURCES || {};
  const entries = [];

  Object.entries(resources).forEach(([className, list]) => {
    (list || []).forEach((resource) => {
      entries.push({
        id: `class-resource:${className}:${resource.name}`,
        label: resource.name,
        displayText: `${resource.name} (${className})`,
        groupHint: `${className} Resources`,
        metadata: {
          className,
          resetOn: resource.resetOn,
          hasDynamicMax: typeof resource.getMax === 'function'
        }
      });
    });
  });

  return entries;
}

function extractArtificerInfusions(fileContents, filePath) {
  const levelUpData = getLevelUpDataInstance(fileContents, filePath);
  const infusions = levelUpData.ARTIFICER_INFUSIONS || {};
  const entries = [];

  Object.entries(infusions).forEach(([level, list]) => {
    (list || []).forEach((infusion) => {
      entries.push({
        id: `infusion:${level}:${infusion.name}`,
        label: infusion.name,
        displayText: `${infusion.name} (Artificer ${level})`,
        groupHint: `Infusions (level ${level})`,
        metadata: {
          level: Number(level),
          description: infusion.description,
          requiresAttunement: infusion.requiresAttunement,
          itemType: infusion.itemType
        }
      });
    });
  });

  return entries;
}

function extractDefaultClassEquipment(fileContents, filePath) {
  const levelUpData = getLevelUpDataInstance(fileContents, filePath);
  const defaults = levelUpData.DEFAULT_CLASS_EQUIPMENT || {};

  return Object.entries(defaults).map(([className, bundle]) => ({
    id: `class-equip-default:${className}`,
    label: className,
    displayText: `${className} Default Equipment`,
    groupHint: 'Class Default Equipment',
    metadata: {
      weapons: bundle.weapons,
      armor: bundle.armor,
      gear: bundle.gear
    }
  }));
}

function extractClassEquipmentChoices(fileContents, filePath) {
  const levelUpData = getLevelUpDataInstance(fileContents, filePath);
  const choices = levelUpData.CLASS_EQUIPMENT_CHOICES || {};

  return Object.entries(choices).map(([className, data]) => ({
    id: `class-equip-choice:${className}`,
    label: className,
    displayText: `${className} Equipment Choices`,
    groupHint: 'Class Equipment Choices',
    metadata: {
      choices: data.choices,
      fixed: data.fixed
    }
  }));
}

function extractClassStartingGold(fileContents, filePath) {
  const levelUpData = getLevelUpDataInstance(fileContents, filePath);
  const gold = levelUpData.CLASS_STARTING_GOLD || {};

  return Object.entries(gold).map(([className, info]) => ({
    id: `class-starting-gold:${className}`,
    label: className,
    displayText: `${className} Starting Gold`,
    groupHint: 'Class Starting Gold',
    metadata: info
  }));
}

function extractSubclassSpells(fileContents, filePath) {
  const levelUpData = getLevelUpDataInstance(fileContents, filePath);
  const subclassSpells = levelUpData.SUBCLASS_SPELLS || {};
  const entries = [];

  Object.entries(subclassSpells).forEach(([className, subclassMap]) => {
    Object.entries(subclassMap || {}).forEach(([subclassName, levelMap]) => {
      Object.entries(levelMap || {}).forEach(([level, spells]) => {
        (spells || []).forEach((spellName, idx) => {
          entries.push({
            id: `subclass-spell:${className}:${subclassName}:${level}:${spellName}:${idx}`,
            label: spellName,
            displayText: `${spellName} (${subclassName} ${className} lvl ${level})`,
            groupHint: `${className} / ${subclassName} Spells`,
            metadata: {
              className,
              subclassName,
              level,
              spell: spellName
            }
          });
        });
      });
    });
  });

  return entries;
}

function extractSubclassBonusCantrips(fileContents, filePath) {
  const levelUpData = getLevelUpDataInstance(fileContents, filePath);
  const cantrips = levelUpData.SUBCLASS_BONUS_CANTRIPS || {};
  const entries = [];

  Object.entries(cantrips).forEach(([className, subclassMap]) => {
    Object.entries(subclassMap || {}).forEach(([subclassName, info]) => {
      entries.push({
        id: `subclass-cantrip:${className}:${subclassName}`,
        label: info.cantrip,
        displayText: `${info.cantrip || 'Cantrip'} (${subclassName} ${className})`,
        groupHint: `${className} Bonus Cantrips`,
        metadata: {
          className,
          subclassName,
          cantrip: info.cantrip,
          level: info.level
        }
      });
    });
  });

  return entries;
}

function extractFightingStyles(fileContents, filePath) {
  const levelUpData = getLevelUpDataInstance(fileContents, filePath);
  const styles = levelUpData.FIGHTING_STYLE_DATA || {};

  return Object.entries(styles).map(([name, data]) => ({
    id: name,
    label: name,
    displayText: name,
    groupHint: 'Fighting Styles',
    metadata: {
      classes: data.classes,
      srd: data.srd,
      description: data.description
    }
  }));
}

function extractPactBoons(fileContents, filePath) {
  const levelUpData = getLevelUpDataInstance(fileContents, filePath);
  const boons = levelUpData.PACT_BOON_DATA || {};

  return Object.entries(boons).map(([name, data]) => ({
    id: name,
    label: name,
    displayText: name,
    groupHint: 'Pact Boons',
    metadata: {
      srd: data.srd,
      description: data.description
    }
  }));
}

function extractEldritchInvocations(fileContents, filePath) {
  const levelUpData = getLevelUpDataInstance(fileContents, filePath);
  const invocations = levelUpData.ELDRITCH_INVOCATION_DATA || {};

  return Object.entries(invocations).map(([name, data]) => ({
    id: name,
    label: name,
    displayText: name,
    groupHint: 'Eldritch Invocations',
    metadata: {
      srd: data.srd,
      prerequisites: data.prerequisites,
      description: data.description
    }
  }));
}

function extractMetamagic(fileContents, filePath) {
  const levelUpData = getLevelUpDataInstance(fileContents, filePath);
  const metamagic = levelUpData.METAMAGIC_DATA || {};

  return Object.entries(metamagic).map(([name, data]) => ({
    id: name,
    label: name,
    displayText: name,
    groupHint: 'Metamagic Options',
    metadata: {
      srd: data.srd,
      cost: data.cost,
      description: data.description
    }
  }));
}

function extractSubraces(fileContents, filePath) {
  const levelUpData = getLevelUpDataInstance(fileContents, filePath);
  const subraces = levelUpData.SUBRACE_DATA || {};

  return Object.entries(subraces).map(([key, data]) => ({
    id: key,
    label: data.name,
    displayText: `${data.name} (${data.race})`,
    groupHint: `${data.race} Subraces`,
    metadata: {
      race: data.race,
      srd: data.srd,
      description: data.description
    }
  }));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

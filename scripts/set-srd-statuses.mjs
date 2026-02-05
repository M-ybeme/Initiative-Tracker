#!/usr/bin/env node
/**
 * Sets SRD status values in the manifest based on D&D 5e SRD content.
 * Run this after dump-content-ids.mjs to mark content as srd-ok or non-srd.
 */

import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(ROOT_DIR, 'internal-roadmaps', 'manifests', 'srd-audit.json');

// SRD races from the PHB (core 9 races)
const SRD_RACES = new Set([
  'Dwarf', 'Elf', 'Halfling', 'Human', 'Dragonborn', 'Gnome', 'Half-Elf', 'Half-Orc', 'Tiefling'
]);

// SRD classes (all PHB classes except Artificer)
const SRD_CLASSES = new Set([
  'Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk',
  'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard'
]);

// SRD backgrounds from SRD 5.1
const SRD_BACKGROUNDS = new Set([
  'Acolyte'
]);

// Non-SRD backgrounds (expansion content)
const NON_SRD_BACKGROUNDS = new Set([
  'Charlatan', 'Criminal', 'Entertainer', 'Folk Hero', 'Guild Artisan',
  'Hermit', 'Noble', 'Outlander', 'Sage', 'Sailor', 'Soldier', 'Urchin'
]);

// SRD feats (only one feat is in the SRD)
const SRD_FEATS = new Set([
  'Grappler'
]);

async function main() {
  const raw = await readFile(MANIFEST_PATH, 'utf8');
  const manifest = JSON.parse(raw);

  let updated = 0;

  for (const entry of manifest.entities) {
    const { type, id } = entry;
    let newStatus = null;

    switch (type) {
      case 'race':
        newStatus = SRD_RACES.has(id) ? 'srd-ok' : 'non-srd';
        break;

      case 'class':
        newStatus = SRD_CLASSES.has(id) ? 'srd-ok' : 'non-srd';
        break;

      case 'background':
        if (SRD_BACKGROUNDS.has(id)) {
          newStatus = 'srd-ok';
        } else if (NON_SRD_BACKGROUNDS.has(id)) {
          newStatus = 'non-srd';
        }
        break;

      case 'feat':
        newStatus = SRD_FEATS.has(id) ? 'srd-ok' : 'non-srd';
        break;

      case 'subclass': {
        // Subclass IDs are like "Barbarian:Path of the Berserker"
        const [className, subclassName] = id.split(':');
        // Only one subclass per class is in the SRD
        const SRD_SUBCLASSES = {
          'Barbarian': 'Path of the Berserker',
          'Bard': 'College of Lore',
          'Cleric': 'Life Domain',
          'Druid': 'Circle of the Land',
          'Fighter': 'Champion',
          'Monk': 'Way of the Open Hand',
          'Paladin': 'Oath of Devotion',
          'Ranger': 'Hunter',
          'Rogue': 'Thief',
          'Sorcerer': 'Draconic Bloodline',
          'Warlock': 'The Fiend',
          'Wizard': 'School of Evocation'
        };
        if (SRD_SUBCLASSES[className] === subclassName) {
          newStatus = 'srd-ok';
        } else if (SRD_CLASSES.has(className)) {
          newStatus = 'non-srd';
        }
        break;
      }

      case 'beast':
        // All beasts in the SRD are allowed
        newStatus = 'srd-ok';
        break;

      case 'weapon':
      case 'equipment':
        // Standard equipment is SRD
        newStatus = 'srd-ok';
        break;

      case 'racial-base-feature':
      case 'racial-feature':
      case 'racial-scaling-feature':
      case 'racial-spell': {
        // Extract race from the ID (e.g., "racial-base:Dwarf" or "racial-feature:Elf:1:...")
        const parts = id.split(':');
        const race = parts[1];
        newStatus = SRD_RACES.has(race) ? 'srd-ok' : 'non-srd';
        break;
      }

      case 'class-resource':
      case 'class-equipment-default':
      case 'class-equipment-choice':
      case 'class-starting-gold': {
        // Extract class from the ID
        const parts = id.split(':');
        const className = parts[1];
        newStatus = SRD_CLASSES.has(className) ? 'srd-ok' : 'non-srd';
        break;
      }

      case 'subclass-spell':
      case 'subclass-cantrip': {
        // Extract class and subclass from the ID
        const parts = id.split(':');
        const className = parts[1];
        const subclassName = parts[2];
        const SRD_SUBCLASSES = {
          'Barbarian': 'Path of the Berserker',
          'Bard': 'College of Lore',
          'Cleric': 'Life Domain',
          'Druid': 'Circle of the Land',
          'Fighter': 'Champion',
          'Monk': 'Way of the Open Hand',
          'Paladin': 'Oath of Devotion',
          'Ranger': 'Hunter',
          'Rogue': 'Thief',
          'Sorcerer': 'Draconic Bloodline',
          'Warlock': 'The Fiend',
          'Wizard': 'School of Evocation'
        };
        if (SRD_SUBCLASSES[className] === subclassName) {
          newStatus = 'srd-ok';
        } else {
          newStatus = 'non-srd';
        }
        break;
      }

      case 'artificer-infusion':
        // Artificer is not SRD
        newStatus = 'non-srd';
        break;
    }

    if (newStatus && entry.status !== newStatus) {
      entry.status = newStatus;
      updated++;
    }
  }

  await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  console.log(`Updated ${updated} entries in manifest`);

  // Print summary
  const summary = {};
  for (const entry of manifest.entities) {
    const key = `${entry.type}:${entry.status}`;
    summary[key] = (summary[key] || 0) + 1;
  }
  console.log('\nStatus summary:');
  Object.entries(summary).sort().forEach(([key, count]) => {
    console.log(`  ${key}: ${count}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

#!/usr/bin/env node
/**
 * Adds srd: true/false flags to spells in spells-data.js
 * Non-SRD spells are from XGtE, TCoE, SCAG, and other supplements
 */

import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SPELLS_PATH = path.join(__dirname, '..', 'data', 'srd', 'spells-data.js');

// Non-SRD spells (from XGtE, TCoE, SCAG, and other supplements)
const NON_SRD_SPELLS = new Set([
  // XGtE spells
  "Abi-Dalzim's Horrid Wilting",
  "Absorb Elements",
  "Beast Bond",
  "Bones of the Earth",
  "Booming Blade",
  "Catapult",
  "Catnap",
  "Cause Fear",
  "Ceremony",
  "Chaos Bolt",
  "Control Flames",
  "Control Winds",
  "Create Bonfire",
  "Crown of Stars",
  "Danse Macabre",
  "Dragon's Breath",
  "Druid Grove",
  "Dust Devil",
  "Earthbind",
  "Elemental Bane",
  "Enemies Abound",
  "Enervation",
  "Erupting Earth",
  "Far Step",
  "Flame Arrows",
  "Frostbite",
  "Green-Flame Blade",
  "Guardian of Nature",
  "Gust",
  "Healing Spirit",
  "Holy Weapon",
  "Ice Knife",
  "Immolation",
  "Infernal Calling",
  "Infestation",
  "Investiture of Flame",
  "Investiture of Ice",
  "Investiture of Stone",
  "Investiture of Wind",
  "Life Transference",
  "Maddening Darkness",
  "Magnify Gravity",
  "Melf's Minute Meteors",
  "Mental Prison",
  "Mighty Fortress",
  "Mind Spike",
  "Negative Energy Flood",
  "Primordial Ward",
  "Primal Savagery",
  "Psychic Scream",
  "Pyrotechnics",
  "Scatter",
  "Shadow Blade",
  "Shadow of Moil",
  "Shape Water",
  "Sickening Radiance",
  "Skill Empowerment",
  "Skywrite",
  "Snare",
  "Snilloc's Snowball Swarm",
  "Soul Cage",
  "Steel Wind Strike",
  "Storm Sphere",
  "Synaptic Static",
  "Temple of the Gods",
  "Thunder Step",
  "Thunderclap",
  "Tidal Wave",
  "Tiny Servant",
  "Toll the Dead",
  "Transmute Rock",
  "Vitriolic Sphere",
  "Wall of Light",
  "Wall of Sand",
  "Wall of Water",
  "Warding Wind",
  "Watery Sphere",
  "Whirlwind",
  "Word of Radiance",
  "Wrath of Nature",
  "Zephyr Strike",

  // TCoE spells
  "Blade of Disaster",
  "Dream of the Blue Veil",
  "Intellect Fortress",
  "Mind Sliver",
  "Spirit Shroud",
  "Summon Aberration",
  "Summon Beast",
  "Summon Celestial",
  "Summon Construct",
  "Summon Draconic Spirit",
  "Summon Elemental",
  "Summon Fey",
  "Summon Fiend",
  "Summon Shadowspawn",
  "Summon Undead",
  "Tasha's Caustic Brew",
  "Tasha's Mind Whip",
  "Tasha's Otherworldly Guise",

  // SCAG spells
  "Lightning Lure",
  "Sword Burst",

  // Other supplements
  "Mold Earth",
]);

async function main() {
  let content = await readFile(SPELLS_PATH, 'utf8');
  const lines = content.split('\n');
  const newLines = [];

  let srdCount = 0;
  let nonSrdCount = 0;
  let currentTitle = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Track current spell title
    const titleMatch = line.match(/title:\s*"([^"]+)"/);
    if (titleMatch) {
      currentTitle = titleMatch[1];
    }

    // Check if this line ends a spell object (has tags array and closing brace on next line, or tags with srd already)
    if (line.includes('tags:') && line.includes(']')) {
      // Check if srd flag already exists (either on this line or next)
      const nextLine = lines[i + 1] || '';
      const hasSrdAlready = line.includes('srd:') || nextLine.trim().startsWith('srd:');

      if (!hasSrdAlready && currentTitle) {
        const isSrd = !NON_SRD_SPELLS.has(currentTitle);
        if (isSrd) srdCount++;
        else nonSrdCount++;

        // Add srd flag after the tags line
        if (line.trim().endsWith('],')) {
          // tags: [...],  -> add srd on new line
          newLines.push(line);
          newLines.push(`      srd: ${isSrd}`);
          continue;
        } else if (line.trim().endsWith(']')) {
          // tags: [...] without comma -> add comma and srd
          newLines.push(line.replace(/\](\s*)$/, '],'));
          newLines.push(`      srd: ${isSrd}`);
          continue;
        }
      }
    }

    newLines.push(line);
  }

  await writeFile(SPELLS_PATH, newLines.join('\n'));
  console.log(`Processed spells:`);
  console.log(`  Added SRD: ${srdCount}`);
  console.log(`  Added Non-SRD: ${nonSrdCount}`);
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});

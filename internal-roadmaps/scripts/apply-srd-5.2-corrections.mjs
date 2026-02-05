#!/usr/bin/env node
/**
 * Apply SRD 5.2 corrections to srd-audit.json
 *
 * This script reads the diff file and updates entity statuses in the manifest
 * to align with SRD 5.2 (2024 PHB) specifications.
 *
 * Run: node internal-roadmaps/scripts/apply-srd-5.2-corrections.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');

const MANIFEST_PATH = path.join(repoRoot, 'internal-roadmaps', 'manifests', 'srd-audit.json');
const DIFF_PATH = path.join(repoRoot, 'internal-roadmaps', 'manifests', 'srd-5.2-diff.json');
const BACKUP_PATH = path.join(repoRoot, 'internal-roadmaps', 'manifests', 'srd-audit.backup.json');

// Read files
console.log('Reading manifest and diff files...');
const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
const diff = JSON.parse(fs.readFileSync(DIFF_PATH, 'utf8'));

// Create backup
console.log('Creating backup...');
fs.writeFileSync(BACKUP_PATH, JSON.stringify(manifest, null, 2), 'utf8');

// Track changes
const changes = {
  addedToAllowlist: [],
  removedFromAllowlist: [],
  unchanged: [],
  notFound: []
};

// Helper to find entity by id and type
function findEntity(id, type) {
  return manifest.entities.find(e => e.id === id && e.type === type);
}

// Helper to update entity status
function updateStatus(id, type, newStatus, reason) {
  const entity = findEntity(id, type);
  if (!entity) {
    changes.notFound.push({ id, type });
    return false;
  }

  const oldStatus = entity.status;
  if (oldStatus === newStatus) {
    changes.unchanged.push({ id, type, status: newStatus });
    return false;
  }

  entity.status = newStatus;
  entity.srdCitation = newStatus === 'srd-ok' ? `SRD 5.2 (2024)` : null;
  entity.nonSrdReason = newStatus === 'non-srd' ? reason : null;
  entity.notes = `Updated for SRD 5.2 compliance (was: ${oldStatus})`;

  if (newStatus === 'srd-ok') {
    changes.addedToAllowlist.push({ id, type, from: oldStatus });
  } else {
    changes.removedFromAllowlist.push({ id, type, from: oldStatus });
  }

  return true;
}

// Process race changes
console.log('\nProcessing race changes...');
const raceChanges = diff.changes.race;
raceChanges.addToAllowlist?.forEach(id => {
  updateStatus(id, 'race', 'srd-ok', null);
});
raceChanges.removeFromAllowlist?.forEach(id => {
  updateStatus(id, 'race', 'non-srd', 'Not in SRD 5.2 species list');
});

// Process background changes
console.log('Processing background changes...');
const bgChanges = diff.changes.background;
bgChanges.removeFromAllowlist?.forEach(id => {
  updateStatus(id, 'background', 'non-srd', 'Only 4 backgrounds in SRD 5.2: Acolyte, Criminal, Sage, Soldier');
});

// Process feat changes
console.log('Processing feat changes...');
const featChanges = diff.changes.feat;
featChanges.removeFromAllowlist?.forEach(id => {
  updateStatus(id, 'feat', 'non-srd', 'Not in SRD 5.2 feat list');
});
featChanges.moveFromBlocklistToAllowlist?.forEach(id => {
  updateStatus(id, 'feat', 'srd-ok', null);
});
// Note: New feats to add would need to be created as new entities

// Process spell changes
console.log('Processing spell changes...');
const spellChanges = diff.changes.spell;
spellChanges.moveFromBlocklistToAllowlist?.forEach(id => {
  updateStatus(id, 'spell', 'srd-ok', null);
});
spellChanges.removeFromAllowlist?.forEach(id => {
  updateStatus(id, 'spell', 'non-srd', 'Not in SRD 5.2 spell list');
});

// Process beast changes
console.log('Processing beast changes...');
const beastChanges = diff.changes.beast;
beastChanges.removeFromAllowlist?.forEach(id => {
  updateStatus(id, 'beast', 'non-srd', 'Not in SRD 5.2 creature list');
});

// Process equipment changes
console.log('Processing equipment changes...');
const equipChanges = diff.changes.equipment;
equipChanges.moveFromBlocklistToAllowlist?.forEach(id => {
  updateStatus(id, 'equipment', 'srd-ok', null);
});

// Process class changes
console.log('Processing class changes...');
const classChanges = diff.changes.class;
classChanges.addToAllowlist?.forEach(id => {
  updateStatus(id, 'class', 'srd-ok', null);
});

// Process subclass changes - ALL should be blocked in SRD 5.2
console.log('Processing subclass changes...');
const subclassChanges = diff.changes.subclass;
subclassChanges.removeFromAllowlist?.forEach(id => {
  updateStatus(id, 'subclass', 'non-srd', 'SRD 5.2 contains no subclass text or features');
});

// Also block all subclass-spell and subclass-cantrip entries
console.log('Processing subclass-spell and subclass-cantrip changes...');
manifest.entities.forEach(entity => {
  if (entity.type === 'subclass-spell' && entity.status === 'srd-ok') {
    entity.status = 'non-srd';
    entity.nonSrdReason = 'Subclass spells not in SRD 5.2';
    entity.notes = 'Updated for SRD 5.2 compliance';
    changes.removedFromAllowlist.push({ id: entity.id, type: entity.type, from: 'srd-ok' });
  }
  if (entity.type === 'subclass-cantrip' && entity.status === 'srd-ok') {
    entity.status = 'non-srd';
    entity.nonSrdReason = 'Subclass cantrips not in SRD 5.2';
    entity.notes = 'Updated for SRD 5.2 compliance';
    changes.removedFromAllowlist.push({ id: entity.id, type: entity.type, from: 'srd-ok' });
  }
});

// Process racial-base-feature changes
console.log('Processing racial-base-feature changes...');
const racialBaseChanges = diff.changes['racial-base-feature'];
racialBaseChanges?.addToAllowlist?.forEach(id => {
  updateStatus(id, 'racial-base-feature', 'srd-ok', null);
});
racialBaseChanges?.removeFromAllowlist?.forEach(id => {
  updateStatus(id, 'racial-base-feature', 'non-srd', 'Species not in SRD 5.2');
});

// Update manifest metadata
manifest.generatedAt = new Date().toISOString();
manifest.version = 2;

// Write updated manifest
console.log('\nWriting updated manifest...');
fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');

// Print summary
console.log('\n=== SRD 5.2 Corrections Summary ===');
console.log(`Added to allowlist: ${changes.addedToAllowlist.length}`);
changes.addedToAllowlist.forEach(c => console.log(`  + ${c.type}:${c.id} (was ${c.from})`));

console.log(`\nRemoved from allowlist: ${changes.removedFromAllowlist.length}`);
changes.removedFromAllowlist.forEach(c => console.log(`  - ${c.type}:${c.id} (was ${c.from})`));

console.log(`\nUnchanged: ${changes.unchanged.length}`);
console.log(`Not found in manifest: ${changes.notFound.length}`);
changes.notFound.forEach(c => console.log(`  ? ${c.type}:${c.id}`));

console.log('\nBackup saved to:', path.relative(repoRoot, BACKUP_PATH));
console.log('Updated manifest saved to:', path.relative(repoRoot, MANIFEST_PATH));
console.log('\nNext steps:');
console.log('1. Review the changes above');
console.log('2. Run: npm run generate-srd-allowlist');
console.log('3. Run: npm run generate-srd-regression-pack');

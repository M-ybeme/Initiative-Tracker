#!/usr/bin/env node

import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(ROOT_DIR, 'internal-roadmaps', 'manifests', 'srd-audit.json');
const OUTPUT_PATH = path.join(ROOT_DIR, 'js', 'generated', 'srd-allowlist.js');

const ALLOWED_STATUSES = new Set(['srd-ok', 'original']);
const BLOCKED_STATUSES = new Set(['non-srd']);

// Types that have metadata.srd flags for SRD determination
const TYPES_WITH_SRD_FLAGS = new Set([
  'fighting-style',
  'pact-boon',
  'eldritch-invocation',
  'metamagic',
  'subrace'
]);

async function main() {
  const raw = await readFile(MANIFEST_PATH, 'utf8');
  const manifest = JSON.parse(raw);
  const entries = manifest.entities ?? [];

  const allowlist = {};
  const blocklist = {};

  for (const entry of entries) {
    const { id, type, status, metadata } = entry;
    if (!id || !type) continue;

    // For types with metadata.srd flags, use that flag directly
    if (TYPES_WITH_SRD_FLAGS.has(type) && metadata && typeof metadata.srd === 'boolean') {
      if (metadata.srd) {
        pushValue(allowlist, type, id);
      } else {
        pushValue(blocklist, type, id);
      }
      continue;
    }

    // For other types, use the status field
    if (ALLOWED_STATUSES.has(status)) {
      pushValue(allowlist, type, id);
    } else if (BLOCKED_STATUSES.has(status)) {
      pushValue(blocklist, type, id);
    }
  }

  // Ensure types with blocklist entries but no allowlist entries get an empty array
  // This is critical: the filter returns true if there's no allowlist for a type,
  // so we need an empty array to properly block all items of that type
  Object.keys(blocklist).forEach((key) => {
    if (!allowlist[key]) {
      allowlist[key] = [];
    }
  });

  // Sort values for deterministic output
  Object.keys(allowlist).forEach((key) => allowlist[key].sort());
  Object.keys(blocklist).forEach((key) => blocklist[key].sort());

  const banner = `/**\n * AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY.\n * Generated via scripts/generate-srd-allowlist.mjs on ${new Date().toISOString()}\n * Source: internal-roadmaps/manifests/srd-audit.json\n */`;

  const contents = `${banner}\n(function() {\n  const allowlist = ${JSON.stringify(allowlist, null, 2)};\n  const blocklist = ${JSON.stringify(blocklist, null, 2)};\n  window.SRD_CONTENT_ALLOWLIST = allowlist;\n  window.SRD_CONTENT_BLOCKLIST = blocklist;\n})();\n`;

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, contents);
  console.log(`SRD allowlist written to ${path.relative(ROOT_DIR, OUTPUT_PATH)}`);
}

function pushValue(map, key, value) {
  if (!map[key]) {
    map[key] = [];
  }
  if (!map[key].includes(value)) {
    map[key].push(value);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

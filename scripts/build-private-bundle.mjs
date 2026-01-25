#!/usr/bin/env node
import { cp, mkdir, rm, stat, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const DEFAULT_OUTPUT = path.resolve(ROOT, 'dist', 'private-build');

const INCLUDE_PATHS = [
  'index.html',
  'initiative.html',
  'battlemap.html',
  'encounterbuilder.html',
  'characters.html',
  'journal.html',
  'loot.html',
  'shop.html',
  'tav.html',
  'name.html',
  'npc.html',
  'new.html',
  'css',
  'js',
  'data',
  'images',
  'LICENSE.md',
  'README.md'
];

function parseArgs(argv) {
  const options = {
    output: DEFAULT_OUTPUT,
    packs: []
  };

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === '--output' && argv[i + 1]) {
      options.output = path.resolve(process.cwd(), argv[++i]);
      continue;
    }
    if ((token === '--packs' || token === '--pack') && argv[i + 1]) {
      const value = argv[++i];
      const entries = value.split(',').map((t) => t.trim()).filter(Boolean);
      options.packs.push(...entries);
      continue;
    }
    if (token.startsWith('--packs=')) {
      const value = token.split('=')[1] || '';
      const entries = value.split(',').map((t) => t.trim()).filter(Boolean);
      options.packs.push(...entries);
      continue;
    }
    if (token === '--help' || token === '-h') {
      options.help = true;
      continue;
    }
  }

  return options;
}

function printHelp() {
  console.log(`Build a private bundle of The DM's Toolbox with optional content packs.\n\n` +
    `Usage: npm run build:pack -- --packs path/to/pack.json --output dist/private-build\n\n` +
    `Options:\n` +
    `  --packs <list>   Comma-separated list of JSON pack files to bundle (default: none)\n` +
    `  --output <path>  Destination directory for the bundle (default: dist/private-build)\n` +
    `  -h, --help       Show this message\n`);
}

async function ensurePathExists(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  await stat(absPath);
  return absPath;
}

async function copyInclude(targetDir) {
  for (const relPath of INCLUDE_PATHS) {
    const source = await ensurePathExists(relPath).catch(() => null);
    if (!source) {
      console.warn(`⚠ Skipping missing path: ${relPath}`);
      continue;
    }
    const destination = path.join(targetDir, relPath);
    await mkdir(path.dirname(destination), { recursive: true });
    await cp(source, destination, { recursive: true });
    console.log(`✓ Copied ${relPath}`);
  }
}

async function copyPacks(targetDir, packPaths) {
  if (!packPaths.length) {
    return [];
  }
  const bundleDir = path.join(targetDir, 'private-packs');
  await mkdir(bundleDir, { recursive: true });

  const metadata = [];

  for (const packPath of packPaths) {
    const absPath = path.resolve(process.cwd(), packPath);
    const stats = await stat(absPath).catch(() => null);
    if (!stats) {
      throw new Error(`Pack not found: ${packPath}`);
    }
    const fileName = path.basename(absPath);
    const destination = path.join(bundleDir, fileName);
    await cp(absPath, destination, { recursive: false });
    const hash = await hashFile(destination);
    metadata.push({
      fileName,
      originalPath: absPath,
      sizeBytes: stats.size,
      sha256: hash
    });
    console.log(`✓ Bundled pack ${fileName}`);
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    packs: metadata
  };
  await writeFile(path.join(bundleDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  const instructions = `# Private Packs\n\n` +
    `These packs were copied when build:pack ran. Import them via the Manage Content Packs dialog.\n\n` +
    `| File | SHA-256 | Size (bytes) |\n|------|---------|--------------|\n` +
    metadata.map((pack) => `| ${pack.fileName} | ${pack.sha256.slice(0, 12)}… | ${pack.sizeBytes} |`).join('\n') + '\n';
  await writeFile(path.join(bundleDir, 'README.md'), instructions, 'utf8');

  return metadata;
}

async function hashFile(filePath) {
  const buffer = await readFile(filePath);
  return createHash('sha256').update(buffer).digest('hex');
}

async function writeBundleReadme(targetDir, packMetadata) {
  const content = `# Private Build Output\n\n` +
    `This folder contains a static copy of The DM's Toolbox plus any private content packs you selected.\n` +
    `Host it locally (\`npx serve dist/private-build\`) or upload to a password-protected site.\n\n` +
    `## Contents\n- Core SRD-only app files (HTML, CSS, JS, data)\n- Optional \`private-packs/\` directory with your JSON packs\n- Generated manifest for quick verification\n\n` +
    `## Loading Packs\n1. Start a static server in this folder (\`npx serve .\` or any equivalent).\n2. Visit the site and open **Manage Content Packs**.\n3. Import the files from \`private-packs/\` as needed.\n\n` +
    `## Warnings\n- Do not redistribute this folder. It may contain content you licensed privately.\n- Packs remain client-side; clearing browser storage removes them.\n- Never commit \`private-packs/\` back into the public repository.\n\n` +
    (packMetadata.length ? `Bundled packs: ${packMetadata.map((p) => p.fileName).join(', ')}` : 'No packs bundled.');

  await writeFile(path.join(targetDir, 'PRIVATE_BUILD.md'), content, 'utf8');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  await rm(options.output, { recursive: true, force: true });
  await mkdir(options.output, { recursive: true });

  console.log('📦 Building private bundle...');
  await copyInclude(options.output);
  const packMetadata = await copyPacks(options.output, options.packs);
  await writeBundleReadme(options.output, packMetadata);

  console.log(`\nBundle ready at ${options.output}`);
  if (packMetadata.length) {
    console.log(`Included packs: ${packMetadata.map((p) => p.fileName).join(', ')}`);
  } else {
    console.log('No packs were bundled (SRD-only build).');
  }
}

main().catch((err) => {
  console.error('build:pack failed:', err.message);
  process.exitCode = 1;
});

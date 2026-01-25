#!/usr/bin/env node

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DOCS_DIR = path.join(ROOT_DIR, 'docs');
const OUTPUT_PATH = path.join(ROOT_DIR, 'internal-roadmaps', 'manifests', 'narrative-audit.json');

async function main() {
  const docs = await inventoryDocs(DOCS_DIR);
  const tooltips = await inventoryTooltips(ROOT_DIR);

  const manifest = {
    version: 1,
    generatedAt: new Date().toISOString(),
    docs,
    tooltips
  };

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(manifest, null, 2));

  console.log(`Wrote narrative inventory to ${path.relative(ROOT_DIR, OUTPUT_PATH)}`);
}

async function inventoryDocs(baseDir) {
  const files = await listMarkdownFiles(baseDir);
  const entries = [];

  for (const file of files) {
    const absPath = path.join(baseDir, file);
    const raw = await fs.readFile(absPath, 'utf8');
    const relPath = path.relative(ROOT_DIR, absPath).replace(/\\/g, '/');

    entries.push({
      path: relPath,
      wordCount: countWords(raw),
      headings: extractHeadings(raw)
    });
  }

  return entries;
}

async function listMarkdownFiles(dir, prefix = '') {
  const dirents = await fs.readdir(path.join(dir, prefix), { withFileTypes: true });
  const files = [];
  for (const dirent of dirents) {
    const relPath = path.join(prefix, dirent.name);
    if (dirent.isDirectory()) {
      files.push(...await listMarkdownFiles(dir, relPath));
    } else if (dirent.isFile() && dirent.name.toLowerCase().endsWith('.md')) {
      files.push(relPath);
    }
  }
  return files.sort();
}

function countWords(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

function extractHeadings(text) {
  const matches = text.matchAll(/^(#{1,6})\s+(.+)$/gm);
  const headings = [];
  for (const match of matches) {
    headings.push({
      level: match[1].length,
      text: match[2].trim()
    });
  }
  return headings;
}

async function inventoryTooltips(rootDir) {
  const htmlFiles = await listHtmlFiles(rootDir);
  const entries = [];

  for (const file of htmlFiles) {
    const absPath = path.join(rootDir, file);
    const raw = await fs.readFile(absPath, 'utf8');
    const relPath = file.replace(/\\/g, '/');
    const tooltips = extractTooltips(raw);
    tooltips.forEach((tip) => {
      entries.push({
        path: relPath,
        line: tip.line,
        text: tip.text,
        snippet: tip.snippet
      });
    });
  }

  return entries;
}

async function listHtmlFiles(rootDir) {
  const dirents = await fs.readdir(rootDir, { withFileTypes: true });
  const files = [];
  for (const dirent of dirents) {
    if (dirent.isFile() && dirent.name.toLowerCase().endsWith('.html')) {
      files.push(dirent.name);
    }
  }
  return files.sort();
}

function extractTooltips(html) {
  const entries = [];
  const tooltipRegex = /<[^>]*data-bs-toggle="tooltip"[^>]*>/gi;
  let match;
  while ((match = tooltipRegex.exec(html))) {
    const tag = match[0];
    const title = extractAttribute(tag, 'data-bs-original-title')
      || extractAttribute(tag, 'title')
      || extractAttribute(tag, 'data-bs-title')
      || '';
    const line = lineNumberFromIndex(html, match.index);
    const snippet = html.slice(Math.max(0, match.index - 60), Math.min(html.length, match.index + tag.length + 60)).replace(/\s+/g, ' ').trim();

    entries.push({ line, text: title.trim(), snippet });
  }
  return entries;
}

function extractAttribute(tag, attr) {
  const regex = new RegExp(`${attr}="([^"]*)"`, 'i');
  const res = tag.match(regex);
  return res ? res[1] : null;
}

function lineNumberFromIndex(text, index) {
  const before = text.slice(0, index);
  return before.split(/\n/).length;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

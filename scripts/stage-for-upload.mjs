#!/usr/bin/env node
/**
 * Stage corpus markdown files for Progress Agentic RAG dashboard drag-and-drop upload.
 *
 * Walks corpus/content_type/<ct>/<file>.md and copies each to
 * ~/Desktop/aurora-upload/<ct>-<file>.md.
 *
 * The composite filename matters: when you drag a file into the Progress Agentic RAG
 * dashboard, the resulting resource slug is derived from the filename.
 * We need slugs like `product-terratrek-7` so that:
 *
 *  - populate-custom-fields.mjs can find the 6 hero products by slug
 *  - apply-labels-post-upload.mjs can look up each resource by slug
 *  - same-base-filename collisions (product/skyline-45l.md and
 *    gear_review/skyline-45l.md) don't both want slug "skyline-45l"
 *
 * YAML frontmatter is preserved — it's useful additional signal for the
 * graph-extraction agent when the LLM scans the resource later.
 */

import 'dotenv/config';
import { readFile, writeFile, readdir, mkdir, rm, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, dirname, resolve, basename } from 'node:path';
import { homedir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CORPUS = resolve(__dirname, '..', 'corpus', 'content_type');
const STAGE = join(homedir(), 'Desktop', 'aurora-upload');

console.log(`Source:  ${CORPUS}`);
console.log(`Staging: ${STAGE}`);
console.log();

// Clean staging dir if present
try {
  await stat(STAGE);
  await rm(STAGE, { recursive: true, force: true });
  console.log(`Cleared existing ${STAGE}`);
} catch (e) {
  // doesn't exist, fine
}
await mkdir(STAGE, { recursive: true });

const cts = (await readdir(CORPUS)).filter((d) => !d.startsWith('.'));
let total = 0;
const mapping = [];
for (const ct of cts) {
  const dir = join(CORPUS, ct);
  const files = (await readdir(dir)).filter((f) => f.endsWith('.md'));
  for (const file of files) {
    total += 1;
    const src = join(dir, file);
    // Use .txt extension — dashboard uploads of .txt have been more
    // reliable than .md on some tenants. Body content is identical;
    // markdown syntax indexes fine as plain text.
    const stagedName = `${ct}-${file.replace(/\.md$/, '.txt')}`;
    const dst = join(STAGE, stagedName);
    const body = await readFile(src, 'utf8');
    await writeFile(dst, body);
    mapping.push({ src: `${ct}/${file}`, dst: stagedName });
  }
}

console.log(`Copied ${total} files.`);
console.log();
console.log('Source → staged filename:');
for (const m of mapping) {
  console.log(`  ${m.src.padEnd(50)} → ${m.dst}`);
}
console.log();
console.log(`Next: drag the contents of ${STAGE} into the Progress Agentic RAG dashboard's resources panel.`);

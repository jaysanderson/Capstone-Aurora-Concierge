#!/usr/bin/env node
/**
 * Backfill the 3 labelsets (content_type / audience / region) on
 * resources uploaded via the Nuclia dashboard.
 *
 * The dashboard's drag-and-drop upload doesn't apply classifications —
 * it just creates the resource with the file body. This script reads each
 * source markdown's YAML frontmatter, computes the expected composite
 * slug, looks the resource up by slug, and PATCHes its classifications.
 *
 * Critical: PATCHes ONLY usermetadata.classifications. Does not touch
 * data.texts (would wipe the field-engineered fields the next script
 * applies). Does not send a `custom` key (not in Nuclia's schema).
 *
 * Usage:
 *   node scripts/apply-labels-post-upload.mjs              # apply
 *   node scripts/apply-labels-post-upload.mjs --dry-run    # preview
 */

import 'dotenv/config';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, dirname, resolve, basename } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const CORPUS = join(ROOT, 'corpus', 'content_type');

const args = parseArgs(process.argv.slice(2));
const DRY_RUN = !!args['dry-run'];

const env = {
  apiUrl: must('NUCLIA_API_URL'),
  kbId: must('NUCLIA_KB_ID'),
  apiKey: must('NUCLIA_API_KEY'),
};
const baseUrl = `${env.apiUrl}/kb/${env.kbId}`;
const headers = {
  'X-NUCLIA-SERVICEACCOUNT': `Bearer ${env.apiKey}`,
  'Content-Type': 'application/json',
};

async function main() {
  if (DRY_RUN) console.log('[dry-run] No PATCHes will be sent.');
  else console.log(`Applying labels on ${env.apiUrl} (KB ${env.kbId})`);

  const cts = (await readdir(CORPUS)).filter((d) => !d.startsWith('.'));
  let ok = 0, fail = 0, missing = 0;

  for (const ct of cts) {
    const dir = join(CORPUS, ct);
    const files = (await readdir(dir)).filter((f) => f.endsWith('.md'));
    for (const file of files) {
      const path = join(dir, file);
      const { frontmatter } = await parseDoc(path);
      const slug = `${ct}-${basename(file, '.md').toLowerCase()}`;

      const classifications = [
        { labelset: 'content_type', label: ct },
        ...(frontmatter.audience ? [{ labelset: 'audience', label: frontmatter.audience }] : []),
        ...(frontmatter.region ? [{ labelset: 'region', label: frontmatter.region }] : []),
      ];

      const summary = `${slug.padEnd(50)} ← ${classifications.map((c) => `${c.labelset}:${c.label}`).join(' ')}`;
      if (DRY_RUN) { console.log(`[dry] ${summary}`); ok += 1; continue; }

      // Look up by slug
      const lookup = await fetch(`${baseUrl}/slug/${slug}`, { headers });
      if (!lookup.ok) {
        console.error(`[404] ${slug}: not found in KB (was it uploaded?)`);
        missing += 1;
        continue;
      }
      const lookupBody = await lookup.json();
      const id = lookupBody?.id ?? lookupBody?.uuid ?? lookupBody?.rid;
      if (!id) {
        console.error(`[err] ${slug}: lookup returned no id`);
        fail += 1;
        continue;
      }

      // PATCH only usermetadata.classifications.
      const r = await fetch(`${baseUrl}/resource/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ usermetadata: { classifications } }),
      });
      if (!r.ok) {
        console.error(`[err] ${slug}: ${r.status} ${r.statusText} — ${(await r.text()).slice(0, 200)}`);
        fail += 1;
        continue;
      }
      console.log(`[ok ] ${summary}`);
      ok += 1;
    }
  }

  console.log(`\nDone. ok=${ok} missing=${missing} failed=${fail}`);
  if (missing > 0) {
    console.log('\nMissing resources: Jay needs to upload these to the dashboard first, OR the dashboard generated a different slug than expected.');
    console.log('Check the Nuclia dashboard Resources tab for the actual slug of each file.');
  }
  if (fail > 0) process.exit(1);
}

async function parseDoc(path) {
  const raw = await readFile(path, 'utf8');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return { frontmatter: {}, body: raw };
  const frontmatter = {};
  for (const line of m[1].split('\n')) {
    const mm = line.match(/^([a-zA-Z_]+):\s*(.+)\s*$/);
    if (mm) frontmatter[mm[1]] = mm[2].replace(/^["']|["']$/g, '').trim();
  }
  return { frontmatter, body: m[2] };
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    out[a.slice(2)] = true;
  }
  return out;
}

function must(name) {
  const v = process.env[name];
  if (!v || v.startsWith('paste-')) {
    console.error(`Missing env var ${name}.`);
    process.exit(1);
  }
  return v;
}

main().catch((e) => { console.error(e); process.exit(1); });

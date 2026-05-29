#!/usr/bin/env node
/**
 * Aurora KB seeder.
 *
 * Walks corpus/content_type/<ct>/*.md, parses YAML frontmatter,
 * ingests each file into the configured ARAG KB, applies labels.
 *
 * After running this, run `npm run populate:fields` to add the
 * Aurora-specific custom fields (callToAction, searchResultDisplay,
 * videoInfo) to the hero products.
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
const ONLY_CT = args['content-type'];

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
  if (DRY_RUN) console.log('[dry-run] No actual ingest.');
  else console.log(`Ingesting Aurora corpus into ${env.apiUrl} (KB ${env.kbId})`);

  const cts = (await readdir(CORPUS)).filter((d) => !d.startsWith('.'));
  let total = 0, ok = 0, fail = 0;
  for (const ct of cts) {
    if (ONLY_CT && ct !== ONLY_CT) continue;
    const dir = join(CORPUS, ct);
    const files = (await readdir(dir)).filter((f) => f.endsWith('.md'));
    for (const file of files) {
      total += 1;
      const path = join(dir, file);
      const { frontmatter, body, title } = await parseDoc(path);
      const slug = makeSlug(file);
      const labels = [
        { labelset: 'content_type', label: ct },
        ...(frontmatter.audience ? [{ labelset: 'audience', label: frontmatter.audience }] : []),
        ...(frontmatter.region ? [{ labelset: 'region', label: frontmatter.region }] : []),
      ];
      const label = `${ct}/${file} → ${labels.map((l) => `${l.labelset}:${l.label}`).join(' ')}`;
      if (DRY_RUN) { console.log(`[dry] ${label}`); ok += 1; continue; }
      try {
        await ingestOne({ slug, title: frontmatter.title ?? title, body, labels });
        console.log(`[ok ] ${label}`);
        ok += 1;
      } catch (e) {
        console.error(`[err] ${label} → ${e.message}`);
        fail += 1;
      }
    }
  }
  console.log(`\nDone. ${ok}/${total} succeeded${fail ? `, ${fail} failed` : ''}.`);
  if (!DRY_RUN) console.log('\nNext: run `npm run populate:fields` to add the field-engineered callToAction + searchResultDisplay + videoInfo to hero products.');
}

async function ingestOne({ slug, title, body, labels }) {
  const resp = await fetch(`${baseUrl}/resources`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      slug,
      title,
      texts: { body: { body, format: 'MARKDOWN' } },
      usermetadata: { classifications: labels },
    }),
  });
  if (!resp.ok) throw new Error(`${resp.status} ${resp.statusText} — ${(await resp.text()).slice(0, 240)}`);
}

async function parseDoc(path) {
  const raw = await readFile(path, 'utf8');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return { frontmatter: {}, body: raw, title: basename(path, '.md') };
  const frontmatter = {};
  for (const line of m[1].split('\n')) {
    const mm = line.match(/^([a-zA-Z_]+):\s*(.+)\s*$/);
    if (mm) frontmatter[mm[1]] = mm[2].replace(/^["']|["']$/g, '').trim();
  }
  return { frontmatter, body: m[2], title: basename(path, '.md') };
}

function makeSlug(filename) { return filename.replace(/\.md$/, '').toLowerCase(); }

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) out[key] = true;
    else { out[key] = next; i += 1; }
  }
  return out;
}

function must(name) {
  const v = process.env[name];
  if (!v || v.startsWith('paste-')) { console.error(`Missing env var ${name}.`); process.exit(1); }
  return v;
}

main().catch((e) => { console.error(e); process.exit(1); });

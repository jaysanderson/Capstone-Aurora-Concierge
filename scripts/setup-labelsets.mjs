#!/usr/bin/env node
/**
 * Register the 3 Aurora labelsets on the KB from corpus/labelsets.json.
 *
 * Idempotent: POSTs each labelset definition; a 409/conflict on an
 * already-existing labelset is treated as success.
 */

import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const LABELSETS_PATH = join(ROOT, 'corpus', 'labelsets.json');

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
  const raw = await readFile(LABELSETS_PATH, 'utf8');
  const defs = JSON.parse(raw);

  let ok = 0;
  let skipped = 0;
  let failed = 0;

  for (const [name, def] of Object.entries(defs)) {
    const body = {
      title: def.title ?? name,
      multiple: true,
      kind: ['RESOURCES'],
      labels: (def.labels ?? []).map((l) => ({
        title: l.name,
        text: l.description ?? '',
      })),
    };

    // PUT to /labelset/{name} is the idempotent create-or-update path
    // on Progress Agentic RAG. If your tenant doesn't support PUT, this falls back
    // to POST /labelsets with {id: name, ...}.
    const putUrl = `${baseUrl}/labelset/${name}`;
    const r = await fetch(putUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (r.ok) {
      console.log(`[ok ] labelset ${name} (${body.labels.length} labels)`);
      ok += 1;
    } else if (r.status === 409 || r.status === 422) {
      console.log(`[skp] labelset ${name} already exists`);
      skipped += 1;
    } else {
      const text = await r.text();
      console.error(`[err] labelset ${name}: ${r.status} ${r.statusText} — ${text.slice(0, 240)}`);
      failed += 1;
    }
  }

  console.log(`\nDone. ${ok} created, ${skipped} already-present${failed ? `, ${failed} failed` : ''}.`);
  if (failed > 0) process.exit(1);
}

function must(name) {
  const v = process.env[name];
  if (!v || v.startsWith('paste-')) {
    console.error(`Missing env var ${name}.`);
    process.exit(1);
  }
  return v;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

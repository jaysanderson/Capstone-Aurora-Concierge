#!/usr/bin/env node
/**
 * Bulk-delete all resources from the configured KB.
 *
 * Lists every resource via /resources?size=500 and DELETEs each by id.
 * Used when starting over against an existing KB — particularly when
 * upstream processing is jammed and we want fresh resource IDs.
 */

import 'dotenv/config';

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

const listResp = await fetch(`${baseUrl}/resources?size=500`, { headers });
if (!listResp.ok) {
  console.error(`List failed: ${listResp.status} ${listResp.statusText}`);
  process.exit(1);
}
const list = await listResp.json();
const resources = list.resources ?? [];
console.log(`Found ${resources.length} resources to delete from ${env.apiUrl} (KB ${env.kbId}).`);

let ok = 0, fail = 0;
for (const r of resources) {
  const id = r.id ?? r.uuid;
  const slug = r.slug ?? '?';
  const del = await fetch(`${baseUrl}/resource/${id}`, { method: 'DELETE', headers });
  if (del.ok || del.status === 204) {
    console.log(`[ok ] ${slug}`);
    ok += 1;
  } else {
    console.error(`[err] ${slug}: ${del.status} ${del.statusText}`);
    fail += 1;
  }
}
console.log(`\nDeleted ${ok}/${resources.length}${fail ? `, ${fail} failed` : ''}.`);
if (fail > 0) process.exit(1);

function must(name) {
  const v = process.env[name];
  if (!v || v.startsWith('paste-')) {
    console.error(`Missing env var ${name}.`);
    process.exit(1);
  }
  return v;
}

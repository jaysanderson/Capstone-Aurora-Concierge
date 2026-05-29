#!/usr/bin/env node
/**
 * Smoke-test the active BYO-LLM endpoint on the Atlas KB.
 *
 * Hits POST /ask with a known query and confirms an answer comes back.
 * Run after switching the KB's configured BYO-LLM endpoint to verify
 * the provider credentials are wired correctly.
 */

import 'dotenv/config';

const env = {
  apiUrl: must('NUCLIA_API_URL'),
  kbId: must('NUCLIA_KB_ID'),
  apiKey: must('NUCLIA_API_KEY'),
};

const QUERY = process.argv.slice(2).join(' ') || 'Summarise the Atlas Incident Response Policy.';

const resp = await fetch(`${env.apiUrl}/kb/${env.kbId}/ask`, {
  method: 'POST',
  headers: {
    'X-NUCLIA-SERVICEACCOUNT': `Bearer ${env.apiKey}`,
    'Content-Type': 'application/json',
    'x-synchronous': 'true',
  },
  body: JSON.stringify({
    query: QUERY,
    prefer_markdown: true,
    rephrase: true,
    max_tokens: 240,
  }),
});

if (!resp.ok) {
  const text = await resp.text();
  console.error(`BYO-LLM smoke test failed: ${resp.status} ${resp.statusText}`);
  console.error(text.slice(0, 1000));
  process.exit(1);
}

const data = await resp.json();
const answer = data.answer ?? '';
const cites = data.retrieval_best_matches ?? [];
console.log('BYO-LLM smoke test — OK');
console.log(`Answer length: ${answer.length} chars`);
console.log(`Citations:     ${cites.length}`);
console.log('---');
console.log(answer.slice(0, 600));

function must(name) {
  const v = process.env[name];
  if (!v || v.startsWith('paste-')) {
    console.error(`Missing env var ${name}.`);
    process.exit(1);
  }
  return v;
}

#!/usr/bin/env node
/**
 * Verify the Aurora data-augmentation graph populated correctly.
 *
 * Targets per Aurora brief Section 12:
 *   - 150+ typed-entity nodes
 *   - 400+ typed relations
 */

import 'dotenv/config';

const args = parseArgs(process.argv.slice(2));
const DRY_RUN = !!args['dry-run'];

const env = {
  apiUrl: must('NUCLIA_API_URL'),
  kbId: must('NUCLIA_KB_ID'),
  apiKey: must('NUCLIA_API_KEY'),
};
const baseUrl = `${env.apiUrl}/kb/${env.kbId}`;

const QUERY = {
  query: {
    and: [
      { prop: 'path' },
      { prop: 'generated', by: 'data-augmentation' },
    ],
  },
  top_k: 1000,
};

const EXPECTED = ['PRODUCT', 'CATEGORY', 'ACTIVITY', 'DESTINATION', 'AMBASSADOR', 'CONTENT', 'CUSTOMER_SEGMENT', 'LOYALTY_TIER', 'BRAND_PILLAR', 'SIZING_PROFILE'];

if (DRY_RUN) {
  console.log('Aurora graph verification — dry-run');
  console.log(`POST ${baseUrl}/graph`);
  console.log(JSON.stringify(QUERY, null, 2));
  console.log('\nExpected groups:', EXPECTED.join(', '));
  console.log('Targets: ≥150 nodes, ≥400 relations.');
  process.exit(0);
}

const resp = await fetch(`${baseUrl}/graph`, {
  method: 'POST',
  headers: {
    'X-NUCLIA-SERVICEACCOUNT': `Bearer ${env.apiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(QUERY),
});

if (!resp.ok) {
  console.error(`${resp.status} ${resp.statusText} — ${(await resp.text()).slice(0, 240)}`);
  process.exit(1);
}

const paths = (await resp.json()).paths ?? [];
const nodes = new Set();
const relations = new Set();
const groups = new Map();
const relCounts = new Map();
for (const p of paths) {
  for (const side of ['source', 'destination']) {
    const n = p[side];
    if (!n) continue;
    nodes.add(`${n.group}::${n.value}`);
    groups.set(n.group, (groups.get(n.group) ?? 0) + 1);
  }
  relations.add(`${p.source.value}|${p.relation.label}|${p.destination.value}`);
  relCounts.set(p.relation.label, (relCounts.get(p.relation.label) ?? 0) + 1);
}

console.log('Aurora Graph Verification');
console.log('=========================');
console.log(`Paths returned:    ${paths.length}`);
console.log(`Unique nodes:      ${nodes.size}`);
console.log(`Unique relations:  ${relations.size}`);
console.log('\nNodes by group:');
for (const g of [...groups.keys()].sort()) console.log(`  ${g.padEnd(18)} ${groups.get(g)}`);
console.log('\nRelations by type:');
for (const r of [...relCounts.keys()].sort()) console.log(`  ${r.padEnd(18)} ${relCounts.get(r)}`);

console.log('\nTargets:');
report('  Nodes ≥ 150', nodes.size >= 150, nodes.size);
report('  Relations ≥ 400', relations.size >= 400, relations.size);
report('  Custom entity groups only', [...groups.keys()].every((g) => EXPECTED.includes(g.toUpperCase())));

function report(label, ok, value) {
  console.log(`${ok ? '✓' : '✗'} ${label}${value !== undefined ? ` (actual: ${value})` : ''}`);
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) if (argv[i].startsWith('--')) out[argv[i].slice(2)] = true;
  return out;
}

function must(name) {
  const v = process.env[name];
  if (!v || v.startsWith('paste-')) { console.error(`Missing env var ${name}.`); process.exit(1); }
  return v;
}

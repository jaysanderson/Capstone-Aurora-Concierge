#!/usr/bin/env node
/**
 * Test the graph-agent's extraction logic against a known passage.
 *
 * Sends a synthetic prompt to /predict/chat (Gemini 2.5 Flash Lite by
 * default) modelled on what the llm-graph task sends per-resource at
 * extraction time. Useful for:
 *
 *   - Confirming the LLM is reachable and credentialed correctly
 *   - Sanity-checking entity-type descriptions before re-registering
 *     the agent
 *   - Showing partners *why* few-shot examples matter (run with and
 *     without the EXAMPLES_BLOCK to see relation labels drift)
 *
 * Usage:
 *   node scripts/test-graph-agent.mjs                # default passage
 *   node scripts/test-graph-agent.mjs "your text..." # custom passage
 */

import 'dotenv/config';

const env = {
  apiUrl: must('NUCLIA_API_URL'),
  kbId: must('NUCLIA_KB_ID'),
  apiKey: must('NUCLIA_API_KEY'),
};

const DEFAULT_TEXT =
  'The Aurora TerraTrek 7 is a four-season hiking boot designed with alpine ' +
  'guide Mara Chen. It is recommended for Day Hiking and Thru-Hiking, suited ' +
  'to the Tasmania Overland Track, and pairs with the Aurora Skyline 45L pack. ' +
  'Wide Foot profile available. Embodies the Repairable for Life brand pillar.';

const ENTITY_TYPES = `PRODUCT, CATEGORY, ACTIVITY, DESTINATION, AMBASSADOR, CONTENT, CUSTOMER_SEGMENT, LOYALTY_TIER, BRAND_PILLAR, SIZING_PROFILE`;

const EXAMPLES_BLOCK = `
Example 1:
Text: "The Aurora Helios is the warmest down jacket. Mara Chen wore it across Patagonia."
Output: {"entities": [{"name": "Aurora Helios", "label": "PRODUCT"}, {"name": "Mara Chen", "label": "AMBASSADOR"}, {"name": "Patagonia W Trek", "label": "DESTINATION"}], "relations": [{"source": "Aurora Helios", "target": "Mara Chen", "label": "worn_by"}, {"source": "Aurora Helios", "target": "Patagonia W Trek", "label": "suited_to"}]}

Example 2:
Text: "The Aurora Crag XR is exclusive to Trail Club Plus members."
Output: {"entities": [{"name": "Aurora Crag XR", "label": "PRODUCT"}, {"name": "Trail Club Plus", "label": "LOYALTY_TIER"}], "relations": [{"source": "Aurora Crag XR", "target": "Trail Club Plus", "label": "exclusive_to"}]}

Example 3:
Text: "Alpine Climbing requires Climbing Harnesses."
Output: {"entities": [{"name": "Alpine Climbing", "label": "ACTIVITY"}, {"name": "Climbing Harnesses", "label": "CATEGORY"}], "relations": [{"source": "Alpine Climbing", "target": "Climbing Harnesses", "label": "requires"}]}

Canonical relation labels you MUST use (do NOT invent new ones):
recommended_for, suited_to, worn_by, fits, pairs_with, alternative_to,
featured_in, written_by, exclusive_to, embodies, prefers, requires.
`;

const TEXT = process.argv[2] || DEFAULT_TEXT;

const PROMPT =
  `You are an entity-and-relation extraction system for the Aurora Outfitters journey graph.\n\n` +
  `Entity types: ${ENTITY_TYPES}\n` +
  `${EXAMPLES_BLOCK}\n` +
  `Now extract entities and relations from this text. Return ONLY JSON with shape {"entities": [{"name", "label"}], "relations": [{"source", "target", "label"}]}.\n\n` +
  `Text: ${TEXT}`;

const resp = await fetch(`${env.apiUrl}/kb/${env.kbId}/predict/chat`, {
  method: 'POST',
  headers: {
    'X-NUCLIA-SERVICEACCOUNT': `Bearer ${env.apiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ question: PROMPT, query_context: [], user_id: 'test-graph-agent' }),
});

if (!resp.ok) {
  console.error(`Predict failed: ${resp.status} ${resp.statusText}`);
  console.error((await resp.text()).slice(0, 1000));
  process.exit(1);
}

const text = await resp.text();
console.log('==== raw LLM response ====');
console.log(text);
console.log();

// Try to parse JSON
const m = text.match(/\{[\s\S]*\}/);
if (!m) {
  console.log('(no JSON object found in response)');
  process.exit(0);
}

let parsed;
try { parsed = JSON.parse(m[0]); }
catch (e) { console.log('(JSON parse failed: ' + e.message + ')'); process.exit(0); }

const entities = parsed.entities ?? [];
const relations = parsed.relations ?? [];

console.log('==== parsed ====');
console.log(`entities: ${entities.length}`);
for (const e of entities) console.log(`  ${(e.name ?? '').padEnd(40)} → ${e.label}`);
console.log();
console.log(`relations: ${relations.length}`);
const CANONICAL = new Set(['recommended_for', 'suited_to', 'worn_by', 'fits', 'pairs_with', 'alternative_to', 'featured_in', 'written_by', 'exclusive_to', 'embodies', 'prefers', 'requires']);
let canonicalCount = 0, invented = [];
for (const r of relations) {
  const ok = CANONICAL.has(r.label);
  if (ok) canonicalCount += 1; else invented.push(r.label);
  console.log(`  ${(r.source ?? '').padEnd(30)} -[${r.label}${ok ? '' : ' ⚠ invented'}]-> ${r.target}`);
}
console.log();
console.log(`canonical relations: ${canonicalCount}/${relations.length}`);
if (invented.length) console.log(`invented (not in 12): ${invented.join(', ')}`);

function must(name) {
  const v = process.env[name];
  if (!v || v.startsWith('paste-')) { console.error(`Missing env var ${name}.`); process.exit(1); }
  return v;
}

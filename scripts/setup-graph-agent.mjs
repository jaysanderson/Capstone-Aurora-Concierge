#!/usr/bin/env node
/**
 * Register the Aurora journey-graph ingestion task on the KB.
 *
 * POSTs to /kb/{id}/tasks/start with task `llm-graph` configured with
 * 10 Aurora entity types. Relations are extracted automatically by the
 * task's LLM — Nuclia's llm-graph task discovers relations from text,
 * constrained by the entity types we provide.
 *
 * After registration, Nuclia processes the existing corpus + any new
 * resources through this task automatically. Wall-time: ~1-2 min per
 * resource for ~30-60 min over the full 37-doc corpus.
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

const ENTITY_DEFS = [
  { label: 'PRODUCT', description: 'An Aurora Outfitters product. Always prefixed "Aurora": Aurora TerraTrek 7, Aurora Skyline 45L, Aurora Helios, Aurora Cumulus 2P, Aurora Quill 850, Aurora Crag XR, Aurora Stratus 1P.' },
  { label: 'CATEGORY', description: 'A product category: Hiking Boots, Multi-Day Packs, Down Insulation, Tents, Sleeping Quilts, Climbing Harnesses.' },
  { label: 'ACTIVITY', description: 'An outdoor activity: Day Hiking, Thru-Hiking, Alpine Climbing, Bikepacking, Multi-Pitch Sport.' },
  { label: 'DESTINATION', description: 'A trail / destination: Tasmania Overland Track, Patagonia W Trek, Tour du Mont Blanc, Annapurna Circuit, Yosemite High Sierra, Laugavegur, Te Araroa.' },
  { label: 'AMBASSADOR', description: 'An Aurora Outfitters ambassador: Mara Chen, Jonah Reyes, Dr Anya Patel, Theo Sundberg.' },
  { label: 'CONTENT', description: 'A piece of content — trail guide, blog post, video, podcast, or gear review.' },
  { label: 'CUSTOMER_SEGMENT', description: 'A customer segment: Weekend Adventurer, Thru-Hiker, Alpine Pro.' },
  { label: 'LOYALTY_TIER', description: 'A Trail Club tier: Trail Club Standard, Trail Club Plus, Trail Club Pro.' },
  { label: 'BRAND_PILLAR', description: 'One of the four Aurora brand pillars: Built for the Worst Weather, Trail-Tested by Experts, Repairable for Life, Carbon-Negative by 2030.' },
  { label: 'SIZING_PROFILE', description: 'A sizing profile: Standard, Wide Foot, Narrow Foot, High Arch.' },
];

// `operations` uses a tagged-union: each entry is an object where the
// operation type is the key. Set `graph` for graph extraction; leave the
// rest null. Confirmed by inspecting an existing config in the API.
const TASK_BODY = {
  name: 'aurora-journey-graph',
  on: 1, // ApplyTo.FIELD — llm-graph only supports field-level extraction
  operations: [
    {
      graph: {
        ident: 'aurora-journey-graph',
        entity_defs: ENTITY_DEFS,
      },
    },
  ],
  llm: {}, // use KB's default generative model (Gemini 2.5 Flash Lite by default)
};

async function main() {
  console.log(`Registering llm-graph task on ${env.apiUrl}/kb/${env.kbId}`);
  console.log(`  Entity types: ${ENTITY_DEFS.length}`);
  console.log(`  Task ident:   aurora-journey-graph`);

  const resp = await fetch(`${baseUrl}/task/start`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ name: 'llm-graph', parameters: TASK_BODY }),
  });

  const text = await resp.text();
  if (resp.ok) {
    console.log(`[ok ] ${resp.status} ${resp.statusText}`);
    console.log(text.slice(0, 800));
    return;
  }
  console.error(`[err] ${resp.status} ${resp.statusText}\n${text.slice(0, 800)}`);
  process.exit(1);
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

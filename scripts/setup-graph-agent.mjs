#!/usr/bin/env node
/**
 * Register the Aurora journey-graph ingestion task on the KB.
 *
 * POSTs to /kb/{id}/tasks/start with task `llm-graph` configured with
 * 10 Aurora entity types. Relations are extracted automatically by the
 * task's LLM — Progress Agentic RAG's llm-graph task discovers relations from text,
 * constrained by the entity types we provide.
 *
 * After registration, Progress Agentic RAG processes the existing corpus + any new
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

// Few-shot examples — these are CRUCIAL. Without them the LLM has nothing
// to anchor on for relation labels (the schema has no relation_defs field;
// relations are entirely discovered, so examples are the only way to
// constrain what kinds of relations get emitted). Each example must use
// `name` + `label` per EntityExample, and `source` + `target` + `label`
// per RelationExample. Texts are lifted verbatim from real Aurora corpus
// docs so the LLM learns the actual prose patterns.
const EXAMPLES = [
  {
    text:
      'The Aurora TerraTrek 7 is Aurora Outfitters’ flagship four-season hiking boot. Designed with alpine guide Mara Chen across three field seasons in Tasmania, Patagonia, and the Tour du Mont Blanc. Recommended for Day Hiking and Thru-Hiking. Pairs with the Aurora Skyline 45L pack. Wide Foot profile available. Embodies Aurora’s Repairable for Life brand pillar.',
    entities: [
      { name: 'Aurora TerraTrek 7', label: 'PRODUCT' },
      { name: 'Mara Chen', label: 'AMBASSADOR' },
      { name: 'Tasmania Overland Track', label: 'DESTINATION' },
      { name: 'Patagonia W Trek', label: 'DESTINATION' },
      { name: 'Tour du Mont Blanc', label: 'DESTINATION' },
      { name: 'Day Hiking', label: 'ACTIVITY' },
      { name: 'Thru-Hiking', label: 'ACTIVITY' },
      { name: 'Aurora Skyline 45L', label: 'PRODUCT' },
      { name: 'Hiking Boots', label: 'CATEGORY' },
      { name: 'Wide Foot', label: 'SIZING_PROFILE' },
      { name: 'Repairable for Life', label: 'BRAND_PILLAR' },
    ],
    relations: [
      { source: 'Aurora TerraTrek 7', target: 'Mara Chen', label: 'worn_by' },
      { source: 'Aurora TerraTrek 7', target: 'Tasmania Overland Track', label: 'suited_to' },
      { source: 'Aurora TerraTrek 7', target: 'Patagonia W Trek', label: 'suited_to' },
      { source: 'Aurora TerraTrek 7', target: 'Day Hiking', label: 'recommended_for' },
      { source: 'Aurora TerraTrek 7', target: 'Thru-Hiking', label: 'recommended_for' },
      { source: 'Aurora TerraTrek 7', target: 'Aurora Skyline 45L', label: 'pairs_with' },
      { source: 'Aurora TerraTrek 7', target: 'Wide Foot', label: 'fits' },
      { source: 'Aurora TerraTrek 7', target: 'Repairable for Life', label: 'embodies' },
    ],
  },
  {
    text:
      'The Aurora Helios is the warmest down jacket Aurora makes. Mara Chen wore it across her Patagonia season. Reviewed in the gear-review piece "Aurora Helios Temperature Rating Analysis" written by Mara Chen.',
    entities: [
      { name: 'Aurora Helios', label: 'PRODUCT' },
      { name: 'Mara Chen', label: 'AMBASSADOR' },
      { name: 'Patagonia W Trek', label: 'DESTINATION' },
      { name: 'Aurora Helios Temperature Rating Analysis', label: 'CONTENT' },
      { name: 'Down Insulation', label: 'CATEGORY' },
    ],
    relations: [
      { source: 'Aurora Helios', target: 'Mara Chen', label: 'worn_by' },
      { source: 'Aurora Helios', target: 'Patagonia W Trek', label: 'suited_to' },
      { source: 'Aurora Helios', target: 'Aurora Helios Temperature Rating Analysis', label: 'featured_in' },
      { source: 'Aurora Helios Temperature Rating Analysis', target: 'Mara Chen', label: 'written_by' },
    ],
  },
  {
    text:
      'The Aurora Crag XR is Aurora’s technical climbing harness, exclusive to Trail Club Plus members. Theo Sundberg uses the Crag XR on every alpine course he teaches in Chamonix. Recommended for Multi-Pitch Sport and Alpine Climbing.',
    entities: [
      { name: 'Aurora Crag XR', label: 'PRODUCT' },
      { name: 'Trail Club Plus', label: 'LOYALTY_TIER' },
      { name: 'Theo Sundberg', label: 'AMBASSADOR' },
      { name: 'Multi-Pitch Sport', label: 'ACTIVITY' },
      { name: 'Alpine Climbing', label: 'ACTIVITY' },
      { name: 'Climbing Harnesses', label: 'CATEGORY' },
    ],
    relations: [
      { source: 'Aurora Crag XR', target: 'Trail Club Plus', label: 'exclusive_to' },
      { source: 'Aurora Crag XR', target: 'Theo Sundberg', label: 'worn_by' },
      { source: 'Aurora Crag XR', target: 'Multi-Pitch Sport', label: 'recommended_for' },
      { source: 'Aurora Crag XR', target: 'Alpine Climbing', label: 'recommended_for' },
    ],
  },
  {
    text:
      'The Tasmania Overland Track is a six-day alpine traverse. Thru-Hikers prefer Multi-Day Packs over single-day daypacks for this trail. Alpine Climbing requires Climbing Harnesses. Day Hiking can be done with just Hiking Boots.',
    entities: [
      { name: 'Tasmania Overland Track', label: 'DESTINATION' },
      { name: 'Thru-Hiker', label: 'CUSTOMER_SEGMENT' },
      { name: 'Multi-Day Packs', label: 'CATEGORY' },
      { name: 'Alpine Climbing', label: 'ACTIVITY' },
      { name: 'Climbing Harnesses', label: 'CATEGORY' },
      { name: 'Day Hiking', label: 'ACTIVITY' },
      { name: 'Hiking Boots', label: 'CATEGORY' },
    ],
    relations: [
      { source: 'Thru-Hiker', target: 'Multi-Day Packs', label: 'prefers' },
      { source: 'Alpine Climbing', target: 'Climbing Harnesses', label: 'requires' },
      { source: 'Day Hiking', target: 'Hiking Boots', label: 'requires' },
    ],
  },
  {
    text:
      'The Aurora Quill 850 is a lighter alternative to the Aurora Skyline 45L’s integrated quilt option. It embodies our Trail-Tested by Experts brand pillar — Jonah Reyes carried Quill 850 prototypes across the Triple Crown.',
    entities: [
      { name: 'Aurora Quill 850', label: 'PRODUCT' },
      { name: 'Aurora Skyline 45L', label: 'PRODUCT' },
      { name: 'Trail-Tested by Experts', label: 'BRAND_PILLAR' },
      { name: 'Jonah Reyes', label: 'AMBASSADOR' },
      { name: 'Sleeping Quilts', label: 'CATEGORY' },
    ],
    relations: [
      { source: 'Aurora Quill 850', target: 'Aurora Skyline 45L', label: 'alternative_to' },
      { source: 'Aurora Quill 850', target: 'Trail-Tested by Experts', label: 'embodies' },
      { source: 'Aurora Quill 850', target: 'Jonah Reyes', label: 'worn_by' },
    ],
  },
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
        examples: EXAMPLES,
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

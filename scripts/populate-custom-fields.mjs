#!/usr/bin/env node
/**
 * Aurora — populate field-engineered custom fields on hero resources.
 *
 * Adds `callToAction` (string) and `searchResultDisplay` (JSON object)
 * to each hero product. Adds `videoInfo` to ambassador content (when
 * applicable).
 *
 * Run AFTER `npm run seed` has ingested the corpus.
 *
 * Usage:
 *   node scripts/populate-custom-fields.mjs           # apply
 *   node scripts/populate-custom-fields.mjs --dry-run # list what WOULD be applied
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
const headers = {
  'X-NUCLIA-SERVICEACCOUNT': `Bearer ${env.apiKey}`,
  'Content-Type': 'application/json',
};

const HERO_PRODUCTS = [
  {
    slug: 'product-terratrek-7',
    callToAction: 'Try the Aurora TerraTrek 7 risk-free for 90 days → https://aurora.example/p/terratrek-7',
    searchResultDisplay: {
      title: 'Aurora TerraTrek 7 — Day & Thru-Hike Boot',
      description: "Mara Chen's vetted all-terrain boot. 200 km waterproof, 3-day break-in, Wide Foot option.",
      ctaLabel: 'Try risk-free',
    },
  },
  {
    slug: 'product-skyline-45l',
    callToAction: 'Spec your Aurora Skyline 45L for your next thru-hike → https://aurora.example/p/skyline-45l',
    searchResultDisplay: {
      title: 'Aurora Skyline 45L — Multi-Day Trekking Pack',
      description: 'Jonah Reyes\' Triple Crown pack. 920 g, V-shape hip belt, fits standard bear canisters horizontally.',
      ctaLabel: 'Pack the Skyline',
    },
  },
  {
    slug: 'product-helios-jacket',
    callToAction: 'Get the Aurora Helios in time for winter → https://aurora.example/p/helios',
    searchResultDisplay: {
      title: 'Aurora Helios — 850-Fill Down Jacket',
      description: '850-fill RDS down, 10D shell, 380 g. Mara Chen\'s Patagonia pick. Bombproof inside a hardshell.',
      ctaLabel: 'Stay warm',
    },
  },
  {
    slug: 'product-cumulus-2p-tent',
    callToAction: 'Pitch the Aurora Cumulus 2P this weekend → https://aurora.example/p/cumulus-2p',
    searchResultDisplay: {
      title: 'Aurora Cumulus 2P — Two-Person Backpacking Tent',
      description: 'DAC Featherlite poles, 1.2 kg packed, 50 km/h wind tested by Theo Sundberg in the Pyrenees.',
      ctaLabel: 'Pitch the Cumulus',
    },
  },
  {
    slug: 'product-quill-850-quilt',
    callToAction: 'Sleep warmer with the Aurora Quill 850 → https://aurora.example/p/quill-850',
    searchResultDisplay: {
      title: 'Aurora Quill 850 — Ultralight Down Quilt',
      description: '850-fill responsibly sourced down, -3 °C comfort, 540 g. Replaces a mummy bag for warm sleepers.',
      ctaLabel: 'Sleep warmer',
    },
  },
  {
    slug: 'product-crag-xr-harness',
    callToAction: 'Climb with the Aurora Crag XR (Trail Club Plus exclusive) → https://aurora.example/p/crag-xr',
    searchResultDisplay: {
      title: 'Aurora Crag XR — Technical Climbing Harness',
      description: 'Theo Sundberg\'s Chamonix daily-driver. Trail Club Plus exclusive. 380 g, 4 gear loops, drop-seat.',
      ctaLabel: 'Climb with the Crag XR',
    },
  },
];

const AMBASSADOR_VIDEOS = [
  {
    slug: 'ambassador_video-mara-chen',
    videoInfo: {
      speakers: ['Mara Chen'],
      topics: ['alpine guiding', 'Patagonia', 'Tasmania Overland', 'TerraTrek 7', 'Helios', 'Quill 850'],
      key_points: [
        'Engineering-led product collaboration.',
        '47 Tasmania Overland Track guides.',
        'Helios prototype thermal-test data.',
      ],
      cta_url: 'https://aurora.example/ambassadors/mara-chen',
    },
  },
  {
    slug: 'ambassador_video-jonah-reyes',
    videoInfo: {
      speakers: ['Jonah Reyes'],
      topics: ['Triple Crown', 'thru-hiking', 'Skyline 45L', 'Quill 850'],
      key_points: [
        '4,800+ miles in Skyline 45L prototypes.',
        'Reference cycle Q4 2024 vs production.',
        'Gear philosophy: must survive 1,000 miles continuous.',
      ],
      cta_url: 'https://aurora.example/ambassadors/jonah-reyes',
    },
  },
  {
    slug: 'ambassador_video-theo-sundberg',
    videoInfo: {
      speakers: ['Theo Sundberg'],
      topics: ['alpine climbing', 'Chamonix', 'Cumulus 2P', 'Crag XR'],
      key_points: [
        'UIAGM-certified guide, 22 years.',
        'Cumulus 2P prototype 50 km/h wind tests.',
        'Crag XR field-serviceability drove the design.',
      ],
      cta_url: 'https://aurora.example/ambassadors/theo-sundberg',
    },
  },
];

async function patchResource(slug, fields) {
  // Look up by slug
  const lookup = await fetch(`${baseUrl}/slug/${slug}`, { headers });
  if (!lookup.ok) throw new Error(`Lookup ${slug}: ${lookup.status} ${lookup.statusText}`);
  const lookupBody = await lookup.json();
  const id = lookupBody?.id ?? lookupBody?.uuid ?? lookupBody?.rid;
  if (!id) throw new Error(`No resource id for slug ${slug}`);

  // PATCH data.texts.<fieldname>.body — Nuclia's user-metadata schema
  // doesn't have a `custom` field; arbitrary JSON or strings live as
  // separate text fields on the resource. The app's ragClient.ts looks
  // these up via the data.texts[name].body fallback path.
  const texts = {};
  for (const [k, v] of Object.entries(fields)) {
    texts[k] = {
      body: typeof v === 'string' ? v : JSON.stringify(v),
      format: 'PLAIN',
    };
  }
  const r = await fetch(`${baseUrl}/resource/${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ texts }),
  });
  if (!r.ok) throw new Error(`PATCH ${slug}: ${r.status} ${r.statusText} — ${(await r.text()).slice(0, 240)}`);
}

async function main() {
  if (DRY_RUN) console.log('[dry-run]');
  let ok = 0, fail = 0;

  for (const p of HERO_PRODUCTS) {
    const fields = { callToAction: p.callToAction, searchResultDisplay: p.searchResultDisplay };
    if (DRY_RUN) {
      console.log(`[dry] PATCH /resource/slug/${p.slug} ← ${Object.keys(fields).join(', ')}`);
      ok += 1; continue;
    }
    try { await patchResource(p.slug, fields); console.log(`[ok ] ${p.slug} callToAction + searchResultDisplay`); ok += 1; }
    catch (e) { console.error(`[err] ${p.slug} → ${e.message}`); fail += 1; }
  }

  for (const v of AMBASSADOR_VIDEOS) {
    const fields = { videoInfo: v.videoInfo };
    if (DRY_RUN) { console.log(`[dry] PATCH /resource/slug/${v.slug} ← videoInfo`); ok += 1; continue; }
    try { await patchResource(v.slug, fields); console.log(`[ok ] ${v.slug} videoInfo`); ok += 1; }
    catch (e) { console.error(`[err] ${v.slug} → ${e.message}`); fail += 1; }
  }

  console.log(`\nDone. ${ok} ok${fail ? `, ${fail} failed` : ''}.`);
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
  if (!v || v.startsWith('paste-')) { console.error(`Missing env var ${name}.`); process.exit(1); }
  return v;
}

main().catch((e) => { console.error(e); process.exit(1); });

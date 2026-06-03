# Aurora Concierge Corpus

> Everything you need to provision a Knowledge Box so the [Capstone-Aurora-Concierge](../) reference app works.
>
> **TL;DR:** create a Knowledge Box → in the dashboard, use **Upload folder** with the **"use folder names as label names"** option on `corpus/content_type/` → PATCH custom fields (`callToAction`, `searchResultDisplay`, `videoInfo`) onto hero resources → register the journey-graph extraction agent → run the app.

The app at `https://capstone-aurora-concierge.fly.dev/` (or your local `npm run dev`) reads from one Knowledge Box. This guide tells you how to seed it.

---

## Step 1 · Provision the Knowledge Box

| Setting | Value |
|---|---|
| KB name | `kb-aurora-concierge` (any name; the app reads the UUID) |
| Region | Whichever region is closest to you geographically. The reference build uses EU; use the same region for everything you provision in the course. |
| Visibility | Private |

Copy the three values into `.env`:

```bash
cp .env.example .env
# Edit .env, fill in VITE_NUCLIA_API_URL, VITE_NUCLIA_KB_ID, VITE_NUCLIA_API_KEY
```

Also worth setting:

- `VITE_LANGUAGES` — comma-separated language list for the multilingual switcher. Default: `English,Spanish,French,German,Japanese,Mandarin`.

---

## Step 2 · Upload the corpus folder (no scripts)

The corpus ships pre-organised by content type. Each subfolder name under `corpus/content_type/` will become a label on the `content_type` labelset when you upload with Nuclia's folder-as-labels feature.

```
corpus/
└── content_type/
    ├── ambassador_video/  (5 docs)
    ├── brand_story/       (4 docs)
    ├── gear_review/       (6 docs)
    ├── loyalty_benefit/   (4 docs)
    ├── product/           (7 docs)
    ├── support/           (4 docs)
    └── trail_guide/       (7 docs)
```

In the Nuclia dashboard:

1. Open your Knowledge Box → **Resources** → **Upload** → **Upload folder** (exact wording varies; look for an "Upload folder" option, not the single-file uploader).
2. Pick the **`corpus/content_type/`** folder on your machine.
3. Enable the **"Use folder names as label names"** option (the exact label varies by tenant; look for a checkbox or toggle that says "folder names as labels" or "auto-label from folders"). With that enabled, Nuclia takes the parent folder name (`content_type`) as the labelset name and the subfolder names (`product`, `trail_guide`, etc.) as the label values applied to every document inside.
4. Confirm and start the upload. Nuclia processes all 37 documents.
5. Wait for ingest to complete. The dashboard's progress indicator shows resource count climbing.

That's it — for the storefront, concierge, and journey-graph surfaces. No scripts, no env vars, no terminal commands.

### What the app does with the `content_type` labelset

The reference app filters by `content_type` in several places: the `/storefront` chip filter, the `/journey-graph` colour palette, the concierge's product recommendations. Once the labelset is applied, the chip filter narrows results, the storefront cards group cleanly, and the concierge can scope to specific content types when asked.

### Important · for the full `/for-you` persona-flow demo, you also need `audience` and `region`

The `/for-you` page filters by `audience` and `region` in addition to `content_type` — Sara (Prospect, NORAM) sees a different set of cards from Mara (Trail Club Pro, EMEA). For that surface to filter correctly, the corpus needs two more labelsets applied.

With drag-drop alone (one labelset), `/for-you` still renders but surfaces broader results without the per-persona scoping. The storefront and concierge work fully.

To get the full persona-flow demo, you have two options:

**Option A · Add the extra labelsets in the dashboard after drag-drop**

1. Open the dashboard's labelset editor (**KB → Labelsets**).
2. Create two new labelsets: `audience` (labels: `shopper`, `trail_club_standard`, `trail_club_plus`, `trail_club_pro`, `internal`) and `region` (labels: `noram`, `emea`, `apac`, `anz`).
3. For each resource, the audience and region values are in its YAML frontmatter — the dashboard's bulk-edit or per-resource label editor applies them. Tedious for 37 docs but doable.

**Option B · Run the optional seed script (recommended for partners scaling beyond the bundled docs anyway)**

```bash
npm run seed -- --dry-run   # preview
npm run seed                # apply
```

The script reads frontmatter and PATCHes all three labelsets onto each resource via the Nuclia API. Run it after the drag-drop ingest (it's idempotent — re-runs are safe).

### Optional · Programmatic ingest via seed script

For partners scaling beyond the bundled 37 docs (e.g. after running `progress-kb-use-case-generator` to produce a larger corpus) or who skipped the drag-drop entirely, `scripts/seed-kb.mjs` POSTs documents directly to the Nuclia API with full classification metadata read from frontmatter. See `npm run seed -- --help`.

---

## Step 3 · Populate field-engineered custom fields (CRITICAL)

This is the step that makes Aurora *Aurora*. Without it, the storefront's CTA pills are blank and `/for-you` cards are missing their headlines.

```bash
npm run populate:fields -- --dry-run
npm run populate:fields
```

The script PATCHes `usermetadata.custom` on specific slugs. Exact payloads are in [`../scripts/populate-custom-fields.mjs`](../scripts/populate-custom-fields.mjs). Quick reference:

### Hero products (6) get `callToAction` + `searchResultDisplay`

| Slug | callToAction (short) | searchResultDisplay title |
|---|---|---|
| `terratrek-7` | "Try the Aurora TerraTrek 7 risk-free for 90 days →" | "Aurora TerraTrek 7 — Day & Thru-Hike Boot" |
| `skyline-45l` | "Spec your Aurora Skyline 45L for your next thru-hike →" | "Aurora Skyline 45L — Multi-Day Trekking Pack" |
| `helios-jacket` | "Get the Aurora Helios in time for winter →" | "Aurora Helios — 850-Fill Down Jacket" |
| `cumulus-2p-tent` | "Pitch the Aurora Cumulus 2P this weekend →" | "Aurora Cumulus 2P — Two-Person Backpacking Tent" |
| `quill-850-quilt` | "Sleep warmer with the Aurora Quill 850 →" | "Aurora Quill 850 — Ultralight Down Quilt" |
| `crag-xr-harness` | "Climb with the Aurora Crag XR (Trail Club Plus exclusive) →" | "Aurora Crag XR — Technical Climbing Harness" |

### Ambassador videos (3) get `videoInfo`

| Slug | speakers | topics |
|---|---|---|
| `mara-chen` | Mara Chen | alpine guiding, Patagonia, Tasmania Overland, TerraTrek 7, Helios, Quill 850 |
| `jonah-reyes` | Jonah Reyes | Triple Crown, thru-hiking, Skyline 45L, Quill 850 |
| `theo-sundberg` | Theo Sundberg | alpine climbing, Chamonix, Cumulus 2P, Crag XR |

> **App expectation:** the `StorefrontCard` component reads `searchResultDisplay` to render the brand-team-edited title/description/ctaLabel instead of the raw `title`. The `FloatingChat`'s shopper-voice prompt extracts `callToAction` from the most-relevant resource. If you skip this step, the store works but feels flat.

---

## Step 4 · Configure the journey-graph extraction agent

Schema in [`../scripts/graph-agent.py`](../scripts/graph-agent.py).

```bash
python ../scripts/graph-agent.py --print > /tmp/aurora-graph.json
# Paste into dashboard → KB → Augmentation → Graph
# OR
python ../scripts/graph-agent.py --apply   # Manager-tier
```

### Entity types (10)

`PRODUCT`, `CATEGORY`, `ACTIVITY`, `DESTINATION`, `AMBASSADOR`, `CONTENT`, `CUSTOMER_SEGMENT`, `LOYALTY_TIER`, `BRAND_PILLAR`, `SIZING_PROFILE`.

> **App expectation:** `/journey-graph` seeds from `PRODUCT`. `/abandoned-cart` seeds from `Aurora TerraTrek 7` (PRODUCT) and `Mara Chen` (AMBASSADOR). The colour palette in `src/styles/tokens.ts` is keyed on these group names.

### Relation types (12)

`recommended_for`, `suited_to`, `worn_by`, `fits`, `pairs_with`, `alternative_to`, `featured_in`, `written_by`, `exclusive_to`, `embodies`, `prefers`, `requires`.

> **App expectation:** the `/abandoned-cart` composite-RAG flow traverses `pairs_with` and `featured_in` specifically.

### Verify

```bash
npm run verify:graph -- --dry-run
npm run verify:graph
```

Brief targets: **≥150 nodes, ≥400 relations.** A bundled 37-doc corpus typically produces ~50-75 nodes / ~120-180 relations — solid for demo. To reach the target volumes, scale to 200+ docs via `progress-kb-use-case-generator`.

---

## Step 5 · App-side expectations per route

| Route | What it expects | Empty-KB behaviour |
|---|---|---|
| `/` (landing) | Env-driven badges only | Always renders |
| `/storefront` | `/find` with `content_type` chip filter; reads `searchResultDisplay` + `callToAction` on cards | "No matches" cards |
| `/for-you` | 5 `/find` queries composing audience + content_type + (sometimes) region filters from active persona | Empty-state per section |
| `/concierge` | Persona toggle + language switcher control the floating chat | Concierge usable but no recommendations |
| `/personalize` | Three `askForJson` workflows (Adventure Plan, Loyalty, Cross-Sell) | Schema errors |
| `/journey-graph` | Seeds from `PRODUCT`; expands via `queryPaths` | "Graph empty" placeholder |
| `/abandoned-cart` | Composite-RAG seeded by Sara's fixture (no KB read for the fixture) | Steps 1-4 still attempt but partial |

### The persona-driven `/for-you` flows (require audience + region labelsets)

When **Sara (prospect, Weekend Adventurer, NORAM)** is active:
- `audience` filter = `shopper`.
- Activity term = "day hiking weekend overnighter".
- Region filter = `noram`.
- Loyalty section shows a single Trail Club join CTA card.

When **Mara (Trail Club Pro, Alpine Pro, EMEA)** is active:
- `audience` filter is dropped (member sees all).
- Activity term = "alpine climbing multi-pitch".
- Region filter = `emea`.
- Loyalty section shows Trail Club Pro perks (ambassador day bookings, etc.).

These flows degrade gracefully if `audience`/`region` aren't applied — `/for-you` still renders, just without per-persona scoping. See Step 2 for how to add those labelsets.

---

## Step 6 · Verification

```bash
npm run verify:graph
npm run dev
```

### The 6 routes worth eyeballing

1. `/storefront` — search "boot for Patagonia W Trek" → top result should be Aurora TerraTrek 7 product card with the rendered `searchResultDisplay` title + CTA pill.
2. `/for-you` (Sara) — should show Aurora TerraTrek 7 and Aurora Skyline 45L in *Picks for your activity*; Patagonia / Yosemite guides in *Inspiration*. (Requires audience+region applied; see Step 2.)
3. `/for-you` (Mara) — exclusive perks appear in the loyalty section; ambassador day bookings + 2028 events surface.
4. `/concierge` — toggle Sara → Mara and ask "What jacket do I need?" — the chat clears, reissues, and produces a longer detailed answer in Mara mode.
5. `/personalize` — Adventure Plan with Tasmania + 6 nights + Weekend Adventurer should return populated `packing_list` referencing Aurora hero products.
6. `/abandoned-cart` — pipeline should produce a structured winback message referencing Sara, TerraTrek 7, Mara Chen.

---

## Step 7 · Production deploy

```bash
fly secrets set \
  VITE_NUCLIA_API_URL="..." \
  VITE_NUCLIA_KB_ID="..." \
  VITE_NUCLIA_API_KEY="..."

fly deploy --ha=false \
  --build-arg VITE_NUCLIA_API_URL="$NUCLIA_API_URL" \
  --build-arg VITE_NUCLIA_KB_ID="$NUCLIA_KB_ID" \
  --build-arg VITE_NUCLIA_API_KEY="$NUCLIA_API_KEY"
```

---

## Common gotchas

| Symptom | Likely cause |
|---|---|
| `/storefront` cards render raw titles without descriptions | Step 3 (`npm run populate:fields`) skipped |
| `/for-you` "Member perks" section empty for Mara | `audience` labelset not applied — see Step 2 Option B |
| `/for-you` "Inspiration" empty | Region labelset not applied — see Step 2 Option B |
| `/journey-graph` shows DATE / MONEY nodes | NER blocklist not active — confirm the data-augmentation filter is configured correctly in the graph agent |
| `/abandoned-cart` pipeline times out | Graph extraction not complete — wait for the agent to finish, then re-test |
| `/concierge` shopper voice doesn't end in a CTA pill | The most-relevant resource lacks `callToAction` — verify in the dashboard's resource detail |

---

## See also

- `../KB_SETUP.md` — one-page checklist version of this guide.
- `../DEMO.md` — 25-minute demo script.
- `../RESKIN.md` — how to swap Aurora for a customer's brand.
- [`anchors.json`](./anchors.json) — the locked entity reference.
- [`labelsets.json`](./labelsets.json) — machine-readable label schema (one labelset: `content_type`).
- [`../scripts/populate-custom-fields.mjs`](../scripts/populate-custom-fields.mjs) — exact field-engineering payloads.

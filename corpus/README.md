# Aurora Concierge Corpus · Knowledge Base Configuration Guide

> Everything you need to provision an ARAG knowledge base so it works correctly with the **[Capstone-Aurora-Concierge](../)** reference application.
>
> **TL;DR:** create one KB → configure 3 labelsets → ingest these 36 markdown docs → PATCH custom fields (`callToAction`, `searchResultDisplay`, `videoInfo`) onto hero resources → register the journey-graph extraction agent → run the app.

The app at `https://capstone-aurora-concierge.fly.dev/` (or your local `npm run dev`) expects a KB shaped exactly the way this folder describes. If you skip the field-engineering step in particular, the `/storefront`, `/for-you`, and `/concierge` surfaces lose their explainable-personalization payoff.

---

## Step 1 · Provision the Knowledge Box

| Setting | Value |
|---|---|
| KB name | `kb-aurora-concierge` (any name; the app reads the UUID) |
| Region | **EU** (recommended; flip `VITE_AURORA_REGION` for US) |
| Default generative model | Any — override via BYO-LLM in Step 4 |
| Visibility | Private |

Copy the three values into `.env`:

```bash
cp .env.example .env
$EDITOR .env   # fill in VITE_NUCLIA_API_URL, VITE_NUCLIA_KB_ID, VITE_NUCLIA_API_KEY
```

Also worth setting:

- `VITE_LANGUAGES` — comma-separated language list for the multilingual switcher. Default: `English,Spanish,French,German,Japanese,Mandarin`.
- `VITE_AURORA_REGION` — `EU` or `US`. Drives the residency badge.

---

## Step 2 · Configure the 3 labelsets

Full machine-readable schema in [`labelsets.json`](./labelsets.json). Mirror in the dashboard under **KB → Labelsets**:

### Labelset 1: `content_type`

| Label | Description | Used by |
|---|---|---|
| `product` | Product pages. | `/storefront` chip + `/for-you` "Picks for your activity" |
| `trail_guide` | Trail-guide content. | `/storefront` chip + `/for-you` inspiration |
| `gear_review` | Gear-review content. | `/storefront` chip + journey graph |
| `ambassador_video` | Ambassador profiles / videos / podcasts. | `/for-you` "From your ambassadors" |
| `loyalty_benefit` | Loyalty / Trail Club content. | `/for-you` member perks (gated by audience) |
| `brand_story` | Brand pillars + sustainability. | `/for-you` brand stories |
| `support` | Returns, sizing, shipping, altitude advice. | not chip-filtered; surfaces via search/concierge |

### Labelset 2: `audience`

| Label | Description | Used by |
|---|---|---|
| `shopper` | Default — anonymous shopper. | `/for-you` for prospects (filters in this) |
| `trail_club_standard` | Trail Club Standard members. | (optional filter for member-onboarding content) |
| `trail_club_plus` | Trail Club Plus members and above. | `/for-you` for members |
| `trail_club_pro` | Trail Club Pro members. | exclusive content (e.g., Crag XR) |
| `internal` | Internal staff. | not surfaced in the public app |

> **App expectation:** the persona switcher (Sara prospect / Mara Trail Club Pro) toggles which `audience` labels are visible. Prospects only see `shopper`; members see everything except `internal`.

### Labelset 3: `region`

| Label | Description |
|---|---|
| `noram` | North America |
| `emea` | Europe, Middle East, Africa |
| `apac` | Asia-Pacific (ex-ANZ) |
| `anz` | Australia + New Zealand |

> The `/for-you` page composes a region filter into its `/find` queries from the active persona's `region`. Sara is `noram`; Mara is `emea`.

---

## Step 3 · (Optional) Configure BYO-LLM

Same three providers as Atlas: Azure OpenAI / Google Vertex / AWS Bedrock. Configure in **KB → Settings → Generative model**.

Smoke-test:
```bash
npm run verify:byo-llm
```

The brief's §12 requires **2 of 3** working.

---

## Step 4 · Ingest the corpus

```bash
npm run seed -- --dry-run   # preview
npm run seed                # apply
```

The seeder walks `corpus/content_type/<ct>/*.md`. For each file:

1. Parses YAML frontmatter (`content_type`, `audience`, `region`, `title`).
2. POSTs to `/resources` with:
   - `slug` = filename without `.md`
   - `title` = frontmatter `title`
   - `texts.body` = body (post-frontmatter)
   - `usermetadata.classifications` = three classifications derived from:
     - `content_type` ← folder name (also frontmatter as sanity check)
     - `audience` ← frontmatter
     - `region` ← frontmatter

### File inventory (36 docs)

#### `content_type/product/` (7 docs — 6 hero + 1 preview)

| File | Slug | audience | region | Hero? | Gets custom fields? |
|---|---|---|---|---|---|
| `terratrek-7.md` | `terratrek-7` | shopper | noram | ✓ | callToAction, searchResultDisplay |
| `skyline-45l.md` | `skyline-45l` | shopper | noram | ✓ | callToAction, searchResultDisplay |
| `helios-jacket.md` | `helios-jacket` | shopper | noram | ✓ | callToAction, searchResultDisplay |
| `cumulus-2p-tent.md` | `cumulus-2p-tent` | shopper | noram | ✓ | callToAction, searchResultDisplay |
| `quill-850-quilt.md` | `quill-850-quilt` | shopper | noram | ✓ | callToAction, searchResultDisplay |
| `crag-xr-harness.md` | `crag-xr-harness` | trail_club_plus | emea | ✓ | callToAction, searchResultDisplay |
| `stratus-1p-tent.md` | `stratus-1p-tent` | shopper | noram | (preview) | (none) |

#### `content_type/trail_guide/` (7 docs)

| File | audience | region |
|---|---|---|
| `annapurna-circuit.md` | shopper | apac |
| `laugavegur-iceland.md` | shopper | emea |
| `patagonia-w-trek.md` | shopper | noram |
| `tasmania-overland.md` | shopper | anz |
| `te-araroa-new-zealand.md` | shopper | anz |
| `tour-du-mont-blanc.md` | shopper | emea |
| `yosemite-high-sierra.md` | shopper | noram |

#### `content_type/ambassador_video/` (5 docs)

| File | audience | region | Gets videoInfo? |
|---|---|---|---|
| `anya-patel.md` | shopper | noram | — |
| `jonah-podcast-ep04.md` | shopper | noram | — |
| `jonah-reyes.md` | shopper | noram | ✓ |
| `mara-chen.md` | shopper | noram | ✓ |
| `theo-sundberg.md` | shopper | noram | ✓ |

#### `content_type/gear_review/` (6 docs)

| File | audience | region |
|---|---|---|
| `crag-xr-review.md` | trail_club_plus | emea |
| `cumulus-2p-review.md` | shopper | emea |
| `helios-rating.md` | shopper | noram |
| `quill-850-review.md` | shopper | noram |
| `skyline-45l.md` | shopper | noram |
| `terratrek-7.md` | shopper | noram |

#### `content_type/loyalty_benefit/` (4 docs)

| File | audience | region |
|---|---|---|
| `ambassador-day-bookings.md` | trail_club_pro | emea |
| `ambassador-events-2028.md` | trail_club_plus | emea |
| `loyalty-trail-club.md` | shopper | noram |
| `repair-for-life-programme.md` | shopper | noram |

#### `content_type/brand_story/` (4 docs)

| File | audience | region |
|---|---|---|
| `built-for-worst-weather.md` | shopper | noram |
| `carbon-negative-2030.md` | shopper | noram |
| `repairable-for-life-manifesto.md` | shopper | noram |
| `trail-tested-by-experts.md` | shopper | noram |

#### `content_type/support/` (4 docs)

| File | audience | region |
|---|---|---|
| `altitude-acclimatisation.md` | shopper | noram |
| `returns-policy.md` | shopper | noram |
| `shipping-policy.md` | shopper | noram |
| `sizing-guide.md` | shopper | noram |

---

## Step 5 · Populate field-engineered custom fields (CRITICAL)

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

## Step 6 · Configure the journey-graph extraction agent

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

> **App expectation:** the `/abandoned-cart` composite-RAG flow traverses `pairs_with` and `featured_in` specifically. The `/for-you` future enhancement (not in current build) will use `recommended_for` and `prefers`.

### Verify

```bash
npm run verify:graph -- --dry-run
npm run verify:graph
```

Brief §12 targets: **≥150 nodes, ≥400 relations.** This corpus typically produces ~50-75 nodes / ~120-180 relations — solid for demo. To reach §12 targets, scale to 200+ docs via `progress-kb-use-case-generator`.

---

## Step 7 · App-side expectations per route

| Route | What it expects | Empty-KB behaviour |
|---|---|---|
| `/` (landing) | Env-driven badges only | Always renders |
| `/storefront` | `/find` with `content_type` chip filter; reads `searchResultDisplay` + `callToAction` on cards | "No matches" cards |
| `/for-you` | **5 `/find` queries composing audience + content_type + (sometimes) region filters from active persona** | Empty-state per section |
| `/concierge` | Persona toggle + language switcher control the floating chat | Concierge usable but no recommendations |
| `/personalize` | Three `askForJson` workflows (Adventure Plan, Loyalty, Cross-Sell) | Schema errors |
| `/journey-graph` | Seeds from `PRODUCT`; expands via `queryPaths` | "Graph empty" placeholder |
| `/abandoned-cart` | Composite-RAG seeded by Sara's fixture (no KB read for the fixture) | Steps 1-4 still attempt but partial |

### The persona-driven `/for-you` flows

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

---

## Step 8 · Verification

```bash
npm run verify:byo-llm
npm run verify:graph
npm run dev
```

### The 6 routes worth eyeballing

1. `/storefront` — search "boot for Patagonia W Trek" → top result should be Aurora TerraTrek 7 product card with the rendered `searchResultDisplay` title + CTA pill.
2. `/for-you` (Sara) — should show Aurora TerraTrek 7 and Aurora Skyline 45L in *Picks for your activity*; Patagonia / Yosemite guides in *Inspiration*.
3. `/for-you` (Mara) — exclusive perks appear in the loyalty section; ambassador day bookings + 2028 events surface.
4. `/concierge` — toggle Sara → Mara and ask "What jacket do I need?" — the chat clears, reissues, and produces a longer detailed answer in Mara mode.
5. `/personalize` — Adventure Plan with Tasmania + 6 nights + Weekend Adventurer should return populated `packing_list` referencing Aurora hero products.
6. `/abandoned-cart` — pipeline should produce a structured winback message referencing Sara, TerraTrek 7, Mara Chen.

---

## Step 9 · Production deploy

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
| `/storefront` cards render raw titles without descriptions | Step 5 (`npm run populate:fields`) skipped |
| `/for-you` "Member perks" section empty for Mara | `audience` labelset misconfigured — check `trail_club_plus` / `trail_club_pro` labels exist |
| `/for-you` "Inspiration" empty | Trail-guide region tags missing — re-run `npm run seed` with verbose output |
| `/journey-graph` shows DATE / MONEY nodes | NER blocklist not active — confirm the data-augmentation filter is being applied; the app does this client-side but the agent must also be configured correctly |
| `/abandoned-cart` pipeline times out | Graph extraction not complete — wait for the agent to finish, then re-test |
| `/concierge` shopper voice doesn't end in a CTA pill | The most-relevant resource lacks `callToAction` — verify in the dashboard's resource detail |

---

## See also

- `../KB_SETUP.md` — one-page checklist version of this guide.
- `../DEMO.md` — 25-minute demo script.
- `../RESKIN.md` — how to swap Aurora for a customer's brand.
- [`anchors.json`](./anchors.json) — the locked entity reference.
- [`labelsets.json`](./labelsets.json) — machine-readable label schema.
- [`../scripts/populate-custom-fields.mjs`](../scripts/populate-custom-fields.mjs) — exact field-engineering payloads.

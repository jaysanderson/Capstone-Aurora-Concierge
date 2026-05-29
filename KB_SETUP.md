# Aurora KB Setup — End-to-End Checklist

## Prerequisites

- Node.js 18+.
- Python 3.9+ (for `scripts/graph-agent.py`).
- Nuclia account with KB-create permission.
- BYO-LLM provider (Azure OpenAI / Google Vertex / AWS Bedrock).
- Fly.io account (for deploy).

## Step 1 — Provision the KB

Nuclia dashboard → Create KB → name `kb-aurora-concierge` → region EU (default).
Copy API URL, KB UUID, service-account JWT.

## Step 2 — Environment

```bash
cp .env.example .env
$EDITOR .env
```

## Step 3 — Labelsets

In the dashboard, create three labelsets per `corpus/labelsets.json`:

- **content_type** — product, trail_guide, gear_review, ambassador_video, loyalty_benefit, brand_story, support.
- **audience** — shopper, trail_club_standard, trail_club_plus, trail_club_pro, internal.
- **region** — noram, emea, apac, anz.

## Step 4 — BYO-LLM

Dashboard → KB → Generative model → swap to your provider. Smoke-test:

```bash
npm run verify:byo-llm
```

## Step 5 — Ingest corpus

```bash
npm run seed -- --dry-run   # preview
npm run seed                # apply
```

## Step 6 — Populate field-engineered hero data

```bash
npm run populate:fields -- --dry-run
npm run populate:fields
```

This adds `callToAction`, `searchResultDisplay`, and `videoInfo` custom fields to the 6 hero products and 3 ambassador videos.

## Step 7 — Configure the journey-graph agent

```bash
python scripts/graph-agent.py --print   # see the JSON spec
```

Either paste into Nuclia dashboard → Augmentation → Graph, or:

```bash
python scripts/graph-agent.py --apply   # Manager API
```

Wait for extraction (1-2 minutes per document; ~30 min for 23 documents).

## Step 8 — Verify

```bash
npm run verify:graph -- --dry-run
npm run verify:graph
```

Targets: nodes ≥ 150, relations ≥ 400, no NER noise.

## Step 9 — Run

```bash
npm run dev
```

Walk all six routes. Toggle persona Sara ↔ Mara. Change language. Confirm the floating chat's voice changes.

## Step 10 — Deploy to Fly.io

```bash
fly launch --copy-config --no-deploy --name capstone-aurora-concierge
fly secrets set \
  VITE_NUCLIA_API_URL="$NUCLIA_API_URL" \
  VITE_NUCLIA_KB_ID="$NUCLIA_KB_ID" \
  VITE_NUCLIA_API_KEY="$NUCLIA_API_KEY"
fly deploy
```

## Step 11 — Run the 25-minute demo

Follow **[`DEMO.md`](./DEMO.md)**.

## Done

Aurora Concierge is deployed, populated, field-engineered, and demo-ready. The brief's §12 success criteria are all mechanically reachable from here.

# Capstone — Aurora Concierge

> Customer-Experience / Digital capstone reference for the **Progress Agentic RAG Partner Enablement Framework**.
>
> Source brief: [`courses/developer-foundations/builds/build-13-capstone/aurora-concierge/README.md`](https://github.com/jaysanderson/ARAG-Partner-Enablement-Framework/blob/main/courses/developer-foundations/builds/build-13-capstone/aurora-concierge/README.md) in the umbrella framework repo.

## What this is

A complete React + Vite + TypeScript + Tailwind reference app that scores 100% against the Aurora brief once provisioned against a populated Nuclia KB. Includes:

- **Six demo surfaces:** `/storefront`, `/concierge`, `/personalize`, `/journey-graph`, `/abandoned-cart` + landing.
- **Floating two-voice chat** present on every page, voice toggled by persona (Sara prospect / Mara Trail Club Pro).
- **Multilingual switch** (six languages by default) via the global header.
- **Three Tier-3 workflows:** Adventure Plan, Loyalty Personalization, Cross-Sell & Compare.
- **Tier-4 composite RAG** flagship: abandoned-cart winback message (four-step pipeline + structured Klaviyo-ready output).
- **Field-engineered hero products** — `callToAction`, `searchResultDisplay`, `videoInfo` applied via `npm run populate:fields`.
- **Journey graph** viewer over typed product / activity / destination / ambassador / brand-pillar entities.
- **BYO-LLM toggle**, **residency badge**, **persona switcher** all in the header.
- **Aurora corpus** with rebranded Outpost Trails source content (23 documents across 7 content-type folders) + anchor JSON.
- **Fly.io deploy ready** — `fly.toml` + `Dockerfile` + `nginx.conf`.

## Quick start

```bash
npm install
cp .env.example .env
$EDITOR .env
npm run dev      # → http://localhost:5173
```

The app gracefully renders empty-state on every route against an empty KB; you can verify the UI before ingest.

## Full setup (KB provisioning → ingest → field engineering → graph → run)

See **[`KB_SETUP.md`](./KB_SETUP.md)**.

## Files-to-upload inventory

- 23 markdown documents under `corpus/content_type/<ct>/` (ingested by `scripts/seed-kb.mjs`).
- 3 labelsets declared in `corpus/labelsets.json`.
- 1 graph-extraction agent declared in `scripts/graph-agent.py`.
- 6 hero-product field-engineered values + 3 ambassador `videoInfo` blocks applied by `scripts/populate-custom-fields.mjs`.
- 1 abandoned-cart fixture (`src/fixtures/sara-session.json`) — not uploaded; lives in the app.

## Demo

25-minute script: **[`DEMO.md`](./DEMO.md)**.

## Re-skin

Per-customer re-skin: **[`RESKIN.md`](./RESKIN.md)**.

## Recording

**[`RECORDING_CHECKLIST.md`](./RECORDING_CHECKLIST.md)**.

## Deploy to Fly.io

```bash
fly launch --copy-config --no-deploy --name capstone-aurora-concierge
fly secrets set \
  VITE_NUCLIA_API_URL="$NUCLIA_API_URL" \
  VITE_NUCLIA_KB_ID="$NUCLIA_KB_ID" \
  VITE_NUCLIA_API_KEY="$NUCLIA_API_KEY"
fly deploy
```

## Source layout

```
.
├── README.md, KB_SETUP.md, DEMO.md, RESKIN.md, RECORDING_CHECKLIST.md
├── .env.example
├── package.json, tsconfig.json, vite.config.ts, tailwind.config.js, postcss.config.js
├── index.html
├── fly.toml, Dockerfile, nginx.conf
├── corpus/
│   ├── README.md, anchors.json, labelsets.json
│   └── content_type/{product,trail_guide,gear_review,ambassador_video,loyalty_benefit,brand_story,support}/*.md
├── scripts/
│   ├── seed-kb.mjs, populate-custom-fields.mjs, verify-graph.mjs, verify-byo-llm.mjs, graph-agent.py
└── src/
    ├── main.tsx, App.tsx
    ├── styles/{index.css, tokens.ts}
    ├── lib/{env,ragClient,askForJson,compositeRag,graphClient,rateLimitedRagClient,buildPrefix}.ts
    ├── context/{ByoLlmContext,LanguageContext,PersonaContext,ResidencyContext}.tsx
    ├── components/{Header,Footer,FloatingChat,Citations,StorefrontCard,PipelineSteps,GraphCanvas}.tsx
    ├── pages/{Landing,Storefront,Concierge,Personalize,JourneyGraph,AbandonedCart}.tsx
    └── fixtures/sara-session.json
```

## Success criteria (from brief §12)

- [ ] 25-min demo runs end-to-end without code edits.
- [ ] Journey graph returns 150+ typed nodes and 400+ typed relations.
- [ ] Field-engineered CTAs visible in every search result and AI answer.
- [ ] Two-voice floating chat demonstrably different for the same query.
- [ ] Abandoned-cart composite-RAG outperforms single-shot on 3 reviewer-judged criteria.
- [ ] Multilingual switch works for ≥3 of 6 listed languages.
- [ ] BYO-LLM toggle works for ≥2 of 3 endpoints.
- [ ] Recorded demo uploaded.
- [ ] CX re-skin playbook (`RESKIN.md`) shipped.
- [ ] One other SE trained on cold delivery.

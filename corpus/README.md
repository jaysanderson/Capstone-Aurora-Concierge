# Aurora Concierge Corpus

The Aurora demo runs against a single Nuclia knowledge base — `kb-aurora-concierge` — populated with **23 representative markdown documents** distributed across seven content-type folders.

## Anchors

All cross-document references resolve via `corpus/anchors.json`:

- 6 hero products (Aurora TerraTrek 7, Skyline 45L, Helios, Cumulus 2P, Quill 850, Crag XR)
- 4 ambassadors (Mara Chen, Jonah Reyes, Dr Anya Patel, Theo Sundberg)
- 5 destinations (Tasmania Overland, Patagonia W Trek, Tour du Mont Blanc, Annapurna Circuit, Yosemite High Sierra)
- 3 customer segments (Weekend Adventurer, Thru-Hiker, Alpine Pro)
- 3 loyalty tiers (Trail Club Standard / Plus / Pro)
- 4 brand pillars (Built for the Worst Weather, Trail-Tested by Experts, Repairable for Life, Carbon-Negative by 2030)

## Layout

```
corpus/
├── README.md
├── anchors.json
├── labelsets.json
└── content_type/
    ├── product/             (6 hero product pages)
    ├── trail_guide/         (4 trail guides)
    ├── gear_review/         (3 reviews)
    ├── ambassador_video/    (3 ambassador profiles)
    ├── loyalty_benefit/     (2 — Trail Club + Repair-for-Life)
    ├── brand_story/         (2 — Carbon-Negative + Repairable for Life manifesto)
    └── support/             (3 — returns, sizing, altitude)
```

## Sizing

Demo-grade. The brief targets 280+ documents for a fully-loaded recording. The included 23 are enough to:

- Exercise every demo flow on `/storefront`, `/concierge`, `/personalize`, `/journey-graph`, `/abandoned-cart`.
- Demonstrate field-engineered CTAs (the 6 hero products each get `callToAction` + `searchResultDisplay`; ambassador videos get `videoInfo`).
- Generate a 50-80-node journey graph (the 6 hero products + 4 ambassadors + 5 destinations + brand pillars each appear in 4-6 cross-references).

To scale: run `progress-kb-use-case-generator` with `corpus/anchors.json` and drop the output into matching folders, then re-run `npm run seed`.

## Ingest workflow

1. Provision the KB.
2. Copy `.env.example` → `.env` and fill in.
3. Configure the three labelsets in the dashboard per `labelsets.json`.
4. `npm run seed` — ingests + labels every `.md`.
5. `npm run populate:fields` — adds the field-engineered `callToAction` / `searchResultDisplay` / `videoInfo` to hero resources.
6. Configure the graph agent (`python scripts/graph-agent.py --print` or `--apply`).
7. `npm run verify:graph`.

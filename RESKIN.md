# Aurora Concierge — Re-Skin Playbook (CX variant)

> Replace Aurora Outfitters with a real customer brand. 3.5-5 weeks per customer.

## What stays vs what changes

**Stays:**
- 6-surface route structure (+landing).
- Two-voice floating chat.
- Multilingual switch.
- Composite-RAG flow.
- Schema-constrained workflow chassis.
- Journey graph viewer.
- Persona switcher.

**Changes:**
- Corpus (1 KB tagged by content_type / audience / region).
- Anchor entities (products, ambassadors, destinations, segments).
- Entity + relation schema.
- Three workflow schemas.
- Field-engineered hero data (`callToAction`, `searchResultDisplay`, `videoInfo`).
- Branding (palette + copy + photography).
- Sara/Mara persona fixtures.
- Demo script.

## Per-customer effort

| Asset | Effort | Tool |
|---|---|---|
| Corpus (1 KB with content-type labelset tagging) | 1.5-2.5 weeks | Customer-supplied or `progress-kb-use-case-generator` |
| Anchor entities | 1 week | Manual + corpus skill |
| Journey-graph schema | 4-5 days | `arag-graph-agent` + hand tuning |
| Three workflow schemas | 1 week | Hand design against customer needs |
| **Field engineering** (callToAction etc.) | 3-5 days, manual | Edit `scripts/populate-custom-fields.mjs` with customer's hero list + copy |
| Branding | 3-5 days | Tailwind config + landing/header edits + photography swap |
| Demo script | 2 days | Rewrite §9 of brief against customer domain |

**Total per customer:** 3.5-5 weeks. CX takes slightly longer than Enterprise because field-engineering and brand visuals are manual.

## Tier-3 customer offering

Partners sell "Aurora Concierge Co-Engineering" as: **4-week re-skin + 1-week dry run + delivered demo asset + 30-day content-engineering retainer**. Price band: $50-100K. The retainer is the recurring-revenue hook — every customer needs ongoing field engineering as their catalog and content evolve.

## What to keep verbatim

- Five-step composite-RAG pattern in `src/lib/compositeRag.ts`.
- `{prop:'generated', by:'data-augmentation'}` filter in `graphClient.ts`.
- NER blocklist.
- `additionalProperties: false` injector.
- Rate-limit-aware client.
- `buildPrefix` (multilingual + segment prefix builder).
- `FloatingChat`'s `formatAssistantHtml` truncator (truncates Shopper voice after the first CTA).
- `populate-custom-fields.mjs` PATCH structure (just swap the payload data).

## Step-by-step

1. **Lock anchors** (Days 1-3). Edit `corpus/anchors.json` with customer entities.
2. **Generate corpus** (Days 3-12). Customer-supplied content or skill output. Drop into `corpus/content_type/<ct>/`.
3. **Labelsets** (Day 12). Edit `corpus/labelsets.json` if needed.
4. **Re-tune the graph schema** (Days 12-15). Edit `scripts/graph-agent.py`. Update `src/styles/tokens.ts` colours.
5. **Re-skin workflows** (Days 15-20). Edit `src/pages/Personalize.tsx` — rename, replace the three schemas + input controls.
6. **Field engineering** (Days 20-25). Edit `scripts/populate-custom-fields.mjs` with customer hero list and copy. Coordinate with customer brand team.
7. **Brand the app** (Days 25-28). Palette swap, landing copy, photography direction.
8. **Persona fixtures** (Days 28-30). Replace `src/fixtures/sara-session.json` with a customer-domain abandoned-cart scenario.
9. **Demo script** (Days 30-32). Rewrite `DEMO.md`.
10. **Provision + deploy** (Days 32-35). Run `KB_SETUP.md`. Deploy to Fly.io.

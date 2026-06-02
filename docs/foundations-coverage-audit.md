# Foundations Coverage Audit — Aurora Concierge Capstone

## 1. Executive summary

Foundations covers the heavy lifting well: every page-level capability in the Aurora capstone traces back to at least one Build, with hybrid retrieval, schema-constrained outputs, graph queries, field engineering, multilingual prefixes, composite RAG, residency and BYO-LLM all explicitly taught. A partner who completes Builds 0-11 has the raw primitives to assemble the capstone — Build 12 then plans the assembly. The two critical gaps are citations and explainability: citations show up on four of the seven pages and are the single strongest "why ARAG" trust signal, yet no Build has a dedicated lesson on extraction, de-duping, the paragraph-suffix resource-resolution bug, or the markdown-link fallback — partners will hit all four on day one. Explainability (the "Why am I seeing this?" panel exposing the literal `/find` request body) is a real enterprise-pattern the capstone needed for regulated-buyer credibility but is missing entirely. The remaining gaps are major-but-fixable polish items: the hand-rolled React chat pattern, the outbound+inbound graph merge for leaf nodes, the entity→resources back-link, and the persona-prefix-vs-filter decision matrix — each is one named recipe away from being properly covered.

## 2. Coverage at a glance

| Primitive ID | Status | Covered in Builds | Used in Pages |
|---|---|---|---|
| kb.provisioning | ✓ | 0 | — |
| auth.service-account-jwt | ✓ | 0 | — |
| find.basic | ✓ | 0 | — |
| ask.streaming | ✓ | 0, 1 | /concierge |
| ask.sync | ✓ | 0 | /storefront |
| ask.markdown | ✓ | 0 | — |
| ask.rephrase | ✓ | 0 | — |
| platform-vs-application | ✓ | 0 | — |
| find.hybrid | ✓ | 1 | /storefront, /for-you |
| find.filters | ✓ | 1 | — |
| ask.prompt-override | ✓ | 1 | — |
| ask.schema-constrained | ✓ | 1, 5 | /personalize, /abandoned-cart |
| graph.paths | ✓ | 1, 8 | /, /journey-graph, /abandoned-cart |
| graph.nodes-by-group | ✓ | 1, 8 | /, /journey-graph |
| graph.fuzzy-nodes | ✓ | 1, 8 | /journey-graph |
| graph.generated-filter | ✓ | 1, 8 | — |
| resource.get | ✓ | 1 | — |
| resource.media-download | ✓ | 1 | — |
| labelsets.discovery | ✓ | 1, 7 | — |
| composition-mental-model | ✓ | 1 | — |
| widgets.search-bar | ✓ | 2 | — |
| widgets.search-results | ✓ | 2 | — |
| widgets.chat | • partial | 2 | /, /concierge |
| widgets.popup | ✓ | 2 | — |
| widgets.css-variable-theming | ✓ | 2 | — |
| widgets.csspath-injection | ✓ | 2 | — |
| widgets.filters-attribute | ✓ | 2 | — |
| widgets.deep-link-q-param | ✓ | 2 | — |
| ask.prompt-system | ✓ | 3 | — |
| ask.prompt-user-template | ✓ | 3 | — |
| ask.context-placeholder | ✓ | 3 | — |
| ask.question-placeholder | ✓ | 3 | — |
| two-voice-pattern | ✓ | 3 | — |
| query-prefixing | ✓ | 3, 4 | — |
| cta.post-processing | ✓ | 3, 9 | — |
| cta.truncate-past-link | ✓ | 3 | — |
| streaming.ndjson-parser | ✓ | 3 | — |
| field-engineering.callToAction-preview | ✓ | 3 | — |
| multilingual-prefix | ✓ | 4 | /concierge |
| persona-prefix | ✓ | 4 | /storefront, /for-you, /concierge, /journey-graph |
| resource-scope-prefix | ✓ | 4 | — |
| prefix-composition | ✓ | 4 | — |
| prefix-vs-prompt-decision | ✓ | 4 | — |
| ask.additional-properties-false | ✓ | 5 | — |
| ask.schema-injector-helper | ✓ | 5 | — |
| ask.three-response-shapes | ✓ | 5 | — |
| ask.schema-permissive-code-strict | ✓ | 5 | — |
| ask.schema-vs-prompt-regex | ✓ | 5 | — |
| tier-3-workflow-recognition | ✓ | 5 | — |
| data-augmentation.generator | ✓ | 6 | — |
| data-augmentation.labeller | ✓ | 6 | — |
| data-augmentation.graph-agent | ✓ | 6 | /, /journey-graph |
| data-augmentation.rule-vs-model-mode | ✓ | 6 | — |
| data-augmentation.ingest-vs-batch | ✓ | 6 | — |
| data-augmentation.per-kb-config | ✓ | 6 | — |
| labelset-filters | ✓ | 7 | /storefront, /for-you, /abandoned-cart |
| icon-path-filters | ✓ | 7 | — |
| classification-label-filters | ✓ | 7 | — |
| labelset.design-rules | ✓ | 7 | — |
| paragraph-level-labels | ✓ | 7 | — |
| filter-ux-patterns | ✓ | 7 | — |
| dynamic-labelset-resolution | ✓ | 7 | — |
| graph.undirected-traversal | ✓ | 8 | — |
| graph.entity-to-resources | ✓ | 8 | — |
| graph.hybrid-retrieval-lookup | ✓ | 8 | — |
| graph.schema-design | ✓ | 8 | — |
| graph.client-side-noise-filter | ✓ | 8 | — |
| field-engineering.callToAction | ✓ | 9 | /storefront, /for-you, /concierge |
| field-engineering.searchResultDisplay | ✓ | 9 | /storefront, /for-you |
| field-engineering.videoInfo | ✓ | 9 | — |
| field-engineering.content-prompt-contracts | ✓ | 9 | — |
| field-engineering.cta-post-processing | ✓ | 9 | — |
| field-engineering.ab-testing-via-content | ✓ | 9 | — |
| recurring-revenue-retainer-model | ✓ | 9 | — |
| composite-rag.evaluate-and-retry | ✓ | 10 | /abandoned-cart |
| composite-rag.augmented-context | ✓ | 10 | /abandoned-cart |
| composite-rag.multi-pass-synthesis | ✓ | 10 | — |
| composite-rag.retrieve-then-rerank | ✓ | 10 | — |
| composite-rag.retry-cap | ✓ | 10 | — |
| composite-vs-agentic-boundary | ✓ | 10 | — |
| composite-rag.citation-merge | ✓ | 10 | — |
| residency | ✓ | 11 | / |
| byo-llm | ✓ | 11 | / |
| byo-llm.azure | ✓ | 11 | — |
| byo-llm.vertex | ✓ | 11 | — |
| byo-llm.bedrock | ✓ | 11 | — |
| rate-limiting | ✓ | 11 | — |
| rate-limit.coalesce-and-backoff | ✓ | 11 | — |
| auth.proxy-in-production | ✓ | 11 | — |
| observability.citation-rate | ✓ | 11 | — |
| observability.latency-percentiles | ✓ | 11 | — |
| capstone.variant-choice | ✓ | 12 | — |
| capstone.master-prompt-anatomy | ✓ | 12 | — |
| capstone.demo-script-arc | ✓ | 12 | — |
| capstone.review-board-gate | ✓ | 12 | — |
| capstone.architecture-recap | ✓ | 12 | — |
| vibe-coding.prompt-discipline | ✓ | 12 | — |
| citations | ✗ | — | /storefront, /concierge, /personalize, /abandoned-cart |
| prompt-config | ✓ | 1, 3 | /concierge, /personalize, /abandoned-cart |
| schema.additionalProperties-false | ✓ | 5 | /personalize |
| schema.fallback-paths | ✓ | 5 | /personalize |
| explainability | ✗ | — | /for-you |
| graph.paths-around | • partial | 8 | /journey-graph |
| graph.related-resources | • partial | 8 | /journey-graph |

## 3. Per-page feature usage

### `/` — Landing — Aurora Outfitters

Live graph counts, residency + BYO-LLM platform chips, and a hero input that deep-links into the concierge — all powered by the data-augmentation graph agent on the same KB.

- **Live entity counts by group (/graph/nodes)** — The hero "X typed entities" headline is a live count across 10 entity groups, not a hardcoded number — so a fresh ingest immediately shows up on the homepage.
  - Taught in: Build 1 · The Five Primitives
  - Taught in: Build 8 · Knowledge Graph 101
- **Canonical-relation traversal (/graph)** — Fires outbound `/graph` queries from four demo seeds in parallel and de-dupes the paths to drive the "canonical relations" counter on the journey-graph tile.
  - Taught in: Build 1 · The Five Primitives
  - Taught in: Build 8 · Knowledge Graph 101
- **Custom graph-agent filter (`{prop:'generated', by:'data-augmentation'}`)** — Every node and path query is filtered to ONLY entities the Aurora extraction agent produced, so default NER (PERSON, ORG, DATE…) never leaks into the headline stats.
  - Taught in: Build 6 · Data-Augmentation Agents
- **Concierge prefill bus (CustomEvent → FloatingChat)** — The hero "Try it now" input dispatches an `aurora.concierge.prefill` event with `autoSend=true` so the floating chat opens and streams an answer without leaving the landing page.
  - Taught in: Build 2 · Drop-in Widgets
- **Residency region chip (EU / US)** — Reads the active region from `ResidencyContext` and renders it as a platform chip so visitors see data-locality is a first-class property.
  - Taught in: Build 11 · Production Readiness
- **BYO-LLM provider chip (Azure / Vertex / Bedrock)** — Reads the active provider from `ByoLlmContext` alongside residency so the CTO conversation about model tenancy lands on the homepage, not slide 47.
  - Taught in: Build 11 · Production Readiness

### `/storefront` — Conversational discovery

Hybrid `/find` + sync `/ask` in parallel on every keystroke, scoped by content-type chips and persona, with copywriter-owned cards via field engineering and traceable citations.

- **Hybrid retrieval (`/find` with keyword + semantic)** — Runs `/find` with `features:['keyword','semantic']` in parallel with `/ask` on every debounced query so the product grid is hybrid-retrieved over products, guides, reviews, and ambassador content.
  - Taught in: Build 1 · The Five Primitives
- **Synchronous grounded summary (`/ask` + `x-synchronous`)** — `askSync` renders the "Aurora AI summary" card above the grid — one grounded blurb with citations and a latency chip, in parallel with the hybrid `/find`.
  - Taught in: Build 0 · Hello ARAG
- **Content-type chip filters (`/classification.labels/content_type/...`)** — Chip filters compose a classification-label filter path (product / trail_guide / gear_review / ambassador_video / loyalty_benefit) and pass it on BOTH `/find` and `/ask` so retrieval and generation are scoped to the active chip.
  - Taught in: Build 7 · Smart Filters & Labelsets
- **Audience gating via labelset filter (shopper vs member)** — Prospects get an automatic `/classification.labels/audience/shopper` filter appended so member-exclusive perks and reviews are gated out; members see the unfiltered corpus.
  - Taught in: Build 4 · Multilingual & Voice Switching
- **Field engineering: searchResultDisplay (title / description / ctaLabel)** — Reads `searchResultDisplay` custom fields off each `/find` resource so product cards render copywriter-owned titles, descriptions and CTAs instead of raw markdown excerpts.
  - Taught in: Build 9 · Field Engineering
- **Field engineering: callToAction (merchandiser-owned button + URL)** — Pulls each resource's `callToAction` field so the card's button text and target URL are merchandiser-controlled, not invented by the model — every CTA experiment ships without a code deploy.
  - Taught in: Build 9 · Field Engineering
- **Cited-from pill row (de-duped /ask citations)** — Renders "Cited from" pills beneath the AI summary using de-duped `/ask` citations, with the paragraph-suffix bug fixed in `ragClient` so every chip resolves to a real resource page.
  - Taught in: _(no Build covers this — see Gaps)_

### `/for-you` — Picks — Personalised retrieval

Five parallel `/find` calls, one per editorial section, scoped by content-type labelset and audience prefix, with an opt-in "Why am I seeing this?" panel that exposes the live `/find` request body.

- **Five parallel hybrid /find calls** — No search box — fires one `/find` per editorial section (activity picks, trail guides, ambassador videos, loyalty perks, brand stories) with queries derived from segment, tier and region.
  - Taught in: Build 1 · The Five Primitives
- **Per-section content-type pinning** — Each section pins itself to a `content_type` labelset so layout slots are guaranteed to receive content of the right shape — no "ambassador video" card appearing in the "trail guide" slot.
  - Taught in: Build 7 · Smart Filters & Labelsets
- **Audience filter composition (`withAudience` helper)** — For prospects, every section's filter array gets an additional shopper audience constraint so member-exclusive content never leaks; members see the full corpus.
  - Taught in: Build 4 · Multilingual & Voice Switching
- **Copy preference: `searchResultDisplay.description` over raw excerpt** — `cleanHit` prefers `searchResultDisplay.description` over raw markdown excerpts so the magazine-style layout renders copywriter-edited copy, not frontmatter leakage.
  - Taught in: Build 9 · Field Engineering
- **Field-engineered CTA on the Trail Club banner** — The "Why join Trail Club" banner reads `searchResultDisplay.ctaLabel ?? callToAction` off the `loyalty_benefit` resource so the merchandiser-controlled phrasing wins.
  - Taught in: Build 9 · Field Engineering
- **Why am I seeing this? (persona inputs + dev /find disclosure)** — Narrates the persona inputs driving retrieval, with an opt-in dev toggle that exposes the literal `/find` request body (query + filters + page_size) per section.
  - Taught in: _(no Build covers this — see Gaps)_

### `/concierge` — Two voices, one conversation

One KB, two system prompts, persona + language prefixes — streamed via `/ask` with field-engineered CTA pill post-processing and a citation-fallback that mines markdown links when the model forgets to cite.

- **Streaming /ask with NDJSON parser** — `FloatingChat` consumes the NDJSON event stream (`answer-chunk` / `citations` / `done`) and appends tokens into the active assistant turn in real time so the audience watches the answer materialise.
  - Taught in: Build 0 · Hello ARAG
  - Taught in: Build 1 · The Five Primitives
- **Two-voice system prompts (Shopper vs Member)** — `SHOPPER_PROMPT` (max 3 sentences + single field-engineered CTA) and `MEMBER_PROMPT` (4-6 sentences, multi-source, ambassador-grounded) are selected by persona and passed via `promptConfig` on each `/ask`.
  - Taught in: Build 3 · Conversational Surfaces
  - Taught in: Build 1 · The Five Primitives
- **Segment prefix ("The user is a <segment>…")** — `buildPrefix` injects the segment in front of the user query so the same KB delivers shopper-voice or member-voice retrieval depending on who is asking.
  - Taught in: Build 4 · Multilingual & Voice Switching
- **Language prefix ("Respond in <Language>:")** — `buildPrefix` prepends a language instruction when the active language is non-English, so the same concierge handles ES/FR/DE/JA/ZH without a new prompt or model.
  - Taught in: Build 4 · Multilingual & Voice Switching
- **CTA pill promotion + truncate-past-link** — Shopper prompt forces ONE markdown link from the top resource's `callToAction`; `formatAssistantHtml` promotes that first link to a pill CTA and truncates everything after it.
  - Taught in: Build 9 · Field Engineering
  - Taught in: Build 3 · Conversational Surfaces
- **Streaming citations + markdown-link fallback** — Streaming `citations` events populate the per-turn source pills; if the model returned none, `deriveCitationsFromHtml` mines rendered markdown links so the source row is never empty.
  - Taught in: _(no Build covers this — see Gaps)_
- **Hand-rolled React FloatingChat panel + prefill bus** — 400×560 chat panel with persona-aware FAB styling and a CustomEvent listener (`aurora.concierge.prefill`) so other pages can deep-link a question straight into the widget.
  - Taught in: Build 2 · Drop-in Widgets _(partial — see Gaps)_

### `/personalize` — Schema-constrained generation

Three workflow tabs (Adventure Plan / Loyalty / Cross-Sell) drive `/ask` with `answer_json_schema`, the strict-additionalProperties injector and a three-path fallback parser — output drops straight into Klaviyo.

- **Structured outputs (`/ask` + `answer_json_schema`)** — Three workflow tabs each pass an `answer_json_schema` to `/ask` via `askForJson` and render the validated payload as structured cards, with a "Copy JSON / Send to Klaviyo" toolbar to prove ESP-readiness.
  - Taught in: Build 5 · Structured Outputs
  - Taught in: Build 1 · The Five Primitives
- **`additionalProperties:false` injector** — `askForJson` recursively walks the schema and injects `additionalProperties:false` at every object level so the model cannot return extra fields the downstream ESP doesn't expect.
  - Taught in: Build 5 · Structured Outputs
- **Three-path response parser (`raw.answer_json` / `item.object` / regex)** — Falls back through three ARAG response shapes so the workflow tolerates different framings without bubbling a parse error to the CMO.
  - Taught in: Build 5 · Structured Outputs
- **ID-discipline system prompt ("verbatim, do NOT invent")** — Every `askForJson` call sets a system prompt that forces `citation_resource_id` to be a verbatim retrieved id, so the client can deterministically re-link to `/p/{id}`.
  - Taught in: Build 3 · Conversational Surfaces
  - Taught in: Build 1 · The Five Primitives
- **Schema-embedded citations (`citation_resource_id` per item)** — Every structured array requires a `citation_resource_id` field; `CitationLink` and `CitationInline` render those as click-through "source: <id>" links so the structured output stays traceable.
  - Taught in: _(no Build covers this — see Gaps)_

### `/journey-graph` — The intelligence engine

Fuzzy search, group counts, outbound + inbound path-merge, persona-split visibility and a hybrid `/find` back-link from every selected node — all filtered to the custom data-augmentation graph agent.

- **Custom graph-agent filter (entire canvas)** — Every node and path query carries the `{prop:'generated', by:'data-augmentation'}` filter so the canvas renders ONLY entities and relations from Aurora's custom agent — no default NER noise.
  - Taught in: Build 6 · Data-Augmentation Agents
- **Live group counts (10 entity types)** — Loads counts for all 10 entity groups so the "typed entities" stat banner and legend reflect the live KB.
  - Taught in: Build 1 · The Five Primitives
  - Taught in: Build 8 · Knowledge Graph 101
- **Fuzzy node search + density re-rank** — Debounced `/graph/nodes` with `match:'fuzzy'`, re-ranked by outbound-path density so "mara" surfaces Mara Chen (49 relations) ahead of low-density look-alikes.
  - Taught in: Build 1 · The Five Primitives
  - Taught in: Build 8 · Knowledge Graph 101
- **Parallel seed traversal + 30s live re-poll** — Loads outbound paths from four demo seeds in parallel to seed the overview canvas and drive the "canonical relations" counter; re-polls every 30s so the "Live" indicator is honest.
  - Taught in: Build 1 · The Five Primitives
  - Taught in: Build 8 · Knowledge Graph 101
- **Outbound + inbound merge (`queryPathsAround`)** — Clicking any node fires outbound + inbound queries in parallel and merges them, so leaf entities with zero outbound edges still light up the canvas via their inbound relations.
  - Taught in: Build 8 · Knowledge Graph 101 _(partial — see Gaps)_
- **Entity → resources back-link (hybrid /find on entity value)** — `searchRelatedResources` runs a hybrid `/find` on the entity value and surfaces up to 8 cited resources in persona-split "Suggested picks / Suggested reading" panels — every graph click back-links to source content.
  - Taught in: Build 8 · Knowledge Graph 101 _(partial — see Gaps)_
- **Persona-split entity visibility (Sara vs Mara)** — Same selected entity is split by audience: Sara sees only shoppable groups; Mara additionally sees AMBASSADOR / CONTENT / LOYALTY_TIER / BRAND_PILLAR — proving the graph reasons about who's asking.
  - Taught in: Build 4 · Multilingual & Voice Switching

### `/abandoned-cart` — Winback — Composite RAG

`compositeAsk` runs initial `/ask` → confidence gate → broaden with `/find` + `/graph` → augmented re-ask, then generates both prospect and Pro winback emails in parallel via `answer_json_schema`.

- **Confidence gate + augmented re-ask** — Initial `/ask` → confidence check (≥3 citations AND top score ≥0.7) → if low, broadens with `/find` + graph traversal → re-asks with augmented context. Each step is surfaced in `PipelineSteps` for the live demo.
  - Taught in: Build 10 · Composite RAG
- **Top-K context builder (4 resources + 8 graph paths)** — `buildAugmentedPrompt` assembles 4 resources × 140-char excerpts + 8 graph paths formatted as `source -[relation]-> destination` and re-asks with a "use this additional context" system prompt.
  - Taught in: Build 10 · Composite RAG
- **Graph-seeded augmentation (TerraTrek 7 + Mara Chen)** — Seeds the composite pipeline with two graph entities so the augmented re-ask gets typed cross-sell pairings and ambassador endorsements pulled from the journey graph.
  - Taught in: Build 1 · The Five Primitives
  - Taught in: Build 8 · Knowledge Graph 101
- **Parallel structured winback variants (`WINBACK_SCHEMA`)** — Both winback variants are generated in parallel via `askForJson` against `WINBACK_SCHEMA` (subject_line, body, cta_label, cta_url, cross_sell_products, ambassador_quote, send_window) — drops straight into Klaviyo / Braze.
  - Taught in: Build 5 · Structured Outputs
  - Taught in: Build 1 · The Five Primitives
- **Two prompt overrides on the same retrieved context** — Prospect lens (warm, 3 paragraphs, weekend morning send) and Pro lens (insider, 4-5 paragraphs, ambassador-specific subject, weekday evening send) — the CMO money shot.
  - Taught in: Build 3 · Conversational Surfaces
  - Taught in: Build 1 · The Five Primitives
- **Catalog-first labelset scope on initial /ask** — Initial `/ask` in the pipeline is scoped to `/classification.labels/content_type/product` so the first pass anchors on catalog facts before the broaden step pulls in guides / reviews / ambassador content.
  - Taught in: Build 7 · Smart Filters & Labelsets
- **Merged composite citations (initial + re-ask)** — `Citations` component renders the merged citation set (initial + re-ask, de-duped, sorted by confidence) under each winback email so every fact in the body is traceable.
  - Taught in: _(no Build covers this — see Gaps)_

## 4. Gaps + recommendations

### Critical

- **`citations` — no dedicated Build, used on 4 pages.** Citations appear on FOUR capstone pages (`/storefront`, `/concierge`, `/personalize`, `/abandoned-cart`) and are the single biggest "why ARAG" trust signal in the entire demo, yet no Build has a dedicated walkthrough. The capstone needed at least four non-obvious patterns: (1) de-duping by resource id, (2) fixing the paragraph-suffix bug in `ragClient` so the rid actually resolves, (3) the `deriveCitationsFromHtml` fallback when the model returns plain markdown links instead of structured citations, (4) embedding `citation_resource_id` inside `answer_json_schema` so structured outputs stay traceable. Every partner will hit at least three of these on day one.
  - **Recommendation:** Extend Build 0 with a "Citations: extracting, de-duping, and resolving" section, and add a recipe to Build 5 for "citation fields inside `answer_json_schema`". The streaming-vs-sync citation shape difference also belongs in Build 3 alongside the NDJSON parser.

- **`explainability` — no Build, used on /for-you.** The "Why am I seeing this?" panel on `/for-you` (persona-input narration + opt-in dev disclosure of the literal `/find` request body per section) is a real enterprise pattern the capstone needed but no Build teaches. Partners selling into regulated buyers (finance, healthcare, government) will be asked for this exact pattern at security review and have nothing to point to.
  - **Recommendation:** Add a short Build 11.5 recipe (or extend Build 11 / Production Readiness) on "Explainability surfaces: narrating retrieval to end users and exposing request bodies to admins". Pairs naturally with the existing observability primitives.

### Major

- **`widgets.chat` — taught only as drop-in component.** Build 2 teaches the drop-in `<nuclia-chat>` web component, but the capstone instead ships a hand-rolled React `FloatingChat` for the `/concierge` and landing-page concierge bus. The React-equivalent pattern (custom panel + `streamAsk` + CustomEvent prefill bus across routes) is implicit in Builds 3+4 but never assembled into a named "when you need a richer chat than the widget, here's the React recipe" lesson. A partner who needs custom styling beyond what CSS variables allow has to reverse-engineer this from the capstone source.
  - **Recommendation:** Add a Build 3 sub-recipe titled "When the drop-in widget isn't enough: a 100-line React floating chat with prefill bus" so partners have a graduation path from widget → custom UI without leaving the curriculum.

- **`graph.paths-around` — undocumented inbound+outbound merge.** Build 8 lists `graph.undirected-traversal` as a concept, but the specific pattern `queryPathsAround` uses — outbound + inbound queries in parallel, merged and de-duped — is the only way leaf nodes (e.g. competitor products with zero outbound edges) light up when clicked. Without this, a partner's first graph UI silently hides ~30% of nodes when users click them and the demo dies.
  - **Recommendation:** Promote `queryPathsAround` from "an example of undirected traversal" to a named Build 8 recipe with a screenshot of a leaf node before/after the inbound merge — the failure mode is invisible until a customer clicks the wrong node on a live call.

- **`graph.related-resources` — buried as a sub-bullet.** Build 8 lists `graph.entity-to-resources` and `graph.hybrid-retrieval-lookup` as taught primitives, but the capstone's `searchRelatedResources` helper (hybrid `/find` on the entity's literal value to surface cited resources in persona-split side-panels) is the moment graph clicks become "so what do I buy / read next" rather than "oh, a pretty diagram". This is where the journey graph turns into revenue.
  - **Recommendation:** Promote the graph→resources back-link from a sub-bullet inside Build 8 to a named recipe: "From entity selection to commerce: the back-link panel that turns graph into pipeline". Include the persona-split rendering pattern.

### Minor

- **`prompt-config` — missing "ID discipline" callout.** Builds 1 and 3 both touch the `/ask` prompt overrides, but no Build explicitly teaches the capstone's heavily-used "verbatim ID discipline" pattern in system prompts (e.g. "`citation_resource_id` MUST be a verbatim retrieved resource id — do NOT invent URLs, slugs, hostnames or paths"). This is essential discipline whenever you're building deterministic click-through behaviour on structured outputs.
  - **Recommendation:** Add a 60-second "ID discipline in system prompts" callout to Build 5 (Structured Outputs) — it's the difference between a click-through that works and one that 404s in front of a CMO.

- **`persona-prefix` — only one of three patterns taught.** Build 4 teaches `persona-prefix` as a query-string prefix, but the capstone uses it FOUR different ways across pages: (a) as an actual query prefix string on `/concierge`, (b) as a labelset filter constraint on `/storefront` and `/for-you` (the `withAudience` helper), (c) as a client-side visibility filter on `/journey-graph` `splitPathsByPersona`. These are three different patterns the partner needs to choose between by surface, and Build 4 only shows pattern (a).
  - **Recommendation:** Extend Build 4 with a "three ways to enforce persona scope: prefix vs filter vs client-side" decision matrix so partners don't default to query prefixes when a filter would be safer (cheaper, server-enforced).

## 5. Notes for the next iteration

The fastest, highest-leverage move is to close the **citations** gap end-to-end. It's the single trust primitive the entire ARAG pitch rests on — "grounded, traceable, cite-able answers" — and yet four of the seven capstone pages had to invent the resolution logic from scratch (paragraph-suffix fix, de-dupe by rid, markdown-link fallback, schema-embedded `citation_resource_id`). A single new lesson stitched across Build 0 (extraction + resolution), Build 3 (streaming-vs-sync shape) and Build 5 (in-schema citations) would give every partner the exact pattern the capstone uses, with no day-one debugging. Pair this with a Build 11 / 11.5 "Explainability surfaces" recipe and you'd cover both critical gaps in a single curriculum sprint — and both are directly relevant to the enterprise / regulated-buyer conversations partners are walking into.

The remaining gaps are all "promote a buried pattern to a named recipe" — none require new conceptual material, just better naming and a screenshot or two. The four highest-value promotions: (1) the React `FloatingChat` graduation path off the drop-in widget in Build 3, (2) `queryPathsAround` (outbound + inbound merge) in Build 8 with the leaf-node failure mode shown explicitly, (3) `searchRelatedResources` as the named "graph → commerce" recipe in Build 8, and (4) the persona-prefix-vs-filter-vs-client-side decision matrix in Build 4. Together these turn Foundations from "you can rebuild the capstone if you study the source" to "Foundations directly produces the capstone patterns by name" — which is the bar Build 12 implicitly promises.

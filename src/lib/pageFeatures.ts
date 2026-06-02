export interface CoveredIn {
  build_number: number;
  build_title: string;
  build_slug: string;
}

export interface PageFeature {
  primitive_id: string;
  label: string;
  summary: string;
  covered_in: CoveredIn[];
}

export interface PageFeatureMap {
  route: string;
  title: string;
  one_line_summary: string;
  features: PageFeature[];
}

export const PAGE_FEATURES: PageFeatureMap[] = [
  {
    route: '/',
    title: 'Landing — Aurora Outfitters',
    one_line_summary:
      'Live graph counts, residency + BYO-LLM platform chips, and a hero input that deep-links into the concierge — all powered by the data-augmentation graph agent on the same KB.',
    features: [
      {
        primitive_id: 'graph.nodes-by-group',
        label: 'Live entity counts by group (/graph/nodes)',
        summary:
          "The hero 'X typed entities' headline is a live count across 10 entity groups, not a hardcoded number — so a fresh ingest immediately shows up on the homepage.",
        covered_in: [
          { build_number: 1, build_title: 'The Five Primitives', build_slug: 'build-1-five-primitives' },
          { build_number: 8, build_title: 'Knowledge Graph 101', build_slug: 'build-8-knowledge-graph' },
        ],
      },
      {
        primitive_id: 'graph.paths',
        label: 'Canonical-relation traversal (/graph)',
        summary:
          "Fires outbound /graph queries from four demo seeds in parallel and de-dupes the paths to drive the 'canonical relations' counter on the journey-graph tile.",
        covered_in: [
          { build_number: 1, build_title: 'The Five Primitives', build_slug: 'build-1-five-primitives' },
          { build_number: 8, build_title: 'Knowledge Graph 101', build_slug: 'build-8-knowledge-graph' },
        ],
      },
      {
        primitive_id: 'data-augmentation.graph-agent',
        label: "Custom graph-agent filter ({prop:'generated', by:'data-augmentation'})",
        summary:
          'Every node and path query is filtered to ONLY entities the Aurora extraction agent produced, so default NER (PERSON, ORG, DATE…) never leaks into the headline stats.',
        covered_in: [
          { build_number: 6, build_title: 'Data-Augmentation Agents', build_slug: 'build-6-data-augmentation-agents' },
        ],
      },
      {
        primitive_id: 'widgets.chat',
        label: 'Concierge prefill bus (CustomEvent → FloatingChat)',
        summary:
          "The hero 'Try it now' input dispatches an aurora.concierge.prefill event with autoSend=true so the floating chat opens and streams an answer without leaving the landing page.",
        covered_in: [
          { build_number: 2, build_title: 'Drop-in Widgets', build_slug: 'build-2-drop-in-widgets' },
        ],
      },
      {
        primitive_id: 'residency',
        label: 'Residency region chip (EU / US)',
        summary:
          'Reads the active region from ResidencyContext and renders it as a platform chip so visitors see data-locality is a first-class property.',
        covered_in: [
          { build_number: 11, build_title: 'Production Readiness', build_slug: 'build-11-production-readiness' },
        ],
      },
      {
        primitive_id: 'byo-llm',
        label: 'BYO-LLM provider chip (Azure / Vertex / Bedrock)',
        summary:
          'Reads the active provider from ByoLlmContext alongside residency so the CTO conversation about model tenancy lands on the homepage, not slide 47.',
        covered_in: [
          { build_number: 11, build_title: 'Production Readiness', build_slug: 'build-11-production-readiness' },
        ],
      },
    ],
  },
  {
    route: '/storefront',
    title: 'Storefront — Conversational discovery',
    one_line_summary:
      'Hybrid /find + sync /ask in parallel on every keystroke, scoped by content-type chips and persona, with copywriter-owned cards via field engineering and traceable citations.',
    features: [
      {
        primitive_id: 'find.hybrid',
        label: 'Hybrid retrieval (/find with keyword + semantic)',
        summary:
          "Runs /find with features:['keyword','semantic'] in parallel with /ask on every debounced query so the product grid is hybrid-retrieved over products, guides, reviews, and ambassador content.",
        covered_in: [
          { build_number: 1, build_title: 'The Five Primitives', build_slug: 'build-1-five-primitives' },
        ],
      },
      {
        primitive_id: 'ask.sync',
        label: 'Synchronous grounded summary (/ask + x-synchronous)',
        summary:
          "askSync renders the 'Aurora AI summary' card above the grid — one grounded blurb with citations and a latency chip, in parallel with the hybrid /find.",
        covered_in: [
          { build_number: 0, build_title: 'Hello ARAG', build_slug: 'build-0-hello-arag' },
        ],
      },
      {
        primitive_id: 'labelset-filters',
        label: 'Content-type chip filters (/classification.labels/content_type/...)',
        summary:
          'Chip filters compose a classification-label filter path (product / trail_guide / gear_review / ambassador_video / loyalty_benefit) and pass it on BOTH /find and /ask so retrieval and generation are scoped to the active chip.',
        covered_in: [
          { build_number: 7, build_title: 'Smart Filters & Labelsets', build_slug: 'build-7-smart-filters' },
        ],
      },
      {
        primitive_id: 'persona-prefix',
        label: 'Audience gating via labelset filter (shopper vs member)',
        summary:
          "Prospects get an automatic '/classification.labels/audience/shopper' filter appended so member-exclusive perks and reviews are gated out; members see the unfiltered corpus.",
        covered_in: [
          { build_number: 4, build_title: 'Multilingual & Voice Switching', build_slug: 'build-4-multilingual-and-voice' },
        ],
      },
      {
        primitive_id: 'field-engineering.searchResultDisplay',
        label: 'Field engineering: searchResultDisplay (title / description / ctaLabel)',
        summary:
          'Reads searchResultDisplay custom fields off each /find resource so product cards render copywriter-owned titles, descriptions and CTAs instead of raw markdown excerpts.',
        covered_in: [
          { build_number: 9, build_title: 'Field Engineering', build_slug: 'build-9-field-engineering' },
        ],
      },
      {
        primitive_id: 'field-engineering.callToAction',
        label: 'Field engineering: callToAction (merchandiser-owned button + URL)',
        summary:
          "Pulls each resource's callToAction field so the card's button text and target URL are merchandiser-controlled, not invented by the model — every CTA experiment ships without a code deploy.",
        covered_in: [
          { build_number: 9, build_title: 'Field Engineering', build_slug: 'build-9-field-engineering' },
        ],
      },
      {
        primitive_id: 'citations',
        label: 'Cited-from pill row (de-duped /ask citations)',
        summary:
          "Renders 'Cited from' pills beneath the AI summary using de-duped /ask citations, with the paragraph-suffix bug fixed in ragClient so every chip resolves to a real resource page.",
        covered_in: [],
      },
    ],
  },
  {
    route: '/for-you',
    title: 'Picks — Personalised retrieval',
    one_line_summary:
      "Five parallel /find calls, one per editorial section, scoped by content-type labelset and audience prefix, with an opt-in 'Why am I seeing this?' panel that exposes the live /find request body.",
    features: [
      {
        primitive_id: 'find.hybrid',
        label: 'Five parallel hybrid /find calls',
        summary:
          'No search box — fires one /find per editorial section (activity picks, trail guides, ambassador videos, loyalty perks, brand stories) with queries derived from segment, tier and region.',
        covered_in: [
          { build_number: 1, build_title: 'The Five Primitives', build_slug: 'build-1-five-primitives' },
        ],
      },
      {
        primitive_id: 'labelset-filters',
        label: 'Per-section content-type pinning',
        summary:
          "Each section pins itself to a content_type labelset so layout slots are guaranteed to receive content of the right shape — no 'ambassador video' card appearing in the 'trail guide' slot.",
        covered_in: [
          { build_number: 7, build_title: 'Smart Filters & Labelsets', build_slug: 'build-7-smart-filters' },
        ],
      },
      {
        primitive_id: 'persona-prefix',
        label: 'Audience filter composition (withAudience helper)',
        summary:
          "For prospects, every section's filter array gets an additional shopper audience constraint so member-exclusive content never leaks; members see the full corpus.",
        covered_in: [
          { build_number: 4, build_title: 'Multilingual & Voice Switching', build_slug: 'build-4-multilingual-and-voice' },
        ],
      },
      {
        primitive_id: 'field-engineering.searchResultDisplay',
        label: 'Copy preference: searchResultDisplay.description over raw excerpt',
        summary:
          'cleanHit prefers searchResultDisplay.description over raw markdown excerpts so the magazine-style layout renders copywriter-edited copy, not frontmatter leakage.',
        covered_in: [
          { build_number: 9, build_title: 'Field Engineering', build_slug: 'build-9-field-engineering' },
        ],
      },
      {
        primitive_id: 'field-engineering.callToAction',
        label: 'Field-engineered CTA on the Trail Club banner',
        summary:
          "The 'Why join Trail Club' banner reads searchResultDisplay.ctaLabel ?? callToAction off the loyalty_benefit resource so the merchandiser-controlled phrasing wins.",
        covered_in: [
          { build_number: 9, build_title: 'Field Engineering', build_slug: 'build-9-field-engineering' },
        ],
      },
      {
        primitive_id: 'explainability',
        label: 'Why am I seeing this? (persona inputs + dev /find disclosure)',
        summary:
          'Narrates the persona inputs driving retrieval, with an opt-in dev toggle that exposes the literal /find request body (query + filters + page_size) per section.',
        covered_in: [],
      },
    ],
  },
  {
    route: '/concierge',
    title: 'Concierge — Two voices, one conversation',
    one_line_summary:
      'One KB, two system prompts, persona + language prefixes — streamed via /ask with field-engineered CTA pill post-processing and a citation-fallback that mines markdown links when the model forgets to cite.',
    features: [
      {
        primitive_id: 'ask.streaming',
        label: 'Streaming /ask with NDJSON parser',
        summary:
          'FloatingChat consumes the NDJSON event stream (answer-chunk / citations / done) and appends tokens into the active assistant turn in real time so the audience watches the answer materialise.',
        covered_in: [
          { build_number: 0, build_title: 'Hello ARAG', build_slug: 'build-0-hello-arag' },
          { build_number: 1, build_title: 'The Five Primitives', build_slug: 'build-1-five-primitives' },
        ],
      },
      {
        primitive_id: 'prompt-config',
        label: 'Two-voice system prompts (Shopper vs Member)',
        summary:
          'SHOPPER_PROMPT (max 3 sentences + single field-engineered CTA) and MEMBER_PROMPT (4-6 sentences, multi-source, ambassador-grounded) are selected by persona and passed via promptConfig on each /ask.',
        covered_in: [
          { build_number: 3, build_title: 'Conversational Surfaces', build_slug: 'build-3-conversational-surfaces' },
          { build_number: 1, build_title: 'The Five Primitives', build_slug: 'build-1-five-primitives' },
        ],
      },
      {
        primitive_id: 'persona-prefix',
        label: "Segment prefix ('The user is a <segment>…')",
        summary:
          'buildPrefix injects the segment in front of the user query so the same KB delivers shopper-voice or member-voice retrieval depending on who is asking.',
        covered_in: [
          { build_number: 4, build_title: 'Multilingual & Voice Switching', build_slug: 'build-4-multilingual-and-voice' },
        ],
      },
      {
        primitive_id: 'multilingual-prefix',
        label: "Language prefix ('Respond in <Language>:')",
        summary:
          'buildPrefix prepends a language instruction when the active language is non-English, so the same concierge handles ES/FR/DE/JA/ZH without a new prompt or model.',
        covered_in: [
          { build_number: 4, build_title: 'Multilingual & Voice Switching', build_slug: 'build-4-multilingual-and-voice' },
        ],
      },
      {
        primitive_id: 'field-engineering.callToAction',
        label: 'CTA pill promotion + truncate-past-link',
        summary:
          "Shopper prompt forces ONE markdown link from the top resource's callToAction; formatAssistantHtml promotes that first link to a pill CTA and truncates everything after it.",
        covered_in: [
          { build_number: 9, build_title: 'Field Engineering', build_slug: 'build-9-field-engineering' },
          { build_number: 3, build_title: 'Conversational Surfaces', build_slug: 'build-3-conversational-surfaces' },
        ],
      },
      {
        primitive_id: 'citations',
        label: 'Streaming citations + markdown-link fallback',
        summary:
          "Streaming 'citations' events populate the per-turn source pills; if the model returned none, deriveCitationsFromHtml mines rendered markdown links so the source row is never empty.",
        covered_in: [],
      },
      {
        primitive_id: 'widgets.chat',
        label: 'Hand-rolled React FloatingChat panel + prefill bus',
        summary:
          '400×560 chat panel with persona-aware FAB styling and a CustomEvent listener (aurora.concierge.prefill) so other pages can deep-link a question straight into the widget.',
        covered_in: [
          { build_number: 2, build_title: 'Drop-in Widgets', build_slug: 'build-2-drop-in-widgets' },
        ],
      },
    ],
  },
  {
    route: '/personalize',
    title: 'Personalize — Schema-constrained generation',
    one_line_summary:
      'Three workflow tabs (Adventure Plan / Loyalty / Cross-Sell) drive /ask with answer_json_schema, the strict-additionalProperties injector and a three-path fallback parser — output drops straight into Klaviyo.',
    features: [
      {
        primitive_id: 'ask.schema-constrained',
        label: 'Structured outputs (/ask + answer_json_schema)',
        summary:
          "Three workflow tabs each pass an answer_json_schema to /ask via askForJson and render the validated payload as structured cards, with a 'Copy JSON / Send to Klaviyo' toolbar to prove ESP-readiness.",
        covered_in: [
          { build_number: 5, build_title: 'Structured Outputs', build_slug: 'build-5-structured-outputs' },
          { build_number: 1, build_title: 'The Five Primitives', build_slug: 'build-1-five-primitives' },
        ],
      },
      {
        primitive_id: 'schema.additionalProperties-false',
        label: 'additionalProperties:false injector',
        summary:
          "askForJson recursively walks the schema and injects additionalProperties:false at every object level so the model cannot return extra fields the downstream ESP doesn't expect.",
        covered_in: [
          { build_number: 5, build_title: 'Structured Outputs', build_slug: 'build-5-structured-outputs' },
        ],
      },
      {
        primitive_id: 'schema.fallback-paths',
        label: 'Three-path response parser (raw.answer_json / item.object / regex)',
        summary:
          'Falls back through three ARAG response shapes so the workflow tolerates different framings without bubbling a parse error to the CMO.',
        covered_in: [
          { build_number: 5, build_title: 'Structured Outputs', build_slug: 'build-5-structured-outputs' },
        ],
      },
      {
        primitive_id: 'prompt-config',
        label: "ID-discipline system prompt ('verbatim, do NOT invent')",
        summary:
          'Every askForJson call sets a system prompt that forces citation_resource_id to be a verbatim retrieved id, so the client can deterministically re-link to /p/{id}.',
        covered_in: [
          { build_number: 3, build_title: 'Conversational Surfaces', build_slug: 'build-3-conversational-surfaces' },
          { build_number: 1, build_title: 'The Five Primitives', build_slug: 'build-1-five-primitives' },
        ],
      },
      {
        primitive_id: 'citations',
        label: 'Schema-embedded citations (citation_resource_id per item)',
        summary:
          "Every structured array requires a citation_resource_id field; CitationLink and CitationInline render those as click-through 'source: <id>' links so the structured output stays traceable.",
        covered_in: [],
      },
    ],
  },
  {
    route: '/journey-graph',
    title: 'Journey graph — The intelligence engine',
    one_line_summary:
      'Fuzzy search, group counts, outbound + inbound path-merge, persona-split visibility and a hybrid /find back-link from every selected node — all filtered to the custom data-augmentation graph agent.',
    features: [
      {
        primitive_id: 'data-augmentation.graph-agent',
        label: 'Custom graph-agent filter (entire canvas)',
        summary:
          "Every node and path query carries the {prop:'generated', by:'data-augmentation'} filter so the canvas renders ONLY entities and relations from Aurora's custom agent — no default NER noise.",
        covered_in: [
          { build_number: 6, build_title: 'Data-Augmentation Agents', build_slug: 'build-6-data-augmentation-agents' },
        ],
      },
      {
        primitive_id: 'graph.nodes-by-group',
        label: 'Live group counts (10 entity types)',
        summary:
          "Loads counts for all 10 entity groups so the 'typed entities' stat banner and legend reflect the live KB.",
        covered_in: [
          { build_number: 1, build_title: 'The Five Primitives', build_slug: 'build-1-five-primitives' },
          { build_number: 8, build_title: 'Knowledge Graph 101', build_slug: 'build-8-knowledge-graph' },
        ],
      },
      {
        primitive_id: 'graph.fuzzy-nodes',
        label: 'Fuzzy node search + density re-rank',
        summary:
          "Debounced /graph/nodes with match:'fuzzy', re-ranked by outbound-path density so 'mara' surfaces Mara Chen (49 relations) ahead of low-density look-alikes.",
        covered_in: [
          { build_number: 1, build_title: 'The Five Primitives', build_slug: 'build-1-five-primitives' },
          { build_number: 8, build_title: 'Knowledge Graph 101', build_slug: 'build-8-knowledge-graph' },
        ],
      },
      {
        primitive_id: 'graph.paths',
        label: 'Parallel seed traversal + 30s live re-poll',
        summary:
          "Loads outbound paths from four demo seeds in parallel to seed the overview canvas and drive the 'canonical relations' counter; re-polls every 30s so the 'Live' indicator is honest.",
        covered_in: [
          { build_number: 1, build_title: 'The Five Primitives', build_slug: 'build-1-five-primitives' },
          { build_number: 8, build_title: 'Knowledge Graph 101', build_slug: 'build-8-knowledge-graph' },
        ],
      },
      {
        primitive_id: 'graph.paths-around',
        label: 'Outbound + inbound merge (queryPathsAround)',
        summary:
          'Clicking any node fires outbound + inbound queries in parallel and merges them, so leaf entities with zero outbound edges still light up the canvas via their inbound relations.',
        covered_in: [
          { build_number: 8, build_title: 'Knowledge Graph 101', build_slug: 'build-8-knowledge-graph' },
        ],
      },
      {
        primitive_id: 'graph.related-resources',
        label: 'Entity → resources back-link (hybrid /find on entity value)',
        summary:
          "searchRelatedResources runs a hybrid /find on the entity value and surfaces up to 8 cited resources in persona-split 'Suggested picks / Suggested reading' panels — every graph click back-links to source content.",
        covered_in: [
          { build_number: 8, build_title: 'Knowledge Graph 101', build_slug: 'build-8-knowledge-graph' },
        ],
      },
      {
        primitive_id: 'persona-prefix',
        label: 'Persona-split entity visibility (Sara vs Mara)',
        summary:
          "Same selected entity is split by audience: Sara sees only shoppable groups; Mara additionally sees AMBASSADOR / CONTENT / LOYALTY_TIER / BRAND_PILLAR — proving the graph reasons about who's asking.",
        covered_in: [
          { build_number: 4, build_title: 'Multilingual & Voice Switching', build_slug: 'build-4-multilingual-and-voice' },
        ],
      },
    ],
  },
  {
    route: '/abandoned-cart',
    title: 'Winback — Composite RAG',
    one_line_summary:
      'compositeAsk runs initial /ask → confidence gate → broaden with /find + /graph → augmented re-ask, then generates both prospect and Pro winback emails in parallel via answer_json_schema.',
    features: [
      {
        primitive_id: 'composite-rag.evaluate-and-retry',
        label: 'Confidence gate + augmented re-ask',
        summary:
          'Initial /ask → confidence check (≥3 citations AND top score ≥0.7) → if low, broadens with /find + graph traversal → re-asks with augmented context. Each step is surfaced in PipelineSteps for the live demo.',
        covered_in: [
          { build_number: 10, build_title: 'Composite RAG', build_slug: 'build-10-composite-rag' },
        ],
      },
      {
        primitive_id: 'composite-rag.augmented-context',
        label: 'Top-K context builder (4 resources + 8 graph paths)',
        summary:
          "buildAugmentedPrompt assembles 4 resources × 140-char excerpts + 8 graph paths formatted as 'source -[relation]-> destination' and re-asks with a 'use this additional context' system prompt.",
        covered_in: [
          { build_number: 10, build_title: 'Composite RAG', build_slug: 'build-10-composite-rag' },
        ],
      },
      {
        primitive_id: 'graph.paths',
        label: 'Graph-seeded augmentation (TerraTrek 7 + Mara Chen)',
        summary:
          'Seeds the composite pipeline with two graph entities so the augmented re-ask gets typed cross-sell pairings and ambassador endorsements pulled from the journey graph.',
        covered_in: [
          { build_number: 1, build_title: 'The Five Primitives', build_slug: 'build-1-five-primitives' },
          { build_number: 8, build_title: 'Knowledge Graph 101', build_slug: 'build-8-knowledge-graph' },
        ],
      },
      {
        primitive_id: 'ask.schema-constrained',
        label: 'Parallel structured winback variants (WINBACK_SCHEMA)',
        summary:
          'Both winback variants are generated in parallel via askForJson against WINBACK_SCHEMA (subject_line, body, cta_label, cta_url, cross_sell_products, ambassador_quote, send_window) — drops straight into Klaviyo / Braze.',
        covered_in: [
          { build_number: 5, build_title: 'Structured Outputs', build_slug: 'build-5-structured-outputs' },
          { build_number: 1, build_title: 'The Five Primitives', build_slug: 'build-1-five-primitives' },
        ],
      },
      {
        primitive_id: 'prompt-config',
        label: 'Two prompt overrides on the same retrieved context',
        summary:
          'Prospect lens (warm, 3 paragraphs, weekend morning send) and Pro lens (insider, 4-5 paragraphs, ambassador-specific subject, weekday evening send) — the CMO money shot.',
        covered_in: [
          { build_number: 3, build_title: 'Conversational Surfaces', build_slug: 'build-3-conversational-surfaces' },
          { build_number: 1, build_title: 'The Five Primitives', build_slug: 'build-1-five-primitives' },
        ],
      },
      {
        primitive_id: 'labelset-filters',
        label: 'Catalog-first labelset scope on initial /ask',
        summary:
          "Initial /ask in the pipeline is scoped to '/classification.labels/content_type/product' so the first pass anchors on catalog facts before the broaden step pulls in guides / reviews / ambassador content.",
        covered_in: [
          { build_number: 7, build_title: 'Smart Filters & Labelsets', build_slug: 'build-7-smart-filters' },
        ],
      },
      {
        primitive_id: 'citations',
        label: 'Merged composite citations (initial + re-ask)',
        summary:
          'Citations component renders the merged citation set (initial + re-ask, de-duped, sorted by confidence) under each winback email so every fact in the body is traceable.',
        covered_in: [],
      },
    ],
  },
];

export function featuresForRoute(pathname: string): PageFeatureMap | undefined {
  return PAGE_FEATURES.find((p) => p.route === pathname);
}

/** Public framework URL — clicking a build chip in the panel opens this. */
export const FOUNDATIONS_GITHUB_BASE =
  'https://github.com/jaysanderson/ARAG-Partner-Enablement-Framework/tree/main/courses/developer-foundations/builds';

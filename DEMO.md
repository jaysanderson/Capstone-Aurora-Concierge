# Aurora Concierge — 25-Minute Demo Script

Lifts brief §9 verbatim and adds presenter notes per beat.

## 0:00 — 1:30 · Hero + framing (90 sec)

Click: Landing. Show residency + BYO-LLM + language badges. Persona: Sara.

> Most AI demos for retail are chatbots over PDFs. This is not that.
>
> Aurora Concierge is a digital-experience platform built on Progress Agentic RAG. Conversational discovery, two-voice concierge, structured personalization, customer-journey reasoning, abandoned-cart intelligence — all behind one API key, all from one corpus of product, content, customer data.
>
> The brand is Aurora Outfitters — fictional D2C outdoor retailer. Six hero products, four ambassadors, five destinations, three customer segments. Nothing custom — just their existing content, with five custom fields per asset that drive the AI behaviour.
>
> Top-right: EU residency. Azure OpenAI. English. All swap in one click.

## 1:30 — 5:30 · Tier 1 + 2: Storefront + Floating Chat (4 min)

Click: /storefront. Type: "I need a boot for the Overland Track in November."

> Hybrid search across product, content, and support. AI summary at the top is two sentences plus a call-to-action picked from the most-relevant product's callToAction field.

Hover a result card.

> That CTA isn't hard-coded. It's the `callToAction` field on the product page. Your merchandising team writes one short sentence per product; the model picks the best one for the query. Field engineering = recurring revenue.

Open floating chat (Sara still active = Shopper voice). Type: "What jacket do I need?"

> Three sentences, one CTA, then stop. That's the Shopper voice. Designed for conversion.

Toggle persona Sara → Mara (top-right). Same query in the open chat.

> Same KB. Same model. Different prompt. Five sentences, member-exclusive recommendations, ambassador picks. The CTO building this used to scope a six-month project; here it's a configuration.

Change language to Spanish. Same query.

> Multilingual is a query-prefix away. No separate KB. No separate embeddings.

## 5:30 — 10:30 · Tier 3: Three workflows (5 min)

Click: /personalize → Adventure Plan. Inputs: Patagonia W Trek, 6 nights, party of 2, intermediate, Weekend Adventurer, Standard sizing. Generate.

> Schema-constrained generation. Packing list with deep links, day-by-day, ambassador tips, safety notes. Every gear pick is a PDP URL the customer can share.

Tab: Loyalty Personalization. Inputs: Thru-Hiker, Trail Club Plus, Skyline 45L + Quill 850, EMEA. Generate.

> Same primitive, different schema. Events, exclusive products, content to deliver, partner offers, point optimization. Drops into Klaviyo or Braze in three lines.

Tab: Cross-Sell & Compare. Inputs: Aurora TerraTrek 7, Weekend Adventurer. Generate.

> Cross-primitive: comparison table AND journey-graph traversal mid-generation to populate the pair-with section. Every pair-with is a real relation in Aurora's content. Ambassador tips cited to source.

## 10:30 — 16:30 · Tier 4: Journey graph (6 min)

Click: /journey-graph. Initial graph loads (6 hero products + neighbours).

> Extracted from Aurora's content by the data-augmentation agent. Ten entity types, twelve relations, designed for customer journeys — not abstract knowledge. The recommendation engine you're currently paying for can't tell you *why* it recommended a product. This can.

Click: Aurora TerraTrek 7.

> Recommended for Day Hiking and Thru-Hiking. Pairs with Aurora Skyline 45L and Aurora Helios. Featured in Mara Chen's Tasmania guide. Fits Wide Foot sizing. Embodies Repairable for Life.

Click: Mara Chen.

> Mara has written 12 pieces of content across the Aurora corpus. Recommends 9 of the hero products. Her content drives the highest engagement among Thru-Hikers.

Click: Tasmania Overland Track.

> Three products `suited_to`, two ambassadors with content, six trail-guide pieces, related-content panel via hybrid retrieval. Brand expertise, encoded once, queryable everywhere.

## 16:30 — 22:00 · Tier 4 capstone: Abandoned-cart composite RAG (5:30)

Click: /abandoned-cart. Sara's session fixture visible.

> Sara abandoned a TerraTrek 7 cart 36 hours ago. Most personalization vendors fire "come back for 10% off." Watch the pipeline.

Click: Generate winback.

Wait Step 1: initial /ask scoped to product content. Low confidence.

> The model knows it doesn't know enough yet.

Wait Step 2: /find broadened.

> Trail guide + loyalty + gear-review filters. Five more candidates including a Weekend Adventurer trail-guide and a Trail Club Standard onboarding asset.

Wait Step 3: graph traversal.

> TerraTrek 7 → pairs_with → Skyline 45L. TerraTrek 7 → featured_in → Mara's Tasmania guide. Brand-curated relationships, not algorithmic guesses.

Wait Step 4: structured output.

> Subject line, body, CTA, cross-sell products, ambassador quote, send window from Aurora's open-rate data. Body written in Aurora's voice because the brand pillars and Mara's content were in the context.
>
> This drops into Klaviyo or Braze in three lines. Marketing-ops controls every input. Merchandising controls every CTA. Model does synthesis. Brand does content. That's the platform.

## 22:00 — 25:00 · Close + invitation (3 min)

Back to landing.

> One application. One KB. Three labelsets. One extraction agent. Three workflows. One composite-RAG pipeline. Every output grounded, citable, explainable, editable by your content team without code deployment.
>
> Three things none of your personalization vendors offer:
>
> 1. Every recommendation is explainable.
> 2. Content is the optimization surface, not code.
> 3. One platform, not five.
>
> Four-week co-engineered POC against your own catalog and content. Aurora Concierge becomes your team's daily driver inside one quarter.

End demo.

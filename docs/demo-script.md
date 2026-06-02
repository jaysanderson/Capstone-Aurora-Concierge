# Aurora Outfitters Concierge — 8-Minute Live Demo Script

**Live URL:** https://capstone-aurora-concierge.fly.dev/
**Format:** Teleprompter. Jay reads from a second monitor while driving the live app on the primary screen.
**Audience:** 6–15 technical buyers and partner sales engineers.
**Total runtime:** ~8:00.
**Tone:** Confident, story-driven. Pull-back at the end. Never a feature checklist.

---

## Pre-flight checklist (do this 60 seconds before you go live)

- [ ] Browser open to `https://capstone-aurora-concierge.fly.dev/` — **homepage**, not deep-linked
- [ ] **Persona = Sara** (Weekend Adventurer, NORAM) — header dropdown, top-right
- [ ] **Language = English** — header dropdown
- [ ] **Residency = EU** — badge visible in header
- [ ] **BYO-LLM = Azure** — header dropdown
- [ ] **KB is warm** — hit `/storefront`, type one throwaway query, get a response, then return to `/`. This is the single biggest preventable failure: cold KB on the first query.
- [ ] **`/journey-graph` tile excluded from the click-through** — only mention if asked
- [ ] **Browser zoom = 110%** (Cmd + once from default) — room readability
- [ ] Floating chat closed
- [ ] Tabs other than the demo closed
- [ ] Notifications silenced (Do Not Disturb)
- [ ] Second monitor showing this script, primary monitor mirrored to the projector / share

---

## Scene 1 — Homepage / Thesis (0:00–0:30 · 30s)

**Say:** "Most e-commerce AI today is a search box with a chatbot bolted on the side. What I'm going to show you is different. This is a full experience layer — every surface of the storefront, driven by the same retrieval engine."

**Do:** Slowly move the cursor across the six tiles on the homepage, left to right, top to bottom. One beat per tile. Don't click yet.

**Say:** "Storefront. For You. Concierge. Personalize. Journey Graph. Abandoned Cart."

**Do:** Hover on the last tile, then pull the cursor back to center.

**Say:** "Six capabilities. One API key. One corpus. Let me prove each one."

> **What can go wrong:** Homepage tiles render before the persona/language header. Recovery line: *"You'll see the header settle in a second — that's the persona context loading. Same thing your real users would never see."*

---

## Scene 2 — Storefront / The AI earns its answer (0:30–2:00 · 90s)

**Do:** Click the **Storefront** tile.

**Say:** "Standard e-commerce grid, right? Watch what happens when I ask it a real question."

**Do:** Click into the search field. Type slowly so the room can read it: `warm jacket for Patagonia in October`. Hit return.

**Say:** "Two things are happening behind that one query. A hybrid retrieval — keyword plus vector — and a generative summary. The summary is grounded in our product corpus, not the open web."

**Do:** Wait for the Helios AI summary card to land. The moment it renders — **stop talking**. Let the room read the first sentence. Point at the card with the cursor.

**Say:** "That's not a paragraph it wrote from thin air. Every claim in there is tied back to a product or a guide in the knowledge base. You can ask it to cite — it will."

**Do:** Scroll down to the product cards. Hover over the call-to-action button on the lead product.

**Say:** "Now look at the CTA. *Shop the Helios Insulated Parka.* That copy wasn't generated. It was written by our merchandising team and stored as a field-engineered attribute on the product. The AI chose which CTA to surface based on the query context — but a human wrote the words."

**Do:** Click the **Products** chip in the content_type chip strip to narrow the view.

**Say:** "I can narrow by content type — products, guides, videos, reviews — and the summary recomposes against the filtered set. Keyword search cannot do this. Vector search alone cannot do this. You need both, and you need the field engineering underneath."

> **What can go wrong:** Helios summary takes longer than 4s. Recovery line: *"The first query of a session pre-warms the index — by the second query you're looking at sub-second responses. Watch."* Then run a second query immediately: `lightweight rain shell`.

---

## Scene 3 — For You / The invisible query (2:00–4:00 · 2 min — BIGGEST WOW)

**Do:** Click **For You** in the nav. Persona should already be Sara.

**Say:** "Sara just landed on her For You page. She typed nothing. Look at the URL, look at the page — there is no search box anywhere on this surface."

**Do:** Pause. Let the room scan the five sections.

**Say:** "Five personalized sections. Picks for her activity. Trail Club for prospects. Editor's picks for her region. New arrivals. Trip-planning guides. Every single section is the output of a retrieval query — and Sara didn't write any of them."

**Do:** Scroll to **Picks for your activity**. Click the **"Why this section · query + filters"** expander.

**Say:** "This is the actual `/find` body we sent to the retrieval engine. Read it with me."

**Do:** Read the visible JSON body aloud, verbatim — the query string, the filters, the labelset values. Slowly.

**Say:** "The AI wrote that query. Not Sara. Not a hard-coded rule in our code. The AI — given Sara's persona signals, her region, her activity profile — composed that retrieval body on the fly. That is the invisible query layer, and it's the thing nobody is shipping yet."

**Do:** Close the expander. Move to the header. Open the persona dropdown. Hover on **Mara** for a beat so the room sees the switch coming. Click **Mara**.

**Say:** "Mara is a Trail Club Pro member. Alpine Pro. EMEA. Watch the page."

**Do:** Stay silent for the recomposition. Two seconds max. The sections should reorder and recontent.

**Say:** "Different sections. Different products. The Crag XR — that's a Trail Club exclusive — just appeared. Sara never saw it. She's not entitled to it."

**Do:** Scroll to the loyalty section. Point at the header.

**Say:** "And look at this. For Sara, this section said *Why join Trail Club.* For Mara, it now reads *Trail Club Pro perks waiting for you.* Same component. Same code path. Completely different intent."

**Do:** Click the **"Why this section · query + filters"** expander on Mara's loyalty section.

**Say:** "Same expander. Different filter. The audience labelset flipped from `prospect` to `member_pro`. That one signal cascades through five sections, every product card, every CTA."

**Do:** Close the expander. Pause for two full beats.

**Say:** "Same page. Same code. Completely different intelligence. That is what an experience layer looks like."

> **What can go wrong:** Mara's sections render but the Crag XR doesn't appear in the first scroll. Recovery line: *"Crag XR sits in the second section — let me scroll."* Then scroll directly to it. Do not panic; it is always indexed.

---

## Scene 4 — Concierge / Two voices, one room (4:00–6:00 · 2 min)

**Do:** Flip persona back to **Sara**. Click **Concierge** in the nav. Open the floating chat (bottom right).

**Say:** "This is the concierge. Same retrieval engine. Conversational surface."

**Do:** Type into the chat: `what jacket do I need for Patagonia?`. Send.

**Say:** "Watch the response."

**Do:** Wait for the answer. It should be three sentences plus a pill CTA.

**Say:** "Three sentences. One pill. One action. That's the shopper voice. Sara is a prospect — she doesn't want a six-paragraph essay, she wants a recommendation and a button. The system knows that, because Sara's persona is in the retrieval context."

**Do:** Flip persona to **Mara**. Re-open the chat if it collapsed. Type the exact same question: `what jacket do I need for Patagonia?`. Send.

**Say:** "Same question. Watch what changes."

**Do:** Let the response stream. Four to six sentences, multiple inline citations.

**Say:** "Member voice. Longer. Expert. Multiple citations — every one of them clickable, every one of them grounded in a specific product page or trail guide in the KB. Mara is paying for Trail Club Pro. She's earned the expert."

**Do:** Open the language dropdown in the header. Switch to **Spanish**. Re-ask the same question in the chat: `what jacket do I need for Patagonia?`.

**Say:** "Same intelligence. Different language. I didn't translate the question — the system prepends a respond-in-Spanish instruction to the retrieval call. Zero prompt engineering from your team. Six languages out of the box."

**Do:** Let the Spanish response render. Pause.

**Say:** "One concierge. Two voices. Six languages. Same corpus, same key, same code."

**Do:** Switch language back to **English** before moving on.

> **What can go wrong:** Language switch doesn't take effect on the *next* chat send (stale context). Recovery line: *"Let me re-open the chat — language context refreshes on session start."* Close and re-open the floating chat, then re-ask.

---

## Scene 5 — Personalize / The AI as workflow engine (6:00–7:00 · 60s)

**Do:** Click **Personalize** in the nav. You'll see three tabs. Click **Adventure Plan** — stay on this tab the whole scene. **Do not touch the other tabs.**

**Say:** "This is the surface that changes the conversation with your CMO. Until now, AI in retail has been a chat answer or a search result. This is something else."

**Do:** Leave the defaults as-is. Click **Generate**.

**Say:** "Watch the right side."

**Do:** Wait for the JSON to render.

**Say:** "That is a structured payload. Schema-constrained. Validated. Every field is a known shape — destination, dates, gear list, day-by-day plan, upsell opportunities. This isn't a chat answer that a human has to interpret. This drops directly into Klaviyo, Braze, Salesforce Marketing Cloud — three lines of code on your side."

**Do:** Point at one of the gear list entries in the JSON.

**Say:** "The AI isn't just answering questions any more. It's operating. It's generating the inputs your downstream tools already know how to consume."

> **What can go wrong:** JSON has a missing field or a partial render. Recovery line: *"Schema validation is enforced — if a field is empty the call retries. Let me regenerate."* Click Generate again. It will land.

---

## Scene 6 — Abandoned Cart / Composite RAG engineering depth (7:00–7:45 · 45s)

**Do:** Click **Abandoned Cart** in the nav. The Sara fixture should be loaded by default.

**Say:** "Sara's cart. Three product pages viewed, abandoned at checkout, thirty-six hours ago. Standard winback trigger. Here's where the engineering gets interesting."

**Do:** Click **Generate winback**.

**Say:** "Watch the pipeline steps render in order."

**Do:** As each step appears, narrate it pointing at it on screen.

**Say:** "Step one — an initial `/ask` against the corpus. Step two — confidence evaluation; if the answer isn't grounded enough, we don't ship it. Step three — broaden the search with `/find` to pull more candidates. Step four — graph traversal across related products and guides. Step five — re-ask with the enriched context. Step six — schema-constrained JSON for the email payload."

**Do:** Wait for the final JSON to render.

**Say:** "That's the winback email. Subject line, body, CTA, three product recommendations with reasons. Ready for your ESP. No human wrote a word of it — but every word is grounded in the corpus and validated against schema."

> **What can go wrong:** Pipeline stalls between graph traversal and re-ask. Recovery line: *"Graph traversal is the most expensive step — about a second on a warm KB. Worth it."* Wait it out; do not refresh.

---

## Scene 7 — The Pull-Back (7:45–8:00 · 15s)

**Do:** Click the Aurora Outfitters logo (top left) to return to the homepage. Hands off the mouse. Look at the room, not the screen.

**Say (exact wording, do not paraphrase):** "In the last eight minutes, the AI wrote its own retrieval queries, served two different customers from the same corpus, spoke six languages, generated structured payloads for three different tools, and cited its sources every time. One API key. One knowledge base. No fine-tuning."

**Do:** Pause. Two full beats. Let it land. Then: "Questions."

> **What can go wrong:** Someone interrupts before the closing line. Recovery line: *"Let me close the loop first — thirty seconds — then I want every question you've got."* Then deliver the closing.

---

## Appendix — "If asked" Q&A

Six short, confident answers. Memorize these. Do not improvise.

**Q1. Which LLM is this running on?**
A: "It's BYO-LLM. Today we're on Azure OpenAI — you saw the badge in the header. Same demo runs on Vertex or Bedrock with a config flip. The retrieval layer is model-agnostic; you bring the LLM your security team has already approved."

**Q2. Where does the data live? Residency?**
A: "Single-tenant by region. EU corpus stays in EU — that's what the residency badge represents. We do not move customer data across regions. For regulated industries we ship a fully air-gapped variant on the customer's own infrastructure."

**Q3. How do you control hallucination?**
A: "Three layers. One, every answer is grounded in retrieval — the model only sees content from the corpus. Two, we score confidence on every response and refuse to ship low-confidence answers — you saw that in the abandoned-cart pipeline. Three, citations are mandatory; every claim is traceable to a source in the KB."

**Q4. Why not just fine-tune a model on the catalog?**
A: "Fine-tuning bakes the catalog into model weights. Every product change is a re-train. With RAG, when merchandising updates a CTA or adds a product, it's live in the next query. No training cycle. No drift. No frozen knowledge."

**Q5. What does a query cost?**
A: "Order of magnitude: low single-digit cents per query, blended across the surfaces you saw. The cheap surfaces — For You retrieval — are sub-cent. The expensive surfaces — composite RAG like abandoned cart — are higher. We can model it against your traffic in a follow-up."

**Q6. How long to onboard a new customer corpus?**
A: "Days, not months. Ingestion is API-driven. The field engineering — the CTAs, the labelsets, the audience tags — that's the work, and it's done by the customer's merchandising team in collaboration with our solutions engineers. Two weeks from kickoff to a working demo on the customer's own data is a realistic bar."

---

*End of script. Total runtime: 8:00. Breathe before Scene 7.*

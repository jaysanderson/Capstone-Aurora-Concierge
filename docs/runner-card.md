---
title: Aurora Concierge — Demo Runner Card
geometry: margin=0.5in
fontsize: 9pt
papersize: letter
---

## Aurora Concierge — Demo Runner Card

### Pre-flight (60s before)
- [ ] `https://capstone-aurora-concierge.fly.dev/` loaded, hard refresh done
- [ ] Persona dropdown set to **Sara** (Weekend Adventurer / NORAM)
- [ ] Language set to **English**, residency badge visible
- [ ] Browser zoom **110%**, devtools closed, notifications muted

### Scenes at a glance

| # | Time | Surface | Click sequence | Anchor line |
|---|------|---------|----------------|-------------|
| 1 | 0:00–1:00 | `/storefront` | Land -> point to AI summary card -> hover a product card -> tap a `content_type` chip | "The AI didn't guess — it retrieved." |
| 2 | 1:00–2:30 | `/for-you` | Scroll all 5 sections (Sara) -> expand one "Why this section" -> **flip persona to Mara** -> show Trail Club Plus / Crag XR section | "Same page. Same code. Completely different intelligence." |
| 3 | 2:30–4:00 | `/concierge` | Open chat -> ask shopper Q (Sara voice, 3 sentences + pill) -> flip to Mara, ask member Q (4–6 sentences + citations) -> **switch language to Spanish**, repeat | "Zero prompt engineering from you." |
| 4 | 4:00–5:30 | `/personalize` | Tab 1 Adventure Plan -> Tab 2 Loyalty -> Tab 3 Cross-Sell. Point at schema-constrained JSON each time | "Same retrieval engine. Structured output for any downstream system." |
| 5 | 5:30–6:30 | `/journey-graph` | Acknowledge empty state -> pivot: "Graph extraction is the next layer — disabled today while we tune the agent" | "RAG is the floor. Graph is the ceiling." |
| 6 | 6:30–8:00 | `/abandoned-cart` | Trigger pipeline -> narrate: ask -> confidence eval -> broaden via find -> graph traversal -> re-ask -> JSON | "That's the email. No human wrote it." |

### The 4 applause moments (recovery anchors if a scene falls flat)
- **Storefront:** "The AI didn't guess — it retrieved."
- **For You persona flip:** "Same page. Same code. Completely different intelligence."
- **Concierge language switch:** "Zero prompt engineering from you."
- **Abandoned Cart JSON:** "That's the email. No human wrote it."

### The closer (verbatim, memorize)

> In the last eight minutes you saw six surfaces, two personas, six languages, and one knowledge base. No fine-tuning. No model swap. No bespoke prompts hidden in the page. Every answer was retrieved, grounded, and cited — and every one of those surfaces is something your team could ship in a week. Aurora Concierge isn't a demo of what's possible. It's a demo of what's already running.

### If something breaks

| Symptom | Likely cause | Recovery line |
|---------|--------------|---------------|
| `/storefront` empty results | Progress Agentic RAG rate limit | "Let me ask it instead" — switch to floating chat |
| Chat doesn't stream | Network blip | Refresh + "The streaming layer hiccuped — production has retry" |
| `/for-you` sections empty | KB warmup | "This is grounded retrieval — when the corpus is cold it's transparent about it" |
| `/personalize` JSON malformed | Schema constraint too tight | "Switch destination" + regenerate |
| `/abandoned-cart` pipeline stalls | Composite timeout | Skip to the JSON output, narrate from there |

### "If asked" quick answers

| Question | One-liner |
|----------|-----------|
| Which LLM? | Gemini 2.5 Flash Lite (default — swappable via BYO-LLM dropdown) |
| Data residency? | EU KB in this build; tenant supports US, APAC |
| Hallucination risk? | Every answer cites — show the citations row |
| Fine-tuning required? | Zero — corpus + field engineering + retrieval design |
| Cost per query? | Sub-cent per `/ask` order of magnitude |
| Onboarding time? | 1 week to first production surface for a typical mid-market catalog |

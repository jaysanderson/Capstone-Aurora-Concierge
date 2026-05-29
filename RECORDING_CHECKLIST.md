# Aurora Concierge — 25-Minute Recording Checklist

## Pre-recording

- [ ] All six routes load without runtime errors against the live KB.
- [ ] `npm run verify:graph` reports nodes ≥ 150, relations ≥ 400.
- [ ] Field-engineered `callToAction` visible in storefront result cards and AI summaries.
- [ ] Two-voice floating chat works in both Sara and Mara modes.
- [ ] Multilingual switch flips the answer language for at least 3 of 6 languages.
- [ ] BYO-LLM toggle works for ≥2 of 3 providers.
- [ ] `/abandoned-cart` composite-RAG produces a structured winback within 15 seconds.

## Recording

- [ ] 1920×1080 minimum.
- [ ] Browser 100% zoom, no devtools.
- [ ] System notifications silenced.
- [ ] Floating chat positioned bottom-right; not obscuring storefront cards.

## The 6 beats (timed)

1. Hero + framing (0:00 — 1:30)
2. Storefront + floating chat (1:30 — 5:30)
3. Personalization workflows (5:30 — 10:30)
4. Journey graph (10:30 — 16:30)
5. Abandoned-cart composite RAG (16:30 — 22:00)
6. Close + invitation (22:00 — 25:00)

## Post-recording

- [ ] Two reviewers sign off.
- [ ] Upload to internal demo library.
- [ ] Train one other Progress SE.

## Common rerecord triggers

- Field-engineered CTA not visible on storefront cards.
- Persona toggle didn't visibly change chat voice.
- Composite RAG fell back to single-shot (threshold too low).
- Language switch didn't flip the answer language.
- Journey graph empty.

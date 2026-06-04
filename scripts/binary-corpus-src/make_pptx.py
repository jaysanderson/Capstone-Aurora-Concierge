#!/usr/bin/env python3
"""Build two PPTX files for the Aurora corpus.

Slide layout: title + content text. Uses python-pptx Title Layout (idx 1).
"""
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor


AURORA_NAVY = RGBColor(0x1a, 0x4a, 0x6b)
AURORA_SAND = RGBColor(0xc9, 0xa8, 0x7a)


def build_deck(out_path, slides):
    prs = Presentation()
    prs.slide_width = Inches(13.33)
    prs.slide_height = Inches(7.5)

    title_only_layout = prs.slide_layouts[5]   # Title Only
    title_content_layout = prs.slide_layouts[1]  # Title + Content
    blank_layout = prs.slide_layouts[6]

    # cover slide
    cover_title, cover_subtitle = slides[0]
    cover = prs.slides.add_slide(blank_layout)
    from pptx.util import Emu
    # background colour
    from pptx.oxml.ns import qn
    bg_fill = cover.background.fill
    bg_fill.solid()
    bg_fill.fore_color.rgb = AURORA_NAVY

    from pptx.util import Inches as I
    title_box = cover.shapes.add_textbox(I(0.8), I(2.6), I(11.5), I(1.8))
    tf = title_box.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = cover_title
    p.font.name = 'Helvetica'
    p.font.size = Pt(44)
    p.font.bold = True
    p.font.color.rgb = RGBColor(0xff, 0xff, 0xff)

    sub_box = cover.shapes.add_textbox(I(0.8), I(4.6), I(11.5), I(1.0))
    sub_tf = sub_box.text_frame
    sub_tf.word_wrap = True
    sp = sub_tf.paragraphs[0]
    sp.text = cover_subtitle
    sp.font.name = 'Helvetica'
    sp.font.size = Pt(22)
    sp.font.color.rgb = AURORA_SAND

    # content slides
    for title_text, bullets in slides[1:]:
        slide = prs.slides.add_slide(title_content_layout)
        title = slide.shapes.title
        title.text = title_text
        for run in title.text_frame.paragraphs[0].runs:
            run.font.color.rgb = AURORA_NAVY
            run.font.bold = True
            run.font.size = Pt(32)

        body = slide.placeholders[1]
        tf = body.text_frame
        tf.word_wrap = True
        for i, b in enumerate(bullets):
            if i == 0:
                p = tf.paragraphs[0]
            else:
                p = tf.add_paragraph()
            p.text = b
            p.font.size = Pt(18)
            p.font.name = 'Helvetica'
            p.font.color.rgb = RGBColor(0x22, 0x22, 0x22)

    prs.save(out_path)
    print(f"Generated {out_path}")


# Trail Club Pro Welcome Deck — 8 slides
trail_club_pro = [
    ("Welcome to Trail Club Pro",
     "Aurora Outfitters · Your concierge for life on trail"),
    ("Your Trail Club Pro benefits", [
        "Unlimited free Repair-for-Life repairs across every Aurora product you own",
        "Two-business-day repair turnaround SLA — held even during peak season",
        "Annual gear credit of $300 toward any product in the Aurora line",
        "Free ambassador-led fitting sessions, unlimited",
        "Priority queue routing through the Portland and Annecy repair centres",
        "Exclusive access to the Aurora Crag XR climbing harness — Trail Club Plus and Pro only",
    ]),
    ("Ambassador day bookings", [
        "Book a one-on-one field day with Mara Chen, Jonah Reyes, Dr Anya Patel, or Theo Sundberg",
        "Two ambassador days included annually with your Pro membership",
        "Mara — alpine and thru-hiking specialism; based seasonally in Patagonia and Tour du Mont Blanc",
        "Jonah — Triple Crown thru-hiking; Continental Divide Trail and Pacific Crest Trail expertise",
        "Anya — sizing-profile assessment, gear-fit specialist, on-trail injury prevention",
        "Theo — multi-pitch sport and alpine climbing, based in Chamonix",
    ]),
    ("Repair queue priority", [
        "Pro members route directly to a dedicated repair team",
        "Two-business-day SLA on every repair — Portland for the Americas and APAC, Annecy for EMEA",
        "If we exceed SLA, you receive a 10% credit on the original product price",
        "Submit repairs via your Trail Club portal — no receipt, no SKU lookup, we know your purchase history",
        "Track status at every stage: received, assessed, in-repair, shipped",
    ]),
    ("Crag XR exclusive access", [
        "The Aurora Crag XR climbing harness is exclusive to Trail Club Plus and Pro members",
        "Built for multi-pitch sport and alpine climbing",
        "Trail-Tested by Experts: Theo Sundberg has worn it through every alpine course he has taught for three seasons",
        "Free pack-fitting and harness-fitting session included when you order through Pro",
        "Seven-year safety-rated service life; covered under Repair-for-Life inside that window",
    ]),
    ("Annual gear credit", [
        "$300 in gear credit applied to your account each calendar year",
        "Use it toward any Aurora product — TerraTrek 7, Skyline 45L, Helios, Cumulus 2P, Quill 850, Crag XR, Stratus 1P",
        "Credit rolls over once: unused 2028 credit can be applied through 2029",
        "Stackable with seasonal sale pricing",
        "Apply at checkout in your Trail Club portal",
    ]),
    ("How to redeem", [
        "Log into your Trail Club portal at aurora-outfitters.example.com/trail-club",
        "Book ambassador days from the Ambassadors panel; calendar integration with Google and Apple",
        "Submit repairs from the Repairs panel; print the prepaid shipping label",
        "Order the Crag XR or any Pro-exclusive product from the Pro-only catalogue",
        "Track your gear credit balance under Account → Benefits",
    ]),
    ("Contact your concierge", [
        "Trail Club Pro priority line: +1 (503) 555-AURA",
        "Concierge email (general): concierge@aurora-outfitters.example.com",
        "EU enquiries: trailclub.eu@aurora-outfitters.example.com (Annecy)",
        "Average concierge response time for Pro members: under 90 minutes during business hours",
        "Welcome aboard — your concierge will be in touch within 48 hours of activation",
    ]),
]

# Aurora Brand Narrative Deck — 10 slides
brand_narrative = [
    ("Aurora Outfitters",
     "Built for the Worst Weather · Trail-Tested by Experts · Repairable for Life · Carbon-Negative by 2030"),
    ("Aurora at a glance", [
        "Outdoor brand designing four-season gear for serious customers",
        "Seven hero products across boots, packs, jackets, tents, quilts, and harnesses",
        "Four ambassadors who field-test every production run",
        "Repair-for-Life programme operationalised through Trail Club tiers",
        "Carbon-Negative by 2030 — year three of the public commitment",
        "Direct-to-consumer plus selected outdoor specialist retailers",
    ]),
    ("The four pillars", [
        "Built for the Worst Weather — 200 mm sustained waterproof ratings; field-tested in Patagonia and Tasmania",
        "Trail-Tested by Experts — every production run goes to Mara, Jonah, Anya, or Theo before customers see it",
        "Repairable for Life — every component is field-serviceable or factory-replaceable",
        "Carbon-Negative by 2030 — year-three impact report shows on-track Scope 1 and 2; Scope 3 in flight",
    ]),
    ("Built for the Worst Weather", [
        "Aurora TerraTrek 7: 200 mm sustained waterproof; full-grain leather upper; GripCore outsole on wet rock",
        "Aurora Helios jacket: warmest down jacket Aurora makes; 41% recycled content",
        "Aurora Cumulus 2P tent: 52% recycled-nylon fly; bio-based DAC poles; tested in Patagonian katabatic wind",
        "Aurora Quill 850 quilt: 850 fill power; RDS-certified recycled down; carried by Jonah Reyes on the CDT",
    ]),
    ("Trail-Tested by Experts", [
        "Mara Chen — alpine guide, 15 years; 60-day TerraTrek 7 test across Tasmania, Patagonia, Tour du Mont Blanc",
        "Jonah Reyes — Triple Crown thru-hiker; Quill 850 production-run test on the Continental Divide Trail",
        "Dr Anya Patel — sports physiologist; sizing-profile assessment lead",
        "Theo Sundberg — 22 years teaching alpine climbing in Chamonix; Crag XR field testing",
    ]),
    ("Repairable for Life", [
        "Two repair centres: Portland (Americas, APAC) and Annecy (EMEA)",
        "14,200 repairs completed in 2028; 255,600 kg CO2-equivalent avoided",
        "Trail Club Standard: 1 free repair per product, lifetime; 10-day SLA",
        "Trail Club Plus: free first repair per year; 5-day SLA",
        "Trail Club Pro: unlimited free repairs; 2-day SLA",
    ]),
    ("Carbon-Negative by 2030", [
        "2025 baseline emissions: 1,840 Scope 1 + 4,260 Scope 2 + 38,400 Scope 3 (tCO2e)",
        "2028 actuals: 1,120 Scope 1 + 2,180 Scope 2 + 31,200 Scope 3",
        "Recycled content across product line: 18% (2025) → 34% (2028) → 65% (2030 target)",
        "Ambassador travel: 100% offset at 1.5x via direct removal credits",
        "Scope 3 supplier decarbonisation is the open challenge — 2029 acceleration",
    ]),
    ("Our ambassadors", [
        "Four ambassadors who shape product development through field use",
        "Mara Chen — alpine guide, three field seasons annually",
        "Jonah Reyes — thru-hiker, Triple Crown completed across Aurora gear",
        "Dr Anya Patel — sports physiologist and gear-fit specialist; runs sizing-profile clinics",
        "Theo Sundberg — alpine climbing instructor; Chamonix-based",
    ]),
    ("Hero product line", [
        "Aurora TerraTrek 7 — four-season hiking boot — $248 — for Day Hiking, Thru-Hiking",
        "Aurora Skyline 45L — multi-day pack — $215 — for Thru-Hiking",
        "Aurora Helios — down jacket — $312 — for Alpine Pro, Thru-Hiker in shoulder season",
        "Aurora Cumulus 2P — two-person tent — $425 — for Thru-Hiking, Alpine Climbing",
        "Aurora Quill 850 — sleeping quilt — $365 — for Thru-Hiking",
        "Aurora Crag XR — climbing harness — $158 — Trail Club Plus exclusive; Multi-Pitch Sport, Alpine Climbing",
        "Aurora Stratus 1P — solo tent — $325 — for Thru-Hiking solo, Alpine Pro",
    ]),
    ("Customer segments", [
        "Weekend Adventurer — 1-3 night trips; comfort-first; Trail Club Standard",
        "Thru-Hiker — multi-week continuous trail; performance-driven; Trail Club Plus typical",
        "Alpine Pro — technical alpine climbing; expert base; Trail Club Pro typical",
        "Three loyalty tiers map to these segments — Standard, Plus, Pro",
    ]),
    ("Where to buy", [
        "Direct: aurora-outfitters.example.com",
        "Retail partners: selected outdoor specialists; full list at aurora-outfitters.example.com/stores",
        "Trail Club membership is free to join at Standard tier; Plus and Pro tier upgrades unlock the full benefit set",
        "Concierge support across every tier for fitting, pairing, and trip-planning advice",
        "Contact: concierge@aurora-outfitters.example.com",
    ]),
]


import os, sys
out_dir = sys.argv[1] if len(sys.argv) > 1 else '.'
build_deck(os.path.join(out_dir, 'trail-club-pro-welcome-deck.pptx'), trail_club_pro)
build_deck(os.path.join(out_dir, 'aurora-brand-narrative-deck.pptx'), brand_narrative)

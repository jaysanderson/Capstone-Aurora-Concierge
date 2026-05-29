#!/usr/bin/env python3
"""
Aurora data-augmentation Graph extraction agent spec.

Run via:
  python scripts/graph-agent.py --print   # print the schema as JSON
  python scripts/graph-agent.py --apply   # POST to ARAG
"""

import json
import os
import sys
import urllib.request

ENTITY_TYPES = [
    {"name": "PRODUCT", "description": "An Aurora Outfitters product (Aurora TerraTrek 7, Aurora Skyline 45L, Aurora Helios, Aurora Cumulus 2P, Aurora Quill 850, Aurora Crag XR)."},
    {"name": "CATEGORY", "description": "A product category (Hiking Boots, Multi-Day Packs, Down Insulation, Tents, Sleeping Quilts, Climbing Harnesses)."},
    {"name": "ACTIVITY", "description": "An outdoor activity (Day Hiking, Thru-Hiking, Alpine Climbing, Bikepacking)."},
    {"name": "DESTINATION", "description": "A destination / route (Tasmania Overland Track, Patagonia W Trek, Tour du Mont Blanc, Annapurna Circuit, Yosemite High Sierra)."},
    {"name": "AMBASSADOR", "description": "An Aurora Outfitters ambassador (Mara Chen, Jonah Reyes, Dr Anya Patel, Theo Sundberg)."},
    {"name": "CONTENT", "description": "A piece of content (trail guide, blog, video, podcast)."},
    {"name": "CUSTOMER_SEGMENT", "description": "A customer segment (Weekend Adventurer, Thru-Hiker, Alpine Pro)."},
    {"name": "LOYALTY_TIER", "description": "A Trail Club tier (Standard, Plus, Pro)."},
    {"name": "BRAND_PILLAR", "description": "A brand pillar (Built for the Worst Weather, Trail-Tested by Experts, Repairable for Life, Carbon-Negative by 2030)."},
    {"name": "SIZING_PROFILE", "description": "A sizing profile (Standard, Wide Foot, Narrow Foot, High Arch)."},
]

RELATION_TYPES = [
    {"name": "recommended_for", "domain": "PRODUCT", "range": "ACTIVITY", "description": "Product recommended for activity."},
    {"name": "suited_to", "domain": "PRODUCT", "range": "DESTINATION", "description": "Product suited to destination."},
    {"name": "worn_by", "domain": "PRODUCT", "range": "AMBASSADOR", "description": "Product worn / used by ambassador."},
    {"name": "fits", "domain": "PRODUCT", "range": "SIZING_PROFILE", "description": "Product fits a sizing profile."},
    {"name": "pairs_with", "domain": "PRODUCT", "range": "PRODUCT", "description": "Product cross-sells with another product."},
    {"name": "alternative_to", "domain": "PRODUCT", "range": "PRODUCT", "description": "Product is a substitute for another product."},
    {"name": "featured_in", "domain": "PRODUCT", "range": "CONTENT", "description": "Product featured in a piece of content."},
    {"name": "written_by", "domain": "CONTENT", "range": "AMBASSADOR", "description": "Content authored by ambassador."},
    {"name": "exclusive_to", "domain": "PRODUCT", "range": "LOYALTY_TIER", "description": "Product exclusive to a Trail Club tier."},
    {"name": "embodies", "domain": "PRODUCT", "range": "BRAND_PILLAR", "description": "Product embodies a brand pillar."},
    {"name": "prefers", "domain": "CUSTOMER_SEGMENT", "range": "CATEGORY", "description": "Segment prefers a category."},
    {"name": "requires", "domain": "ACTIVITY", "range": "CATEGORY", "description": "Activity requires a category of product."},
]

AGENT_SCHEMA = {
    "name": "aurora-journey-graph-agent",
    "description": "Aurora customer-journey graph extraction agent.",
    "entity_types": ENTITY_TYPES,
    "relation_types": RELATION_TYPES,
    "config": {
        "extract_from_text_fields": True,
        "extract_from_metadata": True,
        "use_byo_llm": True,
        "batch_size": 16,
    },
}


def usage():
    print(__doc__)
    sys.exit(0)


def env_required(name):
    v = os.environ.get(name)
    if not v or v.startswith("paste-"):
        print(f"Missing env var {name}.", file=sys.stderr)
        sys.exit(1)
    return v


def apply():
    api_url = env_required("NUCLIA_API_URL")
    kb_id = env_required("NUCLIA_KB_ID")
    api_key = env_required("NUCLIA_API_KEY")
    url = f"{api_url}/kb/{kb_id}/agents"
    body = json.dumps({"kind": "graph_extraction", **AGENT_SCHEMA}).encode("utf-8")
    req = urllib.request.Request(
        url, data=body,
        headers={"X-NUCLIA-SERVICEACCOUNT": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            print(f"{resp.status} {resp.reason}")
            print(resp.read().decode("utf-8")[:2000])
    except urllib.error.HTTPError as e:
        print(f"{e.code} {e.reason}", file=sys.stderr)
        print(e.read().decode("utf-8", errors="replace")[:2000], file=sys.stderr)
        sys.exit(1)


def main():
    args = sys.argv[1:]
    if not args or args[0] in ("-h", "--help"): usage()
    if args[0] == "--print": print(json.dumps(AGENT_SCHEMA, indent=2))
    elif args[0] == "--apply": apply()
    else: usage()


if __name__ == "__main__": main()

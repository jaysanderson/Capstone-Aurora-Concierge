#!/usr/bin/env bash
# generate-binary-corpus.sh — reproducibly generate the 10 binary corpus files.
#
# Outputs 2 PDF, 2 DOCX, 2 PPTX, 2 MP3, 2 MP4 with Aurora-aligned content into
# corpus/content_type/<folder>/. Used to refresh the diverse-format sample
# corpus that ships alongside the 38 markdown files.
#
# Local dependencies:
#   - macOS (uses `say` for TTS)
#   - ffmpeg (brew install ffmpeg)
#   - pandoc (brew install pandoc) — currently only used as a reference; the
#     PDF + DOCX paths in this version go through reportlab + python-pptx
#   - Python 3 with: pillow, reportlab, python-pptx (in a venv)
#
# The actual generation logic lives in three Python helpers + script files
# under scripts/binary-corpus-src/. Edit those files to change content; run
# this script to regenerate.
#
# Usage:  bash scripts/generate-binary-corpus.sh
#
# Notes:
#   - macOS `say` voices used: Ava (Mara), Tom (Jonah), Karen (Anya), Daniel (Theo).
#     List available voices with `say -v ?`. Swap voice names below if needed.
#   - To use ElevenLabs or another TTS, replace the `say` block with an API call
#     that writes a WAV/AIFF; the rest of the pipeline is unchanged.
#   - To swap the static brand background for a designed asset, replace
#     scripts/binary-corpus-src/make_bg.py with a script that writes the same
#     1920x1080 PNG output paths.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC_DIR="$REPO_ROOT/scripts/binary-corpus-src"
OUT_DIR="$REPO_ROOT/corpus/content_type"
WORK_DIR="$(mktemp -d -t aurora-corpus-XXXXXX)"
VENV="$WORK_DIR/venv"

echo "🪶  Aurora binary corpus generator"
echo "    repo root: $REPO_ROOT"
echo "    work dir:  $WORK_DIR"
echo

# --- Python venv ---
python3 -m venv "$VENV"
# shellcheck source=/dev/null
source "$VENV/bin/activate"
pip install --quiet pillow reportlab python-pptx

# --- PDFs (reportlab via md_to_pdf.py) ---
echo "📄  Generating PDFs..."
mkdir -p "$WORK_DIR/out"
python "$SRC_DIR/md_to_pdf.py" "$SRC_DIR/terratrek-7-field-report.md" "$WORK_DIR/out/terratrek-7-field-report.pdf"
python "$SRC_DIR/md_to_pdf.py" "$SRC_DIR/sizing-guide-printable.md" "$WORK_DIR/out/sizing-guide-printable.pdf"

# --- DOCX (pandoc) ---
echo "📝  Generating DOCX..."
pandoc "$SRC_DIR/warranty-and-repair-policy.md" -o "$WORK_DIR/out/warranty-and-repair-policy.docx"
pandoc "$SRC_DIR/2028-sustainability-impact-report.md" -o "$WORK_DIR/out/2028-sustainability-impact-report.docx"

# --- PPTX (python-pptx via make_pptx.py) ---
echo "📊  Generating PPTX..."
python "$SRC_DIR/make_pptx.py" "$WORK_DIR/out"

# --- Brand backgrounds for MP4 ---
echo "🎨  Generating brand backgrounds..."
python "$SRC_DIR/make_bg.py" "Mara Chen" "Ambassador Field Notes" "$WORK_DIR/out/bg-mara.png"
python "$SRC_DIR/make_bg.py" "Jonah Reyes" "Ambassador Field Notes" "$WORK_DIR/out/bg-jonah.png"

# --- Voiceovers (macOS say) ---
echo "🗣  Generating voiceovers via macOS say..."
say -v "Ava"    -f "$SRC_DIR/mara-chen-mp4-script.txt"       -o "$WORK_DIR/out/mara-voice.aiff"
say -v "Tom"    -f "$SRC_DIR/jonah-reyes-mp4-script.txt"     -o "$WORK_DIR/out/jonah-voice.aiff"
say -v "Karen"  -f "$SRC_DIR/anya-patel-mp3-script.txt"      -o "$WORK_DIR/out/anya-voice.aiff"
say -v "Daniel" -f "$SRC_DIR/theo-sundberg-mp3-script.txt"   -o "$WORK_DIR/out/theo-voice.aiff"

# --- MP3 podcasts (ffmpeg AIFF → MP3) ---
echo "🎙  Generating MP3 podcasts..."
ffmpeg -y -loglevel error -i "$WORK_DIR/out/anya-voice.aiff" -codec:a libmp3lame -qscale:a 4 "$WORK_DIR/out/anya-patel-on-gear-fit.mp3"
ffmpeg -y -loglevel error -i "$WORK_DIR/out/theo-voice.aiff" -codec:a libmp3lame -qscale:a 4 "$WORK_DIR/out/theo-sundberg-alpine-stories.mp3"

# --- MP4 talking-head-style (ffmpeg muxes still + voiceover) ---
echo "🎬  Generating MP4 videos..."
ffmpeg -y -loglevel error -loop 1 -i "$WORK_DIR/out/bg-mara.png" -i "$WORK_DIR/out/mara-voice.aiff" \
  -c:v libx264 -tune stillimage -c:a aac -b:a 128k -pix_fmt yuv420p -shortest \
  "$WORK_DIR/out/mara-chen-terratrek-field-test.mp4"
ffmpeg -y -loglevel error -loop 1 -i "$WORK_DIR/out/bg-jonah.png" -i "$WORK_DIR/out/jonah-voice.aiff" \
  -c:v libx264 -tune stillimage -c:a aac -b:a 128k -pix_fmt yuv420p -shortest \
  "$WORK_DIR/out/jonah-reyes-cdt-thru-hike.mp4"

# --- Place into corpus content_type/ folders ---
echo "📦  Placing files into corpus/content_type/..."
mkdir -p "$OUT_DIR/podcast"

cp "$WORK_DIR/out/terratrek-7-field-report.pdf"          "$OUT_DIR/gear_review/"
cp "$WORK_DIR/out/sizing-guide-printable.pdf"            "$OUT_DIR/support/"
cp "$WORK_DIR/out/warranty-and-repair-policy.docx"       "$OUT_DIR/support/"
cp "$WORK_DIR/out/2028-sustainability-impact-report.docx" "$OUT_DIR/brand_story/"
cp "$WORK_DIR/out/trail-club-pro-welcome-deck.pptx"      "$OUT_DIR/loyalty_benefit/"
cp "$WORK_DIR/out/aurora-brand-narrative-deck.pptx"      "$OUT_DIR/brand_story/"
cp "$WORK_DIR/out/mara-chen-terratrek-field-test.mp4"    "$OUT_DIR/ambassador_video/"
cp "$WORK_DIR/out/jonah-reyes-cdt-thru-hike.mp4"         "$OUT_DIR/ambassador_video/"
cp "$WORK_DIR/out/anya-patel-on-gear-fit.mp3"            "$OUT_DIR/podcast/"
cp "$WORK_DIR/out/theo-sundberg-alpine-stories.mp3"      "$OUT_DIR/podcast/"

echo
echo "✅  Done. 10 binary files placed into $OUT_DIR/<folder>/"
echo "    Remember: mirror to the framework copies after committing here."
echo "    Cleanup: rm -rf $WORK_DIR"

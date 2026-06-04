#!/bin/sh
# Generate /config.js from the container's environment (Fly secrets are injected
# as env vars at runtime). Runs via the nginx image's /docker-entrypoint.d hook
# BEFORE nginx starts, so the static SPA reads its Nuclia config at runtime
# instead of having it baked in at Docker-build time. Empty/unset vars are
# omitted, so the app falls back to any build-time values for local use.
set -eu

CONFIG="${AURORA_CONFIG_PATH:-/usr/share/nginx/html/config.js}"
TMP="$(mktemp)"

# Minimal JSON string escaper (these values — URL, UUID, JWT — contain no
# newlines; guard backslash and double-quote just in case).
esc() {
  printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'
}

{
  printf '// Generated at container startup by aurora-runtime-config.sh — do not edit.\n'
  printf 'window.__AURORA_ENV__ = {\n'
  for name in \
    VITE_NUCLIA_API_URL \
    VITE_NUCLIA_KB_ID \
    VITE_NUCLIA_API_KEY \
    VITE_AURORA_REGION \
    VITE_BYO_LLM_PROVIDERS \
    VITE_BYO_LLM_DEFAULT \
    VITE_LANGUAGES; do
    eval "value=\${$name:-}"
    if [ -n "$value" ]; then
      printf '  "%s": "%s",\n' "$name" "$(esc "$value")"
    fi
  done
  printf '};\n'
} > "$TMP"

mv "$TMP" "$CONFIG"
# mktemp creates mode 600 owned by root; the nginx worker runs as the unprivileged
# 'nginx' user and would get 403 trying to read it. Make it world-readable.
chmod 644 "$CONFIG"
count="$(grep -c '": "' "$CONFIG" 2>/dev/null || true)"
echo "aurora-runtime-config: wrote $CONFIG (${count:-0} vars)"

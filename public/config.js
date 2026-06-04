// Runtime config placeholder.
//
// In production, the container entrypoint (scripts/aurora-runtime-config.sh,
// wired via Docker into /docker-entrypoint.d) OVERWRITES this file at startup
// with the machine's env / Fly secrets:
//   window.__AURORA_ENV__ = { "VITE_NUCLIA_API_URL": "...", ... };
//
// For local `npm run dev` it stays empty, so src/lib/env.ts falls back to
// Vite's build-time import.meta.env (your local .env). Do not put secrets here.
window.__AURORA_ENV__ = window.__AURORA_ENV__ || {};

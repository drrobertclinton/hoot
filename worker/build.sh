#!/bin/sh
# Builds worker/hoot-worker.js: one file to paste into the Cloudflare dashboard.
cd "$(dirname "$0")/.." && npx -y esbuild@0.24.0 worker/entry.mjs --bundle --format=esm --platform=neutral \
  --main-fields=module,main --banner:js='globalThis.process ??= { env: {} };' \
  --alias:@anthropic-ai/sdk=./worker/sdk-shim.mjs --alias:node:crypto=./worker/crypto-shim.mjs \
  --outfile=worker/hoot-worker.js

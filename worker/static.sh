#!/bin/sh
# Copies public/ into $1 for hosting under a sub-folder (vilasi.co/apps/hoot/),
# with relative, extensionless links (the host serves pages without .html)
# and the API pointed at the Cloudflare Worker.
API="${HOOT_API:-https://hoot-tutor.robert-1f2.workers.dev}"
OUT="$1"; mkdir -p "$OUT"
cd "$(dirname "$0")/../public"
for f in *.html maker.js style.css; do
  sed -e 's#"/style.css"#"style.css"#g; s#"/maker.js"#"maker.js"#g; s#"/curriculum.mjs"#"./curriculum.js"#g' \
      -e 's#\([="]\)/\{0,1\}\(privacy\|teacher\|kinboard\|tutor\|k5\|6-12\|snapdeck\)\.html#\1\2#g; s#"/?#"./?#g; s#href="/"#href="./"#g; s#url=/?#url=./?#g' \
      -e 's#`/tutor\.html#`tutor#g; s#${location.origin}/teacher\.html#${location.origin + location.pathname.replace(/[^/]*$/, "")}teacher#g' \
      -e "s#<script src=\"maker.js\"></script>#<script>window.HOOT_API=\"$API\"</script><script src=\"maker.js\"></script>#" \
      "$f" > "$OUT/$f"
done
cp curriculum.mjs "$OUT/curriculum.js"

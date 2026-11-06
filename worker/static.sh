#!/bin/sh
# Copies public/ into $1 for hosting under a sub-folder (vilasi.co/apps/hoot/),
# with relative links and the API pointed at the Cloudflare Worker.
API="${HOOT_API:-https://hoot-tutor.robert-1f2.workers.dev}"
OUT="$1"; mkdir -p "$OUT"
cd "$(dirname "$0")/../public"
for f in *.html maker.js style.css; do
  sed -e 's#"/style.css"#"style.css"#g; s#"/maker.js"#"maker.js"#g; s#"/curriculum.mjs"#"./curriculum.js"#g' \
      -e 's#"/\(privacy\|teacher\|kinboard\|tutor\|index\)\.html#"\1.html#g; s#"/?#"./?#g; s#href="/"#href="./"#g' \
      -e "s#<script src=\"maker.js\"></script>#<script>window.HOOT_API=\"$API\"</script><script src=\"maker.js\"></script>#" \
      "$f" > "$OUT/$f"
done
cp curriculum.mjs "$OUT/curriculum.js"

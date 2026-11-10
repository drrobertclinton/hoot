// Bundles cloudflare/worker.mjs into dist/worker.js (one file) with esbuild.
import { build } from "esbuild";
await build({
  entryPoints: ["cloudflare/worker.mjs"], bundle: true, format: "esm", platform: "neutral",
  outfile: "dist/worker.js", minify: true, mainFields: ["module", "main"], conditions: ["workerd", "worker", "browser"],
  external: ["node:*"], loader: { ".html": "text", ".css": "text" },
  plugins: [{ name: "curriculum-text", setup(b) {
    b.onResolve({ filter: /\.raw$/ }, a => ({ path: a.resolveDir + "/" + a.path.replace(/\.raw$/, ""), namespace: "raw" }));
    b.onLoad({ filter: /.*/, namespace: "raw" }, async a => ({ contents: await (await import("node:fs/promises")).readFile(a.path, "utf8"), loader: "text" }));
  } }],
});
console.log("built dist/worker.js");

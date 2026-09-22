import { readFileSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";

// Build artifacts, not network transfer or hydration measurements.
const { pages } = JSON.parse(readFileSync(".next/app-build-manifest.json", "utf8"));
for (const route of ["/exam/[level]/[slug]/page", "/(main)/vocabulary/topics/[collection]/page"]) {
  const files = pages[route].filter(file => file.endsWith(".js"));
  console.log(JSON.stringify({ route, rawBytes: files.reduce((sum, file) => sum + statSync(`.next/${file}`).size, 0),
    gzipBytes: files.reduce((sum, file) => sum + gzipSync(readFileSync(`.next/${file}`)).length, 0), files }));
}

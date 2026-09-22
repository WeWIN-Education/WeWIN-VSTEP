import http from "node:http";
import https from "node:https";
import { performance } from "node:perf_hooks";
import { gunzipSync, brotliDecompressSync } from "node:zlib";

// Read-only, anonymous probes: no cookies, authorization, redirects or body logging.
let origin;
try {
  origin = new URL(process.argv[2]);
  if (!["http:", "https:"].includes(origin.protocol) || origin.username || origin.password || origin.search || origin.hash || origin.pathname !== "/") throw new Error();
} catch {
  console.error("Supply only an HTTP(S) origin without credentials or query parameters.");
  process.exit(1);
}
const paths = ["/legal/privacy", "/api/auth/providers", "/history", "/api/vocabulary/entries?mode=notebook", "/api/manage/materials/list", "/api/exams/attempts/phase5-probe/grade"];
for (const path of paths) for (const encoding of ["identity", "gzip", "br"]) {
  const start = performance.now();
  try {
    const sample = await new Promise((resolve, reject) => {
      const request = (origin.protocol === "https:" ? https : http).get(new URL(path, origin), { headers: { "Accept-Encoding": encoding }, agent: false }, response => {
        const ttfbMs = performance.now() - start;
        const chunks = []; let bytes = 0;
        response.on("data", chunk => {
          bytes += chunk.length;
          if (bytes > 2 * 1024 * 1024) request.destroy(new Error("Response limit exceeded"));
          else chunks.push(chunk);
        });
        response.on("error", reject);
        response.on("end", () => {
          try {
            const wire = Buffer.concat(chunks);
            const codec = response.headers["content-encoding"];
            const options = { maxOutputLength: 8 * 1024 * 1024 };
            const decoded = codec === "gzip" ? gunzipSync(wire, options) : codec === "br" ? brotliDecompressSync(wire, options) : wire;
            const headers = Object.fromEntries(["content-encoding", "vary", "cache-control", "content-type", "content-length", "x-vercel-cache"].map(name => [name, response.headers[name] ?? null]));
            resolve({ path, requestedEncoding: encoding, status: response.statusCode, headers, encodedBodyBytes: wire.length,
              decodedBodyBytes: decoded.length, ttfbMs: Math.round(ttfbMs), totalMs: Math.round(performance.now() - start) });
          } catch { reject(new Error("Cannot decode response")); }
        });
      });
      const timeout = setTimeout(() => request.destroy(new Error("Probe deadline exceeded")), 15_000);
      request.on("close", () => clearTimeout(timeout));
      request.on("error", reject);
    });
    console.log(JSON.stringify(sample));
  } catch {
    console.log(JSON.stringify({ path, requestedEncoding: encoding, error: "PROBE_FAILED" }));
  }
}

import { createInterface } from "node:readline";
import { baselineMeasurement, summarizeBaseline } from "../src/lib/performance-baseline";

async function main() {
  const groups = new Map<string, number[]>();
  let ignoredLines = 0;
  for await (const line of createInterface({ input: process.stdin, crlfDelay: Infinity })) {
    try {
      const parsed = JSON.parse(line);
      const row = parsed?.event === "performance_baseline"
        ? baselineMeasurement(parsed.metric, parsed.durationMs) : null;
      if (!row) { ignoredLines++; continue; }
      const values = groups.get(row.metric) ?? [];
      values.push(row.durationMs);
      groups.set(row.metric, values);
    } catch { ignoredLines++; }
  }
  console.log(JSON.stringify({
    metrics: Object.fromEntries([...groups].map(([metric, values]) => [metric, summarizeBaseline(values)])),
    ignoredLines,
  }, null, 2));
  if (!groups.size) process.exitCode = 1;
}

void main().catch(() => { console.error("Baseline input could not be read."); process.exitCode = 1; });

const METRICS = new Set([
  "battle.command", "battle.queue_wait",
  "db.query", "grading.examiner", "grading.reviewer", "grading.repair", "grading.transcription",
]);

export function baselineSampleRate() {
  const rate = Number(process.env.PERF_BASELINE_SAMPLE_RATE ?? 0);
  return Number.isFinite(rate) && rate > 0 && rate <= 1 ? rate : 0;
}

export function baselineMeasurement(metric: unknown, durationMs: unknown) {
  if (typeof metric !== "string" || !METRICS.has(metric)
    || typeof durationMs !== "number" || !Number.isFinite(durationMs) || durationMs < 0) return null;
  return { event: "performance_baseline", metric, durationMs };
}

export function recordBaseline(metric: string, durationMs: number) {
  const rate = baselineSampleRate();
  if (!rate || Math.random() >= rate) return;
  const measurement = baselineMeasurement(metric, durationMs);
  if (!measurement) return;
  // Observability must never fail a query or a paid grading request.
  try { console.info(JSON.stringify(measurement)); } catch { /* best effort */ }
}

export function summarizeBaseline(values: number[]) {
  const sorted = values.filter(value => Number.isFinite(value) && value >= 0).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const percentile = (p: number) => sorted[Math.ceil(p * sorted.length) - 1];
  return {
    samples: sorted.length,
    p50Ms: percentile(0.5),
    p95Ms: percentile(0.95),
    maxMs: sorted[sorted.length - 1],
    insufficientSamples: sorted.length < 100,
  };
}

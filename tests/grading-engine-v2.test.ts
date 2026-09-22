import { describe, expect, it, vi } from "vitest";
import {
  aggregateSpeakingV2,
  configuredMaxGradingAttempts,
  configuredReviewThreshold,
  gradeSpeakingV2,
  gradeWritingV2,
  isVietnameseFeedback,
  type PipelineState,
  type ValidatedAudio,
} from "../src/lib/grading-v2";

const writingReport = (confidence = 0.9, score = 7) => ({
  scores: {
    task_fulfillment: { score, evidence: "Bai viet dung tu 'answer' de tra loi cau hoi.", why_not_higher: "Can phat trien y ro hon." },
    organization: { score, evidence: "Bai viet co bo cuc ro rang va lien ket 'answer' hop ly.", why_not_higher: "Mot so lien ket con don gian." },
    vocabulary: { score, evidence: "Bai viet dung tu 'answer' va tu vung phu hop.", why_not_higher: "Can mo rong cach dung tu." },
    grammar: { score, evidence: "Cau 'answer' co cau truc ro rang nhung con loi.", why_not_higher: "Can kiem soat cau phuc tap tot hon." },
  },
  confidence,
  direct_feedback_vi: { summary: "Bai viet dap ung de va can phat trien y ro hon." },
});

const englishWritingReport = (confidence = 0.9, score = 7) => ({
  scores: {
    task_fulfillment: { score, evidence: "The answer addresses the question.", why_not_higher: "Development is limited." },
    organization: { score, evidence: "The answer uses a clear progression.", why_not_higher: "Some links are basic." },
    vocabulary: { score, evidence: "The answer uses precise topic words.", why_not_higher: "Range can grow." },
    grammar: { score, evidence: "The answer controls common clauses.", why_not_higher: "Complex control is uneven." },
  },
  confidence,
  direct_feedback_vi: { summary: "The response is clear but needs more development." },
});

const speakingReport = (confidence = 0.9, score = 7, quality = "good") => ({
  audio: { quality },
  scores: {
    task_fulfillment: { score, evidence: "Phan tra loi dap ung cau hoi.", why_not_higher: "Vi du con ngan." },
    fluency_coherence: { score, evidence: "Bai noi co mach noi ro rang.", why_not_higher: "Con mot so lan ngap ngung." },
    vocabulary: { score, evidence: "Phan noi dung tu vung phu hop.", why_not_higher: "Can dung tu chinh xac hon." },
    grammar: { score, evidence: "Bai noi dung cau truc co ban.", why_not_higher: "Cau phuc tap con chua deu." },
    pronunciation: { score, evidence: "Phat am de hieu voi nguoi nghe.", why_not_higher: "Trong am can ro hon." },
  },
  confidence,
  direct_feedback_vi: { summary: "Bai noi de hieu va can luyen do troi chay them." },
});

const englishSpeakingReport = (confidence = 0.9, score = 7, quality = "good") => ({
  audio: { quality },
  scores: {
    task_fulfillment: { score, evidence: "The response answers the task.", why_not_higher: "Examples are brief." },
    fluency_coherence: { score, evidence: "Speech is continuous.", why_not_higher: "Some hesitation remains." },
    vocabulary: { score, evidence: "The response uses topic vocabulary.", why_not_higher: "More precision is possible." },
    grammar: { score, evidence: "The response controls basic clauses.", why_not_higher: "Complex forms vary." },
    pronunciation: { score, evidence: "The audio is intelligible.", why_not_higher: "Stress can be clearer." },
  },
  confidence,
  direct_feedback_vi: { summary: "The response is understandable but needs more fluency." },
});

function jsonResponse(value: unknown) {
  return new Response(JSON.stringify(value), { status: 200, headers: { "content-type": "application/json" } });
}

function mockFetch(responses: unknown[]) {
  const calls: Array<{ url: string; body?: string }> = [];
  const fetcher = async (input: string | URL | Request, init?: RequestInit) => {
    const body = typeof init?.body === "string" ? init.body : undefined;
    calls.push({ url: String(input), body });
    const response = responses.shift();
    return jsonResponse(response);
  };
  return { calls, fetcher };
}

const audio: ValidatedAudio = {
  wavBase64: Buffer.from("wav-audio").toString("base64"),
  durationSeconds: 4,
  quality: "good",
  peak: 1000,
  inputBytes: 12,
  sampleRate: 24000,
};

describe("grading engine v2", () => {
  it("validates configured defaults and safe bounds", () => {
    expect(configuredReviewThreshold({})).toBe(0.75);
    expect(configuredReviewThreshold({ GRADING_REVIEW_CONFIDENCE: "0.78" })).toBe(0.78);
    expect(configuredReviewThreshold({ GRADING_REVIEW_CONFIDENCE: "bad" })).toBe(0.75);
    expect(configuredReviewThreshold({ GRADING_REVIEW_CONFIDENCE: " " })).toBe(0.75);
    expect(configuredReviewThreshold({ GRADING_REVIEW_CONFIDENCE: "1.1" })).toBe(0.75);
    expect(configuredMaxGradingAttempts({})).toBe(3);
    expect(configuredMaxGradingAttempts({ GRADING_MAX_RETRIES: "2" })).toBe(2);
    expect(configuredMaxGradingAttempts({ GRADING_MAX_RETRIES: "0" })).toBe(3);
    expect(configuredMaxGradingAttempts({ GRADING_MAX_RETRIES: "4" })).toBe(3);
    expect(configuredMaxGradingAttempts({ GRADING_MAX_RETRIES: "1.5" })).toBe(3);
    expect(configuredMaxGradingAttempts({ GRADING_MAX_RETRIES: " " })).toBe(3);
  });

  it("accepts Vietnamese without requiring diacritics and keeps English examples", () => {
    expect(isVietnameseFeedback("Bai viet co bo cuc ro rang va dung tu 'education'.")).toBe(true);
    expect(isVietnameseFeedback("The answer is clear and organized.")).toBe(false);
  });

  it("uses one Writing examiner call and computes a deterministic score", async () => {
    const mock = mockFetch([{ choices: [{ message: { content: JSON.stringify(writingReport()) } }], usage: { total_tokens: 42 } }]);
    const state: PipelineState = {};
    const checkpoints: string[] = [];
    const result = await gradeWritingV2("task1", "Discuss education.", "The answer addresses education clearly.", state, async (next) => { checkpoints.push(String(next.stage)); }, { apiKey: "test", fetch: mock.fetcher });

    expect(result.task_score).toBe(7);
    expect(result.assessable).toBe(true);
    expect(result.reviewed).toBe(false);
    expect(mock.calls).toHaveLength(1);
    expect(state.telemetry).toMatchObject({ examiner: { requestCount: 1, total_tokens: 42 } });
    expect(checkpoints).toContain("GRADED");
    const request = JSON.parse(mock.calls[0].body!);
    expect(request.messages[0].content).toContain('"required":["score","evidence","why_not_higher"]');
    expect(request.messages[0].content).toContain('"organization"');
    expect(request.messages[0].content).toContain("Write ALL learner-facing explanations in Vietnamese");
    expect(request.messages[0].content).toContain("Preserve original English ONLY inside quotations");
  });

  it("calls at most one reviewer when confidence is below .75", async () => {
    const mock = mockFetch([
      { choices: [{ message: { content: JSON.stringify(writingReport(0.5, 6)) } }] },
      { choices: [{ message: { content: JSON.stringify({ decision: "revise", reason: "Evidence supports a lower estimate.", scores: writingReport(0.5, 5).scores, confidence: 0.9 }) } }] },
    ]);
    const state: PipelineState = {};
    const result = await gradeWritingV2("task2", "Explain a policy.", "The answer explains a policy.", state, async () => undefined, { apiKey: "test", fetch: mock.fetcher });

    expect(mock.calls).toHaveLength(2);
    expect(result.reviewed).toBe(true);
    expect(result.task_score).toBe(5);
    expect(state.reviewer).toMatchObject({ decision: "revise" });
  });

  it("uses GRADING_REVIEW_CONFIDENCE for reviewer eligibility", async () => {
    vi.stubEnv("GRADING_REVIEW_CONFIDENCE", "0.78");
    try {
      const mock = mockFetch([
        { choices: [{ message: { content: JSON.stringify(writingReport(0.76)) } }] },
        { choices: [{ message: { content: JSON.stringify({ decision: "keep", reason: "Ket qua co du bang chung." }) } }] },
      ]);
      const result = await gradeWritingV2("task2", "Explain a policy.", "The answer explains a policy.", {}, async () => undefined, { apiKey: "test", fetch: mock.fetcher });
      expect(mock.calls).toHaveLength(2);
      expect(result.reviewed).toBe(true);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("repairs English feedback once without changing scores", async () => {
    const mock = mockFetch([
      { choices: [{ message: { content: JSON.stringify(englishWritingReport(0.9, 7)) } }] },
      { choices: [{ message: { content: JSON.stringify(writingReport(0.9, 7)) } }] },
    ]);
    const state: PipelineState = {};
    const result = await gradeWritingV2("task1", "Discuss education.", "The answer addresses education clearly.", state, async () => undefined, { apiKey: "test", fetch: mock.fetcher });

    expect(mock.calls).toHaveLength(2);
    expect(result.task_score).toBe(7);
    expect(result.direct_feedback_vi.summary).toContain("Bai viet");
    expect(state.repairUsed).toBe(true);
  });

  it("fails instead of accepting English feedback after the single repair", async () => {
    const mock = mockFetch([
      { choices: [{ message: { content: JSON.stringify(englishWritingReport()) } }] },
      { choices: [{ message: { content: JSON.stringify(englishWritingReport()) } }] },
    ]);
    await expect(gradeWritingV2("task1", "Discuss education.", "The answer addresses education clearly.", {}, async () => undefined, { apiKey: "test", fetch: mock.fetcher })).rejects.toMatchObject({ code: "MODEL_OUTPUT_INVALID", attemptsExhausted: true });
    expect(mock.calls).toHaveLength(2);
  });

  it("repairs Speaking feedback without changing the examiner score", async () => {
    const mock = mockFetch([
      { text: "I jog every day." },
      { choices: [{ message: { content: JSON.stringify(englishSpeakingReport(0.9, 6.5)) } }] },
      { choices: [{ message: { content: JSON.stringify(speakingReport(0.9, 6.5)) } }] },
    ]);
    const result = await gradeSpeakingV2("part1", "Do you jog?", "test-audio", {}, async () => undefined, { apiKey: "test", fetch: mock.fetcher, audioValidator: async () => audio });

    expect(mock.calls).toHaveLength(3);
    expect(result.task_score).toBe(6.5);
    expect(result.direct_feedback_vi.summary).toContain("Bai noi");
  });

  it("validates Speaking audio before transcription and sends original audio to examiner", async () => {
    const events: string[] = [];
    const mock = mockFetch([
      { text: "I prefer the first option because it is practical." },
      { choices: [{ message: { tool_calls: [{ function: { name: "emit_grading_report", arguments: JSON.stringify(speakingReport()) } }] } }] },
    ]);
    const validator = async () => {
      events.push("audio");
      return audio;
    };
    const result = await gradeSpeakingV2("part1", "Which option do you prefer?", "data:audio/webm;base64,AA==", {}, async () => undefined, { apiKey: "test", fetch: mock.fetcher, audioValidator: validator });

    events.push(mock.calls[0].url.includes("/audio/transcriptions") ? "transcription" : "examiner");
    expect(events).toEqual(["audio", "transcription"]);
    expect(mock.calls[1].body).toContain("input_audio");
    expect(result.transcript).toContain("first option");
    expect(result.task_score).toBe(7);
    const schema = JSON.parse(mock.calls[1].body!).tools[0].function.parameters;
    expect(schema.required).toContain("audio");
    expect(schema.properties.scores.required).toEqual(["task_fulfillment", "fluency_coherence", "vocabulary", "grammar", "pronunciation"]);
    expect(schema.properties.scores.properties.pronunciation.required).toEqual(["score", "evidence", "why_not_higher"]);
    expect(schema.properties.scores.properties.pronunciation.properties.evidence.description).toContain("Vietnamese");
    expect(schema.properties.scores.properties.pronunciation.properties.why_not_higher.description).toContain("Vietnamese");
  });

  it("repairs scalar Speaking scores with the same explicit contract and original audio", async () => {
    const mock = mockFetch([
      { text: "I enjoy jogging." },
      { choices: [{ message: { content: JSON.stringify({ scores: { pronunciation: 7 }, confidence: 0.9 }) } }] },
      { choices: [{ message: { content: JSON.stringify(speakingReport()) } }] },
    ]);
    const result = await gradeSpeakingV2("part1", "Do you jog?", "test-audio", {}, async () => undefined, { apiKey: "test", fetch: mock.fetcher, audioValidator: async () => audio });
    expect(result.task_score).toBe(7);
    expect(mock.calls).toHaveLength(3);
    const primary = JSON.parse(mock.calls[1].body!);
    const repair = JSON.parse(mock.calls[2].body!);
    expect(repair.tools).toEqual(primary.tools);
    expect(repair.messages[1].content[1].input_audio.data).toBe(audio.wavBase64);
  });

  it("does not invent evidence when examiner and repair both return scalar scores", async () => {
    const invalid = { choices: [{ message: { content: JSON.stringify({ scores: { grammar: 7 }, confidence: 0.9 }) } }] };
    const mock = mockFetch([invalid, invalid]);
    await expect(gradeWritingV2("task1", "Question", "Answer", {}, async () => undefined, { apiKey: "test", fetch: mock.fetcher })).rejects.toMatchObject({ code: "MODEL_OUTPUT_INVALID", attemptsExhausted: true });
    expect(mock.calls).toHaveLength(2);
  });

  it("returns a null score for an unassessable final report", async () => {
    const mock = mockFetch([
      { text: "The response was not clear." },
      { choices: [{ message: { content: JSON.stringify(speakingReport(0.2, 0, "unusable")) } }] },
    ]);
    const result = await gradeSpeakingV2("part2", "Discuss the choices.", "data:audio/webm;base64,AA==", {}, async () => undefined, { apiKey: "test", fetch: mock.fetcher, audioValidator: async () => audio });

    expect(mock.calls).toHaveLength(2);
    expect(result.task_score).toBeNull();
    expect(result.assessable).toBe(false);
  });

  it("uses an API-compatible reviewer function schema and accepts keep without scores", async () => {
    const mock = mockFetch([
      { text: "I enjoy jogging." },
      { choices: [{ message: { content: JSON.stringify(speakingReport(0.5)) } }] },
      { choices: [{ message: { tool_calls: [{ function: { name: "emit_grading_report", arguments: JSON.stringify({ decision: "keep", reason: "Audio supports the report." }) } }] } }] },
    ]);
    const result = await gradeSpeakingV2("part1", "Do you jog?", "test-audio", {}, async () => undefined, { apiKey: "test", fetch: mock.fetcher, audioValidator: async () => audio });
    const schema = JSON.parse(mock.calls[2].body!).tools[0].function.parameters;
    expect(schema.type).toBe("object");
    for (const keyword of ["oneOf", "anyOf", "allOf", "enum", "const", "not"]) expect(schema).not.toHaveProperty(keyword);
    expect(schema.required).toEqual(["decision", "reason"]);
    expect(result.reviewed).toBe(true);
    expect(result.task_score).toBe(7);
  });

  it("rejects a revised report missing criterion evidence rather than publishing a score", async () => {
    const mock = mockFetch([
      { choices: [{ message: { content: JSON.stringify(writingReport(0.5)) } }] },
      { choices: [{ message: { content: JSON.stringify({ decision: "revise", reason: "Changed", confidence: 0.9, scores: { grammar: 8 } }) } }] },
    ]);
    const result = await gradeWritingV2("task1", "Question", "The answer is clear.", {}, async () => undefined, { apiKey: "test", fetch: mock.fetcher });
    expect(result.task_score).toBeNull();
    expect(result.status).toBe("PARTIAL");
  });

  it("stops internal transient retries at three attempts and marks exhaustion", async () => {
    let calls = 0;
    const state: PipelineState = {};
    const checkpoints: PipelineState[] = [];
    const fetcher = async () => {
      calls += 1;
      return new Response("busy", { status: 503, headers: { "retry-after": "0" } });
    };
    await expect(gradeWritingV2("task1", "Question.", "Answer.", state, async (next) => { checkpoints.push({ ...next }); }, { apiKey: "test", fetch: fetcher, sleep: async () => undefined })).rejects.toMatchObject({ retryable: true, attemptsExhausted: true });

    expect(calls).toBe(3);
    expect(state.attempts).toMatchObject({ examiner: 3 });
    expect(state.attemptsExhausted).toBe(true);
    expect(checkpoints.at(-1)?.stage).toBe("FAILED");
  });

  it("aggregates Speaking parts without an AI call", () => {
    expect(aggregateSpeakingV2([{ task_score: 6.5 }, { task_score: 7 }, { task_score: 7.5 }])).toMatchObject({
      reference_mean: 7,
      speaking_estimated_score: 7,
      assessable: true,
    });
    expect(aggregateSpeakingV2([{ task_score: 6.5 }, { task_score: null }, { task_score: 7.5 }])).toMatchObject({
      speaking_estimated_score: null,
      assessable: false,
      status: "PARTIAL",
    });
  });
});

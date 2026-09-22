import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({ attempt: vi.fn(), bookmarks: vi.fn(), user: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: { examAttempt: { findFirst: mocks.attempt }, questionBookmark: { findMany: mocks.bookmarks } } }));
vi.mock("@/lib/access", () => ({ getCurrentUser: mocks.user }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); }, redirect: (url: string) => { throw new Error(url); } }));

import AttemptHistoryPage from "../src/app/(main)/history/[attemptId]/page";

const paper = {
  version: 1,
  slug: "history-fixture",
  title: "History fixture",
  listening: { instructions: "", parts: [] },
  reading: { instructions: "", passages: [] },
  writing: [{ id: "writing-task-1", title: "Task 1", prompt: "Write.", durationMinutes: 10, minimumWords: 100 }],
  speaking: { parts: [{ id: "speaking-part-1", title: "Part 1", prompt: "Speak.", questions: [], preparationSeconds: 1, speakingSeconds: 1 }] },
};

const grading = {
  complete: true,
  writingScore: 7.5,
  speakingScore: 6.5,
  writing: [{ id: "writing-task-1", task_type: "task1", task_score: 7.5, scores: { grammar: { score: 7, evidence: "Good control." } }, direct_feedback_vi: { current_reality: "Bài viết đã được lưu." } }],
  speaking: [{ id: "speaking-part-1", part: "part1", task_score: 6.5, scores: { pronunciation: { score: 6, evidence: "Clear enough." } }, direct_feedback_vi: { current_reality: "Bài nói đã được lưu." } }],
};

function attempt(overrides: Record<string, unknown> = {}) {
  return {
    id: "attempt-1",
    userId: "user-1",
    examPaperId: "paper-1",
    catalog: "FULL",
    status: "SUBMITTED",
    updatedAt: new Date("2026-09-22T08:00:00Z"),
    answers: { writingAnswers: { "writing-task-1": "A saved answer." } },
    recordings: { "speaking-part-1": { playbackUrl: "/recording.webm" } },
    grading,
    writingStatus: "GRADED",
    speakingStatus: "GRADED",
    examPaper: { id: "paper-1", title: "History fixture", slug: "history-fixture", sections: paper, questions: { version: 1, answerKey: {} } },
    paperPart: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.user.mockResolvedValue({ id: "user-1" });
  mocks.bookmarks.mockResolvedValue([]);
  mocks.attempt.mockResolvedValue(attempt());
});

describe("attempt history AI grading", () => {
  it("renders persisted Writing and Speaking feedback", async () => {
    const html = renderToStaticMarkup(await AttemptHistoryPage({ params: Promise.resolve({ attemptId: "attempt-1" }) }));

    expect(html).toContain("Kết quả AI chấm");
    expect(html).toContain("Writing");
    expect(html).toContain("Speaking");
    expect(html).toContain("7.5/10");
    expect(html).toContain("6.5/10");
    expect(html).toContain("Bài viết đã được lưu.");
    expect(html).toContain("Bài nói đã được lưu.");
    expect(mocks.attempt).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "attempt-1", userId: "user-1" } }));
  });

  it("shows a pending state when the submitted attempt has no AI report yet", async () => {
    mocks.attempt.mockResolvedValue(attempt({ catalog: "SPEAKING", grading: null, writingStatus: "NOT_STARTED", speakingStatus: "NOT_GRADED" }));
    const html = renderToStaticMarkup(await AttemptHistoryPage({ params: Promise.resolve({ attemptId: "attempt-1" }) }));

    expect(html).toContain("Speaking");
    expect(html).toContain("Đang chờ chấm");
    expect(html).toContain("Bài làm vẫn đã được lưu.");
  });
});

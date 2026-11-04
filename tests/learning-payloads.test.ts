import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ videos: { count: vi.fn(), groupBy: vi.fn(), findMany: vi.fn(), findUnique: vi.fn() }, paper: { findUnique: vi.fn() }, part: { findUnique: vi.fn() } }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: { learningVideo: mock.videos, examPaper: mock.paper, examPaperPart: mock.part } }));
import { listPublishedLearningVideos, findLearningVideoProgressSource } from "../src/lib/video-repository";
import { getExamForRun } from "../src/lib/exam-server";

beforeEach(() => { vi.resetAllMocks(); });

it("reads only twelve video summaries and filters at the server", async () => {
  mock.videos.count.mockResolvedValue(30); mock.videos.groupBy.mockResolvedValue([{ level: "B1", category: "Listening" }]); mock.videos.findMany.mockResolvedValue([]);
  const result = await listPublishedLearningVideos(2, "B1", "travel");
  const query = mock.videos.findMany.mock.calls[0][0];
  expect(query).toMatchObject({ take: 12, skip: 12, where: { published: true, OR: [{ level: "B1" }, { category: "B1" }] } });
  expect(query.select.transcript).toBeUndefined(); expect(query.select.questions).toBeUndefined();
  expect(result).toMatchObject({ total: 30, page: 2, pages: 3 });
});

it("validates video progress without reading the transcript, respecting unpublication", async () => {
  mock.videos.findUnique.mockResolvedValue({ published: false, duration: "1:00", questions: [] });
  expect(await findLearningVideoProgressSource("private-video")).toBeUndefined();
  expect(mock.videos.findUnique.mock.calls[0][0].select.transcript).toBeUndefined();
});

it("initial full test reads only Listening and keeps skill counts, without private answer data", async () => {
  mock.paper.findUnique.mockResolvedValue({ id: "p", slug: "test", title: "Test", subtitle: "", target: "B1", durationMin: 179, questionCount: 80, status: "PUBLISHED", parts: [
    { catalog: "LISTENING", skill: "LISTENING", title: "Listening", durationMin: 47, questionCount: 35 },
    { catalog: "READING", skill: "READING", title: "Reading", durationMin: 60, questionCount: 40 },
    { catalog: "WRITING", skill: "WRITING", title: "Writing", durationMin: 60, questionCount: 2 },
    { catalog: "SPEAKING", skill: "SPEAKING", title: "Speaking", durationMin: 12, questionCount: 3 },
  ] });
  mock.part.findUnique.mockResolvedValue({ sections: { listening: { instructions: "Listen", parts: [{ id: "l" }] } } });
  const exam = await getExamForRun("vstep", "test", { kind: "guest" }, "FULL");
  expect(exam?.loadedSkills).toEqual(["listening"]);
  expect(exam?.content?.reading.passages).toHaveLength(0);
  expect(exam?.parts[1].questions).toBe(40);
  expect(mock.paper.findUnique.mock.calls[0][0].select.sections).toBeUndefined();
  expect(mock.part.findUnique.mock.calls[0][0]).toMatchObject({ where: { examPaperId_catalog: { catalog: "LISTENING" } }, select: { sections: true } });
});

it("denies an unpublished paper before reading its skill content", async () => {
  mock.paper.findUnique.mockResolvedValue({ status: "READY" });
  expect(await getExamForRun("vstep", "private", { kind: "guest" }, "READING")).toBeUndefined();
  expect(mock.part.findUnique).not.toHaveBeenCalled();
});

it("keeps legacy imports usable while sending only the selected skill", async () => {
  const content = { version: 1, slug: "legacy", title: "Legacy", subtitle: "", target: "B1", listening: { instructions: "", parts: [] }, reading: { instructions: "Read", passages: [{ id: "r", questions: [] }] }, writing: [], speaking: { parts: [] } };
  mock.paper.findUnique.mockResolvedValueOnce({ id: "legacy", status: "PUBLISHED", parts: [] }).mockResolvedValueOnce({ programme: "VSTEP", slug: "legacy", title: "Legacy", durationMin: 179, questionCount: 80, status: "PUBLISHED", sections: content });
  mock.part.findUnique.mockResolvedValue(null);
  const exam = await getExamForRun("vstep", "legacy", { kind: "guest" }, "READING");
  expect(exam?.loadedSkills).toEqual(["reading"]);
  expect(exam?.parts).toHaveLength(4);
  expect(exam?.content?.reading.passages).toHaveLength(1);
  expect(exam?.content?.listening.parts).toHaveLength(0);
});

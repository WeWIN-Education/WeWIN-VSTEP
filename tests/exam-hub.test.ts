import { beforeEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
const db = vi.hoisted(() => ({ papers: vi.fn(), count: vi.fn() }));
vi.mock("@/lib/access", () => ({ getAuthState: async () => ({ kind: "authenticated", user: { id: "learner", role: "LEARNER" } }) }));
vi.mock("@/lib/prisma", () => ({ prisma: { examPaper: { findMany: db.papers }, examAttempt: { count: db.count } } }));
import ExamHubPage from "../src/app/(main)/exam/[level]/page";
beforeEach(() => {
  vi.resetAllMocks(); db.count.mockResolvedValue(0);
  db.papers.mockResolvedValue([{ slug: "paper", title: "VSTEP", subtitle: "", target: "B1", durationMin: 179, status: "PUBLISHED", parts: [{ durationMin: 60 }] }]);
});
it.each(["READING", "WRITING"])("shows the %s part duration instead of the full paper duration", async catalog => {
  const html = renderToStaticMarkup(await ExamHubPage({ params: Promise.resolve({ level: "vstep" }), searchParams: Promise.resolve({ catalog }) }));
  expect(html).toContain("60 phút"); expect(html).not.toContain("179 phút");
  expect(db.papers.mock.lastCall![0]).toMatchObject({ where: { parts: { some: { catalog } } }, select: { parts: { where: { catalog }, select: { durationMin: true } } } });
});
it("keeps the full paper duration in the full-test catalogue", async () => {
  const html = renderToStaticMarkup(await ExamHubPage({ params: Promise.resolve({ level: "vstep" }), searchParams: Promise.resolve({}) }));
  expect(html).toContain("179 phút");
  expect(db.papers.mock.lastCall![0].where.parts).toBeUndefined();
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { chromium } from "@playwright/test";
import { mkdirSync, readFileSync, readdirSync } from "node:fs";

const mocks = vi.hoisted(() => ({ findMany: vi.fn(), user: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: { examAttempt: { findMany: mocks.findMany } } }));
vi.mock("@/lib/access", () => ({ getCurrentUser: mocks.user }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(url); } }));
import { getHistoryPage, historyFilters, historyHref } from "../src/lib/exam-history";
import HistoryPage from "../src/app/(main)/history/page";


type Row = { id: string; userId: string; updatedAt: Date; status: string; catalog: string; skill: string; examPaper: { title: string }; paperPart: null };
let rows: Row[];
const paramsOf = (url: string) => Object.fromEntries(new URL(url, "http://localhost").searchParams);

beforeEach(() => {
  vi.clearAllMocks();
  rows = Array.from({ length: 125 }, (_, i) => ({
    id: `attempt-${String(i).padStart(3, "0")}`, userId: "A",
    updatedAt: new Date(Date.UTC(2026, 8, 21, 0, 0, Math.floor(i / 3))),
    status: i % 2 ? "SUBMITTED" : "IN_PROGRESS", catalog: "FULL", skill: "READING",
    examPaper: { title: "Test VSTEP" }, paperPart: null,
  }));
  mocks.user.mockResolvedValue({ id: "A" });
  // Small in-memory evaluator of the actual Prisma query; no shared DB fixtures.
  mocks.findMany.mockImplementation(async ({ where: w, orderBy, take }) => {
    const matched = rows.filter(r => r.userId === w.userId
      && (!w.catalog || r.catalog === w.catalog) && (!w.skill || r.skill === w.skill)
      && (!w.status || r.status === w.status)
      && (!w.examPaper || r.examPaper.title.toLowerCase().includes(w.examPaper.title.contains.toLowerCase()))
      && (!w.updatedAt?.gte || r.updatedAt >= w.updatedAt.gte)
      && (!w.updatedAt?.lt || r.updatedAt < w.updatedAt.lt)
      && (!w.OR || w.OR.some((part: { updatedAt: Date | { lt?: Date; gt?: Date }; id?: { lt?: string; gt?: string } }) => {
        if (part.updatedAt instanceof Date) return +r.updatedAt === +part.updatedAt
          && (part.id?.lt ? r.id < part.id.lt : r.id > part.id!.gt!);
        return part.updatedAt.lt ? r.updatedAt < part.updatedAt.lt : r.updatedAt > part.updatedAt.gt!;
      })));
    matched.sort((a, b) => (+a.updatedAt - +b.updatedAt || a.id.localeCompare(b.id)) * (orderBy[0].updatedAt === "asc" ? 1 : -1));
    return matched.slice(0, take);
  });
});

describe("history keyset pagination", () => {
  it.each([0, 7, 20, 21])("returns the correct page and next link for %i attempts", async count => {
    rows = rows.slice(0, count);
    const result = await getHistoryPage("A", {});
    expect(result.attempts).toHaveLength(Math.min(count, 20));
    expect(Boolean(result.nextHref)).toBe(count > 20);
    expect(result.previousHref).toBeNull();
  });
  it("walks all 125 attempts with tied timestamps without duplicates", async () => {
    let url: string | null = "/history";
    const ids: string[] = [];
    while (url) {
      const page = await getHistoryPage("A", paramsOf(url));
      ids.push(...page.attempts.map(r => r.id));
      url = page.nextHref;
      expect(ids.length).toBeLessThanOrEqual(125);
    }
    expect(ids).toEqual([...rows].reverse().map(r => r.id));
    expect(new Set(ids).size).toBe(125);
  });
  it("restores previous pages and the same URL for back/forward", async () => {
    const first = await getHistoryPage("A", {});
    const second = await getHistoryPage("A", paramsOf(first.nextHref!));
    const back = await getHistoryPage("A", paramsOf(second.previousHref!));
    expect(back.attempts).toEqual(first.attempts);
    expect(back.previousHref).toBeNull();
    expect(back.nextHref).toBe(first.nextHref);
    expect((await getHistoryPage("A", paramsOf(back.nextHref!))).attempts).toEqual(second.attempts);
  });
  it("keeps combined filters in links and resets stale cursors after a filter change", async () => {
    const filters = { catalog: "FULL", skill: "READING", status: "SUBMITTED", paper: "test", from: "2026-09-21", to: "2026-09-21" };
    const first = await getHistoryPage("A", filters);
    expect(paramsOf(first.nextHref!)).toMatchObject(filters);
    const changed = await getHistoryPage("A", { ...paramsOf(first.nextHref!), status: "IN_PROGRESS" });
    expect(changed.paginated).toBe(false);
    expect(mocks.findMany.mock.lastCall![0].where.OR).toBeUndefined();
    expect(historyHref(historyFilters(filters))).not.toContain("cursor");
  });
  it("ignores malformed cursors and unrecognized filters", async () => {
    for (const cursor of ["bad", "a".repeat(2000), Buffer.from("null").toString("base64url")]) {
      expect((await getHistoryPage("A", { cursor, status: "bad", catalog: "bad" })).paginated).toBe(false);
    }
  });
  it("does not depend on the anchor row remaining unchanged or present", async () => {
    const first = await getHistoryPage("A", {});
    const anchor = first.attempts.at(-1)!;
    rows.find(r => r.id === anchor.id)!.updatedAt = new Date("2026-09-22T00:00:00Z");
    const second = await getHistoryPage("A", paramsOf(first.nextHref!));
    expect(second.attempts.some(r => first.attempts.some(a => a.id === r.id))).toBe(false);
    rows = rows.filter(r => r.id !== anchor.id);
    expect((await getHistoryPage("A", paramsOf(first.nextHref!))).attempts).toEqual(second.attempts);
  });
  it("shows unseen updated records on a latest refresh and recovers empty pages", async () => {
    const first = await getHistoryPage("A", {});
    rows[0].updatedAt = new Date("2026-09-22T00:00:00Z");
    expect((await getHistoryPage("A", paramsOf(first.nextHref!))).attempts.some(r => r.id === rows[0].id)).toBe(false);
    expect((await getHistoryPage("A", {})).attempts[0].id).toBe(rows[0].id);
    rows = [];
    const empty = await getHistoryPage("A", paramsOf(first.nextHref!));
    expect(empty.latestHref).toBe("/history");
    expect(empty.paginated).toBe(true);
  });
  it("scopes even a foreign cursor to the authenticated user", async () => {
    const first = await getHistoryPage("A", {});
    expect((await getHistoryPage("B", paramsOf(first.nextHref!))).attempts).toEqual([]);
    expect(mocks.findMany.mock.lastCall![0].where.userId).toBe("B");
    await expect(getHistoryPage("", {})).rejects.toThrow("Authenticated");
  });
  it("selects only list fields with a single bounded read and no count query", async () => {
    await getHistoryPage("A", {});
    expect(mocks.findMany).toHaveBeenCalledTimes(1);
    expect(mocks.findMany.mock.calls[0][0]).toMatchObject({ take: 21,
      select: { id: true, updatedAt: true, catalog: true, status: true, examPaper: { select: { title: true } }, paperPart: { select: { title: true } } },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    });
    expect(Object.keys(mocks.findMany.mock.calls[0][0].select)).toHaveLength(6);
  });
});

describe("history date bounds", () => {
  it.each([{ from: "2026-09-21" }, { to: "2026-09-21" }, { from: "2026-09-21", to: "2026-09-21" }])("uses complete UTC dates: %j", async params => {
    await getHistoryPage("A", params);
    expect(mocks.findMany.mock.lastCall![0].where.updatedAt).toEqual({
      ...(params.from ? { gte: new Date("2026-09-21T00:00:00Z") } : {}),
      ...(params.to ? { lt: new Date("2026-09-22T00:00:00Z") } : {}),
    });
  });
  it("includes both ends of the selected day, excludes next midnight", async () => {
    rows = ["2026-09-20T23:59:59.999Z", "2026-09-21T00:00:00Z", "2026-09-21T23:59:59.999Z", "2026-09-22T00:00:00Z"].map((date, i) => ({ ...rows[i], updatedAt: new Date(date) }));
    expect((await getHistoryPage("A", { from: "2026-09-21", to: "2026-09-21" })).attempts.map(r => r.id)).toEqual(["attempt-002", "attempt-001"]);
  });
  it.each([{ from: "invalid" }, { to: "2026-02-30" }, { from: "2026-09-22", to: "2026-09-21" }, { to: "2026-09-21T00:00:00+07:00" }])("rejects invalid ranges without querying: %j", async params => {
    expect((await getHistoryPage("A", params)).error).toBeTruthy();
    expect(mocks.findMany).not.toHaveBeenCalled();
  });
});

describe("history page", () => {
  it("redirects guests before reading any attempts", async () => {
    mocks.user.mockResolvedValue(null);
    await expect(HistoryPage({ searchParams: Promise.resolve({ cursor: "foreign" }) })).rejects.toThrow("/login?callbackUrl=/history");
    expect(mocks.findMany).not.toHaveBeenCalled();
  });
  it("renders the existing controls and links with a cursor-free GET form", async () => {
    const html = renderToStaticMarkup(await HistoryPage({ searchParams: Promise.resolve({ status: "SUBMITTED" }) }));
    expect(html).toContain('action="/history"');
    expect(html).toContain('method="get"');
    expect(html).not.toContain('name="cursor"');
    expect(html).toContain('aria-label="Phân trang lịch sử"');
    expect(html.match(/href="\/history\/attempt-/g)).toHaveLength(20);
    expect(html).toContain("Đã nộp trong trang");
  });
  it.skipIf(process.env.HISTORY_BROWSER_QA !== "1")("checks desktop/mobile, filters and native back/forward using rendered page fixtures", async () => {
    // Real page markup + built CSS, mocked data only. Not a Next hydration/E2E test.
    const css = readdirSync(".next/static/css").filter(name => name.endsWith(".css"))
      .map(name => readFileSync(`.next/static/css/${name}`, "utf8")).join("\n");
    const browser = await chromium.launch({ headless: true });
    try {
      for (const width of [1440, 390]) {
        const page = await browser.newPage({ viewport: { width, height: 900 } });
        await page.route("**/*", async route => {
          const url = new URL(route.request().url());
          if (url.hostname !== "history.test" || url.pathname !== "/history") {
            await route.fulfill({ status: 404, body: "" }); return;
          }
          const html = renderToStaticMarkup(await HistoryPage({ searchParams: Promise.resolve(Object.fromEntries(url.searchParams)) }));
          await route.fulfill({ contentType: "text/html; charset=utf-8", body: `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style></head><body>${html}</body></html>` });
        });
        await page.goto("http://history.test/history");
        expect(await page.locator('section[aria-label="Các lượt làm bài"] > a').count()).toBe(20);
        const first = await page.locator('section[aria-label="Các lượt làm bài"] > a').first().getAttribute("href");
        await page.getByRole("link", { name: "Cũ hơn", exact: true }).click();
        await page.waitForURL("**/history?cursor=*");
        const secondUrl = page.url();
        expect(await page.locator('section[aria-label="Các lượt làm bài"] > a').first().getAttribute("href")).not.toBe(first);
        await page.goBack();
        expect(new URL(page.url()).search).toBe("");
        await page.goForward();
        expect(page.url()).toBe(secondUrl);
        await page.getByLabel("Lọc trạng thái").selectOption("SUBMITTED");
        await page.getByRole("button", { name: "Lọc lịch sử" }).click();
        await page.waitForURL(url => url.searchParams.get("status") === "SUBMITTED");
        expect(new URL(page.url()).searchParams.has("cursor")).toBe(false);
        expect(await page.getByLabel("Lọc trạng thái").inputValue()).toBe("SUBMITTED");
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        mkdirSync(".qa", { recursive: true });
        await page.screenshot({ path: `.qa/history-${width}.png` });
        await page.getByRole("link", { name: "Cũ hơn", exact: true }).scrollIntoViewIfNeeded();
        expect(await page.getByRole("link", { name: "Cũ hơn", exact: true }).isVisible()).toBe(true);
        await page.screenshot({ path: `.qa/history-pagination-${width}.png` });
        await page.close();
      }
    } finally { await browser.close(); }
  }, 30_000);
});

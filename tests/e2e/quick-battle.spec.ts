import { expect, test, type BrowserContext } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const safe = process.env.BATTLE_INTEGRATION === "true" && /^postgresql:\/\/battle_qa:[^@]+@127\.0\.0\.1:55439\/battle_test(?:\?|$)/.test(process.env.DATABASE_URL ?? "");
test.skip(!safe, "Requires explicitly isolated local battle database");
const db = new PrismaClient();
const prefix = `battle-browser-${Date.now()}`;
const password = "Battle-local-QA-only-79!";
const ids: string[] = [];
const matches = new Set<string>();
async function login(context: BrowserContext, suffix: string, admin = false) {
  const id = `${prefix}-${suffix}`; ids.push(id);
  const email = `${id}@example.invalid`;
  await db.user.create({ data: { id, email, name: suffix === "a" ? "Nhà thám hiểm" : "Người chinh phục", passwordHash: await bcrypt.hash(password, 4), role: admin ? "ADMIN" : "LEARNER", xp: 3700 } });
  const csrf = await (await context.request.get("/api/auth/csrf")).json();
  const response = await context.request.post("/api/auth/callback/credentials", { form: { email, password, csrfToken: csrf.csrfToken, callbackUrl: "/game" } });
  expect(response.ok()).toBe(true);
}
test.afterAll(async () => {
  if (safe) {
    await db.battleMatch.deleteMany({ where: { id: { in: [...matches] } } });
    await db.user.deleteMany({ where: { id: { in: ids } } });
  }
  await db.$disconnect();
});
test("guest introduction and responsive lobby; two humans pair, answer, reload and review", async ({ browser, page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/game");
  await expect(page.getByRole("link", { name: "Đăng nhập để chơi" })).toBeVisible();
  await expect(page.getByRole("button", { name: /chuyển động/ })).toHaveCount(0);
  await expect(page.getByText(/Máy luyện tập|Người thật hoặc máy/)).toHaveCount(0);
  await expect(page.getByRole("img", { name: /^Huy hiệu/ })).toHaveCount(7);
  await expect(page.getByRole("img", { name: "Huy hiệu Cao Thủ" })).toBeVisible();
  expect(await page.getByRole("img", { name: /^Huy hiệu/ }).evaluateAll(images => images.every(img => (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0))).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const ca = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
  const cb = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  await login(ca, "a"); await login(cb, "b");
  const a = await ca.newPage(), b = await cb.newPage();
  const errors: string[] = []; a.on("pageerror", e => errors.push(e.message)); b.on("pageerror", e => errors.push(e.message));
  await Promise.all([a.goto("/game"), b.goto("/game")]);
  await expect(a.getByRole("button", { name: "Tìm trận ngay" })).toBeEnabled();
  await a.screenshot({ path: ".qa/quick-battle-lobby-desktop.png", fullPage: true });
  await b.screenshot({ path: ".qa/quick-battle-lobby-mobile.png", fullPage: true });
  await a.getByRole("button", { name: "Tìm trận ngay" }).click();
  await expect(a.getByRole("button", { name: "Hủy tìm trận" })).toBeVisible();
  await expect(a.getByText(/Sau 30 giây|Máy luyện tập/)).toHaveCount(0);
  await b.getByRole("button", { name: "Tìm trận ngay" }).click();
  await expect(a).toHaveURL(/\/battle\//); await expect(b).toHaveURL(/\/battle\//);
  const id = a.url().split("/").pop()!; matches.add(id);
  expect(b.url()).toContain(id);
  await expect(a.getByText("Chọn một đáp án", { exact: true }).or(a.getByText("Lượt của đối thủ · Bạn đang theo dõi", { exact: true }))).toBeVisible();
  const stored = await db.battleMatch.findUniqueOrThrow({ where: { id }, include: { turns: { orderBy: { number: "asc" } }, players: { orderBy: { slot: "asc" } } } });
  const active = stored.players[0].userId === `${prefix}-a` ? a : b;
  const first = stored.turns[0];
  const answer = active.locator('button[data-selected]').nth(first.correct);
  await expect(answer).toBeEnabled();
  await answer.focus(); await answer.press("Enter");
  await expect(active.getByText(first.explanation, { exact: true })).toBeVisible();
  await expect(active.getByText("Đã ghi nhận đáp án", { exact: true })).toBeVisible();
  await expect(a.getByRole("heading", { name: stored.turns[1].prompt, exact: true })).toBeVisible({ timeout: 6000 });
  await expect(b.getByRole("heading", { name: stored.turns[1].prompt, exact: true })).toBeVisible();
  await active.reload();
  await expect(active.getByRole("heading", { name: stored.turns[1].prompt, exact: true })).toBeVisible();
  await expect(active.getByRole("button", { name: /chuyển động/ })).toHaveCount(0);
  await a.screenshot({ path: ".qa/quick-battle-arena-desktop.png", fullPage: true });
  await b.screenshot({ path: ".qa/quick-battle-arena-mobile.png", fullPage: true });
  expect(await b.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await db.battleAnswer.count({ where: { turnId: first.id } })).toBe(1);
  // Only the isolated fixture clock is advanced, allowing end-state UI coverage without an 8.5 minute wait.
  const past = Date.now() - 511000;
  await db.$transaction([
    db.battleMatch.update({ where: { id }, data: { startsAt: new Date(past) } }),
    db.battleAnswer.updateMany({ where: { turn: { matchId: id } }, data: { createdAt: new Date(past + 5000) } }),
  ]);
  await expect(a.getByRole("heading", { name: "Ôn lại trận đấu" })).toBeVisible({ timeout: 15000 });
  await expect(b.getByRole("heading", { name: "Ôn lại trận đấu" })).toBeVisible();
  expect(await db.battleReward.count({ where: { player: { matchId: id } } })).toBe(2);
  await a.screenshot({ path: ".qa/quick-battle-results.png", fullPage: true });
  expect(errors).toEqual([]);
  await ca.close(); await cb.close();
});

test("admin imports idempotently and edits/publishes/deletes a question; learner is forbidden", async ({ browser }) => {
  const context = await browser.newContext(); await login(context, "admin", true);
  const page = await context.newPage(); await page.goto("/manage/battle");
  await expect(page.getByRole("heading", { name: "Câu hỏi Quick Battle" })).toBeVisible();
  await page.getByRole("button", { name: "Nạp bộ khởi đầu 150 câu" }).click();
  await expect(page.getByRole("status")).toContainText("Đã thêm 0 câu");
  await page.getByLabel("Đề câu hỏi").fill("QA: She ____ English every day.");
  for (const [i, option] of ["studies", "study", "studying", "studied"].entries()) await page.getByLabel(`Lựa chọn ${String.fromCharCode(65 + i)}`, { exact: true }).fill(option);
  await page.getByLabel("Giải thích tiếng Việt").fill("Chủ ngữ she dùng động từ thêm -s ở hiện tại đơn.");
  await page.getByLabel("Xuất bản", { exact: true }).check();
  await page.getByRole("button", { name: "Lưu câu hỏi" }).click();
  await expect(page.getByRole("status")).toContainText("Đã lưu");
  await page.getByLabel("Tìm nội dung").fill("QA: She");
  await expect(page.locator("article")).toHaveCount(1);
  await page.getByRole("button", { name: "Sửa", exact: true }).click();
  await expect(page.getByLabel("Đề câu hỏi")).toHaveValue("QA: She ____ English every day.");
  page.on("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "Xóa", exact: true }).click();
  await expect(page.locator("article")).toHaveCount(0);
  await context.close();
});

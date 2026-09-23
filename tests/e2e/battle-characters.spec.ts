import { expect, test } from "@playwright/test";

test("all 24 poses render; motion changes pixels and pause freezes them", async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/character-preview");
  const characters = page.locator('[data-variant][role="img"]');
  await expect(characters).toHaveCount(2);
  await expect(page.locator('[data-ready="true"]')).toHaveCount(2);
  const surface = characters.first().locator("canvas");
  await surface.evaluate(node => { node.dataset.qaIdentity = "persistent-canvas"; });
  const clip = (await surface.boundingBox())!;
  const before = await page.screenshot({ clip });
  await page.waitForTimeout(250);
  expect((await page.screenshot({ clip })).equals(before)).toBe(false);
  await page.getByRole("button", { name: "Tạm dừng", exact: true }).click();
  await expect(characters.first()).toHaveAttribute("data-still", "true");
  const paused = await page.screenshot({ clip });
  await page.waitForTimeout(200);
  expect((await page.screenshot({ clip })).equals(paused)).toBe(true);
  await page.screenshot({ path: ".qa/battle-desktop.png", fullPage: true });
  const controls = page.locator('button[aria-pressed]').filter({ has: page.locator("small") });
  for (let i = 0; i < 12; i++) {
    await controls.nth(i).click();
    await expect(page.locator('[data-ready="true"]')).toHaveCount(2);
    await expect(surface).toHaveAttribute("data-qa-identity", "persistent-canvas");
    await expect(controls.nth(i)).toHaveAttribute("aria-pressed", "true");
    for (const image of await characters.locator("img").all()) {
      await expect.poll(() => image.evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth === 768)).toBe(true);
    }
  }
  await page.getByRole("button", { name: "Phát lại", exact: true }).click();
  await expect(page.locator('[data-ready="true"]')).toHaveCount(2);
  await page.getByRole("button", { name: "Xem chuỗi giao đấu", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Hai bên sẵn sàng");
  await expect(page.getByRole("status")).toHaveText("Đối thủ nhận đòn", { timeout: 15_000 });
  await controls.nth(0).click();
  await page.waitForTimeout(1500);
  await expect(characters.first()).toHaveAttribute("data-state", "idle");
  expect(errors).toEqual([]);
});

test("mobile, reduced motion, and lost WebGL context retain visible artwork", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/character-preview");
  const hero = page.locator('[data-variant="hero"]');
  await expect(hero).toHaveAttribute("data-reduced", "true");
  await expect(hero.locator("img")).toHaveCSS("opacity", "1");
  await expect(hero.locator("canvas")).toHaveCSS("opacity", "0");
  await expect(page.getByRole("button", { name: "Xem chuỗi giao đấu", exact: true })).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Nền sáng", exact: true }).click();
  await page.screenshot({ path: ".qa/battle-mobile.png", fullPage: true });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.locator('[data-ready="true"]')).toHaveCount(2);
  await hero.locator("canvas").evaluate((node: HTMLCanvasElement) => {
    node.getContext("webgl")?.getExtension("WEBGL_lose_context")?.loseContext();
  });
  await expect(hero).not.toHaveAttribute("data-ready", "true");
  await expect(hero.locator("img")).toHaveCSS("opacity", "1");
  await page.getByRole("button", { name: /Tấn công/ }).click();
  await expect(hero).toHaveAttribute("data-state", "attack");
  await expect(hero.locator("img")).toHaveCSS("opacity", "1");
  await expect(hero).not.toHaveAttribute("data-ready", "true");
});

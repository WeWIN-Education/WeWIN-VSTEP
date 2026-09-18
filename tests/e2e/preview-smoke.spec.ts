import { expect, test } from "@playwright/test";

test("login page is reachable over the Preview URL", async ({ page }) => {
  await page.goto("/login");
  await expect(page).toHaveTitle(/WEWIN/i);
  await expect(page.getByRole("heading").first()).toBeVisible();
});

test("admin upload capability is protected", async ({ request }) => {
  const response = await request.get("/api/manage/materials/upload");
  expect(response.status()).toBe(403);
});

test("microphone permission can be granted to the Preview context", async ({ browser }) => {
  const context = await browser.newContext({ permissions: ["microphone"] });
  const page = await context.newPage();
  await page.goto("/login");
  expect(await context.grantPermissions(["microphone"])).toBeUndefined();
  await context.close();
});

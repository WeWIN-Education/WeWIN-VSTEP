import { expect, it } from "vitest";
import { chromium } from "@playwright/test";
import { createServer } from "vite";
import { resolve } from "node:path";

it.skipIf(process.env.MATERIALS_BROWSER_QA !== "1")("refreshes materials once per mutation while retaining filters and visible pages", async () => {
  const material = (i: number) => ({ id: `m${i}`, title: `guide ${i}`, description: null, programme: "VSTEP", skill: "READING", level: "B1", fileName: `guide-${i}.pdf`, mimeType: "application/pdf", sizeBytes: 12, published: true, createdAt: "2026-09-22T00:00:00.000Z" });
  let rows = Array.from({ length: 45 }, (_, i) => material(i));
  const fixture = `import React from 'react';import {createRoot} from 'react-dom/client';
import {LearningMaterialUploadForm} from '/src/components/manage/LearningMaterialUploadForm.tsx';
createRoot(document.getElementById('root')).render(React.createElement(LearningMaterialUploadForm,{initialMaterials:${JSON.stringify(rows.slice(0, 20))},initialCursor:'m19',initialTotal:45}));`;
  const server = await createServer({ configFile: false, root: process.cwd(), cacheDir: "node_modules/.vite-materials", logLevel: "error", oxc: { jsx: { runtime: "automatic" } },
    resolve: { alias: { "@": resolve("src") } }, define: { "process.env.NODE_ENV": JSON.stringify("development") }, server: { host: "127.0.0.1", port: 0 },
    plugins: [{ name: "materials-fixture", enforce: "pre",
      resolveId(id) { if (id === "/qa-materials" || id === "next/navigation") return `\0${id}`; },
      load(id) {
        if (id === "\0/qa-materials") return fixture;
        if (id === "\0next/navigation") return `export function useRouter(){return {refresh(){window.dispatchEvent(new Event('qa:router-refresh'))}}}`;
      },
      configureServer(s) { s.middlewares.use((req, res, next) => {
        if (req.url === "/fixture") { res.setHeader("Content-Type", "text/html; charset=utf-8"); res.end('<html><body><div id="root"></div><script type="module" src="/qa-materials"></script></body></html>'); } else next();
      }); },
    }],
  });
  await server.listen();
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage(); page.setDefaultTimeout(10_000);
    const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
    let refreshes = 0;
    await page.exposeFunction("onRouterRefresh", () => { refreshes++; });
    await page.addInitScript(() => window.addEventListener("qa:router-refresh", () => void (window as unknown as { onRouterRefresh(): Promise<void> }).onRouterRefresh()));
    const lists: URL[] = [];
    let failMutation = false;
    let failList = false;
    await page.route("**/api/manage/materials**", async route => {
      const url = new URL(route.request().url()); const method = route.request().method();
      if (url.pathname.endsWith("/upload")) { await route.fulfill({ json: { serverUpload: true } }); return; }
      if (url.pathname.endsWith("/list")) {
        lists.push(url);
        if (failList) { failList = false; await route.fulfill({ status: 500, json: { error: "List failed" } }); return; }
        const filtered = rows.filter(row => row.title.includes(url.searchParams.get("q") ?? "") && [null, "ALL", row.skill].includes(url.searchParams.get("skill")));
        const cursor = url.searchParams.get("cursor");
        const start = cursor ? filtered.findIndex(row => row.id === cursor) + 1 : 0;
        const items = filtered.slice(start, start + 20);
        await route.fulfill({ json: { items, total: filtered.length, nextCursor: start + 20 < filtered.length ? items.at(-1)!.id : null } }); return;
      }
      if (failMutation) { failMutation = false; await route.fulfill({ status: 500, json: { error: "Mutation failed" } }); return; }
      if (method === "POST") {
        const added = { ...material(100), title: "guide new" }; rows.unshift(added);
        await route.fulfill({ json: { material: added } }); return;
      }
      const id = url.pathname.split("/").at(-1);
      if (method === "DELETE") rows = rows.filter(row => row.id !== id);
      else { const values = route.request().postDataJSON(); rows = rows.map(row => row.id === id ? { ...row, ...values, published: values.published === "true" } : row); }
      await route.fulfill({ json: { ok: true } });
    });
    await page.goto(`http://127.0.0.1:${(server.httpServer!.address() as { port: number }).port}/fixture`);
    await page.getByRole("searchbox", { name: "Tìm tài liệu" }).waitFor().catch(() => { throw new Error(errors.join("; ") || "Materials fixture did not mount"); });
    await page.getByRole("searchbox", { name: "Tìm tài liệu" }).fill("guide");
    await page.getByRole("combobox", { name: "Kỹ năng", exact: true }).last().selectOption("READING");
    await expect.poll(() => lists.at(-1)?.searchParams.get("skill")).toBe("READING");
    await page.getByRole("button", { name: "Tải thêm", exact: true }).click();
    await expect.poll(() => page.locator("article").count()).toBe(40);

    const article = (title: string) => page.locator("article").filter({ has: page.getByRole("heading", { name: title, exact: true }) });
    async function verifyRefresh(previousRefreshes: number, previousLists: number, total: number) {
      await expect.poll(() => refreshes).toBe(previousRefreshes + 1);
      await page.getByText(`Hiển thị 40/${total} tài liệu đã tải`, { exact: true }).waitFor();
      await page.getByText("Đang tải danh sách…", { exact: true }).waitFor({ state: "detached" });
      expect(lists.slice(previousLists)).toHaveLength(2);
      expect(lists.slice(previousLists).every(url => url.searchParams.get("q") === "guide" && url.searchParams.get("skill") === "READING")).toBe(true);
      expect(await page.getByRole("searchbox", { name: "Tìm tài liệu" }).inputValue()).toBe("guide");
      expect(await page.locator("article").count()).toBe(40);
      expect(new Set(await page.getByRole("heading", { name: /^guide / }).allTextContents()).size).toBe(40);
    }

    // Edit a card from the second loaded page; a failed mutation must not refresh.
    await article("guide 39").getByRole("button", { name: "Sửa", exact: true }).click();
    await page.getByRole("dialog").getByLabel("Tên tài liệu", { exact: true }).fill("guide changed");
    const beforeFailure = [refreshes, lists.length]; failMutation = true;
    await page.getByRole("button", { name: "Lưu thay đổi", exact: true }).click();
    await page.getByRole("alert").filter({ hasText: "Mutation failed" }).waitFor();
    expect([refreshes, lists.length]).toEqual(beforeFailure);
    let before = [refreshes, lists.length];
    await page.getByRole("button", { name: "Lưu thay đổi", exact: true }).click();
    await verifyRefresh(before[0], before[1], 45);
    await article("guide changed").waitFor();

    for (const published of ["false", "true"]) {
      await article("guide changed").getByRole("button", { name: "Sửa", exact: true }).click();
      await page.getByRole("dialog").getByRole("combobox", { name: /Hiển thị/ }).selectOption(published);
      before = [refreshes, lists.length];
      await page.getByRole("button", { name: "Lưu thay đổi", exact: true }).click();
      await verifyRefresh(before[0], before[1], 45);
      await article("guide changed").getByText(published === "true" ? "Đã mở" : "Đang ẩn", { exact: true }).waitFor();
    }
    await page.locator('#material-file').setInputFiles({ name: "guide.pdf", mimeType: "application/pdf", buffer: Buffer.from("QA fixture only") });
    await page.locator('#material-title').fill("guide new");
    before = [refreshes, lists.length];
    await page.getByRole("button", { name: "Tải tài liệu lên", exact: true }).click();
    await verifyRefresh(before[0], before[1], 46);
    await article("guide new").getByRole("button", { name: "Xóa", exact: true }).click();
    await page.getByRole("dialog").getByRole("textbox").fill("guide new");
    before = [refreshes, lists.length];
    await page.getByRole("button", { name: "Xác nhận xóa", exact: true }).click();
    await verifyRefresh(before[0], before[1], 45);
    expect(await article("guide new").count()).toBe(0);
    await page.getByRole("button", { name: "Tải thêm", exact: true }).click();
    await page.getByText("Hiển thị 45/45 tài liệu đã tải", { exact: true }).waitFor();
    expect(await page.getByRole("button", { name: "Tải thêm", exact: true }).count()).toBe(0);

    // List failure leaves the old rows intact, and retry keeps the selected filter.
    failList = true;
    await page.getByRole("searchbox", { name: "Tìm tài liệu" }).fill("changed");
    await page.getByRole("button", { name: "Thử lại", exact: true }).waitFor();
    expect(await page.locator("article").count()).toBe(45);
    await page.getByRole("button", { name: "Thử lại", exact: true }).click();
    await page.getByText("Hiển thị 1/1 tài liệu đã tải", { exact: true }).waitFor();
    expect(lists.at(-1)?.searchParams.get("skill")).toBe("READING");
    expect(errors).toEqual([]);
  } finally { await browser.close(); await server.close(); }
}, 60_000);

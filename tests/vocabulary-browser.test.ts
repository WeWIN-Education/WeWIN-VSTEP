import { expect, it } from "vitest";
import { chromium } from "@playwright/test";
import { createServer } from "vite";
import { resolve } from "node:path";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";

it.skipIf(process.env.VOCABULARY_BROWSER_QA !== "1")("preserves live React flashcards across pagination, reload, autoplay and users", async () => {
  const fixture = `import React,{useState,useEffect,Profiler} from 'react'; import {createRoot} from 'react-dom/client';
import {VocabularyFlashcards} from '/src/components/vocabulary/VocabularyFlashcards.tsx';
import {VocabularyNotebookBoard} from '/src/components/vocabulary/VocabularyNotebookBoard.tsx';
const word = i => ({id:'w'+i,term:'word '+i,meaningVi:'meaning '+i,ipa:null,partOfSpeech:null,exampleEn:null,exampleVi:null,cursor:String(i),audioUrl:'/audio/'+i,status:location.search.includes('notebook')?'NEW':undefined});
function Fixture(){
  const [entries,setEntries]=useState(()=>Array.from({length:location.search.includes('single')?1:30},(_,i)=>word(i)));
  const [scope,setScope]=useState(location.search);
  const [mounted,setMounted]=useState(true);
  useEffect(()=>{const refresh=e=>{setEntries((e.detail?.ids??Array.from({length:30},(_,i)=>i)).map(word));if(e.detail?.scope)setScope(e.detail.scope);if(e.detail?.unmount)setMounted(false)};window.addEventListener('qa:refresh',refresh);return()=>window.removeEventListener('qa:refresh',refresh)},[]);
  if(!mounted)return React.createElement('p',null,'Unmounted');
  return location.search.includes('board') ? React.createElement(VocabularyNotebookBoard,{key:scope,entries,initialPage:{nextCursor:'29',previousCursor:null},initialCounts:{ALL:65,NEW:65,LEARNING:0,MASTERED:0},userId:scope}) : React.createElement(VocabularyFlashcards,{entries,title:'QA words',pagination:{endpoint:'/api/vocabulary/entries?mode=collection',sessionKey:'QA:'+scope,nextCursor:entries.length>=30?entries.at(-1).cursor:null,previousCursor:null,notebook:location.search.includes('notebook'),status:location.search.includes('filtered')?'NEW':'ALL'}});
}
window.qaCommits=[];
createRoot(document.getElementById('root')).render(React.createElement(Profiler,{id:'flashcards',onRender:(id,phase,duration)=>window.qaCommits.push(duration)},React.createElement(Fixture)));`;
  const css = readdirSync(".next/static/css").filter(n => n.endsWith(".css")).map(n => readFileSync(`.next/static/css/${n}`, "utf8")).join("\n");
  const server = await createServer({ configFile: false, root: process.cwd(), cacheDir: "node_modules/.vite-vocabulary", logLevel: "error", oxc: { jsx: { runtime: "automatic" } },
    resolve: { alias: { "@": resolve("src") } }, define: { "process.env.NODE_ENV": JSON.stringify("development") },
    server: { host: "127.0.0.1", port: 0 },
    plugins: [{ name: "vocabulary-fixture", enforce: "pre", resolveId(id) { if (id === "/qa-entry" || id === "next/image") return `\0${id}`; },
      load(id) { if (id === "\0/qa-entry") return fixture; if (id === "\0next/image") return `import React from 'react'; export default function Image({fill,priority,unoptimized,...props}) {return React.createElement('img',props)}`; },
      configureServer(s) { s.middlewares.use((req, res, next) => { if (req.url?.startsWith("/fixture")) { res.setHeader("Content-Type", "text/html; charset=utf-8"); res.end(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body><div id="root"></div><script type="module" src="/qa-entry"></script></body></html>`); } else next(); }); },
    }],
  });
  await server.listen();
  const address = server.httpServer!.address() as { port: number };
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(10_000);
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    const calls: string[] = [];
    let counts = { ALL: 65, NEW: 65, LEARNING: 0, MASTERED: 0 };
    let holdNext: Promise<void> | null = null;
    let responseFinished = () => {};
    await page.addInitScript(() => { window.Audio = class { constructor(url: string) { (window as unknown as { lastAudio: string }).lastAudio = url; } play() { return Promise.resolve(); } } as unknown as typeof Audio; });
    await page.route("**/api/vocabulary/**", async route => {
      const url = new URL(route.request().url()); calls.push(url.toString());
      if (!url.pathname.endsWith("/entries")) {
        if (route.request().method() === "DELETE") { counts.ALL--; counts.NEW--; }
        else if (route.request().postDataJSON().status === "MASTERED") { counts.NEW--; counts.MASTERED++; }
        await route.fulfill({ json: { ok: true } }); return;
      }
      if (url.searchParams.get("countsOnly") === "1") { await route.fulfill({ json: { counts } }); return; }
      if (url.searchParams.get("q")) {
        const q = url.searchParams.get("q")!;
        if (q === "slow") await new Promise(resolve => setTimeout(resolve, 700));
        await route.fulfill({ json: { items: [{ id: q, term: q, meaningVi: q, ipa: null, partOfSpeech: null, exampleEn: null, exampleVi: null }], nextCursor: null, previousCursor: null, counts: { ALL: 65, NEW: 65, LEARNING: 0, MASTERED: 0 } } }).catch(() => {});
        return;
      }
      const previous = url.searchParams.get("direction") === "prev";
      const start = url.searchParams.get("direction") === "last" ? 35 : previous ? Math.max(0, Number(url.searchParams.get("cursor")) - 30) : url.searchParams.get("resume") === "1" ? Number(url.searchParams.get("anchor")?.slice(1) ?? 0) : url.searchParams.has("cursor") ? Number(url.searchParams.get("cursor")) + 1 : 0;
      const end = previous ? Number(url.searchParams.get("cursor")) : Math.min(start + 30, 65);
      const items = Array.from({ length: end - start }, (_, j) => { const i = start + j; return { id: `w${i}`, term: `word ${i}`, meaningVi: `meaning ${i}`, ipa: null, partOfSpeech: null, exampleEn: null, exampleVi: null, cursor: String(i), audioUrl: `/audio/${i}` }; });
      const held = holdNext; holdNext = null;
      const finish = responseFinished;
      if (held) await held;
      await route.fulfill({ json: { items, nextCursor: start + items.length < 65 ? String(start + items.length - 1) : null, previousCursor: start > 0 ? String(start) : null, counts } }).catch(() => {});
      if (held) finish();
    });
    await page.goto(`http://127.0.0.1:${address.port}/fixture?A`);
    await page.waitForFunction(() => document.querySelectorAll("button").length > 1).catch(() => { throw new Error(errors.join("; ") || "Fixture did not mount"); });
    await page.getByRole("button", { name: "word 29", exact: true }).click();
    await page.getByRole("dialog").waitFor();
    await page.waitForFunction(() => document.body.textContent?.includes("word 30"));
    await page.getByRole("dialog").focus(); await page.keyboard.press("ArrowRight");
    await page.getByRole("button", { name: /^Mặt trước: word 30\./ }).waitFor();
    await page.getByRole("dialog").getByRole("button", { name: "Nghe phát âm word 30", exact: true }).click();
    expect(await page.evaluate(() => (window as unknown as { lastAudio: string }).lastAudio)).toBe("/audio/30");
    await page.evaluate(() => { (window as unknown as { qaCommits: number[] }).qaCommits = []; });
    await page.getByRole("button", { name: /^Mặt trước: word 30\./ }).click();
    await page.getByRole("button", { name: /^Mặt sau: meaning 30\./ }).waitFor();
    const flipDurations = await page.evaluate(() => (window as unknown as { qaCommits: number[] }).qaCommits);
    mkdirSync(".qa", { recursive: true });
    writeFileSync(".qa/phase4-flashcard.json", JSON.stringify({ environment: "React development Profiler, 60 loaded synthetic entries", flipRenderMs: flipDurations }, null, 2));
    await page.reload();
    await page.getByRole("button", { name: "Học tiếp" }).click();
    await page.getByRole("button", { name: /^Mặt sau: meaning 30\./ }).waitFor();
    expect(calls.some(url => url.includes("resume=1") && url.includes("anchor=w30"))).toBe(true);
    await page.getByRole("button", { name: /Đã nhớ · thẻ tiếp/ }).click();
    await page.getByRole("button", { name: /^Mặt trước: word 31\./ }).waitFor();
    expect(calls.some(url => url.includes("/progress"))).toBe(true);
    await page.getByLabel("Tốc độ học").selectOption("3");
    await page.getByRole("button", { name: "Bật tự động lật" }).click();
    await page.getByRole("button", { name: /^Mặt trước: word 32\./ }).waitFor({ timeout: 10_000 });
    await page.goto(`http://127.0.0.1:${address.port}/fixture?B`);
    await page.getByRole("button", { name: "Học tiếp" }).click();
    await page.getByRole("button", { name: /^Mặt trước: word 0\./ }).waitFor();
    await page.goto(`http://127.0.0.1:${address.port}/fixture?notebook`);
    await page.getByRole("button", { name: "word 0", exact: true }).click();
    await page.getByRole("button", { name: "Đã lưu trong sổ tay", exact: true }).click();
    await page.getByRole("button", { name: /^Mặt trước: word 1\./ }).waitFor();
    await page.getByRole("button", { name: "Thẻ tiếp theo", exact: true }).click();
    await page.getByRole("button", { name: "Thẻ trước", exact: true }).click();
    await page.getByRole("button", { name: /^Mặt trước: word 1\./ }).waitFor();
    mkdirSync(".qa", { recursive: true });
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: `.qa/vocabulary-${width}.png` });
    }
    await page.goto(`http://127.0.0.1:${address.port}/fixture?board`);
    await page.getByRole("textbox", { name: "Tìm trong sổ tay" }).fill("slow");
    await page.waitForRequest(request => request.url().includes("q=slow"));
    await page.getByRole("textbox", { name: "Tìm trong sổ tay" }).fill("latest");
    await page.getByRole("button", { name: "latest", exact: true }).waitFor();
    expect(await page.getByRole("button", { name: "slow", exact: true }).count()).toBe(0);

    // Same-scope RSC refresh must reset cursors and reconcile the active stable ID.
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`http://127.0.0.1:${address.port}/fixture?refresh`);
    await page.getByRole("button", { name: "Tải thêm", exact: true }).click();
    await page.getByRole("button", { name: "word 59", exact: true }).waitFor();
    await page.getByRole("button", { name: "word 1", exact: true }).click();
    await page.evaluate(() => window.dispatchEvent(new CustomEvent("qa:refresh", { detail: { ids: [1,0,...Array.from({ length: 28 }, (_, i) => i + 2)] } })));
    await page.getByRole("button", { name: /^Mặt trước: word 1\./ }).waitFor();
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => document.body.style.overflow !== "hidden");
    expect(await page.getByRole("button", { name: "word 1", exact: true }).evaluate(el => el === document.activeElement)).toBe(true);
    await page.getByRole("button", { name: "Tải thêm", exact: true }).click();
    await page.getByRole("button", { name: "word 59", exact: true }).waitFor();
    expect(await page.getByRole("button", { name: /^word \d+$/ }).count()).toBe(60);
    for (let i = 0; i < 60; i++) expect(await page.getByRole("button", { name: `word ${i}`, exact: true }).count()).toBe(1);
    await page.getByRole("button", { name: "word 45", exact: true }).click();
    await page.evaluate(() => window.dispatchEvent(new CustomEvent("qa:refresh")));
    await page.getByRole("dialog").waitFor({ state: "detached" });
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('wewin:vocabulary-study:QA:?refresh')!).id)).toBe("w45");
    await page.getByRole("button", { name: "Học tiếp" }).click();
    await page.getByRole("button", { name: /^Mặt trước: word 45\./ }).waitFor();
    await page.getByRole("button", { name: "Đóng chế độ học flashcard" }).click();
    await page.waitForFunction(() => document.body.style.overflow !== "hidden");

    // A delayed old page cannot append after refresh or clear a newer request.
    await page.goto(`http://127.0.0.1:${address.port}/fixture?stale`);
    let release = () => {};
    holdNext = new Promise<void>(resolve => { release = resolve; });
    const finished = new Promise<void>(resolve => { responseFinished = resolve; });
    const requested = page.waitForRequest(r => r.url().includes("cursor=29"));
    await page.getByRole("button", { name: "Tải thêm", exact: true }).click(); await requested;
    await page.evaluate(() => window.dispatchEvent(new CustomEvent("qa:refresh", { detail: { ids: [0] } })));
    release(); await finished;
    await page.getByRole("button", { name: "word 0", exact: true }).waitFor();
    expect(await page.getByRole("button", { name: /^word \d+$/ }).count()).toBe(1);

    // Closing while a boundary request is pending must not reopen the session.
    await page.goto(`http://127.0.0.1:${address.port}/fixture?close-pending`);
    holdNext = new Promise<void>(resolve => { release = resolve; });
    const closeFinished = new Promise<void>(resolve => { responseFinished = resolve; });
    const prefetch = page.waitForRequest(r => r.url().includes("cursor=29"));
    await page.getByRole("button", { name: "word 29", exact: true }).click(); await prefetch;
    await page.getByRole("button", { name: "Thẻ tiếp theo", exact: true }).click();
    await page.keyboard.press("Escape");
    release(); await closeFinished;
    await page.getByRole("button", { name: "word 30", exact: true }).waitFor();
    expect(await page.getByRole("dialog").count()).toBe(0);
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");

    // A scope change in the same component cannot keep another user's active/resume ID.
    await page.getByRole("button", { name: "word 45", exact: true }).click();
    await page.evaluate(() => window.dispatchEvent(new CustomEvent("qa:refresh", { detail: { ids: [90], scope: "user-B" } })));
    await page.getByRole("dialog").waitFor({ state: "detached" });
    await page.getByRole("button", { name: "Học tiếp" }).click();
    await page.getByRole("button", { name: /^Mặt trước: word 90\./ }).waitFor();

    // Reverse-page navigation and circular endpoints still use the real component.
    await page.goto(`http://127.0.0.1:${address.port}/fixture?reverse`);
    await page.getByRole("button", { name: "word 0", exact: true }).click();
    await page.getByRole("button", { name: "Thẻ trước", exact: true }).click();
    await page.getByRole("button", { name: /^Mặt trước: word 64\./ }).waitFor();
    await page.getByRole("button", { name: "Thẻ tiếp theo", exact: true }).click();
    await page.getByRole("button", { name: /^Mặt trước: word 0\./ }).waitFor();

    // Final deletion / filter exclusion must release scroll and give focus a surviving target.
    for (const action of ["delete", "filtered"]) {
      await page.goto(`http://127.0.0.1:${address.port}/fixture?notebook-single-${action}`);
      await page.getByRole("button", { name: "word 0", exact: true }).click();
      await page.getByRole("button", { name: action === "delete" ? "Đã lưu trong sổ tay" : /Đã nhớ · thẻ tiếp/ }).click();
      await page.getByRole("dialog").waitFor({ state: "detached" });
      await page.waitForFunction(() => document.body.style.overflow !== "hidden");
      expect(await page.getByRole("region", { name: "QA words" }).evaluate(el => el === document.activeElement)).toBe(true);
    }
    await page.goto(`http://127.0.0.1:${address.port}/fixture?unmount`);
    await page.getByRole("button", { name: "word 0", exact: true }).click();
    await page.evaluate(() => window.dispatchEvent(new CustomEvent("qa:refresh", { detail: { unmount: true } })));
    await page.waitForFunction(() => document.body.style.overflow !== "hidden");

    // Mutations refresh counts only; the API tests verify the DB read bound and user scope.
    counts = { ALL: 65, NEW: 65, LEARNING: 0, MASTERED: 0 };
    await page.goto(`http://127.0.0.1:${address.port}/fixture?notebook-board-counts`);
    const before = calls.length;
    await page.getByRole("button", { name: "word 0", exact: true }).click();
    await page.getByRole("button", { name: /Đã nhớ · thẻ tiếp/ }).click();
    await page.getByRole("tab", { name: "Đã nhớ 1", exact: true }).waitFor();
    await page.getByRole("button", { name: "Đã lưu trong sổ tay", exact: true }).click();
    await page.getByRole("tab", { name: "Tất cả 64", exact: true }).waitFor();
    expect(calls.slice(before).filter(url => url.includes("/entries"))).toHaveLength(2);
    expect(calls.slice(before).filter(url => url.includes("/entries")).every(url => url.includes("countsOnly=1"))).toBe(true);
    expect(errors).toEqual([]);
  } finally { await browser.close(); await server.close(); }
}, 90_000);

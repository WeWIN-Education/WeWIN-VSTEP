import { expect, it } from "vitest";
import { chromium } from "@playwright/test";
import { createServer } from "vite";
import { resolve } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";

it.skipIf(process.env.EXAM_BROWSER_QA !== "1")("profiles the live exam and preserves answers, recording and submission", async () => {
  const fixture = `import React,{Profiler} from 'react';import {createRoot} from 'react-dom/client';
import {ExamTake} from '/src/components/exam/ExamTake.tsx';
window.qa={renders:0,commits:[],mic:0,played:0};
const parts=['listening','reading','writing','speaking'].map(skill=>({id:skill,skill,title:skill,duration:'60 minutes',questions:2}));
const content={listening:{instructions:'Listen',parts:[{id:'l1',title:'Listening',audioUrl:'/qa-prompt',durationSeconds:60,instructions:'Listen',questions:[]}]},reading:{instructions:'Read',passages:[{id:'r1',title:'Reading',text:'Synthetic reading passage.',questions:[]}]},writing:[1,2].map(i=>({id:'w'+i,title:'Task '+i,prompt:'Write a letter',minimumWords:120,durationMinutes:30})),speaking:{parts:[{id:'s1',title:'Part 1',prompt:'Describe your city',questions:[],preparationSeconds:1,speakingSeconds:180}]}};
const exam={slug:'qa',program:'vstep',title:'QA exam',subtitle:'Synthetic fixture',duration:'180 minutes',questions:4,parts,content};
createRoot(document.getElementById('root')).render(React.createElement(Profiler,{id:'exam',onRender:(id,phase,duration)=>window.qa.commits.push({phase,duration})},React.createElement(ExamTake,{exam,catalog:location.search.includes('speaking')?'SPEAKING':location.search.includes('full')?'FULL':'WRITING',candidate:{role:'LEARNER',name:'QA'}})));`;
  const server = await createServer({ configFile: false, root: process.cwd(), cacheDir: "node_modules/.vite-exam", logLevel: "error",
    oxc: { jsx: { runtime: "automatic" } }, resolve: { alias: { "@": resolve("src") } },
    define: { "process.env.NODE_ENV": JSON.stringify("development") }, server: { host: "127.0.0.1", port: 0 },
    plugins: [{ name: "exam-fixture", enforce: "pre",
      resolveId(id) { if (["/qa-exam", "next/image", "next/link", "@vercel/blob/client"].includes(id)) return `\0${id}`; },
      load(id) {
        if (id === "\0/qa-exam") return fixture;
        if (id === "\0next/image") return `import React from 'react';export default function Image({fill,priority,unoptimized,...props}){return React.createElement('img',props)}`;
        if (id === "\0next/link") return `import React from 'react';export default function Link(props){return React.createElement('a',props)}`;
        if (id === "\0@vercel/blob/client") return `export async function upload(pathname){if(window.qa.failUpload)throw new Error('QA upload failure');return {pathname,url:'/qa-audio'}}`;
      },
      transform(code, id) { if (id.replaceAll("\\", "/").endsWith("/src/components/exam/ExamTake.tsx")) return code.replace("function renderExamPart(props: RenderExamPartProps) {", "function renderExamPart(props: RenderExamPartProps) { window.qa.renders++;"); },
      configureServer(s) { s.middlewares.use((req, res, next) => { if (req.url?.startsWith("/fixture")) { res.setHeader("Content-Type", "text/html; charset=utf-8"); res.end('<html><body><div id="root"></div><script type="module" src="/qa-exam"></script></body></html>'); } else next(); }); },
    }],
  });
  await server.listen();
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(10_000);
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript(() => {
      Object.defineProperty(navigator.mediaDevices, "getUserMedia", { value: async () => {
        const qa = (window as unknown as { qa: { mic: number; activated?: boolean } }).qa;
        qa.mic++; qa.activated = navigator.userActivation.isActive;
        return { active: true, getTracks: () => [{ stop() {} }] };
      } });
      class Recorder extends EventTarget {
        static isTypeSupported() { return true; }
        state = "inactive"; mimeType = "audio/webm";
        ondataavailable: ((event: BlobEvent) => void) | null = null;
        onstop: (() => void) | null = null;
        start() { this.state = "recording"; }
        stop() { this.state = "inactive"; this.ondataavailable?.(new BlobEvent("dataavailable", { data: new Blob(["synthetic-audio"], { type: this.mimeType }) })); this.onstop?.(); }
      }
      window.MediaRecorder = Recorder as unknown as typeof MediaRecorder;
      HTMLMediaElement.prototype.play = async function () { (window as unknown as { qa: { played: number } }).qa.played++; };
    });
    let saved: Record<string, unknown> = {};
    let deadline = new Date(Date.now() + 600_000).toISOString();
    let submits = 0; let saves = 0; let polls = 0;
    const submittedBodies: { writingAnswers: Record<string, string> }[] = [];
    let grading = "PROCESSING"; let failPoll = false;
    let activePolls = 0; let maxActivePolls = 0;
    const payloadSizes: number[] = [];
    await page.route("**/api/**", async route => {
      const path = new URL(route.request().url()).pathname;
      const method = route.request().method();
      let json: unknown = {};
      if (path.endsWith("/grade")) {
        polls++;
        activePolls++; maxActivePolls = Math.max(maxActivePolls, activePolls);
        await new Promise(resolve => setTimeout(resolve, 100));
        activePolls--;
        if (failPoll) { failPoll = false; await route.fulfill({ status: 500, json: { error: "QA temporary failure" } }); return; }
        json = { status: grading, progress: { completed: grading === "GRADED" ? 2 : 0, total: 2, parts: [] } };
        payloadSizes.push(Buffer.byteLength(JSON.stringify(json)));
      } else if (path.endsWith("/submit")) { submits++; submittedBodies.push(route.request().postDataJSON()); json = { id: "qa", writingStatus: "PROCESSING", speakingStatus: "PROCESSING" }; }
      else if (path.endsWith("/recordings/upload")) json = { directUpload: true };
      else if (path.endsWith("/recordings/complete")) json = { recording: { storageKey: "qa/s1.webm", playbackUrl: "/qa-audio", mimeType: "audio/webm" } };
      else if (path.endsWith("/bookmarks")) json = { bookmarks: [] };
      else if (path.endsWith("/attempts")) json = { id: "qa", expiresAt: deadline };
      else if (path.endsWith("/qa")) {
        if (method === "PATCH") { saves++; saved = route.request().postDataJSON(); }
        json = { ...saved, status: "IN_PROGRESS", expiresAt: deadline };
      }
      await route.fulfill({ json });
    });
    const url = `http://127.0.0.1:${(server.httpServer!.address() as { port: number }).port}/fixture`;
    await page.goto(url);
    await page.locator("textarea").waitFor();
    await page.waitForTimeout(1100);
    const sample = () => page.evaluate(() => {
      const qa = (window as unknown as { qa: { renders: number; commits: { duration: number }[] } }).qa;
      return { renders: qa.renders, commits: qa.commits.length, duration: qa.commits.reduce((sum, c) => sum + c.duration, 0) };
    });
    const before = await sample(); const idleSaves = saves;
    await page.waitForTimeout(3200);
    const idle = await sample();
    const idleMeasurement = { renders: idle.renders - before.renders, commits: idle.commits - before.commits, renderMs: idle.duration - before.duration, saves: saves - idleSaves };
    console.log("PHASE4_IDLE", JSON.stringify(idleMeasurement));
    expect(saves).toBe(idleSaves);
    if (process.env.PHASE4_BASELINE !== "1") expect(idle.renders).toBe(before.renders);
    const typingStart = await sample();
    await page.locator("textarea").pressSequentially("A synthetic writing answer for task one.", { delay: 15 });
    await page.waitForTimeout(800);
    const typingEnd = await sample();
    const typingMeasurement = { renders: typingEnd.renders - typingStart.renders, renderMs: typingEnd.duration - typingStart.duration };
    console.log("PHASE4_TYPING", JSON.stringify(typingMeasurement));
    expect(saved.writingAnswers).toEqual({ w1: "A synthetic writing answer for task one." });
    await page.getByLabel("Chọn phần").selectOption("1");
    await page.locator("textarea").fill("Task two stays saved.");
    await page.waitForTimeout(800);
    await page.reload();
    await page.waitForFunction(() => document.querySelector("textarea")?.value === "Task two stays saved.");
    await page.getByLabel("Chọn phần").selectOption("0");
    expect(await page.locator("textarea").inputValue()).toBe("A synthetic writing answer for task one.");
    await page.getByRole("button", { name: "Nộp bài", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Nộp bài", exact: true }).click();
    await page.waitForFunction(() => location.search.includes("attempt=qa"));
    expect(submits).toBe(1);
    expect(submittedBodies[0].writingAnswers).toEqual({ w1: "A synthetic writing answer for task one.", w2: "Task two stays saved." });
    await page.waitForTimeout(500);
    await page.evaluate(() => { Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" }); document.dispatchEvent(new Event("visibilitychange")); });
    const hiddenPolls = polls;
    await page.waitForTimeout(3500);
    expect(polls).toBe(hiddenPolls);
    await page.evaluate(() => { Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" }); document.dispatchEvent(new Event("visibilitychange")); });
    failPoll = true;
    await page.waitForTimeout(3300);
    expect(await page.getByText("Chưa cập nhật được trạng thái chấm. Hệ thống sẽ tự thử lại.").count()).toBe(1);
    grading = "GRADED";
    await page.waitForTimeout(3300);
    const terminalPolls = polls;
    await page.waitForTimeout(3300);
    expect(polls).toBe(terminalPolls);
    expect(maxActivePolls).toBe(1);
    console.log("PHASE4_POLL", JSON.stringify({ requests: polls, syntheticPayloadBytes: payloadSizes }));

    saved = {}; grading = "PROCESSING";
    await page.goto(url + "?speaking");
    await page.getByRole("button", { name: "Bắt đầu nói", exact: true }).click();
    await page.getByRole("button", { name: "Kết thúc và lưu" }).waitFor();
    expect(await page.evaluate(() => (window as unknown as { qa: { activated: boolean } }).qa.activated)).toBe(true);
    await page.getByRole("button", { name: "Kết thúc và lưu" }).click();
    await page.getByText("Bản ghi đã lưu trên máy chủ.", { exact: true }).waitFor();
    await page.locator("audio").evaluate((audio: HTMLAudioElement) => audio.play());
    expect(await page.evaluate(() => (window as unknown as { qa: { played: number } }).qa.played)).toBe(1);
    // Upload failure retains local audio and can recover without re-recording.
    await page.evaluate(() => { (window as unknown as { qa: { failUpload: boolean } }).qa.failUpload = true; });
    await page.getByRole("button", { name: "Bắt đầu nói", exact: true }).click();
    await page.getByRole("button", { name: "Kết thúc và lưu" }).click();
    await page.getByRole("button", { name: "Thử lưu lại" }).waitFor();
    expect(await page.locator("audio").getAttribute("src")).toMatch(/^data:audio/);
    await page.evaluate(() => { (window as unknown as { qa: { failUpload: boolean } }).qa.failUpload = false; });
    await page.getByRole("button", { name: "Thử lưu lại" }).click();
    await page.getByText("Bản ghi đã lưu trên máy chủ.", { exact: true }).waitFor();

    saved = {};
    await page.goto(url + "?full");
    await page.getByRole("button", { name: "Nghe thử", exact: true }).click();
    await page.getByRole("button", { name: /Nhận đề/ }).click();
    await page.getByRole("button", { name: "3. writing", exact: true }).click();
    await page.locator("textarea").fill("Preserved across skills.");
    await page.getByRole("button", { name: "2. reading", exact: true }).click();
    await page.getByText("Synthetic reading passage.", { exact: true }).waitFor();
    await page.getByRole("button", { name: "3. writing", exact: true }).click();
    expect(await page.locator("textarea").inputValue()).toBe("Preserved across skills.");
    saved = {}; deadline = new Date(Date.now() + 60_000).toISOString();
    await page.goto(url);
    await page.locator("textarea").waitFor();
    if (process.env.PHASE4_BASELINE !== "1") {
      // Advance wall clock without replaying interval ticks (suspended/throttled tab).
      await page.clock.setSystemTime(new Date(Date.now() + 120_000));
      await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
      await page.waitForFunction(() => location.search.includes("attempt=qa"));
      expect(submits).toBe(2);
      await page.waitForTimeout(1200);
      expect(submits).toBe(2);
      // Already-expired reload must flush restored answers before auto-submitting.
      saved = { writingAnswers: { w1: "Restored at expiry" } };
      await page.goto(url);
      await page.waitForFunction(() => location.search.includes("attempt=qa"));
      expect(submits).toBe(3);
      expect(saved.writingAnswers).toEqual({ w1: "Restored at expiry" });
      expect(submittedBodies[2].writingAnswers).toEqual({ w1: "Restored at expiry" });
    }
    expect(errors).toEqual([]);
    mkdirSync(".qa", { recursive: true });
    writeFileSync(`.qa/phase4-exam-${process.env.PHASE4_BASELINE === "1" ? "before" : "after"}.json`, JSON.stringify({ environment: "Chromium, React development Profiler, synthetic APIs/media; not production latency", idle: idleMeasurement, typing: typingMeasurement, polling: { syntheticPayloadBytes: payloadSizes, maxActiveRequests: maxActivePolls }, errors }, null, 2));
  } finally { await browser.close(); await server.close(); }
}, 90_000);

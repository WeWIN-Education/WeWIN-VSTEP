import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import Module, { createRequire } from "node:module";

// `server-only` is a Next.js build marker. Resolve it to Next's empty server
// marker so this standalone parser regression script can run through tsx.
type ModuleResolver = typeof Module & {
  _resolveFilename: (request: string, ...args: unknown[]) => string;
};
const resolver = Module as ModuleResolver;
const require = createRequire(import.meta.url);
const resolveFilename = resolver._resolveFilename;
resolver._resolveFilename = function (request, ...args) {
  if (request === "server-only") return require.resolve("next/dist/compiled/server-only/empty.js");
  return resolveFilename.call(this, request, ...args);
};

async function main() {
  const [{ parseVstepDocx, parseVstepText },{ scoreExam },{fixtureFromRecord}] = await Promise.all([import("../src/lib/vstep-import"),import("../src/lib/exam-scoring"),import("../src/lib/vstep-paper")]);
  const JSZip = require("jszip");

const MINI_PAPER = `[EXAM]
slug: vstep-parser-mini
title: VSTEP Parser Mini
subtitle: Miniature parser regression paper
target: B1
duration_minutes: 25
strict_vstep: false

[LISTENING]
[INSTRUCTIONS]
Listen and choose the best answer.
[/INSTRUCTIONS]
[LISTENING_PART]
id: listening-mini-part
title: Part 1
audio: mini-listening.mp3
duration_seconds: 30
instructions: One short question.
[QUESTION]
id: listening-mini-1
number: 1
prompt: Which option is correct?
A: Alpha
B: Bravo
C: Charlie
D: Delta
answer: B
explanation: The recording identifies Bravo.

[READING]
[INSTRUCTIONS]
Read the passage and choose the best answer.
[/INSTRUCTIONS]
[READING_PASSAGE]
id: reading-mini-passage
title: Passage 1
[TEXT]
The first paragraph is retained.

The second paragraph is retained too.
[/TEXT]
[QUESTION]
id: reading-mini-1
number: 1
prompt: What does the passage contain?
A: One paragraph
B: No text
C: Two paragraphs
D: An audio file
answer: C
explanation: The passage has two paragraphs.

[WRITING]
[WRITING_TASK]
id: writing-mini-1
title: Task 1
duration_minutes: 10
minimum_words: 60
prompt: Write a short message to a friend.
bullet: Explain the change of plan.
bullet: Suggest another time.

[SPEAKING]
[SPEAKING_PART]
id: speaking-mini-1
title: Part 1
preparation_seconds: 20
speaking_seconds: 45
audio: mini-speaking.mp3
prompt: Tell us about a hobby.
question: Why do you enjoy it?
question: How often do you do it?`;

const parsed = parseVstepText(MINI_PAPER.replaceAll("\n", "\r\n"));
assert.equal(parsed.paper.version, 1);
assert.equal(parsed.paper.slug, "vstep-parser-mini");
assert.equal(parsed.paper.questionCount, 4, "two objective questions plus one writing and one speaking unit");
assert.deepEqual(parsed.audioNames, ["mini-listening.mp3", "mini-speaking.mp3"]);
assert.deepEqual(parsed.paper.listening.parts[0].questions[0], {
  id: "listening-mini-1",
  number: 1,
  prompt: "Which option is correct?",
  options: ["Alpha", "Bravo", "Charlie", "Delta"],
});
assert.equal(parsed.paper.reading.passages[0].text, "The first paragraph is retained.\n\nThe second paragraph is retained too.");
assert.equal(parsed.paper.speaking.parts[0].preparationSeconds, 20);
assert.equal(parsed.paper.speaking.parts[0].speakingSeconds, 45);
assert.deepEqual(parsed.paper.writing[0].bullets, ["Explain the change of plan.", "Suggest another time."]);
assert.deepEqual(parsed.privateData.answerKey, {
  "listening-mini-1": { correctIndex: 1, explanation: "The recording identifies Bravo." },
  "reading-mini-1": { correctIndex: 2, explanation: "The passage has two paragraphs." },
});
assert.deepEqual(scoreExam(parsed.paper,parsed.privateData,{"listening-mini-1":"B","reading-mini-1":"A"}),{
  listening:{correct:1,total:1,score:10},reading:{correct:0,total:1,score:0},answered:2,objectiveTotal:2,
});
const fixture=fixtureFromRecord({slug:parsed.paper.slug,programme:"VSTEP",title:parsed.paper.title,subtitle:parsed.paper.subtitle,target:parsed.paper.target,durationMin:25,questionCount:4,sections:JSON.parse(JSON.stringify(parsed.paper))});
assert.equal(fixture?.content?.speaking.parts[0].prompt,"Tell us about a hobby.");
assert.equal(fixture?.parts.find(part=>part.skill==="listening")?.questions,1);

assert.throws(
  () => parseVstepText(MINI_PAPER.replace("prompt: Which option is correct?", "prompt: [Điền câu hỏi]")),
  /chưa điền/,
  "template placeholders must not pass validation",
);
assert.throws(
  () => parseVstepText(MINI_PAPER.replace("id: speaking-mini-1", "id: listening-mini-1")),
  /Mã id bị trùng/,
  "ids must be unique across all units and questions",
);
assert.throws(
  () => parseVstepText(MINI_PAPER.replace("answer: B\nexplanation:", "explanation:")),
  /listening-mini-1: thiếu answer/,
  "every objective question must have an answer",
);
assert.throws(
  () => parseVstepText(MINI_PAPER.replace("answer: C\nexplanation:", "answer: E\nexplanation:")),
  /reading-mini-1: thiếu answer/,
  "answers outside A-D are invalid",
);
assert.throws(
  () => parseVstepText(MINI_PAPER.replace("explanation: The recording identifies Bravo.", "explanation:")),
  /listening-mini-1: thiếu explanation thật/,
  "objective answers must include an explanation",
);
assert.throws(
  () => parseVstepText(
    MINI_PAPER.replace("strict_vstep: false", "strict_vstep: true")
      .replace("audio: mini-listening.mp3", "audio:")
      .replace("duration_seconds: 30", "duration_seconds: [Điền thời lượng]"),
  ),
  /listening-mini-part: thiếu audio\..*[\s\S]*duration_seconds phải lớn hơn 0/,
  "strict VSTEP parts require real audio and a positive duration",
);
assert.throws(
  () => parseVstepText(MINI_PAPER.replace("strict_vstep: false", "strict_vstep: true")),
  /35 câu Nghe[\s\S]*8\/12\/15[\s\S]*40 câu Đọc[\s\S]*2 bài Viết[\s\S]*3 phần Nói/,
  "strict mode requires the full VSTEP section counts and listening shape",
);

function strictPaperText() {
  const lines = [
    "[EXAM]",
    "slug: vstep-parser-strict",
    "title: VSTEP Parser Strict",
    "subtitle: Full parser shape fixture",
    "target: B1-C1",
    "duration_minutes: 179",
    "strict_vstep: true",
    "",
    "[LISTENING]",
    "[INSTRUCTIONS]",
    "Listen and choose the best answer.",
    "[/INSTRUCTIONS]",
  ];
  let number = 1;
  for (const [part, count] of [[1, 8], [2, 12], [3, 15]] as const) {
    lines.push(
      "[LISTENING_PART]",
      `id: strict-listening-part-${part}`,
      `title: Part ${part}`,
      `audio: strict-listening-part-${part}.mp3`,
      "duration_seconds: 60",
      "instructions: Listen once.",
    );
    for (let index = 0; index < count; index += 1) {
      lines.push(
        "[QUESTION]",
        `id: strict-listening-${number}`,
        `number: ${number}`,
        `prompt: Which listening option is correct for question ${number}?`,
        "A: Alpha",
        "B: Bravo",
        "C: Charlie",
        "D: Delta",
        "answer: B",
        `explanation: The strict fixture answer is Bravo for question ${number}.`,
      );
      number += 1;
    }
  }
  lines.push("[READING]", "[INSTRUCTIONS]", "Read each passage.", "[/INSTRUCTIONS]");
  let readingNumber = 1;
  for (let passage = 1; passage <= 4; passage += 1) {
    lines.push(
      "[READING_PASSAGE]",
      `id: strict-reading-passage-${passage}`,
      `title: Passage ${passage}`,
      "[TEXT]",
      `This is the text for strict reading passage ${passage}.`,
      "[/TEXT]",
    );
    for (let index = 0; index < 10; index += 1) {
      lines.push(
        "[QUESTION]",
        `id: strict-reading-${readingNumber}`,
        `number: ${readingNumber}`,
        `prompt: What does strict reading question ${readingNumber} ask?`,
        "A: Alpha",
        "B: Bravo",
        "C: Charlie",
        "D: Delta",
        "answer: C",
        `explanation: The strict fixture answer is Charlie for question ${readingNumber}.`,
      );
      readingNumber += 1;
    }
  }
  lines.push("[WRITING]");
  for (let task = 1; task <= 2; task += 1) {
    lines.push(
      "[WRITING_TASK]",
      `id: strict-writing-${task}`,
      `title: Task ${task}`,
      `duration_minutes: ${task === 1 ? 20 : 40}`,
      `minimum_words: ${task === 1 ? 120 : 250}`,
      `prompt: Write strict writing task ${task}.`,
      "bullet: Explain your answer.",
    );
  }
  lines.push("[SPEAKING]");
  for (let part = 1; part <= 3; part += 1) {
    lines.push(
      "[SPEAKING_PART]",
      `id: strict-speaking-${part}`,
      `title: Part ${part}`,
      "preparation_seconds: 15",
      "speaking_seconds: 60",
      `prompt: Speak about strict speaking part ${part}.`,
      "question: Give one reason.",
    );
  }
  return lines.join("\n");
}

const strictParsed = parseVstepText(strictPaperText());
assert.equal(strictParsed.paper.questionCount, 80);
assert.equal(strictParsed.paper.listening.parts.map((part) => part.questions.length).join("/"), "8/12/15");
assert.equal(strictParsed.paper.reading.passages.length, 4);
assert.ok(strictParsed.paper.reading.passages.every((passage) => passage.questions.length === 10));
assert.equal(strictParsed.paper.writing.length, 2);
assert.equal(strictParsed.paper.speaking.parts.length, 3);
assert.equal(Object.keys(strictParsed.privateData.answerKey).length, 75);
assert.deepEqual(strictParsed.paper.listening.parts.map((part) => part.audioUrl), [
  "strict-listening-part-1.mp3",
  "strict-listening-part-2.mp3",
  "strict-listening-part-3.mp3",
]);

async function makeGoogleDocsDocx() {
  const paragraphs = [
    "[EXAM]",
    "slug: google-docs-mini",
    "title: Google Docs Export Mini",
    "strict_vstep: false",
    "[LISTENING]",
    "[LISTENING_PART]",
    "id: google-listening-part",
    "title: Part 1",
    "audio: google-listening.mp3",
    "duration_seconds: 12",
    "[QUESTION]",
    "id: google-listening-1",
    "number: 1",
    "prompt: Which word is preserved?",
    "A: Café",
    "B: Bravo & Co.",
    "C: “Curly quotes”",
    "D: Delta",
    "answer: B",
    "explanation: The exported document preserves Unicode and XML entities.",
    "[READING]",
    "[READING_PASSAGE]",
    "id: google-reading-passage",
    "title: Passage 1",
    "[TEXT]",
    "Google Docs exports ordinary paragraphs as separate w:p elements.",
    "The second paragraph remains separate.",
    "[/TEXT]",
    "[QUESTION]",
    "id: google-reading-1",
    "number: 1",
    "prompt: What remains separate?",
    "A: The title",
    "B: The audio",
    "C: The paragraphs",
    "D: Nothing",
    "answer: C",
    "explanation: The two paragraphs are retained.",
    "[WRITING]",
    "[WRITING_TASK]",
    "id: google-writing-1",
    "prompt: Write a short message.",
    "[SPEAKING]",
    "[SPEAKING_PART]",
    "id: google-speaking-1",
    "prompt: Talk about a hobby.",
  ];
  const xmlEscape = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs
    .map((paragraph) => `<w:p><w:r><w:t xml:space="preserve">${xmlEscape(paragraph)}</w:t></w:r></w:p>`)
    .join("")}<w:sectPr/></w:body></w:document>`;
  const zip = new JSZip();
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`);
  zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
  zip.file("word/document.xml", documentXml);
  return zip.generateAsync({ type: "nodebuffer" });
}

const googleDocsParsed = await parseVstepDocx(await makeGoogleDocsDocx());
assert.equal(googleDocsParsed.paper.slug, "google-docs-mini");
assert.equal(googleDocsParsed.paper.listening.parts[0].questions[0].options[1], "Bravo & Co.");
assert.equal(googleDocsParsed.paper.listening.parts[0].questions[0].options[2], "“Curly quotes”");
assert.equal(googleDocsParsed.paper.reading.passages[0].text, "Google Docs exports ordinary paragraphs as separate w:p elements.\n\nThe second paragraph remains separate.");
assert.equal(googleDocsParsed.privateData.answerKey["google-reading-1"].correctIndex, 2);

const templatePath = path.join(process.cwd(), "public", "templates", "WEWIN_VSTEP_Exam_Import_Template.docx");
const template = await fs.readFile(templatePath);
await assert.rejects(
  () => parseVstepDocx(template),
  /chưa điền|cần prompt|cần 35 câu/,
  "the shipped DOCX template must remain invalid until its sample values are replaced",
);

  console.log("PASS: VSTEP text parser, private answer-key separation, validation failures, and DOCX extraction path.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

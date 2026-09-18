# VSTEP DOCX Import Format

This document defines the plain-text contract used when a content manager uploads a Word or Google Docs export to WEWIN. Create a copy of `public/templates/WEWIN_VSTEP_Exam_Import_Template.docx`, replace every sample value, save or export it as `.docx`, and upload it together with the referenced audio files. The importer validates the complete paper before it is published; preview does not change the database or filesystem.

## Upload workflow

Send a `multipart/form-data` request to `/api/manage/exams/import` with:

| Field | Required | Description |
| --- | --- | --- |
| `docx` | Yes | The `.docx` paper document. Maximum 20 MB. |
| `audio` | No | One or more audio files. Repeat this field for every file. Each file is at most 25 MB and the upload is at most 100 MB total. |
| `mode` | No | `preview` (default) validates and returns the parsed paper; `publish` creates a new published `ExamPaper`. |

Supported audio extensions are `.mp3`, `.wav`, `.m4a`, `.mp4`, `.ogg`, and `.webm`. The filename, including its extension, must match the value in an `audio:` field, case-insensitively. The importer compares basenames, so a value such as `audio/listening-part-1.mp3` expects the uploaded file `listening-part-1.mp3`. Referenced audio is written to private `.data/exams` storage and is exposed through an authenticated URL such as `/api/exams/media/<generated-id>.mp3`; original filenames are not used as public paths. Unused uploaded files are reported but do not prevent publishing.

Preview returns `valid`, the public `paper`, `requiredAudio`, `missingAudio`, `unusedAudio`, and `warnings`. A publish request is rejected if referenced audio is missing, if the slug already exists, or if any validation error remains. Publishing is additive: an existing paper or any learner attempt is never replaced or deleted. Change the `slug` to create a new paper.

## Text grammar

The parser reads paragraphs after Word's normal text extraction. Keep one tag or one `key: value` field per paragraph. Field names are case-insensitive. Blank lines and lines beginning with `#` are ignored. Unknown bracket tags are ignored with a warning, which makes it safe to keep explanatory notes outside the data blocks.

### Exam metadata

Start with an `[EXAM]` block. `slug` and `title` are required in practice; `subtitle`, `target`, and `duration_minutes` have defaults. `strict_vstep` defaults to `true` and requires the complete VSTEP shape: 35 Listening questions, 40 Reading questions, 2 Writing tasks, and 3 Speaking parts. Set `strict_vstep: false` only for a deliberately small development or preview paper.

```text
[EXAM]
slug: vstep-practice-02
title: VSTEP Practice 02
subtitle: Bài luyện VSTEP bốn kỹ năng
target: B1-C1
duration_minutes: 179
strict_vstep: true
```

Use lowercase letters, numbers, and hyphens for a stable slug. Every unit and question `id` should be stable across revisions and unique across the entire document. If an id is omitted, the importer supplies an order-based fallback; explicit ids are strongly preferred because they keep saved answers and review links stable.

### Listening

`[LISTENING]` may contain one general `[INSTRUCTIONS]` block and one or more `[LISTENING_PART]` blocks. In strict VSTEP mode every Listening part must name an audio file and have a positive `duration_seconds`; in non-strict mode audio and duration may be omitted for a small development paper. Any referenced audio filename must be uploaded for publish. Each question must have exactly four options (`A` through `D`) and an answer (`A`, `B`, `C`, or `D`).

```text
[LISTENING]
[INSTRUCTIONS]
Listen once and choose the best answer.
[/INSTRUCTIONS]
[LISTENING_PART]
id: listening-part-1
title: Part 1
audio: listening-part-1.mp3
duration_seconds: 347
instructions: There are eight questions in this part.
[QUESTION]
id: listening-1
number: 1
prompt: When is the appointment?
A: Wednesday
B: Thursday
C: Friday
D: Tuesday
answer: B
explanation: The recording says Thursday.
```

### Reading

`[READING]` may contain general `[INSTRUCTIONS]` and one or more `[READING_PASSAGE]` blocks. Put a multi-paragraph passage between `[TEXT]` and `[/TEXT]`. The passage's `text` key is for a one-line passage only; `[TEXT]` is the reliable form for normal documents.

```text
[READING]
[INSTRUCTIONS]
Read each passage and choose the best answer.
[/INSTRUCTIONS]
[READING_PASSAGE]
id: reading-passage-1
title: Passage 1 · Questions 1-10
[TEXT]
The complete passage can contain multiple paragraphs.

The blank line is preserved.
[/TEXT]
[QUESTION]
id: reading-1
number: 1
prompt: What is the passage about?
A: Option one
B: Option two
C: Option three
D: Option four
answer: C
explanation: The passage states this directly.
```

### Writing

Add `[WRITING]` and one `[WRITING_TASK]` block per task. `bullet` may be repeated. Writing tasks do not need objective answer keys; the prompt and optional bullets are passed to the writing grader.

```text
[WRITING]
[WRITING_TASK]
id: writing-1
title: Task 1
duration_minutes: 20
minimum_words: 120
prompt: Write a letter to your friend.
bullet: Apologize and cancel the meeting.
bullet: Suggest another time to meet.
```

### Speaking

Add `[SPEAKING]` and one `[SPEAKING_PART]` block per part. `question` may be repeated. `audio` is optional; when it is absent the player can read the prompt with browser speech synthesis. `preparation_seconds` and `speaking_seconds` are optional and default by part position.

```text
[SPEAKING]
[SPEAKING_PART]
id: speaking-1
title: Part 1 · Social Interaction
preparation_seconds: 15
speaking_seconds: 180
audio: speaking-part-1.mp3
prompt: Let us talk about games and sports.
question: Which indoor games do you play?
question: How often do you exercise?
```

## Validation rules

The importer rejects the document when any of the following is true:

- `slug`/`title` is absent, or a sample title/slug such as `[Điền ...]`, `{{...}}`, or the template `XX` remains.
- A Listening or Reading question has a missing prompt, fewer than four non-empty options, or a missing/invalid `answer`.
- Any question, Writing task, Speaking part, Listening part, or Reading passage id is duplicated.
- A passage, Writing prompt, or Speaking prompt is empty or still contains the template placeholder.
- Default strict mode does not contain the required VSTEP counts.

Answers and explanations are separated at import time. The public `ExamPaper.sections` JSON contains only the learner-safe paper:

```json
{
  "version": 1,
  "slug": "vstep-practice-02",
  "title": "VSTEP Practice 02",
  "subtitle": "Bài luyện VSTEP bốn kỹ năng",
  "target": "B1-C1",
  "durationMinutes": 179,
  "questionCount": 80,
  "listening": { "instructions": "...", "parts": [] },
  "reading": { "instructions": "...", "passages": [] },
  "writing": [],
  "speaking": { "parts": [] }
}
```

The private `ExamPaper.questions` JSON contains the server-only key:

```json
{
  "version": 1,
  "answerKey": {
    "listening-1": { "correctIndex": 1, "explanation": "The recording says Thursday." },
    "reading-1": { "correctIndex": 2, "explanation": "The passage states this directly." }
  },
  "sourceName": "paper.docx"
}
```

`correctIndex` is zero-based (`A = 0`, `B = 1`, `C = 2`, `D = 3`). The answer key is never returned by preview or learner-facing paper resolvers. Writing and Speaking are graded from their submitted text/audio and therefore do not receive objective answer-key entries.

## Safe authoring checklist

1. Copy the template and keep all bracket tags, field names, and block terminators unchanged.
2. Replace every sample value, including the answer and explanation for every Listening/Reading question.
3. Keep ids stable and unique; do not renumber existing questions unnecessarily.
4. Name audio files exactly as referenced and select all of them in the upload dialog.
5. Preview until `valid: true` and `missingAudio: []`, then publish. A slug collision is intentional protection for existing papers and attempts.

# WEWIN LMS rebuild process

## Current target

Replace the old Hanbeego-derived child English experience with a teacher-focused LMS. The course navigation is:

```text
Khóa học
├── Luyện thi VSTEP
├── Bài tập
└── Học qua video

Luyện tập theo kỹ năng nằm ở `/training`, còn phiên trộn nằm ở `/review`. Từ vựng nằm trong nhóm riêng với sổ tay, chủ đề, mẹo nhớ và collocations.
```

VSTEP is the primary exam journey. Classroom English videos support the teacher audience.

## Reference evidence

- Hanbeego live: sidebar/header/card density, exam hub, video library and transcript player.
- `C:\Users\thanh\Downloads\lm\thì thử vstep`: 15 screenshots for the VSTEP preflight, exam shell, Listening, Reading, Writing, Speaking, submission modal and result screens.
- Current audit: `D:\hanbee` had a 56px header, fixed 260px sidebar, Lớp 1–9 routes, Premium/register surfaces, Chinese video thumbnails, and a placeholder video detail page.

## Database safety

The current implementation does not reset or delete learner attempts during normal migrations. The additive migration `20260911110000_learning_review` adds grading checkpoints to `ExamAttempt`, watched intervals/quiz answers to `VideoProgress`, and a resume unit field. Apply it with `npx prisma migrate deploy` after PostgreSQL is available. The demo cleanup requested by the operator was targeted to two named papers and five related attempts; the pre-cleanup dump remains available for recovery.

## Work sequence

1. Delete old routes/components and add redirects in `next.config.ts`.
2. Add the teacher-only navigation and responsive Hanbeego-style shell.
3. Replace the homepage, dashboard, header, sidebar and footer.
4. Replace Prisma schema/migrations/seed with VSTEP and Classroom English structures. The old migration SQL was emptied into no-op history markers so Prisma can keep its migration history; the new WEWIN baseline migration is the active schema.
5. Build the VSTEP hub.
6. Build the VSTEP exam runner from the supplied screenshots.
8. Build the Classroom English video library and transcript player.
9. Add VSTEP materials and teacher articles.
10. Validate with lint, build, database checks, and Computer Use screenshots at desktop and mobile sizes.
11. Import the A1–A2 and B1 workbooks through the stable `collection_code + entry_code` workflow.

## Active data fixtures

- QA user is seeded from environment variables, never from a production password in source.
- VSTEP papers are imported through the admin workflow; the former demo paper is no longer seeded or assigned to a trial slot.
- Video fixtures use the verified YouTube ID, all 224 English–IPA–Vietnamese lines from the supplied classroom file, and timestamps aligned to the video's public English caption track.
- Vocabulary collections currently contain 1,000 A1–A2 entries across 20 topics and 234 B1 entries across 10 topics.
- Demo VSTEP records and imported media have been removed from the active database and `.data/exams`; real paper assets must be imported through admin.

## Definition of done

- No old Lớp 1–9/HSK/Premium/register surface or database record remains.
- VSTEP navigation, hubs, runners and results are reachable.
- VSTEP runner matches the supplied visual reference at desktop and mobile.
- Video detail matches the Hanbeego two-column player/transcript pattern.
- No demo paper is configured by default. An admin must import and explicitly assign a complete real paper to Test 1 or Test 2 before guest practice appears.
- Personal vocabulary and shared vocabulary remain separate, with flashcard and progress state per learner.
- Writing/Speaking grading route uses the modular pack at `C:\Users\thanh\Downloads\VSTEP_AI_Grading_Prompt_Pack_Modular\VSTEP_AI_Grading_Prompt_Pack_Modular\prompts`: three independent examiners, senior adjudication, Writing 1:2 aggregation, and audio-first Speaking assessment. `OPENAI_API_KEY` is server-only.
- Results remove the recommendation/Zalo card and display saved objective answers, grounded review evidence, Writing text, and Speaking audio.
- Video progress records real playback intervals (rejecting seek jumps and hidden-tab time) plus quiz answers; it is a progress signal, not proof of attention.
- No horizontal overflow at 390px viewport.
- `npm run lint` and `npm run build` pass when PostgreSQL is available; the current code also passes TypeScript, focused ESLint, and core data tests without the database.
- The final response states exactly what was deleted and whether the database backup can restore it.

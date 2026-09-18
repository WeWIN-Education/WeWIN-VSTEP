# WEWIN Education LMS

This project is the teacher-facing English LMS for WEWIN Education. The user experience is inspired by Hanbeego's information architecture and learning surfaces, but all visible content and assets belong to WEWIN.

## Product decisions

- Audience: Vietnamese teachers.
- Programmes: VSTEP and teacher Classroom English.
- The visible course menu contains VSTEP, Practice, Training, Review and Classroom English video learning. Vocabulary is a separate grouped sidebar area.
- Users receive accounts from the centre after purchasing externally. There is no public registration, pricing, Premium, checkout, affiliate, child curriculum, HSK, or Lớp 1–9 surface.
- Guests can browse public catalogues and complete up to two different papers per VSTEP catalog once per browser session, including AI grading. Other learning content requires a live active account.
- Issued LEARNER accounts access all published programmes. ADMIN replaces CONTENT_MANAGER and manages learner accounts, exams and vocabulary. Never trust JWT role alone: use getCurrentUser() for fresh account state.
- Trial sessions and results expire after 30 days. Test 2 remains unavailable until a complete paper is imported and assigned; never fabricate content.

## Stack

- Next.js 15, React 19, TypeScript, Tailwind CSS 4.
- Auth.js credentials login.
- Prisma with PostgreSQL.
- Local development runs on `http://localhost:3000`.

## Design system

- Primary blue: `#004AAD`; dark blue: `#003A8C`.
- Gold: `#CCA26C`; soft gold: `#F8D99D`.
- Background: `#F8FAFC`; card: white; border: `#E5E7EB`.
- Body and headings: local Be Vietnam Pro. Inter is reserved for timer, numeric labels and compact utility text.
- Hanbeego-inspired desktop shell: 80px header, 256px sidebar below the header, 24px cards, pill CTAs.

## Required skills

Read and apply the available skill instructions before work of the matching kind:

- `sites:sites-building` for website, route, component, responsive, and UI changes.
- `computer-use:computer-use` for localhost and Hanbeego visual comparison.
- `pdf:pdf` before extracting or rendering VSTEP PDFs.
- `documents:documents` before extracting VSTEP DOCX material.
- `sites:sites-hosting` only when the user explicitly requests publishing.
- `spreadsheets:Spreadsheets` for workbook inspection, template creation and vocabulary import work.

## Working rules

- Read `PROCESS.md` before changing the project.
- Keep old product routes deleted; use centralized redirects only for old URLs.
- Never reintroduce HSK, Lớp 1–9, child curriculum, Premium, or Chinese media.
- Use real VSTEP and Classroom English programme and skill names in data and UI.
- Do not claim Writing/Speaking scores without a real scoring service.
- Vocabulary is available to every issued learner account; admins can import `.xlsx` through `/manage/vocabulary/import`.
- Real VSTEP papers are imported by an admin from DOCX and audio. The former demo papers and their learner attempts have been removed; do not reintroduce them into a shared database.
- Personal vocabulary entries are separate from shared imported vocabulary and belong only to their issuing learner.
- Writing/Speaking grading uses server-only `OPENAI_API_KEY` and `OPENAI_GRADING_MODEL`; never put credentials in source, prompts, screenshots or commits.
- Run `npm run lint`, `npm run build`, Prisma validation, and browser visual checks before handoff.

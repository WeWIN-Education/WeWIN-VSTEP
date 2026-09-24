import { PrismaClient, Programme } from "@prisma/client";
import bcrypt from "bcryptjs";
import classroomTranscript from "../src/lib/classroom-transcript.json";
import { CLASSROOM_INSTRUCTIONS_QUESTIONS } from "../src/lib/video-config";

const prisma = new PrismaClient();

async function main() {
  await prisma.$transaction([
    prisma.examAttempt.deleteMany(),
    prisma.guestSession.deleteMany(),
    prisma.trialRateLimit.deleteMany(),
    prisma.programmeEnrollment.deleteMany(),
    prisma.practiceItem.deleteMany(),
    prisma.examPaper.deleteMany(),
    prisma.learningVideo.deleteMany(),
    prisma.blogPost.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  const email = process.env.SEED_DEMO_EMAIL ?? "teacher.demo@wewin.local";
  const password = process.env.SEED_DEMO_PASSWORD ?? "wewin-demo-change-me";
  const user = await prisma.user.create({ data: { email, name: "Nguyễn Thị Lan", passwordHash: await bcrypt.hash(password, 10) } });
  await prisma.programmeEnrollment.createMany({ data: [Programme.VSTEP, Programme.CLASSROOM].map((programme) => ({ userId: user.id, programme })) });

  const managerEmail = process.env.SEED_MANAGER_EMAIL?.trim().toLowerCase();
  const managerPassword = process.env.SEED_MANAGER_PASSWORD;
  if (managerEmail && managerPassword) {
    await prisma.user.create({ data: { email: managerEmail, name: "WEWIN Admin", role: "ADMIN", passwordHash: await bcrypt.hash(managerPassword, 10) } });
  }

  await prisma.learningVideo.createMany({ data: [
    { slug: "classroom-instructions", title: "Classroom Instructions in English", titleVi: "Câu hướng dẫn lớp học bằng tiếng Anh", description: "Video bổ trợ giúp luyện nghe và nhận diện câu hướng dẫn trong bối cảnh lớp học.", youtubeId: "lkw2PtVpCJM", sourceUrl: "https://www.youtube.com/watch?v=lkw2PtVpCJM", level: "A2", category: "Luyện nghe bổ trợ", duration: "12:46", transcript: classroomTranscript, questions: CLASSROOM_INSTRUCTIONS_QUESTIONS, transcriptSource: "fixture", ipaDialect: "en-US", status: "PUBLISHED", published: true, sortOrder: 1 },
  ] });

  console.log(`Seed completed for ${email}.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());

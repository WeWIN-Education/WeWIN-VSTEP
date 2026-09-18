import { PrismaClient, Programme } from "@prisma/client";
import bcrypt from "bcryptjs";

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
    { slug: "classroom-instructions", title: "Classroom Instructions in English", description: "Câu hướng dẫn lớp học bằng tiếng Anh.", youtubeId: "lkw2PtVpCJM", level: "A2", category: "Điều phối lớp", duration: "08:12", transcript: [{ id: "c1", start: "0:00", en: "Good morning, everyone. Eyes on me, please.", vi: "Chào buổi sáng các em. Các em chú ý nhé." }, { id: "c2", start: "0:22", en: "Work in pairs and compare your answers.", vi: "Làm việc theo cặp và so sánh câu trả lời." }], sortOrder: 1 },
  ] });

  console.log(`Seed completed for ${email}.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());

import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";

loadEnvConfig(process.cwd());
const prisma = new PrismaClient();
async function main() {
  const now = new Date();
  // Foreign-key cascade removes only expired guests' attempts, never learner history.
  const [sessions, limits] = await prisma.$transaction([
    prisma.guestSession.deleteMany({ where: { expiresAt: { lte: now } } }),
    prisma.trialRateLimit.deleteMany({ where: { expiresAt: { lte: now } } }),
  ]);
  console.log(`Removed ${sessions.count} expired guest sessions and ${limits.count} expired rate-limit records.`);
}
main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());

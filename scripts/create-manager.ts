import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

const [emailArg, password, name = "WEWIN Admin"] = process.argv.slice(2);

async function main() {
  const email = emailArg?.trim().toLowerCase();
  if (!email || !password || password.length < 8) throw new Error("Usage: npx tsx scripts/create-manager.ts email password [name] (password tối thiểu 8 ký tự)");
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.upsert({ where: { email }, create: { email, name, role: "ADMIN", passwordHash }, update: { name, role: "ADMIN", passwordHash, isActive: true, sessionVersion: { increment: 1 } } });
  console.log(`Admin ready: ${user.email}`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());

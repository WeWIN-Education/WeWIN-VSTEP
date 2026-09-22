import { PrismaClient } from "@prisma/client";
import { baselineSampleRate, recordBaseline } from "./performance-baseline";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrisma() {
  const measuring = baselineSampleRate() > 0;
  const client = new PrismaClient({
    log: [
      { emit: "stdout", level: "error" },
      ...(process.env.NODE_ENV === "development" ? [{ emit: "stdout", level: "warn" } as const] : []),
      ...(measuring ? [{ emit: "event", level: "query" } as const] : []),
    ],
  });
  if (measuring) client.$on("query", event => recordBaseline("db.query", event.duration));
  return client;
}

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

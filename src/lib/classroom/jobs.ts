import "server-only";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { syncMeeting } from "./zoom";
import { processEvents } from "./events";

// Web requests run only their own Zoom job; the worker also handles file scans.
export async function runClassroomJob(target?: {
  kind: "ZOOM_SYNC" | "ZOOM_EVENT";
  entityId: string;
}) {
  const token = randomUUID(),
    now = new Date();
  const row = await prisma.$transaction(async (db) => {
    const filter = target
      ? Prisma.sql`AND "kind" = ${target.kind} AND "entityId" = ${target.entityId}`
      : Prisma.empty;
    const jobs = await db.$queryRaw<
      { id: string; kind: string; entityId: string }[]
    >(Prisma.sql`
      SELECT "id", "kind", "entityId" FROM "ClassroomJob"
      WHERE (("status" = 'QUEUED' AND "availableAt" <= ${now})
        OR ("status" = 'RUNNING' AND "leaseExpiresAt" < ${now})) ${filter}
      ORDER BY "availableAt" LIMIT 1 FOR UPDATE SKIP LOCKED`);
    const job = jobs[0];
    if (!job) return null;
    // Separate jobs for the same meeting must not call Zoom concurrently.
    await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`classroom-job:${job.kind}:${job.entityId}`}))`;
    if (
      await db.classroomJob.count({
        where: {
          id: { not: job.id },
          kind: job.kind,
          entityId: job.entityId,
          status: "RUNNING",
          leaseExpiresAt: { gt: now },
        },
      })
    )
      return null;
    return db.classroomJob.update({
      where: { id: job.id },
      data: {
        status: "RUNNING",
        attempts: { increment: 1 },
        leaseToken: token,
        leaseExpiresAt: new Date(Date.now() + 120000),
      },
    });
  });
  if (!row) return false;
  const heartbeat = setInterval(() => {
    void prisma.classroomJob
      .updateMany({
        where: { id: row.id, leaseToken: token, status: "RUNNING" },
        data: { leaseExpiresAt: new Date(Date.now() + 120000) },
      })
      .catch(() => undefined);
  }, 20000);
  try {
    if (row.kind === "ZOOM_SYNC") await syncMeeting(row.entityId);
    else if (row.kind === "ZOOM_EVENT") await processEvents(row.entityId);
    else if (row.kind === "FILE_SCAN") {
      const { scanFile } = await import("./files");
      await scanFile(row.entityId);
    } else if (row.kind === "FILE_PREVIEW") {
      const { prepareFilePreview } = await import("./file-preview");
      await prepareFilePreview(row.entityId);
    } else throw new Error("Loại tác vụ không hợp lệ.");
    await prisma.classroomJob.updateMany({
      where: { id: row.id, leaseToken: token },
      data: {
        status: "DONE",
        finishedAt: new Date(),
        error: null,
        leaseToken: null,
        leaseExpiresAt: null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Tác vụ thất bại";
    await prisma.classroomJob.updateMany({
      where: { id: row.id, leaseToken: token },
      data: {
        status: row.attempts >= 5 ? "FAILED" : "QUEUED",
        availableAt: new Date(
          Date.now() + Math.min(600000, 5000 * 2 ** row.attempts),
        ),
        error: message.slice(0, 500),
        leaseToken: null,
        leaseExpiresAt: null,
      },
    });
  } finally {
    clearInterval(heartbeat);
  }
  return true;
}

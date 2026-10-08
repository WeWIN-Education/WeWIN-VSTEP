import "server-only";
import { clearedAttention } from "./attention";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { attendanceSummary } from "./domain";

type EventPayload = {
  payload?: {
    object?: {
      start_time?: string;
      end_time?: string;
      participant?: {
        customer_key?: string;
        id?: string;
        user_id?: string;
        join_time?: string;
        leave_time?: string;
      };
    };
  };
};
export async function processEvents(meetingId: string) {
  await prisma.$transaction(async (db) => {
    await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"events:" + meetingId}))`;
    const session = await db.classroomSession.findUnique({
      where: { meetingId },
      include: { grants: true, classroom: { include: { enrollments: true } } },
    });
    if (!session) return;
    const events = await db.classroomZoomEvent.findMany({
      where: { meetingId },
      orderBy: [{ occurredAt: "asc" }, { event: "asc" }],
    });
    const starts = events.filter((e) => e.event === "meeting.started"),
      ends = events.filter((e) => e.event === "meeting.ended");
    const start = starts[0]?.occurredAt,
      end = ends.at(-1)?.occurredAt;
    if (session.status !== "CANCELED")
      await db.classroomSession.update({
        where: { id: session.id },
        data: {
          ...(start ? { confirmedStart: start } : {}),
          ...(end ? { confirmedEnd: end } : {}),
          status: end ? "ENDED" : start ? "LIVE" : session.status,
        },
      });
    const open = new Map<string, { userId: string; start: number }>(),
      intervals = new Map<string, { start: number; end: number }[]>();
    if (end || session.status === "CANCELED")
      await db.classroomPresentation.updateMany({
        where: { sessionId: session.id, fileId: { not: null } },
        data: {
          fileId: null,
          page: 1,
          controllerId: null,
          revision: { increment: 1 },
        },
      });
    if (end || session.status === "CANCELED")
      await db.classroomJoinGrant.updateMany({
        where: { sessionId: session.id },
        data: clearedAttention,
      });
    // Rebuild from durable events each time: late delivery and reconnect never double count.
    for (const event of events) {
      const participant = (event.payload as EventPayload).payload?.object
        ?.participant;
      if (
        !participant ||
        !["meeting.participant_joined", "meeting.participant_left"].includes(
          event.event,
        )
      )
        continue;
      const grant = session.grants.find(
        (g) =>
          g.id === participant.customer_key && +g.issuedAt <= +event.occurredAt,
      );
      const key = `${event.meetingUuid}:${participant.id || participant.user_id || ""}`;
      if (!participant.id && !participant.user_id) continue;
      if (event.event === "meeting.participant_joined") {
        if (grant && !open.has(key))
          open.set(key, { userId: grant.userId, start: +event.occurredAt });
      } else {
        const prior = open.get(key);
        if (!prior || (grant && prior.userId !== grant.userId)) continue;
        const items = intervals.get(prior.userId) || [];
        items.push({ start: prior.start, end: +event.occurredAt });
        intervals.set(prior.userId, items);
        open.delete(key);
      }
    }
    if (end)
      for (const prior of open.values()) {
        const items = intervals.get(prior.userId) || [];
        items.push({ start: prior.start, end: +end });
        intervals.set(prior.userId, items);
      }
    for (const enrollment of session.classroom.enrollments) {
      const trusted = intervals.get(enrollment.userId) || [];
      const summary =
        start && end && trusted.length
          ? attendanceSummary(trusted, +start, +end)
          : { minutes: 0, late: false, suggestion: "PENDING" };
      await db.classroomAttendance.upsert({
        where: {
          sessionId_userId: {
            sessionId: session.id,
            userId: enrollment.userId,
          },
        },
        create: {
          sessionId: session.id,
          userId: enrollment.userId,
          ...summary,
        },
        update: summary,
      });
    }
    await db.classroomZoomEvent.updateMany({
      where: { meetingId, processedAt: null },
      data: { processedAt: new Date() },
    });
  });
}
export function webhookObject(body: Prisma.InputJsonObject) {
  return (
    body.payload as
      | {
          object?: {
            id?: number | string;
            uuid?: string;
            participant?: { join_time?: string; leave_time?: string };
            start_time?: string;
            end_time?: string;
          };
        }
      | undefined
  )?.object;
}

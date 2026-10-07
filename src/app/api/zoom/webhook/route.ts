import { createHash, createHmac } from "node:crypto";
import { after, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { classroomEnabled, enqueue } from "@/lib/classroom/access";
import { verifyWebhook } from "@/lib/classroom/domain";
import { webhookObject } from "@/lib/classroom/events";
import { runClassroomJob } from "@/lib/classroom/jobs";

export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  if (!classroomEnabled()) return new Response(null, { status: 404 });
  const secret = process.env.ZOOM_WEBHOOK_SECRET || "";
  if (Number(request.headers.get("content-length") || 0) > 256 * 1024)
    return new Response(null, { status: 413 });
  const reader = request.body?.getReader();
  if (!reader) return new Response(null, { status: 400 });
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const next = await reader.read();
    if (next.done) break;
    size += next.value.byteLength;
    if (size > 256 * 1024) {
      await reader.cancel();
      return new Response(null, { status: 413 });
    }
    chunks.push(next.value);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (
    !verifyWebhook(
      raw,
      request.headers.get("x-zm-request-timestamp") || "",
      request.headers.get("x-zm-signature") || "",
      secret,
    )
  )
    return new Response(null, { status: 401 });
  let body: Prisma.InputJsonObject;
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response(null, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body))
    return new Response(null, { status: 400 });
  if (body?.event === "endpoint.url_validation") {
    const plainToken = (body.payload as { plainToken?: string })?.plainToken;
    if (
      !plainToken ||
      typeof plainToken !== "string" ||
      plainToken.length > 500
    )
      return new Response(null, { status: 400 });
    return NextResponse.json({
      plainToken,
      encryptedToken: createHmac("sha256", secret)
        .update(plainToken)
        .digest("hex"),
    });
  }
  if (
    ![
      "meeting.started",
      "meeting.ended",
      "meeting.participant_joined",
      "meeting.participant_left",
    ].includes(String(body.event))
  )
    return new Response(null, { status: 204 });
  const object = webhookObject(body),
    meetingId = String(object?.id || ""),
    meetingUuid = object?.uuid || "";
  if (!/^\d{9,12}$/.test(meetingId) || typeof meetingUuid !== "string")
    return new Response(null, { status: 400 });
  const occurrence =
    body.event === "meeting.participant_joined"
      ? object?.participant?.join_time
      : body.event === "meeting.participant_left"
        ? object?.participant?.leave_time
        : body.event === "meeting.ended"
          ? object?.end_time
          : object?.start_time;
  const occurredAt = occurrence
    ? new Date(occurrence)
    : new Date(Number(body.event_ts));
  if (!Number.isFinite(+occurredAt)) return new Response(null, { status: 400 });
  const id = createHash("sha256")
    .update(
      JSON.stringify([
        body.event,
        meetingId,
        meetingUuid,
        occurredAt.toISOString(),
        object?.participant,
      ]),
    )
    .digest("hex");
  try {
    await prisma.$transaction(async (db) => {
      await db.classroomZoomEvent.upsert({
        where: { id },
        create: {
          id,
          meetingId,
          meetingUuid,
          event: String(body.event),
          occurredAt,
          payload: body,
        },
        update: {},
      });
      await enqueue(db, `event:${id}`, "ZOOM_EVENT", meetingId);
    });
    after(async () => {
      await runClassroomJob({ kind: "ZOOM_EVENT", entityId: meetingId });
    });
    return new Response(null, { status: 204 });
  } catch {
    return new Response(null, { status: 500 });
  }
}

import { afterEach, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
const { upsert, enqueue } = vi.hoisted(() => ({
  upsert: vi.fn(),
  enqueue: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: async (fn: (db: unknown) => unknown) =>
      fn({ classroomZoomEvent: { upsert } }),
  },
}));
vi.mock("@/lib/classroom/access", () => ({
  classroomEnabled: () => true,
  enqueue,
}));
import { POST } from "../src/app/api/zoom/webhook/route";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});
function request(body: unknown, signed = true) {
  vi.stubEnv("ZOOM_WEBHOOK_SECRET", "qa-webhook-secret");
  const raw = JSON.stringify(body),
    ts = String(Math.floor(Date.now() / 1000));
  const mac = createHmac("sha256", "qa-webhook-secret")
    .update(`v0:${ts}:${raw}`)
    .digest("hex");
  return new Request("http://localhost/api/zoom/webhook", {
    method: "POST",
    body: raw,
    headers: {
      "x-zm-request-timestamp": ts,
      "x-zm-signature": signed ? `v0=${mac}` : "bad",
    },
  });
}
it("rejects malformed JSON structures and unsigned events without persisting", async () => {
  expect((await POST(request(null))).status).toBe(400);
  expect((await POST(request([]))).status).toBe(400);
  expect(
    (await POST(request({ event: "meeting.started" }, false))).status,
  ).toBe(401);
  expect(upsert).not.toHaveBeenCalled();
});
it("uses leave/end timestamps instead of earlier join/start timestamps and deduplicates delivery", async () => {
  const start = "2026-10-06T03:00:00Z",
    end = "2026-10-06T04:00:00Z";
  const left = {
    event: "meeting.participant_left",
    payload: {
      object: {
        id: "12345678901",
        uuid: "instance",
        start_time: start,
        participant: { id: "one", join_time: start, leave_time: end },
      },
    },
  };
  expect((await POST(request(left))).status).toBe(204);
  const first = upsert.mock.calls[0][0];
  expect(first.create.occurredAt.toISOString()).toBe(
    new Date(end).toISOString(),
  );
  await POST(request(left));
  expect(upsert.mock.calls[1][0].where.id).toBe(first.where.id);
  await POST(
    request({
      event: "meeting.ended",
      payload: {
        object: {
          id: "12345678901",
          uuid: "instance",
          start_time: start,
          end_time: end,
        },
      },
    }),
  );
  expect(upsert.mock.calls[2][0].create.occurredAt.toISOString()).toBe(
    new Date(end).toISOString(),
  );
  expect(enqueue).toHaveBeenCalledTimes(3);
});
it("answers signed endpoint validation without storing an attendance event", async () => {
  const response = await POST(
    request({
      event: "endpoint.url_validation",
      payload: { plainToken: "qa-challenge" },
    }),
  );
  expect(await response.json()).toEqual({
    plainToken: "qa-challenge",
    encryptedToken: createHmac("sha256", "qa-webhook-secret")
      .update("qa-challenge")
      .digest("hex"),
  });
  expect(upsert).not.toHaveBeenCalled();
});

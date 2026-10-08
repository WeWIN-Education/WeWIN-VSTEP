import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { putObject, deleteObject } from "../src/lib/storage";
vi.mock("server-only", () => ({}));
const auth = vi.hoisted(() => ({ current: vi.fn() }));
vi.mock("@/lib/access", () => ({ getCurrentUser: auth.current }));
const enabled = process.env.CLASSROOM_DATABASE_QA === "1",
  db = new PrismaClient(),
  prefix = `qa-slides-${randomUUID()}`;
const teacher = { id: prefix + "-teacher", role: "TEACHER" as const },
  learner = { id: prefix + "-learner", role: "LEARNER" as const },
  outsider = { id: prefix + "-outsider", role: "TEACHER" as const };
const id = prefix,
  sessionId = prefix + "-session",
  fileId = prefix + "-file",
  materialId = prefix + "-material",
  key = `classrooms/clean/${fileId}.pdf`;
beforeAll(async () => {
  if (!enabled) return;
  if (
    !process.env.DATABASE_URL?.includes(
      "localhost:5434/wewin_classroom_test",
    ) ||
    process.env.BLOB_READ_WRITE_TOKEN
  )
    throw new Error("Use isolated QA and local storage only.");
  for (const actor of [teacher, learner, outsider])
    await db.user.create({
      data: {
        ...actor,
        email: actor.id + "@example.invalid",
        name: actor.role,
      },
    });
  await db.classroom.create({
    data: { id, code: id, title: "Presentation QA" },
  });
  await db.classroomStaff.create({ data: { classId: id, userId: teacher.id } });
  await db.classroomEnrollment.create({
    data: { classId: id, userId: learner.id },
  });
  await db.classroomSession.create({
    data: {
      id: sessionId,
      classId: id,
      hostUserId: teacher.id,
      title: "Slides",
      startsAt: new Date(Date.now() - 60000),
      endsAt: new Date(Date.now() + 1200000),
    },
  });
  await db.classroomMaterial.create({
    data: { id: materialId, classId: id, title: "Slides", published: true },
  });
  await putObject(
    key,
    Buffer.from("%PDF-test-bytes-for-range"),
    "application/pdf",
  );
  await db.classroomFile.create({
    data: {
      id: fileId,
      classId: id,
      ownerId: teacher.id,
      materialId,
      name: "Slides.pdf",
      mimeType: "application/pdf",
        sizeBytes: 25,
      storageKey: `quarantine/${fileId}`,
      cleanKey: key,
      state: "CLEAN",
      previewPageCount: 4,
    },
  });
});
afterAll(async () => {
  if (enabled) {
    await db.classroomPresentation.deleteMany({ where: { sessionId } });
    await db.classroomFile.deleteMany({ where: { classId: id } });
    await db.classroomMaterial.deleteMany({ where: { classId: id } });
    await db.classroomSession.deleteMany({ where: { classId: id } });
    await db.classroomStaff.deleteMany({ where: { classId: id } });
    await db.classroomEnrollment.deleteMany({ where: { classId: id } });
    await db.classroom.deleteMany({ where: { id } });
    await db.user.deleteMany({
      where: { id: { in: [teacher.id, learner.id, outsider.id] } },
    });
    await deleteObject(key);
  }
  await db.$disconnect();
});
it.skipIf(!enabled)(
  "scopes presentation, serializes controllers, rejects unsafe/unpublished pages and authorizes Range/HEAD reads",
  async () => {
    const { classroomHTTP } = await import("../src/lib/classroom/http");
    const request = async (
      actor: typeof teacher | typeof learner | typeof outsider | null,
      group = "sessions",
      method = "GET",
      input?: unknown,
      headers: Record<string, string> = {},
      action = "presentation",
    ) => {
      auth.current.mockResolvedValue(actor);
      const entity = group === "sessions" ? sessionId : fileId;
      return classroomHTTP(
        new Request(`http://localhost:3000/api/${group}/${entity}/${action}`, {
          method,
          headers: {
            Origin: "http://localhost:3000",
            "Content-Type": "application/json",
            ...headers,
          },
          ...(input ? { body: JSON.stringify(input) } : {}),
        }),
        [group, entity, action],
      );
    };
    const change = { fileId, page: 2, revision: 0 };
    expect((await request(null)).status).toBe(401);
    expect((await request(outsider)).status).toBe(403);
    expect((await request(learner, "sessions", "PUT", change)).status).toBe(
      403,
    );
    expect(
      (
        await request(teacher, "sessions", "PUT", change, {
          Origin: "https://other.invalid",
        })
      ).status,
    ).toBe(403);
    expect(
      (await request(teacher, "sessions", "PUT", { ...change, page: 5 }))
        .status,
    ).toBe(400);
    expect((await request(teacher, "sessions", "PUT", change)).status).toBe(
      200,
    );
    expect((await (await request(learner)).json()).presentation).toMatchObject({
      fileId,
      page: 2,
      revision: 1,
    });
    expect(
      (await request(teacher, "sessions", "PUT", { ...change, page: 3 }))
        .status,
    ).toBe(409);
    expect(
      (
        await request(teacher, "sessions", "PUT", {
          ...change,
          page: 4,
          revision: 1,
        })
      ).status,
    ).toBe(200);
    expect(await db.classroomPresentation.count({ where: { sessionId } })).toBe(
      1,
    );
    const partial = await request(
      learner,
      "classroom-files",
      "GET",
      undefined,
      { Range: "bytes=0-3" },
      "view",
    );
    expect(partial.status).toBe(206);
    expect(partial.headers.get("content-range")).toBe("bytes 0-3/25");
    expect(await partial.text()).toBe("%PDF");
    const head = await request(
      learner,
      "classroom-files",
      "HEAD",
      undefined,
      {},
      "view",
    );
    expect(head.status).toBe(200);
    expect(await head.text()).toBe("");
    expect(
      (
        await request(
          learner,
          "classroom-files",
          "GET",
          undefined,
          { Range: "bytes=999-" },
          "view",
        )
      ).status,
    ).toBe(416);
    await db.classroomMaterial.update({
      where: { id: materialId },
      data: { published: false },
    });
    expect(
      (await (await request(learner)).json()).presentation.fileId,
    ).toBeNull();
    expect(
      (await request(learner, "classroom-files", "GET", undefined, {}, "view"))
        .status,
    ).toBe(403);
    expect(
      (await request(teacher, "sessions", "PUT", { ...change, revision: 2 }))
        .status,
    ).toBe(400);
    await db.classroomMaterial.update({
      where: { id: materialId },
      data: { published: true },
    });
    await db.classroomFile.update({
      where: { id: fileId },
      data: { state: "SCAN_PENDING" },
    });
    expect(
      (await request(learner, "classroom-files", "GET", undefined, {}, "view"))
        .status,
    ).toBe(404);
    await db.classroomSession.update({
      where: { id: sessionId },
      data: { status: "ENDED" },
    });
    expect(
      (
        await request(teacher, "sessions", "PUT", {
          fileId: null,
          page: 1,
          revision: 2,
        })
      ).status,
    ).toBe(409);
    const { clearEndedPresentations } =
      await import("../src/lib/classroom/presentation");
    await clearEndedPresentations();
    expect(
      (
        await db.classroomPresentation.findUniqueOrThrow({
          where: { sessionId },
        })
      ).fileId,
    ).toBeNull();
  },
);

import "server-only";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isSameOrigin } from "@/lib/request-security";
import {
  classAccess,
  classFilter,
  classroomActor,
  assignmentAccess,
  sessionAccess,
  admin,
} from "./access";
import {
  ClassroomError,
  csvCell,
  requireValue,
  zoomHostAllowed,
} from "./domain";
import * as service from "./service";
import * as zoom from "./zoom";
import { listAttention, recordAttention } from "./attention";
import { runClassroomJob } from "./jobs";
import {
  accessibleFile,
  completeFile,
  downloadFile,
  reserveFile,
  viewFile,
} from "./files";
import {
  listPresentation,
  updatePresentation,
  previewSelect,
} from "./presentation";

export const sessionSelect = {
  id: true,
  classId: true,
  title: true,
  hostUserId: true,
  startsAt: true,
  endsAt: true,
  status: true,
  revision: true,
  zoomState: true,
  confirmedStart: true,
  confirmedEnd: true,
  host: { select: { name: true } },
} as const;
const safeUser = { id: true, name: true } as const;
export async function classroomHTTP(request: Request, segments: string[]) {
  try {
    const actor = await classroomActor(),
      [group, id, action, subId] = segments,
      method = request.method,
      url = new URL(request.url);
    if (!["GET", "HEAD"].includes(method))
      requireValue(isSameOrigin(request), "Yêu cầu không hợp lệ.", 403);
    requireValue(
      Number(request.headers.get("content-length") || 0) <= 1024 * 1024,
      "Yêu cầu quá lớn.",
      413,
    );
    const readOnly = ["GET", "HEAD"].includes(method);
    const raw = readOnly ? "" : await request.text();
    requireValue(raw.length <= 1024 * 1024, "Yêu cầu quá lớn.", 413);
    let input: Record<string, unknown> | null = {};
    if (!readOnly) {
      try {
        input = JSON.parse(raw);
      } catch {
        input = null;
      }
    }
    requireValue(
      input && typeof input === "object" && !Array.isArray(input),
      "Dữ liệu không hợp lệ.",
    );
    let result: unknown;
    if (group === "classes") {
      if (!id && method === "GET")
        result = await prisma.classroom.findMany({
          where: classFilter(actor),
          include: {
            _count: {
              select: {
                enrollments: { where: { status: "ACTIVE" } },
                assignments: { where: { published: true } },
              },
            },
            staff: { select: { userId: true, user: { select: safeUser } } },
            sessions: {
              where: {
                status: { in: ["SCHEDULED", "LIVE"] },
                endsAt: { gt: new Date() },
              },
              select: sessionSelect,
              orderBy: { startsAt: "asc" },
              take: 1,
            },
          },
          orderBy: { updatedAt: "desc" },
          take: 200,
        });
      else if (!id && method === "POST")
        result = await service.saveClass(actor, input);
      else if (id && !action && method === "PATCH")
        result = await service.saveClass(actor, input, id);
      else if (id && !action && method === "GET") {
        await classAccess(actor, id);
        const learner = actor.role === "LEARNER";
        const classroom = await prisma.classroom.findUnique({
          where: { id },
          include: {
            staff: { include: { user: { select: safeUser } } },
            enrollments: {
              where: learner ? { userId: actor.id } : {},
              include: { user: { select: safeUser } },
            },
            sessions: { select: sessionSelect, orderBy: { startsAt: "asc" } },
            materials: {
              where: learner ? { published: true } : {},
              include: {
                files: {
                  where: { state: "CLEAN" },
                  select: previewSelect,
                },
              },
              orderBy: { createdAt: "desc" },
            },
            assignments: {
              where: learner ? { published: true } : {},
              include: { _count: { select: { submissions: true } } },
              orderBy: { dueAt: "asc" },
            },
          },
        });
        const materials = await Promise.all(
          (classroom?.materials || []).map(async (m) => {
            const video =
              m.sourceKind === "VIDEO" && m.sourceId
                ? await prisma.learningVideo.findFirst({
                    where: { id: m.sourceId, published: true },
                    select: { slug: true },
                  })
                : null;
            const content =
              m.sourceKind === "CONTENT" && m.sourceId
                ? await prisma.learningContent.findFirst({
                    where: { id: m.sourceId, published: true },
                    select: { kind: true },
                  })
                : null;
            return {
              ...m,
              sourceHref:
                m.sourceKind === "VIDEO"
                  ? video
                    ? `/video/${video.slug}`
                    : null
                  : m.sourceKind === "MATERIAL" && m.sourceId
                    ? `/api/materials/${m.sourceId}`
                    : content
                      ? `/${content.kind === "SKILL" ? "training" : "practice"}/content/${m.sourceId}`
                      : null,
            };
          }),
        );
        result = classroom ? { ...classroom, materials } : null;
      } else if (id && action === "enrollments" && method === "POST")
        result = await service.enrollment(actor, id, input);
      else if (id && action === "materials" && method === "POST")
        result = await service.saveMaterial(actor, id, input);
      else if (id && action === "materials" && subId && method === "PATCH")
        result = await service.saveMaterial(actor, id, input, subId);
      else if (id && action === "materials" && subId && method === "DELETE")
        result = (await service.removeMaterial(actor, id, subId, input)) ?? {
          ok: true,
        };
      else if (id && action === "assignments" && method === "POST")
        result = await service.saveAssignment(actor, id, input);
      else if (id && action === "assignments" && subId && method === "PATCH")
        result = await service.saveAssignment(actor, id, input, subId);
      else if (id && action === "results" && method === "GET") {
        await classAccess(actor, id);
        const userId =
          actor.role === "LEARNER"
            ? actor.id
            : url.searchParams.get("userId") || undefined;
        const start = url.searchParams.get("from"),
          end = url.searchParams.get("to"),
          sessionId = url.searchParams.get("sessionId") || undefined;
        requireValue(
          [start, end].every((d) => !d || /^\d{4}-\d{2}-\d{2}$/.test(d)),
          "Bộ lọc ngày không hợp lệ.",
        );
        const from = start ? new Date(start + "T00:00:00+07:00") : undefined,
          to = end ? new Date(end + "T23:59:59.999+07:00") : undefined;
        requireValue(
          (!from || Number.isFinite(+from)) &&
            (!to || Number.isFinite(+to)) &&
            (!from || !to || +from <= +to),
          "Bộ lọc ngày không hợp lệ.",
        );
        const attendance = await prisma.classroomAttendance.findMany({
          where: {
            userId,
            sessionId,
            session: { classId: id, startsAt: { gte: from, lte: to } },
          },
          include: {
            user: { select: safeUser },
            session: { select: { id: true, title: true, startsAt: true } },
          },
          orderBy: { session: { startsAt: "desc" } },
          take: 5000,
        });
        const submissions = await prisma.classroomSubmission.findMany({
          where: {
            userId,
            assignment: { classId: id, sessionId },
            submittedAt: { gte: from, lte: to },
          },
          include: {
            user: { select: safeUser },
            assignment: { select: { id: true, title: true } },
          },
          orderBy: { submittedAt: "desc" },
          take: 5000,
        });
        if (url.searchParams.get("format") === "csv") {
          const lines = [
            [
              "Loại",
              "Học viên",
              "Nội dung",
              "Ngày",
              "Điểm",
              "Điểm danh",
              "Trạng thái",
              "Ghi chú",
            ],
            ...attendance.map((a) => [
              "Điểm danh",
              a.user.name,
              a.session.title,
              a.session.startsAt.toISOString(),
              "",
              a.finalStatus || "Chờ xác nhận",
              a.suggestion,
              a.reason,
            ]),
            ...submissions.map((s) => [
              "Bài nộp",
              s.user.name,
              `${s.assignment.title} (v${s.version})`,
              s.submittedAt.toISOString(),
              s.status === "RETURNED" ? s.grade : null,
              "",
              s.status,
              s.status === "RETURNED" ? s.feedback : "",
            ]),
          ];
          return new Response(
            "\uFEFF" +
              lines.map((row) => row.map(csvCell).join(",")).join("\r\n"),
            {
              headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition":
                  "attachment; filename=classroom-results.csv",
                "Cache-Control": "private, no-store",
              },
            },
          );
        }
        result = {
          attendance,
          submissions: submissions.map((s) =>
            actor.role === "LEARNER" && s.status !== "RETURNED"
              ? {
                  ...s,
                  grade: null,
                  feedback: s.status === "REVISION_REQUESTED" ? s.feedback : "",
                }
              : s,
          ),
          truncated: attendance.length === 5000 || submissions.length === 5000,
        };
      }
    } else if (group === "sessions") {
      if (!id && method === "GET")
        result = await prisma.classroomSession.findMany({
          where: { classroom: classFilter(actor) },
          select: sessionSelect,
          orderBy: { startsAt: "desc" },
          take: 300,
        });
      else if (!id && method === "POST") {
        const saved = await service.saveSession(actor, input);
        await runClassroomJob({ kind: "ZOOM_SYNC", entityId: saved.id });
        result = { id: saved.id };
      } else if (id && !action && method === "PATCH") {
        const saved = await service.saveSession(actor, input, id);
        await runClassroomJob({ kind: "ZOOM_SYNC", entityId: saved.id });
        result = { id: saved.id };
      } else if (id && !action && method === "GET") {
        await sessionAccess(actor, id);
        result = await prisma.classroomSession.findUnique({
          where: { id },
          select: {
            ...sessionSelect,
            classroom: {
              select: {
                id: true,
                title: true,
                enrollments:
                  actor.role !== "LEARNER"
                    ? { include: { user: { select: safeUser } } }
                    : false,
              },
            },
            attendance: {
              where: actor.role === "LEARNER" ? { userId: actor.id } : {},
              include: { user: { select: safeUser } },
            },
            grants:
              actor.role !== "LEARNER"
                ? {
                    select: {
                      id: true,
                      userId: true,
                      state: true,
                      user: { select: safeUser },
                    },
                  }
                : false,
          },
        });
      } else if (id && action === "cancel" && method === "POST") {
        await service.cancelSession(actor, id, input);
        await runClassroomJob({ kind: "ZOOM_SYNC", entityId: id });
        result = { ok: true };
      } else if (id && action === "presentation" && method === "GET")
        result = await listPresentation(actor, id);
      else if (id && action === "presentation" && method === "PUT")
        result = await updatePresentation(actor, id, input);
      else if (id && action === "attention" && method === "GET")
        result = await listAttention(actor, id);
      else if (id && action === "attention" && method === "POST")
        result = await recordAttention(actor, id, input);
      else if (id && action === "join-context" && method === "POST")
        result = await zoom.joinContext(actor, id, input);
      else if (
        id &&
        ["leave", "release-device"].includes(action) &&
        method === "POST"
      )
        result = await zoom.leaveOrRelease(
          actor,
          id,
          input,
          action === "release-device",
        );
      else if (id && action === "attendance" && method === "POST")
        result = await service.confirmAttendance(actor, id, input);
      else if (id && action === "reconcile" && method === "POST") {
        result = await zoom.reconcileMeeting(actor, id, input);
        await runClassroomJob({ kind: "ZOOM_SYNC", entityId: id });
      }
    } else if (group === "assignments" && id) {
      if (!action && method === "GET") {
        await assignmentAccess(actor, id);
        const row = await prisma.classroomAssignment.findUniqueOrThrow({
          where: { id },
          include: {
            classroom: { select: { title: true } },
            files: {
              where: { state: "CLEAN" },
              select: { id: true, name: true },
            },
            drafts: { where: { userId: actor.id } },
            submissions: {
              where: actor.role === "LEARNER" ? { userId: actor.id } : {},
              include: {
                user: { select: safeUser },
                files: { select: { id: true, name: true } },
              },
              orderBy: { submittedAt: "desc" },
            },
          },
        });
        result = {
          ...row,
          submissions: row.submissions.map((s) =>
            actor.role === "LEARNER" && s.status === "SUBMITTED"
              ? {
                  ...s,
                  grade: null,
                  feedback: "",
                  gradedById: null,
                  gradedAt: null,
                }
              : s,
          ),
        };
      } else if (action === "draft" && method === "PUT")
        result = await service.saveDraft(actor, id, input);
      else if (action === "submit" && method === "POST")
        result = await service.submit(actor, id, input);
      else if (action === "submissions" && subId && method === "PATCH")
        result = await service.grade(actor, id, subId, input);
    } else if (group === "notifications") {
      if (method === "GET")
        result = await prisma.classroomNotification.findMany({
          where: { userId: actor.id },
          orderBy: { createdAt: "desc" },
          take: 50,
        });
      if (method === "PATCH") {
        await prisma.classroomNotification.updateMany({
          where: { userId: actor.id, ...(id ? { id } : { readAt: null }) },
          data: { readAt: new Date() },
        });
        result = { ok: true };
      }
    } else if (group === "classroom-files") {
      if (id === "capabilities" && method === "GET")
        result = {
          directUpload: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
          serverUpload: process.env.NODE_ENV !== "production",
        };
      else if (!id && method === "POST")
        result = await reserveFile(actor, input);
      else if (id && action === "complete" && method === "POST")
        result = await completeFile(actor, id);
      else if (id && action === "download" && method === "GET")
        return await downloadFile(actor, id);
      else if (id && action === "view" && ["GET", "HEAD"].includes(method))
        return await viewFile(actor, id, request);
      else if (id && action === "metadata" && method === "GET") {
        const file = await accessibleFile(actor, id);
        result = {
          id: file.id,
          name: file.name,
          mimeType: file.mimeType,
          sizeBytes: file.sizeBytes,
          previewPageCount: file.previewPageCount,
          previewError: file.previewError,
        };
      } else if (id && !action && method === "GET") {
        const file = await prisma.classroomFile.findFirst({
          where: { id, ownerId: actor.id },
          select: { ...previewSelect, state: true },
        });
        requireValue(file, "Không tìm thấy tệp.", 404);
        result = file;
      }
    } else if (group === "classroom-options") {
      if (method === "GET") {
        requireValue(actor.role !== "LEARNER", "Bạn không có quyền.", 403);
        result = {
          users:
            actor.role === "ADMIN"
              ? await prisma.user.findMany({
                  where: {
                    isActive: true,
                    ...(url.searchParams.get("q")
                      ? {
                          OR: [
                            {
                              name: {
                                contains: url.searchParams.get("q")!,
                                mode: "insensitive",
                              },
                            },
                            {
                              email: {
                                contains: url.searchParams.get("q")!,
                                mode: "insensitive",
                              },
                            },
                          ],
                        }
                      : {}),
                  },
                  select: { ...safeUser, role: true, email: true },
                  orderBy: { name: "asc" },
                  take: 2000,
                })
              : [],
          materials: await prisma.learningMaterial.findMany({
            where: { published: true },
            select: { id: true, title: true },
            take: 500,
          }),
          videos: await prisma.learningVideo.findMany({
            where: { published: true },
            select: { id: true, title: true, slug: true },
            take: 500,
          }),
          contents: await prisma.learningContent.findMany({
            where: { published: true },
            select: { id: true, title: true },
            take: 500,
          }),
        };
      }
    } else if (group === "classroom-integrations") {
      admin(actor);
      if (method === "POST" && action === "retry" && id) {
        const job = await prisma.classroomJob.findUnique({ where: { id } });
        requireValue(
          job && ["QUEUED", "FAILED", "DONE"].includes(job.status),
          "Tác vụ không thể thử lại.",
          409,
        );
        if (job.kind === "ZOOM_SYNC") {
          const row = await prisma.classroomSession.findUnique({
            where: { id: job.entityId },
          });
          requireValue(
            row?.zoomState !== "NEEDS_RECONCILE",
            "Cần đối soát phòng trước; không tạo lại tự động.",
            409,
          );
        }
        const reset = await prisma.classroomJob.updateMany({
          where: { id, status: job.status, leaseToken: null },
          data: {
            status: "QUEUED",
            attempts: 0,
            availableAt: new Date(),
            error: null,
            finishedAt: null,
          },
        });
        requireValue(
          reset.count,
          "Tác vụ đang được xử lý. Hãy tải lại danh sách.",
          409,
        );
        if (job.kind === "ZOOM_SYNC" || job.kind === "ZOOM_EVENT")
          await runClassroomJob({ kind: job.kind, entityId: job.entityId });
        result = { ok: true };
      } else if (method === "POST")
        result = await zoom.verifyHost(actor, input);
      else if (method === "GET")
        result = {
          allowBasic: zoomHostAllowed(false),
          configuration: Object.fromEntries(
            [
              "ZOOM_ACCOUNT_ID",
              "ZOOM_OAUTH_CLIENT_ID",
              "ZOOM_OAUTH_CLIENT_SECRET",
              "ZOOM_MEETING_SDK_KEY",
              "ZOOM_MEETING_SDK_SECRET",
              "ZOOM_WEBHOOK_SECRET",
              "DATA_ENCRYPTION_KEY",
              "CLAMAV_HOST",
              "BLOB_READ_WRITE_TOKEN",
            ].map((key) => [key, Boolean(process.env[key])]),
          ),
          hosts: await prisma.zoomHost.findMany({
            include: { user: { select: safeUser } },
          }),
          workers: await prisma.classroomWorker.findMany(),
          jobs: await prisma.classroomJob.findMany({
            orderBy: { createdAt: "desc" },
            take: 50,
          }),
          reconcile: await prisma.classroomSession.findMany({
            where: { zoomState: "NEEDS_RECONCILE" },
            select: sessionSelect,
          }),
        };
    }
    requireValue(result !== undefined, "Không tìm thấy chức năng.", 404);
    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    const status =
      error instanceof ClassroomError
        ? error.status
        : error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
          ? 409
          : 500;
    return NextResponse.json(
      {
        error:
          error instanceof ClassroomError
            ? error.message
            : status === 409
              ? "Dữ liệu đã tồn tại hoặc bị trùng."
              : "Không thể xử lý lúc này. Nội dung đã nhập được giữ lại; hãy thử lại.",
      },
      { status },
    );
  }
}

"use client";
import { NavigationLink as Link } from "@/components/layout/NavigationLink";
import {
  api,
  Badge,
  Empty,
  Field,
  Form,
  State,
  useAPI,
  when,
  type Person,
  type Role,
  type Session,
} from "./shared";
type Detail = Session & {
  classroom: {
    id: string;
    title: string;
    enrollments: { userId: string; user: Person }[];
  };
  attendance: {
    userId: string;
    minutes: number;
    suggestion: string;
    finalStatus: string | null;
    reason: string;
  }[];
  grants: { userId: string; state: string; user: Person }[];
};
export function SessionPage({ id, role }: { id: string; role: Role }) {
  const state = useAPI<Detail>(`/api/sessions/${id}`),
    s = state.data;
  return (
    <div className="mx-auto max-w-[1120px] space-y-6">
      <Link
        href={s ? `/classes/${s.classId}?tab=sessions` : "/classes"}
        className="inline-flex min-h-11 items-center text-sm text-brand"
      >
        ← Lịch học của lớp
      </Link>
      <State loading={state.loading} error={state.error}>
        {s && (
          <>
            <header className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs text-ink-muted">{s.classroom.title}</p>
                <h1 className="mt-2 text-3xl">{s.title}</h1>
                <p className="mt-3 text-sm text-ink-muted">
                  {when(s.startsAt)} — {when(s.endsAt)}
                </p>
              </div>
              <Badge value={s.status} />
            </header>
            <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
              <section className="classroom-panel space-y-5">
                <h2 className="text-lg">Vào phòng học</h2>
                <p className="text-sm leading-7 text-ink-muted">
                  Học viên vào sớm tối đa 10 phút, nhân sự 15 phút. Bạn có thể
                  kiểm tra mic, camera trong phòng chờ trước khi bắt đầu.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge value={s.zoomState} />
                  <span className="text-sm">Giáo viên: {s.host.name}</span>
                </div>
                {["SCHEDULED", "LIVE"].includes(s.status) ? (
                  <Link
                    href={`/sessions/${id}/room`}
                    className="inline-flex min-h-12 items-center rounded-xl bg-brand px-5 text-sm font-semibold text-white"
                  >
                    Vào lớp học →
                  </Link>
                ) : (
                  <Empty>Buổi đã kết thúc hoặc bị hủy.</Empty>
                )}
                <p className="text-xs leading-6 text-ink-muted">
                  Khi chuyển thiết bị, nhờ giáo viên giải phóng chỗ cũ. Giữ
                  nguyên thiết bị để kết nối lại khi mất mạng.
                </p>
              </section>
              <section className="classroom-panel space-y-4">
                <h2 className="text-lg">Chuẩn bị trước buổi học</h2>
                <p className="text-sm leading-7 text-ink-muted">
                  Dùng tai nghe, kiểm tra mạng và cấp quyền mic/camera cho trình
                  duyệt.
                </p>
                <Link
                  href={`/classes/${s.classId}?tab=materials`}
                  className="inline-flex min-h-11 items-center text-sm font-medium text-brand"
                >
                  Xem học liệu của lớp →
                </Link>
                <Link
                  href="/contact"
                  className="block py-2 text-sm text-ink-muted"
                >
                  Liên hệ hỗ trợ
                </Link>
              </section>
            </div>
            {role !== "LEARNER" && (
              <section className="classroom-panel space-y-5">
                <h2 className="text-lg">Điểm danh & thiết bị</h2>
                <p className="text-sm text-ink-muted">
                  Zoom đề xuất khi có thời gian bắt đầu/kết thúc và danh tính đã
                  đối chiếu. Giáo viên xác nhận kết quả; chỉnh sửa cần lý do.
                </p>
                {s.classroom.enrollments?.map((e) => {
                  const a = s.attendance.find((a) => a.userId === e.userId),
                    grant = s.grants?.find((g) => g.userId === e.userId);
                  return (
                    <div
                      key={e.userId}
                      className="rounded-2xl border border-border p-4"
                    >
                      <div className="mb-4 flex flex-wrap items-center gap-3">
                        <h3 className="font-semibold">{e.user.name}</h3>
                        <Badge value={a?.finalStatus || "PENDING"} />
                        <span className="text-xs text-ink-muted">
                          Zoom: {(a?.minutes || 0).toFixed(1)} phút · Đề xuất:{" "}
                          {a?.suggestion ? (
                            <Badge value={a.suggestion} />
                          ) : (
                            "Chờ"
                          )}
                        </span>
                      </div>
                      <Form
                        title="Xác nhận điểm danh"
                        onDone={() => void state.reload()}
                        submit={(f) =>
                          api(`/api/sessions/${id}/attendance`, "POST", {
                            userId: e.userId,
                            finalStatus: f.get("finalStatus"),
                            reason: f.get("reason"),
                          })
                        }
                      >
                        <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
                          <Field label="Kết quả">
                            <select
                              name="finalStatus"
                              defaultValue={
                                a?.finalStatus ||
                                (a?.suggestion !== "PENDING"
                                  ? a?.suggestion
                                  : "PRESENT") ||
                                "PRESENT"
                              }
                              className="classroom-input"
                            >
                              <option value="PRESENT">Có mặt</option>
                              <option value="LATE">Đi muộn</option>
                              <option value="ABSENT">Vắng</option>
                              <option value="EXCUSED">Vắng có phép</option>
                            </select>
                          </Field>
                          <Field label="Lý do xác nhận/chỉnh sửa">
                            <input
                              name="reason"
                              required
                              maxLength={1000}
                              defaultValue={a?.reason}
                              className="classroom-input"
                            />
                          </Field>
                        </div>
                      </Form>
                      {grant && grant.state !== "RELEASED" && (
                        <Form
                          className="mt-5 border-t border-border pt-4"
                          title="Giải phóng thiết bị"
                          onDone={() => void state.reload()}
                          submit={(f) =>
                            api(`/api/sessions/${id}/release-device`, "POST", {
                              userId: e.userId,
                              reason: f.get("reason"),
                            })
                          }
                        >
                          <Field label="Lý do chuyển thiết bị">
                            <input
                              required
                              name="reason"
                              maxLength={1000}
                              className="classroom-input"
                            />
                          </Field>
                        </Form>
                      )}
                    </div>
                  );
                })}
                {!s.classroom.enrollments?.length && (
                  <Empty>Chưa có học viên được ghi danh.</Empty>
                )}
              </section>
            )}
          </>
        )}
      </State>
    </div>
  );
}

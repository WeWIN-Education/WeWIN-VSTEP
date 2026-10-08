"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { NavigationLink as Link } from "@/components/layout/NavigationLink";
import { Button } from "@/components/ui/Button";
import {
  api,
  Badge,
  Empty,
  Field,
  Form,
  State,
  useAPI,
  when,
  localDate,
  formDate,
  type Options,
  type Session,
} from "./shared";
import { SessionRow } from "./ClassDetail";
import type { Classroom } from "./ClassList";
export function SessionManagement() {
  const state = useAPI<Session[]>("/api/sessions"),
    classes = useAPI<Classroom[]>("/api/classes"),
    options = useAPI<Options>("/api/classroom-options"),
    params = useSearchParams(),
    [classId, setClass] = useState(params.get("classId") || ""),
    [editing, setEditing] = useState<Session | null>(null),
    [show, setShow] = useState(false);
  const chosen = classes.data?.find((c) => c.id === classId);
  return (
    <div className="mx-auto max-w-[1120px] space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-brand">QUẢN TRỊ</p>
          <h1 className="mt-2 text-3xl">Lịch lớp học</h1>
          <p className="mt-3 text-sm text-ink-muted">
            Chỉ quản trị viên được tạo, đổi lịch và hủy buổi.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setShow((v) => !v);
          }}
        >
          Tạo buổi học
        </Button>
      </header>
      <Field label="Lớp học">
        <select
          value={classId}
          onChange={(e) => setClass(e.target.value)}
          className="classroom-input max-w-md"
        >
          <option value="">Tất cả lớp</option>
          {classes.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </Field>
      {show && (
        <section className="classroom-panel">
          <h2 className="mb-5 text-lg">
            {editing ? "Đổi lịch buổi học" : "Thêm buổi học"}
          </h2>
          <Form
            key={editing?.id || "new"}
            onDone={() => {
              setShow(false);
              void state.reload();
            }}
            submit={(f) =>
              api(
                `/api/sessions${editing ? `/${editing.id}` : ""}`,
                editing ? "PATCH" : "POST",
                {
                  classId,
                  hostUserId: f.get("hostUserId"),
                  title: f.get("title"),
                  startsAt: formDate(f.get("startsAt")),
                  endsAt: formDate(f.get("endsAt")),
                  revision: editing?.revision,
                },
              )
            }
          >
            <Field label="Tên buổi">
              <input
                name="title"
                required
                maxLength={200}
                defaultValue={editing?.title}
                className="classroom-input"
              />
            </Field>
            <p className="text-sm text-ink-muted">
              Chọn lớp ở bộ lọc phía trên trước khi tạo buổi.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Bắt đầu (giờ Việt Nam)">
                <input
                  name="startsAt"
                  type="datetime-local"
                  required
                  defaultValue={localDate(editing?.startsAt)}
                  className="classroom-input"
                />
              </Field>
              <Field label="Kết thúc (giờ Việt Nam)">
                <input
                  name="endsAt"
                  type="datetime-local"
                  required
                  defaultValue={localDate(
                    editing?.endsAt ||
                      new Date(
                        Date.now() + 86400000 + 30 * 60000,
                      ).toISOString(),
                  )}
                  className="classroom-input"
                />
              </Field>
            </div>
            <Field label="Giáo viên / host Zoom">
              <select
                name="hostUserId"
                required
                defaultValue={editing?.hostUserId || ""}
                className="classroom-input"
              >
                <option value="">Chọn host đã xác minh Zoom</option>
                {chosen?.staff.map((s) => (
                  <option key={s.userId} value={s.userId}>
                    {options.data?.users.find((u) => u.id === s.userId)?.name ||
                      s.user.name}
                  </option>
                ))}
              </select>
            </Field>
            <p className="text-xs leading-6 text-ink-muted">
              Host phải được xác minh trong tài khoản Zoom WEWIN. Buổi học với
              host Basic tối đa 40 phút. Lịch giữ khoảng cách 15 phút để tránh
              trùng phòng. Khi lưu, hệ thống sẽ tạo phòng Zoom.
            </p>
          </Form>
        </section>
      )}
      <State loading={state.loading} error={state.error}>
        <div className="space-y-4">
          {state.data
            ?.filter((s) => !classId || s.classId === classId)
            .map((s) => (
              <section key={s.id} className="classroom-panel">
                <SessionRow session={s} />
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Badge value={s.zoomState} />
                  {s.status === "SCHEDULED" && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setClass(s.classId);
                          setEditing(s);
                          setShow(true);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      >
                        Đổi lịch/host
                      </Button>
                      <Cancel session={s} reload={state.reload} />
                    </>
                  )}
                </div>
              </section>
            ))}
          {!state.data?.length && (
            <Empty>
              Chưa có buổi học. Xác minh host tại mục Zoom & tác vụ trước khi
              tạo lịch.
            </Empty>
          )}
        </div>
      </State>
      <Link
        href="/manage/integrations"
        className="inline-flex min-h-11 items-center text-sm text-brand"
      >
        Zoom & tác vụ →
      </Link>
    </div>
  );
}
function Cancel({
  session: s,
  reload,
}: {
  session: Session;
  reload: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <Button variant="ghost" onClick={() => setOpen((v) => !v)}>
        Hủy buổi
      </Button>
      {open && (
        <Form
          className="mt-3"
          title="Xác nhận hủy buổi"
          onDone={() => void reload()}
          submit={(f) =>
            api(`/api/sessions/${s.id}/cancel`, "POST", {
              revision: s.revision,
              reason: f.get("reason"),
            })
          }
        >
          <Field label="Lý do hủy">
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
}
type Integration = {
  allowBasic: boolean;
  configuration: Record<string, boolean>;
  hosts: {
    userId: string;
    email: string;
    licensed: boolean;
    verified: boolean;
    user: { name: string | null };
  }[];
  workers: {
    id: string;
    lastSeenAt: string;
  }[];
  jobs: {
    id: string;
    kind: string;
    status: string;
    attempts: number;
    error: string | null;
  }[];
  reconcile: Session[];
};
export function IntegrationManagement() {
  const state = useAPI<Integration>("/api/classroom-integrations"),
    options = useAPI<Options>("/api/classroom-options"),
    [error, setError] = useState("");
  return (
    <div className="mx-auto max-w-[1120px] space-y-6">
      <header>
        <p className="text-xs text-brand">QUẢN TRỊ</p>
        <h1 className="mt-2 text-3xl">Zoom & tác vụ</h1>
        <p className="mt-3 text-sm text-ink-muted">
          Kiểm tra kết nối, giấy phép host và xử lý các tác vụ lớp học.
        </p>
      </header>
      <State loading={state.loading} error={state.error}>
        {state.data && (
          <>
            <div className="grid gap-6 lg:grid-cols-2">
              <section className="classroom-panel space-y-4">
                <h2 className="text-lg">Cấu hình hệ thống</h2>
                {Object.entries(state.data.configuration).map(
                  ([key, ready]) => (
                    <div
                      key={key}
                      className="flex flex-wrap justify-between gap-2 text-xs"
                    >
                      <span className="break-all font-ui">{key}</span>
                      <span className={ready ? "text-brand" : "text-ink-muted"}>
                        {ready ? "Đã cấu hình" : "Chưa cấu hình"}
                      </span>
                    </div>
                  ),
                )}
                <p className="text-xs leading-6 text-ink-muted">
                  Giá trị bí mật chỉ được đọc ở máy chủ. Endpoint Zoom:
                  /api/zoom/webhook trên tên miền HTTPS của hệ thống.
                </p>
              </section>
              <section className="classroom-panel">
                <h2 className="mb-5 text-lg">Xác minh host</h2>
                <p className="mb-4 text-sm text-ink-muted">
                  {state.data.allowBasic
                    ? "Đã bật dùng thử Zoom Basic: mỗi buổi tối đa 40 phút. Dùng email thuộc tài khoản Zoom đã kết nối."
                    : "Dùng email host có giấy phép thuộc tài khoản Zoom đã kết nối."}
                </p>
                <Form
                  title="Kết nối & xác minh"
                  onDone={() => void state.reload()}
                  submit={(f) =>
                    api("/api/classroom-integrations", "POST", {
                      userId: f.get("userId"),
                      email: f.get("email"),
                    })
                  }
                >
                  <Field label="Tài khoản WEWIN">
                    <select name="userId" required className="classroom-input">
                      <option value="">Chọn giáo viên/admin</option>
                      {options.data?.users
                        .filter((u) => u.role !== "LEARNER")
                        .map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name || u.email}
                          </option>
                        ))}
                    </select>
                  </Field>
                  <Field label="Email host Zoom">
                    <input
                      name="email"
                      type="email"
                      required
                      maxLength={254}
                      className="classroom-input"
                    />
                  </Field>
                </Form>
                <div className="mt-5 space-y-3">
                  {state.data.hosts.map((h) => (
                    <p key={h.userId} className="text-sm">
                      {h.user.name} · {h.email}
                      <span className="mt-1 block text-xs text-ink-muted">
                        {h.verified
                          ? h.licensed
                            ? "Đã xác minh · Có giấy phép"
                            : "Đã xác minh · Basic · Tối đa 40 phút"
                          : "Cần xác minh lại"}
                      </span>
                    </p>
                  ))}
                </div>
              </section>
            </div>
            <section className="classroom-panel space-y-4">
              <h2 className="text-lg">Worker lớp học</h2>
              <p className="text-sm leading-6 text-ink-muted">
                Phòng Zoom được tạo khi lưu buổi học; webhook được xử lý trên
                web. Worker dùng để kiểm tra tệp, chuẩn bị bản xem, thử lại tác
                vụ lỗi và dọn dữ liệu hết hạn.
              </p>
              {state.data.workers.length ? (
                state.data.workers.map((w) => (
                  <p key={w.id} className="break-all text-sm">
                    {Date.now() - new Date(w.lastSeenAt).getTime() < 45000
                      ? "Đang hoạt động"
                      : "Chưa thấy tín hiệu gần đây"}{" "}
                    · {w.id}
                    <span className="mt-1 block text-xs text-ink-muted">
                      Lần cuối: {when(w.lastSeenAt)}
                    </span>
                  </p>
                ))
              ) : (
                <Empty>
                  Worker chưa chạy. Tệp đính kèm sẽ chờ xử lý; bạn vẫn có thể
                  tạo phòng Zoom để học thử.
                </Empty>
              )}
              <Button variant="outline" onClick={() => void state.reload()}>
                Kiểm tra lại
              </Button>
            </section>
            {state.data.reconcile.length > 0 && (
              <section className="classroom-panel space-y-5">
                <h2 className="text-lg">Phòng cần đối soát</h2>
                <p className="text-sm leading-6 text-ink-muted">
                  Sau khi timeout, phòng có thể đã được tạo. Kiểm tra mã
                  WEWIN_SESSION trong Zoom, rồi liên kết phòng đúng. Hệ thống
                  không tự tạo thêm phòng.
                </p>
                {state.data.reconcile.map((s) => (
                  <Form
                    key={s.id}
                    title="Đối soát phòng"
                    onDone={() => void state.reload()}
                    submit={(f) =>
                      api(`/api/sessions/${s.id}/reconcile`, "POST", {
                        meetingId: f.get("meetingId"),
                      })
                    }
                  >
                    <p className="text-sm font-semibold">{s.title}</p>
                    <p className="break-all text-xs text-ink-muted">
                      WEWIN_SESSION:{s.id}
                    </p>
                    <Field label="Meeting ID">
                      <input
                        name="meetingId"
                        required
                        pattern="[0-9]{9,12}"
                        className="classroom-input"
                      />
                    </Field>
                  </Form>
                ))}
              </section>
            )}
            <section className="classroom-panel space-y-4">
              <h2 className="text-lg">Tác vụ gần đây</h2>
              {state.data.jobs.map((j) => (
                <div
                  key={j.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface p-4"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {j.kind} · Lần {j.attempts}
                    </p>
                    {j.error && (
                      <p className="mt-2 text-xs text-ink-muted">{j.error}</p>
                    )}
                  </div>
                  <Badge value={j.status} />
                  {["QUEUED", "FAILED"].includes(j.status) && (
                    <Button
                      variant="outline"
                      onClick={() =>
                        void api(
                          `/api/classroom-integrations/${j.id}/retry`,
                          "POST",
                          {},
                        )
                          .then(state.reload)
                          .catch((e) => setError(e.message))
                      }
                    >
                      Thử lại
                    </Button>
                  )}
                </div>
              ))}
              {!state.data.jobs.length && <Empty>Chưa có tác vụ.</Empty>}
              {error && (
                <p role="alert" className="text-sm">
                  {error}
                </p>
              )}
            </section>
          </>
        )}
      </State>
    </div>
  );
}

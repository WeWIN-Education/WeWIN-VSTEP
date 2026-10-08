"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { NavigationLink as Link } from "@/components/layout/NavigationLink";
import { Button } from "@/components/ui/Button";
import { FilePicker } from "./FilePicker";
import type { PreviewFile } from "./DocumentViewer";
import {
  api,
  Badge,
  Empty,
  Field,
  Form,
  State,
  useAPI,
  when,
  formDate,
  localDate,
  type Options,
  type Person,
  type Role,
  type Session,
  type Source,
} from "./shared";
import type { Classroom } from "./ClassList";
export type Material = {
  sourceHref?: string | null;
  id: string;
  title: string;
  body: string;
  published: boolean;
  revision: number;
  sessionId: string | null;
  sourceKind: string | null;
  sourceId: string | null;
  files: PreviewFile[];
};
export type Assignment = {
  id: string;
  classId: string;
  title: string;
  instructions: string;
  published: boolean;
  revision: number;
  dueAt: string;
  sessionId: string | null;
};
type Detail = Classroom & {
  enrollments: { userId: string; status: string; user: Person }[];
  materials: Material[];
  assignments: Assignment[];
};
const tabs = [
  { id: "overview", name: "Tổng quan" },
  { id: "sessions", name: "Buổi học" },
  { id: "materials", name: "Học liệu" },
  { id: "assignments", name: "Bài tập" },
  { id: "results", name: "Kết quả" },
];
export function ClassDetail({ id, role }: { id: string; role: Role }) {
  const state = useAPI<Detail>(`/api/classes/${id}`),
    params = useSearchParams(),
    [tab, setTab] = useState(params.get("tab") || "overview"),
    [form, setForm] = useState<"material" | "assignment" | null>(null),
    [editing, setEditing] = useState<Material | null>(null),
    [fileIds, setFiles] = useState<string[]>([]),
    [presentSession, setPresentSession] = useState(""),
    [sourceKind, setKind] = useState("");
  const options = useAPI<Options>(
    role !== "LEARNER" ? "/api/classroom-options" : null,
  );
  const [error, setError] = useState("");
  const classroom = state.data,
    staff = role !== "LEARNER",
    writable = staff && classroom?.status === "ACTIVE";
  const done = () => {
    setForm(null);
    setEditing(null);
    setFiles([]);
    void state.reload();
  };
  useEffect(() => {
    const next = params.get("tab") || "overview";
    setTab(tabs.some((t) => t.id === next) ? next : "overview");
  }, [params]);
  const sources: Source[] =
    options.data && "materials" in options.data
      ? sourceKind === "VIDEO"
        ? options.data.videos
        : sourceKind === "CONTENT"
          ? options.data.contents
          : options.data.materials
      : [];
  return (
    <div className="mx-auto max-w-[1120px] space-y-6">
      <Link
        href="/classes"
        className="inline-flex min-h-11 items-center text-sm font-medium text-brand"
      >
        ← Danh sách lớp
      </Link>
      <State loading={state.loading} error={state.error}>
        {classroom && (
          <>
            <header className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-ui text-xs text-ink-muted">
                  {classroom.code}
                </p>
                <h1 className="mt-2 text-3xl">{classroom.title}</h1>
                <p className="mt-3 text-sm text-ink-muted">
                  {classroom.staff.map((s) => s.user.name).join(" · ")}
                </p>
              </div>
              <Badge value={classroom.status} />
            </header>
            <nav
              aria-label="Nội dung lớp"
              className="flex gap-2 overflow-x-auto border-b border-border pb-3"
            >
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  aria-current={tab === t.id ? "page" : undefined}
                  onClick={() => {
                    setTab(t.id);
                    setForm(null);
                  }}
                  className={`min-h-11 shrink-0 rounded-xl px-4 text-sm font-medium ${tab === t.id ? "bg-brand-soft text-brand" : "text-ink-muted hover:bg-surface-card"}`}
                >
                  {t.name}
                </button>
              ))}
            </nav>
            {tab === "overview" && (
              <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
                <section className="classroom-panel space-y-4">
                  <h2 className="text-lg">Thông tin lớp</h2>
                  <p className="whitespace-pre-wrap text-sm leading-7 text-ink-muted">
                    {classroom.description ||
                      "Trung tâm chưa bổ sung mô tả cho lớp."}
                  </p>
                  <p className="text-sm">
                    Thời gian hiển thị theo giờ Việt Nam (UTC+7).
                  </p>
                  <p className="text-sm text-ink-muted">
                    {role === "TEACHER"
                      ? "Bạn được chỉnh học liệu, giao/chấm bài và xác nhận điểm danh. Trung tâm quản lý tài khoản, ghi danh và lịch học."
                      : "Bạn có thể học qua Zoom, tải tài liệu và nộp bài tại đây."}
                  </p>
                </section>
                <section className="classroom-panel">
                  <h2 className="text-lg">
                    {staff ? "Danh sách học viên" : "Ghi danh của bạn"}
                  </h2>
                  <div className="mt-4 space-y-3">
                    {classroom.enrollments.map((e) => (
                      <div
                        key={e.userId}
                        className="flex flex-wrap items-center justify-between gap-2 text-sm"
                      >
                        <span>{e.user.name || "Học viên"}</span>
                        <Badge value={e.status} />
                        {role === "ADMIN" && classroom.status === "ACTIVE" && (
                          <select
                            aria-label={`Ghi danh ${e.user.name}`}
                            value={e.status}
                            onChange={(event) =>
                              void api(
                                `/api/classes/${id}/enrollments`,
                                "POST",
                                {
                                  userId: e.userId,
                                  status: event.target.value,
                                },
                              )
                                .then(state.reload)
                                .catch((e) => setError(e.message))
                            }
                            className="classroom-input mt-1 text-xs"
                          >
                            <option value="ACTIVE">Đang học</option>
                            <option value="COMPLETED">Hoàn thành</option>
                            <option value="WITHDRAWN">Rút lớp</option>
                          </select>
                        )}
                      </div>
                    ))}
                  </div>
                  {role === "ADMIN" && classroom.status === "ACTIVE" && (
                    <Form
                      className="mt-6"
                      title="Ghi danh học viên"
                      onDone={() => void state.reload()}
                      submit={(f) =>
                        api(`/api/classes/${id}/enrollments`, "POST", {
                          userId: f.get("userId"),
                          status: "ACTIVE",
                        })
                      }
                    >
                      <Field label="Học viên">
                        <select
                          name="userId"
                          required
                          className="classroom-input"
                        >
                          <option value="">Chọn học viên</option>
                          {options.data &&
                            "users" in options.data &&
                            options.data.users
                              .filter((u) => u.role === "LEARNER")
                              .map((u) => (
                                <option key={u.id} value={u.id}>
                                  {u.name || u.email}
                                </option>
                              ))}
                        </select>
                      </Field>
                    </Form>
                  )}
                  {error && (
                    <p role="alert" className="mt-4 text-sm">
                      {error}
                    </p>
                  )}
                </section>
              </div>
            )}
            {tab === "sessions" && (
              <section className="classroom-panel">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-lg">Lịch học</h2>
                  {role === "ADMIN" && (
                    <Link
                      href={`/manage/sessions?classId=${id}`}
                      className="text-sm font-medium text-brand"
                    >
                      Quản lý lịch →
                    </Link>
                  )}
                </div>
                {!classroom.sessions.length ? (
                  <Empty>
                    Chưa có lịch học. Trung tâm sẽ thông báo khi có buổi mới.
                  </Empty>
                ) : (
                  <div className="space-y-3">
                    {classroom.sessions.map((s) => (
                      <SessionRow key={s.id} session={s} />
                    ))}
                  </div>
                )}
              </section>
            )}
            {(tab === "materials" || tab === "assignments") && (
              <section className="classroom-panel">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-lg">
                    {tab === "materials"
                      ? "Học liệu của lớp"
                      : "Bài tập được giao"}
                  </h2>
                  {writable && (
                    <Button
                      onClick={() => {
                        setEditing(null);
                        setFiles([]);
                        setKind("");
                        setForm(
                          tab === "materials" ? "material" : "assignment",
                        );
                      }}
                    >
                      Thêm {tab === "materials" ? "học liệu" : "bài tập"}
                    </Button>
                  )}
                </div>
                {form && (
                  <div className="mb-6 rounded-2xl border border-border bg-surface p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="font-semibold">
                        {editing
                          ? "Sửa học liệu"
                          : form === "material"
                            ? "Thêm học liệu"
                            : "Giao bài tập"}
                      </h3>
                      <button
                        type="button"
                        onClick={() => setForm(null)}
                        className="min-h-11 px-3 text-sm text-ink-muted"
                      >
                        Đóng
                      </button>
                    </div>
                    <Form
                      key={editing?.id || form}
                      onDone={done}
                      submit={(f) =>
                        api(
                          `/api/classes/${id}/${form === "material" ? "materials" : "assignments"}${editing ? `/${editing.id}` : ""}`,
                          editing ? "PATCH" : "POST",
                          {
                            title: f.get("title"),
                            body: f.get("body"),
                            instructions: f.get("instructions"),
                            dueAt:
                              form === "assignment"
                                ? formDate(f.get("dueAt"))
                                : undefined,
                            sessionId: f.get("sessionId"),
                            published: f.get("published") === "on",
                            sourceKind:
                              form === "material" ? sourceKind : undefined,
                            sourceId: f.get("sourceId"),
                            fileIds,
                            revision: editing?.revision,
                          },
                        )
                      }
                    >
                      <Field label="Tiêu đề">
                        <input
                          name="title"
                          required
                          maxLength={200}
                          defaultValue={editing?.title}
                          className="classroom-input"
                        />
                      </Field>
                      <Field
                        label={
                          form === "material" ? "Nội dung" : "Yêu cầu bài tập"
                        }
                      >
                        <textarea
                          name={form === "material" ? "body" : "instructions"}
                          required={form === "assignment"}
                          maxLength={20000}
                          rows={5}
                          defaultValue={editing?.body}
                          className="classroom-input"
                        />
                      </Field>
                      <Field label="Gắn với buổi học">
                        <select
                          name="sessionId"
                          defaultValue={editing?.sessionId || ""}
                          className="classroom-input"
                        >
                          <option value="">Cả lớp</option>
                          {classroom.sessions.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.title}
                            </option>
                          ))}
                        </select>
                      </Field>
                      {form === "assignment" && (
                        <Field label="Hạn nộp (giờ Việt Nam)">
                          <input
                            name="dueAt"
                            type="datetime-local"
                            defaultValue={localDate()}
                            required
                            className="classroom-input"
                          />
                        </Field>
                      )}
                      {form === "material" && (
                        <>
                          <Field label="Liên kết nội dung có sẵn">
                            <select
                              value={sourceKind}
                              onChange={(e) => setKind(e.target.value)}
                              className="classroom-input"
                            >
                              <option value="">Không liên kết</option>
                              <option value="MATERIAL">Kho tài liệu</option>
                              <option value="VIDEO">Video</option>
                              <option value="CONTENT">Bài học VSTEP</option>
                            </select>
                          </Field>
                          {sourceKind && (
                            <Field label="Nội dung nguồn">
                              <select
                                name="sourceId"
                                required
                                defaultValue={editing?.sourceId || ""}
                                className="classroom-input"
                              >
                                <option value="">Chọn nội dung</option>
                                {sources.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.title}
                                  </option>
                                ))}
                              </select>
                            </Field>
                          )}
                        </>
                      )}
                      <FilePicker classId={id} onFiles={setFiles} />
                      <label className="flex min-h-11 items-center gap-3 text-sm">
                        <input
                          name="published"
                          type="checkbox"
                          defaultChecked={editing?.published ?? true}
                        />
                        Công bố cho học viên
                      </label>
                      <p className="text-xs text-ink-muted">
                        Liên kết chỉ sử dụng nội dung gốc. Giáo viên không sửa
                        hoặc xóa kho nội dung chung.
                      </p>
                    </Form>
                  </div>
                )}
                {tab === "materials" ? (
                  !classroom.materials.length ? (
                    <Empty>Chưa có học liệu được công bố.</Empty>
                  ) : (
                    <div className="space-y-4">
                      {staff &&
                        classroom.sessions.some(
                          (s) =>
                            ["SCHEDULED", "LIVE"].includes(s.status) &&
                            Date.parse(s.endsAt) > Date.now(),
                        ) && (
                          <label className="block text-sm">
                            Buổi học để trình chiếu
                            <select
                              className="mt-2 min-h-11 w-full rounded-xl border border-border bg-surface-card px-3"
                              value={presentSession}
                              onChange={(event) =>
                                setPresentSession(event.target.value)
                              }
                            >
                              <option value="">Chọn buổi học</option>
                              {classroom.sessions
                                .filter(
                                  (s) =>
                                    ["SCHEDULED", "LIVE"].includes(s.status) &&
                                    Date.parse(s.endsAt) > Date.now(),
                                )
                                .map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.title} · {when(s.startsAt)}
                                  </option>
                                ))}
                            </select>
                          </label>
                        )}
                      {classroom.materials.map((m) => (
                        <article
                          key={m.id}
                          className="rounded-2xl border border-border p-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <h3 className="font-semibold">{m.title}</h3>
                            {staff && !m.published && <Badge value="DRAFT" />}
                          </div>
                          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-ink-muted">
                            {m.body}
                          </p>
                          {m.files.map((f) => (
                            <div
                              key={f.id}
                              className="mt-3 rounded-xl border border-border p-3"
                            >
                              <p className="break-words text-sm font-medium">
                                {f.name}
                              </p>
                              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-brand">
                                {[
                                  "application/pdf",
                                  "image/jpeg",
                                  "image/png",
                                ].includes(f.mimeType) && (
                                  <Link
                                    href={`/classroom-files/${f.id}`}
                                    className="inline-flex min-h-11 items-center"
                                  >
                                    Xem trên web
                                  </Link>
                                )}
                                <a
                                  href={`/api/classroom-files/${f.id}/download`}
                                  className="inline-flex min-h-11 items-center"
                                >
                                  Tải về ↓
                                </a>
                                {staff &&
                                m.published &&
                                f.previewPageCount &&
                                !f.previewError &&
                                presentSession &&
                                (!m.sessionId ||
                                  m.sessionId === presentSession) ? (
                                  <Link
                                    href={`/sessions/${presentSession}/room?present=${f.id}`}
                                    className="inline-flex min-h-11 items-center"
                                  >
                                    Trình chiếu trong lớp ↗
                                  </Link>
                                ) : null}
                              </div>
                              {f.previewError && (
                                <p className="text-xs leading-6 text-ink-muted">
                                  {f.previewError}
                                </p>
                              )}
                              {/wordprocessingml|presentationml/.test(
                                f.mimeType,
                              ) && (
                                <p className="text-xs leading-6 text-ink-muted">
                                  Xuất thành PDF để xem và trình chiếu trên web.
                                </p>
                              )}
                            </div>
                          ))}
                          {m.sourceHref && (
                            <Link
                              href={m.sourceHref}
                              className="mt-3 inline-flex min-h-11 items-center text-sm text-brand"
                            >
                              Mở nội dung nguồn →
                            </Link>
                          )}
                          {writable && (
                            <div className="mt-3 flex gap-2">
                              <Button
                                variant="ghost"
                                onClick={() => {
                                  setEditing(m);
                                  setFiles([]);
                                  setKind(m.sourceKind || "");
                                  setForm("material");
                                }}
                              >
                                Chỉnh sửa
                              </Button>
                              <Button
                                variant="ghost"
                                onClick={() => {
                                  if (
                                    confirm(
                                      `Bỏ học liệu “${m.title}” khỏi lớp?`,
                                    )
                                  )
                                    void api(
                                      `/api/classes/${id}/materials/${m.id}`,
                                      "DELETE",
                                      { revision: m.revision },
                                    )
                                      .then(state.reload)
                                      .catch((e) => setError(e.message));
                                }}
                              >
                                Bỏ khỏi lớp
                              </Button>
                            </div>
                          )}
                        </article>
                      ))}
                    </div>
                  )
                ) : !classroom.assignments.length ? (
                  <Empty>Chưa có bài tập được giao.</Empty>
                ) : (
                  <div className="space-y-3">
                    {classroom.assignments.map((a) => (
                      <Link
                        key={a.id}
                        href={`/assignments/${a.id}`}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border p-4"
                      >
                        <div>
                          <h3 className="font-semibold">{a.title}</h3>
                          <p className="mt-2 text-xs text-ink-muted">
                            Hạn nộp: {when(a.dueAt)}
                          </p>
                        </div>
                        <span className="text-sm text-brand">
                          {staff ? "Xem & chấm bài" : "Làm bài"} →
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
                {error && <p role="alert">{error}</p>}
              </section>
            )}
            {tab === "results" && (
              <Results
                classId={id}
                role={role}
                people={classroom.enrollments.map((e) => e.user)}
                sessions={classroom.sessions}
              />
            )}
          </>
        )}
      </State>
    </div>
  );
}
export function SessionRow({ session: s }: { session: Session }) {
  return (
    <Link
      href={`/sessions/${s.id}`}
      className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border p-4 hover:bg-surface"
    >
      <div>
        <p className="text-sm font-semibold">{s.title}</p>
        <p className="mt-2 text-xs text-ink-muted">
          {when(s.startsAt)} · {s.host.name}
        </p>
      </div>
      <Badge value={s.status} />
    </Link>
  );
}
type Report = {
  attendance: {
    sessionId: string;
    userId: string;
    minutes: number;
    suggestion: string;
    finalStatus: string | null;
    user: Person;
    session: { title: string; startsAt: string };
  }[];
  submissions: {
    id: string;
    version: number;
    grade: number | null;
    feedback: string;
    status: string;
    user: Person;
    assignment: { title: string; id: string };
  }[];
  truncated: boolean;
};
export function Results({
  classId,
  role,
  people,
  sessions,
}: {
  classId: string;
  role: Role;
  people: Person[];
  sessions: Session[];
}) {
  const [userId, setUser] = useState(""),
    [sessionId, setSession] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState("");
  const url = `/api/classes/${classId}/results?${new URLSearchParams({ userId, sessionId, from, to })}`,
    state = useAPI<Report>(url);
  return (
    <section className="classroom-panel space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg">Kết quả học tập</h2>
        <a
          href={`${url}&format=csv`}
          className="inline-flex min-h-11 items-center rounded-xl border border-border px-4 text-sm font-medium text-brand"
        >
          Xuất CSV
        </a>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {role !== "LEARNER" && (
          <Field label="Học viên">
            <select
              value={userId}
              onChange={(e) => setUser(e.target.value)}
              className="classroom-input"
            >
              <option value="">Tất cả</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Buổi học">
          <select
            value={sessionId}
            onChange={(e) => setSession(e.target.value)}
            className="classroom-input"
          >
            <option value="">Tất cả</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Từ ngày">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="classroom-input"
          />
        </Field>
        <Field label="Đến ngày">
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="classroom-input"
          />
        </Field>
      </div>
      <State loading={state.loading} error={state.error}>
        {state.data && (
          <>
            <h3 className="text-sm font-semibold">Điểm danh</h3>
            {!state.data.attendance.length ? (
              <Empty>Chưa có dữ liệu điểm danh.</Empty>
            ) : (
              state.data.attendance.map((a) => (
                <div
                  key={`${a.sessionId}:${a.userId}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface p-4 text-sm"
                >
                  <div>
                    {a.user.name} · {a.session.title}
                    <p className="mt-1 text-xs text-ink-muted">
                      {a.minutes.toFixed(1)} phút theo sự kiện Zoom
                    </p>
                  </div>
                  <Badge value={a.finalStatus || "PENDING"} />
                </div>
              ))
            )}
            <h3 className="pt-3 text-sm font-semibold">
              Bài nộp · Giáo viên chấm
            </h3>
            {!state.data.submissions.length ? (
              <Empty>Chưa có bài nộp.</Empty>
            ) : (
              state.data.submissions.map((s) => (
                <Link
                  key={s.id}
                  href={`/assignments/${s.assignment.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface p-4 text-sm"
                >
                  <span>
                    {s.user.name} · {s.assignment.title} · v{s.version}
                  </span>
                  <span>
                    {s.grade === null ? "Chưa chấm" : `${s.grade}/10`}
                  </span>
                  <Badge value={s.status} />
                </Link>
              ))
            )}
            {state.data.truncated && (
              <p className="text-sm">
                Kết quả nhiều hơn 5.000 dòng. Thu hẹp bộ lọc để xem đầy đủ.
              </p>
            )}
          </>
        )}
      </State>
    </section>
  );
}

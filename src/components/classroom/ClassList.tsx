"use client";
import { useRef, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  Users,
  Plus,
  ArrowUpRight,
  X,
} from "lucide-react";
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
  type Options,
  type Role,
  type Session,
} from "./shared";

export type Classroom = {
  id: string;
  code: string;
  title: string;
  description: string;
  capacity: number;
  status: string;
  revision: number;
  staff: { userId: string; user: { name: string | null } }[];
  sessions: Session[];
  _count: { enrollments: number; assignments: number };
};
export function ClassList({
  role,
  manage = false,
}: {
  role: Role;
  manage?: boolean;
}) {
  const state = useAPI<Classroom[]>("/api/classes"),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState(""),
    dialog = useRef<HTMLDialogElement>(null);
  const options = useAPI<Options>(
    role === "ADMIN" ? "/api/classroom-options" : null,
  );
  const [editing, setEditing] = useState<Classroom | null>(null);
  const filtered =
    state.data?.filter(
      (c) =>
        (!status || c.status === status) &&
        `${c.code} ${c.title}`
          .toLocaleLowerCase("vi")
          .includes(query.toLocaleLowerCase("vi")),
    ) || [];
  return (
    <div className="mx-auto max-w-[1120px] space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-widest text-brand">
            WEWIN · HỌC ONLINE
          </p>
          <h1 className="mt-2 text-3xl text-ink">
            {manage
              ? "Quản lý lớp học"
              : role === "TEACHER"
                ? "Lớp giảng dạy"
                : "Lớp học của bạn"}
          </h1>
          <p className="mt-3 max-w-xl text-pretty text-sm leading-6 text-ink-muted">
            {role === "TEACHER"
              ? "Chuẩn bị học liệu, giao bài và theo dõi các lớp được phân công."
              : role === "ADMIN"
                ? "Theo dõi lớp, phân công giáo viên và quản lý ghi danh."
                : "Lịch học, tài liệu và bài tập của bạn trong một không gian."}
          </p>
        </div>
        {role === "ADMIN" && (
          <Button
            onClick={() => {
              setEditing(null);
              dialog.current?.showModal();
            }}
          >
            <Plus className="size-4" />
            Tạo lớp
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-3">
        <label className="flex w-full max-w-md items-center gap-3 rounded-xl border border-border bg-surface-card px-3">
          <BookOpen className="size-4 text-ink-muted" aria-hidden="true" />
          <span className="sr-only">Tìm lớp học</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm tên hoặc mã lớp…"
            className="min-h-11 w-full bg-transparent text-sm"
          />
        </label>
        <label className="min-w-44">
          <span className="sr-only">Trạng thái lớp</span>
          <select
            className="classroom-input"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang học</option>
            <option value="COMPLETED">Hoàn thành</option>
            <option value="ARCHIVED">Lưu trữ</option>
          </select>
        </label>
      </div>
      <State loading={state.loading} error={state.error}>
        {!filtered.length ? (
          <Empty>
            {state.data?.length
              ? "Không tìm thấy lớp phù hợp."
              : role === "ADMIN"
                ? "Chưa có lớp. Tạo lớp và phân công giáo viên để bắt đầu."
                : "Bạn chưa được phân công/ghi danh vào lớp nào. Liên hệ trung tâm để được hỗ trợ."}
          </Empty>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {filtered.map((c) => (
              <article
                key={c.id}
                className="classroom-panel flex flex-col gap-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-ui text-xs font-semibold text-ink-muted">
                    {c.code}
                  </span>
                  <Badge value={c.status} />
                </div>
                <div>
                  <h2 className="text-xl leading-7">{c.title}</h2>
                  <p className="mt-2 text-sm text-ink-muted">
                    {c.staff
                      .map((s) => s.user.name)
                      .filter(Boolean)
                      .join(" · ") || "Chưa phân công giáo viên"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-5 text-xs text-ink-muted">
                  <span className="flex items-center gap-2">
                    <Users className="size-4" />
                    {c._count.enrollments} học viên
                  </span>
                  <span>{c._count.assignments} bài tập</span>
                </div>
                <div className="rounded-2xl bg-surface p-4">
                  <p className="flex items-center gap-2 text-xs text-ink-muted">
                    <CalendarDays className="size-4" />
                    Buổi gần nhất
                  </p>
                  <p className="mt-2 text-sm font-medium">
                    {c.sessions[0]
                      ? when(c.sessions[0].startsAt)
                      : "Chưa có lịch sắp tới"}
                  </p>
                </div>
                <div className="mt-auto flex flex-wrap items-center gap-3">
                  <Link
                    href={`/classes/${c.id}`}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white"
                  >
                    Mở lớp
                    <ArrowUpRight className="size-4" />
                  </Link>
                  {role === "ADMIN" && (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setEditing(c);
                        dialog.current?.showModal();
                      }}
                    >
                      Chỉnh sửa lớp
                    </Button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </State>
      <dialog
        ref={dialog}
        aria-labelledby="class-form-title"
        onClick={(e) => {
          if (e.target === e.currentTarget) dialog.current?.close();
        }}
        className="m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-3xl border border-border bg-surface-card p-6 text-ink shadow-xl backdrop:bg-black/45"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 id="class-form-title" className="text-xl">
            {editing ? "Chỉnh sửa lớp" : "Tạo lớp học"}
          </h2>
          <button
            aria-label="Đóng"
            type="button"
            autoFocus
            onClick={() => dialog.current?.close()}
            className="flex size-11 items-center justify-center rounded-xl hover:bg-surface"
          >
            <X className="size-5" />
          </button>
        </div>
        <Form
          key={editing?.id || "new"}
          onDone={() => {
            dialog.current?.close();
            void state.reload();
          }}
          submit={(f) =>
            api(
              `/api/classes${editing ? `/${editing.id}` : ""}`,
              editing ? "PATCH" : "POST",
              {
                title: f.get("title"),
                code: f.get("code"),
                description: f.get("description"),
                capacity: Number(f.get("capacity")),
                status: f.get("status"),
                staffIds: f.getAll("staffIds"),
                revision: editing?.revision,
              },
            )
          }
        >
          <Field label="Tên lớp">
            <input
              name="title"
              required
              maxLength={200}
              defaultValue={editing?.title}
              className="classroom-input"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Mã lớp">
              <input
                name="code"
                required
                maxLength={32}
                defaultValue={editing?.code}
                className="classroom-input"
              />
            </Field>
            <Field label="Sức chứa phòng (gồm nhân sự)">
              <input
                name="capacity"
                type="number"
                min={3}
                max={100}
                defaultValue={editing?.capacity || 30}
                required
                className="classroom-input"
              />
            </Field>
          </div>
          <Field label="Mô tả">
            <textarea
              name="description"
              maxLength={4000}
              rows={3}
              defaultValue={editing?.description}
              className="classroom-input"
            />
          </Field>
          <Field label="Trạng thái">
            <select
              name="status"
              defaultValue={editing?.status || "ACTIVE"}
              className="classroom-input classroom-select"
            >
              <option value="ACTIVE">Đang học</option>
              <option value="COMPLETED">Hoàn thành</option>
              <option value="ARCHIVED">Lưu trữ</option>
            </select>
          </Field>
          <fieldset className="rounded-xl border border-border p-3">
            <legend className="px-1 text-sm">Giáo viên được phân công</legend>
            {options.data &&
              "users" in options.data &&
              options.data.users
                .filter((u) => u.role !== "LEARNER")
                .map((u) => (
                  <label
                    key={u.id}
                    className="flex min-h-11 items-center gap-3 text-sm"
                  >
                    <input
                      type="checkbox"
                      name="staffIds"
                      value={u.id}
                      defaultChecked={editing?.staff.some(
                        (s) => s.userId === u.id,
                      )}
                    />
                    {u.name || u.email}
                  </label>
                ))}
            {options.error && (
              <p role="alert" className="text-sm">
                {options.error}
              </p>
            )}
          </fieldset>
        </Form>
      </dialog>
    </div>
  );
}

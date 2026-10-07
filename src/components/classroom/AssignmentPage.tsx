"use client";
import { useState } from "react";
import { NavigationLink as Link } from "@/components/layout/NavigationLink";
import { Button } from "@/components/ui/Button";
import { FilePicker } from "./FilePicker";
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
  type Person,
  type Role,
} from "./shared";
import type { Assignment } from "./ClassDetail";
type Submission = {
  id: string;
  userId: string;
  version: number;
  body: string;
  late: boolean;
  status: string;
  grade: number | null;
  feedback: string;
  revision: number;
  submittedAt: string;
  user: Person;
  files: { id: string; name: string }[];
};
type Detail = Assignment & {
  classroom: { title: string };
  files: { id: string; name: string }[];
  drafts: { body: string; revision: number; reopenUntil: string | null }[];
  submissions: Submission[];
};
export function AssignmentPage({ id, role }: { id: string; role: Role }) {
  const state = useAPI<Detail>(`/api/assignments/${id}`),
    a = state.data;
  return (
    <div className="mx-auto max-w-[1120px] space-y-6">
      <Link
        href={a ? `/classes/${a.classId}?tab=assignments` : "/classes"}
        className="inline-flex min-h-11 items-center text-sm text-brand"
      >
        ← Bài tập của lớp
      </Link>
      <State loading={state.loading} error={state.error}>
        {a && (
          <>
            <header>
              <p className="text-xs text-ink-muted">{a.classroom.title}</p>
              <h1 className="mt-2 text-3xl">{a.title}</h1>
              <p className="mt-3 text-sm text-ink-muted">
                Hạn nộp {when(a.dueAt)} · Nộp muộn vẫn được nhận và đánh dấu.
              </p>
            </header>
            <section className="classroom-panel">
              {role !== "LEARNER" && !a.submissions.length && (
                <EditAssignment assignment={a} reload={state.reload} />
              )}
              <h2 className="text-lg">Yêu cầu bài tập</h2>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-7">
                {a.instructions}
              </p>
              {a.files.map((f) => (
                <a
                  key={f.id}
                  href={`/api/classroom-files/${f.id}/download`}
                  className="mt-3 block min-h-11 py-2 text-sm text-brand"
                >
                  ↓ {f.name}
                </a>
              ))}
            </section>
            {role === "LEARNER" && (
              <StudentAnswer key={id} assignment={a} reload={state.reload} />
            )}
            <section className="classroom-panel space-y-5">
              <h2 className="text-lg">
                {role === "LEARNER" ? "Bài đã nộp" : "Bài nộp của học viên"}
              </h2>
              {!a.submissions.length ? (
                <Empty>Chưa có bài nộp.</Empty>
              ) : (
                a.submissions.map((s) => (
                  <article
                    key={s.id}
                    className="rounded-2xl border border-border p-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="font-semibold">
                        {s.user.name} · Phiên bản {s.version}
                      </h3>
                      <Badge value={s.status} />
                    </div>
                    <p className="mt-2 text-xs text-ink-muted">
                      {when(s.submittedAt)}
                      {s.late ? " · Nộp muộn" : ""}
                    </p>
                    <p className="mt-4 whitespace-pre-wrap text-sm leading-7">
                      {s.body}
                    </p>
                    {s.files.map((f) => (
                      <a
                        key={f.id}
                        href={`/api/classroom-files/${f.id}/download`}
                        className="block min-h-11 py-2 text-sm text-brand"
                      >
                        ↓ {f.name}
                      </a>
                    ))}
                    {(s.status === "RETURNED" ||
                      s.status === "REVISION_REQUESTED") && (
                      <div className="mt-4 rounded-xl bg-surface p-4">
                        <p className="text-sm font-medium">
                          Giáo viên chấm ·{" "}
                          {s.grade === null ? "Chưa có điểm" : `${s.grade}/10`}
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm text-ink-muted">
                          {s.feedback || "Chưa có nhận xét."}
                        </p>
                      </div>
                    )}
                    {role !== "LEARNER" && (
                      <GradeForm id={id} submission={s} reload={state.reload} />
                    )}
                  </article>
                ))
              )}
            </section>
          </>
        )}
      </State>
    </div>
  );
}
function StudentAnswer({
  assignment: a,
  reload,
}: {
  assignment: Detail;
  reload: () => Promise<void>;
}) {
  const [body, setBody] = useState(a.drafts[0]?.body || ""),
    [revision, setRevision] = useState(a.drafts[0]?.revision || 0),
    [files, setFiles] = useState<string[]>([]),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [pending, setPending] = useState(false),
    [requestKey, setKey] = useState(() => crypto.randomUUID());
  const canSubmit =
    !a.submissions.length ||
    (a.drafts[0]?.reopenUntil &&
      new Date(a.drafts[0].reopenUntil) > new Date());
  async function save(send: boolean) {
    if (pending) return;
    setPending(true);
    setError("");
    setMessage("");
    try {
      if (send) {
        await api(`/api/assignments/${a.id}/submit`, "POST", {
          body,
          fileIds: files,
          requestKey,
        });
        setKey(crypto.randomUUID());
        setFiles([]);
        await reload();
        setMessage("Đã nộp bài. Phiên bản này được giữ nguyên.");
      } else {
        const result = await api<{ revision: number }>(
          `/api/assignments/${a.id}/draft`,
          "PUT",
          { body, revision },
        );
        setRevision(result.revision);
        setMessage("Đã lưu nháp.");
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Không gửi được bài. Nội dung được giữ lại.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="classroom-panel space-y-4">
      <h2 className="text-lg">Bài làm của bạn</h2>
      {canSubmit ? (
        <>
          <Field label="Nội dung bài làm">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={50000}
              rows={10}
              className="classroom-input"
            />
          </Field>
          <FilePicker classId={a.classId} onFiles={setFiles} />
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => void save(false)}
            >
              Lưu nháp
            </Button>
            <Button
              disabled={pending}
              onClick={() => {
                if (
                  confirm(
                    "Nộp bài này? Sau khi nộp, cần giáo viên mở lại để sửa.",
                  )
                )
                  void save(true);
              }}
            >
              {pending ? "Đang lưu…" : "Nộp bài"}
            </Button>
          </div>
          <p className="text-xs text-ink-muted">
            Bài này được giáo viên chấm. Không cộng XP từ bài tập lớp học.
          </p>
        </>
      ) : (
        <p className="text-sm leading-7 text-ink-muted">
          Bạn đã nộp bài. Giáo viên có thể mở lại để bạn gửi phiên bản mới.
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="text-sm text-brand">
          {message}
        </p>
      )}
    </section>
  );
}
function GradeForm({
  id,
  submission: s,
  reload,
}: {
  id: string;
  submission: Submission;
  reload: () => Promise<void>;
}) {
  const [action, setAction] = useState("RETURN");
  return (
    <Form
      className="mt-5 border-t border-border pt-5"
      title={action === "RETURN" ? "Lưu điểm & trả bài" : "Mở lại bài"}
      onDone={() => void reload()}
      submit={(f) =>
        api(`/api/assignments/${id}/submissions/${s.id}`, "PATCH", {
          revision: s.revision,
          action,
          grade: f.get("grade") === "" ? null : Number(f.get("grade")),
          feedback: f.get("feedback"),
          reason: f.get("reason"),
          reopenUntil:
            action !== "RETURN" ? formDate(f.get("reopenUntil")) : undefined,
        })
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Thao tác">
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="classroom-input"
          >
            <option value="RETURN">Chấm điểm & trả bài</option>
            <option value="REVISION">Yêu cầu sửa</option>
            <option value="REOPEN">Mở lại quyền nộp</option>
          </select>
        </Field>
        {action === "RETURN" ? (
          <Field label="Điểm 0–10 (bỏ trống = chưa chấm)">
            <input
              name="grade"
              type="number"
              min={0}
              max={10}
              step={0.1}
              defaultValue={s.grade ?? ""}
              className="classroom-input"
            />
          </Field>
        ) : (
          <Field label="Hạn nộp phiên bản mới (giờ Việt Nam)">
            <input
              name="reopenUntil"
              type="datetime-local"
              required
              defaultValue={localDate()}
              className="classroom-input"
            />
          </Field>
        )}
      </div>
      <Field label="Nhận xét">
        <textarea
          name="feedback"
          rows={4}
          maxLength={20000}
          defaultValue={s.feedback}
          className="classroom-input"
        />
      </Field>
      <Field label="Lý do trả bài/chỉnh điểm">
        <input
          name="reason"
          maxLength={1000}
          required
          className="classroom-input"
        />
      </Field>
    </Form>
  );
}

function EditAssignment({
  assignment: a,
  reload,
}: {
  assignment: Detail;
  reload: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-4">
      <Button variant="outline" onClick={() => setOpen((v) => !v)}>
        {open ? "Đóng chỉnh sửa" : "Chỉnh sửa bài tập"}
      </Button>
      {open && (
        <Form
          className="mt-4 mb-5"
          title="Lưu bài tập"
          onDone={() => {
            setOpen(false);
            void reload();
          }}
          submit={(f) =>
            api("/api/classes/" + a.classId + "/assignments/" + a.id, "PATCH", {
              revision: a.revision,
              title: f.get("title"),
              instructions: f.get("instructions"),
              dueAt: formDate(f.get("dueAt")),
              sessionId: a.sessionId,
              published: f.get("published") === "on",
            })
          }
        >
          <Field label="Tiêu đề">
            <input
              name="title"
              required
              maxLength={200}
              defaultValue={a.title}
              className="classroom-input"
            />
          </Field>
          <Field label="Yêu cầu">
            <textarea
              name="instructions"
              required
              maxLength={20000}
              defaultValue={a.instructions}
              rows={5}
              className="classroom-input"
            />
          </Field>
          <Field label="Hạn nộp (giờ Việt Nam)">
            <input
              name="dueAt"
              type="datetime-local"
              required
              defaultValue={localDate(a.dueAt)}
              className="classroom-input"
            />
          </Field>
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input
              name="published"
              type="checkbox"
              defaultChecked={a.published}
            />
            Công bố bài tập
          </label>
        </Form>
      )}
    </div>
  );
}

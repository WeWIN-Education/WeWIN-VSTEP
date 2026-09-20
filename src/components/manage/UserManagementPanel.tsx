"use client";

import {
  Check,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  Pencil,
  RefreshCw,
  Search,
  ShieldCheck,
  UnlockKeyhole,
  UserPlus,
  X,
} from "lucide-react";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { RecordActions } from "@/components/manage/RecordActions";

type ManagedUser = {
  id: string;
  email: string;
  name: string | null;
  role: "LEARNER" | "ADMIN";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count: { attempts: number; vocabularyProgress: number };
};

type ApiResponse = { users?: ManagedUser[]; user?: ManagedUser; error?: string; message?: string };

function initials(user: ManagedUser) {
  return (user.name || user.email || "W").trim().slice(0, 1).toUpperCase();
}

function displayDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(new Date(value));
}

async function readResponse(response: Response) {
  return (await response.json().catch(() => ({}))) as ApiResponse;
}

export function UserManagementPanel({ initialUsers, initialQuery = "" }: { initialUsers: ManagedUser[]; initialQuery?: string }) {
  const [users, setUsers] = useState(initialUsers);
  const [query, setQuery] = useState(initialQuery);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [resetId, setResetId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function search(event?: FormEvent) {
    event?.preventDefault();
    setError("");
    setMessage("");
    setPendingId("search");
    try {
      const response = await fetch(`/api/manage/users${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ""}`, { cache: "no-store" });
      const body = await readResponse(response);
      if (!response.ok) throw new Error(body.error || "Không thể tải danh sách tài khoản.");
      setUsers(body.users ?? []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể tải danh sách tài khoản.");
    } finally {
      setPendingId(null);
    }
  }

  async function refresh() {
    await search();
  }

  async function updateUser(id: string, body: { name?: string | null; email?: string; isActive?: boolean }) {
    setPendingId(id);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/manage/users/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await readResponse(response);
      if (!response.ok || !result.user) throw new Error(result.error || "Không thể cập nhật tài khoản.");
      setUsers((current) => current.map((user) => (user.id === id ? result.user! : user)));
      setEditingId(null);
      setMessage(body.isActive === false ? "Đã khóa tài khoản. Phiên đăng nhập cũ đã bị thu hồi." : body.isActive === true ? "Đã mở khóa tài khoản." : "Đã lưu thông tin tài khoản.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể cập nhật tài khoản.");
    } finally {
      setPendingId(null);
    }
  }

  async function resetPassword(id: string, password: string) {
    setPendingId(id);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/manage/users/${encodeURIComponent(id)}/reset-password`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const result = await readResponse(response);
      if (!response.ok) throw new Error(result.error || "Không thể đặt lại mật khẩu.");
      setResetId(null);
      setMessage(result.message || "Đã đặt lại mật khẩu. Phiên đăng nhập cũ đã bị thu hồi.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể đặt lại mật khẩu.");
    } finally {
      setPendingId(null);
    }
  }

  function toggleLock(user: ManagedUser) {
    const action = user.isActive ? "khóa" : "mở khóa";
    if (!window.confirm(`Bạn muốn ${action} tài khoản ${user.email}?`)) return;
    void updateUser(user.id, { isActive: !user.isActive });
  }

  return (
    <div className="space-y-5">
      <div className="rounded-[24px] border border-border bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-brand">Danh sách học viên</p>
            <h2 className="mt-1 font-[family-name:var(--font-jakarta)] text-xl font-extrabold text-ink">Tài khoản được trung tâm cấp</h2>
            <p className="mt-1 text-sm leading-relaxed text-ink-muted">Tìm theo tên hoặc email. Tài khoản học viên luôn có quyền truy cập toàn bộ nội dung đã xuất bản.</p>
          </div>
          <button type="button" onClick={() => { setCreateOpen((value) => !value); setError(""); }} className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-btn)] bg-brand px-4 text-sm font-extrabold text-white shadow-sm transition hover:bg-brand-dark">
            <UserPlus className="size-4" aria-hidden="true" /> {createOpen ? "Đóng biểu mẫu" : "Tạo tài khoản"}
          </button>
        </div>

        {createOpen ? <CreateUserForm pending={pendingId === "create"} onCancel={() => setCreateOpen(false)} onCreated={(user) => { setUsers((current) => [user, ...current]); setCreateOpen(false); setMessage("Đã tạo tài khoản học viên."); }} onError={setError} onPending={(value) => setPendingId(value ? "create" : null)} /> : null}

        <form onSubmit={(event) => void search(event)} className="mt-5 flex flex-col gap-2 sm:flex-row">
          <label htmlFor="manage-user-search" className="sr-only">Tìm tài khoản</label>
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
            <input id="manage-user-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tên hoặc email học viên" className="h-11 w-full rounded-xl border border-border bg-surface pl-9 pr-3 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20" />
          </div>
          <button type="submit" disabled={pendingId === "search"} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-brand px-4 text-sm font-extrabold text-brand transition hover:bg-brand-soft disabled:cursor-wait disabled:opacity-60"><Search className="size-4" aria-hidden="true" />Tìm kiếm</button>
          <button type="button" onClick={() => void refresh()} disabled={pendingId === "search"} aria-label="Tải lại danh sách" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border px-3 text-ink-muted transition hover:border-brand hover:text-brand disabled:cursor-wait disabled:opacity-60"><RefreshCw className={`size-4 ${pendingId === "search" ? "animate-spin" : ""}`} aria-hidden="true" /></button>
        </form>

        {message ? <p role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">{message}</p> : null}
        {error ? <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</p> : null}
      </div>

      <section className="rounded-[24px] border border-border bg-white p-5 shadow-sm sm:p-6" aria-labelledby="managed-users-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 id="managed-users-title" className="font-[family-name:var(--font-jakarta)] text-lg font-extrabold text-ink">{query.trim() ? `Kết quả cho “${query.trim()}”` : "Tất cả học viên"}</h2><p className="mt-1 text-sm text-ink-muted">{users.length} tài khoản trong danh sách</p></div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1.5 text-xs font-bold text-brand"><ShieldCheck className="size-3.5" aria-hidden="true" /> Chỉ tài khoản học viên</span>
        </div>

        {users.length ? <div className="mt-5 space-y-3">{users.map((user) => <UserRow key={user.id} user={user} editing={editingId === user.id} resetting={resetId === user.id} pending={pendingId === user.id} onEdit={() => { setEditingId((current) => current === user.id ? null : user.id); setResetId(null); setError(""); }} onReset={() => { setResetId((current) => current === user.id ? null : user.id); setEditingId(null); setError(""); }} onToggle={() => toggleLock(user)} onSave={(body) => void updateUser(user.id, body)} onResetPassword={(password) => void resetPassword(user.id, password)} />)}</div> : <div className="mt-5 rounded-2xl border border-dashed border-border bg-surface px-5 py-10 text-center"><p className="text-sm font-extrabold text-ink">Không tìm thấy tài khoản</p><p className="mt-1 text-sm text-ink-muted">Thử một tên hoặc email khác.</p></div>}
      </section>
    </div>
  );
}

function CreateUserForm({ pending, onCancel, onCreated, onError, onPending }: { pending: boolean; onCancel: () => void; onCreated: (user: ManagedUser) => void; onError: (message: string) => void; onPending: (pending: boolean) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onError("");
    onPending(true);
    try {
      const response = await fetch("/api/manage/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, password }) });
      const body = await readResponse(response);
      if (!response.ok || !body.user) throw new Error(body.error || "Không thể tạo tài khoản.");
      onCreated(body.user);
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : "Không thể tạo tài khoản.");
    } finally {
      onPending(false);
    }
  }

  return <form onSubmit={(event) => void submit(event)} className="mt-5 rounded-2xl border border-brand/15 bg-brand-soft/35 p-4 sm:p-5"><div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-extrabold text-ink">Tài khoản học viên mới</h3></div><button type="button" onClick={onCancel} aria-label="Đóng biểu mẫu tạo tài khoản" className="rounded-lg p-1.5 text-ink-muted hover:bg-white hover:text-ink"><X className="size-4" /></button></div><div className="mt-4 grid gap-3 md:grid-cols-3"><Field label="Họ và tên" value={name} onChange={setName} placeholder="Nguyễn Văn A" autoComplete="name" /><Field label="Email" value={email} onChange={setEmail} placeholder="hocvien@example.com" type="email" autoComplete="email" required /><Field label="Mật khẩu tạm thời" value={password} onChange={setPassword} placeholder="Tối thiểu 8 ký tự" type="password" autoComplete="new-password" required /></div><div className="mt-4 flex flex-wrap gap-2"><button type="submit" disabled={pending} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-extrabold text-white disabled:cursor-wait disabled:opacity-60">{pending ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}Tạo học viên</button><button type="button" onClick={onCancel} className="min-h-10 rounded-xl border border-border bg-white px-4 text-sm font-bold text-ink-muted hover:border-brand hover:text-brand">Hủy</button></div></form>;
}

function UserRow({ user, editing, resetting, pending, onEdit, onReset, onToggle, onSave, onResetPassword }: { user: ManagedUser; editing: boolean; resetting: boolean; pending: boolean; onEdit: () => void; onReset: () => void; onToggle: () => void; onSave: (body: { name: string | null; email: string }) => void; onResetPassword: (password: string) => void }) {
  const [name, setName] = useState(user.name || "");
  const [email, setEmail] = useState(user.email);
  const [password, setPassword] = useState("");

  return <article className={`rounded-2xl border px-4 py-4 transition ${user.isActive ? "border-border bg-white" : "border-amber-200 bg-amber-50/45"}`}>
    <div className="mb-3 flex justify-end"><RecordActions endpoint={`/api/manage/users/${user.id}`} title={user.email} deleteDescription="Xóa tài khoản, bài đăng, bình luận, lượt thích, lịch sử thi, kết quả chấm, XP và tiến độ cá nhân của học viên. Bản ghi âm và ảnh do học viên tải lên cũng sẽ được dọn." onDeleted={() => window.location.reload()} /></div>
    <div className="mb-3 flex justify-end"><Link href={`/manage/users/${user.id}`} className="text-xs font-extrabold text-brand hover:underline">Mở hồ sơ học viên →</Link></div>
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center"><div className="flex min-w-0 flex-1 items-center gap-3"><span className={`flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${user.isActive ? "bg-brand text-white" : "bg-amber-100 text-amber-800"}`}>{initials(user)}</span><div className="min-w-0"><p className="truncate text-sm font-extrabold text-ink">{user.name || "Chưa đặt tên"}</p><p className="truncate text-sm text-ink-muted">{user.email}</p><div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-faint"><span>{user.isActive ? "Đang hoạt động" : "Đã khóa"}</span><span aria-hidden="true">·</span><span>Tham gia {displayDate(user.createdAt)}</span><span aria-hidden="true">·</span><span>{user._count.attempts} lượt thi</span></div></div></div><div className="flex flex-wrap gap-2 lg:justify-end"><button type="button" onClick={onEdit} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-border px-3 text-xs font-bold text-ink-muted hover:border-brand hover:bg-brand-soft hover:text-brand"><Pencil className="size-3.5" />Sửa</button><button type="button" onClick={onReset} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-border px-3 text-xs font-bold text-ink-muted hover:border-brand hover:bg-brand-soft hover:text-brand"><KeyRound className="size-3.5" />Đặt lại mật khẩu</button><button type="button" onClick={onToggle} disabled={pending} className={`inline-flex min-h-10 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold disabled:cursor-wait disabled:opacity-50 ${user.isActive ? "border-amber-200 text-amber-800 hover:bg-amber-50" : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"}`}>{pending ? <LoaderCircle className="size-3.5 animate-spin" /> : user.isActive ? <LockKeyhole className="size-3.5" /> : <UnlockKeyhole className="size-3.5" />}{user.isActive ? "Khóa" : "Mở khóa"}</button></div></div>
    {editing ? <form onSubmit={(event) => { event.preventDefault(); onSave({ name: name.trim() || null, email: email.trim() }); }} className="mt-4 rounded-xl border border-border bg-surface p-4"><div className="grid gap-3 md:grid-cols-2"><Field label="Họ và tên" value={name} onChange={setName} autoComplete="name" /><Field label="Email" value={email} onChange={setEmail} type="email" autoComplete="email" required /></div><div className="mt-3 flex flex-wrap gap-2"><button type="submit" disabled={pending} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-brand px-4 text-xs font-extrabold text-white disabled:cursor-wait disabled:opacity-60"><Check className="size-3.5" />Lưu thay đổi</button><button type="button" onClick={onEdit} className="min-h-10 rounded-xl border border-border bg-white px-4 text-xs font-bold text-ink-muted hover:text-ink">Hủy</button></div></form> : null}
    {resetting ? <form onSubmit={(event) => { event.preventDefault(); onResetPassword(password); }} className="mt-4 rounded-xl border border-brand/15 bg-brand-soft/35 p-4"><div className="flex items-start gap-3"><KeyRound className="mt-0.5 size-4 shrink-0 text-brand" /><div className="min-w-0 flex-1"><label htmlFor={`reset-password-${user.id}`} className="text-sm font-extrabold text-ink">Mật khẩu mới cho {user.name || user.email}</label><p className="mt-1 text-xs text-ink-muted">Tối thiểu 8 ký tự. Phiên đăng nhập cũ sẽ bị thu hồi.</p><input id={`reset-password-${user.id}`} value={password} onChange={(event) => setPassword(event.target.value)} type="password" minLength={8} maxLength={128} autoComplete="new-password" required className="mt-3 h-10 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" /></div></div><div className="mt-3 flex flex-wrap gap-2"><button type="submit" disabled={pending} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-brand px-4 text-xs font-extrabold text-white disabled:cursor-wait disabled:opacity-60">{pending ? <LoaderCircle className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}Lưu mật khẩu</button><button type="button" onClick={onReset} className="min-h-10 rounded-xl border border-border bg-white px-4 text-xs font-bold text-ink-muted hover:text-ink">Hủy</button></div></form> : null}
  </article>;
}

function Field({ label, value, onChange, placeholder, type = "text", autoComplete, required = false }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string; autoComplete?: string; required?: boolean }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-extrabold text-ink">{label}{required ? <span className="text-red-600"> *</span> : null}</span><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} type={type} autoComplete={autoComplete} required={required} maxLength={type === "email" ? 254 : 100} className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none transition placeholder:text-ink-faint focus:border-brand focus:ring-2 focus:ring-brand/20" /></label>;
}

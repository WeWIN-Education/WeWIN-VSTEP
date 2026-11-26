import {
  adminHistoryPath,
  attemptStatus,
  attemptStatuses,
  catalogLabels,
  formatAttemptTime,
  listAdminVstepAttempts,
  practiceLabel,
  requireVstepHistoryAdmin,
  studentLabel,
  type AttemptStatus,
} from "@/lib/vstep-admin-history";
import Link from "next/link";

export const metadata = { title: "Lịch sử làm bài VSTEP | WEWIN" };
export const dynamic = "force-dynamic";

const control =
  "min-h-11 rounded-xl border border-border px-3 text-sm focus-visible:outline-2 focus-visible:outline-brand";
const action = `${control} inline-flex items-center justify-center font-semibold text-brand hover:border-brand`;
const cell = "min-w-0 lg:table-cell lg:px-5 lg:py-4 lg:align-top";

function scoreText(value: number | null) {
  return typeof value === "number" ? `${value}/10` : "—";
}

export default async function AdminVstepHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string | string[];
    status?: string | string[];
    page?: string | string[];
  }>;
}) {
  await requireVstepHistoryAdmin();
  const params = await searchParams;
  const query =
    typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const status =
    typeof params.status === "string" &&
    Object.hasOwn(attemptStatuses, params.status)
      ? (params.status as AttemptStatus)
      : "all";
  const requestedPage = Number(params.page);
  const page =
    Number.isInteger(requestedPage) &&
    requestedPage > 0 &&
    requestedPage <= 1_000_000
      ? requestedPage
      : 1;
  const now = new Date();
  const { rows, hasNext } = await listAdminVstepAttempts({
    query,
    status,
    page,
    now,
  });

  function pageHref(next: number) {
    const search = new URLSearchParams();
    if (query) search.set("q", query);
    if (status !== "all") search.set("status", status);
    if (next > 1) search.set("page", String(next));
    return search.size ? `${adminHistoryPath}?${search}` : adminHistoryPath;
  }

  return (
    <div className="mx-auto max-w-[1280px] space-y-6 text-ink">
      <header>
        <h1 className="text-3xl font-semibold">Lịch sử làm bài VSTEP</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          Theo dõi lượt làm Full Test và luyện kỹ năng của các tài khoản
          VSTEP.
        </p>
      </header>

      <section className="overflow-hidden rounded-3xl border border-border bg-surface-card">
        <form
          action={adminHistoryPath}
          className="flex flex-wrap items-end gap-3 border-b border-border p-4 sm:p-5"
        >
          <label className="grid min-w-0 flex-[1_1_240px] gap-1.5 text-sm font-medium">
            Tìm học viên hoặc bài luyện
            <input
              type="search"
              name="q"
              defaultValue={query}
              maxLength={100}
              placeholder="Tên, email hoặc bài luyện"
              className={`${control} w-full bg-surface-card font-normal`}
            />
          </label>
          <label className="grid min-w-0 flex-[1_1_152px] gap-1.5 text-sm font-medium sm:flex-initial">
            Trạng thái
            <select
              name="status"
              defaultValue={status}
              className={`${control} bg-surface-card font-normal`}
            >
              <option value="all">Tất cả trạng thái</option>
              {Object.entries(attemptStatuses).map(([value, { label }]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button className={`${action} bg-brand-soft`} type="submit">
            Lọc bài làm
          </button>
          {(query || status !== "all") && (
            <Link href={adminHistoryPath} className={action}>
              Xóa bộ lọc
            </Link>
          )}
        </form>

        {rows.length ? (
          <table
            role="table"
            aria-label="Lịch sử làm bài VSTEP"
            className="block w-full text-left lg:table"
          >
            <thead className="sr-only text-sm text-ink-muted lg:not-sr-only lg:table-header-group">
              <tr role="row">
                {[
                  "Thời gian",
                  "Học viên",
                  "Bài luyện",
                  "Trạng thái",
                  "Điểm",
                  "Chi tiết",
                ].map((label) => (
                  <th scope="col" key={label} className="px-5 py-3 font-semibold">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody role="rowgroup" className="block lg:table-row-group">
              {rows.map((row) => {
                const state =
                  attemptStatuses[
                    attemptStatus(
                      row.status,
                      row.submittedAt,
                      row.expiresAt,
                      now,
                    )
                  ];
                const name = studentLabel(row);
                return (
                  <tr
                    role="row"
                    key={row.id}
                    className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border p-4 hover:bg-surface lg:table-row lg:p-0"
                  >
                    <td
                      role="cell"
                      className={`${cell} order-3 text-sm tabular-nums`}
                    >
                      <span className="mb-1 block text-xs text-ink-muted">
                        Bắt đầu
                      </span>
                      <time
                        className="font-medium"
                        dateTime={row.startedAt.toISOString()}
                      >
                        {formatAttemptTime(row.startedAt)}
                      </time>
                      {row.submittedAt ? (
                        <div className="mt-1 text-xs text-ink-muted">
                          Nộp lúc{" "}
                          <time dateTime={row.submittedAt.toISOString()}>
                            {formatAttemptTime(row.submittedAt)}
                          </time>
                        </div>
                      ) : null}
                    </td>
                    <td role="cell" className={`${cell} order-1 break-words`}>
                      <span className="font-semibold">{name}</span>
                      {row.userName && row.userEmail ? (
                        <span className="mt-1 block break-all text-xs text-ink-muted">
                          {row.userEmail}
                        </span>
                      ) : null}
                    </td>
                    <td role="cell" className={`${cell} order-2 break-words`}>
                      <span className="font-medium">{row.examTitle}</span>
                      <span className="mt-1 block text-xs text-ink-muted">
                        {practiceLabel(row)} · {catalogLabels[row.catalog]}
                      </span>
                    </td>
                    <td role="cell" className={`${cell} order-4`}>
                      <span
                        className={`inline-block rounded-lg px-2.5 py-1.5 text-sm ${state.color}`}
                      >
                        {state.label}
                      </span>
                    </td>
                    <td
                      role="cell"
                      className={`${cell} order-5 text-sm font-semibold tabular-nums`}
                    >
                      <span className="mb-1 block text-xs font-normal text-ink-muted lg:hidden">
                        Điểm
                      </span>
                      L {scoreText(row.listeningScore)} · R{" "}
                      {scoreText(row.readingScore)}
                    </td>
                    <td role="cell" className={`${cell} order-6`}>
                      <Link
                        prefetch={false}
                        className={action}
                        href={`${adminHistoryPath}/${row.id}`}
                      >
                        {row.submittedAt || row.status === "SUBMITTED"
                          ? "Xem kết quả"
                          : "Xem lượt làm"}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="px-5 py-12 text-center text-sm text-ink-muted">
            {query || status !== "all" || page > 1
              ? "Không tìm thấy lượt làm phù hợp."
              : "Chưa có lượt làm VSTEP nào được lưu."}
          </p>
        )}

        {(page > 1 || hasNext) && (
          <nav
            aria-label="Phân trang lịch sử"
            className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 sm:px-5"
          >
            <span className="text-sm tabular-nums text-ink-muted">
              Trang {page}
            </span>
            <div className="flex flex-wrap gap-2">
              {page > 1 && (
                <Link href={pageHref(page - 1)} className={action}>
                  Trang trước
                </Link>
              )}
              {hasNext && (
                <Link href={pageHref(page + 1)} className={action}>
                  Trang sau
                </Link>
              )}
            </div>
          </nav>
        )}
      </section>
    </div>
  );
}

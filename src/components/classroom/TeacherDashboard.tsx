import { prisma } from "@/lib/prisma";
import { classFilter, type Actor } from "@/lib/classroom/access";
import { NavigationLink as Link } from "@/components/layout/NavigationLink";
export async function TeacherDashboard({
  user,
}: {
  user: Actor & { name: string | null };
}) {
  const classes = await prisma.classroom.findMany({
    where: classFilter(user),
    include: {
      _count: {
        select: {
          enrollments: { where: { status: "ACTIVE" } },
          assignments: true,
          materials: true,
        },
      },
      sessions: {
        where: {
          endsAt: { gt: new Date() },
          status: { in: ["SCHEDULED", "LIVE"] },
        },
        orderBy: { startsAt: "asc" },
        take: 1,
      },
    },
    orderBy: { updatedAt: "desc" },
  });
  return (
    <div className="mx-auto max-w-[1120px] space-y-6">
      <header>
        <p className="text-xs text-brand">KHÔNG GIAN GIÁO VIÊN</p>
        <h1 className="mt-2 text-3xl">Xin chào, {user.name || "giáo viên"}</h1>
        <p className="mt-3 text-sm text-ink-muted">
          Học liệu, bài tập và điểm danh cho các lớp được phân công.
        </p>
      </header>
      <div className="grid gap-5 sm:grid-cols-3">
        {[
          { name: "Lớp phụ trách", value: classes.length },
          {
            name: "Học viên đang học",
            value: classes.reduce((n, c) => n + c._count.enrollments, 0),
          },
          {
            name: "Bài tập đã tạo",
            value: classes.reduce((n, c) => n + c._count.assignments, 0),
          },
        ].map((s) => (
          <section key={s.name} className="classroom-panel">
            <p className="text-sm text-ink-muted">{s.name}</p>
            <p className="mt-3 font-ui text-3xl font-semibold">{s.value}</p>
          </section>
        ))}
      </div>
      <section className="classroom-panel space-y-4">
        <h2 className="text-lg">Lớp giảng dạy</h2>
        {classes.length ? (
          classes.map((c) => (
            <Link
              key={c.id}
              href={`/classes/${c.id}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface p-4"
            >
              <div>
                <h3 className="font-semibold">{c.title}</h3>
                <p className="mt-2 text-xs text-ink-muted">
                  {c.sessions[0]
                    ? `Buổi tới: ${c.sessions[0].startsAt.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}`
                    : "Chưa có lịch sắp tới"}
                </p>
              </div>
              <span className="text-sm text-brand">Mở lớp →</span>
            </Link>
          ))
        ) : (
          <p className="text-sm text-ink-muted">
            Trung tâm chưa phân công lớp cho bạn.
          </p>
        )}
      </section>
      <p className="text-sm text-ink-muted">
        Trung tâm quản lý tài khoản học viên, ghi danh và lịch học. Bạn chuẩn bị
        học liệu, giao/chấm bài và xác nhận điểm danh.
      </p>
    </div>
  );
}

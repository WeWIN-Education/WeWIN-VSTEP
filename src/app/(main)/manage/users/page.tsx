import { getCurrentUser } from "@/lib/access";
import { UserManagementPanel } from "@/components/manage/UserManagementPanel";
import { PageHero } from "@/components/ui/PageHero";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

type Props = { searchParams: Promise<{ q?: string | string[] }> };

const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { attempts: true, vocabularyProgress: true } },
} as const;

export default async function ManageUsersPage({ searchParams }: Props) {
  const actor = await getCurrentUser();
  if (!actor) redirect("/login?callbackUrl=/manage/users");
  if (actor.role !== "ADMIN") redirect("/dashboard");

  const params = await searchParams;
  const rawQuery = Array.isArray(params.q) ? params.q[0] : params.q;
  const query = rawQuery?.trim().slice(0, 100) || "";
  const where = { role: "LEARNER" as const, ...(query ? { OR: [{ name: { contains: query, mode: "insensitive" as const } }, { email: { contains: query, mode: "insensitive" as const } }] } : {}) };
  const [users, total, active, inactive] = await Promise.all([
    prisma.user.findMany({ where, orderBy: [{ isActive: "desc" }, { createdAt: "desc" }], select: userSelect }),
    prisma.user.count({ where: { role: "LEARNER" } }),
    prisma.user.count({ where: { role: "LEARNER", isActive: true } }),
    prisma.user.count({ where: { role: "LEARNER", isActive: false } }),
  ]);

  return <div className="mx-auto w-full max-w-[1120px] space-y-6"><PageHero eyebrow="QUẢN TRỊ TÀI KHOẢN" title="Quản lý học viên" description="Tạo và duy trì tài khoản do trung tâm cấp. Mọi thay đổi trạng thái đều có hiệu lực ngay với phiên đăng nhập." stats={[{ label: "Tổng học viên", value: String(total) }, { label: "Đang hoạt động", value: String(active) }, { label: "Đã khóa", value: String(inactive) }]} /><UserManagementPanel initialUsers={users.map((user) => ({ ...user, createdAt: user.createdAt.toISOString(), updatedAt: user.updatedAt.toISOString() }))} initialQuery={query} /></div>;
}

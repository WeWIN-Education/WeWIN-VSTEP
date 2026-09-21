import Link from "next/link";
import { getCurrentUser } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { CONTENT_SKILLS, type ContentKind } from "@/lib/learning-content";
import { Card } from "@/components/ui/Card";
import { PageHero } from "@/components/ui/PageHero";
import { LoginGate } from "@/components/auth/LoginGate";
import { SkillMascot } from "@/components/ui/SkillMascot";

export async function LearningContentCatalog({ kind, params }: { kind: ContentKind; params: { skill?: string; q?: string; cursor?: string } }) {
  const path = kind === "SKILL" ? "/training" : "/practice";
  const title = kind === "SKILL" ? "Kỹ năng" : "Bài tập";
  if (!await getCurrentUser()) return <LoginGate title={`Đăng nhập để mở ${title.toLowerCase()}`} description="Dành cho học viên có tài khoản đang hoạt động." callbackUrl={path}>{null}</LoginGate>;
  const skill = CONTENT_SKILLS.includes(params.skill as typeof CONTENT_SKILLS[number]) ? params.skill : undefined;
  const q = (params.q ?? "").slice(0, 200);
  let rows;
  try {
    rows = await prisma.learningContent.findMany({ where: { kind, published: true, skill, ...(q ? { title: { contains: q, mode: "insensitive" } } : {}), ...(params.cursor ? { id: { lt: params.cursor } } : {}) }, orderBy: { id: "desc" }, take: 21, select: { id: true, title: true, skill: true, level: true, code: true } });
  } catch {
    return <Card><p role="alert">Chưa tải được nội dung. Vui lòng thử lại sau.</p><Link href={path} className="admin-action mt-3">Tải lại</Link></Card>;
  }
  const items = rows.slice(0, 20);
  const next = new URLSearchParams({ ...(skill ? { skill } : {}), ...(q ? { q } : {}), cursor: items.at(-1)?.id ?? "" });
  return <div className="mx-auto max-w-[1120px] space-y-6">
    <PageHero eyebrow="VSTEP" title={title} />
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{CONTENT_SKILLS.map(s => <Link key={s} href={`${path}?skill=${s}`} aria-current={skill === s ? "page" : undefined} className={`group overflow-hidden rounded-2xl border bg-white focus-visible:ring-2 focus-visible:ring-brand ${skill === s ? "border-brand" : "border-border"}`}><SkillMascot skill={s} /><p className="p-3 text-center text-sm font-bold">{s[0] + s.slice(1).toLowerCase()}</p></Link>)}</div>
    <form className="flex flex-wrap items-end gap-2" action={path}><label className="min-w-0 flex-1 text-sm font-semibold">Tìm bài<input name="q" maxLength={200} defaultValue={q} className="admin-input mt-1" /></label>{skill && <input type="hidden" name="skill" value={skill} />}<button className="admin-action" type="submit">Tìm</button><Link href={path} className="admin-action">Tất cả</Link></form>
    {!items.length && <Card>Chưa có bài được mở trong mục này.</Card>}
    <div className="grid gap-4 sm:grid-cols-2">{items.map(item => <Link key={item.id} href={`${path}/content/${item.id}`}><Card className="h-full transition-colors hover:border-brand"><p className="text-xs font-bold text-brand">{item.skill} · {item.level}</p><h2 className="mt-2 break-words text-lg font-bold">{item.title}</h2><p className="mt-4 text-sm font-semibold text-brand">{kind === "SKILL" ? "Mở bài học" : "Mở bài tập"} →</p></Card></Link>)}</div>
    {rows.length > 20 && <Link href={`${path}?${next}`} className="admin-action">Trang tiếp</Link>}
  </div>;
}

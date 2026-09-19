import { SiteFooter } from "@/components/layout/SiteFooter";
import { Card } from "@/components/ui/Card";
import { LinkifiedText } from "@/components/ui/LinkifiedText";
import { PageHero } from "@/components/ui/PageHero";
import { LoginGate } from "@/components/auth/LoginGate";
import { getCurrentUser } from "@/lib/access";
import { fileExtension, formatFileSize, materialLevelLabel, materialSkillLabel } from "@/lib/learning-materials";
import { prisma } from "@/lib/prisma";
import { Download, FileAudio, FileText, ImageIcon, Upload, Video } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Tài liệu VSTEP | WEWIN EDUCATION" };

function materialIcon(mimeType: string) {
  if (mimeType.startsWith("audio/")) return FileAudio;
  if (mimeType.startsWith("video/")) return Video;
  if (mimeType.startsWith("image/")) return ImageIcon;
  return FileText;
}

export default async function MaterialsPage() {
  const actor = await getCurrentUser();
  if (!actor) return <div className="mx-auto max-w-[1100px]"><PageHero eyebrow="VSTEP" title="Kho tài liệu VSTEP" description="Guest có thể xem giới thiệu kho học liệu. Tài khoản WEWIN mới mở các file và nội dung đầy đủ." /><LoginGate title="Đăng nhập để mở tài liệu" description="Tài liệu VSTEP chỉ mở cho tài khoản được trung tâm cấp." callbackUrl="/materials">{null}</LoginGate></div>;

  const materials = await prisma.learningMaterial.findMany({
    where: { published: true, programme: "VSTEP" },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { id: true, title: true, description: true, skill: true, level: true, fileName: true, mimeType: true, sizeBytes: true, createdAt: true },
  });
  const skillCount = new Set(materials.map((material) => material.skill)).size;

  return <div className="mx-auto w-full max-w-[1100px]"><PageHero eyebrow="VSTEP" title="Kho tài liệu VSTEP" description="Học liệu được quản trị viên cập nhật theo kỹ năng và trình độ. Chọn một tài liệu để tải về và học offline." stats={[{ label: "Tài liệu", value: String(materials.length) }, { label: "Kỹ năng", value: String(skillCount) }, { label: "Quyền truy cập", value: "Đã cấp" }]} aside={actor.role === "ADMIN" ? <Link href="/manage/materials" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-btn)] bg-brand px-4 text-sm font-extrabold text-white transition hover:bg-brand-dark"><Upload className="size-4" />Quản lý kho</Link> : undefined} /><div className="mt-6">{materials.length ? <div className="grid gap-4 sm:grid-cols-2">{materials.map((material) => { const Icon = materialIcon(material.mimeType); const type = fileExtension(material.fileName).replace(".", "").toUpperCase() || "FILE"; const description = material.description || "Tài liệu học tập do WEWIN cập nhật."; return <Card key={material.id} className="flex min-w-0 flex-col gap-4 p-5"><div className="flex items-start gap-4"><span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand"><Icon className="size-5" /></span><div className="min-w-0 flex-1"><p className="text-[11px] font-extrabold uppercase tracking-wide text-brand">{type} · {materialSkillLabel(material.skill)}</p><h2 title={material.title} className="mt-1 line-clamp-2 break-words text-[15px] font-extrabold text-ink">{material.title}</h2><p title={description} className="mt-1 line-clamp-2 break-words text-xs text-ink-muted"><LinkifiedText>{description}</LinkifiedText></p></div></div><div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-3"><p className="min-w-0 flex-1 truncate text-[11px] text-ink-faint" title={material.fileName}>{material.fileName} · {materialLevelLabel(material.level)} · {formatFileSize(material.sizeBytes)}</p><a href={`/api/materials/${material.id}`} download className="inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-xl border border-brand/25 px-3 text-xs font-extrabold text-brand transition hover:border-brand hover:bg-brand-soft"><Download className="size-4" />Tải xuống</a></div></Card>; })}</div> : <Card className="border-dashed p-8 text-center"><FileText className="mx-auto size-9 text-brand/60" /><h2 className="mt-3 font-[family-name:var(--font-jakarta)] text-lg font-extrabold text-ink">Chưa có tài liệu được mở</h2><p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-muted">Quản trị viên chưa công bố tài liệu nào cho học viên. Hãy quay lại sau để xem nội dung mới.</p>{actor.role === "ADMIN" ? <Link href="/manage/materials" className="mt-5 inline-flex min-h-10 items-center justify-center gap-2 rounded-[var(--radius-btn)] bg-brand px-4 text-sm font-extrabold text-white hover:bg-brand-dark"><Upload className="size-4" />Tải tài liệu đầu tiên</Link> : null}</Card>}</div><SiteFooter /></div>;
}

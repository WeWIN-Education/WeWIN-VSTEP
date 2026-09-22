import { LearningMaterialUploadForm, type LearningMaterialSummary } from "@/components/manage/LearningMaterialUploadForm";
import { PageHero } from "@/components/ui/PageHero";
import { getCurrentUser } from "@/lib/access";
import { getMaterialsPage } from "@/lib/materials-page";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function ManageMaterialsPage() {
  const actor = await getCurrentUser();
  if (!actor) redirect("/login?callbackUrl=/manage/materials");
  if (actor.role !== "ADMIN") redirect("/dashboard");

  const page = await getMaterialsPage(true);
  const initialMaterials: LearningMaterialSummary[] = page.items;
  const publishedCount = page.published;

  return <div className="mx-auto w-full max-w-[1120px] space-y-6"><PageHero eyebrow="QUẢN TRỊ HỌC LIỆU" title="Tải tài liệu học tập" description="Tải, chỉnh sửa và mở tài liệu cho học viên." aside={<Link href="/materials" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-btn)] border border-brand/30 bg-white px-4 text-sm font-extrabold text-brand transition hover:border-brand hover:bg-brand-soft">Xem kho học viên<ArrowUpRight className="size-4" /></Link>} stats={[{ label: "Tổng file", value: String(page.total) }, { label: "Đang mở", value: String(publishedCount) }, { label: "Giới hạn mỗi file", value: "50 MB" }]} /><LearningMaterialUploadForm initialMaterials={initialMaterials} initialCursor={page.nextCursor} initialTotal={page.total} /></div>;
}

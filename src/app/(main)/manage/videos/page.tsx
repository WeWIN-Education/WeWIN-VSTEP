import { VideoManager } from "@/components/manage/VideoManager";
import { PageHero } from "@/components/ui/PageHero";
import { getCurrentUser } from "@/lib/access";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ManageVideosPage() {
  const actor = await getCurrentUser();
  if (!actor) redirect("/login?callbackUrl=/manage/videos");
  if (actor.role !== "ADMIN") redirect("/dashboard");
  return <div className="mx-auto w-full max-w-[1120px] space-y-6"><PageHero eyebrow="QUẢN TRỊ HỌC VIDEO" title="Kho video luyện thi VSTEP" description="Thêm video YouTube, tạo transcript Anh–IPA–Việt và duyệt nội dung trước khi mở cho học viên." /><VideoManager /></div>;
}

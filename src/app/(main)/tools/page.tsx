import { SiteFooter } from "@/components/layout/SiteFooter";
import { PageHero } from "@/components/ui/PageHero";
import { LoginGate } from "@/components/auth/LoginGate";
import { DictionaryTool } from "@/components/tools/DictionaryTool";
import { getCurrentUser } from "@/lib/access";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Công cụ | WEWIN EDUCATION",
};

export default async function ToolsPage() {
  if (!(await getCurrentUser())) return <div className="mx-auto max-w-[1040px]"><PageHero eyebrow="CÔNG CỤ" title="Tra từ nhanh" description="Đăng nhập để tra nghĩa, xem IPA và phát âm từ vựng." /><LoginGate title="Đăng nhập để mở công cụ" description="Đăng nhập để tiếp tục." callbackUrl="/tools">{null}</LoginGate></div>;
  return (
    <div className="mx-auto w-full max-w-[1040px]">
      <PageHero
        eyebrow="CÔNG CỤ"
        title="Tra từ nhanh"
        description="Tra nghĩa Anh – Việt, dịch đoạn văn và xem thông tin từ vựng trong một nơi."
      />
      <DictionaryTool />
      <SiteFooter />
    </div>
  );
}

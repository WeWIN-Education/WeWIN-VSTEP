import { SiteFooter } from "@/components/layout/SiteFooter";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHero } from "@/components/ui/PageHero";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tài liệu học tập | WEWIN EDUCATION",
};

const MATERIALS = [
  { title: "Checklist từ vựng Lớp 1", type: "PDF", href: "/vocab/topics" },
  { title: "Bảng phonics A–Z", type: "Trang", href: "/pronunciation" },
  { title: "Mẹo luyện thi", type: "Trang", href: "/exam" },
  { title: "Bài viết hướng dẫn", type: "Blog", href: "/blog" },
];

export default function MaterialsPage() {
  return (
    <div className="mx-auto max-w-[800px]">
      <PageHero
        eyebrow="TÀI LIỆU"
        title="Tài liệu học tập"
        description="Tổng hợp tài liệu tham khảo — bản PDF đầy đủ sẽ bổ sung dần."
      />

      <div className="mt-5 space-y-3">
        {MATERIALS.map((m) => (
          <Card key={m.title} className="flex items-center justify-between gap-3" padding="md">
            <div>
              <p className="text-[11px] font-bold uppercase text-brand">{m.type}</p>
              <h2 className="text-[15px] font-extrabold text-ink">{m.title}</h2>
            </div>
            <Link href={m.href}>
              <Button variant="outline" size="sm">
                Mở
              </Button>
            </Link>
          </Card>
        ))}
      </div>

      <SiteFooter />
    </div>
  );
}

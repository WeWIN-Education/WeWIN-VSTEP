import { SiteFooter } from "@/components/layout/SiteFooter";
import { Card } from "@/components/ui/Card";
import { PageHero } from "@/components/ui/PageHero";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hợp tác | WEWIN EDUCATION",
};

export default async function PartnersPage() {
  let partners: { id: string; name: string; center: string | null; phone: string | null }[] = [];
  try {
    partners = await prisma.partner.findMany({ orderBy: { sortOrder: "asc" } });
  } catch {
    partners = [
      { id: "1", name: "Cô Minh Anh", center: "Trung tâm Anh ngữ HN", phone: "0901 234 567" },
    ];
  }

  return (
    <div className="mx-auto max-w-[900px]">
      <PageHero
        eyebrow="HỢP TÁC"
        title="Đối tác WEWIN"
        description="Hệ thống trung tâm và giáo viên đồng hành cùng WEWIN EDUCATION."
      />

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {partners.map((p) => (
          <Card key={p.id} padding="lg">
            <h2 className="text-[15px] font-extrabold text-ink">{p.name}</h2>
            <p className="mt-1 text-[13px] text-ink-muted">{p.center}</p>
            {p.phone ? (
              <p className="mt-2 text-[13px] font-semibold text-brand">{p.phone}</p>
            ) : null}
          </Card>
        ))}
      </div>

      <Card className="mt-4" padding="lg">
        <h3 className="text-sm font-bold text-ink">Trở thành đối tác</h3>
        <p className="mt-2 text-[13px] text-ink-muted">
          Liên hệ{" "}
          <a href="/contact" className="font-semibold text-brand hover:underline">
            trang Liên hệ
          </a>{" "}
          để nhận thông tin hợp tác trung tâm / affiliate.
        </p>
      </Card>

      <SiteFooter />
    </div>
  );
}

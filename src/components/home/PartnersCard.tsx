import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { SectionTitle } from "@/components/ui/SectionTitle";
import Link from "next/link";

type Partner = {
  id: string;
  name: string;
  center: string | null;
  phone: string | null;
};

export function PartnersCard({ partners }: { partners: Partner[] }) {
  return (
    <Card>
      <SectionTitle title="Đối tác & Nhà tài trợ" />
      <ul className="space-y-3">
        {partners.map((partner) => (
          <li key={partner.id} className="flex items-center gap-3">
            <ImageSlot
              label="Avatar"
              aspect="aspect-square"
              className="size-11 shrink-0 rounded-full"
            />
            <div className="min-w-0">
              <div className="truncate text-[13px] font-semibold text-ink">
                {partner.name}
              </div>
              {partner.center ? (
                <div className="truncate text-[11px] text-ink-muted">
                  {partner.center}
                </div>
              ) : null}
              {partner.phone ? (
                <div className="text-[11px] text-ink-faint">{partner.phone}</div>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      <Link href="/partners" className="mt-4 block">
        <Button variant="outline" className="w-full" size="sm">
          Trở thành đối tác
        </Button>
      </Link>
    </Card>
  );
}

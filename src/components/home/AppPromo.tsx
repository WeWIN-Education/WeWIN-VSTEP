import { Button } from "@/components/ui/Button";
import Image from "next/image";
import Link from "next/link";

export function AppPromo() {
  return (
    <section className="overflow-hidden rounded-[20px] bg-[#0B1F5C] p-5 text-white md:p-7">
      <div className="grid items-center gap-6 md:grid-cols-[1.4fr_1fr]">
        <div>
          <p className="text-[12px] font-semibold tracking-wide text-white/60">
            Ứng dụng di động
          </p>
          <h2 className="mt-1 font-[family-name:var(--font-jakarta)] text-2xl font-extrabold">
            Học tiếng Anh mọi lúc, mọi nơi
          </h2>
          <p className="mt-2 max-w-lg text-[13px] leading-relaxed text-white/70">
            Mang WEWIN theo bên mình — học offline, nhận nhắc học giữ streak và
            đồng bộ tiến độ giữa điện thoại và web.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/download">
              <Button className="bg-white text-ink hover:bg-white/90">
                Google Play
              </Button>
            </Link>
            <Link href="/download">
              <Button variant="outline" className="border-white/30 text-white hover:bg-white/10">
                App Store
              </Button>
            </Link>
          </div>
        </div>
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-white/10">
          <Image
            src="/brand/mascot-left-clear.png"
            alt="WEWIN mascot"
            fill
            className="object-contain p-4"
            sizes="(max-width: 768px) 100vw, 40vw"
          />
        </div>
      </div>
    </section>
  );
}

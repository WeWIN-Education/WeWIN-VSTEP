import { TypingGame } from "@/components/game/TypingGame";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { PageHero } from "@/components/ui/PageHero";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gõ từ | WEWIN EDUCATION",
};

export default function TypingGamePage() {
  return (
    <div className="mx-auto max-w-[800px]">
      <Link
        href="/game"
        className="mb-3 inline-block text-[13px] font-semibold text-brand hover:underline"
      >
        ← Trò chơi
      </Link>
      <PageHero
        eyebrow="GAME"
        title="Gõ từ tiếng Anh"
        description="Nhìn từ và gõ đúng càng nhiều càng tốt trong 60 giây."
        className="mb-5"
      />
      <TypingGame />
      <SiteFooter />
    </div>
  );
}

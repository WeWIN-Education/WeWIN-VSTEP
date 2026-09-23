import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/access";
import { BattleArena } from "@/components/battle/BattleGame";
export const metadata: Metadata = { title: "Sân đấu Quick Battle | WEWIN VSTEP", robots: { index: false } };
export default async function BattlePage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  if (!await getCurrentUser()) redirect(`/login?callbackUrl=${encodeURIComponent(`/battle/${matchId}`)}`);
  return <BattleArena matchId={matchId} />;
}

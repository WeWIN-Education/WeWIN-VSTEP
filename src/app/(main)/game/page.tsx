import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/access";
import { BattleLobby } from "@/components/battle/BattleGame";
export const metadata: Metadata = { title: "Quick Battle B1 | WEWIN VSTEP" };
export const dynamic = "force-dynamic";
export default async function GamePage() {
  const user = await getCurrentUser();
  return <BattleLobby authenticated={Boolean(user)} enabled={process.env.QUICK_BATTLE_ENABLED === "true"} />;
}

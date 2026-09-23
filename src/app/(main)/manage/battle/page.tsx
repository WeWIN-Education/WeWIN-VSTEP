import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/access";
import { BattleQuestionManager } from "@/components/manage/BattleQuestionManager";
export const metadata = { title: "Quản trị Quick Battle | WEWIN VSTEP" };
export default async function ManageBattlePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/manage/battle");
  if (user.role !== "ADMIN") redirect("/dashboard");
  return <div className="mx-auto max-w-5xl space-y-6"><h1 className="text-3xl font-bold">Câu hỏi Quick Battle</h1><BattleQuestionManager /></div>;
}

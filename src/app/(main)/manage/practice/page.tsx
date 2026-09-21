import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/access";
import { PageHero } from "@/components/ui/PageHero";
import { LearningContentManager } from "@/components/manage/LearningContentManager";

export default async function ManagePracticePage() {
  const actor = await getCurrentUser();
  if (!actor) redirect("/login?callbackUrl=/manage/practice");
  if (actor.role !== "ADMIN") redirect("/dashboard");
  return <div className="mx-auto max-w-[1120px] space-y-6"><PageHero eyebrow="QUẢN TRỊ" title="Bài tập" /><LearningContentManager kind="EXERCISE" /></div>;
}

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/access";
import { PageHero } from "@/components/ui/PageHero";
import { GrammarManager } from "@/components/grammar/GrammarManager";
import styles from "@/components/grammar/grammar.module.css";
export const dynamic = "force-dynamic";
export default async function ManageGrammarPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=%2Fmanage%2Fgrammar");
  if (user.role !== "ADMIN") redirect("/grammar");
  return <div className={`${styles.page} space-y-6`}><PageHero backgroundSrc="" eyebrow="QUẢN TRỊ · NGỮ PHÁP" title="Biên tập ngữ pháp" description="Quản lý 40 chuyên đề theo 6 nhóm kiến thức. Nhập bản nháp, đối chiếu đáp án, xem trước rồi công bố." /><GrammarManager /></div>;
}

import { LearningContentDetail } from "@/components/learning/LearningContentDetail";
export const dynamic = "force-dynamic";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <LearningContentDetail kind="EXERCISE" id={(await params).id} />;
}

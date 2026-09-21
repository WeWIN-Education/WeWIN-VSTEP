import { LearningContentCatalog } from "@/components/learning/LearningContentCatalog";
export const dynamic = "force-dynamic";
export default async function TrainingPage({ searchParams }: { searchParams: Promise<{ skill?: string; q?: string; cursor?: string }> }) {
  return <LearningContentCatalog kind="SKILL" params={await searchParams} />;
}

import { LearningContentCatalog } from "@/components/learning/LearningContentCatalog";
export const dynamic = "force-dynamic";
export const metadata = { title: "Bài tập | WEWIN EDUCATION" };
export default async function PracticePage({ searchParams }: { searchParams: Promise<{ skill?: string; q?: string; cursor?: string }> }) {
  return <LearningContentCatalog kind="EXERCISE" params={await searchParams} />;
}

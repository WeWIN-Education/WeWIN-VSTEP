import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/access";
import { getGrammarExercise, getGrammarLesson } from "@/lib/grammar";
import { GrammarError } from "@/lib/grammar-rules";
import { GrammarExercise } from "@/components/grammar/GrammarExercise";

export const dynamic = "force-dynamic";
export default async function GrammarPracticePage({ params, searchParams }: { params: Promise<{ topicSlug: string; setId: string }>; searchParams: Promise<{ preview?: string; mode?: string }> }) {
  const { topicSlug, setId } = await params, { preview, mode } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?callbackUrl=${encodeURIComponent(`/grammar/${topicSlug}/practice/${setId}`)}`);
  try {
    const lesson = await getGrammarLesson(topicSlug, user.id, preview);
    const exercise = await getGrammarExercise(lesson.id, setId, user.id, mode === "REVIEW" ? "REVIEW" : "TEST", Boolean(preview));
    return <GrammarExercise key={`${exercise.lessonId}:${setId}:${exercise.mode}`} exercise={exercise} userId={user.id} />;
  } catch (error) {
    if (error instanceof GrammarError && [403, 404].includes(error.status)) notFound();
    if (error instanceof GrammarError) return <div className="classroom-panel mx-auto max-w-2xl space-y-4"><h1 className="text-xl font-bold">Chưa mở được bài luyện</h1><p>{error.message}</p><Link className="admin-action" href="/grammar">Về danh sách chuyên đề</Link></div>;
    throw error;
  }
}

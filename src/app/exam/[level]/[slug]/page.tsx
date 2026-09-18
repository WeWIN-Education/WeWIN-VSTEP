import { ExamTake } from "@/components/exam/ExamTake";
import { EXAM_PROGRAMS, type ExamProgram } from "@/lib/exam-config";
import { getExamForRun } from "@/lib/exam-server";
import { getAuthState } from "@/lib/access";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";

type CatalogCode = "FULL" | "LISTENING" | "READING" | "WRITING" | "SPEAKING";
type Props = { params: Promise<{ level: string; slug: string }>; searchParams: Promise<{ catalog?: string | string[] }> };

function readCatalog(value: string | string[] | undefined): CatalogCode {
  const normalized = Array.isArray(value) ? value[0] : value;
  return ["FULL", "LISTENING", "READING", "WRITING", "SPEAKING"].includes(normalized ?? "") ? normalized as CatalogCode : "FULL";
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { level, slug } = await params;
  const program = level as ExamProgram;
  return { title: program in EXAM_PROGRAMS ? `${slug} · ${EXAM_PROGRAMS[program].label} | WEWIN EDUCATION` : "Làm đề | WEWIN EDUCATION" };
}

export default async function ExamTakePage({ params, searchParams }: Props) {
  const [{ level, slug }, filters] = await Promise.all([params, searchParams]);
  const program = level as ExamProgram;
  if (!(program in EXAM_PROGRAMS)) notFound();
  const authState = await getAuthState();
  if (authState.kind === "invalid") redirect(`/login?callbackUrl=${encodeURIComponent(`/exam/${level}/${slug}`)}`);
  const access = authState.kind === "authenticated"
    ? authState.user.role === "ADMIN" ? { kind: "admin" as const, userId: authState.user.id } : { kind: "learner" as const, userId: authState.user.id }
    : { kind: "guest" as const };
  const exam = await getExamForRun(program, slug, access);
  if (!exam) notFound();
  return (
    <ExamTake
      exam={exam}
      catalog={readCatalog(filters.catalog)}
      candidate={
        authState.kind === "authenticated"
          ? {
              id: authState.user.id,
              name: authState.user.name,
              email: authState.user.email,
              role: authState.user.role,
            }
          : { role: "GUEST", name: "Khách học thử", email: "Lượt học thử 30 ngày" }
      }
    />
  );
}

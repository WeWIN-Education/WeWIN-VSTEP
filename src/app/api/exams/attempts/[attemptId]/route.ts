import { prisma } from "@/lib/prisma";
import { publicGrading } from "@/lib/grading-jobs";
import { getAttemptOwner, ownerWhere } from "@/lib/exam-attempt-access";
import { consumeGuestRateLimit, guestRateLimitResponse } from "@/lib/guest-exams";
import { object, savedAnswers, validateSubmission } from "@/lib/exam-submission";
import type { Prisma, ExamSkill } from "@prisma/client";
import { NextResponse } from "next/server";
import { resolveCatalogExamData, scoreExam } from "@/lib/exam-scoring";

export async function GET(_request: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const owner = await getAttemptOwner();
  if (!owner || owner.kind === "invalid") return NextResponse.json({error:"Phiên đăng nhập hoặc phiên học thử đã hết hạn."},{status:401});
  if (owner.kind === "guest") {
    const rate = await consumeGuestRateLimit(_request, "attempt-read", 180, owner.guestSessionId);
    if (!rate.allowed) return NextResponse.json({ error: "Bạn thao tác quá nhanh. Hãy thử lại sau ít phút." }, { status: 429, headers: guestRateLimitResponse(rate) });
  }
  const { attemptId } = await params;
  const attempt = await prisma.examAttempt.findFirst({where:{id:attemptId,...ownerWhere(owner)},include:{examPaper:{select:{slug:true,sections:true,questions:true}},paperPart:{select:{sections:true,questions:true}}}});
  if (!attempt) return NextResponse.json({error:"Không tìm thấy lượt thi."},{status:404});
  const saved=savedAnswers(attempt.answers);
  const exam=resolveCatalogExamData({ slug: attempt.examPaper.slug, sections: attempt.examPaper.sections, questions: attempt.examPaper.questions, catalog: attempt.catalog, partSections: attempt.paperPart?.sections, partQuestions: attempt.paperPart?.questions });
  const bookmarks = owner.kind === "user" ? await prisma.questionBookmark.findMany({ where: { userId: owner.userId, examPaperId: attempt.examPaperId, catalog: attempt.catalog }, select: { questionId: true, note: true, createdAt: true } }) : [];
  const publicAttempt = Object.fromEntries(Object.entries(attempt).filter(([key]) => !["userId","guestSessionId","examPaper","paperPart","grading","gradingStartedAt"].includes(key)));
  return NextResponse.json({...publicAttempt,...saved,bookmarks,...(attempt.status==="SUBMITTED"&&exam?{...scoreExam(exam.paper,exam.privateData,saved.answers as Record<string,string>),...publicGrading(attempt.grading)}:{})}, {headers:{"Cache-Control":"private, no-store"}});
}
export async function PATCH(request: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const owner = await getAttemptOwner();
  if (!owner || owner.kind === "invalid") return NextResponse.json({error:"Phiên đăng nhập hoặc phiên học thử đã hết hạn."},{status:401});
  if (owner.kind === "guest") {
    const rate = await consumeGuestRateLimit(request, "attempt-save", 180, owner.guestSessionId);
    if (!rate.allowed) return NextResponse.json({ error: "Bạn thao tác quá nhanh. Hãy thử lại sau ít phút." }, { status: 429, headers: guestRateLimitResponse(rate) });
  }
  const { attemptId } = await params;
  try {
    const body = object(await request.json());
    const existing = await prisma.examAttempt.findFirst({where:{id:attemptId,...ownerWhere(owner),status:"IN_PROGRESS"},include:{examPaper:{select:{slug:true,sections:true,questions:true}},paperPart:{select:{sections:true,questions:true}}}});
    if (!existing) return NextResponse.json({error:"Lượt thi đã nộp hoặc không tồn tại."},{status:409});
    const exam=resolveCatalogExamData({ slug: existing.examPaper.slug, sections: existing.examPaper.sections, questions: existing.examPaper.questions, catalog: existing.catalog, partSections: existing.paperPart?.sections, partQuestions: existing.paperPart?.questions });
    if(!exam)return NextResponse.json({error:"Nội dung đề không hợp lệ."},{status:409});
    const data = validateSubmission(body,existing.answers,existing.recordings,exam.paper,attemptId);
    const currentSkill = ["LISTENING","READING","WRITING","SPEAKING"].includes(String(body.currentSkill)) ? body.currentSkill as ExamSkill : undefined;
    const result = await prisma.examAttempt.updateMany({where:{id:attemptId,status:"IN_PROGRESS",updatedAt:existing.updatedAt},data:{answers:{answers:data.answers,writingAnswers:data.writingAnswers},recordings:data.recordings as Prisma.InputJsonObject,currentPart:Number.isInteger(body.currentPart) ? Math.max(0,Math.min(3,Number(body.currentPart))) : undefined,currentUnit:Number.isInteger(body.currentUnit)?Math.max(0,Math.min(3,Number(body.currentUnit))):undefined,currentSkill}});
    if (!result.count) return NextResponse.json({error:"Bài làm vừa được cập nhật. Hãy lưu lại."},{status:409});
    return NextResponse.json({saved:true,savedAt:new Date().toISOString()});
  } catch(error) { return NextResponse.json({error:error instanceof Error ? error.message : "Không thể lưu bài."},{status:400}); }
}

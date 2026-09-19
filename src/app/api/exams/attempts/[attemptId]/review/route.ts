import { prisma } from "@/lib/prisma";
import { publicGrading } from "@/lib/grading-jobs";
import { getAttemptOwner, ownerWhere } from "@/lib/exam-attempt-access";
import { consumeGuestRateLimit, guestRateLimitResponse } from "@/lib/guest-exams";
import { savedAnswers } from "@/lib/exam-submission";
import { examReview } from "@/lib/exam-review";
import { resolveCatalogExamData } from "@/lib/exam-scoring";
import { NextResponse } from "next/server";
export async function GET(_request:Request,{params}:{params:Promise<{attemptId:string}>}) {
  const owner=await getAttemptOwner();
  if(!owner || owner.kind === "invalid") return NextResponse.json({error:"Phiên đăng nhập hoặc phiên học thử đã hết hạn."},{status:401});
  if (owner.kind === "guest") {
    const rate = await consumeGuestRateLimit(_request, "attempt-review", 60, owner.guestSessionId);
    if (!rate.allowed) return NextResponse.json({ error: "Bạn thao tác quá nhanh. Hãy thử lại sau ít phút." }, { status: 429, headers: guestRateLimitResponse(rate) });
  }
  const {attemptId}=await params;
  const attempt=await prisma.examAttempt.findFirst({where:{id:attemptId,...ownerWhere(owner),status:"SUBMITTED"},include:{examPaper:{select:{id:true,slug:true,sections:true,questions:true}},paperPart:{select:{sections:true,questions:true}}}});
  if(!attempt) return NextResponse.json({error:"Chỉ xem đáp án sau khi nộp bài."},{status:404});
  const exam=resolveCatalogExamData({ slug: attempt.examPaper.slug, sections: attempt.examPaper.sections, questions: attempt.examPaper.questions, catalog: attempt.catalog, partSections: attempt.paperPart?.sections, partQuestions: attempt.paperPart?.questions });
  if(!exam)return NextResponse.json({error:"Nội dung đề không hợp lệ."},{status:409});
  const saved=savedAnswers(attempt.answers);
  const bookmarks = owner.kind === "user" ? await prisma.questionBookmark.findMany({ where: { userId: owner.userId, examPaperId: attempt.examPaper.id, catalog: attempt.catalog }, select: { questionId: true } }) : [];
  const bookmarkedQuestionIds = new Set(bookmarks.map((bookmark) => bookmark.questionId));
  return NextResponse.json({review:examReview(exam.paper,exam.privateData,saved.answers,bookmarkedQuestionIds),bookmarks,writingAnswers:saved.writingAnswers,recordings:attempt.recordings,grading:publicGrading(attempt.grading)},{headers:{"Cache-Control":"private, no-store"}});
}

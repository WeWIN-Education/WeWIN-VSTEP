import { prisma } from "@/lib/prisma";
import { getAttemptOwner, ownerWhere } from "@/lib/exam-attempt-access";
import { consumeGuestRateLimit, guestRateLimitResponse } from "@/lib/guest-exams";
import type { Prisma } from "@prisma/client";
import { resolveCatalogExamData, scoreExam } from "@/lib/exam-scoring";
import { object, savedAnswers, validateSubmission } from "@/lib/exam-submission";
import { awardXpForAttempt } from "@/lib/gamification";
import { NextResponse } from "next/server";

export async function POST(request: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const owner = await getAttemptOwner();
  if (!owner || owner.kind === "invalid") return NextResponse.json({error:"Phiên đăng nhập hoặc phiên học thử đã hết hạn."},{status:401});
  if (owner.kind === "guest") {
    const rate = await consumeGuestRateLimit(request, "attempt-submit", 10, owner.guestSessionId);
    if (!rate.allowed) return NextResponse.json({ error: "Bạn thao tác quá nhanh. Hãy thử lại sau ít phút." }, { status: 429, headers: guestRateLimitResponse(rate) });
  }
  const { attemptId } = await params;
  try {
    const body = object(await request.json());
    const attempt = await prisma.examAttempt.findFirst({where:{id:attemptId,...ownerWhere(owner)},include:{examPaper:{select:{slug:true,sections:true,questions:true}},paperPart:{select:{sections:true,questions:true}}}});
    if (!attempt) return NextResponse.json({error:"Không tìm thấy lượt thi."},{status:404});
    const exam=resolveCatalogExamData({ slug: attempt.examPaper.slug, sections: attempt.examPaper.sections, questions: attempt.examPaper.questions, catalog: attempt.catalog, partSections: attempt.paperPart?.sections, partQuestions: attempt.paperPart?.questions });
    if(!exam)return NextResponse.json({error:"Nội dung đề không hợp lệ."},{status:409});
    if (attempt.status === "SUBMITTED") {
      const xpAward = owner.kind === "user" ? await awardXpForAttempt(attemptId, owner.userId).catch(() => null) : null;
      return NextResponse.json({id:attemptId,...scoreExam(exam.paper,exam.privateData,savedAnswers(attempt.answers).answers as Record<string,string>),...object(attempt.grading),writingStatus:attempt.writingStatus,speakingStatus:attempt.speakingStatus,xpAward});
    }
    const data = validateSubmission(body,attempt.answers,attempt.recordings,exam.paper,attemptId);
    const storedRecordings = await prisma.examRecording.findMany({ where: { attemptId, status: "SAVED" }, select: { partId: true, storageKey: true } });
    const storedByPart = new Map(storedRecordings.map((recording) => [recording.partId, recording.storageKey]));
    for (const [partId, value] of Object.entries(data.recordings)) {
      const storageKey = value && typeof value === "object" && !Array.isArray(value) && typeof (value as Record<string, unknown>).storageKey === "string" ? String((value as Record<string, unknown>).storageKey) : "";
      if (storageKey && storedByPart.get(partId) !== storageKey) return NextResponse.json({ error: "Bản ghi Speaking chưa được xác nhận trên máy chủ." }, { status: 409 });
    }
    const score = scoreExam(exam.paper,exam.privateData,data.answers);
    const writingStatus = Object.values(data.writingAnswers).some(v=>v.trim()) ? "NOT_GRADED" : "NOT_STARTED";
    const speakingStatus = Object.keys(data.recordings).length ? "NOT_GRADED" : "NOT_STARTED";
    const changed = await prisma.examAttempt.updateMany({where:{id:attemptId,status:"IN_PROGRESS",updatedAt:attempt.updatedAt},data:{status:"SUBMITTED",submittedAt:new Date(),answers:{answers:data.answers,writingAnswers:data.writingAnswers},recordings:data.recordings as Prisma.InputJsonObject,listeningScore:score.listening.total ? score.listening.score : null,readingScore:score.reading.total ? score.reading.score : null,writingStatus,speakingStatus}});
    if (!changed.count) return NextResponse.json({error:"Bài làm vừa được lưu. Vui lòng nhấn nộp lại."},{status:409});
    const objectiveScores = attempt.catalog === "LISTENING" ? [score.listening.score] : attempt.catalog === "READING" ? [score.reading.score] : attempt.catalog === "FULL" ? [score.listening.score, score.reading.score] : [];
    const objectiveAverage = objectiveScores.length && objectiveScores.every((value): value is number => typeof value === "number") ? Math.round(objectiveScores.reduce((a,b)=>a+b,0)/objectiveScores.length*10)/10 : null;
    const xpAward = owner.kind === "user" ? await awardXpForAttempt(attemptId, owner.userId).catch(() => null) : null;
    return NextResponse.json({id:attemptId,...score,objectiveAverage,overallScore:null,writingStatus,speakingStatus,xpAward});
  } catch(error) { return NextResponse.json({error:error instanceof Error ? error.message : "Không thể nộp bài."},{status:400}); }
}

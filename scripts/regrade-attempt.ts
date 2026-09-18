import { PrismaClient, type Prisma } from "@prisma/client";
import { gradeSpeaking, gradeWriting, aggregateSpeaking, PROMPT_VERSION } from "../src/lib/openai-grading";
import { resolveExamData, scoreExam } from "../src/lib/exam-scoring";
import { object, savedAnswers } from "../src/lib/exam-submission";

const id=process.argv[2];
async function main(){
if(!id) throw new Error("Usage: npx tsx scripts/regrade-attempt.ts ATTEMPT_ID");
const prisma=new PrismaClient();
try {
  const attempt=await prisma.examAttempt.findUnique({where:{id},include:{examPaper:{select:{slug:true,sections:true,questions:true}}}});
  if(!attempt || attempt.status!=="SUBMITTED") throw new Error("Lượt thi không tồn tại hoặc chưa nộp.");
  const exam=resolveExamData(attempt.examPaper.slug,attempt.examPaper.sections,attempt.examPaper.questions);
  if(!exam) throw new Error("Không đọc được nội dung đề.");
  const saved=savedAnswers(attempt.answers), pipelines:Record<string,Record<string,unknown>>={}, writing:Record<string,unknown>[] = [], speaking:Record<string,unknown>[]=[];
  async function checkpoint(){await prisma.examAttempt.update({where:{id},data:{grading:{writing,speaking,pipelines,prompt_version:PROMPT_VERSION,complete:false} as unknown as Prisma.InputJsonValue,gradingStartedAt:null}});}
  for(const [index,task] of exam.paper.writing.entries()){
    const response=saved.writingAnswers[task.id]; if(typeof response!=="string"||!response.trim())continue;
    writing.push({id:task.id,...await gradeWriting(index===0?"task1":"task2",task.prompt+(task.bullets?"\n"+task.bullets.join("\n"):""),response,{},async state=>{pipelines[task.id]=state;await checkpoint();})}); await checkpoint();
  }
  const recordings=object(attempt.recordings);
  for(const part of exam.paper.speaking.parts){const record=object(recordings[part.id]);if(typeof record.audioData!=="string"||!record.audioData)continue;speaking.push({id:part.id,...await gradeSpeaking(part.id.replace("speaking-","part"),part.prompt+"\n"+part.questions.join("\n"),record.audioData,{},async state=>{pipelines[part.id]=state;await checkpoint();})});await checkpoint();}
  const scoreValue=(items:Record<string,unknown>[],key:string)=>{const value=items.find(item=>item.id===key)?.task_score;return typeof value==="number"?value:null;};
  const wValues=exam.paper.writing.map(task=>scoreValue(writing,task.id)),sValues=exam.paper.speaking.parts.map(part=>scoreValue(speaking,part.id));
  const writingScore=wValues.every((value):value is number=>typeof value==="number")?Math.round((wValues[0]+2*wValues[1])/3*2)/2:null;
  const speakingSummary:Record<string,unknown>=sValues.every((value):value is number=>typeof value==="number")?await aggregateSpeaking(speaking):{};
  const speakingScore=typeof speakingSummary.speaking_estimated_score==="number"?speakingSummary.speaking_estimated_score:null;
  const objective=scoreExam(exam.paper,exam.privateData,saved.answers as Record<string,string>), scores=[objective.listening.score,objective.reading.score,writingScore,speakingScore];
  const overallScore=scores.every((value):value is number=>typeof value==="number")?Math.round(scores.reduce((a,b)=>a+b,0)/scores.length*10)/10:null;
  const grading={writing,speaking,writingScore,speakingScore,overallScore,speakingSummary,pipelines,prompt_version:PROMPT_VERSION,complete:true};
  await prisma.examAttempt.update({where:{id},data:{grading:grading as unknown as Prisma.InputJsonValue,gradingStartedAt:null,writingStatus:writingScore===null?"PARTIAL":"GRADED",speakingStatus:speakingScore===null?"PARTIAL":"GRADED"}});
  console.log(JSON.stringify({id,writingScore,speakingScore,overallScore,writing:writing.length,speaking:speaking.length}));
} finally {await prisma.$disconnect();}
}
main().catch(error=>{console.error(error instanceof Error?error.message:error);process.exitCode=1;});

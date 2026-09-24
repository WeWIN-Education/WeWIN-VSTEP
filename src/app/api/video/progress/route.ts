import { getCurrentUser } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { findPublishedLearningVideo } from "@/lib/video-repository";
import { mergeIntervals, watchedSeconds, type Interval } from "@/lib/watched-intervals";
import { object } from "@/lib/exam-submission";
import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

const privateHeaders = { "Cache-Control": "private, no-store" };

function durationSeconds(value: string) {
 const parts=value.split(":").map(Number);
 if(parts.some(part=>!Number.isFinite(part)))return 0;
 if(parts.length===3)return parts[0]*3600+parts[1]*60+parts[2];
 return parts[0]*60+(parts[1]||0);
}

function privateJson(body: unknown, status = 200) {
 return NextResponse.json(body, { status, headers: privateHeaders });
}

export async function GET(request:Request){
 const session=await getCurrentUser();
 if(!session?.id)return privateJson({error:"Bạn cần đăng nhập."},401);
 const videoSlug=new URL(request.url).searchParams.get("videoSlug")||"";
 if(!await findPublishedLearningVideo(videoSlug))return privateJson({error:"Không có video."},404);
 const progress=await prisma.videoProgress.findUnique({where:{userId_videoSlug:{userId:session.id,videoSlug}}});
 return privateJson(progress||{currentSec:0,watchedIntervals:[],quizAnswers:{},completed:false});
}
export async function POST(request:Request){
 const session=await getCurrentUser();
 if(!session?.id)return privateJson({error:"Bạn cần đăng nhập."},401);
 try{
 const body=object(await request.json());
 const videoSlug=String(body.videoSlug||"");
 const video=await findPublishedLearningVideo(videoSlug);
 if(!video)return privateJson({error:"Không có video."},404);
 const duration=durationSeconds(video.duration);
 if(!Array.isArray(body.watchedIntervals)||body.watchedIntervals.length>2000)throw new Error("Tiến độ không hợp lệ.");
 const incoming=mergeIntervals(body.watchedIntervals as Interval[],duration);
 const previous=await prisma.videoProgress.findUnique({where:{userId_videoSlug:{userId:session.id,videoSlug}}});
 const existing=mergeIntervals(Array.isArray(previous?.watchedIntervals)?previous.watchedIntervals as Interval[]:[],duration);
 const merged=mergeIntervals([...existing,...incoming],duration);
 // A bounded wall-clock budget rejects a forged instant full-watch update.
 const elapsed=previous?Math.max(0,(Date.now()-previous.updatedAt.getTime())/1000):0;
 // The first heartbeat has no server timestamp yet; accept only a bounded
 // opening window, then rate-limit every subsequent coverage increase.
 const allowedIncrease=previous?Math.min(120,elapsed*2+2):120;
 const accepted=watchedSeconds(merged)-watchedSeconds(existing)<=allowedIncrease?merged:existing;
 const answers={...object(previous?.quizAnswers)};
 for(const [id,value] of Object.entries(object(body.quizAnswers))){
   const question=video.questions.find(q=>q.id===id);
   if(question&&Number.isInteger(value)&&Number(value)>=0&&Number(value)<question.options.length)answers[id]=Number(value);
 }
 const currentSec=typeof body.currentSec==="number"&&Number.isFinite(body.currentSec)?Math.max(0,Math.min(duration,Math.floor(body.currentSec))):previous?.currentSec||0;
 const completed=watchedSeconds(accepted)>=duration*0.9&&Object.keys(answers).length>0;
 const data={currentSec,completed,watchedIntervals:accepted as unknown as Prisma.InputJsonArray,quizAnswers:answers as Prisma.InputJsonObject};
 const progress=await prisma.videoProgress.upsert({where:{userId_videoSlug:{userId:session.id,videoSlug}},create:{userId:session.id,videoSlug,...data},update:data});
 return privateJson({currentSec,completed:progress.completed,watchedIntervals:accepted,quizAnswers:answers});
 }catch{return privateJson({error:"Không lưu được tiến độ."},400);}
}

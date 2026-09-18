import Module, { createRequire } from 'node:module';
import 'tsx/cjs';
import dotenv from 'dotenv';
import { spawnSync } from 'node:child_process';
dotenv.config({path:'.env.local',quiet:true});
const require=createRequire(import.meta.url);
const resolve=Module._resolveFilename;
// Match Next's server-only alias inside this isolated Node smoke-test process.
Module._resolveFilename=function(specifier,...args){return specifier==='server-only'?require.resolve('next/dist/compiled/server-only/empty.js'):resolve.call(this,specifier,...args);};
const {gradeWriting,gradeSpeaking}=require('../src/lib/openai-grading.ts');
let result;
if(process.argv.includes('--speaking')){
  const generated=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-i','public/audio/vstep/test-1/part-1.mp3','-t','12','-ac','1','-ar','24000','-f','wav','pipe:1'],{windowsHide:true});
  if(generated.status!==0)throw new Error('Cannot generate silent QA fixture');
  result=await gradeSpeaking('part1','Tell me about your hobbies.','data:audio/wav;base64,'+generated.stdout.toString('base64'));
}else{
  result=await gradeWriting('task1','Write an email to your friend cancelling a meeting, apologizing, explaining why, and suggesting another time.','Dear Tom, I am sorry but I cannot meet you next week because I have to travel for work. Could we meet at the cafe next Saturday at ten? I hope this works for you. Best wishes, Linh');
}
console.log(JSON.stringify({promptVersion:result.prompt_version,score:result.task_score,examiners:result.examiner_reports?.length,hasFeedback:Boolean(result.direct_feedback_vi)}));

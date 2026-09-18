import { spawn } from "node:child_process";
import prompts from "./grading-prompts.json";
import { object } from "./exam-submission";

export const PROMPT_VERSION = "modular-2026-09-11";
export const PROMPT_SOURCE = "VSTEP_AI_Grading_Prompt_Pack_Modular/prompts";
type Assessment = Record<string,unknown>;
export type PipelineState = Record<string,unknown>;
type Checkpoint = (state:PipelineState)=>Promise<void>;
const common = prompts["common-00-shared-context-security"];
const writingKeys = ["task_fulfillment","organization","vocabulary","grammar"];
const speakingKeys = ["task_fulfillment","fluency_coherence","vocabulary","grammar","pronunciation"];
const gradingScore = {
  type: "object",
  properties: {
    score: { type: ["number", "null"] },
    evidence: { type: "string" },
    why_not_higher: { type: "string" },
  },
  required: ["score", "evidence"],
  additionalProperties: true,
} as const;
const gradingTool = {
  type: "function",
  function: {
    name: "emit_grading_report",
    description: "Return the requested grading report as a JSON object.",
    parameters: {
      type: "object",
      properties: {
        scores: {
          type: "object",
          properties: {
            task_fulfillment: gradingScore,
            organization: gradingScore,
            vocabulary: gradingScore,
            grammar: gradingScore,
            fluency_coherence: gradingScore,
            pronunciation: gradingScore,
          },
          additionalProperties: true,
        },
        confidence: { type: "number" },
        criterion_adjudication: {
          type: "array",
          items: {
            type: "object",
            properties: {
              criterion: { type: "string" },
              final_score: { type: ["number", "null"] },
              reason_vi: { type: "string" },
            },
            required: ["criterion", "final_score"],
            additionalProperties: true,
          },
        },
      },
      additionalProperties: true,
    },
  },
} as const;
function apiKey() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("Chưa cấu hình dịch vụ chấm điểm. Bài làm vẫn được lưu.");
  return key;
}
async function completion(body:Record<string,unknown>, options:{audioJson?:boolean}={}) {
  // GPT-Audio accepts audio input but does not support Structured Outputs. Use a
  // forced function call for JSON-shaped grading reports instead of relying on
  // markdown-free prose from the model.
  const requestBody = options.audioJson
    ? {...body,tools:[gradingTool],tool_choice:{type:"function",function:{name:gradingTool.function.name}},store:false}
    : {...body,store:false};
  const response = await fetch("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{Authorization:`Bearer ${apiKey()}`,"Content-Type":"application/json"},signal:AbortSignal.timeout(120000),body:JSON.stringify(requestBody)});
  if (!response.ok) throw new Error(`Dịch vụ chấm điểm chưa sẵn sàng (${response.status}). Bài làm vẫn được lưu; hãy thử lại sau.`);
  const payload = await response.json();
  const message = payload.choices?.[0]?.message;
  if (message?.refusal) throw new Error("Mô hình từ chối đánh giá. Bài làm vẫn được lưu; hãy thử lại.");
  const toolArguments = message?.tool_calls?.find((call:unknown) => {
    const item = object(call);
    return object(item.function).name === gradingTool.function.name;
  }) ?? message?.function_call;
  const contentParts = Array.isArray(message?.content)
    ? message.content.map((part:unknown) => {
        if (typeof part === "string") return part;
        const item = object(part);
        return typeof item.text === "string" ? item.text : "";
      }).join("")
    : null;
  const functionPayload = object(toolArguments);
  const functionData = object(functionPayload.function);
  const functionText = typeof functionData.arguments === "string"
    ? functionData.arguments
    : typeof functionPayload.arguments === "string"
      ? functionPayload.arguments
      : undefined;
  const text = typeof functionText === "string"
    ? functionText
    : typeof message?.content === "string"
      ? message.content
      : contentParts || message?.audio?.transcript;
  if (typeof text !== "string") throw new Error("Chưa có kết quả chấm hợp lệ.");
  return text;
}

function fill(template:string,values:Record<string,string>) {
  // Replace only template tokens once: candidate text cannot introduce new substitutions.
  return template.replace(/\{\{([A-Z0-9_]+)\}\}/g,(_match,key:string)=>values[key] ?? "");
}
function parseReport(text:string) {
  const source = text.replace(/^\uFEFF/, "").trim();
  const fenced = source.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)?.[1]?.trim() ?? source;
  let value:unknown;
  try {
    value=JSON.parse(fenced);
  } catch {
    // Keep the fallback strict: scan only balanced JSON objects/arrays and let
    // JSON.parse validate the candidate. This tolerates a short model preamble
    // without accepting arbitrary prose as a grading report.
    value = undefined;
    for (let start=0; start<fenced.length && value===undefined; start++) {
      if (fenced[start] !== "{" && fenced[start] !== "[") continue;
      let depth=0;
      let quoted=false;
      let escaped=false;
      for (let index=start; index<fenced.length; index++) {
        const character=fenced[index];
        if (quoted) {
          if (escaped) escaped=false;
          else if (character === "\\") escaped=true;
          else if (character === '"') quoted=false;
          continue;
        }
        if (character === '"') { quoted=true; continue; }
        if (character === "{" || character === "[") depth++;
        else if (character === "}" || character === "]") {
          depth--;
          if (depth===0) {
            try { value=JSON.parse(fenced.slice(start,index+1)); } catch { /* try the next opening token */ }
            break;
          }
        }
      }
    }
    if (value===undefined) throw new Error("Chưa nhận được báo cáo chấm hợp lệ. Bài làm vẫn được lưu; hãy thử lại.");
  }
  if (!value || typeof value!=="object" || Array.isArray(value)) throw new Error("Kết quả chấm không đúng cấu trúc.");
  return value as Assessment;
}
function score(value:unknown): value is number {
  return typeof value==="number" && Number.isFinite(value) && value>=0 && value<=10;
}
function numberValue(value:unknown): number | null {
  const queue:Array<{value:unknown; depth:number}>=[{value,depth:0}];
  let visited=0;
  while (queue.length && visited<32) {
    const current=queue.shift()!;
    visited++;
    if (score(current.value)) return current.value;
    if (typeof current.value === "string" && current.value.trim()) {
      const parsed=Number(current.value.trim().replace(",", "."));
      if (score(parsed)) return parsed;
      continue;
    }
    if (current.depth>=3 || current.value===null || current.value===undefined) continue;
    const item=object(current.value);
    for (const key of ["score","value","final_score","estimated_score","rating"]) {
      if (key in item) queue.push({value:item[key],depth:current.depth+1});
    }
  }
  return null;
}
function textValue(value:unknown): string | null {
  // Model output is untrusted. Walk only a small, bounded frontier rather
  // than recursively traversing arbitrary nested evidence objects.
  const queue:Array<{value:unknown; depth:number}>=[{value,depth:0}];
  let visited=0;
  while (queue.length && visited<64) {
    const current=queue.shift()!;
    visited++;
    if (typeof current.value === "string") {
      const text=current.value.trim();
      if (text) return text;
      continue;
    }
    if (typeof current.value === "number" || typeof current.value === "boolean") return String(current.value);
    if (current.depth>=3 || current.value===null || current.value===undefined) continue;
    if (Array.isArray(current.value)) {
      for (const entry of current.value.slice(0,16)) queue.push({value:entry,depth:current.depth+1});
      continue;
    }
    const item=object(current.value);
    for (const key of ["text","evidence","evidence_vi","reason_vi","reason","explanation","why_not_higher","summary","details"]) {
      if (key in item) queue.push({value:item[key],depth:current.depth+1});
    }
  }
  return null;
}
function criterionKey(value:unknown) {
  if (typeof value !== "string") return "";
  const key=value.trim().replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return ({
    content: "task_fulfillment",
    task_achievement: "task_fulfillment",
    task_fulfillment_content: "task_fulfillment",
    task_fulfillment_relevance: "task_fulfillment",
    content_relevance: "task_fulfillment",
    fluency_and_coherence: "fluency_coherence",
    lexical_resource: "vocabulary",
    grammatical_range_accuracy: "grammar",
  } as Record<string,string>)[key] ?? key;
}
function normalizedCriteria(value:unknown):Record<string,Record<string,unknown>> {
  const output:Record<string,Record<string,unknown>>={};
  if (Array.isArray(value)) {
    for (const item of value) {
      const record=object(item);
      const key=criterionKey(record.criterion ?? record.name ?? record.key);
      if (key) output[key]=record;
    }
    return output;
  }
  const source=object(value);
  for (const [key,entry] of Object.entries(source)) output[criterionKey(key)]=object(entry);
  return output;
}
function unwrapReport(value:Assessment):Assessment {
  let current=value;
  for (let index=0; index<2; index++) {
    const nested=["report","result","assessment","output","data"]
      .map(key=>object(current[key]))
      .find(candidate=>Object.keys(candidate).length>0 && (candidate.scores || candidate.criterion_scores || candidate.criteria));
    if (!nested) break;
    current=nested;
  }
  return current;
}
function validateExaminer(report:Assessment,keys:string[],speaking:boolean) {
  const normalized=unwrapReport(report);
  const scores=normalizedCriteria(normalized.scores ?? normalized.criterion_scores ?? normalized.criteria);
  for (const key of keys) {
    const criterion=scores[criterionKey(key)] ?? {};
    const normalizedScore=numberValue(criterion.score ?? criterion.final_score ?? criterion.estimated_score ?? criterion.value);
    const normalizedEvidence=textValue(criterion.evidence ?? criterion.evidence_vi ?? criterion.reason_vi ?? criterion.reason ?? criterion.explanation ?? criterion.why_not_higher);
    if (speaking && normalizedScore===null && ["pronunciation","fluency_coherence"].includes(key)) {
      scores[criterionKey(key)]={...criterion,score:null,evidence:normalizedEvidence ?? ""};
      continue;
    }
    if (normalizedScore===null) throw new Error(`Tiêu chí ${key} có điểm không hợp lệ.`);
    if (!normalizedEvidence) throw new Error(`Tiêu chí ${key} thiếu dẫn chứng.`);
    scores[criterionKey(key)]={...criterion,score:normalizedScore,evidence:normalizedEvidence};
  }
  const confidence=numberValue(normalized.confidence);
  if (confidence===null || confidence>1) throw new Error("Độ tin cậy chưa hợp lệ.");
  return {...normalized,scores,confidence};
}
async function textReport(system:string,user:string) {
  return parseReport(await completion({model:process.env.OPENAI_GRADING_MODEL || "gpt-4o-mini",temperature:0,response_format:{type:"json_object"},messages:[{role:"system",content:system},{role:"user",content:user}]}));
}
// Pipe decoding through FFmpeg with no shell/URLs and no persistent temp files.
// A 6-minute upper bound prevents oversized or malformed recordings exhausting resources.
async function wavAudio(audioData:string) {
  const match = audioData.match(/^data:audio\/(webm|ogg|mp4|m4a|mpeg|wav|x-wav)(?:;codecs=[^;,]+)?;base64,([A-Za-z0-9+/]+=*)$/);
  if (!match || match[2].length > 20_000_000) throw new Error("Bản ghi âm không hợp lệ.");
  return new Promise<string>((resolve,reject)=>{
    const child = spawn(process.env.FFMPEG_PATH || "ffmpeg",["-hide_banner","-loglevel","error","-protocol_whitelist","pipe","-i","pipe:0","-t","360","-vn","-ac","1","-ar","24000","-f","wav","pipe:1"],{windowsHide:true});
    const chunks:Buffer[]=[]; let size=0;
    const timer=setTimeout(()=>{child.kill();reject(new Error("Không thể xử lý bản ghi âm trong thời gian cho phép."));},30000);
    child.on("error",()=>{clearTimeout(timer);reject(new Error("Máy chủ cần FFmpeg để xử lý bản ghi âm."));});
    child.stdout.on("data",(chunk:Buffer)=>{size+=chunk.length;if(size>20_000_000){child.kill();reject(new Error("Bản ghi âm quá dài."));}else chunks.push(chunk);});
    child.stderr.resume();
    child.stdin.on("error",()=>{});
    child.on("close",code=>{
      clearTimeout(timer);
      if(code!==0||size<1000){reject(new Error("Không đọc được bản ghi âm."));return;}
      const wav=Buffer.concat(chunks);
      // FFmpeg pipe output uses unknown RIFF lengths; finalize headers for API decoders.
      wav.writeUInt32LE(wav.length-8,4);
      let offset=12;
      while(offset+8<=wav.length){
        const id=wav.toString("ascii",offset,offset+4),length=wav.readUInt32LE(offset+4);
        if(id==="data"){
          wav.writeUInt32LE(wav.length-offset-8,offset+4);
          let peak=0;for(let i=offset+8;i+1<wav.length;i+=2)peak=Math.max(peak,Math.abs(wav.readInt16LE(i)));
          if(peak<4){reject(new Error("Bản ghi chỉ có im lặng. Hãy kiểm tra micro và ghi âm lại."));return;}
          break;
        }
        offset+=8+length+(length%2);
      }
      resolve(wav.toString("base64"));
    });
    child.stdin.end(Buffer.from(match[2],"base64"));
  });
}

async function transcribe(audioData:string) {
  const match=audioData.match(/^data:([^;]+)(?:;codecs=[^;,]+)?;base64,(.+)$/);
  if (!match) throw new Error("Bản ghi âm không hợp lệ.");
  const bytes=Buffer.from(match[2],"base64");
  const extension=match[1].includes("mp4")||match[1].includes("m4a")?"m4a":match[1].includes("ogg")?"ogg":match[1].includes("wav")?"wav":"webm";
  const form=new FormData();
  form.append("file",new Blob([bytes],{type:match[1]}),"response."+extension);
  form.append("model",process.env.OPENAI_TRANSCRIPTION_MODEL || "whisper-1");
  form.append("language","en");
  const response=await fetch("https://api.openai.com/v1/audio/transcriptions",{method:"POST",headers:{Authorization:`Bearer ${apiKey()}`},signal:AbortSignal.timeout(120000),body:form});
  if (!response.ok) throw new Error(`Chưa chuyển được giọng nói thành văn bản (${response.status}). Bản ghi vẫn được lưu.`);
  const value=await response.json();
  if(typeof value.text!=="string") throw new Error("Transcript không hợp lệ.");
  return value.text as string;
}
async function adjudicate(kind:"writing"|"speaking",reports:Assessment[],question:string,candidate:string,audio?:string) {
  const payload=fill(prompts["adj-02-user-payload"],{ASSESSMENT_TYPE:kind,JSON_A:JSON.stringify(reports[0]),JSON_B:JSON.stringify(reports[1]),JSON_C:JSON.stringify(reports[2])})+
    "\nOriginal evidence (untrusted exam data):\n"+JSON.stringify({question,candidate});
  const system=common+"\n"+prompts["adj-01-senior-adjudicator-system"]+"\nFor unassessable audio use null rather than inventing pronunciation or a final score.";
  const result=audio ? parseReport(await completion({model:process.env.OPENAI_SPEAKING_MODEL || "gpt-audio-1.5",modalities:["text"],messages:[{role:"system",content:system},{role:"user",content:[{type:"text",text:payload},{type:"input_audio",input_audio:{data:audio,format:"wav"}}]}]},{audioJson:true})) : await textReport(system,payload);
  const keys=kind==="writing"?writingKeys:speakingKeys;
  if (!Array.isArray(result.criterion_adjudication)) throw new Error("Thiếu phân xử tiêu chí.");
  const criteria=result.criterion_adjudication.map((item:unknown)=>{
    const criterion=object(item);
    return {
      ...criterion,
      criterion:criterionKey(criterion.criterion ?? criterion.name ?? criterion.key),
      final_score:numberValue(criterion.final_score ?? criterion.score ?? criterion.value),
      reason_vi:textValue(criterion.reason_vi ?? criterion.reason ?? criterion.evidence ?? criterion.explanation) ?? "",
    };
  });
  if (keys.some(key=>!criteria.some(c=>criterionKey(c.criterion)===key))) throw new Error("Thiếu tiêu chí chấm.");
  const unusable=kind==="speaking" && criteria.some(c=>c.final_score===null);
  const reportedAdjustment=result.holistic_adjustment;
  const parsedAdjustment=numberValue(reportedAdjustment);
  if (reportedAdjustment!==undefined && reportedAdjustment!==null && !(typeof reportedAdjustment==="string" && !reportedAdjustment.trim()) && parsedAdjustment===null) throw new Error("Điều chỉnh điểm không hợp lệ.");
  const adjustment=parsedAdjustment ?? 0;
  if (Math.abs(adjustment)>0.5) throw new Error("Điều chỉnh điểm vượt mức cho phép.");
  let computedRaw:number|null=null;
  let computedFinal:number|null=null;
  if (!unusable) {
    if (criteria.some(c=>!score(c.final_score))) throw new Error("Điểm tiêu chí phân xử không hợp lệ.");
    const mean=criteria.reduce((a,c)=>a+Number(c.final_score),0)/criteria.length;
    const raw=Math.max(0,Math.min(10,mean+adjustment));
    // Models may report raw_final_score with a different rounding convention.
    // Criteria are authoritative; normalize the total below instead of discarding
    // an otherwise valid examiner/adjudicator result.
    computedRaw=Math.round(raw*10)/10;
    computedFinal=Math.round(raw*2)/2;
  }
  const feedback=object(result.direct_feedback_vi);
  return {...result,criterion_adjudication:criteria,raw_final_score:computedRaw,final_estimated_score:computedFinal,holistic_adjustment:adjustment,task_score:computedFinal,overall_score:computedFinal,
    scores:Object.fromEntries(criteria.map(c=>[String(c.criterion),{score:c.final_score,evidence:c.reason_vi,why_not_higher:c.reason_vi}])),
    direct_feedback_vi:{...feedback,biggest_score_killers:feedback.three_main_score_limiters,highest_priority_fix:feedback.highest_priority_action,next_band_requirements:feedback.next_score_requirements},
    examiner_reports:reports,assessable:!unusable,prompt_version:PROMPT_VERSION,prompt_source:PROMPT_SOURCE};
}
export async function gradeWriting(taskType:"task1"|"task2",question:string,response:string,state:PipelineState={},checkpoint:Checkpoint=async()=>{}) {
  const reports:Assessment[]=[];
  for (const id of ["A","B","C"]) {
    const key="examiner_"+id;
    if (!state[key]) {
      const payload=fill(prompts["write-02-user-payload"],{EXAMINER_ID:id,TASK_TYPE:taskType,QUESTION:question,ANSWER:response});
      state[key]=validateExaminer(await textReport(common+"\n"+prompts["write-01-examiner-system"],payload),writingKeys,false);
      await checkpoint(state);
    }
    reports.push(object(state[key]));
  }
  if (!state.adjudicated) { state.adjudicated=await adjudicate("writing",reports,question,response); await checkpoint(state); }
  return {...object(state.adjudicated),task_type:taskType,word_count:response.trim().split(/\s+/).filter(Boolean).length};
}
async function speakingExaminer(system:string,payload:string,audio:string) {
  const request=(extra="")=>completion({model:process.env.OPENAI_SPEAKING_MODEL || "gpt-audio-1.5",modalities:["text"],messages:[{role:"system",content:system+extra},{role:"user",content:[{type:"text",text:payload+extra},{type:"input_audio",input_audio:{data:audio,format:"wav"}}]}]},{audioJson:true});
  try {
    return validateExaminer(parseReport(await request()),speakingKeys,true);
  } catch (error) {
    const message=error instanceof Error ? error.message : "";
    if (!/(Kết quả chấm|Tiêu chí|Độ tin cậy|Thiếu)/i.test(message)) throw error;
    const contract="\n\nMANDATORY OUTPUT CONTRACT: include scores.task_fulfillment, scores.fluency_coherence, scores.vocabulary, scores.grammar, and scores.pronunciation. Each score must be a JSON number from 0 to 10 (or null only for pronunciation/fluency when genuinely unassessable), and each assessed criterion must have a non-empty string evidence. Include confidence as a JSON number from 0 to 1. Do not use strings such as '4/10', prose outside the report, or alternative criterion names.";
    return validateExaminer(parseReport(await request(contract)),speakingKeys,true);
  }
}
export async function gradeSpeaking(part:string,question:string,audioData:string,state:PipelineState={},checkpoint:Checkpoint=async()=>{}) {
  const audio=await wavAudio(audioData);
  if(typeof state.transcript!=="string") {state.transcript=await transcribe(audioData);await checkpoint(state);}
  const reports:Assessment[]=[];
  for(const id of ["A","B","C"]) {
    const key="examiner_"+id;
    if(!state[key]) {
      const payload=fill(prompts["speak-02-user-payload"],{EXAMINER_ID:id,SPEAKING_PART:part,QUESTION:question,TRANSCRIPT:String(state.transcript)});
      const system=common+"\n"+prompts["speak-01-examiner-system"]+"\nUse null for pronunciation or fluency scores if audio prevents assessment; never substitute a made-up number.";
      state[key]=await speakingExaminer(system,payload,audio);
      await checkpoint(state);
    }
    reports.push(object(state[key]));
  }
  if(!state.adjudicated) {state.adjudicated=await adjudicate("speaking",reports,question,String(state.transcript),audio);await checkpoint(state);}
  return {...object(state.adjudicated),part,transcript:state.transcript,audio_assessed:true};
}
export async function aggregateSpeaking(parts:Assessment[]) {
  const result=await textReport(common+"\n"+prompts["agg-s-speaking-final-aggregator"],JSON.stringify(parts));
  const values=parts.map(p=>p.task_score);
  if(values.some(v=>!score(v))) return {...result,speaking_estimated_score:null};
  const reportedAdjustment=result.holistic_adjustment;
  const parsedAdjustment=numberValue(reportedAdjustment);
  if(reportedAdjustment!==undefined && reportedAdjustment!==null && !(typeof reportedAdjustment==="string" && !reportedAdjustment.trim()) && parsedAdjustment===null) throw new Error("Điều chỉnh Speaking không hợp lệ.");
  const adjustment=parsedAdjustment ?? 0;
  if(Math.abs(adjustment)>0.5) throw new Error("Điều chỉnh Speaking không hợp lệ.");
  const mean=(values as number[]).reduce((a,b)=>a+b,0)/3;
  return {...result,holistic_adjustment:adjustment,reference_mean:mean,speaking_estimated_score:Math.round(Math.max(0,Math.min(10,mean+adjustment))*2)/2};
}

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  db: { examAttempt: { findFirst: vi.fn(), updateMany: vi.fn(), update: vi.fn() }, examGradingJob: { updateMany: vi.fn() }, examGradingPart: { findMany: vi.fn(), upsert: vi.fn() }, examRecording: { findMany: vi.fn() }, $transaction: vi.fn() },
  writing: vi.fn(), speaking: vi.fn(), aggregate: vi.fn(), read: vi.fn(),
}));
vi.mock("@/lib/prisma",()=>({prisma:mocks.db}));
vi.mock("@/lib/openai-grading",()=>({gradeWriting:mocks.writing,gradeSpeaking:mocks.speaking,aggregateSpeaking:mocks.aggregate,PROMPT_VERSION:"test-v2"}));
vi.mock("@/lib/storage",()=>({readObject:mocks.read,dataUrlFromBuffer:()=>"data:audio/wav;base64,AA=="}));
import { gradeAttempt } from "../src/lib/grading-service";

const paper = { version:1,slug:"fixture",title:"Fixture",listening:{parts:[]},reading:{passages:[]},writing:[{id:"w1",prompt:"Letter"},{id:"w2",prompt:"Essay"}],speaking:{parts:[{id:"speaking-1",prompt:"Topic",questions:[]},{id:"speaking-2",prompt:"Topic",questions:[]},{id:"speaking-3",prompt:"Topic",questions:[]}]}};
function attempt() { return {id:"a",status:"SUBMITTED",catalog:"FULL",grading:null,answers:{writingAnswers:{w1:"one",w2:"two"}},recordings:Object.fromEntries(paper.speaking.parts.map(p=>[p.id,{audioData:"data:audio/wav;base64,AA=="}])),examPaper:{slug:"fixture",sections:paper,questions:{}},paperPart:null}; }
const options = {jobId:"job",leaseToken:"owner",pipelineVersion:"v2"};
beforeEach(()=>{
  vi.resetAllMocks();
  mocks.db.examAttempt.findFirst.mockResolvedValue(attempt());
  mocks.db.examAttempt.updateMany.mockResolvedValue({count:1});
  mocks.db.examGradingJob.updateMany.mockResolvedValue({count:1});
  mocks.db.examGradingPart.findMany.mockResolvedValue([]);
  mocks.db.examRecording.findMany.mockResolvedValue([]);
  mocks.db.$transaction.mockImplementation(async (fn: (db: typeof mocks.db)=>unknown)=>fn(mocks.db));
  mocks.writing.mockImplementation(async(type:string)=>({task_score:type==="task1"?5:8}));
  mocks.speaking.mockResolvedValue({task_score:6});
});
describe("grading orchestration",()=>{
  it("starts skills independently and calculates scores without an AI aggregate",async()=>{
    let release: (()=>void) | undefined;
    mocks.writing.mockImplementation(async()=>{await new Promise<void>(r=>{release=r;});return {task_score:6};});
    // Only hold the first writing task; Speaking must start before it resolves.
    mocks.writing.mockImplementationOnce(async()=>{await new Promise<void>(r=>{release=r;});return {task_score:5};}).mockImplementation(async()=>({task_score:8}));
    const pending=gradeAttempt("a",options);
    await vi.waitFor(()=>expect(mocks.speaking).toHaveBeenCalledTimes(3));
    release!();
    const result=await pending;
    expect(result).toMatchObject({writingScore:7,speakingScore:6,complete:true});
    expect(mocks.aggregate).not.toHaveBeenCalled();
  });
  it("does not write a checkpoint after ownership is lost",async()=>{
    mocks.db.examGradingJob.updateMany.mockResolvedValue({count:0});
    await expect(gradeAttempt("a",options)).rejects.toMatchObject({code:"LEASE_LOST"});
    expect(mocks.db.examAttempt.update).not.toHaveBeenCalled();
    expect(mocks.writing).not.toHaveBeenCalled();
  });
  it("preserves successful parts when another part fails",async()=>{
    mocks.writing.mockRejectedValueOnce(Object.assign(new Error("temporary"),{retryable:true}));
    await expect(gradeAttempt("a",options)).rejects.toMatchObject({retryable:true});
    const last=mocks.db.examAttempt.update.mock.calls.at(-1)?.[0].data.grading;
    expect(last.speaking).toHaveLength(3);
    expect(last.writing).toHaveLength(1);
    expect(last.complete).toBe(false);
  });
  it("finishes a missing submission as partial without invented scores",async()=>{
    mocks.db.examAttempt.findFirst.mockResolvedValue({...attempt(),recordings:{}});
    const result=await gradeAttempt("a",options);
    expect(result).toMatchObject({complete:false,speakingScore:null,writingScore:7});
    expect(mocks.speaking).not.toHaveBeenCalled();
  });
  it("reuses completed parts on retry with identical input",async()=>{
    await gradeAttempt("a",options);
    const rows=mocks.db.examGradingPart.upsert.mock.calls.map(([arg])=>arg.create);
    const finalRows=[...new Map(rows.map(row=>[row.partId,row])).values()];
    mocks.db.examGradingPart.findMany.mockResolvedValue(finalRows);
    mocks.writing.mockClear(); mocks.speaking.mockClear();
    await gradeAttempt("a",options);
    expect(mocks.writing).not.toHaveBeenCalled(); expect(mocks.speaking).not.toHaveBeenCalled();
  });
});

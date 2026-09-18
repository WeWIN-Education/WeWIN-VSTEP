"use client";

import { loadYoutubeApi, type YoutubePlayer } from "@/lib/youtube-player";
import { mergeIntervals, watchedSeconds, type Interval } from "@/lib/watched-intervals";
import type { LearningVideo, VideoQuestion } from "@/lib/video-config";
import {
  Check,
  Pause,
  Eye,
  EyeOff,
  Gauge,
  Headphones,
  Languages,
  Maximize2,
  Mic2,
  PencilLine,
  Play,
  Repeat2,
  RotateCcw,
  Volume2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

const players = new WeakMap<HTMLIFrameElement,YoutubePlayer>();
function sendYoutubeCommand(frame:HTMLIFrameElement|null,func:string,args:unknown[]=[]){
  const player=frame?players.get(frame):undefined;
  if(!player)return;
  if(func==="playVideo")player.playVideo();
  if(func==="pauseVideo")player.pauseVideo();
  if(func==="seekTo")player.seekTo(Number(args[0]),true);
  if(func==="setPlaybackRate")player.setPlaybackRate(Number(args[0]));
}
function formatTime(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

function parseDuration(value: string) {
  const parts = value.split(":").map(Number);
  if (parts.some((part) => !Number.isFinite(part))) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return parts[0] * 60 + (parts[1] ?? 0);
}

function normalizeAnswer(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[.,!?;:]/g, "")
    .replace(/\s+/g, " ");
}

function ToolbarButton({
  label,
  pressed,
  onClick,
  children,
}: {
  label: string;
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={pressed}
      className={`flex size-11 items-center justify-center rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
        pressed
          ? "border-brand bg-brand-soft text-brand"
          : "border-border bg-white text-ink-muted hover:border-brand/40 hover:text-brand"
      }`}
    >
      {children}
    </button>
  );
}

export function VideoLearningPlayer({ video }: { video: LearningVideo }) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const transcriptRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const activeRef = useRef(0);
  const loopRef = useRef(false);
  const autoStopRef = useRef(false);
  const lastLoopAtRef = useRef(-1);
  const [active, setActive] = useState(0);
  const [translation, setTranslation] = useState(true);
  const [recording, setRecording] = useState(false);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [recordingError, setRecordingError] = useState("");
  const [coverVideo, setCoverVideo] = useState(false);
  const [listenOnly, setListenOnly] = useState(false);
  const [typingMode, setTypingMode] = useState(false);
  const [typingValue, setTypingValue] = useState("");
  const [dictationChecked, setDictationChecked] = useState(false);
  const [dictationCorrect, setDictationCorrect] = useState(false);
  const [loopSentence, setLoopSentence] = useState(false);
  const [autoStop, setAutoStop] = useState(false);
  const [largeVideo, setLargeVideo] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [playbackSeconds, setPlaybackSeconds] = useState(0);
  const [playerDuration, setPlayerDuration] = useState(() => parseDuration(video.duration));
  const [isPlaying, setIsPlaying] = useState(false);
  const [quiz, setQuiz] = useState<VideoQuestion | null>(null);
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null);
  const [quizSeen, setQuizSeen] = useState<Set<string>>(new Set());
  const intervalsRef=useRef<Interval[]>([]);
  const answersRef=useRef<Record<string,number>>({});
  const playbackRef=useRef(0);
  const [watched,setWatched]=useState(0);
  const [progressError,setProgressError]=useState("");
  const [quizSubmitted,setQuizSubmitted]=useState(false);
  const [playerReady,setPlayerReady]=useState(false);
  const hasTimings=video.transcript.every(s=>s.startSeconds>=0);

  const current = video.transcript[active] ?? video.transcript[0];
  const duration = playerDuration || parseDuration(video.duration);
  const watchPercent = duration > 0 ? Math.min(100, Math.round((watched / duration) * 100)) : 0;
  const dictationIsCorrect = useMemo(
    () => normalizeAnswer(typingValue) === normalizeAnswer(current?.en ?? ""),
    [current?.en, typingValue],
  );

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    loopRef.current = loopSentence;
  }, [loopSentence]);

  useEffect(() => {
    autoStopRef.current = autoStop;
  }, [autoStop]);

  useEffect(()=>{
    let disposed=false;
    async function save(){
      try{
        const response=await fetch("/api/video/progress",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({videoSlug:video.slug,currentSec:playbackRef.current,watchedIntervals:intervalsRef.current,quizAnswers:answersRef.current}),keepalive:false});
        if(!response.ok)throw new Error("Chưa lưu được tiến độ xem.");
        if(!disposed)setProgressError("");
      }catch{if(!disposed)setProgressError("Chưa lưu được tiến độ xem. Hãy kiểm tra kết nối.");}
    }
    void fetch(`/api/video/progress?videoSlug=${encodeURIComponent(video.slug)}`).then(async response=>{
      if(!response.ok)throw new Error("Không tải được tiến độ");
      const data=await response.json();
      if(disposed)return;
      intervalsRef.current=mergeIntervals(data.watchedIntervals||[],parseDuration(video.duration));
      answersRef.current=data.quizAnswers||{};
      setWatched(watchedSeconds(intervalsRef.current));setQuizSeen(new Set(Object.keys(answersRef.current)));
      await save();
    }).catch(()=>{if(!disposed)setProgressError("Chưa tải được tiến độ đã lưu.");});
    const timer=window.setInterval(()=>void save(),10000);
    const hide=()=>{if(document.hidden)void save();};
    document.addEventListener("visibilitychange",hide);
    return ()=>{disposed=true;clearInterval(timer);document.removeEventListener("visibilitychange",hide);void save();};
  },[video.slug,video.duration]);
  useEffect(()=>{
    if(quiz || !isPlaying)return;
    const due=video.questions.filter(question=>playbackSeconds>=question.atSeconds&&!quizSeen.has(question.id));
    const pending=due.length ? due[Math.floor(Math.random()*due.length)] : undefined;
    if(pending){setQuiz(pending);setQuizAnswer(null);setQuizSubmitted(false);sendYoutubeCommand(frameRef.current,"pauseVideo");}
  },[playbackSeconds,isPlaying,quiz,quizSeen,video.questions]);

  useEffect(() => {
    transcriptRefs.current[active]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [active]);

  useEffect(() => {
    return () => {
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    return () => {
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    };
  }, [recordedUrl]);

  useEffect(()=>{
    let disposed=false;
    let timer:ReturnType<typeof setInterval>|undefined;
    let player:YoutubePlayer|undefined;
    let last:{time:number;wall:number}|null=null;
    const frame=frameRef.current;
    if(!frame)return;
    void loadYoutubeApi().then(api=>{
      if(disposed)return;
      player=new api.Player(frame,{events:{onError:()=>setProgressError("Không phát được video YouTube."),onReady:()=>{
        if(disposed)return;
        setPlayerReady(true);
        timer=setInterval(()=>{
          if(!player)return;
          const time=player.getCurrentTime();const total=player.getDuration();const playing=player.getPlayerState()===1;
          const now=performance.now();setIsPlaying(playing);setPlaybackSeconds(time);playbackRef.current=time;
          if(total>0)setPlayerDuration(total);
          if(playing&&!document.hidden){
            if(last){const delta=time-last.time;const wall=(now-last.wall)/1000;const rate=player.getPlaybackRate()||1;
              if(delta>0&&wall<2&&delta<=wall*rate+0.35){
                intervalsRef.current=mergeIntervals([...intervalsRef.current,[last.time,time]],total||parseDuration(video.duration));
                setWatched(watchedSeconds(intervalsRef.current));
              }
            }last={time,wall:now};
          }else last=null;
          const segment=video.transcript[activeRef.current];
          if(segment?.startSeconds>=0 && segment.endSeconds!==undefined && time>=segment.endSeconds){
            if(loopRef.current){player.seekTo(segment.startSeconds,true);last=null;return;}
            if(autoStopRef.current && time<segment.endSeconds+1){player.pauseVideo();last=null;}
          }
          const next=video.transcript.findIndex(s=>s.startSeconds>=0&&time>=s.startSeconds&&time<(s.endSeconds??Infinity));
          if(next>=0&&next!==activeRef.current){activeRef.current=next;setActive(next);setTypingValue("");setDictationChecked(false);}
        },500);
      }}});
      players.set(frame,player);
    }).catch(error=>{if(!disposed)setProgressError(error.message);});
    return ()=>{disposed=true;if(timer)clearInterval(timer);players.delete(frame);player?.destroy();};
  },[video.slug,video.duration,video.transcript]);

  function seekTo(seconds: number, play = true) {
    if(seconds<0){setProgressError("Câu này chưa có mốc thời gian để phát lại trong video.");return;}
    const boundedSeconds = Math.max(0, seconds);
    setPlaybackSeconds(boundedSeconds);
    sendYoutubeCommand(frameRef.current, "seekTo", [boundedSeconds, true]);
    if (play) sendYoutubeCommand(frameRef.current, "playVideo");
  }

  function selectSegment(index: number) {
    activeRef.current = index;
    lastLoopAtRef.current = -1;
    setActive(index);
    setTypingValue("");
    setDictationChecked(false);
    setDictationCorrect(false);
    if(video.transcript[index].startSeconds>=0)seekTo(video.transcript[index].startSeconds);
  }

  function cycleSpeed() {
    const next = speed >= 1.5 ? 0.75 : speed + 0.25;
    setSpeed(next);
    sendYoutubeCommand(frameRef.current, "setPlaybackRate", [next]);
  }

  function checkDictation() {
    setDictationCorrect(dictationIsCorrect);
    setDictationChecked(true);
  }

  function handleProgressChange(value: string) {
    const next = Number(value);
    if (!Number.isFinite(next)) return;
    setPlaybackSeconds(next);
    sendYoutubeCommand(frameRef.current, "seekTo", [next, true]);
  }

  async function toggleRecording() {
    if (recording) {
      recorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      setRecording(false);
      return;
    }

    setRecordingError("");
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setRecordingError("Trình duyệt này chưa hỗ trợ ghi âm.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredTypes = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
      const mimeType = preferredTypes.find((type) => MediaRecorder.isTypeSupported(type));
      const chunks: Blob[] = [];
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      streamRef.current = stream;
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        setRecordedUrl((previous) => {
          if (previous) URL.revokeObjectURL(previous);
          return URL.createObjectURL(blob);
        });
      };
      recorder.start();
      setRecording(true);
    } catch {
      setRecordingError("Không thể truy cập microphone. Hãy cho phép microphone rồi thử lại.");
    }
  }

  return (
    <div className="overflow-hidden rounded-[24px] border border-border bg-white shadow-sm">
      <div
        className={`grid ${listenOnly ? "lg:grid-cols-1" : largeVideo ? "lg:grid-cols-[minmax(0,1.55fr)_minmax(300px,.62fr)]" : "lg:grid-cols-[minmax(0,1.25fr)_minmax(340px,.75fr)]"}`}
      >
        <div className="min-w-0">
          <div className="bg-[#101828] p-3 md:p-5">
            <div className="relative aspect-video overflow-hidden rounded-2xl bg-black">
              <iframe
                ref={frameRef}
                id={`youtube-player-${video.slug}`}
                className={`h-full w-full transition-opacity ${coverVideo ? "opacity-0" : "opacity-100"}`}
                src={`https://www.youtube.com/embed/${video.youtubeId}?rel=0&playsinline=1&enablejsapi=1`}
                title={video.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
              {coverVideo && (
                <button
                  type="button"
                  onClick={() => setCoverVideo(false)}
                  className="absolute inset-0 flex items-center justify-center bg-[#111827] text-sm font-bold text-white"
                >
                  Hiện lại video
                </button>
              )}
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-white/75">
              <span>YouTube · {video.duration}</span>
              <div className="flex items-center gap-3">
                <button type="button" onClick={cycleSpeed} className="inline-flex min-h-10 items-center gap-1 hover:text-white">
                  <Gauge className="size-3.5" aria-hidden="true" /> {speed}x
                </button>
                <a
                  className="inline-flex min-h-10 items-center hover:text-white"
                  href={`https://www.youtube.com/watch?v=${video.youtubeId}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Mở YouTube ↗
                </a>
              </div>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-[10px] font-mono text-white/60">{formatTime(playbackSeconds)}</span>
              <input
                aria-label="Tiến độ video"
                type="range"
                min="0"
                max={duration || 1}
                step="1"
                value={Math.min(playbackSeconds, duration || 1)}
                onChange={(event) => handleProgressChange(event.target.value)}
                className="h-1.5 min-w-0 flex-1 accent-[#F8D99D]"
              />
              <span className="text-[10px] font-mono text-white/60">{formatTime(duration)}</span>
              <span className="min-w-8 text-right text-[10px] font-extrabold text-[#F8D99D]">{watchPercent}%</span>
            </div>
          </div>

          <div className="border-b border-border px-4 py-3 md:px-5">
            <div className="flex flex-wrap items-center gap-2">
              <ToolbarButton label={translation ? "Ẩn bản dịch" : "Hiện bản dịch"} pressed={translation} onClick={() => setTranslation((value) => !value)}>
                <Languages className="size-4" aria-hidden="true" />
              </ToolbarButton>
              <ToolbarButton label={coverVideo ? "Hiện video" : "Che video"} pressed={coverVideo} onClick={() => setCoverVideo((value) => !value)}>
                {coverVideo ? <Eye className="size-4" aria-hidden="true" /> : <EyeOff className="size-4" aria-hidden="true" />}
              </ToolbarButton>
              <ToolbarButton label={loopSentence ? "Tắt lặp câu" : "Lặp câu hiện tại"} pressed={loopSentence} onClick={() => setLoopSentence((value) => !value)}>
                <Repeat2 className="size-4" aria-hidden="true" />
              </ToolbarButton>
              <ToolbarButton label="Tự động dừng cuối câu" pressed={autoStop} onClick={()=>{if(hasTimings)setAutoStop(v=>!v);else setProgressError("Cần phụ đề có mốc thời gian để tự động dừng cuối câu.");}}>
                <Pause className="size-4" aria-hidden="true" />
              </ToolbarButton>
              <ToolbarButton label={listenOnly ? "Hiện bản chép" : "Chỉ nghe"} pressed={listenOnly} onClick={() => setListenOnly((value) => !value)}>
                <Headphones className="size-4" aria-hidden="true" />
              </ToolbarButton>
              <ToolbarButton label={typingMode ? "Tắt luyện dictation" : "Luyện dictation"} pressed={typingMode} onClick={() => setTypingMode((value) => !value)}>
                <PencilLine className="size-4" aria-hidden="true" />
              </ToolbarButton>
              <ToolbarButton label={largeVideo ? "Thu nhỏ video" : "Mở rộng video"} pressed={largeVideo} onClick={() => setLargeVideo((value) => !value)}>
                <Maximize2 className="size-4" aria-hidden="true" />
              </ToolbarButton>
            </div>
            {!hasTimings?<p className="mt-3 text-xs text-ink-muted">Đã có toàn bộ {video.transcript.length} câu Anh–IPA–Việt. Đang chờ phụ đề có mốc thời gian để đồng bộ từng câu.</p>:null}
            {!playerReady?<p className="mt-2 text-xs text-ink-muted">Đang kết nối trình phát…</p>:null}
            {progressError?<p role="status" className="mt-2 text-xs text-amber-800">{progressError}</p>:null}
          </div>

          <div className="p-4 md:p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-brand">{typingMode ? "Luyện nghe và điền" : "Luyện nói theo câu"}</p>
              <button type="button" onClick={() => seekTo(current.startSeconds)} className="flex min-h-10 items-center gap-1 text-xs font-bold text-ink-muted hover:text-brand">
                <RotateCcw className="size-4" aria-hidden="true" /> Nghe mẫu
              </button>
            </div>
            <div className="rounded-2xl bg-surface p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-bold text-brand">{current.start || "Chưa có mốc"}</p>
                <span className="rounded-full bg-white px-2 py-1 text-[10px] font-extrabold text-ink-muted">Câu {active + 1}</span>
              </div>
              {typingMode ? (
                <div className="mt-3">
                  <p className="text-sm font-bold text-ink-muted">Nghe câu rồi nhập lại bằng tiếng Anh:</p>
                  <input
                    value={typingValue}
                    onChange={(event) => {
                      setTypingValue(event.target.value);
                      setDictationChecked(false);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") checkDictation();
                    }}
                    placeholder="Type what you hear…"
                    autoComplete="off"
                    className="mt-3 h-12 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
                  />
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <button type="button" onClick={checkDictation} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-brand px-4 text-xs font-extrabold text-white">
                      <Check className="size-3.5" aria-hidden="true" /> Kiểm tra
                    </button>
                    {dictationChecked && <p className={`text-xs font-bold ${dictationCorrect ? "text-[#1F7A4D]" : "text-[#B42318]"}`}>{dictationCorrect ? "Chính xác" : "Hãy nghe lại và thử lần nữa"}</p>}
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-lg font-extrabold leading-snug text-ink">{current.en}</p>
              )}
              {current.ipa && <p className="mt-2 text-sm italic leading-relaxed text-brand/80">{current.ipa}</p>}
              {translation && <p className="mt-1 text-sm italic leading-relaxed text-ink-muted">{current.vi}</p>}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={toggleRecording} className={`flex min-h-11 min-w-[11rem] flex-1 items-center justify-center gap-2 rounded-[var(--radius-btn)] px-4 text-sm font-extrabold text-white ${recording ? "bg-[#B42318]" : "bg-brand"}`}>
                <Mic2 className="size-4" aria-hidden="true" />
                {recording ? "Dừng ghi âm" : "Ghi âm"}
              </button>
              {recordedUrl ? (
                <audio controls src={recordedUrl} className="h-11 min-w-[11rem] flex-1" aria-label="Bản ghi âm của bạn" />
              ) : (
                <button type="button" onClick={() => seekTo(current.startSeconds)} className="flex min-h-11 min-w-[11rem] flex-1 items-center justify-center gap-2 rounded-[var(--radius-btn)] border border-border px-4 text-sm font-extrabold text-ink-muted">
                  <Play className="size-4" aria-hidden="true" /> Phát lại mẫu
                </button>
              )}
            </div>
            {recordingError && <p role="alert" className="mt-3 rounded-xl bg-[#FFF0EF] px-3 py-2 text-center text-xs font-bold text-[#B42318]">{recordingError}</p>}
            {recording && <p className="mt-3 rounded-xl bg-[#FFF0EF] px-3 py-2 text-center text-xs font-bold text-[#B42318]">● Đang ghi âm bản demo…</p>}
          </div>
        </div>

        {!listenOnly && (
          <aside className="min-h-[540px] border-t border-border lg:border-l lg:border-t-0">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-sm font-extrabold text-ink">BẢN CHÉP</h2>
              <div className="flex items-center gap-2">
                <button type="button" className="min-h-10 rounded-full border border-brand/30 px-3 py-1 text-[11px] font-bold text-brand" aria-pressed="true">Transcript</button>
                <button type="button" onClick={() => setTranslation((value) => !value)} className={`min-h-10 rounded-full border px-3 py-1 text-[11px] font-bold ${translation ? "border-brand/30 text-brand" : "border-border text-ink-muted"}`} aria-pressed={translation}>Trans</button>
                <span className="px-1 text-xs font-bold text-ink-muted">{watchPercent}%</span>
              </div>
            </div>
            <div className="max-h-[720px] space-y-3 overflow-y-auto p-3" aria-label="Bản chép theo thời gian">
              {video.transcript.map((segment, index) => (
                <button
                  key={segment.id}
                  ref={(element) => {
                    transcriptRefs.current[index] = element;
                  }}
                  type="button"
                  onClick={() => selectSegment(index)}
                  className={`w-full rounded-2xl p-4 text-left transition ${index === active ? "bg-brand-soft ring-1 ring-brand/20" : "bg-surface hover:bg-brand-soft/60"}`}
                  aria-current={index === active ? "true" : undefined}
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-white px-2 py-1 text-[11px] font-extrabold text-ink-muted">#{index + 1}</span>
                    <span className="text-[11px] font-mono text-brand">{segment.start || "—"}</span>
                  </div>
                  <p className="mt-3 text-base font-extrabold leading-snug text-ink">{segment.en}</p>
                  {segment.ipa && <p className="mt-1 text-xs italic leading-relaxed text-brand/80">{segment.ipa}</p>}
                  {translation && <p className="mt-1 text-sm italic leading-relaxed text-ink-muted">{segment.vi}</p>}
                </button>
              ))}
            </div>
          </aside>
        )}
      </div>
      <div className="flex items-center gap-2 border-t border-border bg-surface px-4 py-3 md:px-5">
        <Volume2 className="size-4 text-brand" aria-hidden="true" />
        <span className="text-xs text-ink-muted">Chọn một câu trong bản chép để tua video và luyện lại.</span>
        <span className="ml-auto hidden text-xs text-ink-muted sm:inline">Nguồn: Classroom English · WeWin</span>
      </div>
      {quiz && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/45 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Câu hỏi kiểm tra video"><div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"><p className="text-xs font-bold text-brand">Kiểm tra nội dung đã xem</p><h2 className="mt-2 text-lg font-semibold">{quiz.prompt}</h2><div className="mt-4 space-y-2">{quiz.options.map((option,index)=><button key={option} type="button" disabled={quizSubmitted} onClick={()=>setQuizAnswer(index)} className={`w-full rounded-xl border px-3 py-3 text-left text-sm ${quizAnswer===index?"border-brand bg-brand-soft text-brand":"border-border"}`}>{String.fromCharCode(65+index)}. {option}</button>)}</div>{quizSubmitted?<p role="status" className="mt-4 text-sm">{quizAnswer===quiz.correctIndex?"Chính xác.":`Đáp án đúng: ${quiz.options[quiz.correctIndex]}`}</p>:null}<div className="mt-5 flex justify-end"><button type="button" disabled={quizAnswer===null} onClick={()=>{if(!quizSubmitted){const next={...answersRef.current,[quiz.id]:quizAnswer!};answersRef.current=next;setQuizSeen(new Set(Object.keys(next)));setQuizSubmitted(true);void fetch("/api/video/progress",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({videoSlug:video.slug,currentSec:playbackRef.current,watchedIntervals:intervalsRef.current,quizAnswers:next})});}else{setQuiz(null);sendYoutubeCommand(frameRef.current,"playVideo");}}} className="min-h-11 rounded-full bg-brand px-5 font-semibold text-white disabled:opacity-40">{quizSubmitted?"Tiếp tục xem":"Trả lời"}</button></div></div></div>}
    </div>
  );
}

"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Clock3, Gamepad2, Shield, Swords, Trophy, X } from "lucide-react";
import type { BattleCommand, BattleView } from "@/lib/battle-engine";
import { RANKS, TYPE_LABELS, battleRank, type BattleType } from "@/lib/battle-rules";
import { BattleCharacter } from "./BattleCharacter";
import { BattleLoading } from "./BattleLoading";
import type { CharacterState } from "./character-states";
import styles from "./battle-game.module.css";

type State = BattleView | { kind: "queue"; queuedAt: number; serverNow: number } | { kind: "idle"; xp: number; serverNow: number };
type HistoryData = { xp: number; total: number; items: Array<{ slot: number; match: { id: string; status: string; winnerSlot: number | null; finishedAt: string } }> };
function useBattle(matchId?: string, enabled = true) {
  const [state, setState] = useState<State | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const heartbeatAt = useRef(0), offset = useRef(0), requestAbort = useRef<AbortController | null>(null);
  const queuedAction = useRef(false);
  const [now, setNow] = useState(0);
  const send = useCallback(async (command: BattleCommand) => {
    if (command.action === "state" && (requestAbort.current || queuedAction.current)) return false;
    if (command.action !== "state") {
      if (queuedAction.current) return false;
      queuedAction.current = true;
      setBusy(true);
      requestAbort.current?.abort();
    }
    const controller = new AbortController();
    requestAbort.current = controller;
    const timeout = setTimeout(() => controller.abort(), 12_000);
    try {
      const heartbeat = Date.now() - heartbeatAt.current >= 5000;
      const response = await fetch("/api/battle", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...command, matchId, heartbeat }), cache: "no-store", signal: controller.signal });
      const result = await response.json();
      if (requestAbort.current !== controller) return false;
      if (!response.ok) throw new Error(result.error || "Chưa cập nhật được trận đấu.");
      offset.current = result.serverNow - Date.now();
      if (heartbeat) heartbeatAt.current = Date.now();
      setState(result); setNow(result.serverNow); setError("");
      return true;
    } catch (e) {
      if (requestAbort.current !== controller) return false;
      setError(controller.signal.aborted ? "Kết nối đang chậm. Đang kiểm tra lại trạng thái trận đấu…" : e instanceof Error ? e.message : "Mất kết nối. Đang thử lại…");
      return false;
    } finally {
      clearTimeout(timeout);
      if (requestAbort.current === controller) requestAbort.current = null;
      if (command.action !== "state") { queuedAction.current = false; setBusy(false); }
    }
  }, [matchId]);
  useEffect(() => () => { const pending = requestAbort.current; requestAbort.current = null; pending?.abort(); }, []);
  const active = !state || state.kind === "queue" || (state.kind === "match" && state.status === "ACTIVE");
  useEffect(() => {
    if (!enabled) return;
    void send({ action: "state" });
  }, [enabled, send]);
  useEffect(() => {
    if (!enabled || !active) return;
    const id = setInterval(() => { void send({ action: "state" }); }, state?.kind === "queue" ? 1500 : 1000);
    return () => clearInterval(id);
  }, [enabled, active, state?.kind, send]);
  useEffect(() => {
    if (!enabled || state?.kind !== "match" || state.status !== "ACTIVE") return;
    const target = state.current?.answered ? state.current.nextAt : !state.current ? state.startsAt : null;
    if (target === null) return;
    const timer = setTimeout(() => { void send({ action: "state" }); }, Math.max(50, target - state.serverNow));
    return () => clearTimeout(timer);
  }, [enabled, state, send]);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now() + offset.current), 250);
    return () => clearInterval(id);
  }, []);
  return { state, error, busy, send, now };
}

export function BattleLobby({ authenticated, enabled }: { authenticated: boolean; enabled: boolean }) {
  const router = useRouter();
  const { state, error, busy, send, now } = useBattle(undefined, authenticated);
  const [history, setHistory] = useState<HistoryData | null>(null);
  const [historyError, setHistoryError] = useState("");
  const [page, setPage] = useState(1);
  useEffect(() => { if (state?.kind === "match") router.replace(`/battle/${state.id}`); }, [state, router]);
  useEffect(() => {
    if (!authenticated) return;
    const controller = new AbortController();
    setHistoryError("");
    fetch(`/api/battle?page=${page}`, { signal: controller.signal, cache: "no-store" }).then(async r => {
      if (!r.ok) throw new Error(); return r.json();
    }).then(setHistory).catch(() => { if (!controller.signal.aborted) setHistoryError("Chưa tải được lịch sử. Vui lòng tải lại trang."); });
    return () => controller.abort();
  }, [authenticated, page]);
  const xp = state?.kind === "idle" ? state.xp : history?.xp ?? 0;
  const rank = Math.max(0, battleRank(xp)), next = RANKS[rank + 1];
  const queued = state?.kind === "queue";
  if (state?.kind === "match") return <BattleLoading />;
  return <div className={styles.lobby}>
    <section className={styles.hero}>
      <div className={styles.heroCopy}><span className={styles.eyebrow}><Gamepad2 size={18} aria-hidden /> WEWIN ARENA · B1</span><h1>Học một chút.<br /><em>Đấu một trận!</em></h1><p>Quick Battle 1vs1. Thử phản xạ tiếng Anh qua từ vựng, ngữ pháp và cụm từ.</p>
        <div className={styles.tags}><span>15 câu</span><span>Tối đa 15 giây / câu</span><span>Đấu nhanh 1vs1</span></div>
        {!authenticated ? <Link className={styles.primary} href="/login?callbackUrl=/game">Đăng nhập để chơi <Swords size={20} aria-hidden /></Link>
          : queued ? <div className={styles.queue} role="status"><strong>Đang tìm đối thủ · {Math.max(0, Math.floor((now - state.queuedAt) / 1000))}s</strong><button disabled={busy} onClick={() => void send({ action: "cancel" })}>Hủy tìm trận</button></div>
          : <button className={styles.primary} disabled={!enabled || busy || !state} onClick={() => void send({ action: "join" })}>{busy ? "Đang tìm…" : enabled ? "Tìm trận ngay" : "Đang chuẩn bị mở đấu"}<Swords size={20} aria-hidden /></button>}
        {error && <p role="alert" className={styles.error}>{error}</p>}
      </div>
      <div className={styles.heroArt}><div aria-hidden><BattleCharacter state={queued ? "ready" : "idle"} /></div></div>
    </section>
    <div className={styles.lobbyGrid}>
      <section className={styles.panel}><span className={styles.eyebrow}><Trophy size={18} aria-hidden /> HÀNH TRÌNH CỦA BẠN</span><div className={styles.rankHeading}><RankBadge rank={rank} size={96} /><div><h2>{authenticated ? `Hạng ${RANKS[rank].name}` : "Tích XP, mở hào quang"}</h2><p>{authenticated ? `${xp.toLocaleString("vi-VN")} XP` : "Rank dùng chung XP trên toàn website."}</p></div></div>
        <progress aria-label="Tiến độ lên hạng" max={next ? next.min - RANKS[rank].min : 1} value={next ? xp - RANKS[rank].min : 1} />
        <p>{next ? `Mốc ${next.min.toLocaleString("vi-VN")} XP: ${next.name}` : "Bạn đã đạt hạng Cao Thủ."}</p><div className={styles.ranks}>{RANKS.map((r, i) => <span key={r.name} data-earned={authenticated && i <= rank}><RankBadge rank={i} size={80} />{r.name}</span>)}</div>
      </section>
      <section className={styles.panel}><span className={styles.eyebrow}><Swords size={18} aria-hidden /> LUẬT ĐẤU</span><h2>Phản xạ nhanh. Hiểu thật chắc.</h2><ul className={styles.rules}>
        <li>Luân phiên 15 câu: 5 từ vựng, 5 ngữ pháp, 5 cụm từ. Người đi trước ngẫu nhiên.</li>
        <li>Đúng: 100–150 điểm theo tốc độ; sai hoặc hết 15 giây: 0 điểm. Chọn đáp án là biết kết quả, sau 1 giây chuyển sang câu tiếp theo.</li>
        <li>Thắng +60 XP, hòa +25, thua +10. Tối đa 5 trận có thưởng/ngày theo giờ Việt Nam.</li>
        <li>Mất kết nối quá 30 giây hoặc bỏ cuộc: thua, không nhận XP. Thắng do đối thủ bỏ cuộc chỉ có thưởng khi bạn đã trả lời ít nhất 3 câu.</li>
        <li>Rank và hiệu ứng không tăng sức mạnh.</li>
      </ul></section>
    </div>
    {authenticated && <section className={styles.panel}><h2>Lịch sử trận đấu</h2>{historyError && <p role="alert">{historyError}</p>}{!history && !historyError && <p>Đang tải lịch sử…</p>}{history?.items.length === 0 && <p>Trận đầu tiên đang chờ bạn.</p>}
      <div className={styles.history}>{history?.items.map(item => <div key={item.match.id}><span>{new Date(item.match.finishedAt).toLocaleString("vi-VN")}</span><strong>{outcome(item.match.status, item.match.winnerSlot, item.slot)}</strong></div>)}</div>
      <div className={styles.pagination}><button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Trước</button><span>Trang {page} / {Math.max(1, Math.ceil((history?.total ?? 0) / 10))}</span><button disabled={!history || page * 10 >= history.total} onClick={() => setPage(p => p + 1)}>Sau</button></div>
    </section>}
  </div>;
}

function outcome(status: string, winner: number | null, me: number) { return status === "CANCELLED" ? "Trận đã hủy" : winner === null ? "Hòa" : winner === me ? "Chiến thắng" : "Chưa thắng"; }

function RankBadge({ rank, size }: { rank: number; size: number }) {
  const badge = RANKS[rank] ?? RANKS[0];
  return <Image className={styles.rankBadge} src={badge.badge} alt={`Huy hiệu ${badge.name}`} width={size} height={size} sizes={`${size}px`} />;
}

export function BattleArena({ matchId }: { matchId: string }) {
  const { state, now, send, busy, error } = useBattle(matchId);
  const [selected, setSelected] = useState<number | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const confirmLeave = useRef<HTMLDialogElement>(null);
  const match = state?.kind === "match" ? state : null;
  const turn = match?.current;
  useEffect(() => { setSelected(null); }, [turn?.number]);
  useEffect(() => {
    if (!turn?.answered || !turn.points) { setCelebrating(false); return; }
    setCelebrating(true);
    const timer = setTimeout(() => setCelebrating(false), 600);
    return () => clearTimeout(timer);
  }, [turn?.number, turn?.answered, turn?.points]);
  if (!match) return <BattleLoading error={error} />;
  const me = match.players[match.mySlot], opponent = match.players[1 - match.mySlot];
  const finished = match.status !== "ACTIVE";
  const countdown = Math.max(0, Math.ceil((match.startsAt - now) / 1000));
  const seconds = turn ? Math.max(0, Math.ceil((turn.deadline - now) / 1000)) : 15;
  const mine = turn?.slot === match.mySlot;
  const correct = turn?.points !== undefined && turn.points > 0;
  const characterState = (slot: number): CharacterState => {
    if (finished) return match.status === "CANCELLED" || match.winnerSlot === null ? "draw" : match.winnerSlot === slot ? "victory" : "defeat";
    if (!turn || countdown) return "ready";
    if (turn.answered) return turn.slot === slot ? correct ? celebrating ? "correct" : "attack" : "wrong" : correct ? celebrating ? "defense" : "hit" : "defense";
    return turn.slot === slot ? busy && mine ? "answering" : "thinking" : "idle";
  };
  return <main className={styles.arenaPage}>
    <header className={styles.arenaHeader}><Link href="/game" onClick={e => { if (!finished) { e.preventDefault(); confirmLeave.current?.showModal(); } }}><ArrowLeft size={20} aria-hidden /> Về sảnh</Link><span>WEWIN ARENA <b>QUICK BATTLE · B1</b></span></header>
    {error && <p role="alert" className={styles.connectionError}>{error} Đồng hồ vẫn chạy. Đang thử kết nối lại.</p>}
    <div className={styles.fightLayout}>
      <section className={styles.stage} aria-label="Sân đấu">
        <div className={styles.scoreboard}>{[me, opponent].map(p => <div key={p.slot}><RankBadge rank={p.rank} size={64} /><span>{p.name}</span><small>{p.slot === match.mySlot ? "Bạn" : "Đối thủ"} · {RANKS[p.rank]?.name}</small>{!finished && <strong>{p.score.toLocaleString("vi-VN")}</strong>}</div>)}</div>
        <div className={styles.fighters}>{[me, opponent].map((p, i) => <div key={p.slot} className={styles.fighter} data-rank={p.rank}><BattleCharacter variant={i === 0 ? "hero" : "rival"} facing={i === 0 ? "right" : "left"} state={characterState(p.slot)} rank={p.rank} replay={turn?.number ?? 0} /><span className={styles.rankAura} aria-hidden /></div>)}<b className={styles.versus} aria-hidden>VS</b></div>
        <div className={styles.stageStatus} role="status">{finished ? outcome(match.status, match.winnerSlot, match.mySlot) : countdown ? `Sẵn sàng! ${countdown}` : turn?.answered ? correct ? "Chính xác! Một đòn tấn công đẹp." : "Chưa chính xác. Tiếp tục cố gắng!" : mine ? "Đến lượt bạn!" : `${opponent.name} đang trả lời…`}</div>
        <div className={styles.turns} aria-label={`Tiến độ: câu ${(turn?.number ?? -1) + 1} trên ${match.total}`}>{Array.from({ length: match.total }, (_, i) => <span key={i} data-done={finished || i < (turn?.number ?? 0)} data-current={!finished && i === turn?.number}>{i + 1}</span>)}</div>
      </section>
      <section className={styles.questionPanel}>
        {finished && match.updatedXp !== null && <div className={styles.rankHeading}><RankBadge rank={Math.max(0, battleRank(match.updatedXp))} size={80} /><p>Hạng hiện tại: <strong>{RANKS[Math.max(0, battleRank(match.updatedXp))].name}</strong> · {match.updatedXp.toLocaleString("vi-VN")} XP</p></div>}
        {finished ? <><span className={styles.eyebrow}><Trophy size={20} aria-hidden /> KẾT QUẢ</span><h1>{outcome(match.status, match.winnerSlot, match.mySlot)}</h1><p className={styles.resultScore}>+{me.xp}<small>XP</small></p>{match.reason !== "COMPLETE" && <p>{match.reason === "BOTH_OFFLINE" ? "Cả hai mất kết nối quá 30 giây. Trận không có thưởng." : "Trận kết thúc vì một người bỏ cuộc hoặc mất kết nối."}</p>}{me.xp === 0 && <p>Không có XP: trận không đủ điều kiện thưởng hoặc đã đạt 5 trận có thưởng trong ngày.</p>}<Link href="/game" className={styles.primary}>Đấu ván nữa <Swords size={20} aria-hidden /></Link><Link href="/game" className={styles.backLink}>Về sảnh và xem rank mới</Link></>
          : !turn || countdown ? <div className={styles.countdown}><Shield size={40} aria-hidden /><h1>Sẵn sàng giao đấu</h1><strong>{countdown || 3}</strong><p>{match.total} câu · luân phiên hai bên</p></div>
          : <><div className={styles.questionTop}><span>{TYPE_LABELS[turn.type as BattleType]} · {turn.number + 1}/{match.total}</span><span className={styles.timer} data-urgent={!turn.answered && seconds <= 5}><Clock3 size={20} aria-hidden />{turn.answered ? `Chuyển ${Math.max(0, Math.ceil((turn.nextAt - now) / 1000))}s` : `${seconds}s`}</span></div><h1>{turn.prompt}</h1><p className={styles.turnLabel}>{turn.answered ? "Đã ghi nhận đáp án" : mine ? "Chọn một đáp án" : "Lượt của đối thủ · Bạn đang theo dõi"}</p>
            <div className={styles.options}>{turn.options.map((option, i) => <button key={i} data-result={turn.correct === i ? "correct" : turn.choice === i ? "wrong" : undefined} data-selected={selected === i} disabled={!mine || busy || turn.answered} onClick={async () => { setSelected(i); if (!await send({ action: "answer", turn: turn.number, choice: i })) setSelected(null); }}><span>{String.fromCharCode(65 + i)}</span>{option}{turn.correct === i ? <Check aria-label="Đáp án đúng" size={20} /> : turn.choice === i ? <X aria-label="Đáp án sai" size={20} /> : null}</button>)}</div>
            {turn.answered && <div className={styles.explanation}><strong>{correct ? "Đúng" : "Sai hoặc hết giờ"}</strong><p>Đã ghi nhận kết quả. Chuẩn bị sang câu tiếp theo.</p></div>}
            {!turn.answered && selected !== null && <p role="status">Đang gửi đáp án…</p>}
          </>}
      </section>
    </div>
    <dialog ref={confirmLeave} className={styles.dialog} aria-labelledby="leave-title"><h2 id="leave-title">Rời trận đấu?</h2><p>Bạn sẽ bị xử thua và không nhận XP.</p><button onClick={() => confirmLeave.current?.close()}>Tiếp tục chơi</button><button disabled={busy} onClick={async () => { if (await send({ action: "leave" })) confirmLeave.current?.close(); }}>Bỏ cuộc</button></dialog>
  </main>;
}

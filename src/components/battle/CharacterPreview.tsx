"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Pause, Play, RotateCcw, Swords } from "lucide-react";
import { BattleCharacter } from "./BattleCharacter";
import { CHARACTER_STATES, type CharacterState } from "./character-states";
import styles from "./character-preview.module.css";

const SEQUENCE: { hero: CharacterState; rival: CharacterState; ms: number; text: string }[] = [
  { hero: "ready", rival: "ready", ms: 1500, text: "Hai bên sẵn sàng" },
  { hero: "thinking", rival: "idle", ms: 2000, text: "Anh hùng đang suy nghĩ" },
  { hero: "answering", rival: "ready", ms: 1000, text: "Anh hùng chọn đáp án" },
  { hero: "correct", rival: "wrong", ms: 1300, text: "Trả lời đúng!" },
  { hero: "attack", rival: "ready", ms: 450, text: "Anh hùng tung đòn" },
  { hero: "attack", rival: "hit", ms: 1100, text: "Đối thủ nhận đòn" },
  { hero: "ready", rival: "thinking", ms: 1700, text: "Đến lượt đối thủ" },
  { hero: "ready", rival: "attack", ms: 450, text: "Đối thủ phản công" },
  { hero: "defense", rival: "attack", ms: 1500, text: "Khiên năng lượng được kích hoạt" },
  { hero: "victory", rival: "defeat", ms: 2500, text: "Anh hùng chiến thắng" },
  { hero: "draw", rival: "draw", ms: 2000, text: "Kết thúc bằng một lời chào" },
];

export function CharacterPreview() {
  const [selected, setSelected] = useState<CharacterState>("idle");
  const [replay, setReplay] = useState(0);
  const [paused, setPaused] = useState(false);
  const [step, setStep] = useState<number | null>(null);
  const [light, setLight] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [hidden, setHidden] = useState(false);
  const sequence = step === null ? null : SEQUENCE[step];
  const current = CHARACTER_STATES.find((item) => item.state === selected)!;

  useEffect(() => {
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(query.matches);
    const visibility = () => setHidden(document.hidden);
    sync(); visibility();
    query.addEventListener("change", sync);
    document.addEventListener("visibilitychange", visibility);
    return () => { query.removeEventListener("change", sync); document.removeEventListener("visibilitychange", visibility); };
  }, []);

  useEffect(() => {
    if (step === null || paused || hidden || reduced) return;
    const timer = setTimeout(() => {
      if (step + 1 < SEQUENCE.length) setStep(step + 1);
      else { setStep(null); setSelected("draw"); setReplay((value) => value + 1); }
    }, SEQUENCE[step].ms);
    return () => clearTimeout(timer);
  }, [step, paused, hidden, reduced]);

  function choose(state: CharacterState) {
    setStep(null);
    setSelected(state);
    setReplay((value) => value + 1);
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.back}><ArrowLeft size={18} aria-hidden="true" /> WEWIN VSTEP</Link>
        <span className={styles.eyebrow}>QUICK BATTLE / MOTION LAB</span>
        <span className={styles.previewBadge}>Xem thử nhân vật</span>
      </header>
      <div className={styles.heading}>
        <div><p className={styles.eyebrow}>MỖI CÂU TRẢ LỜI. MỘT CHUYỂN ĐỘNG.</p><h1>Nhân vật vào trận.</h1></div>
        <p>Chọn một trạng thái hoặc xem chuỗi giao đấu để cảm nhận chuyển động của hai nhân vật.</p>
      </div>
      <div className={styles.layout}>
        <section className={styles.stagePanel} aria-label="Sân khấu xem thử">
          <div className={styles.stageToolbar}>
            <span className={styles.liveLabel}>WEWIN ARENA</span>
            <button type="button" onClick={() => setLight(!light)} aria-pressed={light}>{light ? "Nền tối" : "Nền sáng"}</button>
          </div>
          <div className={styles.arena} data-light={light}>
            <div className={styles.grid} aria-hidden="true" />
            <div className={styles.versus} aria-hidden="true">VS</div>
            <div className={styles.fighter}>
              <div className={styles.name}><span>01 / ANH HÙNG</span><strong>WEWIN Hero</strong></div>
              <BattleCharacter variant="hero" state={sequence?.hero ?? selected} paused={paused} replay={replay} />
              <div className={styles.platform} aria-hidden="true" />
              <span className={styles.poseLabel}>{CHARACTER_STATES.find((item) => item.state === (sequence?.hero ?? selected))!.label}</span>
            </div>
            <div className={styles.fighter} data-rival="true">
              <div className={styles.name}><span>02 / ĐỐI THỦ</span><strong>WEWIN Rival</strong></div>
              <BattleCharacter variant="rival" facing="left" state={sequence?.rival ?? selected} paused={paused} replay={replay} />
              <div className={styles.platform} aria-hidden="true" />
              <span className={styles.poseLabel}>{CHARACTER_STATES.find((item) => item.state === (sequence?.rival ?? selected))!.label}</span>
            </div>
          </div>
          <div className={styles.playback}>
            <p role="status" aria-live="polite">{reduced ? "Đang dùng chế độ giảm chuyển động của thiết bị." : sequence?.text ?? current.detail}</p>
            <div className={styles.playbackButtons}>
              <button type="button" aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? <Play size={17} aria-hidden="true" /> : <Pause size={17} aria-hidden="true" />}{paused ? "Tiếp tục" : "Tạm dừng"}</button>
              <button type="button" onClick={() => { setReplay(replay + 1); setPaused(false); }}><RotateCcw size={17} aria-hidden="true" />Phát lại</button>
            </div>
          </div>
        </section>
        <section className={styles.controls} aria-labelledby="states-title">
          <div className={styles.controlHeading}><h2 id="states-title">12 trạng thái</h2><span>02 nhân vật</span></div>
          <div className={styles.stateGrid}>
            {CHARACTER_STATES.map((item, index) => (
              <button type="button" key={item.state} aria-pressed={step === null && selected === item.state} onClick={() => choose(item.state)} className={styles.stateButton}>
                <span>{String(index + 1).padStart(2, "0")}</span><strong>{item.label}</strong><small>{item.state}</small>
              </button>
            ))}
          </div>
          <button type="button" className={styles.demoButton} disabled={reduced} onClick={() => { setPaused(false); setReplay(replay + 1); setStep(step === null ? 0 : null); }}><Swords size={19} aria-hidden="true" />{step === null ? "Xem chuỗi giao đấu" : "Dừng chuỗi giao đấu"}</button>
          <p className={styles.note}>Đây là bản xem chuyển động. Chưa có ghép trận, câu hỏi hoặc tính điểm.</p>
        </section>
      </div>
      <footer className={styles.footer}><span>WEWIN EDUCATION</span><span>24 tư thế · Chuyển động 2D · Nền trong suốt</span></footer>
    </main>
  );
}

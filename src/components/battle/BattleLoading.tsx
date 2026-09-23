import Link from "next/link";
import { Swords } from "lucide-react";
import styles from "./battle-game.module.css";

export function BattleLoading({ error }: { error?: string }) {
  return <div className={styles.transitionScreen} role="status" aria-live="polite">
    <div className={styles.transitionCard}><Swords size={34} aria-hidden />
      <h1>Đang vào trận đấu…</h1><p>Đang kết nối đối thủ và chuẩn bị câu hỏi.</p>
      {error && <p role="alert">{error}</p>}
      <Link href="/game">Về sảnh</Link>
    </div>
  </div>;
}

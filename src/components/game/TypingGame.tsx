"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useEffect, useState } from "react";

const WORDS = [
  "hello",
  "mother",
  "father",
  "school",
  "apple",
  "water",
  "bread",
  "friend",
  "thanks",
  "morning",
  "family",
  "teacher",
];

export function TypingGame() {
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState("");
  const [score, setScore] = useState(0);
  const [seconds, setSeconds] = useState(60);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  const word = WORDS[index % WORDS.length];

  useEffect(() => {
    if (!running || done) return;
    if (seconds <= 0) {
      setDone(true);
      setRunning(false);
      return;
    }
    const t = window.setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [running, seconds, done]);

  const start = () => {
    setIndex(0);
    setInput("");
    setScore(0);
    setSeconds(60);
    setDone(false);
    setRunning(true);
  };

  const onChange = (value: string) => {
    if (!running) return;
    setInput(value);
    if (value.trim().toLowerCase() === word) {
      setScore((s) => s + 1);
      setIndex((i) => i + 1);
      setInput("");
    }
  };

  return (
    <Card padding="lg" className="mx-auto max-w-lg">
      <div className="flex items-center justify-between text-[13px] text-ink-muted">
        <span>
          Điểm: <strong className="text-brand">{score}</strong>
        </span>
        <span>
          Thời gian: <strong className="text-ink">{seconds}s</strong>
        </span>
      </div>

      {!running && !done ? (
        <div className="mt-6 text-center">
          <p className="text-sm text-ink-muted">Gõ đúng từ trong 60 giây.</p>
          <Button className="mt-4" type="button" onClick={start}>
            Bắt đầu
          </Button>
        </div>
      ) : null}

      {running ? (
        <div className="mt-6 text-center">
          <p className="font-[family-name:var(--font-jakarta)] text-3xl font-extrabold tracking-wide text-brand">
            {word}
          </p>
          <input
            autoFocus
            value={input}
            onChange={(e) => onChange(e.target.value)}
            className="mt-4 w-full rounded-xl border border-border px-4 py-3 text-center text-lg font-semibold outline-none focus:border-brand"
            placeholder="Gõ tại đây…"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      ) : null}

      {done ? (
        <div className="mt-6 text-center">
          <p className="text-sm text-ink-muted">Hết giờ!</p>
          <p className="mt-1 font-[family-name:var(--font-jakarta)] text-2xl font-extrabold text-ink">
            {score} từ đúng
          </p>
          <Button className="mt-4" type="button" onClick={start}>
            Chơi lại
          </Button>
        </div>
      ) : null}
    </Card>
  );
}

"use client";

import { useCallback, useEffect, useRef } from "react";

type Pronunciation = { term: string; audioUrl?: string | null; pronunciationUnavailable?: boolean };

export function useVocabularyPronunciation(onError: (message: string) => void) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const version = useRef(0);
  const stop = useCallback(() => {
    version.current++;
    if (audio.current) { audio.current.onerror = null; audio.current.pause(); audio.current = null; }
    window.speechSynthesis?.cancel();
  }, []);
  useEffect(() => stop, [stop]);

  const speak = useCallback((entry: Pronunciation) => {
    stop();
    if (entry.pronunciationUnavailable) return;
    if (entry.audioUrl) {
      const request = version.current;
      const player = new Audio(entry.audioUrl);
      audio.current = player;
      const failed = () => { if (version.current === request) onError("Chưa phát được audio. Vui lòng kiểm tra kết nối rồi bấm nghe lại."); };
      player.onerror = failed;
      void player.play().catch(failed);
    } else if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(entry.term);
      utterance.lang = "en-US";
      window.speechSynthesis.speak(utterance);
    }
  }, [onError, stop]);
  return { speak, stop };
}

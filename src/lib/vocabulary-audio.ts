import "server-only";
import recordings from "@/data/vocabulary-audio.json";

const audioByCode: Record<string, (string | null)[]> = recordings;
const normalize = (term: string) => term.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();

// Match both the stable import code and the current word; never attach an old recording to an edited word.
export function withVocabularyAudio<T extends { entryCode?: string; term: string; audioUrl?: string | null }>(entry: T): T & { pronunciationUnavailable?: boolean } {
  if (entry.audioUrl || !entry.entryCode) return entry;
  const recording = audioByCode[entry.entryCode];
  if (!recording || typeof recording[0] !== "string" || normalize(recording[0]) !== normalize(entry.term)) return entry;
  return { ...entry, audioUrl: recording[1] ?? null, ...(recording[1] ? {} : { pronunciationUnavailable: true }) };
}

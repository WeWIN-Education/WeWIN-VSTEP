/** Shared shape for imported VSTEP papers. No demo question content is stored here. */
export type VstepQuestion = {
  id: string;
  number: number;
  prompt: string;
  options: string[];
};

export type VstepListeningPart = {
  id: string;
  title: string;
  audioUrl: string;
  durationSeconds: number;
  instructions: string;
  questions: VstepQuestion[];
};

export type VstepReadingPassage = {
  id: string;
  title: string;
  text: string;
  questions: VstepQuestion[];
};

export type VstepWritingTask = {
  id: string;
  title: string;
  durationMinutes: number;
  minimumWords: number;
  prompt: string;
  bullets?: string[];
};

export type VstepSpeakingPart = {
  id: string;
  title: string;
  prompt: string;
  questions: readonly string[];
  audioUrl?: string;
  preparationSeconds?: number;
  speakingSeconds?: number;
};

export type VstepTest1Public = {
  slug: string;
  title: string;
  subtitle: string;
  target: string;
  listening: { instructions: string; parts: VstepListeningPart[] };
  reading: { instructions: string; passages: VstepReadingPassage[] };
  writing: VstepWritingTask[];
  speaking: { parts: readonly VstepSpeakingPart[] };
};

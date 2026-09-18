import classroomTranscript from "./classroom-transcript.json";
export type VideoTranscript = { id: string; start: string; startSeconds: number; endSeconds?: number; en: string; vi: string; ipa?: string };
export type VideoQuestion = { id: string; atSeconds: number; prompt: string; options: string[]; correctIndex: number };
export type LearningVideo = { slug: string; title: string; titleVi: string; description: string; level: string; category: string; duration: string; youtubeId: string; transcript: VideoTranscript[]; questions: VideoQuestion[] };

export const LEARNING_VIDEOS: LearningVideo[] = [
  {
    slug: "classroom-instructions",
    title: "Classroom Instructions in English",
    titleVi: "Câu hướng dẫn lớp học bằng tiếng Anh",
    description: "Các mẫu câu ngắn để giao nhiệm vụ, chia nhóm và giữ nhịp cho lớp.",
    level: "A2",
    category: "Điều phối lớp",
    duration: "12:46",
    youtubeId: "lkw2PtVpCJM",
    transcript: classroomTranscript,
    questions: [
      { id: "q-positive-language", atSeconds: 30, prompt: "According to the video, why should teachers use positive language and group words?", options: ["To make lessons shorter", "To promote unity in the classroom", "To make students work faster", "To avoid giving instructions"], correctIndex: 1 },
      { id: "q-attendance", atSeconds: 260, prompt: "What can a teacher say when checking attendance?", options: ["Let’s take the register.", "Please open your books.", "Repeat after me.", "Pack away your things."], correctIndex: 0 },
      { id: "q-noise", atSeconds: 595, prompt: "What should a teacher do when students are making noise at the beginning of class?", options: ["Shout at the students immediately", "Leave the classroom", "Wait until everyone is quiet before speaking", "Give the students homework"], correctIndex: 2 },
    ],
  },
];

export function findLearningVideo(slug: string) {
  return LEARNING_VIDEOS.find((video) => video.slug === slug);
}

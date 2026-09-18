export const MATERIAL_SKILLS = ["GENERAL", "LISTENING", "READING", "WRITING", "SPEAKING"] as const;
export type MaterialSkill = (typeof MATERIAL_SKILLS)[number];

export const MATERIAL_LEVELS = ["ALL", "B1", "B2", "C1"] as const;
export type MaterialLevel = (typeof MATERIAL_LEVELS)[number];

export const MATERIAL_FILE_TYPES = {
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".txt": "text/plain",
  ".zip": "application/zip",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".mp4": "video/mp4",
} as const;

export type MaterialExtension = keyof typeof MATERIAL_FILE_TYPES;

export function fileExtension(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot >= 0 ? fileName.slice(dot).toLowerCase() : "";
}

export function materialSkillLabel(skill: string) {
  return {
    GENERAL: "Chung",
    LISTENING: "Listening",
    READING: "Reading",
    WRITING: "Writing",
    SPEAKING: "Speaking",
  }[skill] ?? skill;
}

export function materialLevelLabel(level?: string | null) {
  return !level || level === "ALL" ? "Mọi trình độ" : level;
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
}

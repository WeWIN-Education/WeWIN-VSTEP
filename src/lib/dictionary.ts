import "server-only";

import { prisma } from "@/lib/prisma";

export type DictionaryDirection = "auto" | "en-vi" | "vi-en";

type DictionaryEntry = {
  term: string;
  meaningVi: string;
  ipa: string | null;
  partOfSpeech: string | null;
  exampleEn: string | null;
  exampleVi: string | null;
  audioUrl: string | null;
};

export type DictionaryLookup = {
  input: string;
  translation: string;
  sourceLanguage: "en" | "vi";
  targetLanguage: "en" | "vi";
  entry: DictionaryEntry | null;
};

export class DictionaryError extends Error {
  constructor(public readonly code: "INVALID_INPUT" | "UNAVAILABLE" | "FAILED", message: string) {
    super(message);
  }
}

function detectLanguage(text: string): "en" | "vi" {
  return /[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/iu.test(text) ? "vi" : "en";
}

function isSingleWord(text: string) {
  return !/\s/u.test(text) && text.length <= 80;
}

async function findEntry(text: string, sourceLanguage: "en" | "vi", userId: string): Promise<DictionaryEntry | null> {
  if (sourceLanguage === "en") {
    const shared = await prisma.vocabularyEntry.findFirst({
      where: { term: { equals: text, mode: "insensitive" } },
      orderBy: { createdAt: "asc" },
      select: { term: true, meaningVi: true, ipa: true, partOfSpeech: true, exampleEn: true, exampleVi: true, audioUrl: true },
    });
    if (shared) return shared;
  }

  const personal = await prisma.personalVocabulary.findFirst({
    where: { userId, ...(sourceLanguage === "en" ? { term: { equals: text, mode: "insensitive" as const } } : { meaningVi: { equals: text, mode: "insensitive" as const } }) },
    select: { term: true, meaningVi: true, ipa: true, exampleEn: true },
  });
  if (personal) return { term: personal.term, meaningVi: personal.meaningVi, ipa: personal.ipa, partOfSpeech: null, exampleEn: personal.exampleEn, exampleVi: null, audioUrl: null };

  if (sourceLanguage === "en") return null;
  return prisma.vocabularyEntry.findFirst({
    where: { meaningVi: { equals: text, mode: "insensitive" } },
    orderBy: { createdAt: "asc" },
    select: { term: true, meaningVi: true, ipa: true, partOfSpeech: true, exampleEn: true, exampleVi: true, audioUrl: true },
  });
}

async function translateWithGoogle(text: string, sourceLanguage: "en" | "vi", targetLanguage: "en" | "vi") {
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY?.trim();
  if (!apiKey) throw new DictionaryError("UNAVAILABLE", isSingleWord(text)
    ? "Từ này chưa có trong kho từ vựng. Quản trị viên cần cấu hình Google Cloud Translation để tra thêm từ ngoài kho."
    : "Dịch câu và đoạn văn chưa được cấu hình dịch vụ dịch thuật. Quản trị viên cần cấu hình Google Cloud Translation.");

  let response: Response;
  try {
    response = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ q: text, source: sourceLanguage, target: targetLanguage, format: "text" }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new DictionaryError("FAILED", "Dịch vụ dịch thuật không phản hồi. Vui lòng thử lại.");
  }
  if (!response.ok) throw new DictionaryError("FAILED", "Không thể kết nối dịch vụ dịch thuật. Vui lòng thử lại.");

  const payload = await response.json() as { data?: { translations?: Array<{ translatedText?: string }> } };
  const translation = payload.data?.translations?.[0]?.translatedText?.trim();
  if (!translation) throw new DictionaryError("FAILED", "Dịch vụ không trả về kết quả dịch.");
  return translation;
}

export async function lookupDictionary(input: { text: string; direction: DictionaryDirection; userId: string }): Promise<DictionaryLookup> {
  const text = input.text.trim().slice(0, 2000);
  if (!text) throw new DictionaryError("INVALID_INPUT", "Hãy nhập từ hoặc đoạn văn cần tra.");

  const sourceLanguage = input.direction === "en-vi" ? "en" : input.direction === "vi-en" ? "vi" : detectLanguage(text);
  const targetLanguage = sourceLanguage === "en" ? "vi" : "en";
  const entry = isSingleWord(text) || (sourceLanguage === "vi" && text.length <= 80) ? await findEntry(text, sourceLanguage, input.userId) : null;

  if (entry) {
    return {
      input: text,
      translation: sourceLanguage === "en" ? entry.meaningVi : entry.term,
      sourceLanguage,
      targetLanguage,
      entry,
    };
  }

  return {
    input: text,
    translation: await translateWithGoogle(text, sourceLanguage, targetLanguage),
    sourceLanguage,
    targetLanguage,
    entry: null,
  };
}

import * as XLSX from "xlsx";
import { Prisma, PrismaClient, type VocabularyCollectionKind } from "@prisma/client";

export const VOCABULARY_LEVELS = ["A1", "A2", "A1-A2", "B1", "B2", "C1", "C2"] as const;

export type VocabularyLevel = (typeof VOCABULARY_LEVELS)[number];

export type VocabularyImportRow = {
  collectionCode: string;
  collectionName: string;
  collectionDescription?: string;
  topicCode?: string;
  topicName?: string;
  topicSortOrder?: number;
  entryCode: string;
  level: VocabularyLevel;
  term: string;
  meaningVi: string;
  partOfSpeech?: string;
  ipa?: string;
  exampleEn?: string;
  exampleVi?: string;
  audioUrl?: string;
  note?: string;
  sourceSheet: string;
  sourceRow: number;
  sourceFile: string;
};

export type VocabularyImportError = {
  sheet: string;
  row: number;
  message: string;
};

export type VocabularyParseResult = {
  rows: VocabularyImportRow[];
  errors: VocabularyImportError[];
  totalDataRows: number;
};

export type VocabularyImportSummary = {
  importId: string;
  totalRows: number;
  insertedRows: number;
  updatedRows: number;
  skippedRows: number;
  errorRows: number;
  errors: VocabularyImportError[];
};

export type VocabularyImportKind = "VOCABULARY" | "COLLOCATION";

type Cell = string | number | boolean | Date | null | undefined;

const HEADER_ALIASES = {
  collectionCode: ["collection_code", "collection code", "ma bo", "mã bộ"],
  collectionName: ["collection_name", "collection name", "ten bo", "tên bộ"],
  topicCode: ["topic_code", "topic code", "ma chu de", "mã chủ đề"],
  topicName: ["topic_name", "topic name", "chu de", "chủ đề"],
  entryCode: ["entry_code", "entry code", "ma muc tu", "mã mục từ"],
  level: ["level", "cap do", "cấp độ"],
  term: ["term", "word", "vocabulary", "tu vung", "từ vựng"],
  partOfSpeech: ["part_of_speech", "part of speech", "loai tu", "loại từ"],
  ipa: ["ipa", "phien am", "phiên âm", "phien am ipa", "phiên âm ipa"],
  meaningVi: ["meaning_vi", "meaning vi", "meaning", "dich nghia", "dịch nghĩa", "nghia tieng viet", "nghĩa tiếng việt"],
  exampleEn: ["example_en", "example en", "vi du tieng anh", "ví dụ tiếng anh"],
  exampleVi: ["example_vi", "example vi", "vi du tieng viet", "ví dụ tiếng việt"],
  audioUrl: ["audio_url", "audio url", "audio", "url audio"],
  note: ["note", "ghi chu", "ghi chú"],
} as const;

function text(value: Cell): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\s+/g, " ").trim();
}

function headerKey(value: Cell): string {
  return text(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[()]/g, "")
    .replace(/[^a-z0-9_ ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function findColumn(headers: string[], aliases: readonly string[]) {
  const normalized = aliases.map(headerKey);
  return headers.findIndex((header) => normalized.includes(header));
}

function valueAt(row: Cell[], index: number) {
  return index >= 0 ? text(row[index]) : "";
}

function safeCode(value: string, fallback: string) {
  const cleaned = value
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return cleaned || fallback;
}

function collectionDefaults(fileName: string, kind: VocabularyImportKind) {
  if (kind === "COLLOCATION") {
    return { code: "COLLOCATIONS", name: "Cụm từ & collocations", description: "Kho cụm từ được nhập từ file Excel." };
  }
  const lower = fileName.toLowerCase();
  if (lower.includes("a1") && lower.includes("a2")) {
    return { code: "A1_A2", name: "Từ vựng A1–A2", description: "Bộ từ vựng nền tảng theo 20 chủ đề." };
  }
  if (lower.includes("b1")) {
    return { code: "B1", name: "Từ vựng B1", description: "Bộ từ vựng B1 theo chủ đề." };
  }
  return { code: "CUSTOM", name: "Từ vựng nhập thêm", description: "Bộ từ vựng được nhập từ file Excel." };
}

function topicFromSheet(sheetName: string, firstCell: string) {
  const code = safeCode(sheetName, "TOPIC");
  const title = firstCell.includes("|") ? firstCell.split("|").slice(1).join("|").trim() : firstCell;
  const name = title.replace(/^CHỦ ĐỀ\s*\d*\s*[|:]?\s*/i, "").trim() || sheetName;
  return { code, name };
}

function levelFromFile(fileName: string): VocabularyLevel {
  const lower = fileName.toLowerCase();
  if (lower.includes("a1") && lower.includes("a2")) return "A1-A2";
  if (lower.includes("b1")) return "B1";
  return "B1";
}

function validLevel(value: string, fallback: VocabularyLevel): VocabularyLevel {
  const upper = value.toUpperCase().replace(/[–—]/g, "-").replace(/\s+/g, "");
  if ((VOCABULARY_LEVELS as readonly string[]).includes(upper)) return upper as VocabularyLevel;
  if (upper === "A1/A2" || upper === "A1-A2") return "A1-A2";
  return fallback;
}

function isBlankRow(row: Cell[]) {
  return row.every((cell) => text(cell) === "");
}

export function parseVocabularyWorkbook(buffer: Buffer | ArrayBuffer, fileName: string, kind: VocabularyImportKind = "VOCABULARY"): VocabularyParseResult {
  const workbook = XLSX.read(buffer, { type: "buffer", raw: false, cellDates: false });
  const defaults = collectionDefaults(fileName, kind);
  const fallbackLevel = levelFromFile(fileName);
  const rows: VocabularyImportRow[] = [];
  const errors: VocabularyImportError[] = [];
  let totalDataRows = 0;
  const seen = new Set<string>();
  const topicSortOrders = new Map<string, number>();
  let nextTopicSortOrder = 0;

  workbook.SheetNames.forEach((sheetName, sheetIndex) => {
    const normalizedSheetName = headerKey(sheetName);
    if (["tong_quan", "tong quan", "huong_dan", "huong dan"].includes(normalizedSheetName)) return;
    const sheet = workbook.Sheets[sheetName];
    const matrix = XLSX.utils.sheet_to_json<Cell[]>(sheet, { header: 1, defval: "", raw: false });
    const headerIndex = matrix.findIndex((row) => {
      const headers = row.map(headerKey);
      return findColumn(headers, HEADER_ALIASES.term) >= 0 && (kind === "COLLOCATION" || findColumn(headers, HEADER_ALIASES.meaningVi) >= 0);
    });
    if (headerIndex < 0) {
      errors.push({ sheet: sheetName, row: 1, message: "Không tìm thấy hàng tiêu đề gồm TỪ VỰNG và NGHĨA TIẾNG VIỆT." });
      return;
    }

    const headers = matrix[headerIndex].map(headerKey);
    const columns = Object.fromEntries(Object.entries(HEADER_ALIASES).map(([key, aliases]) => [key, findColumn(headers, aliases)])) as Record<keyof typeof HEADER_ALIASES, number>;
    const firstCell = text(matrix[0]?.[0]);
    const sheetTopic = topicFromSheet(sheetName, firstCell);
    const inferredTopicCode = kind === "COLLOCATION" && columns.topicCode < 0 && columns.topicName < 0 ? "" : sheetTopic.code;
    const inferredTopicName = kind === "COLLOCATION" && columns.topicCode < 0 && columns.topicName < 0 ? "" : sheetTopic.name;

    for (let matrixIndex = headerIndex + 1; matrixIndex < matrix.length; matrixIndex += 1) {
      const row = matrix[matrixIndex] ?? [];
      if (isBlankRow(row)) continue;
      const term = valueAt(row, columns.term);
      const meaningVi = valueAt(row, columns.meaningVi);
      const hasNumericId = /^\d+$/.test(valueAt(row, columns.entryCode)) || /^\d+$/.test(valueAt(row, 0));
      if (!term && !meaningVi && !hasNumericId) continue;
      totalDataRows += 1;
      const rowNumber = matrixIndex + 1;
      if (!term || (kind !== "COLLOCATION" && !meaningVi)) {
        errors.push({ sheet: sheetName, row: rowNumber, message: "Thiếu từ vựng hoặc nghĩa tiếng Việt." });
        continue;
      }

      const collectionCode = safeCode(valueAt(row, columns.collectionCode), defaults.code);
      const collectionName = valueAt(row, columns.collectionName) || defaults.name;
      const topicCode = safeCode(valueAt(row, columns.topicCode), inferredTopicCode);
      const topicName = valueAt(row, columns.topicName) || inferredTopicName;
      const topicKey = `${collectionCode}::${topicCode}`;
      if (topicCode && !topicSortOrders.has(topicKey)) topicSortOrders.set(topicKey, nextTopicSortOrder++);
      const rawEntryCode = valueAt(row, columns.entryCode) || valueAt(row, 0);
      const entryCode = `${collectionCode}-${safeCode(rawEntryCode, `${topicCode}-${rowNumber}`)}`;
      const key = `${collectionCode}::${entryCode}`;
      if (seen.has(key)) {
        errors.push({ sheet: sheetName, row: rowNumber, message: `Trùng mã mục từ ${entryCode} trong cùng file.` });
        continue;
      }
      seen.add(key);

      rows.push({
        collectionCode,
        collectionName,
        collectionDescription: valueAt(row, columns.note) || defaults.description,
        ...(topicCode ? { topicCode } : {}),
        ...(topicName ? { topicName } : {}),
        entryCode,
        level: validLevel(valueAt(row, columns.level), fallbackLevel),
        term,
        meaningVi,
        partOfSpeech: valueAt(row, columns.partOfSpeech) || undefined,
        ipa: valueAt(row, columns.ipa) || undefined,
        exampleEn: valueAt(row, columns.exampleEn) || undefined,
        exampleVi: valueAt(row, columns.exampleVi) || undefined,
        audioUrl: valueAt(row, columns.audioUrl) || undefined,
        note: valueAt(row, columns.note) || undefined,
        sourceSheet: sheetName,
        sourceRow: rowNumber,
        sourceFile: fileName,
        topicSortOrder: topicCode ? topicSortOrders.get(topicKey) : sheetIndex,
      });
    }
  });

  return { rows, errors, totalDataRows };
}

export async function importVocabularyRows({
  prisma,
  rows,
  errors,
  totalDataRows,
  fileName,
  uploadedById,
  kind = "VOCABULARY",
}: {
  prisma: PrismaClient;
  rows: VocabularyImportRow[];
  errors: VocabularyImportError[];
  totalDataRows: number;
  fileName: string;
  kind?: VocabularyImportKind;
} & { uploadedById: string }): Promise<VocabularyImportSummary> {
  const importRecord = await prisma.vocabularyImport.create({
    data: {
      uploadedById,
      fileName,
      kind: kind as VocabularyCollectionKind,
      status: "PROCESSING",
      totalRows: totalDataRows,
      errorRows: errors.length,
      errors: errors.slice(0, 100) as unknown as Prisma.InputJsonValue,
    },
  });

  let insertedRows = 0;
  let updatedRows = 0;
  let skippedRows = 0;
  try {
    // Keep database transactions short. Vercel + Neon can close interactive
    // transactions while a large workbook is still doing row-by-row work.
    const collectionIds = new Map<string, string>();
    const topicIds = new Map<string, string>();
    for (const row of rows) {
      if (!collectionIds.has(row.collectionCode)) {
        const existingCollection = await prisma.vocabularyCollection.findUnique({ where: { code: row.collectionCode }, select: { id: true, kind: true } });
        if (existingCollection && existingCollection.kind !== kind) throw new Error(`Bộ ${row.collectionCode} đã tồn tại với loại nội dung khác.`);
        const collection = existingCollection
          ? await prisma.vocabularyCollection.update({ where: { id: existingCollection.id }, data: { name: row.collectionName, description: row.collectionDescription, sourceFile: row.sourceFile } })
          : await prisma.vocabularyCollection.create({ data: { code: row.collectionCode, name: row.collectionName, description: row.collectionDescription, sourceFile: row.sourceFile, kind: kind as VocabularyCollectionKind } });
        collectionIds.set(row.collectionCode, collection.id);
      }
      const collectionId = collectionIds.get(row.collectionCode)!;
      const topicKey = `${row.collectionCode}::${row.topicCode}`;
      if (row.topicCode && !topicIds.has(topicKey)) {
        const topic = await prisma.vocabularyTopic.upsert({
          where: { collectionId_code: { collectionId, code: row.topicCode } },
          create: { collectionId, code: row.topicCode, name: row.topicName || row.topicCode, sortOrder: row.topicSortOrder ?? 0 },
          update: { name: row.topicName || row.topicCode, sortOrder: row.topicSortOrder ?? 0 },
        });
        topicIds.set(topicKey, topic.id);
      }
    }

    const collectionIdList = [...collectionIds.values()];
    const existing = await prisma.vocabularyEntry.findMany({ where: { collectionId: { in: collectionIdList } }, select: { id: true, collectionId: true, entryCode: true } });
    const existingMap = new Map(existing.map((entry) => [`${entry.collectionId}::${entry.entryCode}`, entry.id]));
    const createData: Prisma.VocabularyEntryCreateManyInput[] = [];
    const updateData: Array<{ id: string; data: Prisma.VocabularyEntryUpdateInput }> = [];
    const incoming = new Set<string>();

    for (const row of rows) {
      const collectionId = collectionIds.get(row.collectionCode)!;
      const topicId = row.topicCode ? topicIds.get(`${row.collectionCode}::${row.topicCode}`) : undefined;
      const key = `${collectionId}::${row.entryCode}`;
      if (incoming.has(key)) {
        skippedRows += 1;
        continue;
      }
      incoming.add(key);
      const data = {
        collectionId,
        topicId: topicId ?? null,
        entryCode: row.entryCode,
        level: row.level,
        term: row.term,
        meaningVi: row.meaningVi,
        partOfSpeech: row.partOfSpeech,
        ipa: row.ipa,
        exampleEn: row.exampleEn,
        exampleVi: row.exampleVi,
        audioUrl: row.audioUrl,
        note: row.note,
        sourceSheet: row.sourceSheet,
        sourceRow: row.sourceRow,
      };
      const existingId = existingMap.get(key);
      if (existingId) {
        updatedRows += 1;
        updateData.push({ id: existingId, data });
      } else {
        insertedRows += 1;
        createData.push(data);
      }
    }

    for (let index = 0; index < createData.length; index += 500) {
      await prisma.vocabularyEntry.createMany({ data: createData.slice(index, index + 500), skipDuplicates: true });
    }
    for (let index = 0; index < updateData.length; index += 50) {
      const batch = updateData.slice(index, index + 50);
      await prisma.$transaction(batch.map((update) => prisma.vocabularyEntry.update({ where: { id: update.id }, data: update.data })));
    }

    await prisma.vocabularyImport.update({
      where: { id: importRecord.id },
      data: {
        collectionId: collectionIdList.length === 1 ? collectionIdList[0] : null,
        status: errors.length ? "COMPLETED_WITH_ERRORS" : "COMPLETED",
        insertedRows,
        updatedRows,
        skippedRows,
        errorRows: errors.length,
        errors: errors.slice(0, 100) as unknown as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    await prisma.vocabularyImport.update({ where: { id: importRecord.id }, data: { status: "FAILED", errors: [{ sheet: "", row: 0, message: error instanceof Error ? error.message : "Import thất bại." }] } });
    throw error;
  }

  return { importId: importRecord.id, totalRows: totalDataRows, insertedRows, updatedRows, skippedRows, errorRows: errors.length, errors };
}

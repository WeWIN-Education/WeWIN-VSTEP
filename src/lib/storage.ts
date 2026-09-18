import { del, get, head, put } from "@vercel/blob";
import { createReadStream } from "node:fs";
import { mkdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

const localRoot = path.join(process.cwd(), ".data", "storage");

export type StorageObject = {
  key: string;
  url: string;
  sizeBytes: number;
  contentType: string;
};

export type StorageRead = {
  stream: ReadableStream<Uint8Array>;
  sizeBytes: number;
  contentType: string;
  etag?: string;
};

export function isBlobStorageEnabled() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function normalizeKey(key: string) {
  const normalized = key.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || normalized.includes("..") || normalized.includes("//")) throw new Error("Storage key không hợp lệ.");
  return normalized;
}

function localCandidates(key: string) {
  const normalized = normalizeKey(key);
  const candidates = [path.join(localRoot, normalized)];
  const [namespace, ...rest] = normalized.split("/");
  if (rest.length) candidates.push(path.join(process.cwd(), ".data", namespace, rest.join("/")));
  candidates.push(path.join(process.cwd(), ".data", normalized));
  return candidates;
}

async function existingLocalPath(key: string) {
  for (const candidate of localCandidates(key)) {
    try {
      await stat(candidate);
      return candidate;
    } catch {
      // Try the next compatible legacy location.
    }
  }
  return null;
}

export async function putObject(key: string, body: Buffer | Uint8Array, contentType: string): Promise<StorageObject> {
  const normalized = normalizeKey(key);
  if (isBlobStorageEnabled()) {
    const blob = await put(normalized, Buffer.from(body), {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: false,
      contentType,
      multipart: body.byteLength > 5 * 1024 * 1024,
    });
    return { key: blob.pathname, url: blob.url, sizeBytes: body.byteLength, contentType: blob.contentType };
  }

  const target = path.join(localRoot, normalized);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, body, { flag: "wx" });
  return { key: normalized, url: `/api/storage/${encodeURIComponent(normalized)}`, sizeBytes: body.byteLength, contentType };
}

export async function headObject(key: string) {
  const normalized = normalizeKey(key);
  if (isBlobStorageEnabled()) {
    try {
      const blob = await head(normalized);
      return { key: blob.pathname, url: blob.url, sizeBytes: blob.size, contentType: blob.contentType };
    } catch {
      return null;
    }
  }
  const filePath = await existingLocalPath(normalized);
  if (!filePath) return null;
  const file = await stat(filePath);
  return { key: normalized, url: `/api/storage/${encodeURIComponent(normalized)}`, sizeBytes: file.size, contentType: "application/octet-stream" };
}

export async function getObject(key: string, options: { range?: { start: number; end: number } } = {}): Promise<StorageRead | null> {
  const normalized = normalizeKey(key);
  if (isBlobStorageEnabled()) {
    const range = options.range;
    const result = await get(normalized, {
      access: "private",
      headers: range ? { Range: `bytes=${range.start}-${range.end}` } : undefined,
    });
    if (!result || result.statusCode !== 200) return null;
    const contentLength = Number(result.headers.get("content-length") || 0);
    return {
      stream: result.stream,
      sizeBytes: contentLength,
      contentType: result.headers.get("content-type") || "application/octet-stream",
      etag: result.headers.get("etag") || undefined,
    };
  }

  const filePath = await existingLocalPath(normalized);
  if (!filePath) return null;
  const file = await stat(filePath);
  const start = Math.max(0, options.range?.start ?? 0);
  const end = Math.min(file.size - 1, options.range?.end ?? file.size - 1);
  if (start > end || start >= file.size) return null;
  const stream = Readable.toWeb(createReadStream(filePath, { start, end })) as ReadableStream<Uint8Array>;
  return { stream, sizeBytes: end - start + 1, contentType: "application/octet-stream" };
}

export async function readObject(key: string) {
  const object = await getObject(key);
  if (!object) return null;
  const chunks: Uint8Array[] = [];
  const reader = object.stream.getReader();
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      chunks.push(chunk.value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
}

export async function deleteObject(key: string) {
  const normalized = normalizeKey(key);
  if (isBlobStorageEnabled()) {
    await del(normalized);
    return;
  }
  const filePath = await existingLocalPath(normalized);
  if (filePath) await unlink(filePath).catch(() => undefined);
}

export function dataUrlFromBuffer(bytes: Buffer, contentType: string) {
  return `data:${contentType};base64,${bytes.toString("base64")}`;
}

export async function storageObjectFromDataUrl(dataUrl: string, key: string) {
  const match = dataUrl.match(/^data:([^;,]+);base64,([\s\S]+)$/);
  if (!match) throw new Error("Audio data URL không hợp lệ.");
  return putObject(key, Buffer.from(match[2], "base64"), match[1]);
}

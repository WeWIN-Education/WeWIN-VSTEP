export const MAX_LEARNING_AUDIO_BYTES = 3 * 1024 * 1024;

export function validateLearningAudio(name: string, bytes: Uint8Array) {
  if (!/^[^/\\\r\n]{1,180}\.mp3$/i.test(name)) throw new Error("Chọn file MP3 hợp lệ.");
  if (bytes.length < 128 || bytes.length > MAX_LEARNING_AUDIO_BYTES) throw new Error("File MP3 phải có dữ liệu và không vượt quá 3 MB.");
  const id3 = bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33;
  const frame = bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0 && (bytes[1] & 0x06) !== 0;
  if (!id3 && !frame) throw new Error("Nội dung file không có định dạng MP3.");
}

export function audioRange(value: string | null, size: number): { start: number; end: number } | null {
  if (!value) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(value);
  if (!match || (!match[1] && !match[2])) throw new Error("Invalid range");
  const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
  const end = match[1] && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= size) throw new Error("Invalid range");
  return { start, end };
}

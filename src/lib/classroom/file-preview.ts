import "server-only";
import { prisma } from "@/lib/prisma";
import { readObject } from "@/lib/storage";
import { enqueue } from "./access";

export async function prepareFilePreview(id: string) {
  const file = await prisma.classroomFile.findUniqueOrThrow({ where: { id } });
  if (
    file.state !== "CLEAN" ||
    !file.cleanKey ||
    file.previewPageCount ||
    file.previewError
  )
    return;
  if (!["application/pdf", "image/jpeg", "image/png"].includes(file.mimeType))
    return;
  let count = 1,
    error: string | null = null;
  if (file.mimeType === "application/pdf") {
    const bytes = await readObject(file.cleanKey);
    if (!bytes) throw new Error("Không đọc được tệp để chuẩn bị bản xem.");
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const task = pdfjs.getDocument({
      data: new Uint8Array(bytes),
      useSystemFonts: false,
      stopAtErrors: true,
    });
    task.onPassword = () => {
      void task.destroy();
    };
    try {
      const doc = await task.promise;
      count = doc.numPages;
    } catch {
      error =
        "PDF bị lỗi hoặc có mật khẩu. Vui lòng tải bản PDF không khóa lên; bản gốc vẫn có thể tải về.";
    } finally {
      await task.destroy();
    }
  }
  await prisma.classroomFile.update({
    where: { id },
    data: { previewPageCount: error ? null : count, previewError: error },
  });
}
export async function queueMissingPreviews() {
  const files = await prisma.classroomFile.findMany({
    where: {
      state: "CLEAN",
      previewPageCount: null,
      previewError: null,
      mimeType: { in: ["application/pdf", "image/jpeg", "image/png"] },
    },
    select: { id: true },
    take: 100,
  });
  for (const file of files)
    await enqueue(prisma, `preview:${file.id}`, "FILE_PREVIEW", file.id);
}

import { getCurrentUser } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { getObject, headObject } from "@/lib/storage";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ materialId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { materialId } = await params;
  const material = await prisma.learningMaterial.findUnique({ where: { id: materialId } });
  if (!material || (!material.published && user.role !== "ADMIN")) return new NextResponse("Not found", { status: 404 });

  try {
    const storageKey = material.storageName.includes("/") ? material.storageName : `materials/${path.basename(material.storageName)}`;
    const metadata = await headObject(storageKey);
    const object = await getObject(storageKey);
    if (!metadata || !object) return new NextResponse("Not found", { status: 404 });
    const downloadName = material.fileName.replace(/[\r\n"]/g, "_");
    return new NextResponse(object.stream, {
      headers: {
        "Content-Type": material.mimeType,
        "Content-Length": String(metadata.sizeBytes),
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(downloadName)}`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}

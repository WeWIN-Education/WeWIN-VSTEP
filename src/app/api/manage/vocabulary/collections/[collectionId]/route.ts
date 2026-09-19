import { getCurrentUser } from "@/lib/access";
import { isSameOrigin } from "@/lib/request-security";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function DELETE(request: Request, { params }: { params: Promise<{ collectionId: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 403 });

  const actor = await getCurrentUser();
  if (!actor) return NextResponse.json({ error: "Bạn cần đăng nhập." }, { status: 401 });
  if (actor.role !== "ADMIN") return NextResponse.json({ error: "Chỉ quản trị viên được gỡ bộ từ vựng." }, { status: 403 });

  const { collectionId } = await params;
  const collection = await prisma.vocabularyCollection.findUnique({
    where: { id: collectionId },
    select: {
      id: true,
      code: true,
      name: true,
      kind: true,
      _count: { select: { topics: true, entries: true, imports: true } },
    },
  });

  if (!collection || collection.kind !== "VOCABULARY") {
    return NextResponse.json({ error: "Không tìm thấy bộ từ vựng cần gỡ." }, { status: 404 });
  }

  try {
    await prisma.$transaction(async (transaction) => {
      // Delete import history explicitly; the collection relation is SetNull by default.
      await transaction.vocabularyImport.deleteMany({ where: { collectionId: collection.id } });
      await transaction.vocabularyCollection.delete({ where: { id: collection.id } });
    });

    revalidatePath("/manage/vocabulary/import");
    revalidatePath("/vocabulary/topics");
    revalidatePath(`/vocabulary/topics/${collection.code}`);

    return NextResponse.json({
      deleted: {
        id: collection.id,
        code: collection.code,
        name: collection.name,
        topics: collection._count.topics,
        entries: collection._count.entries,
        imports: collection._count.imports,
      },
    });
  } catch (error) {
    console.error("Failed to delete vocabulary collection", error);
    return NextResponse.json({ error: "Không thể gỡ bộ từ vựng lúc này." }, { status: 500 });
  }
}

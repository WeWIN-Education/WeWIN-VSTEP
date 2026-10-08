import { classroomPageUser } from "@/lib/classroom/page";
import { FilePage } from "@/components/classroom/DocumentViewer";
export default async function Page({ params }: { params: Promise<{ fileId: string }> }) {
  await classroomPageUser("/classroom-files/[fileId]", false);
  return <FilePage id={(await params).fileId} />;
}

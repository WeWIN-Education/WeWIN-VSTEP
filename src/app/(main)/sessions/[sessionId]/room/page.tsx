import { Suspense } from "react";
import { ZoomRoom } from "@/components/classroom/ZoomRoom";
import { classroomPageUser } from "@/lib/classroom/page";
export default async function Page({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const user = await classroomPageUser("/sessions/[sessionId]/room", false);
  const { sessionId } = await params;
  return (
    <Suspense
      fallback={
        <div role="status" className="classroom-panel min-h-56">
          Đang chuẩn bị lớp học…
        </div>
      }
    >
      <ZoomRoom id={sessionId} role={user.role} />
    </Suspense>
  );
}

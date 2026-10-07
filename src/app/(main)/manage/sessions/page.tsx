import { Suspense } from 'react';
import { SessionManagement } from '@/components/classroom/Management';
import { classroomPageUser } from '@/lib/classroom/page';
export default async function Page() {
await classroomPageUser('/manage/sessions',true);

return <Suspense fallback={<div role="status" className="classroom-panel min-h-56">Đang chuẩn bị lớp học…</div>}><SessionManagement /></Suspense>;
}

import { Suspense } from 'react';
import { IntegrationManagement } from '@/components/classroom/Management';
import { classroomPageUser } from '@/lib/classroom/page';
export default async function Page() {
await classroomPageUser('/manage/integrations',true);

return <Suspense fallback={<div role="status" className="classroom-panel min-h-56">Đang chuẩn bị lớp học…</div>}><IntegrationManagement /></Suspense>;
}

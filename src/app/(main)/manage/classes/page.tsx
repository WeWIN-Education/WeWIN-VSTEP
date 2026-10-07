import { Suspense } from 'react';
import { ClassList } from '@/components/classroom/ClassList';
import { classroomPageUser } from '@/lib/classroom/page';
export default async function Page() {
const user = await classroomPageUser('/manage/classes',true);

return <Suspense fallback={<div role="status" className="classroom-panel min-h-56">Đang chuẩn bị lớp học…</div>}><ClassList role={user.role} manage/></Suspense>;
}

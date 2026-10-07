import { Suspense } from 'react';
import { ClassDetail } from '@/components/classroom/ClassDetail';
import { classroomPageUser } from '@/lib/classroom/page';
export default async function Page({params}:{params:Promise<{classId:string}>}) {
const user = await classroomPageUser('/classes/[classId]',false);
const {classId} = await params;
return <Suspense fallback={<div role="status" className="classroom-panel min-h-56">Đang chuẩn bị lớp học…</div>}><ClassDetail id={classId} role={user.role}/></Suspense>;
}

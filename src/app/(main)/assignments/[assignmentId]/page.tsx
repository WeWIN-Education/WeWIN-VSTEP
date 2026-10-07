import { Suspense } from 'react';
import { AssignmentPage } from '@/components/classroom/AssignmentPage';
import { classroomPageUser } from '@/lib/classroom/page';
export default async function Page({params}:{params:Promise<{assignmentId:string}>}) {
const user = await classroomPageUser('/assignments/[assignmentId]',false);
const {assignmentId} = await params;
return <Suspense fallback={<div role="status" className="classroom-panel min-h-56">Đang chuẩn bị lớp học…</div>}><AssignmentPage id={assignmentId} role={user.role}/></Suspense>;
}

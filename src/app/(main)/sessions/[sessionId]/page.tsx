import { Suspense } from 'react';
import { SessionPage } from '@/components/classroom/SessionPage';
import { classroomPageUser } from '@/lib/classroom/page';
export default async function Page({params}:{params:Promise<{sessionId:string}>}) {
const user = await classroomPageUser('/sessions/[sessionId]',false);
const {sessionId} = await params;
return <Suspense fallback={<div role="status" className="classroom-panel min-h-56">Đang chuẩn bị lớp học…</div>}><SessionPage id={sessionId} role={user.role}/></Suspense>;
}

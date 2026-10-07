import { classroomHTTP } from '@/lib/classroom/http';
export const runtime = 'nodejs';
async function handle(request: Request, {params}: {params: Promise<{path?:string[]}>}) { return classroomHTTP(request, ['classroom-options', ...((await params).path || [])]); }
export {handle as GET, handle as POST, handle as PATCH, handle as PUT, handle as DELETE};

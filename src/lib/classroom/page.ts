import "server-only";
import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/access";
import { classroomEnabled } from "./access";
export async function classroomPageUser(path: string, adminOnly = false) {
  if (!classroomEnabled()) notFound();
  const user = await getCurrentUser();
  if (!user) redirect(`/login?callbackUrl=${encodeURIComponent(path)}`);
  if (adminOnly && user.role !== "ADMIN") redirect("/classes");
  return user;
}

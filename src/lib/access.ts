import "server-only";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type LiveUser = NonNullable<Awaited<ReturnType<typeof findLiveUser>>>;

export type AuthState =
  | { kind: "anonymous" }
  | { kind: "invalid" }
  | { kind: "authenticated"; user: LiveUser };

async function findLiveUser(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, role: true, isActive: true, sessionVersion: true },
  });
}

/** Distinguishes a real guest from a stale/locked authenticated session. */
export async function getAuthState(): Promise<AuthState> {
  const session = await auth();
  if (!session?.user?.id) return { kind: "anonymous" };
  const user = await findLiveUser(session.user.id);
  if (!user?.isActive || user.sessionVersion !== session.user.sessionVersion) return { kind: "invalid" };
  return { kind: "authenticated", user };
}

/** A signed session is not sufficient: locks and password resets apply immediately. */
export async function getCurrentUser() {
  const state = await getAuthState();
  return state.kind === "authenticated" ? state.user : null;
}

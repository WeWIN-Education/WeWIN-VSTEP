import "server-only";

import { getAuthState } from "@/lib/access";
import { getGuestSession } from "@/lib/guest-exams";

export type AttemptOwner =
  | { kind: "user"; userId: string }
  | { kind: "guest"; guestSessionId: string };

/** Resolve the owner for an attempt request without allowing stale sessions to become guests. */
export async function getAttemptOwner(): Promise<AttemptOwner | { kind: "invalid" } | null> {
  const authState = await getAuthState();
  if (authState.kind === "invalid") return { kind: "invalid" };
  if (authState.kind === "authenticated") return { kind: "user", userId: authState.user.id };
  const guest = await getGuestSession();
  return guest ? { kind: "guest", guestSessionId: guest.id } : null;
}

export function ownerWhere(owner: AttemptOwner) {
  return owner.kind === "user" ? { userId: owner.userId } : { guestSessionId: owner.guestSessionId };
}

/**
 * Account mutations must come from the application origin. API clients and
 * same-origin requests may omit Origin, so absence is allowed for backwards
 * compatibility while an explicit mismatch is rejected.
 */
export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

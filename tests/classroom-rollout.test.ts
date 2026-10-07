import { afterEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  users: vi.fn().mockResolvedValue([]),
  create: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findMany: mocks.users, create: mocks.create } },
}));
vi.mock("@/lib/access", () => ({
  getCurrentUser: () => ({ id: "qa-admin", role: "ADMIN" }),
}));
vi.mock("@/lib/request-security", () => ({ isSameOrigin: () => true }));
import { GET, POST } from "../src/app/api/manage/users/route";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});
it("uses only the legacy learner enum when classrooms have not been migrated/enabled", async () => {
  vi.stubEnv("CLASSROOM_ENABLED", "false");
  expect(
    (await GET(new Request("http://localhost/api/manage/users"))).status,
  ).toBe(200);
  expect(mocks.users.mock.calls[0][0].where.role.in).toEqual(["LEARNER"]);
});
it("includes teachers only after enabling the module", async () => {
  vi.stubEnv("CLASSROOM_ENABLED", "true");
  await GET(new Request("http://localhost/api/manage/users"));
  expect(mocks.users.mock.calls[0][0].where.role.in).toEqual([
    "LEARNER",
    "TEACHER",
  ]);
});
it("refuses provisioning a teacher while the legacy schema may still be in use", async () => {
  vi.stubEnv("CLASSROOM_ENABLED", "false");
  const response = await POST(
    new Request("http://localhost/api/manage/users", {
      method: "POST",
      body: JSON.stringify({ role: "TEACHER" }),
    }),
  );
  expect(response.status).toBe(400);
  expect(mocks.create).not.toHaveBeenCalled();
});

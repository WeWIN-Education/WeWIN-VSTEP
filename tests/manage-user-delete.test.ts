import { beforeEach, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({ actor: vi.fn(), sameOrigin: vi.fn(), target: vi.fn(), remove: vi.fn(), blogs: vi.fn(), recordings: vi.fn(), posts: vi.fn(), materials: vi.fn(), storage: vi.fn() }));
vi.mock("@/lib/access", () => ({ getCurrentUser: mock.actor }));
vi.mock("@/lib/request-security", () => ({ isSameOrigin: mock.sameOrigin }));
vi.mock("@/lib/storage", () => ({ deleteObject: mock.storage }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn({ $executeRaw: vi.fn(), battlePlayer: { updateMany: vi.fn() }, user: { findUnique: mock.target, deleteMany: mock.remove }, blogPost: { deleteMany: mock.blogs }, examRecording: { findMany: mock.recordings }, userPost: { findMany: mock.posts }, learningMaterial: { findMany: mock.materials } }) } }));
import { DELETE } from "../src/app/api/manage/users/[userId]/route";
const request = (confirmation = "learner@example.com") => new Request("http://localhost/api/manage/users/student", { method: "DELETE", body: JSON.stringify({ confirmation }) });
const context = { params: Promise.resolve({ userId: "student" }) };
beforeEach(() => {
  vi.resetAllMocks(); mock.sameOrigin.mockReturnValue(true); mock.actor.mockResolvedValue({ id: "admin", role: "ADMIN" });
  mock.target.mockResolvedValue({ role: "LEARNER", email: "learner@example.com" }); mock.remove.mockResolvedValue({ count: 1 });
  mock.recordings.mockResolvedValue([{ storageKey: "exam-recordings/attempt/part.wav" }]); mock.posts.mockResolvedValue([]); mock.materials.mockResolvedValue([]);
});
it("rejects requests from another origin before accessing data", async () => {
  mock.sameOrigin.mockReturnValue(false);
  expect((await DELETE(request(), context)).status).toBe(403); expect(mock.target).not.toHaveBeenCalled();
});
it("does not allow learners to delete accounts", async () => {
  mock.actor.mockResolvedValue({ id: "other", role: "LEARNER" });
  expect((await DELETE(request(), context)).status).toBe(403); expect(mock.remove).not.toHaveBeenCalled();
});
it("protects admin accounts and requires exact confirmation", async () => {
  mock.target.mockResolvedValueOnce({ role: "ADMIN", email: "admin@example.com" });
  expect((await DELETE(request(), context)).status).toBe(404);
  expect((await DELETE(request("wrong"), context)).status).toBe(400); expect(mock.remove).not.toHaveBeenCalled();
});
it("deletes owned blogs and the learner before cleaning known audio objects", async () => {
  expect((await DELETE(request(), context)).status).toBe(200);
  expect(mock.blogs).toHaveBeenCalledWith({ where: { authorId: "student" } });
  expect(mock.remove).toHaveBeenCalledWith({ where: { id: "student", role: "LEARNER" } });
  expect(mock.storage).toHaveBeenCalledWith("exam-recordings/attempt/part.wav");
});
it("reports storage failure without claiming complete file cleanup", async () => {
  mock.storage.mockRejectedValue(new Error("storage offline"));
  const response = await DELETE(request(), context);
  expect(response.status).toBe(200); expect((await response.json()).warning).toContain("1 file");
});
it("does not delete files if the database operation fails", async () => {
  mock.remove.mockRejectedValue(new Error("database failure"));
  expect((await DELETE(request(), context)).status).toBe(500); expect(mock.storage).not.toHaveBeenCalled();
});

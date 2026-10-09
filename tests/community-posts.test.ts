import { beforeEach, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({ user: vi.fn(), sameOrigin: vi.fn(), create: vi.fn(), put: vi.fn(), remove: vi.fn() }));
vi.mock("@/lib/access", () => ({ getCurrentUser: mock.user }));
vi.mock("@/lib/request-security", () => ({ isSameOrigin: mock.sameOrigin }));
vi.mock("@/lib/prisma", () => ({ prisma: { userPost: { create: mock.create } } }));
vi.mock("@/lib/storage", () => ({ putObject: mock.put, deleteObject: mock.remove }));
import { POST } from "../src/app/api/posts/route";

beforeEach(() => {
  vi.resetAllMocks();
  mock.user.mockResolvedValue({ id: "learner" });
  mock.sameOrigin.mockReturnValue(true);
  mock.create.mockResolvedValue({ id: "post", status: "PENDING" });
});
function request(image?: File | string, title = "") {
  const form = new FormData(); form.set("body", "Chia sẻ kinh nghiệm luyện thi VSTEP."); form.set("title", title);
  if (image !== undefined) form.set("image", image);
  return new Request("http://localhost/api/posts", { method: "POST", body: form });
}
it.each([undefined, new File([], "", { type: "application/octet-stream" })])("accepts text-only posts including the browser's empty optional file", async image => {
  expect((await POST(request(image))).status).toBe(201);
  expect(mock.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ authorId: "learner", imageUrl: null, status: "PENDING" }) }));
  expect(mock.put).not.toHaveBeenCalled();
});
it.each(["unexpected", new File([], "empty.png", { type: "image/png" }), new File(["x"], "bad.exe")])("continues rejecting invalid attachments", async image => {
  expect((await POST(request(image))).status).toBeGreaterThanOrEqual(400);
  expect(mock.create).not.toHaveBeenCalled();
});
it("stores a supplied image and rejects oversized titles without silently truncating them", async () => {
  expect((await POST(request(undefined, "x".repeat(141)))).status).toBe(400);
  expect((await POST(request(new File(["image"], "image.png", { type: "image/png" })))).status).toBe(201);
  expect(mock.put).toHaveBeenCalledOnce();
});
it("retains authentication and same-origin checks", async () => {
  mock.sameOrigin.mockReturnValue(false);
  expect((await POST(request())).status).toBe(403);
  mock.sameOrigin.mockReturnValue(true); mock.user.mockResolvedValue(null);
  expect((await POST(request())).status).toBe(401);
  expect(mock.create).not.toHaveBeenCalled();
});

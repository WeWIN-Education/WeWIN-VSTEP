import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ actor: vi.fn(), sameOrigin: vi.fn(), find: vi.fn(), update: vi.fn(), remove: vi.fn(), storage: vi.fn() }));
vi.mock("@/lib/access", () => ({ getCurrentUser: mock.actor }));
vi.mock("@/lib/request-security", () => ({ isSameOrigin: mock.sameOrigin }));
vi.mock("@/lib/storage", () => ({ deleteObject: mock.storage }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { learningMaterial: { findUnique: mock.find, update: mock.update, delete: mock.remove } } }));
import { DELETE, PATCH } from "../src/app/api/manage/materials/[materialId]/route";
const context = { params: Promise.resolve({ materialId: "material" }) };
const request = (body: unknown) => new Request("http://localhost/api/manage/materials/material", { method: "POST", body: JSON.stringify(body) });
beforeEach(() => { vi.resetAllMocks(); mock.sameOrigin.mockReturnValue(true); mock.actor.mockResolvedValue({ role: "ADMIN" }); mock.find.mockResolvedValue({ id: "material", title: "Document", storageName: "materials/file.pdf" }); });
it("blocks learners from changing uploaded materials", async () => {
  mock.actor.mockResolvedValue({ role: "LEARNER" });
  expect((await DELETE(request({ confirmation: "Document" }), context)).status).toBe(403); expect(mock.remove).not.toHaveBeenCalled();
});
it("requires matching confirmation before deleting the database row and file", async () => {
  expect((await DELETE(request({ confirmation: "wrong" }), context)).status).toBe(400); expect(mock.storage).not.toHaveBeenCalled();
  expect((await DELETE(request({ confirmation: "Document" }), context)).status).toBe(200);
  expect(mock.remove).toHaveBeenCalledWith({ where: { id: "material" } }); expect(mock.storage).toHaveBeenCalledWith("materials/file.pdf");
});
it("validates edited metadata and retains the existing file", async () => {
  const valid = { title: "Updated", description: "Description", skill: "READING", level: "ALL", published: "false" };
  expect((await PATCH(request({ ...valid, skill: "INVALID" }), context)).status).toBe(400);
  expect((await PATCH(request(valid), context)).status).toBe(200);
  expect(mock.update).toHaveBeenCalledWith({ where: { id: "material" }, data: { title: "Updated", description: "Description", skill: "READING", level: null, published: false } });
  expect(mock.storage).not.toHaveBeenCalled();
});

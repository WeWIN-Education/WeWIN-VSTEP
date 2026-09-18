// Run against the local app. Creates and removes only its own QA accounts.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import nextEnv from "@next/env";
import { PrismaClient } from "@prisma/client";
import { encode } from "next-auth/jwt";

nextEnv.loadEnvConfig(process.cwd());
const base = process.env.QA_BASE_URL || "http://localhost:3000";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname), "QA is local only");
const db = new PrismaClient();
const ids = [];
async function create(role) {
  const user = await db.user.create({ data: { email: `role-qa-${randomUUID()}@example.invalid`, name: "Role QA", role } });
  ids.push(user.id);
  const token = await encode({ secret: process.env.AUTH_SECRET, salt: "authjs.session-token", token: { id: user.id, sub: user.id, role, sessionVersion: 0, name: user.name, email: user.email } });
  return { user, cookie: `authjs.session-token=${token}` };
}
async function request(path, cookie, method = "GET", body) {
  return fetch(base + path, { method, headers: { ...(cookie ? { cookie } : {}), ...(body ? { "Content-Type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined, redirect: "manual" });
}
try {
  const learner = await create("LEARNER");
  const admin = await create("ADMIN");
  for (const [label, cookie] of [["guest", ""], ["learner", learner.cookie]]) {
    const res = await request("/api/manage/users", cookie);
    assert.ok([401, 403].includes(res.status), `${label} cannot list accounts (${res.status})`);
  }
  const admins = await request("/api/manage/users", admin.cookie);
  assert.equal(admins.status, 200, "admin can list accounts");
  assert.ok(!(await admins.text()).includes("passwordHash"), "account list does not expose hashes");
  const active = await request("/api/video/progress?videoSlug=missing", learner.cookie);
  assert.equal(active.status, 404, "active learner passes authentication");
  await db.user.update({ where: { id: learner.user.id }, data: { isActive: false, sessionVersion: { increment: 1 } } });
  assert.equal((await request("/api/video/progress?videoSlug=missing", learner.cookie)).status, 401, "locked account is rejected immediately");
  await db.user.update({ where: { id: learner.user.id }, data: { isActive: true } });
  assert.equal((await request("/api/video/progress?videoSlug=missing", learner.cookie)).status, 401, "unlock does not revive old session");
  await db.user.update({ where: { id: admin.user.id }, data: { sessionVersion: { increment: 1 } } });
  assert.equal((await request("/api/manage/users", admin.cookie)).status, 401, "credential reset revokes old admin session");
  console.log("PASS: guest/user/admin API boundaries, account lock and session revocation, no password hashes.");
} finally {
  await db.user.deleteMany({ where: { id: { in: ids } } });
  await db.$disconnect();
}

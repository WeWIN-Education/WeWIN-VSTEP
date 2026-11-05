/** Import reviewed source files as drafts; publication remains an explicit admin action. */
import { prisma } from "../src/lib/prisma";
import { importGrammar } from "../src/lib/grammar";
import library from "../src/data/grammar-topics.json";

async function main() {
  const adminId = process.argv.find(arg => arg.startsWith("--admin="))?.slice(8);
  const slug = process.argv.find(arg => arg.startsWith("--topic="))?.slice(8);
  if (!adminId) throw new Error("Cần --admin=<ID tài khoản admin đang hoạt động>. Nội dung mới chỉ được nhập ở trạng thái nháp.");
  const topics = slug ? library.filter(topic => topic.slug === slug) : library;
  if (!topics.length) throw new Error("Không tìm thấy chuyên đề.");
  for (const topic of topics) {
    const row = await importGrammar(adminId, topic);
    console.log(`${String(row.number).padStart(2, "0")} ${row.title}: ${row.status}`);
  }
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Chưa nhập được nội dung."); process.exitCode = 1; }).finally(() => prisma.$disconnect());

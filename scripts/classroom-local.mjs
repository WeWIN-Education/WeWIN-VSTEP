import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
let settings;
try {
  settings = JSON.parse(await readFile(".qa/classroom-env.json", "utf8"));
} catch {
  console.error(
    "Không tìm thấy cấu hình QA riêng trong .qa/classroom-env.json. Xem docs/classroom-integration.md.",
  );
  process.exit(1);
}
if (
  !String(settings.DATABASE_URL).includes("localhost:5434/wewin_classroom_test")
) {
  console.error("Runner này chỉ dùng database thử local ở cổng 5434.");
  process.exit(1);
}
const args = process.argv.includes("--worker")
  ? [
      "--conditions=react-server",
      "--import",
      "tsx",
      "scripts/process-classroom-jobs.ts",
      "--loop",
    ]
  : [
      "node_modules/next/dist/bin/next",
      process.argv.includes("--build")
        ? "build"
        : process.argv.includes("--start")
          ? "start"
          : "dev",
      ...(!process.argv.includes("--build") && !process.argv.includes("--start")
        ? ["--turbopack"]
        : []),
    ];
const child = spawn(process.execPath, args, {
  env: { ...process.env, ...settings },
  stdio: "inherit",
});
child.on("exit", (code) => {
  process.exitCode = code || 0;
});

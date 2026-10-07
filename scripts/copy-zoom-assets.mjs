import { cp, mkdir } from "node:fs/promises";
await mkdir("public/zoom/6.5.0", { recursive: true });
for (const item of [
  "lib",
  "ui",
  "zoomus-websdk.umd.min.js",
  "zoomus-websdk-embedded.umd.min.js",
]) {
  await cp(
    `node_modules/@zoom/meetingsdk/dist/${item}`,
    `public/zoom/6.5.0/${item}`,
    { recursive: true },
  );
}

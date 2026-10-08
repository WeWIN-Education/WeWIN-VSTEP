import { cp, mkdir } from "node:fs/promises";
const dest = "public/pdfjs";
await mkdir(dest, { recursive: true });
await cp("node_modules/pdfjs-dist/build/pdf.worker.min.mjs", `${dest}/pdf.worker.min.mjs`);
for (const name of ["cmaps", "standard_fonts", "wasm"]) await cp(`node_modules/pdfjs-dist/${name}`, `${dest}/${name}`, { recursive: true });

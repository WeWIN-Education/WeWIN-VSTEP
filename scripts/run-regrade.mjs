import Module, { createRequire } from "node:module";
import "tsx/cjs";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local", quiet: true });
const require = createRequire(import.meta.url);
const resolve = Module._resolveFilename;
Module._resolveFilename = function (specifier, ...args) {
  return specifier === "server-only" ? require.resolve("next/dist/compiled/server-only/empty.js") : resolve.call(this, specifier, ...args);
};
require("./regrade-attempt.ts");

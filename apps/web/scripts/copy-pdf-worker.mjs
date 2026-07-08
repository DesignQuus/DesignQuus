import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const packageJson = require.resolve("pdfjs-dist/package.json");
const packageRoot = dirname(packageJson);
const source = resolve(packageRoot, "build/pdf.worker.min.mjs");
const target = resolve(process.cwd(), "public/pdf.worker.min.mjs");
await mkdir(dirname(target), { recursive: true });
await copyFile(source, target);
console.log(`Copied PDF.js worker to ${target}`);

import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const SRC = "node_modules/onnxruntime-web/dist";
const DEST = "public/ort";

const NEEDED_FILES = [
  "ort-wasm-simd-threaded.mjs",
  "ort-wasm-simd-threaded.wasm",
];

if (!existsSync(SRC)) {
  console.warn("[copy-ort] onnxruntime-web/dist not found, skipping");
  process.exit(0);
}

// Wipe public/ort/ first so stale files from previous builds don't linger
if (existsSync(DEST)) {
  await rm(DEST, { recursive: true, force: true });
}
await mkdir(DEST, { recursive: true });

const available = await readdir(SRC);
let copied = 0;

for (const f of NEEDED_FILES) {
  if (!available.includes(f)) {
    console.warn(`[copy-ort] WARNING: ${f} not found in ${SRC}`);
    continue;
  }
  await cp(join(SRC, f), join(DEST, f));
  copied++;
  console.log(`  + ${f}`);
}

if (copied === 0) {
  console.error("[copy-ort] ERROR: no ORT files were copied — the build will fail at runtime.");
  process.exit(1);
}

console.log(`[copy-ort] copied ${copied} of ${NEEDED_FILES.length} files to ${DEST}`);
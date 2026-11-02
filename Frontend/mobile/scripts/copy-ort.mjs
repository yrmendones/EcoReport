// Copies ONNX Runtime's WASM worker files to public/ort/ so that
// the worker is served from a standalone URL (bypasses the Vite worker
// bundling bug that injects "import '/@vite/env'" → "document is not defined").
import { cp, mkdir, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const SRC = "node_modules/onnxruntime-web/dist";
const DEST = "public/ort";

if (!existsSync(SRC)) {
  console.warn("[copy-ort] onnxruntime-web/dist not found, skipping");
  process.exit(0);
}

await mkdir(DEST, { recursive: true });

const files = await readdir(SRC);
let copied = 0;

for (const f of files) {
  // Only copy the worker-related files (ort-wasm-*.wasm / .mjs).
  // The main entry points (ort.mjs, ort.wasm.mjs, ort.all.mjs, ...) get
  // bundled into the app by Vite and don't need to be served separately.
  const isWorkerFile =
    (f.startsWith("ort-wasm-") && (f.endsWith(".wasm") || f.endsWith(".mjs")));

  if (!isWorkerFile) continue;

  await cp(join(SRC, f), join(DEST, f));
  copied++;
  console.log(`  + ${f}`);
}

console.log(`[copy-ort] copied ${copied} files to ${DEST}`);

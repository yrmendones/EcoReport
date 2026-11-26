let enginePromise;

async function getEngine() {
  if (!enginePromise) {
    enginePromise = (async () => {
      const [{ PaddleOCR }, ort] = await Promise.all([
        import("@paddleocr/paddleocr-js"),
        import("onnxruntime-web"),
      ]);
      const cores = navigator.hardwareConcurrency || 4;
      try {
        ort.env.wasm.numThreads = Math.max(1, Math.min(2, cores - 1));
        ort.env.wasm.simd = true;
        ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.31.1/dist/";
      } catch {
        // The PaddleOCR worker may still use its default WASM settings.
      }
      return PaddleOCR.create({
        lang: "en",
        ocrVersion: "PP-OCRv5",
        worker: true,
        ortOptions: {
          backend: "wasm",
          wasmPaths: "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.31.1/dist/",
          numThreads: Math.max(1, Math.min(2, cores - 1)),
          simd: true,
        },
      });
    })().catch((error) => {
      enginePromise = null;
      throw error;
    });
  }
  return enginePromise;
}

self.onmessage = async ({ data }) => {
  try {
    const engine = await getEngine();
    const results = await engine.predict(data.blob);
    self.postMessage({ id: data.id, results });
  } catch (error) {
    self.postMessage({
      id: data.id,
      error: error?.message || "Background OCR failed to process the ID image.",
    });
  }
};

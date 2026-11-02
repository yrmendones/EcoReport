import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: false,
        secure: false,
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: false,
        secure: false,
      },
    },
  },
  resolve: {
    alias: {
      // PaddleOCR imports the default `onnxruntime-web` entry, which bundles
      // the ~28 MB WebGPU/JSEP WASM. That exceeds Cloudflare Pages' 25 MiB
      // per-file limit. We force the CPU-only WASM backend anyway, so this
      // alias drops the dead WebGPU artifact and leaves only the ~13 MB CPU WASM.
      'onnxruntime-web': 'onnxruntime-web/wasm',
    },
  },
  optimizeDeps: {
    exclude: ['@paddleocr/paddleocr-js'],
    include: ['clipper-lib', '@techstark/opencv-js', 'js-yaml'],
  },
});
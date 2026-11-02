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
      'onnxruntime-web': 'onnxruntime-web/wasm',
    },
  },
  optimizeDeps: {
    exclude: ['@paddleocr/paddleocr-js'],
    include: ['clipper-lib', '@techstark/opencv-js', 'js-yaml'],
  },
});
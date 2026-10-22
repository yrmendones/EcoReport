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
      // API calls → forwarded to local backend
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: false, // Preserve Host header so file URLs work
        secure: false,
      },
      // Uploaded files (photos, videos, profile pics) → forwarded to backend
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: false,
        secure: false,
      },
    },
  },
});
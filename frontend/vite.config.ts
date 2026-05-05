import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
// Полный стек без Vite: `docker compose up` → UI на http://127.0.0.1:8080 (nginx + статика).
// Ниже — только для локального `npm run dev` (HMR).
// По умолчанию весь `/api` идёт на монолит `uvicorn app.main:app` :8000.
// Если подняты микросервисы локально на 8001–8004, задайте VITE_API_MICRO=true (см. прокси ниже).
export default defineConfig(({ mode }) => ({
  server: {
    host: "127.0.0.1",
    port: 8080,
    hmr: {
      overlay: false,
    },
    proxy: process.env.VITE_API_MICRO === "true"
      ? {
          "^/api/v1/auth": { target: "http://127.0.0.1:8001", changeOrigin: true },
          "^/api/v1/users": { target: "http://127.0.0.1:8001", changeOrigin: true },
          "^/api/v1/reports": { target: "http://127.0.0.1:8004", changeOrigin: true },
          "^/api/v1/notifications": { target: "http://127.0.0.1:8003", changeOrigin: true },
          "^/api/v1/audit": { target: "http://127.0.0.1:8003", changeOrigin: true },
          "^/api/internal": { target: "http://127.0.0.1:8002", changeOrigin: true },
          "/api": { target: "http://127.0.0.1:8002", changeOrigin: true },
        }
      : {
          "/api": {
            target: "http://127.0.0.1:8000",
            changeOrigin: true,
          },
        },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
}));

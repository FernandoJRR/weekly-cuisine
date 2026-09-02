import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
  plugins: [react()],
  server: {
    // @wc/types and @wc/engine are Bun workspace symlinks to raw .ts outside apps/web,
    // so Vite needs filesystem access to the monorepo root to serve them.
    fs: { allow: ["../.."] },
    // Dev convenience: same-origin API calls. Production uses VITE_API_URL + backend CORS.
    proxy: {
      "/api": {
        target: process.env["VITE_PROXY_TARGET"] ?? "http://localhost:3000",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ""),
      },
    },
  },
  // Linked workspace source, not a prebundled dep — let Vite compile it in the graph.
  optimizeDeps: { exclude: ["@wc/types", "@wc/engine"] },
})

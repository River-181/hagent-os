import path from "path"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

const uiPort = Number(process.env.UI_PORT ?? process.env.VITE_PORT ?? 5174)
const apiPort = Number(process.env.API_PORT ?? 3200)

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true,
    port: uiPort,
    strictPort: true,
    proxy: {
      "/api": {
        target: `http://localhost:${apiPort}`,
        ws: true,
      },
    },
  },
})

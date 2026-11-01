import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";

// The labs are built into the Jekyll site as static files. GitHub Pages
// runs Jekyll only (no Node), so the build output is committed.
//   entry : assets/sd-lab/sd-lab.js  (stable name, referenced by _layouts/garden.html)
//   chunks: assets/sd-lab/chunks/*   (one lazy chunk per lab)
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: "/assets/sd-lab/",
  build: {
    outDir: resolve(import.meta.dirname, "../assets/sd-lab"),
    emptyOutDir: true,
    cssCodeSplit: false,
    rollupOptions: {
      input: resolve(import.meta.dirname, "src/main.tsx"),
      output: {
        entryFileNames: "sd-lab.js",
        chunkFileNames: "chunks/[name]-[hash].js",
        assetFileNames: "chunks/[name]-[hash][extname]",
      },
    },
  },
  server: { open: "/dev.html" },
});

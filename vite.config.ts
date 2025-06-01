import { defineConfig } from "vite";
import { resolve } from "path";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    cors: {
      origin: "https://www.owlbear.rodeo",
    },
  },
  build: {
    assetsInlineLimit: 0,
    rollupOptions: {
      input: {
        menu: resolve(__dirname, "menu.html"),
        background: resolve(__dirname, "background.html"),
        importModal: resolve(__dirname, "src/menu/modal.html"),
      },
    },
  },
});

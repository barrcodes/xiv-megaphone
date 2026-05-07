import { defineConfig } from "electron-vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  main: {
    build: {
      outDir: resolve(__dirname, "build/main"),
      rollupOptions: {
        input: { index: resolve(__dirname, "src/main/index.ts") },
        external: ["speaker", "ws", "@inworld/tts"],
      },
    },
    resolve: {
      alias: {
        shared: resolve(__dirname, "src/shared"),
        "tts-client": resolve(__dirname, "src/tts-client"),
      },
    },
  },
  preload: {
    build: {
      outDir: resolve(__dirname, "build/preload"),
      rollupOptions: {
        input: { index: resolve(__dirname, "src/preload/index.ts") },
      },
    },
    resolve: {
      alias: {
        shared: resolve(__dirname, "src/shared"),
      },
    },
  },
  renderer: {
    root: resolve(__dirname, "src/mainview"),
    build: {
      outDir: resolve(__dirname, "build/renderer"),
      rollupOptions: {
        input: { index: resolve(__dirname, "src/mainview/index.html") },
      },
    },
    plugins: [react()],
    resolve: {
      alias: {
        "@": resolve(__dirname, "src/mainview"),
      },
    },
  },
});

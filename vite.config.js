import { defineConfig } from "vite";
import { visualizer } from "rollup-plugin-visualizer";
import { resolve } from "node:path";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
    base: "./",
    build: {
        target: "esnext",
        sourcemap: true,
        rollupOptions: {
            input: { index: resolve(__dirname, "index.html") },
        },
    },
    esbuild: {
        pure: ["console.log"],
    },
    plugins: [visualizer()],
    clearScreen: false,
    server: {
        port: 1420,
        strictPort: true,
        host: host || false,
        hmr: host
            ? {
                  protocol: "ws",
                  host,
                  port: 1421,
              }
            : undefined,
        watch: {
            ignored: ["**/src-tauri/**"],
        },
    },
});

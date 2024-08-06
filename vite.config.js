import { defineConfig } from "vite";
import { visualizer } from "rollup-plugin-visualizer";
import { resolve } from "node:path";

export default defineConfig({
    base: "./",
    build: {
        target: "esnext",
        sourcemap: true,
        rollupOptions: {
            input: { index: resolve(__dirname, "index.html"), docs: resolve(__dirname, "docs/docs.html") },
        },
    },
    esbuild: {
        pure: ["console.log"],
    },
    plugins: [visualizer()],
});

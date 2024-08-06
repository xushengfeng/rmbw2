import { defineConfig } from "vite";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
    base: "./",
    build: { target: "esnext", sourcemap: true },
    esbuild: {
        pure: ["console.log"],
    },
    plugins: [visualizer()],
});

import { defineConfig } from "vite";

export default defineConfig({
    base: "./",
    build: { target: "esnext", sourcemap: true },
    esbuild: {
        pure: ["console.log"],
    },
});

import { defineConfig } from "vite";

export default defineConfig({
    base: "./",
    build: { target: "esnext" },
    esbuild: {
        pure: ["console.log"],
    },
});

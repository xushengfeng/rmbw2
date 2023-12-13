import { defineConfig } from "vite";
export default defineConfig({
    base: "./",
    esbuild: {
        pure: ["console.log"],
    },
});

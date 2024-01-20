import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig({
    base: "./",
    esbuild: {
        pure: ["console.log"],
    },
    plugins: [
        nodePolyfills({
            // To add only specific polyfills, add them here. If no option is passed, adds all polyfills
            include: ["buffer", "crypto", "stream"],
            exclude: ["fs"],
            // Whether to polyfill specific globals.
            globals: {
                Buffer: true, // can also be 'build', 'dev', or false
                global: true,
                process: true,
            },
        }),
    ],
});

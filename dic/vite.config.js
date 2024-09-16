import { defineConfig } from "vite";
import { resolve } from "node:path";

const name = "rmbw-dic";

export default defineConfig({
    // 打包配置
    build: {
        lib: {
            entry: resolve(__dirname, "src/main.ts"),
            name: name,
            fileName: (format) => `${name}.${format}.js`,
        },
    },
});

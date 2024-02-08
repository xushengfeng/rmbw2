import download from "download";

await download("https://github.com/googlefonts/noto-emoji/raw/main/fonts/NotoColorEmoji.ttf", "./assets", {
    rejectUnauthorized: false,
});

import Mdict from "js-mdict";
import fs from "fs";

let dic = new Mdict.default("/home/xsf/Downloads/朗文双解/朗文双解.mdx");

let out = {};

for (let i of dic.keyList) {
    try {
        out[i.keyText] = { text: dic.fetch_defination(i).definition };
    } catch (error) {}
}

fs.writeFile("out.json", JSON.stringify({ id: "lw", dic: out }, null, 2), function (err) {});

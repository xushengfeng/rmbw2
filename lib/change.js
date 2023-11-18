import Mdict from "js-mdict";
import fs from "fs";

let dic = new Mdict.default("/home/xsf/Downloads/朗文双解/朗文双解.mdx");

function lookupDic(word) {
    word = word.trim();
    let list = dic.keyList;
    for (let i of list) {
        if (i.keyText === word) {
            return dic.fetch_defination(i);
        }
    }
    return {
        keyText: word,
        definition: null,
    };
}

let out = {};

for (let i of dic.keyList) {
    try {
        out[i.keyText] = dic.fetch_defination(i);
    } catch (error) {}
}

function searchDic(text) {
    console.log(lookupDic(text));

    let def = lookupDic(text).definition;

    return mainDiv;
}

fs.writeFile("out.json", "var dic=" + JSON.stringify(out, null, 2), function (err) {});

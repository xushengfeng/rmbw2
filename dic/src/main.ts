type dic0 = {
    version: 0;
    id: string;
    name: string;
    author: string;
    lang: string;
    textType: "html" | "text";
    template?: string;
    dic: Record<
        string,
        {
            text: string;
            isAlias: boolean;
        }
    >;
};

type dic = {
    version: 1;
    id: string;
    name: string;
    author: string;
    lang: string;
    textType: "html" | "text";
    template?: `${string}\${body}${string}`;
    dic: Record<
        string,
        | string
        | {
              alias: string; // 指向存在内容的key，不允许指向另一个alias
          }
    >;
};

type dicMap = Omit<dic, "dic"> & {
    dic: Map<string, string | { alias: string }>;
};

type canParseType = string | any;

function map2obj(data) {
    function w(obj: Record<string, any>) {
        if (!obj) return;
        for (const key of Object.keys(obj)) {
            if (obj[key] instanceof Map) {
                const x = {};
                for (const [k, v] of obj[key]) {
                    x[k] = v;
                }
                obj[key] = x;
            }
            if (typeof obj[key] === "object") {
                w(obj[key]);
            }
        }
    }
    w(data);
    return data;
}

function versionTransfer(data: canParseType): dicMap {
    if (typeof data === "string") {
        const json = JSON.parse(data);
        return versionTransfer(json);
    }
    if (!data || typeof data !== "object" || !("version" in data))
        return {
            version: 1,
            id: crypto.randomUUID(),
            name: "",
            author: "",
            lang: "",
            textType: "text",
            dic: new Map(),
        };

    const newData = map2obj(data) as dic0 | dic;

    if (newData.version === 0) {
        const dic: dic["dic"] = {};
        for (const key in newData.dic) {
            if (newData.dic[key].isAlias) {
                dic[key] = { alias: newData.dic[key].text };
            } else {
                dic[key] = newData.dic[key].text;
            }
        }
        const finalData = {
            ...newData,
            version: 1,
            dic,
        } as const;
        return versionTransfer(finalData);
    }
    if (newData.version === 1) {
        const map = new Map(Object.entries(newData.dic));
        return {
            ...newData,
            dic: map,
        };
    }
}

function parse(data: canParseType) {
    const dict = versionTransfer(data);
    const map = dict.dic;
    const meta = {} as Omit<dic, "dic">;
    for (const key in dict) {
        if (key === "dic") continue;
        meta[key] = dict[key];
    }
    function template(content?: string) {
        const template = meta.template || "${body}";
        if (!template.includes("${body}")) return content || "";
        return template.replaceAll("${body}", content || "");
    }
    return {
        meta: meta as Omit<dic, "dic">,
        keys: dict.dic.keys,
        getContent(word: string) {
            if (!map.has(word)) return template();
            const item = map.get(word);
            if (typeof item === "object") {
                return template(map.get(item.alias) as string);
            }
            return template(item);
        },
        map: dict,
        export: () => map2obj(dict) as dic,
    };
}

// 摘自 https://github.com/unjs/nanotar
function tar(buffer: ArrayBuffer) {
    const filesMap = new Map<string, { data: Uint8Array; text: string; base64: string }>();

    let offset = 0;

    while (offset < buffer.byteLength - 512) {
        const name = _readString(buffer.slice(offset, offset + 100));
        if (name.length === 0) {
            break;
        }
        const size = _readNumber(buffer.slice(offset + 124, offset + 124 + 12));
        const data = new Uint8Array(buffer, offset + 512, size);

        if (!name.startsWith("PaxHeader"))
            filesMap.set(name, {
                data,
                get text() {
                    return new TextDecoder().decode(data);
                },
                get base64() {
                    const binString = Array.from(data, (byte) => String.fromCodePoint(byte)).join("");
                    return btoa(binString);
                },
            });

        offset += 512 + Math.ceil(size / 512) * 512;
    }

    return filesMap;
}

function _readString(buffer: ArrayBuffer) {
    const view = new Uint8Array(buffer);
    const i = view.indexOf(0);
    const td = new TextDecoder();
    return td.decode(view.slice(0, i));
}

function _readNumber(buffer: ArrayBuffer) {
    const view = new Uint8Array(buffer);
    const str = String.fromCharCode(...view);
    return Number.parseInt(str, 8);
}

export { parse as dicParse, tar as dicResouces, type dic0, type dic, type dicMap };

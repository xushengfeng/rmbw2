/// <reference types="vite/client" />

import {
    ele,
    view,
    pack,
    frame,
    a,
    txt,
    p,
    pText,
    trackPoint,
    textarea,
    button,
    type ElType,
    input,
    spacer,
    initDev,
    image,
    select,
    label,
    radioGroup,
    check,
    setProperties,
} from "dkh-ui";

import localforage from "localforage";
import { extendPrototype } from "localforage-setitems";
extendPrototype(localforage);
import { dicParse, dic, type dicMap } from "../dic/src/main";
import { hyphenate } from "hyphen/en";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts-browserify";
import { type Card, createEmptyCard, generatorParameters, FSRS, Rating, State } from "ts-fsrs";
import spark from "spark-md5";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin, { type Region } from "wavesurfer.js/dist/plugins/regions";
import RecordPlugin from "wavesurfer.js/dist/plugins/record";
import Pitchfinder from "pitchfinder";
import Peer, { type DataConnection } from "peerjs";
import Fuse from "fuse.js";
import diff_match_patch, { type Diff } from "diff-match-patch";
import "diff-match-patch-line-and-word";
import autoFun from "auto-fun";
import fixWebmDuration from "webm-duration-fix";

import Sortable from "sortablejs";
import { encode } from "js-base64";

import very_ok_svg from "../assets/icons/very_ok.svg";
import githubIcon from "../assets/other/Github.svg";

type Book = {
    name: string;
    shortName?: string;
    id: string;
    visitTime: number;
    updateTime: number;
    type: "word" | "text" | "package" | "dictionary";
    wordSplit?: "grapheme" | "word";
    cover?: string;
    author?: string;
    titleParse?: string;
    titleIndex?: number[];
    description?: string;
    sections: string[];
    canEdit: boolean;
    lastPosi: number;
    language: string;
};
type Section = {
    title: string;
    text: string;
    words: {
        [key: string]: {
            id: string;
            index: TxtSlice;
            cIndex: TxtSlice;
            visit: boolean;
            type: "word" | "sentence";
        };
    };
    lastPosi: number;
    note?: string;
};
type OnlineBook = Omit<Book, "visitTime" | "sections" | "lastPosi"> & {
    sections: {
        id: string;
        title: string;
        path: string;
    }[];
};

type WordBookList = ({ text: string; id: string } & (
    | { type: "ignore"; c: undefined; means: number }
    | { type: "learn"; c: record; means: number }
    | { type: null; c: undefined; means: number }
))[];

type WordSortType = "raw" | "az" | "za" | "10" | "01" | "random";

type ReSlice = [number, number] & { readonly __tag: unique symbol };
type TxtSlice = [number, number] & { readonly __tag: unique symbol }; // 文章绝对定位

type record = {
    word: string;
    means: {
        text: string;
        contexts: {
            text: string;
            index: ReSlice; // 语境定位
            source: { book: string; sections: string; id: string }; // 原句通过对比计算
        }[];
        card_id: string;
        tags?: bOp;
    }[];
    note?: string;
};
type record2 = {
    text: string;
    trans: string;
    source: { book: string; sections: string; id: string }; // 原句通过对比计算
    note?: string;
};

enum tOp {
    and = 0,
    or = 1,
    not = 2,
}

type bOp = [tOp, ...(string | bOp)[]];
type bOp2 = [tOp, ...string[]];
type TAG = { c: string; b?: bOp; t: number; n: number };
type tagMap = { [key: string]: TAG };

type senNode = ({ text: senNode; isPost: boolean } | string)[];

type AIm = { role: "system" | "user" | "assistant"; content: string }[];

type D = Parameters<Parameters<ReturnType<typeof tts.toStream>["onEnd"]>[0]>["0"];

type FlatWord = {
    index: number;
    text: string;
    card_id: record["means"][0]["card_id"];
    context: record["means"][0]["contexts"][0];
    tag: bOp;
};

type Review = "word" | "spell" | "sentence";

type CardPercent = Record<State, number>;

type OnlineDicsType = { name: string; url: string; lan: string }[];

type AllData = {
    bookshelf: { [key: string]: Book };
    sections: { [key: string]: Section };
    cards: object;
    words: object;
    spell: object;
    card2word: object;
    card2sentence: object;
    actions: object;
    logExTrans: object;
};

type CacheData = {
    transCache: object;
    lijuCache: object;
};

// data

const hyphenChar = "·";

const ignoreWordSection = "ignore";

const wordSection = "words";

const coreWordBook: Book = {
    canEdit: true,
    id: "0",
    language: "en",
    lastPosi: 0,
    name: "词典",
    sections: [wordSection, ignoreWordSection],
    type: "word",
    updateTime: 0,
    visitTime: 0,
};

let nowBook = {
    book: "",
    sections: "", //!!! 现在假定一定有section
};

let isWordBook = false;

const tmpSections = new Map<string, Section>();

let contentP: string[] = [];

let wordFreq: { [word: string]: number } = {};
let properN: string[] = [];

const t推荐mark = new Set<string>();

const WordSortPath = "words.sort";

const bookStyleList = {
    fontSize: [] as number[],
    lineHeight: [] as number[],
    contentWidth: [] as number[],
};

for (let i = 12; i <= 28; i += 2) {
    bookStyleList.fontSize.push(i);
}
bookStyleList.fontSize.push(32, 40, 56, 72, 96, 128);
for (let i = 20; i <= 60; i += 5) {
    bookStyleList.contentWidth.push(i);
}
for (let i = 10; i <= 26; i += 2) {
    bookStyleList.lineHeight.push(i / 10);
}

const defaultBookStyle = {
    fontSize: 6,
    lineHeight: 3,
    contentWidth: 4,
    fontFamily: "serif",
    fontWeight: 400,
    theme: "auto",
    paper: true,
};

let canRecordScroll = true;
let contentScrollPosi = 0;

let isEdit = false;
let editText = "";

let dicTransAi: AbortController | null;

let nowDicId = "";

const dics: Record<string, Omit<dic, "dic">> = {};

let dicFun: { changeContext: () => void; trackDic: () => void } | null = null;

let readTime = Number.NaN;

let ipa: Map<string, string | string[]>;

const checkVisit = {
    section: "",
    time: 0,
};

let aiContexts: Record<string, { text: string }> = {};

let reviewSortType: "正常" | "学习" | "学习1" | "紧急" | "随机" = "正常";

const KEYBOARDDISPLAYPATH = "spell.keyboard.display";
const KEYBOARDHEIGHTPATH = "spell.keyboard.height";

let spellWriteE: PointerEvent | null;
let spellWriteCtx: CanvasRenderingContext2D | null;

let due: {
    word: {
        id: string;
        card: Card;
    }[];
    spell: {
        id: string;
        card: Card;
    }[];
    sentence: {
        id: string;
        card: Card;
    }[];
} = {
    word: [],
    spell: [],
    sentence: [],
};

let reviewType: Review = "word";

let reviewCount = 0;

const startYear = 2024;
const nowYear = new Date().getFullYear();

const ttsConfig = {
    voice: "tts.voice",
    engine: "tts.engine",
} as const;

const SHOWPTTS = "pTTS_show";

let autoPlay = false;

const readerSettingPath = { apostrophe: "reader.apostrophe" };

const onlineDicsPath = "dics.online";

const defaultOnlineDic: OnlineDicsType = [
    { name: "必应", url: "https://cn.bing.com/search?q=%s", lan: "" },
    { name: "汉典", url: "https://www.zdic.net/hans/%s", lan: "cn" },
    {
        name: "剑桥",
        url: "https://dictionary.cambridge.org/zhs/%E8%AF%8D%E5%85%B8/%E8%8B%B1%E8%AF%AD-%E6%B1%89%E8%AF%AD-%E7%AE%80%E4%BD%93/%s",
        lan: "en",
    },
    { name: "牛津", url: "https://www.oed.com/search/dictionary/?scope=Entries&q=%s", lan: "en" },
    { name: "柯林斯", url: "https://www.collinsdictionary.com/zh/dictionary/english-chinese/%s", lan: "en" },
    { name: "韦氏", url: "https://www.merriam-webster.com/dictionary/%s", lan: "en" },
    { name: "词源在线", url: "https://www.etymonline.com/cn/word/%s", lan: "en" },
];

const textCacheIdPath = "file.text.id";

const rmbwJsonName = "rmbw.json";
const rmbwZipName = "rmbw.zip";

const rmbwGithub1 = "data.json";
const rmbwGithub2 = "text.json";

const DAVConfigPath = { url: "webStore.dav.url", user: "webStore.dav.user", passwd: "webStore.dav.passwd" };

const GitHubConfigPath = {
    user: "webStore.github.user",
    repo: "webStore.github.repo",
    token: "webStore.github.token",
    path: "webStore.github.path",
    download: "webStore.github.download",
};

const ServerConfigPath = {
    url: "webStore.server.url",
    path: "webStore.server.path",
    versionBase: "webStore.server.version.base",
    versionUid: "webStore.server.version.uid",
    versionChanged: "webStore.server.version.changed",
};

let isSetData = false;

let willShowMenu = false;

const DICSHOW = "dic_show";
const MARKWORD = "mark_word";
const TMPMARKWORD = "tmp_mark_word";
const VISITMARKWORD = "visit_mark_word";
const TRANSLATE = "translate";
const DICSENTENCE = "dic_sentence";
const HIDEMEANS = "hide_means";
const TODOMARK = "to_visit";
const TODOMARK1 = "to_visit1";
const UNREAD = "unread";
const NOTEDIALOG = "note_dialog";
const AIDIALOG = "ai_dialog";
const DICDIALOG = "dic_dialog";
const SELECTEDITEM = "selected_item";
const LITLEPROGRESS = "litle_progress";
const SHOWMARKLIST = "show_mark_word_list";
const BUTTONHIGHTLIGHT = "button_highlight";

// const fun

const Segmenter = Intl.Segmenter;

const timeD = {
    s: (n: number) => n * 1000,
    m: (n: number) => n * timeD.s(60),
    h: (n: number) => n * timeD.m(60),
    d: (n: number) => n * timeD.h(24),
};

const dmp = new diff_match_patch();

const wordAi = {
    mean: (sourceLan: string, userLan: string) => {
        const f = new autoFun.def({
            input: { word: "string 单词", context: "string 单词所在的语境" },
            output: {
                mean1: `string ${sourceLan}释义`,
                mean2: `string ${userLan}释义`,
            },
            script: [
                "翻译$context",
                "分析$word在$context这个上下文语境中的具体意思",
                `根据意思，返回用${sourceLan}解释的$mean1和用${userLan}解释的$mean2`,
            ],
        });
        return f;
    },
    meanEmoji: () => {
        const f = new autoFun.def({
            input: { word: "string 单词" },
            output: { mean: "string 用emoji表示的意思" },
            script: ["根据context中word的意思，返回emoji"],
        });
        return f;
    },
    synOpp: () => {
        const f = new autoFun.def({
            input: { word: "string 单词", context: "string 单词所在的语境" },
            output: { list0: "string[] 同义词", list1: "string[] 近义词", list2: "string[] 近义词" },
            script: [
                "判断context中word的意思",
                "若存在该语境下能进行同义替换的词，添加到list0同义词表，同义词应比word更简单",
                "克制地添加若干近义词到list1",
                "克制地添加若干反义词到list2",
            ],
        });
        return f;
    },
    fix: () => {
        const f = new autoFun.def({
            input: { word: "string 单词" },
            output: { list: `{ type: "prefix" | "root" | "suffix"; t: string; dis: string }[]词根词缀列表` },
            script: ["分析word词根词缀", "根据测试例,依次将词根词缀添加到list"],
            test: {
                input: "unbelievably",
                output: {
                    list: [
                        { type: "prefix", t: "un", dis: "否定" },
                        { type: "root", t: "believe", dis: "相信" },
                        { type: "suffix", t: "able", dis: "能" },
                        { type: "suffix", t: "ly", dis: "副词" },
                    ],
                },
            },
        });
        return f;
    },
    etymology: () => {
        const f = new autoFun.def({
            input: { word: "string 单词" },
            output: { list: "string[]词源" },
            script: ["分析word词源并返回他们"],
        });
        return f;
    },
};

const wordAiText = {
    mean: (x: { mean1: string; mean2: string }) => {
        return `${x.mean1}\n${x.mean2}`;
    },
    meanEmoji: (x: { mean: string }) => {
        return x.mean;
    },
    synOpp: (x: { list0: string[]; list1: string[]; list2: string[] }) => {
        const text = [];
        if (x.list0?.length) text.push(`= ${x.list0.join(", ")}`);
        if (x.list1?.length) text.push(`≈ ${x.list1.join(", ")}`);
        if (x.list2?.length) text.push(`- ${x.list2.join(", ")}`);
        return text.join("\n");
    },
    fix: (f: { list: { type: "prefix" | "root" | "suffix"; t: string; dis: string }[] }) => {
        const text = wordFix2str(f.list);
        return text.join(" + ");
    },
    etymology: (x: { list: string[] }) => {
        return x.list.join(", ");
    },
};

const sentenceAi = {
    gm: async (sentence: string) => {
        type splitS = ({ text: string; isPost: boolean } | string)[];
        const f = new autoFun.def({
            input: { sentence: "string 句子" },
            output: { split: "({ text: string; isPost: boolean } | string)[]" },
            script: [
                "分析sentence修饰成分和被修饰成分",
                "被修饰成分包括主谓宾核心词或词组，修饰成分包括具有限定或修饰的词、词组或从句",
                "将他们按顺序添加到split",
                "被修饰成分直接以string形式添加到split",
                "修饰成分以{ text: string 修饰成分; isPost: boolean }形式添加到split",
                "对于修饰成分，如果修饰成分在被修饰成分之后，isPost 为 true，反之为false",
                "如果这个句子不是一个完整句，只有修饰成分，直接返回split:[该句子]",
            ],
            test: [
                {
                    input: "The yong",
                    output: {
                        split: ["The yong"] as splitS,
                    },
                },
                {
                    input: "The yong man who walled to us is our teacher",
                    output: {
                        split: [
                            { text: "The yong", isPost: false },
                            "man",
                            { text: "who walled to us", isPost: true },
                            "is",
                            { text: "our", isPost: false },
                            "teacher",
                        ] as splitS,
                    },
                },
            ],
        });
        async function splitSen(sentence: string) {
            const t: senNode = [];
            // @ts-ignore
            const l = (await f.run(`sentence:${sentence}`).result).split as splitS;
            for (const i of l) {
                if (typeof i === "string") {
                    t.push(i);
                } else {
                    const x: senNode[0] = { text: [i.text], isPost: i.isPost };
                    x.text = await splitSen(i.text);
                }
            }
            return t;
        }
        const x = await splitSen(sentence);
        console.log(x);
        return x;
    },
    split: (sentence: string) => {
        const f = new autoFun.def({
            input: { sentence: "string 长句子" },
            output: { shortSentences: "string[] 短句子" },
            script: ["将sentence改写成几个短句，输出到shortSentences"],
        });
        return f.run(`sentence:${sentence}`).result as Promise<{ shortSentences: string[] }>;
    },
};

const reviewHotkey: { [key: string]: { f: () => void; key: string } } = {
    1: { key: "1", f: () => {} },
    2: { key: "2", f: () => {} },
    3: { key: "3", f: () => {} },
    show: { key: " ", f: () => {} },
};

const synth = window.speechSynthesis;

const tts = new MsEdgeTTS();

const localForage = {
    createInstance: <data = any>(
        p: Parameters<LocalForage["createInstance"]>[0],
    ): {
        setItem: (key: string, data: data) => Promise<data>;
        getItem: (key: string) => Promise<data | null>;
        removeItem: (key: string) => Promise<void>;
        iterate<U>(
            iteratee: (value: data, key: string, iterationNumber: number) => U,
            callback?: (err: Error, result: U) => void,
        ): Promise<U>;
        keys(callback?: (err: Error, keys: string[]) => void): Promise<string[]>;
        clear(callback?: (err: Error) => void): Promise<void>;
    } => localforage.createInstance(p),
};

const textCacheId = () => setting.getItem(textCacheIdPath);
const updataTextId = (id: string) => setting.setItem(textCacheIdPath, id);

function uuid() {
    if (crypto.randomUUID) {
        return crypto.randomUUID().slice(0, 8);
    }
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16).slice(0, 8);
    });
}

function time() {
    return new Date().getTime();
}

function getSetting(p: string) {
    if (!p) return "";
    return JSON.parse(localStorage.getItem(`setting/${p}`) as string);
}

function splitWord(text: string, book: Book) {
    return Array.from(new Segmenter(book.language, { granularity: book.wordSplit || "word" }).segment(text));
}

async function getBooksById(id: string) {
    if (id === coreWordBook.id) return coreWordBook;
    return await bookshelfStore.getItem(id);
}
async function getSection(id: string) {
    let s = tmpSections.get(id) ?? (await sectionsStore.getItem(id));
    if (id === wordSection) {
        if (!s) {
            s = newSection();
        }
        const l: string[] = [];
        await wordsStore.iterate((v) => {
            l.push(v.word);
        });
        const text = l.join("\n");
        s.title = "words";
        s.text = text;
    }
    return s;
}

async function getSectionBook(id: string) {
    let bookId = "";
    let book: Book | null = null;
    await bookshelfStore.iterate((v, k) => {
        if (v.sections.includes(id)) {
            bookId = k;
            book = v;
        }
    });
    return { book, bookId };
}

async function sectionWords(id: string) {
    const section = await getSection(id);
    if (!section) return Object.entries({}) as [];
    return Object.entries(section.words);
}

async function sectionRemenber(section: Section) {
    const data: { id: string; r: number }[] = [];
    if (!section) return data;
    const now = Date.now();
    for (const [k, v] of Object.entries(section.words)) {
        if (v.visit) {
            if (v.type === "word") {
                const word = await wordsStore.getItem(v.id);
                if (!word) continue;
                const cardId = word.means.find((i) => i.contexts.find((c) => c.source.id === k))?.card_id;
                if (!cardId) continue;
                const card = await cardsStore.getItem(cardId);
                if (!card) continue;
                const r = fsrs.get_retrievability(card, now, false);
                if (r !== undefined) {
                    data.push({ id: v.id, r: r });
                }
            }
        }
    }
    return data;
}

async function sectionWordsSort() {
    const sectionIds = new Map<string, Section>();
    const sectionData = new Map<string, number>();

    await sectionsStore.iterate((value, key) => {
        sectionIds.set(key, value);
    });
    for (const [k, v] of sectionIds) {
        const data = await sectionRemenber(v);
        if (data.length === 0) continue;
        const allR = data.map((i) => i.r).reduce((a, b) => a + b, 0) / data.length;
        sectionData.set(k, allR);
    }
    const sortMap = Array.from(sectionData.entries()).sort((a, b) => a[1] - b[1]);
    return sortMap;
}

async function checkEmptyBook(book: Book) {
    const e = true;
    for (const sis of book.sections) {
        if ((await sectionWords(sis)).length) {
            return false;
        }
    }
    return e;
}

async function getBookShortTitle(bookId: string) {
    return (await getBooksById(bookId))?.shortName || (await getBooksById(bookId))?.name || "无名书籍";
}

function getSectionTitle(book: Book, sectionId: string, sectionTitle: string, parse?: boolean) {
    let st = sectionTitle;
    if (parse && book.titleParse) {
        const i = book.sections.indexOf(sectionId);
        st = book.titleParse.replaceAll("{i}", String(book.titleIndex?.[i] || i + 1)).replaceAll("{t}", sectionTitle);
    }
    return st;
}

async function newBook() {
    const id = uuid();
    const sid = uuid();
    const book: Book = {
        name: "新书",
        id: id,
        visitTime: 0,
        updateTime: 0,
        type: "text",
        sections: [sid],
        canEdit: true,
        lastPosi: 0,
        language: "en",
    };
    const s = newSection();
    bookshelfStore.setItem(id, book);
    await sectionsStore.setItem(sid, s);
    return { book: id, sections: sid };
}

function newSection() {
    const s: Section = { title: "新章节", lastPosi: 0, text: "", words: {} };
    return s;
}

async function getBookCover(url: string) {
    const src = `${await getOnlineBooksUrl()}/source/${url}`;
    return src;
}

async function getOnlineBooksUrl() {
    return (
        ((await setting.getItem("onlineBooks.url")) as string) ||
        "https://raw.githubusercontent.com/xushengfeng/rmbw-book/master"
    ).replace(/\/$/, "");
}

async function saveLanguagePackage(lan: string, section: { id: string; path: string }[]) {
    const fetchPromises = section.map(async (item) => {
        const { id, path } = item;
        const response = await fetch(`${await getOnlineBooksUrl()}/source/${path}`);
        const content = await response.json();
        return { id, content };
    });
    Promise.all(fetchPromises).then(async (results) => {
        console.log(results);
        for (const i of results) {
            const map = new Map();
            for (const x in i.content) {
                map.set(x, i.content[x]);
            }
            if (i.id === "ipa") {
                ipaStore.setItem(lan, map);
            }
            if (i.id === "variant") {
                variantStore.setItem(lan, map);
            }
            if (i.id === "map") {
                wordMapStore.setItem(lan, i.content);
                usSpell = i.content;
            }

            if (i.id === "etymology") {
                const d = (await etymologyStore.getItem(lan)) || {
                    words: new Map<string, string>(),
                    roots: new Map<string, string[]>(),
                };
                d.words = map;
                await etymologyStore.setItem(lan, d);
            }
            if (i.id === "etymology_root") {
                const d = (await etymologyStore.getItem(lan)) || {
                    words: new Map<string, string>(),
                    roots: new Map<string, string[]>(),
                };
                d.roots = map;
                await etymologyStore.setItem(lan, d);
            }
        }
    });
}

function sortWordList(list: WordBookList, type: WordSortType) {
    if (type === "raw") return list;
    if (type === "az")
        return list.toSorted((a, b) => {
            return a.text.localeCompare(b.text, studyLan);
        });
    if (type === "za")
        return list.toSorted((a, b) => {
            return b.text.localeCompare(a.text, studyLan);
        });

    function m(l: typeof list) {
        const ig: typeof list = [];
        const ul: typeof list = [];
        const learnt: typeof list = [];
        for (const i of l) {
            if (i.type) {
                if (i.type === "ignore") ig.push(i);
                else learnt.push(i);
            } else ul.push(i);
        }
        return {
            ig,
            ul,
            l: learnt.toSorted((a, b) => (a.means ?? 0) - (b.means ?? 0)),
        };
    }
    if (type === "01") {
        const x = m(list);
        return x.ul.concat(x.l).concat(x.ig);
    }
    if (type === "10") {
        const x = m(list);
        return x.ig.concat(x.l.toReversed()).concat(x.ul);
    }
    return randomList(list, true);
}

function randomList<i>(list: i[], to?: boolean) {
    let rn = list.length;
    const nList = to ? structuredClone(list) : list;
    while (rn) {
        const r = Math.floor(Math.random() * rn--);
        const a = structuredClone(nList[rn]);
        nList[rn] = nList[r];
        nList[r] = a;
    }
    return nList;
}

async function textTransformer(text: string) {
    if (await setting.getItem(readerSettingPath.apostrophe)) {
        return text.replace(/’(\w)/g, "'$1");
    }
    return text;
}

function findPitch(peaks: Float32Array, sampleRate: number) {
    const algo = "AMDF";
    const detectPitch = Pitchfinder[algo]({ sampleRate });
    const duration = peaks.length / sampleRate;
    const bpm = peaks.length / duration / 60;

    const frequencies = Pitchfinder.frequencies(detectPitch, peaks, {
        tempo: bpm,
        quantization: bpm,
    });

    // Find the baseline frequency (the value that appears most often)
    const frequencyMap: Record<number, number> = {};
    let maxAmount = 0;
    let baseFrequency = 0;
    for (let frequency of frequencies) {
        if (!frequency) continue;
        const tolerance = 10;
        frequency = Math.round(frequency * tolerance) / tolerance;
        if (!frequencyMap[frequency]) frequencyMap[frequency] = 0;
        frequencyMap[frequency] += 1;
        if (frequencyMap[frequency] > maxAmount) {
            maxAmount = frequencyMap[frequency];
            baseFrequency = frequency;
        }
    }

    return {
        frequencies,
        baseFrequency,
    };
}

function cleanWordBook(text: string) {
    return Array.from(new Set(text.split("\n")))
        .map((w) => w.trim())
        .filter((i) => i)
        .join("\n");
}

function diffPosi(oldText: string, text: string) {
    const diff = dmp.diff_main(oldText, text);
    console.log(diff);
    const source: number[] = [0];
    const map: number[] = [0];
    if (diff.at(-1)?.[0] === 1) diff.push([0, ""]);
    let p0 = 0;
    let p1 = 0;
    for (let i = 0; i < diff.length; i++) {
        const d = diff[i];
        const dn = diff[i + 1];
        if (d[0] === -1 && dn && dn[0] === 1) {
            p0 += d[1].length;
            p1 += dn[1].length;
            source.push(p0);
            map.push(p1);
            i++;
        } else {
            if (d[0] === 0) {
                p0 += d[1].length;
                p1 += d[1].length;
                source.push(p0);
                map.push(p1);
            } else if (d[0] === 1) {
                p1 += d[1].length;
                source.push(p0);
                map.push(p1);
            } else if (d[0] === -1) {
                p0 += d[1].length;
                source.push(p0);
                map.push(p1);
            }
        }
    }
    source.push(oldText.length);
    map.push(text.length);
    console.log(source, map);
    return { source, map };
}

function changePosi(section: Section, text: string) {
    const { source, map } = diffPosi(section.text, text);
    for (const w in section.words) {
        section.words[w].index = patchPosi(source, map, section.words[w].index);
        section.words[w].cIndex = patchPosi(source, map, section.words[w].cIndex);
    }
    return section;
}

function patchPosi<i extends [number, number]>(source: number[], map: number[], index: i) {
    const start = index[0];
    const end = index[1];
    let Start = 0;
    let End = 0;
    for (let i = 0; i < source.length; i++) {
        if (source[i] <= start && start <= source[i + 1]) {
            Start = Math.min(map[i] + (start - source[i]), map[i + 1]);
        }
        if (source[i] <= end && end <= source[i + 1]) {
            End = Math.min(map[i] + (end - source[i]), map[i + 1]);
        }
    }
    return [Start, End] as i;
}

function textAi(text: string) {
    const l = text.split("\n");
    let index = 0;
    const ignoreMark = "//";
    const userMark = ">";
    const aiMark = "ai:";
    const aiM: AIm = [];
    for (const i of l) {
        if (i.startsWith(aiMark)) {
            aiM.push({ role: "assistant", content: i.replace(aiMark, "").trim() });
        } else if (i.startsWith(userMark)) {
            aiM.push({ role: "user", content: i.replace(userMark, "").trim() });
        } else if (i.startsWith(ignoreMark)) {
            index += i.length + 1;
            continue;
        } else {
            const last = aiM.at(-1);
            if (last) last.content += `\n${i}`;
        }
        index += i.length + 1;
    }
    return aiM;
}

async function wordBooksByWord(word: string) {
    const l: { book: string; section: string }[] = [];
    const words = mutiSpell(word);
    let bookList: Book[] = [];
    await bookshelfStore.iterate((book) => {
        bookList.push(book);
    });
    bookList = bookList.filter((b) => b.type === "word");
    for (const i of bookList) {
        for (const s of i.sections) {
            const section = await getSection(s);
            if (!section) continue;
            const wl = section.text.split("\n");
            for (const w of words) {
                if (wl.includes(w)) {
                    if (!l.some((x) => x.section === s)) l.push({ book: i.id, section: s });
                }
            }
        }
    }

    return l;
}

function lemmatizer(word: string) {
    return variant?.get(word) || word;
}

function tag(tags: tagMap) {
    const x = {
        get: (id: string) => tags[id],
        getCid: (c: string) => {
            for (const i in tags) {
                if (tags[i].c === c) {
                    return i;
                }
            }
            return null;
        },
        getAll: (b: bOp2) => {
            function w(b: bOp) {
                const l: bOp = [b[0]];
                const ids = b.slice(1) as string[];
                for (const id of ids) {
                    const t = x.get(id);
                    if (t.b) {
                        l.push(w(t.b));
                    } else {
                        l.push(id);
                    }
                }
                return l as bOp2;
            }
            return w(b);
        },
        simplily: (b: bOp) => {
            return b;
        },
        new: (c: string, b?: bOp) => {
            const id = uuid();
            const t = time();
            tags[id] = { c, t, n: 1 };
            if (b) tags[id].b = b;
            return tags;
        },
        getList: () => {
            const l: [string, TAG][] = [];
            for (const i in tags) {
                l.push([i, tags[i]]);
            }
            l.sort((a, b) => a[1].t - b[1].t);
            return l;
        },
    };
    return x;
}

async function getAllMarks() {
    const sectionId = nowBook.sections;
    const section = await getSection(sectionId);
    let list: { id: string; s: Section["words"][0] }[] = [];
    if (!section) return list;
    for (const i in section.words) {
        list.push({ id: i, s: section.words[i] });
    }
    list = list.toSorted((a, b) => a.s.index[0] - b.s.index[0]);
    return list;
}

// @ts-ignore
function states<t extends Record<string, (v, oldV) => void>>(states: t) {
    const s = new Map<keyof t, t[keyof t]>();
    // @ts-ignore
    const x = {};
    for (const [k, v] of Object.entries(states)) {
        // @ts-ignore
        const setK = (newV) => {
            const oldV = s.get(k);
            s.set(k, newV);
            return oldV;
        };
        // @ts-ignore
        x[k] = {
            get: () => structuredClone(s.get(k)),
            // @ts-ignore
            set: (newV) => {
                const oldV = setK(newV);
                // @ts-ignore
                if (oldV !== newV) v(newV, oldV);
                // todo obj diff
                console.log(`set ${k}:`, structuredClone(newV));
                return newV;
            },
            // @ts-ignore
            setV: (newV) => {
                setK(newV);
                return newV;
            },
            // @ts-ignore
            setAsync: async (newV) => {
                const oldV = setK(newV);
                console.trace();
                // @ts-ignore
                if (oldV !== newV) await v(newV, oldV);
                console.log(`${k}:`, structuredClone(newV));
                return newV;
            },
        };
    }
    return x as {
        [k in keyof t]: {
            get: () => Parameters<t[k]>["0"];
            set: (v: Parameters<t[k]>["0"]) => Parameters<t[k]>["0"];
            setV: (v: Parameters<t[k]>["0"]) => Parameters<t[k]>["0"];
            setAsync: (v: Parameters<t[k]>["0"]) => Promise<Parameters<t[k]>["0"]>;
        };
    };
}

async function getWordFromDic(word: string, id: string) {
    const d = dicParse(await dicStore.getItem(id));
    return d.getContent(word);
}

async function saveCard(v: {
    key: string;
    index: TxtSlice;
    cindex: TxtSlice;
}) {
    const sectionId = nowBook.sections;
    const section = await getSection(sectionId);
    if (!section) return;
    for (const i in section.words) {
        const index = section.words[i].index;
        if (index[0] <= v.index[0] && v.index[1] <= index[1] && section.words[i].type === "word") {
            return i;
        }
    }
    const id = uuid();
    section.words[id] = {
        id: v.key,
        index: v.index,
        cIndex: v.cindex,
        visit: false,
        type: "word",
    };
    section.words = Object.fromEntries(Object.entries(section.words).toSorted((a, b) => a[1].index[0] - b[1].index[0]));

    sectionsStore.setItem(sectionId, section);
    wordMarkChanged(section?.words);
    return id;
}

function source2context(source: Section["words"][0], sourceId: string) {
    return {
        text: editText.slice(...source.cIndex),
        index: [source.index[0] - source.cIndex[0], source.index[1] - source.cIndex[0]] as [number, number],
        source: { ...nowBook, id: sourceId },
    };
}

function rmWord(record: record | null, sourceId: string) {
    const Word = flatWordCard(record, sourceId);
    const i = Word.index;
    if (i === -1 || !record) return record;
    for (const index in record.means) {
        const m = record.means[index];
        if (Number(index) === i) {
            m.contexts = m.contexts.filter((c) => c.source.id !== sourceId);
            break;
        }
    }
    return record;
}
async function clearWordMean(record: record | null) {
    if (!record) return;
    const means: record["means"] = [];
    for (const m of record.means) {
        if (m.contexts.length === 0) {
            await card2word.removeItem(m.card_id);
            await cardsStore.removeItem(m.card_id);
        } else {
            means.push(m);
        }
    }
    if (means.length === 0) {
        await wordsStore.removeItem(record.word);
        await spellStore.removeItem(record.word);
    } else {
        record.means = means;
        await wordsStore.setItem(record.word, record);
    }
}

async function translate(st: string, f?: boolean) {
    const tst = st.trim();
    if (!f) {
        const text = (await transCache.getItem(tst)) as string;
        if (text) return { text, stop: new AbortController() };
    }

    const output = ai(
        [
            {
                role: "system",
                content:
                    "You are a professional, authentic translation engine. You only return the translated text, without any explanations.",
            },
            {
                role: "user",
                content: `Please translate into ${navigator.language} (avoid explaining the original text):\n\n${tst}`,
            },
        ],
        "翻译",
    );
    output.text.then((text) => {
        if (text) transCache.setItem(tst, text);
    });
    return output;
}

function wordFix2str(f: { type: "prefix" | "root" | "suffix"; t: string; dis: string }[]) {
    const text = [];
    for (const ff of f) {
        let t = ff.t;
        if (ff.type === "prefix") t = `${t}-`;
        if (ff.type === "suffix") t = `-${t}`;
        if (ff.dis) t += ` (${ff.dis})`;
        text.push(t);
    }
    return text;
}

function sentenceGm(t: senNode) {
    function get(T: senNode) {
        let text = "";
        for (const t of T) {
            if (typeof t === "string") {
                text += t;
            } else {
                let tx = get(t.text);
                if (t.isPost) tx = `<(${tx})`;
                else tx = `(${tx})>`;
                text += tx;
            }
        }
        return text;
    }
    return get(t);
}

function getTextWordValue(words: string[]) {
    const xw = [
        "to",
        "a",
        "an",
        "the",
        "in",
        "out",
        "on",
        "at",
        "with",
        "by",
        "of",
        "for",
        "from",
        "be",
        "is",
        "are",
        "were",
        "was",
        "been",
        "will",
        "would",
        "that",
        "who",
        "why",
        "what",
        "which",
        "when",
        "how",
        "have",
        "has",
        "had",
        "did",
        "done",
        "do",
        "some",
        "any",
        "all",
        "if",
        "then",
        "and",
        "or",
        "so",
        "because",
        "as",
        "very",
        "it",
        "they",
        "he",
        "she",
    ];

    const output: { text: string; value: number }[] = [];
    for (const _i of words) {
        const i = _i.toLocaleLowerCase();
        if (xw.includes(i)) {
            output.push({ text: i, value: 0.2 });
        } else if (i === " " || (i.length === 1 && i !== "i")) {
            output.push({ text: i, value: 0 });
        } else {
            output.push({ text: i, value: 1 });
        }
    }

    return output;
}

async function updateVersion() {
    if (!(await setting.getItem(ServerConfigPath.versionChanged))) {
        setting.setItem(ServerConfigPath.versionChanged, true);
        const oldV = (await setting.getItem(ServerConfigPath.versionBase)) || 0;
        setting.setItem(ServerConfigPath.versionBase, oldV + 1);
        setting.setItem(ServerConfigPath.versionUid, uuid());
    }
}

function onCardChange() {
    updateVersion();
}

function setCardAction(cardId: string, time: Date, rating: Rating, state: State, duration: number) {
    const o: [string, Rating, State, number] = [cardId, rating, state, duration];
    cardActionsStore.setItem(String(time.getTime()), o);
    onCardChange();
}
function setCardAction2(cardId: string, time: Date) {
    const o: [string] = [cardId];
    cardActionsStore.setItem(String(time.getTime()), o);
    onCardChange();
}
function newCardAction(id: string) {
    setCardAction2(id, new Date());
}

async function tryInitWord(word: string) {
    const w = await wordsStore.getItem(word);
    if (!w) {
        const w = {
            word: word,
            means: [],
        };
        const card2 = createEmptyCard();
        newCardAction(word);
        if (!(await spellStore.getItem(word))) await spellStore.setItem(word, card2);
        await wordsStore.setItem(word, w);
        return w;
    }
    return w;
}

async function newWordCard_Mean(word: string) {
    const cardId = uuid();
    const card = createEmptyCard();
    newCardAction(cardId);
    await cardsStore.setItem(cardId, card);
    await card2word.setItem(cardId, word);
    return cardId;
}

function flatWordCard(record: record | null, id: string) {
    const Word: FlatWord = {
        index: -1,
        card_id: "",
        text: "",
        context: { index: [Number.NaN, Number.NaN] as ReSlice, source: { book: "", sections: "", id: "" }, text: "" },
        tag: [tOp.and],
    };
    if (!record) return Word;
    for (const n in record.means) {
        const i = record.means[n];
        for (const j of i.contexts) {
            if (j.source.id === id) {
                Word.index = Number(n);
                Word.card_id = i.card_id;
                Word.text = i.text;
                Word.context = j;
                if (i.tags) Word.tag = i.tags;
                return Word;
            }
        }
    }
    return Word;
}

function fillMutiSpell(rl: Set<string>) {
    const l = new Set<string>();
    const m: { [key: string]: string[] } = {};
    for (const i of usSpell) {
        for (const j of i) {
            m[j] = i;
        }
    }
    for (const w of rl) {
        if (m[w]) {
            for (const x of m[w]) l.add(x);
        } else {
            l.add(w);
        }
    }
    return l;
}

function mutiSpell(word: string) {
    return usSpell.find((m) => m.includes(word)) || [word];
}

async function getGoodLearntWords() {
    const learnt = new Set<string>();
    const goodCards = new Set<string>();
    await cardsStore.iterate((card, k) => {
        if (card.state === State.Review) {
            goodCards.add(k);
        }
    });
    await wordsStore.iterate((v, k) => {
        if (v.means.some((i) => goodCards.has(i.card_id))) {
            learnt.add(k);
        }
    });
    return fillMutiSpell(learnt);
}

async function getIgnoreWords() {
    const section = await getSection(ignoreWordSection);
    if (!section) return new Set<string>();
    const rl = new Set(section.text.trim().split("\n"));
    return fillMutiSpell(rl);
}

async function addIgnore(word: string | string[]) {
    const words = Array.isArray(word) ? word : [word];
    const section = await getSection(ignoreWordSection);
    if (!section) return;
    const oldWords = section.text.trim().split("\n");
    for (const word of words) {
        if (!oldWords.includes(word)) {
            oldWords.push(word);
        }
    }
    section.text = oldWords.join("\n");
    await sectionsStore.setItem(ignoreWordSection, section);
}
async function removeIgnore(word: string) {
    const section = await getSection(ignoreWordSection);
    if (!section) return;
    const oldWords = section.text.trim().split("\n");
    if (!oldWords.includes(word)) return;
    section.text = oldWords.filter((w) => w !== word).join("\n");
    await sectionsStore.setItem(ignoreWordSection, section);
    if (!(await wordsStore.getItem(word))) {
        // 移除添加的拼写
        spellStore.removeItem(word);
    }
}

function etymologyParse(word: string) {
    const x = word.match(/(\(\w+\)|>\w+>|<\w+<)/g);
    if (!x) return [];
    return x.map((i) =>
        i.startsWith(">")
            ? { type: "suffix", t: i.slice(1, -1) }
            : i.startsWith("<")
              ? { type: "prefix", t: i.slice(1, -1) }
              : { type: "root", t: i.slice(1, -1) },
    ) as { type: "prefix" | "root" | "suffix"; t: string }[];
}

function etymologyParseMore(s: { type: "prefix" | "root" | "suffix"; t: string }[]) {
    return s.map((i) => (i.type === "prefix" ? `${i.t}-` : i.type === "suffix" ? `-${i.t}` : `${i.t}`)).join(" ");
}

function analyzeMorphemes(components: string[], target: string) {
    function find(item: string, l: string, start: number) {
        let xv = 0;
        let startIndex = start;
        for (let i = 0; i < 3; i++) {
            const clip = l.slice(i + start, i + start + item.length);
            const diff = dmp.diff_main(item, clip);
            const v =
                diff
                    .filter((i) => i[0] === 0)
                    .map((i) => i[1])
                    .reduce((a, b) => a + b.length, 0) / item.length;
            if (v >= xv) {
                xv = v;
                startIndex = i + start;
            }
        }

        return startIndex;
    }

    const l: number[] = [];

    let index = 0;
    for (const i of components) {
        const x = find(i, target, index);
        l.push(x);
        index = x + i.length - 1;
    }

    const r: Diff[][] = [];

    for (const [n, clipIndex] of l.entries()) {
        const item = components.at(n)!;
        const srcClip = target.slice(clipIndex, l.at(n + 1) ?? target.length);
        const diff = dmp.diff_main(item, srcClip);
        r.push(diff);
    }

    return r;
}

function sortRootChanges(root: string, l: { t: string; morphems: string[] }[]) {
    l.push({ t: root, morphems: [root] });
    function smallInclude(a: string[], b: string[]): [boolean, number] {
        const [long, short] = [a, b];
        for (let start = 0; start <= long.length - short.length; start++) {
            for (let s = 0; s < short.length; s++) {
                if (long[start + s] !== short[s]) break;
                if (s === short.length - 1) {
                    if (start === 0 && long.length === short.length) return [false, 0];
                    return [true, start];
                }
            }
        }
        return [false, 0];
    }

    const c2p = new Map<(typeof l)[number], { p: (typeof l)[number]; index: number }>();

    for (const a of l) {
        for (const b of l) {
            const [is, index] = smallInclude(a.morphems, b.morphems);
            if (is) {
                if (c2p.has(a)) {
                    const x = c2p.get(a)!;
                    const [is2] = smallInclude(b.morphems, x.p.morphems);
                    if (is2) {
                        c2p.set(a, { p: b, index: index });
                    }
                } else {
                    c2p.set(a, { p: b, index });
                }
            }
        }
    }

    return c2p;
}

async function getWordsScope() {
    const books = getSelectBooks(reviewScope);
    const ignore = await getIgnoreWords();
    const b = books.book;
    if (books.word.length === 0) return { words: null, ignore, books: b };
    const words: string[] = [];
    for (const book of books.word) {
        const w = (await getSection(book))?.text.trim().split("\n") ?? [];
        words.push(...w);
    }
    return { words, ignore: words.filter((i) => ignore.has(i)), books: b };
}

function filterWithScope(word: string, scope: string[] | null, exScope?: string[]) {
    if (exScope?.includes(word)) return false;
    return !scope || scope.includes(word);
}

async function getFutureReviewDue(days: number, ...types: Review[]) {
    let now = new Date().getTime();
    now += timeD.d(days);
    now = Math.round(now);
    const ws = await getWordsScope();
    const wordsScope = ws.words;
    const wordList: { id: string; card: Card }[] = [];
    const spellList: { id: string; card: Card }[] = [];
    const sentenceList: { id: string; card: Card }[] = [];

    const dueL: Map<string, Card> = new Map();
    await cardsStore.iterate((card, k) => {
        if (card.due.getTime() < now) {
            dueL.set(k, card);
        }
    });

    if (types.includes("word"))
        await wordsStore.iterate((v, k) => {
            if (filterWithScope(k, wordsScope)) {
                for (const m of v.means) {
                    if (
                        dueL.has(m.card_id) &&
                        (ws.books.length === 0 || m.contexts.find((b) => ws.books.includes(b.source.book)))
                    )
                        wordList.push({ id: m.card_id, card: dueL.get(m.card_id) as Card });
                }
            }
        });
    if (types.includes("spell")) {
        await spellStore.iterate((value, key) => {
            if (value.due.getTime() < now) {
                if (spellIgnore.el.value === "all")
                    if (filterWithScope(key, wordsScope)) spellList.push({ id: key, card: value });
                if (spellIgnore.el.value === "exIgnore")
                    if (filterWithScope(key, wordsScope, Array.from(ws.ignore)))
                        spellList.push({ id: key, card: value });
                if (spellIgnore.el.value === "ignore")
                    if (filterWithScope(key, Array.from(ws.ignore))) spellList.push({ id: key, card: value });
            }
        });
    }

    if (types.includes("sentence"))
        for (const key of await card2sentence.keys()) {
            if (dueL.has(key)) {
                sentenceList.push({ id: key, card: dueL.get(key) as Card });
            }
        }
    return { word: wordList, spell: spellList, sentence: sentenceList };
}
async function getReviewDue(type: Review) {
    const now = new Date().getTime();
    const wordList: { id: string; card: Card }[] = [];
    const spellList: { id: string; card: Card }[] = [];
    const sentenceList: { id: string; card: Card }[] = [];
    for (const i of due.word) {
        if (i.card.due.getTime() < now) {
            wordList.push(i);
        }
    }
    for (const i of due.spell) {
        if (i.card.due.getTime() < now) {
            spellList.push(i);
        }
    }
    for (const i of due.sentence) {
        if (i.card.due.getTime() < now) {
            sentenceList.push(i);
        }
    }
    for (const x of [wordList, spellList, sentenceList]) x.sort((a, b) => a.card.due.getTime() - b.card.due.getTime());
    if (reviewSortType === "学习")
        for (const x of [wordList, spellList, sentenceList])
            x.reverse().sort((a, b) => (a.card.state === State.New ? -1 : 1));
    if (reviewSortType === "学习1")
        for (const x of [wordList, spellList, sentenceList]) x.sort((a, b) => (a.card.state === State.New ? -1 : 1));
    if (reviewSortType === "紧急") {
        function gRe(fsrs: FSRS, c: Card) {
            return fsrs.get_retrievability(c, now, false) ?? 0;
        }
        wordList.sort((a, b) => gRe(fsrs, a.card) - gRe(fsrs, b.card));
        spellList.sort((a, b) => gRe(fsrsSpell, a.card) - gRe(fsrsSpell, b.card));
        sentenceList.sort((a, b) => gRe(fsrsSen, a.card) - gRe(fsrsSen, b.card));
    }
    if (reviewSortType === "随机") for (const x of [wordList, spellList, sentenceList]) randomList(x);
    if (type === "word") {
        return wordList[0];
    }
    if (type === "spell") {
        return spellList[0];
    }
    return sentenceList[0];
}

async function nextDue(type: Review) {
    const x = await getReviewDue(type);
    reviewCount++;
    return x;
}

async function getReadTime(text: string) {
    const segmenter = new Segmenter(studyLan, { granularity: "word" });
    const segments = segmenter.segment(text);
    const wordsCount = Array.from(segments).filter((i) => i.isWordLike).length;
    return Math.max(wordsCount, 16) * (Number(await setting.getItem("user.readSpeed")) || 150);
}

async function getTtsConfig() {
    return {
        engine: ((await setting.getItem(ttsConfig.engine)) || "browser") as "browser" | "ms",
        voice: (await setting.getItem(ttsConfig.voice)) || "en-GB-LibbyNeural",
    };
}

async function ttsNormalize(text: string) {
    const posi = (await getTtsConfig()).voice.slice(0, 2);
    if (posi === "zh" || posi === "ja" || posi === "ko") return text;
    return text.normalize("NFKC");
}

async function getOnlineTTS(text: string) {
    const nText = await ttsNormalize(text);
    const b = await ttsCache.getItem(nText);
    if (b) {
        return { url: URL.createObjectURL(b.blob), metadata: b.data };
    }

    await tts.setMetadata((await getTtsConfig()).voice, OUTPUT_FORMAT.WEBM_24KHZ_16BIT_MONO_OPUS);
    const readable = tts.toStream(nText);
    let base = new Uint8Array();
    readable.onData((data) => {
        console.log("DATA RECEIVED");
        // raw audio file data
        base = concat(base, data);
    });
    function concat(array1: Uint8Array, array2: Uint8Array) {
        const mergedArray = new Uint8Array(array1.length + array2.length);
        mergedArray.set(array1);
        mergedArray.set(array2, array1.length);
        return mergedArray;
    }

    return new Promise((re: (x: { metadata: D; url: string }) => void, rj) => {
        readable.onEnd(async (data) => {
            console.log("STREAM end");
            let blob = new Blob([base], { type: "audio/webm" });
            blob = await fixWebmDuration(blob);
            if (blob.size > 0) ttsCache.setItem(text, { blob, data });
            re({ url: URL.createObjectURL(blob), metadata: data });
        });
    });
}

async function setReviewCard(id: string, card: Card, rating: Rating, duration: number) {
    const now = new Date();
    setCardAction(id, now, rating, card.state, duration);
    const sCards = fsrs.repeat(card, now);
    // @ts-ignore
    const nCard = sCards[rating].card;
    await cardsStore.setItem(id, nCard);

    for (const i of due.word)
        if (i.id === id) {
            i.card = structuredClone(nCard);
            return;
        }
    for (const i of due.sentence)
        if (i.id === id) {
            i.card = structuredClone(nCard);
            break;
        }
}
function setSpellCard(id: string, card: Card, rating: Rating, duration: number) {
    const now = new Date();
    setCardAction(id, now, rating, card.state, duration);
    const sCards = fsrsSpell.repeat(card, now);
    // @ts-ignore
    const nCard = sCards[rating].card;
    spellStore.setItem(id, nCard);

    for (const i of due.spell)
        if (i.id === id) {
            i.card = structuredClone(nCard);
            break;
        }

    return String(now.getTime());
}

async function saveDic(dic: object) {
    const ndic = dicParse(dic);
    const id = ndic.meta.id;
    await dicStore.setItem(id, ndic.map);
    dics[id] = ndic.meta;
}

async function searchWord(words: Set<string>) {
    const result = new Map<string, Set<{ bid: string; sid: string; index: [number, number] }>>();

    const segmenter = new Segmenter(studyLan, { granularity: "word" });

    const book = new Map<string, Book>();
    const s2b = new Map<string, string>();
    await bookshelfStore.iterate((v, k) => {
        book.set(k, v);
        for (const s of v.sections) s2b.set(s, k);
    });

    await sectionsStore.iterate((v, k) => {
        if (!v) return;
        const bid = s2b.get(k);
        if (!bid) return;
        const b = book.get(bid);
        if (!(b && b.type === "text")) return;
        const s = Array.from(segmenter.segment(v.text)).filter((i) => i.isWordLike !== false);
        for (const w of s) {
            const word = w.segment.toLocaleLowerCase();
            const le = lemmatizer(word);
            const targetWord = words.has(word) ? word : words.has(le) ? le : undefined;
            if (targetWord) {
                const b = result.get(targetWord) ?? new Set([]);
                b.add({ bid, sid: k, index: [w.index, w.index + w.segment.length] });
                result.set(targetWord, b);
            }
        }
    });

    return result;
}

async function getIPA(word: string) {
    if (!ipa) {
        const lan = studyLan || "en";
        const i = await ipaStore.getItem(lan);
        if (!i) return "";
        ipa = i;
    }

    const r = ipa.get(word.toLowerCase());
    if (!r) return "";
    if (Array.isArray(r)) {
        let l: string[] = [];
        for (const i of r) {
            l = l.concat(i.split(",").map((w) => w.trim()));
        }
        return l.join(",");
    }
    return r
        .split(",")
        .map((w) => w.trim())
        .join(",");
}

async function toAllData(withCache: true): Promise<AllData & CacheData>;
async function toAllData(withCache?: false): Promise<AllData>;
async function toAllData(withCache = false) {
    const l: Record<string, object> = {};
    const stores = withCache ? { ...allData2Store, ...allDataCache } : allData2Store;
    for (const [storeName, store] of Object.entries(stores)) {
        await store.iterate((v, k) => {
            // @ts-ignore
            if (!l[storeName]) l[storeName] = {};
            // @ts-ignore
            l[storeName][k] = v;
        });
    }

    for (const key of ["cards", "spell"] as const) {
        for (const i in l[key]) {
            // @ts-ignore
            const r = l[key][i] as Card;
            const nr = structuredClone(r) as any;
            nr.due = r.due?.getTime() || 0;
            nr.last_review = r.last_review?.getTime?.() || 0;
            // @ts-ignore
            l[key][i] = nr;
        }
    }
    return l;
}
function formatAllData(l: AllData | (AllData & CacheData)) {
    return jsonStringify(l, (path) => {
        if (path.length === 2 && (path[0] === "cards" || path[0] === "spell")) {
            return true;
        }
        if (path.length === 4 && path[0] === "sections" && path[2] === "words") {
            return true;
        }
        if (path.length === 3 && !(path[0] === "sections" && path[2] === "words")) {
            return true;
        }
        if (path[0] === "actions" && path.length === 2) {
            return true;
        }
        return false;
    });
}
async function getAllData() {
    const l = await toAllData(false);
    return formatAllData(l);
}
async function getAllDataWithCache() {
    const l = await toAllData(true);
    return formatAllData(l);
}

function splitAllData(dl: AllData) {
    const l = structuredClone(dl);
    const text: { [id: string]: string } = {};
    for (const i in l.sections) {
        if (i === ignoreWordSection) continue;
        if (!l.sections[i]) continue;
        const t = l.sections[i].text;
        // @ts-ignore
        l.sections[i].text = undefined;
        text[i] = t;
    }
    const hash = spark.hash(JSON.stringify(text));
    l.sections[0] = { lastPosi: 0, text: hash, title: "", words: {} };
    return { data: l, text, hash: hash };
}

function jsonStringify(value: unknown, unBr: (path: string[]) => boolean) {
    const l: string[] = [];

    function w(value: object, l: string[]) {
        const str: string[] = [];
        for (const [_i, v] of Object.entries(value)) {
            const i = _i.replaceAll("\t", "\\t").replaceAll("\n", "\\n").replaceAll('"', '\\"');
            const path = l.concat(_i);
            if (typeof v === "object" && v?.constructor === Object) {
                const isBr = !unBr(path);
                if (isBr) {
                    str.push(`"${i}":${w(v, path)}`);
                } else {
                    str.push(`"${i}":${JSON.stringify(v)}`);
                }
            } else {
                let _v = v;
                if (typeof _v === "undefined") _v = null;
                str.push(`"${i}":${JSON.stringify(_v)}`);
            }
        }
        if (str.length === 0) return "{}";
        return `{\n${str.join(",\n")}\n}`;
    }
    return w(value as object, l);
}

async function xUnGzip(file: Blob) {
    const stream = file.stream().pipeThrough(new DecompressionStream("gzip"));
    const blob = await new Response(stream).blob();
    return blob.text();
}

async function xGzip(data: string) {
    const file = new File([data], rmbwJsonName, { type: "text/json;charset=utf-8" });
    const stream = file.stream().pipeThrough(new CompressionStream("gzip"));
    const blob = new Response(stream).blob();
    return blob;
}

function basicAuth(username: string, passwd: string) {
    return `Basic ${username}:${passwd}`;
}

function joinFilePath(baseurl: string, name: string) {
    let url = baseurl;
    if (url.at(-1) !== "/") url += "/";
    url += rmbwZipName;
    return url;
}

async function getDAV() {
    const baseurl = (await setting.getItem(DAVConfigPath.url)) as string;
    const username = (await setting.getItem(DAVConfigPath.user)) as string;
    const passwd = (await setting.getItem(DAVConfigPath.passwd)) as string;
    const url = joinFilePath(baseurl, rmbwZipName);
    const data = (
        await fetch(url, {
            method: "get",
            headers: { Authorization: basicAuth(username, passwd) },
        })
    ).blob();
    return data;
}

async function setDAV(data: Blob) {
    const baseurl = (await setting.getItem(DAVConfigPath.url)) as string;
    const username = (await setting.getItem(DAVConfigPath.user)) as string;
    const passwd = (await setting.getItem(DAVConfigPath.passwd)) as string;
    const url = joinFilePath(baseurl, rmbwZipName);
    fetch(url, {
        method: "put",
        headers: { Authorization: basicAuth(username, passwd) },
        body: data,
    })
        .then(() => {
            putToast(txt("上传成功"));
        })
        .catch(() => {
            putToast(txt("上传失败"), 6000);
        });
}

async function getGitHub(fileName: string) {
    const user = (await setting.getItem(GitHubConfigPath.user)) as string;
    const repo = (await setting.getItem(GitHubConfigPath.repo)) as string;
    const token = (await setting.getItem(GitHubConfigPath.token)) as string;
    const path = ((await setting.getItem(GitHubConfigPath.path)) as string) || "";
    const downloadPath = `${
        ((await setting.getItem(GitHubConfigPath.download)) as string) ||
        (`https://raw.githubusercontent.com/${user}/${repo}/main/${path}` as string)
    }/${fileName}`;
    return {
        url: `https://api.github.com/repos/${user}/${repo}/contents/${path}/${fileName}`.replace(
            "contents//",
            "contents/",
        ),
        auth: {
            Authorization: `Bearer ${token}`,
        },
        fileDownload: downloadPath,
        user,
        repo,
        path,
    };
}

async function uploadGithub(data: string, fileName: string, m: string) {
    const base64 = encode(data);
    const config = await getGitHub(fileName);
    let sha = "";
    sha = (await (await fetch(config.url, { headers: { ...config.auth } })).json()).sha;
    const x = {
        message: m,
        content: base64,
        sha,
    };
    // @ts-ignore
    if (!sha) x.sha = undefined;
    fetch(config.url, {
        method: "PUT",
        headers: {
            ...config.auth,
        },
        body: JSON.stringify(x),
    });
}

async function downloadGithub(fileName: string) {
    const config = await getGitHub(fileName);
    const data = await (await fetch(config.fileDownload)).json();
    return data;
}

async function getServer() {
    const url = ((await setting.getItem(ServerConfigPath.url)) || "http://0.0.0.0:8000") as string;
    const path = (await setting.getItem(ServerConfigPath.path)) as string;
    const version = {
        base: ((await setting.getItem(ServerConfigPath.versionBase)) || 0) as number,
        uid: ((await setting.getItem(ServerConfigPath.versionUid)) || uuid()) as string,
    };
    await setting.setItem(ServerConfigPath.versionBase, version.base);
    await setting.setItem(ServerConfigPath.versionUid, version.uid);
    return {
        url,
        path,
        version,
    };
}

async function uploadServer(data: string, fileName: string) {
    const config = await getServer();
    await fetch(config.url, {
        method: "POST",
        body: JSON.stringify({
            action: "upload",
            dir: config.path,
            filename: fileName,
            data: data,
            version: config.version,
        }),
    });
    setting.setItem(ServerConfigPath.versionChanged, false);
}

async function downloadServer(fileName: string, force: true): Promise<string>;
async function downloadServer(fileName: string): Promise<string | undefined>;
async function downloadServer(fileName: string, force = false) {
    const config = await getServer();
    const data = await (
        await fetch(config.url, {
            method: "POST",
            body: JSON.stringify({
                action: "download",
                dir: config.path,
                filename: fileName,
                version: force ? { base: 0, uid: "" } : config.version,
            }),
        })
    ).json();
    if (data.version) {
        setting.setItem(ServerConfigPath.versionChanged, false);
        setting.setItem(ServerConfigPath.versionBase, data.version.base);
        setting.setItem(ServerConfigPath.versionUid, data.version.uid);
    }
    if (data.data || force) {
        console.log(data);
        return data.data as string;
    }
}

async function getCSV(type: "word" | "spell" | "sen") {
    const l: string[] = [];
    if (type === "word" || type === "sen") {
        // todo 区分sen
        await cardsStore.iterate((v, k) => {
            l.push(k);
        });
    } else {
        await spellStore.iterate((_, k) => {
            l.push(k);
        });
    }
    const spChar = ",";
    const text: string[] = [
        ["card_id", "review_time", "review_rating", "review_state", "review_duration"].join(spChar),
    ];
    await cardActionsStore.iterate((v, k) => {
        if (!v[1]) return;
        const card_id = v[0];
        if (!l.includes(card_id)) return;
        const review_time = Number(k);
        const review_rating = v[1];
        const review_state = v[2];
        const review_duration = v[3];
        const row = [card_id, review_time, review_rating, review_state, review_duration].join(spChar);
        text.push(row);
    });
    const csv = text.join("\n");
    return csv;
}

// fun ui

// @auto-path:../assets/icons/$.svg
function iconEl(name: string) {
    return button(image(new URL(`../assets/icons/${name}.svg`, import.meta.url).href, "按钮图标").class("icon"));
}

function setFontElF(name: string) {
    fontEl.el.innerText = name;
    fontEl.el.style.fontFamily = name;
}
function themeI(value: string, name: string, bg: string, color: string) {
    return themei.new(value, name).style({
        background: bg,
        color,
    });
}

function showMenu(x: number, y: number) {
    menuEl.style({ left: `${x}px`, top: `${y}px` }).on("click", () => {
        menuEl.el.hidePopover();
    });
    willShowMenu = true;
}

function interModal<el extends ElType<HTMLElement>, v>(
    el: el,
    buttons?: (ElType<HTMLButtonElement> | [ElType<HTMLButtonElement>, "cancel" | "ok"] | null)[],
    getV?: (el: el) => v,
) {
    const dialog = ele("dialog")
        .class("interModal")
        .on("close", () => dialog.el.remove());
    dialog.add(el);
    const buttonsEl = view("x");
    let cancelEl: ElType<HTMLButtonElement>;
    let okEl: ElType<HTMLButtonElement>;
    for (const x of buttons || [
        [button("取消"), "cancel"],
        [button("确定"), "ok"],
    ]) {
        if (Array.isArray(x)) {
            if (x[1] === "cancel") cancelEl = x[0];
            if (x[1] === "ok") okEl = x[0];
            buttonsEl.add(x[0]);
        } else if (x) buttonsEl.add(x);
    }
    dialog.add(buttonsEl);
    dialog.addInto();
    dialog.el.showModal();
    return new Promise((re: (name: { v: v | null; ok: boolean }) => void, rj) => {
        if (okEl) {
            okEl.on("click", () => {
                re({ v: getV ? getV(el) : null, ok: true });
                dialog.el.close();
            });
        }
        if (cancelEl) {
            cancelEl.on("click", () => {
                re({ v: null, ok: false });
                dialog.el.close();
            });
        }
        dialog.on("cancel", () => {
            re({ v: null, ok: false });
        });
    });
}

async function alert(message: string) {
    return (await interModal(pText(message), [[button("确定"), "ok"]])).ok;
}

async function confirm(message: string) {
    return (await interModal(pText(message))).ok;
}

async function prompt(message?: string, defaultValue?: string) {
    return (
        await interModal(
            view("y").add([pText(message), ele("input").attr({ value: defaultValue || "" })]),
            undefined,
            (el) => {
                return el.el.querySelector("input")?.value;
            },
        )
    ).v;
}

function trackAnimate(el: ElType<HTMLElement>, from: ElType<HTMLElement>, to = el) {
    const first = from.el.getBoundingClientRect();

    const self = el.el.getBoundingClientRect();

    const last = to.el.getBoundingClientRect();

    console.log(first, self, last);

    const start = {
        x: first.left - self.left,
        y: first.top - self.top,
        s: Math.min(first.width / self.width, first.height / self.height),
    };

    const end = {
        x: last.left - self.left,
        y: last.top - self.top,
        s: Math.min(last.width / self.width, last.height / self.height),
    };

    el.style({
        "transform-origin": "top left",
    });
    const animateList: Keyframe[] = [
        {
            transform: `translate(${start.x}px, ${start.y}px) scale(${start.s})`,
        },
        { transform: `translate(${end.x}px, ${end.y}px) scale(${end.s})` },
    ];

    return el.el.animate(animateList, { duration: 400, easing: "cubic-bezier(0.25, 1, 0.5, 1)" });
}

function popoverX(el: ElType<HTMLElement>, fromEl: ElType<HTMLElement>) {
    el.el.showPopover();
    trackAnimate(el, fromEl);
    renderCharts();
    el.on(
        "beforetoggle",
        () => {
            trackAnimate(el, el, fromEl);
        },
        { once: true },
    );
}

function dialogX(el: ElType<HTMLDialogElement>, fromEl: ElType<HTMLElement>) {
    el.addInto();
    el.el.showModal();

    trackAnimate(el, fromEl);

    el.on("close", () => {
        trackAnimate(el, el, fromEl).finished.then(() => {
            el.remove();
        });
    });
}

function vlist<ItemType>(
    pel: ElType<HTMLElement>,
    list: ItemType[],
    style: {
        iHeight: number;
        gap?: number;
        paddingTop?: number;
        paddingLeft?: number;
        paddingBotton?: number;
        paddingRight?: number;
        width?: string;
    },
    f: (index: number, item: ItemType, remove: () => void) => ElType<HTMLElement>,
) {
    const iHeight = style.iHeight;
    const gap = style.gap ?? 0;
    // padding 还需要pel自己设定
    const paddingTop = style.paddingTop ?? 0;
    const paddingLeft = style.paddingLeft ?? 0;
    const paddingBotton = style.paddingBotton ?? 0;

    const blankEl = view().style({ width: "1px", position: "absolute", top: "0" });
    const setBlankHeight = (len: number) => {
        blankEl.style({ height: `${iHeight * len + gap * len + paddingTop + paddingBotton}px` });
    };
    setBlankHeight(list.length);
    pel.add(blankEl);
    const dataI = "data-v-i";
    async function show(newList?: ItemType[]) {
        if (newList) {
            setBlankHeight(newList.length);
            // biome-ignore lint: 可通过show更新列表
            list = newList;
        } else {
            // biome-ignore lint: 可通过show更新列表
            newList = list;
        }
        let startI = Math.ceil((pel.el.scrollTop - paddingTop) / (iHeight + gap));
        let endI = Math.floor((pel.el.scrollTop - paddingTop + pel.el.offsetHeight) / (iHeight + gap));
        const buffer = Math.min(Math.floor((endI - startI) / 3), 15);
        startI -= buffer;
        endI += buffer;
        startI = Math.max(0, startI);
        endI = Math.min(newList.length - 1, endI);
        const elList = Array.from(pel.queryAll(`:scope > [${dataI}]`).values());
        if (newList.length < 100 || !newList) {
            startI = 0;
            endI = newList.length - 1;
            if (elList.length === newList.length) return;
        }
        const oldRangeList: number[] = [];
        for (const el of elList) oldRangeList.push(Number(el.el.getAttribute(dataI)));
        for (const i of oldRangeList) {
            if (i < startI || endI < i || newList) pel.query(`:scope > [${dataI}="${i}"]`)?.remove();
        }
        for (let i = startI; i <= endI; i++) {
            const iel = f(i, newList[i], () => {
                show(newList.toSpliced(i, 1));
            }).style({
                position: "absolute",
                top: `${paddingTop + i * (iHeight + gap)}px`,
                left: `${paddingLeft}px`,
                ...(style.width ? { width: style.width } : {}),
            });
            iel.data({ [dataI]: String(i) });
            if (!pel.query(`:scope > [${dataI}="${i}"]`) || newList) pel.add(iel);
        }
    }
    show();
    function s() {
        requestAnimationFrame(() => show());
    }
    pel.el.addEventListener("scroll", s);

    const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            if (mutation.type === "childList" && Array.from(mutation.removedNodes).includes(blankEl.el)) {
                pel.el.removeEventListener("scroll", s);
            }
        }
    });
    observer.observe(pel.el, { childList: true });
    return { show };
}

function booksElclose() {
    booksEl.el.close();
}
function nosieBg() {
    const canvas = document.createElement("canvas");
    const w = 100;
    canvas.width = w;
    canvas.height = w;
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    for (let x = 0; x < w; x += 1) {
        for (let y = 0; y < w; y += 1) {
            if (Math.random() > 0.08) continue;
            const f = 0.13 * Math.random();
            ctx.fillStyle = `rgb(0,0,0,${f})`;
            ctx.fillRect(x, y, 1, 1);
        }
    }
    const { promise, resolve, reject } = Promise.withResolvers<string>();
    canvas.toBlob(
        (b) => {
            if (b) {
                const url = URL.createObjectURL(b);
                resolve(url);
            } else {
                reject("error");
            }
        },
        "image/webp",
        1,
    );
    return promise;
}

function putToast(ele: ElType<HTMLElement>, time = 2000) {
    let toastEl = pack(document.body).query(".toast");
    if (!toastEl) {
        toastEl = view().class("toast").attr({ popover: "auto" });
        toastEl.addInto();
    }
    toastEl.el.showPopover();
    toastEl.add(ele);

    if (time) {
        setTimeout(() => {
            ele.el.remove();
        }, time);
    }

    const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            if (mutation.type === "childList" && toastEl.el.childElementCount === 0) {
                toastEl.remove();
                observer.disconnect();
            }
        }
    });
    observer.observe(toastEl.el, { childList: true });
}

async function getTitleEl(bookId: string, sectionN: string, markId?: string, x?: string) {
    const book = await getBooksById(bookId);
    const section = await getSection(sectionN);
    if (!book || !section) return;
    const title = `${await getBookShortTitle(bookId)}${x || " - "}${getSectionTitle(book, sectionN, section.title)}`;
    const v = txt(title)
        .class("source_title")
        .on("click", async () => {
            if (!markId) return;
            const book = await getBooksById(bookId);
            if (!book) return;
            await showBook(book, sectionN);
            const index = (await getAllMarks()).find((i) => i.id === markId);
            if (!index) return;
            const id = index.id;
            jumpToMark(index.s.cIndex);
            showDic(id);
        });
    return v;
}

async function getOnlineBooks() {
    fetch(`${await getOnlineBooksUrl()}/index.json`)
        .then((v) => v.json())
        .then((j) => {
            showOnlineBooks(j.books);
            console.log(j);
        })
        .catch((error) => {
            showOnlineBooks(undefined);
        });
}

async function showOnlineBooks(books?: OnlineBook[]) {
    onlineBookEl.clear();
    let grid: ElType<HTMLElement>;

    if (!books) {
        onlineBookEl.add(p("无法访问在线书库\n请检查您的网络，以及软件在线书库的设置").el);
    }

    const l = selectBook(books ?? [], async (list) => {
        grid?.remove();
        grid = await showOnlineBooksL(list);
        l.el.after(grid.el);
    });

    onlineBookEl.add(l);
}

async function showOnlineBooksL(books: OnlineBook[]) {
    const grid = view().class("books");
    for (const book of books) {
        let url = "";
        if (book.cover) url = await getBookCover(book.cover);
        const div = bookEl(book.name, url);
        const bookCover = div.query("div");
        const localBook = await bookshelfStore.getItem(book.id);
        if (localBook && localBook.updateTime < book.updateTime) {
            div.el.classList.add(TODOMARK1);
        }
        div.on("click", async () => {
            console.log(book);
            if (book.type === "package") {
                saveLanguagePackage(book.language, book.sections);
                return;
            }
            if (book.type === "dictionary") {
                const data = await (await fetch(`${await getOnlineBooksUrl()}/source/${book.sections[0].path}`)).json();
                saveDic(data);
                return;
            }
            let xbook = (await bookshelfStore.getItem(book.id)) as Book;
            if (xbook) {
                saveBook();
                div.el.classList.remove(TODOMARK1);
            } else {
                xbook = {
                    ...book,
                    visitTime: 0,
                    updateTime: 0,
                    sections: [],
                    canEdit: false,
                    lastPosi: 0,
                } as Book;
                saveBook();
            }
            function saveBook() {
                const s: string[] = [];
                let count = 0;
                const fetchPromises = book.sections.map(async (item) => {
                    const { id, path, title } = item;
                    const response = await fetch(`${await getOnlineBooksUrl()}/source/${path}`);
                    const content = await response.text();
                    count++;
                    const p = (count / book.sections.length) * 100;
                    bookCover?.style({ "clip-path": `xywh(0 ${100 - p}% 100% 100%)` });
                    return { id, content, title, type: book.type };
                });
                Promise.all(fetchPromises)
                    .then(async (results) => {
                        console.log(results);
                        for (const i of results) {
                            s.push(i.id);
                            const section = await sectionsStore.getItem(i.id);
                            if (section) {
                                let s: Section;
                                if (i.type === "text") {
                                    s = changePosi(section, i.content);
                                } else {
                                    section.text = i.content;
                                    s = section;
                                }
                                s.text = i.content;
                                s.title = i.title;
                                sectionsStore.setItem(i.id, s);
                            } else {
                                sectionsStore.setItem(i.id, {
                                    title: i.title,
                                    lastPosi: 0,
                                    text: i.content,
                                    words: {},
                                } as Section);
                            }
                        }
                        for (const i in book) {
                            // @ts-ignore
                            xbook[i] = book[i];
                        }
                        xbook.sections = s;
                        xbook.updateTime = book.updateTime;
                        await bookshelfStore.setItem(book.id, xbook);
                        if (book.cover) {
                            const src = await getBookCover(book.cover);
                            const b = await (await fetch(src)).blob();
                            coverCache.setItem(book.id, b);
                        }
                        showLocalBooks();
                    })
                    .catch((error) => {
                        console.error(error);
                    });
            }
        });
        grid.add(div);
    }
    return grid;
}

function selectBook<BOOK extends Pick<Book, "type" | "language">>(books: BOOK[], f: (list: BOOK[]) => void) {
    const typeEl = view();
    const lanEl = view();

    const tl = Object.keys(Object.groupBy(books, ({ type }) => type));
    const ll = Object.keys(Object.groupBy(books, ({ language }) => language));

    const x: { type: number | string; lan: number | string } = { type: 0, lan: 0 };

    const map: Record<Book["type"], string> = { word: "词表", text: "文本", package: "包", dictionary: "词典" };
    const lanMap = new Intl.DisplayNames(navigator.language, { type: "language" });
    function crl(l: string[], text: (text: string) => string, pel: ElType<HTMLElement>, key: keyof typeof x) {
        if (l.length > 1)
            for (const i of [0, ...l]) {
                pel.add(
                    txt(typeof i === "number" ? "全部" : text(i)).on("click", () => {
                        x[key] = i;
                        run();
                    }),
                );
            }
    }
    // @ts-ignore
    crl(tl, (t) => map[t], typeEl, "type");
    // @ts-ignore
    crl(ll, (t) => lanMap.of(t), lanEl, "lan");

    function run() {
        let l = books.filter((b) => typeof x.type === "number" || b.type === x.type);
        l = l.filter((b) => typeof x.lan === "number" || b.language === x.lan);
        f(l);
    }
    run();

    return view().add([typeEl, lanEl]);
}

async function setSectionTitle(sid: string) {
    const title = (await getSection(sid))?.title;
    const titleEl = input().style({ "font-size": "inherit" }).sv(title);
    titleEl.el.select();
    const iel = view().add([
        titleEl,
        button("ai").on("click", async () => {
            const f = new autoFun.def({
                input: { text: "string" },
                script: ["为输入的文章起个标题"],
                output: "title:string",
            });
            const ff = f.run(editText);
            const stopEl = iconEl("close").on("click", () => {
                ff.stop.abort();
                pel.remove();
            });
            const pel = view().add([txt("AI正在思考标题"), stopEl]);
            putToast(pel, 0);
            ff.result.then((r) => {
                pel.remove();
                // @ts-ignore
                titleEl.gv = r.title;
            });
        }),
    ]);
    titleEl.el.focus();
    const nTitle = (await interModal(view().add(["重命名章节标题", iel]), undefined, () => titleEl.el.value)).v;
    if (!nTitle) return;
    const sectionId = sid;
    const section = await getSection(sectionId);
    if (!section) return;
    section.title = nTitle;
    await sectionsStore.setItem(sectionId, section);
    if (!isWordBook) setBookElTitle(section.title);
    setBookS();
    return nTitle;
}

function setBookElTitle(title: string) {
    const bookNameEl = bookContentEl.query("h1");
    if (bookNameEl) {
        bookNameEl.el.innerText = title;
    }
}

async function setBookS() {
    if (nowBook.book) {
        const bookName = (await getBooksById(nowBook.book))?.name;
        bookNameEl.clear().add(bookName);
        const sectionId = nowBook.sections;
        const section = await getSection(sectionId);
        if (!isWordBook && section) setBookElTitle(section.title);
    }
}

function bookEl(name: string, coverUrl?: string, shortName?: string) {
    const bookIEl = view();
    const cover = view();
    const titleEl = txt(name);
    const bookCover = view().add(shortName || name);
    cover.add(bookCover);
    if (coverUrl) {
        const bookCover = image(coverUrl, "cover").on("error", () => {
            bookCover.style({ opacity: "0" });
        });
        cover.add(bookCover);
    } else {
    }
    bookIEl.add([cover, titleEl]);
    return bookIEl;
}

async function showLocalBooks() {
    let bookList: Book[] = [];
    await bookshelfStore.iterate((book) => {
        bookList.push(book);
    });
    bookList = bookList.toSorted((a, b) => b.visitTime - a.visitTime);

    localBookEl.clear();
    let grid: ElType<HTMLElement>;

    const l = selectBook(bookList, async (list) => {
        grid?.remove();
        grid = await showLocalBooksL(list);
        grid.el.prepend(addBookEl.el);
        l.el.after(grid.el);
    });

    localBookEl.add(l);
    if (bookList.length === 0) {
        localBookEl.add("暂无书籍，请上传或添加在线书籍");
    }
}

async function showLocalBooksL(bookList: Book[]) {
    const grid = view().class("books");
    for (const book of bookList) {
        let bookIEl: ElType<HTMLDivElement>;
        if (book.cover) {
            const c = await coverCache.getItem(book.id);
            let url = "";
            if (c) {
                url = URL.createObjectURL(c);
            } else {
                url = await getBookCover(book.cover);
                try {
                    const b = await (await fetch(url)).blob();
                    coverCache.setItem(book.id, b);
                } catch (error) {}
            }
            bookIEl = bookEl(book.name, url, book.shortName);
        } else {
            bookIEl = bookEl(book.name, undefined, book.shortName);
        }
        grid.add(bookIEl);
        const id = book.id;
        bookIEl
            .on("click", async () => {
                const book = await getBooksById(id);
                if (!book) return;
                showBook(book);
                book.visitTime = new Date().getTime();
                bookshelfStore.setItem(book.id, book);
                booksElclose();
            })
            .on("contextmenu", async (e) => {
                e.preventDefault();
                const book = await getBooksById(id);
                if (!book) return;
                const formEl = ele("form").add([
                    input().attr({ name: "name" }).sv(book.name),
                    input().attr({ name: "language" }).sv(book.language),
                    label(
                        [
                            input("radio")
                                .attr({ name: "type" })
                                .attr({ value: "word", checked: book.type === "word" }),
                            "词书",
                        ],
                        1,
                    ),
                    label(
                        [
                            input("radio")
                                .attr({ name: "type" })
                                .attr({ value: "text", checked: book.type === "text" }),
                            "书",
                        ],
                        1,
                    ),
                ]);
                const dis = view().add([
                    book.description || "",
                    view()
                        .add("翻译")
                        .on("click", async (_, el) => {
                            el.el.innerText = (await (await translate(book.description || "")).text) ?? "";
                        }),
                ]);
                const submitEl = button("确定");
                const deleteEl = button("删除");
                const metaEl = ele("dialog").add([view().add(`id: ${book.id}`), formEl, dis, submitEl, deleteEl]);
                submitEl.on("click", () => {
                    const data = new FormData(formEl.el);
                    data.forEach((v, k) => {
                        // @ts-ignore
                        book[k] = v;
                    });
                    bookshelfStore.setItem(book.id, book);
                    metaEl.el.close();
                    setBookS();
                });
                deleteEl.on("click", async () => {
                    if (await checkEmptyBook(book)) {
                        await bookshelfStore.removeItem(book.id);
                        for (const sid of book.sections) {
                            await sectionsStore.removeItem(sid);
                        }
                        putToast(txt(`删除${book.name}成功`));
                    } else {
                        putToast(txt(`删除${book.name}失败，已经标记了单词`));
                    }
                    metaEl.el.close();
                    showLocalBooks();
                });
                dialogX(metaEl, bookIEl);
            });
        requestIdleCallback(async () => {
            if (book.type !== "text") return;
            let unLearn = false;
            for (const i of book.sections) {
                if ((await sectionWords(i)).find((i) => i[1].visit === false)) {
                    unLearn = true;
                    break;
                }
            }
            if (unLearn) bookIEl.class(TODOMARK1);
        });
    }
    return grid;
}
async function showBook(_book: Book, sid?: string) {
    const book = structuredClone(_book);
    if (book.language !== studyLan) {
        if (!(await confirm(`书籍语言${book.language}与学习语言${studyLan}不符，是否继续显示书籍？`))) return;
    }

    if (book.type === "word") {
        const sections = structuredClone(book.sections);
        const sectionsX: Section[] = [];
        for (const i of sections) {
            const s = await getSection(i);
            if (!s) continue;
            sectionsX.push(s);
        }
        const allId = uuid();
        const allSection: Section = {
            text: sectionsX.map((i) => i.text).join("\n"),
            lastPosi: 0,
            title: "全部",
            words: {},
        };
        tmpSections.set(allId, allSection);
        sections.push(allId);
        book.sections = sections;
    }

    const sectionId = sid || book.sections[Math.max(0, Math.min(book.lastPosi, book.sections.length - 1))];
    nowBook.book = book.id;
    nowBook.sections = sectionId;
    isWordBook = book.type === "word";
    await showBookSections(book);
    await showBookContent(book, sectionId);
    await setBookS();
}
async function showBookSections(book: Book) {
    addSectionEL.style({ display: book.canEdit ? "" : "none" });

    const sections = structuredClone(book.sections);
    bookSectionsEl.clear().attr({ lang: studyLan });
    const sectionsX: Section[] = [];
    for (const i of sections) {
        const s = await getSection(i);
        if (!s) continue;
        sectionsX.push(s);
    }

    function show() {
        bookSectionsEl.clear();
        for (const i in sectionsX) {
            const sEl = view();
            const s = sectionsX[i];
            const title = getSectionTitle(book, sections[i], s.title, true) || `章节${Number(i) + 1}`;
            sEl.attr({ innerText: title, title });
            if (nowBook.sections === sections[i]) sEl.class(SELECTEDITEM);
            if (Object.values(s.words).some((i) => !i.visit)) sEl.class(TODOMARK);
            if (book.type === "text" && Object.values(s.words).length === 0) sEl.class(UNREAD);
            sEl.on("click", async () => {
                bookSectionsEl.query(`.${SELECTEDITEM}`)?.el.classList.remove(SELECTEDITEM);
                sEl.class(SELECTEDITEM);

                const book = await getBooksById(nowBook.book);
                if (!book) return;

                nowBook.sections = sections[i];
                showBookContent(book, sections[i]);
                setBookS();
                if (nowBook.book === coreWordBook.id) return;
                book.lastPosi = Number(i);
                bookshelfStore.setItem(nowBook.book, book);
            }).on("contextmenu", async (e) => {
                e.preventDefault();
                e.stopPropagation();
                menuEl.clear();
                if ((await getBooksById(nowBook.book))?.canEdit) {
                    menuEl.add(
                        view()
                            .add("重命名")
                            .on("click", async () => {
                                const t = await setSectionTitle(sections[i]);
                                if (t) sEl.attr({ innerText: t });
                            }).el,
                    );
                }
                menuEl.add(
                    view()
                        .add("复制id")
                        .on("click", async () => {
                            navigator.clipboard.writeText(sections[i]);
                        }).el,
                );
                showMenu(e.clientX, e.clientY);
            });
            bookSectionsEl.add(sEl);
        }
        bookSectionsEl.el.scrollTop =
            (bookSectionsEl.query(`.${SELECTEDITEM}`)?.el.offsetTop ?? 0) - bookSectionsEl.el.offsetHeight * 0.4;
    }
    show();
    reflashSectionEl = (words: Section["words"]) => {
        const nowSection = sectionsX[sections.indexOf(nowBook.sections)];
        nowSection.words = words;
        show();
    };
}

let reflashSectionEl = (words: Section["words"]) => {};

function cardState(s: State) {
    const cardStateMap: { [k in State]: string } = {
        "0": "新",
        "1": "学习中",
        "2": "复习",
        "3": "重新学习",
    };
    return cardStateMap[s] || "未知";
}

async function showBookContent(book: Book, id: string) {
    const s = await getSection(id);
    if (!s) return;
    bookContentContainerEl.clear();
    bookContentEl = view();
    bookContentContainerEl.add(bookContentEl);

    editText = s.text;

    contentScrollPosi = s.lastPosi;

    contentP = [];

    dicEl.el.classList.remove(DICSHOW);

    if (isWordBook) await showWordBook(book, s);
    else await showNormalBook(book, s);

    setScrollPosi(bookContentContainerEl, contentScrollPosi);
}

async function showWordBook(book: Book, s: Section) {
    const rawWordList: WordBookList = [];
    let wordList: typeof rawWordList = [];
    const l = new Set(s.text.split("\n").filter((i) => i.trim()));
    const cards = new Map<string, Card>();
    await cardsStore.iterate((v, k) => {
        cards.set(k, v);
    });
    const cardHas = new Map<string, Card>();
    const words: Map<string, record> = new Map();
    const mayMapWords: Map<string, record> = new Map();
    const usS = usSpell.flat();
    const wordMap: { [r: string]: string } = {};
    await wordsStore.iterate((v, k) => {
        words.set(k, v);
        if (usS.includes(k)) mayMapWords.set(k, v);
    });
    for (const i of usS) if (l.has(i) && !words.has(i)) wordMap[i] = "";
    for (const i in wordMap) {
        const list = usSpell.find((w) => w.includes(i));
        wordMap[i] = list?.find((w) => mayMapWords.has(w)) || "";
    }
    const ignoreWords = await getIgnoreWords();
    let matchWords = 0;
    let means1 = 0;
    const now = new Date();
    for (const i of l) {
        const t = i;
        let c: record | undefined;
        let type: "ignore" | "learn" | null = null;
        let means = 0;
        if (words.has(i) || mayMapWords.has(wordMap[i])) {
            c = (words.get(i) || mayMapWords.get(wordMap[i])) as record;
            type = "learn";
            matchWords++;
            let r = 0;
            for (const j of c.means) {
                const x = cards.get(j.card_id) as Card;
                cardHas.set(j.card_id, x);
                r += fsrs.get_retrievability(x, now, false) || 0;
            }
            means = r / c.means.length;
        } else if (ignoreWords.has(i)) {
            type = "ignore";
            matchWords++;
            means = 1;
        }
        means1 += means;
        if (type === "learn") rawWordList.push({ text: t, id: wordMap[i] || t, c: c as record, type, means });
        else if (type === "ignore") rawWordList.push({ text: t, id: wordMap[i] || t, c: undefined, type, means });
        else rawWordList.push({ text: t, id: wordMap[i] || t, c: undefined, type: null, means: 0 });
    }
    wordList = sortWordList(rawWordList, (await setting.getItem(WordSortPath)) || "raw");
    const search = input()
        .attr({ autocomplete: "off" })
        .on("input", () => {
            const fuse = new Fuse(wordList, {
                includeMatches: true,
                findAllMatches: true,
                useExtendedSearch: true,
                includeScore: true,
                keys: [
                    "text",
                    "c.note",
                    { name: "t", getFn: (x) => ("c" in x && x.c ? x.c.means.map((i) => i.text).join("\n") : "") },
                ],
            });
            const fr = fuse.search(search.el.value);
            const list = fr.map((i) => i.item);
            const nl = list.length ? list : wordList;
            show.show(nl);
            if (nl.length === wordList.length) {
                canRecordScroll = true;
                setScrollPosi(bookContentContainerEl, contentScrollPosi);
            } else {
                canRecordScroll = false;
                setScrollPosi(bookContentContainerEl, 0);
            }
        });
    const sortEl = view().class("sort_words");
    const sortMap: { type: WordSortType; name: string }[] = [
        { type: "raw", name: "原始" },
        { type: "az", name: "字母正序" },
        { type: "za", name: "字母倒序" },
        { type: "10", name: "熟悉" },
        { type: "01", name: "陌生" },
        { type: "random", name: "随机" },
    ];
    sortEl.add(
        sortMap.map((i) =>
            txt(i.name).on("click", () => {
                wordList = sortWordList(rawWordList, i.type);
                show.show(wordList);
                setting.setItem(WordSortPath, i.type);
            }),
        ),
    );
    const spellC = view().add(["拼写 加载中", view().class(LITLEPROGRESS)]);
    const chartEl = view()
        .add([
            view().add([
                `${String(l.size)} ${matchWords} ${means1.toFixed(1)}`,
                view()
                    .class(LITLEPROGRESS)
                    .add([
                        view().style({ "--w": `${(matchWords / l.size) * 100}%`, background: "#00f" }),
                        view().style({ "--w": `${(means1 / l.size) * 100}%`, background: "#0f0" }),
                    ]),
            ]),
            spellC,
        ])
        .on("click", () => {
            showWordBookMore(wordList, cardHas, chartEl);
        });
    bookContentContainerEl.add(
        view().class("words_book_top").add([chartEl, search, sortEl]).attr({ lang: navigator.language }),
    );

    requestIdleCallback(async () => {
        let spell = 0;
        const nl = Array.from(l) as (string | null)[];
        await spellStore.iterate((v, k: string) => {
            if (nl.includes(k)) {
                spell += fsrsSpell.get_retrievability(v, now, false) || 0;
                nl[nl.indexOf(k)] = null;
            }
        });
        for (const i of nl) if (i && ignoreWords.has(i)) spell += 1;
        spellC.clear().add([
            `拼写 ${spell.toFixed(1)}`,
            view()
                .class(LITLEPROGRESS)
                .add(view().style({ "--w": `${(spell / l.size) * 100}%`, background: "#00f" })),
        ]);
    });

    async function showWord(item: (typeof wordList)[0], index: number, _autoNext?: boolean) {
        const pEl = tmpDicEl;
        let autoNext = Boolean(_autoNext);
        let timer = 0;

        tmpDicLastF = () => {
            const ni = Math.max(0, index - 1);
            showWord(wordList[ni], ni);
            clearTimeout(timer);
        };
        tmpDicStopF = () => {
            autoNext = !autoNext;
            if (autoNext) {
                next(true);
            }
        };
        tmpDicNextF = () => {
            next(autoNext);
        };

        function next(a: boolean) {
            const ni = Math.min(index + 1, wordList.length - 1);
            showWord(wordList[ni], ni, a);
            clearTimeout(timer);
        }

        play(item.text);
        pEl.clear();
        pEl.add(
            view("x").add([
                txt(item.text).on("click", () => {
                    play(item.text);
                }),
                spacer(),
                iconEl("left").on("click", () => {
                    tmpDicLastF();
                }),
                iconEl("recume").on("click", () => {
                    tmpDicStopF();
                }),
                iconEl("right").on("click", () => {
                    tmpDicNextF();
                }),
            ]),
        );
        const books = await wordBooksByWord(item.text);
        const booksEl = view();
        for (const i of books) {
            const bookN = (await getBooksById(i.book))?.name;
            const s = (await getSection(i.section))?.title;
            booksEl.add(txt(s).attr({ title: bookN }));
        }
        pEl.add(booksEl);
        if (item.c?.note) {
            const note = p(item.c.note);
            pEl.add(
                view().add([
                    iconEl("pen").on("click", (_, el) => {
                        addP(
                            // @ts-ignore
                            item.c.note,
                            item.id,
                            null,
                            null,
                            null,
                            (text) => {
                                // @ts-ignore
                                item.c.note = text.trim();
                                // @ts-ignore
                                wordsStore.setItem(item.id, item.c);
                                showWord(item, index);
                            },
                            el,
                        );
                    }),
                    note,
                ]),
            );
        }
        const onlineList = onlineDicL(item.text);
        pEl.add(onlineList);

        if (etymology.words.has(item.text) || etymology.roots.has(`(${item.text})`)) {
            const etyEl = view("y");
            const x = etymology.words.get(item.text);

            const roots = (x?.match(/\(\w+\)/g) || []) as string[];
            const base = x?.match(/\{(.*?)\}/)?.[1];

            const baseEl = view("x").style({ gap: "16px" });

            if (x) {
                const xxx = etymologyParse(x);
                const v = analyzeMorphemes(
                    xxx.map((i) => i.t),
                    item.text,
                );

                baseEl.add(
                    view("x")
                        .style({ gap: "4px" })
                        .add(v.map((i) => showDiff(i))),
                );
            }

            if (base) {
                baseEl.add(txt(etymologyParseMore(etymologyParse(base))));
            }

            const rootsEl = view("x")
                .style({ gap: "8px", overflowX: "auto" })
                .add(
                    roots.concat([`(${item.text})`]).map((i) => {
                        const t = i.slice(1, -1);
                        const rl = view().style({ maxHeight: "180px", overflow: "auto" });
                        const r = txt(t).on("click", () => {
                            function learnClass(t: string) {
                                return ignoreWords.has(t) ? "ignore" : words.has(t) ? "learn" : "";
                            }

                            const roots =
                                etymology.roots.get(i)?.map((i) => ({
                                    t: i,
                                    morphems: etymologyParse(etymology.words.get(i) ?? "").map((i) => i.t) ?? [],
                                })) ?? [];
                            const rootChanges = sortRootChanges(t, roots);

                            const rootEl = view("x").style({ gap: "4px" });
                            const elMap = new Map<string, { m: ElType<HTMLElement>; c: ElType<HTMLElement> }>();
                            for (const r of roots) {
                                const m = view();
                                const p = rootChanges.get(r);
                                const xmor = p
                                    ? [
                                          ...r.morphems.slice(0, p.index),
                                          p.p.t,
                                          ...r.morphems.slice(p.index + p.p.morphems.length),
                                      ]
                                    : r.morphems;

                                m.add([
                                    txt(r.t).class(learnClass(r.t)),
                                    view("x")
                                        .style({ gap: "4px" })
                                        .add(analyzeMorphemes(xmor, r.t).map((i) => showDiff(i)))
                                        .on("click", () => {
                                            console.log(xmor, p, r);
                                        }),
                                ]);
                                const c = view("y").style({ gap: "4px" });
                                const el = view("x").style({ gap: "8px" }).add([m, c]);
                                elMap.set(r.t, { m: el, c: c });
                            }

                            rootEl.add(elMap.get(t)?.m);

                            for (const [k, v] of rootChanges.entries()) {
                                const pel = elMap.get(v.p.t);
                                const el = elMap.get(k.t);
                                if (!pel || !el) continue;
                                pel.c.add(el.m);
                            }

                            rl.clear().add(rootEl);
                        });

                        return etymology.roots.has(i) ? view("y").add([r, rl]) : null;
                    }),
                );

            etyEl.add([baseEl, rootsEl]);

            pEl.add(etyEl);
        }

        if (item.c)
            for (const i of item.c.means) {
                const pel = view().add([
                    iconEl("pen").on("click", (_, el) => {
                        addP(
                            i.text,
                            item.id,
                            "",
                            null,
                            null,
                            (text) => {
                                i.text = text.trim();
                                // @ts-ignore
                                wordsStore.setItem(item.id, item.c);
                                showWord(item, index);
                            },
                            el,
                        );
                    }),
                    view().add(await disCard2(i)),
                ]);
                pEl.add(pel);
                const reviewEl = view();
                pel.add(reviewEl);
                const card = await cardsStore.getItem(i.card_id);
                if (!card) return;

                const stateEl = txt(cardState(card.state));
                reviewEl.add(stateEl);
                if (card.due.getTime() < time()) stateEl.class(TODOMARK);
                const buttons = getReviewCardButtons(
                    i.card_id,
                    card,
                    i.text + i.contexts.map((x) => x.text).join(""),
                    (_, first) => {
                        if (!first) {
                            buttons.buttons.el.remove();
                            stateEl.el.classList.remove(TODOMARK);
                        }
                    },
                );
                reviewEl.add(buttons.buttons);
            }

        timer = setTimeout(
            () => {
                if (autoNext && pEl.el.offsetHeight > 0) {
                    next(true);
                }
            },
            item.type === "ignore" ? 2000 : item.type === "learn" ? 2500 : 3000,
        );
    }

    const show = vlist(
        bookContentContainerEl,
        wordList,
        { iHeight: 24, gap: 8, paddingTop: 120, paddingBotton: 8 },
        (i, item) => {
            const tEl = txt(item.text); // 动画
            const iEl = p().add(tEl);
            if (item.type) {
                iEl.class(item.type);
            }
            iEl.on("contextmenu", (e) => {
                e.preventDefault();
                menuEl.clear();
                showMenu(e.clientX, e.clientY);
                if (item.type === "ignore")
                    menuEl.add(
                        view()
                            .add("从忽略词表移除")
                            .on("click", async () => {
                                await removeIgnore(item.id);
                                iEl.el.classList.remove("ignore");
                                const item1 = rawWordList.find((i) => i.text === item.text);
                                const item2 = wordList.find((i) => i.text === item.text);
                                // @ts-ignore
                                item.type = null;
                                if (item1) item1.type = null;
                                if (item2) item2.type = null;
                            }),
                    );
                else
                    menuEl.add(
                        view()
                            .add("添加到忽略词表")
                            .on("click", async () => {
                                await addIgnore(item.text);
                                iEl.class("ignore");
                                const item1 = rawWordList.find((i) => i.text === item.text);
                                const item2 = wordList.find((i) => i.text === item.text);
                                // @ts-ignore
                                item.type = "ignore";
                                item.means = 1;
                                if (item1) {
                                    item1.type = "ignore";
                                    item1.means = 1;
                                }
                                if (item2) {
                                    item2.type = "ignore";
                                    item2.means = 1;
                                }
                            }).el,
                    );
                menuEl.add(
                    view()
                        .add("全书架搜索")
                        .on("click", async () => await searchWordBar([item.text])),
                );
            });
            iEl.el.onclick = () => {
                const pEl = tmpDicEl;
                pEl.el.showPopover();

                showWord(item, i);
            };
            return iEl;
        },
    );

    bookContentContainerEl.attr({ lang: book.language });
}

async function showWordBookMore(wordList: WordBookList, cards: Map<string, Card>, fromEl: ElType<HTMLElement>) {
    const d = ele("dialog");
    dialogX(d, fromEl);
    const unlearnL = wordList.filter((w) => w.type === null);
    d.add([
        view()
            .style({ display: "flex", "flex-direction": "row-reverse" })
            .add(iconEl("close").on("click", () => d.el.close())),
        view().add([
            p("导出未学习的单词"),
            button("导出").on("click", () => {
                download(unlearnL.map((i) => i.text).join("\n"), "words.txt");
            }),
            button("复制").on("click", () => {
                navigator.clipboard.writeText(unlearnL.map((i) => i.text).join("\n"));
            }),
            button("全书架搜索").on("click", async () => await searchWordBar(unlearnL.map((i) => i.text))),
        ]),
    ]);
    const bookIds: { [id: string]: number } = {};

    const wordFamilyMap: Map<string, boolean> = new Map();

    const wordRootReg = /\{(.*?)\}/g;

    for (const w of wordList) {
        if (w.type === "learn") {
            for (const m of w.c.means) {
                for (const c of m.contexts) {
                    const id = c.source.book;
                    if (bookIds[id]) bookIds[id]++;
                    else bookIds[id] = 1;
                }
            }
        }

        // ---

        const pure = lemmatizer(w.text);
        const rootWords = etymology.words.get(pure)?.match(wordRootReg) || [pure];
        for (const rootWord of rootWords) {
            if (wordFamilyMap.get(rootWord) !== true) wordFamilyMap.set(rootWord, Boolean(w.type));
        }
    }

    const l = Object.entries(bookIds).sort((a, b) => b[1] - a[1]);
    const ignore = wordList.filter((w) => w.type === "ignore").length;
    const max = Math.max(l[0][1], ignore);
    const pEl = view().class("words_from");
    for (const i of l) {
        pEl.add([
            txt((await getBooksById(i[0]))?.name),
            txt(i[1].toString()),
            view().style({ width: `${(i[1] / max) * 100}%` }),
        ]);
    }
    pEl.add([txt("忽略"), txt(ignore.toString()), view().style({ width: `${(ignore / max) * 100}%` })]);
    d.add([p("单词来源"), pEl]);

    const count: CardPercent = { 0: 0, 1: 0, 2: 0, 3: 0 };
    for (const [i, c] of cards) {
        count[c.state]++;
        if (c.state === 0) console.log(i);
    }
    d.add([p("记忆"), renderCardPercent(count)]);

    function allMeans(now: Date) {
        let means1 = 0;
        for (const i of wordList) {
            if (i.type === "ignore") {
                means1 += 1;
            } else if (i.type === "learn") {
                let r = 0;
                for (const j of i.c.means) {
                    const x = cards.get(j.card_id) as Card;
                    r += fsrs.get_retrievability(x, now, false) || 0;
                }
                means1 += r / i.c.means.length;
            }
        }
        return means1;
    }

    const maxMeans = allMeans(new Date());
    const canvas = ele("canvas").el;
    const xCount = 12 * 3;
    const means = new Map<number, number>();
    const xs = Array.from(Array(xCount).keys()).flatMap((i) => [i, i + 0.5]);
    xs.push(0.2, 0.75);
    xs.sort((a, b) => a - b);
    for (const i of xs) {
        means.set(i, maxMeans - allMeans(new Date(new Date().getTime() + timeD.d(i * 30.5))));
    }
    const pxPm = 10;
    const pxPw = 0.5;
    const maxV = Math.ceil(means.get(xCount - 1) ?? 1);
    canvas.width = xCount * pxPm * devicePixelRatio;
    canvas.height = maxV * pxPw * devicePixelRatio;
    canvas.style.width = `${xCount * pxPm}px`;
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    ctx.scale(devicePixelRatio, devicePixelRatio);
    // x
    for (let i = 0; i < maxV; i += 25) {
        if (i % 100 === 0) ctx.strokeStyle = "#0f0";
        else ctx.strokeStyle = "#0f02";
        ctx.beginPath();
        ctx.moveTo(0, i * pxPw);
        ctx.lineTo(canvas.width, i * pxPw);
        ctx.stroke();
        ctx.closePath();
    }
    // y
    for (let i = 0; i < xCount; i++) {
        if (i % 12 === 0) {
            ctx.strokeStyle = "#00f";
        } else {
            ctx.strokeStyle = "#00f2";
        }
        ctx.beginPath();
        ctx.moveTo(pxPm * i, 0);
        ctx.lineTo(i * pxPm, canvas.height);
        ctx.stroke();
        ctx.closePath();
    }
    ctx.strokeStyle = "#000";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (const [i, v] of means.entries()) {
        ctx.lineTo(i * pxPm, v * pxPw);
    }
    ctx.stroke();
    const kl: number[] = [];
    let t = 100;
    for (const [i, k] of means.entries()) {
        if (k > t) {
            kl.push(i);
            t += 100;
        }
    }

    d.add([
        p("预测"),
        txt(
            `${"(1y, 100词)"} ${kl.map((i) => `${i}m`).join(" ")} 一年保持：${(1 - (means.get(12) ?? 0) / wordList.filter((i) => i.type).length).toFixed(2)}`,
        ),
        view().add(canvas),
    ]);

    const familyList = Array.from(wordFamilyMap.values());
    d.add([
        p("词族"),
        txt(`${familyList.length} ${familyList.filter((i) => i).length}`),
        view()
            .class(LITLEPROGRESS)
            .add([
                view().style({
                    width: `${(familyList.filter((i) => i).length / familyList.length) * 100}%`,
                    background: "#00f",
                }),
            ]),
    ]);
    d.add([
        p("添加忽略词到拼写"),
        iconEl("add").on("click", () => {
            ignoredWordSpell(
                wordList
                    .filter((w) => w.type === "ignore")
                    .map((w) => w.text)
                    .filter((w) => !w.includes(" ")),
            );
        }),
    ]);
}

async function searchWordBar(words: string[]) {
    const r = await searchWord(new Set(words.map((i) => i.toLocaleLowerCase())));

    const xEl = view()
        .style({
            zIndex: 99999,
            position: "fixed",
            bottom: "8px",
            width: "80%",
            left: "10%",
            borderRadius: "var(--br2)",
            padding: "var(--p0)",
            background: "var(--bar-bg)",
            backdropFilter: "var(--blur)",
            boxShadow: "var(--box-shadow)",
        })
        .addInto();
    xEl.add(iconEl("close").on("click", () => xEl.remove()));
    const wordList = view("x").style({ gap: "4px", overflow: "auto" }).addInto(xEl);
    const bookList = view().style({ maxHeight: "30vh", overflow: "auto" }).addInto(xEl);

    for (const [w, v] of r) {
        wordList.add(
            txt(w).on("click", () => {
                bookList.clear().add(
                    Array.from(v).map((x) => {
                        const el = view().on("click", async () => {
                            const book = await getBooksById(x.bid);
                            if (!book) return;
                            await showBook(book, x.sid);
                            jumpToMark(x.index, true);
                        });
                        getTitleEl(x.bid, x.sid).then((l) => el.add(l));
                        return el;
                    }),
                );
            }),
        );
    }
    (wordList.el.children[0] as HTMLElement).click();
}

async function ignoredWordSpell(list: string[]) {
    const keys = await spellStore.keys();
    const flist = list.filter((w) => !keys.includes(w));
    if (flist.length === 0) {
        putToast(txt("无新添加词"));
        return;
    }
    const iel = textarea().sv(flist.sort().join("\n")).style({ height: "200px" });
    const p = (await interModal(view("y").add(["确定添加以下单词到拼写吗？", iel]), undefined, () => iel.el.value)).v;
    if (!p) return;
    const rlist = randomList(p.split("\n"));
    const now = time() - timeD.d(5);
    for (const word of rlist) {
        const card = createEmptyCard(now);
        const sCards = fsrsSpell.repeat(card, now)[Rating.Easy].card;
        await spellStore.setItem(word, sCards);
    }
    putToast(txt("已添加"));
}

async function showNormalBook(book: Book, s: Section) {
    console.log(s);

    bookContentEl.add(
        iconEl("recume").on("click", async () => {
            autoPlay = true;
            autoPlayTTSEl.el.checked = true;
            await pTTS(0);
            if ((await getTtsConfig()).engine === "ms")
                for (let i = 1; i < contentP.length; i++) {
                    await getOnlineTTS(contentP[i]);
                }
        }),
    );

    const stopTime = txt("");
    const stopTimeEl = iconEl("ok").on("click", () => {
        const dt = (new Date().getTime() - readTime) / timeD.m(1);
        stopTime.sv(`${Math.round(wordCount / dt)}${wordDanwei}/分钟`);
    });

    bookContentEl.add(
        iconEl("recume").on("click", () => {
            readTime = new Date().getTime();
        }),
    );

    function getWordValue() {
        const sp = split;
        const l = getTextWordValue(sp.map((i) => i.segment));
        const x: { index: number; value: number }[] = [];
        for (const [index, i] of l.entries()) {
            // todo match
            x.push({ index: sp[index].index, value: i.value });
        }
        console.log(x);
        return x;
    }

    bookContentEl.add(
        iconEl("search").on("click", () => {
            const x = getWordValue();
            for (const v of x) {
                const el = bookContentEl.query(`[data-s="${v.index}"]`);
                if (el) {
                    el.style({ opacity: v.value });
                }
            }
        }),
    );

    const segmenter = new Segmenter(book.language, { granularity: book.wordSplit || "word" });
    const split = Array.from(segmenter.segment(s.text));
    const wordCount = split.filter((w) => w.isWordLike === undefined || w.isWordLike).length;
    const wordDanwei = (book.wordSplit || "word") === "word" ? "词" : "字";
    const osL = Array.from(new Segmenter(book.language, { granularity: "sentence" }).segment(s.text));
    const sL: Intl.SegmentData[] = [];
    const sx = ["Mr.", "Mrs.", "Ms.", "Miss.", "Dr.", "Prof.", "Capt.", "Lt.", "Sgt.", "Rev.", "Sr.", "Jr.", "St."].map(
        (i) => `${i} `,
    );
    const sxS = sx.map((i) => ` ${i}`);
    for (let i = 0; i < osL.length; i++) {
        const seg = osL[i].segment;
        if (seg.endsWith(" ") && (sx.includes(seg) || sxS.some((i) => seg.endsWith(i)) || seg.match(/[A-Z]\. ?$/))) {
            const x = osL[i];
            const next = osL[i + 1];
            if (next) x.segment += next.segment;
            sL.push(x);
            i++;
        } else {
            sL.push(osL[i]);
        }
    }
    const plist: { text: string; start: number; end: number; isWord: boolean }[][][] = [[]];
    for (const sentence of sL) {
        if (/^\n+/.test(sentence.segment)) {
            plist.push([]);
            continue;
        }
        const sen: (typeof plist)[0][0] = [];
        plist.at(-1)?.push(sen); // last p add sen
        const wL = Array.from(segmenter.segment(sentence.segment));
        for (const word of wL) {
            const lastC = sen?.at(-1);
            if (word.segment === "#" && lastC?.text === "#") {
                lastC.text += "#";
                lastC.end += 1;
            } else {
                const s = sentence.index + word.index;
                if (!/\n+/.test(word.segment))
                    sen.push({
                        text: word.segment,
                        start: s,
                        end: s + word.segment.length,
                        isWord: word.isWordLike === undefined || word.isWordLike,
                    });
            }
        }
        if (sentence.segment.at(-1) === "\n") {
            plist.push([]);
        }
    }

    console.log(plist);

    bookContentEl.add(p(`${wordCount}${wordDanwei}`).style({ fontSize: "1rem" }));

    bookContentEl.add(
        ele("h1")
            .add(s.title)
            .on("click", async () => {
                if ((await getBooksById(nowBook.book))?.canEdit) setSectionTitle(nowBook.sections);
            }),
    );

    wordFreq = {};
    const highFreq: string[] = [];
    properN = [];

    for (const paragraph of plist) {
        if (paragraph.length === 0) continue;
        let pel: ElType<HTMLElement> = p();
        let t = 0;
        for (let i = 0; i <= 6; i++) {
            const x = paragraph[0]?.[i]?.text;
            if (x) {
                if (x.match(/#+/)) t += x.length;
                else if (x === " ") break;
                else {
                    t = 0;
                    break;
                }
            } else {
                t = 0;
                break;
            }
        }
        if (t) pel = ele(`h${t}`);

        if (paragraph.length === 1 && paragraph[0].length >= 3 && paragraph[0].every((i) => i.text === "-")) {
            pel = ele("hr");
            bookContentEl.add(pel);
            continue;
        }
        if (paragraph[0][0].text === ">") {
            pel = ele("blockquote");
            bookContentEl.add(pel);
            t = paragraph[0].findIndex((i) => i.text !== ">" && i.text[0] !== " ");
        }

        const moreEl = view("x").class("p_more");
        pel.add(moreEl);

        const sens: ElType<HTMLElement>[] = [];

        for (const si in paragraph) {
            const sen = paragraph[si];
            const senEl = txt();
            const words: ElType<HTMLElement>[] = [];
            for (const i in sen) {
                const word = sen[i];
                if (si === "0" && Number(i) < t) continue;
                const span = txt(await textTransformer(word.text));
                span.data({ s: String(word.start), e: String(word.end), w: String(word.isWord), t: word.text });
                words.push(span);

                const src = lemmatizer(word.text.toLocaleLowerCase());
                if (wordFreq[src]) wordFreq[src]++;
                else wordFreq[src] = 1;

                if (!t && i !== "0" && word.text.match(/^[A-Z]/)) properN.push(word.text);
            }
            senEl.add(words);
            senEl
                .on("click", async (ev) => {
                    const span = ev.target as HTMLSpanElement;
                    if (span.tagName !== "SPAN") return;
                    if (!span.getAttribute("data-s")) return;
                    if (span.getAttribute("data-w") === "false") return;

                    const marked = span.classList.contains(MARKWORD) || span.classList.contains(VISITMARKWORD);

                    let startI = si === "0" ? t : 0;
                    let endI = -1;
                    while (sen.at(startI + 1) && sen.at(startI)?.text === " ") {
                        startI++;
                    }
                    while (sen.at(endI - 1) && sen.at(endI)?.text === " ") {
                        endI--;
                    }

                    const s = (sen.at(startI) as (typeof sen)[0]).start;
                    const e = (sen.at(endI) as (typeof sen)[0]).end;

                    // 由于点击了单词，单词不是空格，单词在句子里
                    // 故句子一定有至少一个元素，且不全是空格，至少能匹配到此单词

                    const id = await saveCard({
                        key: lemmatizer((span.getAttribute("data-t") as string).toLocaleLowerCase()),
                        index: [Number(span.getAttribute("data-s")), Number(span.getAttribute("data-e"))] as TxtSlice,
                        cindex: [s, e] as TxtSlice,
                    });
                    if (id)
                        if (
                            marked || // saveCard会添加mark，故提取定义marked
                            highFreq.includes(lemmatizer(span.innerText.toLocaleLowerCase())) ||
                            dicEl.el.classList.contains(DICSHOW)
                        ) {
                            showDic(id);
                        }
                })
                .on("contextmenu", async (ev) => {
                    ev.preventDefault();
                    const span = ev.target as HTMLSpanElement;
                    if (span.tagName !== "SPAN") return;
                    const start = Number(span.getAttribute("data-s"));
                    const end = Number(span.getAttribute("data-e"));
                    const text = await changeEdit(true);
                    if (text) {
                        text.el.setSelectionRange(start, end);
                        text.el.focus();
                    }
                });
            sens.push(senEl);
        }
        pel.add(sens);

        const pText = editText.slice(paragraph[0]?.[0]?.start ?? null, paragraph.at(-1)?.at(-1)?.end ?? 0);
        if (pText) {
            const i = contentP.length;
            moreEl.add(
                iconEl("recume").on("click", () => {
                    const p = contentP.at(i);
                    if (p) showLisent(p, moreEl);
                }),
            );
        }
        contentP.push(pText);

        moreEl.add([
            iconEl("translate").on("click", () => {
                translateContext(pel.el);
            }),
            iconEl("exTrans").on("click", () => {
                exTrans(pel.el, 0, book);
            }),
        ]);

        const playControl = view("x").style({ alignItems: "center" });
        const audioEl = ele("audio")
            .attr({ controls: false })
            .on("timeupdate", () => {
                playJdtC.sv(audioEl.currentTime / audioEl.duration);
            })
            .on("pause", () => {
                playB.sv(false);
            })
            .on("play", () => {
                playB.sv(true);
            }).el;
        const playB = check("p", [iconEl("pause"), iconEl("recume")]).on("input", async () => {
            if (playB.gv === true) {
                if (!audioEl.src) {
                    audioEl.src = (await getOnlineTTS(pText)).url;
                    playControl.add(playJdt);
                }
                audioEl.play();
            } else {
                audioEl.pause();
            }
        });
        const playJdt = view().style({
            width: "150px",
            height: "14px",
            background: "#ccc",
            borderRadius: "4px",
            overflow: "hidden",
        }); // todo keyboard
        const playJdtC = view()
            .addInto(playJdt)
            .style({ width: 0, height: "100%", background: "var(--color)", pointerEvents: "none" })
            .bindSet((v: number) => playJdtC.style({ width: `${v * 100}%` }));
        trackPoint(playJdt, {
            start: () => {
                audioEl.pause();
                return { x: 0, y: 0 };
            },
            ing: ({ x }) => {
                const dt = x * 0.1;
                const nt = Math.max(0, Math.min(audioEl.currentTime + dt, audioEl.duration));
                playJdtC.sv(nt / audioEl.duration);
                return nt;
            },
            end: (e, { ingData }) => {
                if (ingData === undefined) {
                    const nt = (e.offsetX / playJdt.el.offsetWidth) * audioEl.duration;
                    playJdtC.sv(nt / audioEl.duration);
                    audioEl.currentTime = nt;
                } else {
                    audioEl.currentTime = ingData;
                }
                audioEl.play();
            },
        });

        playControl.add([playB]).addInto(moreEl);

        bookContentEl.add(pel);
    }

    updateMark(s.words);

    for (const i in wordFreq) {
        if (wordFreq[i] >= 3) highFreq.push(i);
    }

    contextChangeObserver.disconnect();

    dicFun = null;
    bookContentEl.add(dicEl);

    bookContentEl.add(view("x").add([stopTimeEl, stopTime]));

    contextChangeObserver.observe(bookContentEl.el);

    bookContentContainerEl.attr({ lang: book.language });
}

function setScrollPosi(eel: ElType<HTMLElement>, posi: number) {
    const el = eel.el;
    el.scrollTop = posi * (el.scrollHeight - el.offsetHeight);
}
function getScrollPosi(eel: ElType<HTMLElement>) {
    const el = eel.el;
    const n = el.scrollTop / (el.scrollHeight - el.offsetHeight);
    return n;
}

async function showLisent(text: string, fromEl: ElType<HTMLElement>) {
    const osL = Array.from(new Segmenter("en", { granularity: "sentence" }).segment(text));
    console.log(
        osL,
        osL.map((i) => i.segment),
    );
    const mainL = osL.map((i) => i.segment.trim());
    let sL: string[] = [];
    for (const i of mainL) {
        const nl = i
            .replaceAll(/(\D)[,，\-—:：](\D)/g, "$1\n$2")
            .split("\n")
            .filter(Boolean);
        for (let i = 0; i < nl.length; i++) {
            const element = nl[i];
            if ((element.trim().match(/\s/g) || []).length <= 3) {
                // 简单词，如thus，for instance，in my opinion等，
                // 一般向前合并，如too，such as a,b,c，如果前面没有向后合并
                if (nl[i - 1]) {
                    sL[sL.length - 1] += `, ${element}`;
                } else if (nl[i + 1]) {
                    sL.push(`${element}, ${nl[i + 1]}`);
                    i++;
                } else {
                    sL.push(element);
                }
            } else {
                sL.push(element);
            }
        }
    }
    sL = sL.map((i) => i.replaceAll(/^["'“‘]/g, "").replaceAll(/["'”’]$/g, ""));

    const d = ele("dialog").class("play_list");
    const playsEl = view("y");
    playEl(sL);
    d.add(playsEl);
    function playEl(l: string[]) {
        playsEl.clear();
        playsEl.add(
            l.map((s) =>
                view().add([
                    iconEl("recume").on("click", () => {
                        runTTS(s);
                    }),
                    iconEl("more").on("click", (_, el) => {
                        showRecord(s, el);
                    }),
                    p(s),
                ]),
            ),
        );
    }
    let pausePlayP: () => void;
    d.add(
        view().add([
            button("按句").on("click", () => {
                playEl(mainL);
            }),
            button("按小句").on("click", () => {
                playEl(sL);
            }),
            iconEl("recume").on("click", async () => {
                if (pausePlayP) {
                    pausePlayP();
                    pausePlayP = () => {};
                } else {
                    pausePlayP = (await runTTS(text)).cancel;
                }
            }),
            iconEl("close").on("click", () => {
                d.el.close();
                pausePlayP();
            }),
        ]),
    );
    dialogX(d, fromEl);
}

async function showRecord(text: string, fromEl: ElType<HTMLElement>) {
    const d = ele("dialog");
    dialogX(d, fromEl);

    const textEl = p(text).style({ width: "80dvw" });

    const x = view().style({ width: "80dvw" });
    const recordX = view().style({ width: "80dvw" });

    d.add(textEl);
    d.add(x);
    d.add(
        button("+").on("click", () => {
            playWs.regions.addRegion({ start: playWs.ws.getDuration() / 2 });
        }),
    );
    d.add(recordX);

    const tts = await getOnlineTTS(text);

    function wss(el: HTMLElement, url: string) {
        const regions = RegionsPlugin.create();
        const ws = WaveSurfer.create({
            container: el,
            waveColor: "#ccc",
            progressColor: "#999",
            url: url,
            sampleRate: 11025,
            plugins: [regions],
            minPxPerSec: 200,
        });

        ws.on("decode", () => {
            const main: { start: number; end: number; t: string }[] = [];
            console.log(main);

            for (const i of main) {
                regions.addRegion({
                    start: i.start,
                });
            }
        });

        ws.on("decode", () => {
            const peaks = ws.getDecodedData()?.getChannelData(0);
            if (!peaks) return;
            const { frequencies, baseFrequency } = findPitch(peaks, ws.options.sampleRate);

            // Render the frequencies on a canvas
            const pitchUpColor = "#385587";
            const pitchDownColor = "#C26351";
            const height = 100;

            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
            canvas.width = frequencies.length;
            canvas.height = height;
            canvas.style.width = "100%";
            canvas.style.height = "100%";
            canvas.style.zIndex = "2";

            // Each frequency is a point whose Y position is the frequency and X position is the time
            const pointSize = devicePixelRatio;
            let prevY = 0;
            frequencies.forEach((frequency, index) => {
                if (!frequency) return;
                const y = Math.round(height - (frequency / (baseFrequency * 2)) * height);
                ctx.fillStyle = y > prevY ? pitchDownColor : pitchUpColor;
                ctx.fillRect(index, y, pointSize, pointSize);
                prevY = y;
            });

            // Add the canvas to the waveform container
            // @ts-ignore
            ws.renderer.getWrapper().appendChild(canvas);
            // Remove the canvas when a new audio is loaded
            ws.once("load", () => {
                canvas.remove();
            });

            ws.once("ready", () => {
                setText();
            });
        });

        let activeRegion: null | Region = null;
        let lastWord = "";
        regions.on("region-in", (region) => {
            if (activeRegion && region !== activeRegion) {
                ws.pause();
                activeRegion = null;
                ws.setPlaybackRate(1);
            }
        });
        regions.on("region-clicked", (region, e) => {
            e.stopPropagation();
            activeRegion = region;
            const thisWord = region.content?.innerText;
            if (thisWord === lastWord) {
                ws.setPlaybackRate(0.5, true);
                lastWord = "";
            } else {
                ws.setPlaybackRate(1);
                lastWord = thisWord ?? "";
            }
            region.play();
        });
        regions.on("region-updated", () => {
            setText();
            const rs = regions.getRegions();
            for (const r of rs) {
                if (r.start < 0.05 || r.start > ws.getDuration() - 0.05) r.remove();
            }
        });

        function setText() {}
        ws.on("interaction", (e) => {
            ws.play();
        });
        ws.on("finish", () => {
            ws.setTime(0);
        });

        return { ws, regions };
    }

    const playWs = wss(x.el, tts.url);

    const recordWs = wss(recordX.el, "");

    const recordB = iconEl("mic");
    let startR = false;

    const record = RecordPlugin.create({ renderRecordedAudio: false });
    recordB.on("click", async () => {
        if (startR) {
            stopR();
            recordB.clear().add(iconEl("mic"));
        } else {
            startR = true;
            await record.startRecording();
            recordB.clear().add(iconEl("pause"));
        }
    });
    function stopR() {
        record.stopRecording();
    }
    record.on("record-end", (blob) => {
        const recordedUrl = URL.createObjectURL(blob);
        recordWs.ws.empty();
        recordWs.ws.load(recordedUrl);
    });

    d.add(
        view("x").add([
            recordB,
            spacer(),
            iconEl("close").on("click", () => {
                d.el.close();
            }),
        ]),
    );
}

async function translateContext(p: HTMLElement) {
    const filter = p.querySelector(":scope > span[data-trans]") ? [] : await transCache.keys();
    let l = Array.from(p.querySelectorAll(":scope > span")) as HTMLSpanElement[];
    for (const i in l) {
        const r = (await transCache.getItem(l[i].innerText.trim())) as string;
        if (r) l[i].setAttribute("data-trans", r);
    }

    l = l.filter((i) => !filter.includes(i.innerText.trim()));
    const text = l.map((i) => i.innerText);

    if (text.length === 0) return;

    const f = new autoFun.def({ script: ["把输入的语言翻译成中文"], output: "list:[]" });
    const ff = f.run(text as any);
    const stopEl = iconEl("close").on("click", () => {
        ff.stop.abort();
        pel.remove();
    });
    const pel = view().add([txt("AI正在翻译段落"), stopEl]);
    putToast(pel, 0);
    ff.result.then((r) => {
        pel.remove();
        // @ts-ignore
        if (r.list.length !== text.length) return;
        for (const i in l) {
            // @ts-ignore
            l[i].setAttribute("data-trans", r.list[i]);
            // @ts-ignore
            transCache.setItem(text[i].trim(), r.list[i]);
        }
    });
}

async function exTrans(pEl: HTMLElement, i: number, book: Book) {
    const span = pEl.children[i + 1] as HTMLSpanElement;

    const f = frame("exTrans", {
        _: view().style({
            position: "absolute",
            top: `${span.offsetTop - (pEl.children[0].getBoundingClientRect().y - pEl.getBoundingClientRect().y)}px`,
            width: "100%",
        }),
        text: textarea()
            .style({
                width: "100%",
                resize: "vertical",
                "font-size": "inherit",
                "line-height": "inherit",
                "font-family": "inherit",
                // @ts-ignore
                "field-sizing": "content",
            })
            .attr({ autocomplete: "off" }),

        diffEl: view().style({
            width: "100%",
            "font-size": "inherit",
            "line-height": "inherit",
            "font-family": "inherit",
            display: "none",
        }),

        buttons: {
            _: view("x").style({
                position: "absolute",
                top: "-32px",
                "font-size": "1rem",
                "line-height": "1",
                "align-items": "center",
                background: "var(--bg1)",
                "backdrop-filter": "var(--blur)",
                "border-radius": "var(--border-radius)",
            }),
            last: iconEl("left"),
            next: iconEl("right"),
            diff: iconEl("eye"),
            ai: iconEl("ai"),
            close: iconEl("close"),
            spellTip: {
                _: iconEl("more"),
                spellTipList: view("y").style({
                    position: "absolute",
                    top: "0",
                    left: "100%",
                    display: "none",
                    background: "var(--bg)",
                    "border-radius": "2px",
                    padding: "2px",
                    gap: "2px",
                }),
            },
            sum: txt()
                .bindSet((v: number, el) => {
                    el.setAttribute("data-v", String(v));
                    el.innerText = `${(v * 100).toFixed(1)}%`;
                })
                .bindGet((el) => Number(el.getAttribute("data-v") || 0))
                .style({ padding: "4px" }),
            tips: view("x").style({ gap: "4px", "padding-right": "4px" }),
        },
    });

    pEl.append(f.el.el);

    span.classList.add("exTransHide");

    function input() {
        let n = 0;
        const diff = dmp.diff_main(f.els.text.el.value, text);
        for (const i of diff) {
            if (i[0] === 0) {
                n += i[1].length;
            }
        }
        f.els.sum.sv(n / text.length);
    }

    f.els.text.on("input", input);

    function rm() {
        f.el.el.remove();
        span.className = "";
        if (f.els.text.gv.trim() && f.els.sum.gv > 0.95) {
            const now = time();
            const l = splitWord(f.els.text.gv, book).filter((i) => i.isWordLike);
            exTransLog.setItem(String(now), { count: l.length, section: nowBook.sections });
        }
    }

    f.els.close.on("click", () => {
        rm();
    });

    f.els.last.on("click", () => {
        if (i === 0) {
            const lastP = pEl.previousElementSibling as HTMLElement;
            if (lastP.tagName === "P") {
                rm();
                exTrans(lastP, lastP.querySelectorAll(":scope>span").length - 1, book);
            }
        } else {
            rm();
            exTrans(pEl, i - 1, book);
        }
    });
    f.els.next.on("click", () => {
        if (i === pEl.querySelectorAll(":scope>span").length - 1) {
            const nextP = pEl.nextElementSibling as HTMLElement;
            if (nextP.tagName === "P") {
                rm();
                exTrans(nextP, 0, book);
            }
        } else {
            rm();
            exTrans(pEl, i + 1, book);
        }
    });
    let diffShow = false;
    f.els.diff.on("click", () => {
        diffShow = !diffShow;
        if (diffShow) {
            f.els.text.style({ display: "none" });
            const diffEl = f.els.diffEl;
            diffEl.style({ display: "" });
            diffEl.clear();

            // @ts-ignore
            const diff = dmp.diff_wordMode(f.els.text.el.value, text) as Diff[];
            for (let n = 0; n < diff.length; n++) {
                const i = diff[n];
                const ni = diff[n + 1];
                if (ni) {
                    if (i[0] === -1 && ni[0] === 1) {
                        // 对于更改的词，若词内部更改少，则详细展示，否则按词语展示
                        const ndiff = dmp.diff_main(i[1], ni[1]);
                        if (ndiff.length <= 3) {
                            for (const i of ndiff) {
                                render(i);
                            }
                            n++;
                            continue;
                        }
                    }
                }
                render(i);
            }
            function render(i: Diff) {
                if (i[0] === 0) {
                    diffEl.add(txt(i[1]));
                } else if (i[0] === 1) {
                    diffEl.add(txt(i[1]).class("diff_add"));
                } else {
                    diffEl.add(txt(i[1]).class("diff_remove"));
                }
            }
        } else {
            f.els.text.style({ display: "" });
            f.els.diffEl.style({ display: "none" });
        }
    });

    f.els.ai.on("click", async () => {
        const x = `这是我默写的一个句子：\n${f.els.text.el.value}\n这是句子的原文\n${text}\n翻译我的默写\n暗示我：对于词语词组表达的不同，指出原文表达，指出他们与默写的差别；对于语法结构的不同，提示我需要改成什么语法结构，不需要指出原文，不需要给出修改。上述不同，若没有则不用提示。我将根据你的暗示，猜测需要的具体修改`;
        const t = await ai([{ role: "user", content: x }]).text;
        const el = view().add([p(t), iconEl("close").on("click", () => el.el.remove())]);
        putToast(el, 0);
    });

    f.els.spellTip.on("click", (e, tel) => {
        if (e.target !== tel.el) return;
        const list = f.els.spellTipList;
        if (list.el.style.display === "flex") {
            list.style({ display: "none" });
        } else {
            list.style({ display: "flex" });
            list.clear();
            const textEl = f.els.text.el;
            const nowI = textEl.selectionStart;
            const x = Array.from(
                new Segmenter(book.language, { granularity: book.wordSplit || "word" }).segment(textEl.value),
            ).find((i) => i.index <= nowI && nowI <= i.index + i.segment.length);
            console.log(x);
            if (!x || !x.isWordLike) return;
            const fuse = new Fuse(
                segmenter.map((i) => i.segment),
                {
                    includeMatches: true,
                    findAllMatches: true,
                    useExtendedSearch: true,
                    includeScore: true,
                },
            );
            const fr = fuse.search(x.segment);
            console.table(fr);
            list.add(
                fr.map((i) =>
                    view()
                        .add(i.item)
                        .on("click", async () => {
                            textEl.setSelectionRange(x.index, x.index + x.segment.length);
                            textEl.setRangeText(i.item);
                            input();
                            list.style({ display: "none" });
                            const xx = frame("ex_diff", {
                                _: view(),
                                diff: {
                                    _: view("x"),
                                    diffE: spellDiffWord(i.item, x.segment),
                                    reDiff: button().on("click", () => {
                                        xx.els.diffE.el.innerHTML = spellDiffWord(i.item, x.segment).el.innerHTML;
                                        spellErrorAnimate(xx.els.diffE);
                                    }),
                                },
                                add: view(),
                            });
                            let cardId = i.item.toLowerCase();
                            let card = await spellStore.getItem(cardId);
                            if (!card) {
                                cardId = lemmatizer(cardId);
                                card = await spellStore.getItem(cardId);
                            }
                            interModal(xx.el, [
                                card
                                    ? [
                                          button()
                                              .add(`标记 ${cardId} 为错误`)
                                              .on("click", () => {
                                                  setSpellCard(cardId, card, Rating.Again, 1000);
                                              }),
                                          "ok",
                                      ]
                                    : null,
                                [iconEl("close").style({ width: "var(--size0)", "flex-shrink": 0 }), "cancel"],
                            ]);

                            spellErrorAnimate(xx.els.diffE);
                        }),
                ),
            );
        }
    });

    const text = span.innerText;
    const segmenter = Array.from(new Segmenter(book.language, { granularity: book.wordSplit || "word" }).segment(text));
    const spellWord = await getIgnoreWords();
    await spellStore.iterate((v, k: string) => {
        if (v.state === State.Review) {
            spellWord.add(k);
        }
    });
    const tipWord: string[] = [];
    for (const i of segmenter) {
        if (!i.isWordLike) continue;
        if (i.segment[0].match(/[A-Z]/)) {
            tipWord.push(i.segment);
        } else if (!(spellWord.has(lemmatizer(i.segment)) || spellWord.has(i.segment))) {
            tipWord.push(i.segment);
        }
    }
    const tipEl = tipWord.map((i) =>
        txt(i).on("click", () => {
            const t = f.els.text.el;
            t.setRangeText(i);
            t.selectionStart = t.selectionEnd = f.els.text.el.value.length;
            t.focus();
            input();
        }),
    );
    f.els.tips.add(tipEl);
}

function showDiff(l: Diff[]) {
    const diffEl = view();
    for (const i of l) {
        if (i[0] === 0) {
            diffEl.add(txt(i[1]));
        } else if (i[0] === 1) {
            diffEl.add(txt(i[1]).class("diff_add"));
        } else {
            diffEl.add(txt(i[1]).class("diff_remove"));
        }
    }
    return diffEl;
}

function setBookStyle() {
    document.documentElement.setAttribute("data-theme", bookStyle.theme);
    setProperties({
        "--font-family": bookStyle.fontFamily,
        "--font-size": `${bookStyleList.fontSize[bookStyle.fontSize]}px`,
    });
    setProperties(
        {
            "--font-weight": `${bookStyle.fontWeight}`,
            "--line-height": `${bookStyleList.lineHeight[bookStyle.lineHeight]}em`,

            "--content-width": `${bookStyleList.contentWidth[bookStyle.contentWidth]}em`,
        },
        bookContentContainerEl.el,
    );
    setProperties({
        "--content-width": `min(${bookStyleList.contentWidth[bookStyle.contentWidth]}em, 100%)`,
    });
    bookContentContainerEl.style({ background: bookStyle.paper ? "" : "none" });
    setting.setItem("style.default", bookStyle);
}

function createRangeSetEl(value: number, maxV: number, f: (i: number) => void, minIcon: string, maxIcon: string) {
    const div = view();
    const min = iconEl(minIcon);
    const max = iconEl(maxIcon);
    const p = txt()
        .style({ "flex-grow": 1 })
        .bindSet((v: number, el) => {
            el.innerText = String(v + 1);
        })
        .sv(value);
    let v = value;
    min.on("click", () => {
        v--;
        v = Math.max(v, 0);
        p.sv(v);
        f(v);
    });
    max.on("click", () => {
        v++;
        v = Math.min(v, maxV);
        p.sv(v);
        f(v);
    });
    div.add([min, p, max]);
    return div;
}

async function changeEdit(b: boolean) {
    isEdit = b;
    if (isEdit) {
        changeEditEl.clear().add(iconEl("ok"));
        return setEdit();
    }
    const newC = view();
    bookContentContainerEl.clear().add(newC);
    bookContentEl = newC;
    if (nowBook.book) {
        const book = await getBooksById(nowBook.book);
        const sectionId = nowBook.sections;
        let section = await getSection(sectionId);
        if (!book || !section) return;
        book.updateTime = new Date().getTime();
        section.lastPosi = contentScrollPosi;
        if (editText && sectionId !== wordSection) {
            if (book.type === "word") editText = cleanWordBook(editText);
            section = changePosi(section, editText);
            section.text = editText;
            await sectionsStore.setItem(sectionId, section);
            if (nowBook.book !== coreWordBook.id) await bookshelfStore.setItem(nowBook.book, book);
        }
        showBookContent(book, sectionId);
    }
    changeEditEl.clear().add(iconEl("pen"));
}

async function setEdit() {
    const book = await getBooksById(nowBook.book);
    const sectionId = nowBook.sections;
    const section = await getSection(sectionId);
    if (!book || !section) return;
    bookContentContainerEl.clear();
    const textEl = textarea().attr({ disabled: !book.canEdit, value: section.text });
    const text = textEl;
    bookContentContainerEl.add(text);
    bookContentEl = textEl;
    setScrollPosi(text, contentScrollPosi);
    setScrollPosi(bookContentContainerEl, 0);
    // @ts-ignore
    window.getText = () => text.gv;
    // @ts-ignore
    window.setText = (str: string) => {
        text.svc = editText = str;
    };
    textEl
        .on("input", () => {
            editText = text.gv;
        })
        .on("keyup", async (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                const l = text.gv.split("\n");
                let index = 0;
                const aiRange: { s: number; e: number }[] = [];
                const startMark = "=ai=";
                const endMark = "====";
                let hasAi = false;
                for (const i of l) {
                    if (i === startMark) {
                        hasAi = true;
                        aiRange.push({ s: index + startMark.length, e: index + startMark.length });
                        index += i.length + 1;
                        continue;
                    }
                    if (hasAi && i === endMark) {
                        hasAi = false;
                        const l = aiRange.at(-1);
                        if (l) l.e = index;
                    }
                    index += i.length + 1;
                }
                const range = aiRange.find((r) => r.s <= text.el.selectionStart && text.el.selectionEnd <= r.e);
                if (!range) return;
                const aiM = textAi(text.gv.slice(range.s, range.e));
                if (aiM.at(-1)?.role !== "user") {
                    text.el.setRangeText("\n>");
                    return;
                }
                aiM.unshift({ role: "system", content: `This is a passage: ${text.gv.slice(0, aiRange[0].s)}` });
                console.log(aiM);
                const start = text.el.selectionStart;
                const end = text.el.selectionEnd;
                const aitext = await ai(aiM, "对话").text;
                const addText = `ai:\n${aitext}`;
                const changeText = text.gv.slice(0, start) + addText + text.gv.slice(end);
                text.sv(changeText);
                editText = changeText;
                text.el.setSelectionRange(start, start + addText.length);
            }
        });
    const upel = ele("input")
        .attr({ type: "file" })
        .on("change", () => {
            const file = upel.el.files?.[0];
            if (file) {
                let fileType: "text" | "docx" | null = null;
                console.log(file.type);

                if (file.name.endsWith("doc") || file.name.endsWith("docx")) {
                    fileType = "docx";
                }
                if (file.type === "text/plain") {
                    fileType = "text";
                }
                const reader = new FileReader();
                if (fileType === "docx") {
                    reader.readAsArrayBuffer(file);
                } else if (fileType === "text") {
                    reader.readAsText(file);
                }
                reader.onload = async () => {
                    let t = "";
                    if (fileType === "text") {
                        t = reader.result as string;
                    }
                    text.sv(t);
                    editText = t;
                };
            }
        });
    bookContentContainerEl.add(upel);

    text.on("scroll", () => {
        contentScrollPosi = getScrollPosi(text);
    });

    return text;
}

async function sectionSelect(menuEl: ElType<HTMLElement>) {
    const bookList: Book[] = [];
    await bookshelfStore.iterate((book) => {
        bookList.push(book);
    });
    const wordBooks = bookList.filter((b) => b.type === "word");
    menuEl.clear();
    for (const i of wordBooks) {
        const book = view().add(i.name).style({ "margin-bottom": "8px" });
        book.add(
            input("checkbox").on("click", (_, cel) => {
                for (const x of book.el.querySelectorAll("input").values()) x.checked = cel.el.checked;
            }),
        );

        for (const s of i.sections) {
            const section = await getSection(s);
            if (!section) continue;
            book.add(label([input("checkbox").sv(s).data({ type: i.type }), section.title]));
        }
        menuEl.add(book);
    }
    menuEl.add(ele("hr"));
    for (const i of bookList.filter((b) => b.type === "text")) {
        const book = view().add(label([input("checkbox").data({ type: i.type }).sv(i.id), i.name], 1));
        menuEl.add(book);
    }
    return menuEl;
}

function getSelectBooks(el: ElType<HTMLElement>) {
    return {
        word: Array.from(el.queryAll("input[data-type='word']:checked"))
            .map((i) => i.el.value)
            .filter((v) => v),
        book: Array.from(el.queryAll("input[data-type='text']:checked"))
            .map((i) => i.el.value)
            .filter((v) => v),
    };
}

function wordMarkChanged(w: Section["words"] = {}, init?: boolean) {
    console.log(w, Object.values(w).length);
    if (!init) {
        checkVisitAll(w);
    }
    reflashSectionEl(w);
    updateMark(w);
    updateVersion();
}

async function showMarkList() {
    markListEl.clear().attr({ lang: studyLan });
    const list = await getAllMarks();
    vlist(markListEl, list, { iHeight: 24, gap: 4, paddingTop: 16 }, (index, i, remove) => {
        const content = i.s.type === "word" ? i.s.id : editText.slice(i.s.index[0], i.s.index[1]);

        const item = view()
            .add(content)
            .class(i.s.visit ? "" : TODOMARK)
            .on("click", () => {
                jumpToMark(i.s.cIndex);
                showDic(i.id);
            })
            .on("contextmenu", (e) => {
                e.preventDefault();
                e.stopPropagation();
                menuEl.clear();
                menuEl.add(
                    view()
                        .add("删除")
                        .style({ color: "red" })
                        .on("click", async () => {
                            const sectionId = nowBook.sections;
                            const section = await getSection(sectionId);
                            if (i.s.type === "sentence") {
                                card2sentence.removeItem(i.s.id);
                            } else {
                                let record = await wordsStore.getItem(i.s.id);
                                if (record) {
                                    record = rmWord(record, i.id);
                                    await clearWordMean(record);
                                }
                            }
                            delete section?.words[i.id];
                            if (section) {
                                sectionsStore.setItem(sectionId, section);
                                wordMarkChanged(section.words);
                            }
                            remove();

                            if (i.id === nowDicId && dicEl.el.classList.contains(DICSHOW)) hideDicEl.el.click();
                        }),
                );
                showMenu(e.clientX, e.clientY);
            });
        return item;
    });
}

function jumpToMark([start, end]: [number, number], blink?: boolean) {
    bookContentContainerEl.style({ "scroll-behavior": "smooth" });
    const span = bookContentEl.query(`span[data-s="${start}"]`);
    const spanE = bookContentEl.query(`span[data-e="${end}"]`);
    if (!span || !spanE) {
        console.log(`no span ${start} ${end}`);
        return;
    }
    if (blink)
        span.el.animate(
            [
                { backgroundColor: "black", color: "white" },
                { backgroundColor: "white", color: "black" },
            ],
            {
                duration: 400,
                iterations: 3,
            },
        );
    const e = getDicPosi();
    // 60是粗略计算dic高度
    const dicInView = e + 60 < window.innerHeight && e > 0;
    if (e && dicInView) {
        bookContentContainerEl.el.scrollTop += spanE.el.getBoundingClientRect().bottom - e;
    } else {
        bookContentContainerEl.el.scrollTop =
            span.el.getBoundingClientRect().top -
            bookContentEl.el.getBoundingClientRect().top +
            bookContentEl.el.offsetTop;
    }

    bookContentContainerEl.el.onscrollend = () => {
        bookContentContainerEl.style({ "scroll-behavior": "initial" });
    };
}

function setDicPosi(el: HTMLElement) {
    dicEl.style({
        top: `${el.getBoundingClientRect().bottom - (bookContentEl.el.getBoundingClientRect().top - bookContentEl.el.scrollTop) + 24}px`,
    });
}
function getDicPosi() {
    const top = Number.parseFloat(dicEl.el.style.top);
    return top + (bookContentEl.el.getBoundingClientRect().top - bookContentEl.el.scrollTop) - 24;
}

function igBlankEl(el: HTMLElement, left: boolean) {
    let tel = el;
    if (left) {
        while (tel.nextElementSibling && tel.getAttribute("data-t") === " ") {
            tel = tel.nextElementSibling as HTMLElement;
        }
    } else {
        while (tel.previousElementSibling && tel.getAttribute("data-t") === " ") {
            tel = tel.previousElementSibling as HTMLElement;
        }
    }
    return tel;
}

async function showDic(id: string) {
    dicTransAi?.abort();
    dicTransAi = null;

    dicEl.class(DICSHOW);

    nowDicId = id;

    const sectionId = nowBook.sections;
    const section = await getSection(sectionId);
    if (!section) return;

    const s = states({
        type: async (v: "word" | "sentence", oldV) => {
            if (oldV === "word") {
                await change2Sentence();
            }
            if (v === "sentence") {
                showSentence(); // 最多触发两次
            } else {
                showWord(wordx.id); // 最多触发一次
            }
        },
        word: (v: string, oldV) => {
            if (oldV) changeWord(v, oldV);
        },
        context: async (v: string, oldV) => {
            if (oldV) {
                const record = s.wordRecord.get();
                const c = record?.means[s.wordMeansI.get()]?.contexts.find((i) => i.source.id === id);
                if (c) {
                    c.text = v;
                }
                s.wordRecord.set(record);
            }
        },
        contextIndex: async (v: TxtSlice, oldV) => {
            const context = editText.slice(...v);
            if (oldV) {
                wordx.cIndex = v;
                await saveWordX(wordx);
                if (s.type.get() === "word") {
                    const means = s.wordMeans.get();
                    const c = means[s.wordMeansI.get()]?.contexts.find((i) => i.source.id === id);
                    if (c) {
                        c.text = context;
                        c.index = wordIndex();
                        s.wordMeans.set(means);
                    }
                } else {
                    const r = await card2sentence.getItem(wordx.id);
                    if (r) {
                        r.text = context;
                        s.context.setV(context);
                        card2sentence.setItem(wordx.id, r);
                    }
                }
            }
            trackDic();
        },
        sourceIndex: (v: TxtSlice, oldV) => {
            if (oldV)
                if (s.type.get() === "word") {
                    const means = s.wordMeans.get();
                    const m = means[s.wordMeansI.get()];
                    const c = m.contexts.find((i) => i.source.id === id);
                    if (c) {
                        c.index = wordIndex();
                        s.wordMeans.set(means);
                    }
                }
        }, // sen sI和cI是一样的，word的sI小一点
        bookSource: (v: record["means"][0]["contexts"][0]["source"], oldV) => {},
        wordMeansI: (v: number, oldV) => {
            if (oldV !== undefined) changeDicMean(s.word.get(), v, oldV);
        },
        wordMeans: async (v: record["means"], oldV) => {
            if (oldV) {
                const record = s.wordRecord.get();
                console.log(record);

                if (record) {
                    record.means = v;
                    await s.wordRecord.setAsync(record);
                    const context = v[s.wordMeansI.get()]?.contexts.find((i) => i.source.id === id);
                    if (context) {
                        const sI = wordx.index;
                        s.sourceIndex.setV(sI);
                        s.context.setV(context.text);
                    }
                }
            }

            editMeanEl.style({ display: s.wordMeansI.get() === -1 ? "none" : "" });

            if (v.length) {
                dicDetailsEl.clear();

                const means = v;
                for (const [i, m] of means.entries()) {
                    const div = view();
                    const radio = input("radio")
                        .attr({ name: "dic_means" })
                        .on("click", async () => {
                            if (radio.el.checked) {
                                s.wordMeansI.set(Number(i));

                                visit(true);
                            }
                            editMeanEl.style({ display: "" });
                        });
                    if (Number(i) === s.wordMeansI.get()) radio.el.checked = true;
                    div.on("click", () => radio.el.click()).add([radio, ...(await disCard2(m)).map((i) => i.el)]);
                    dicDetailsEl.add(div);
                }
                if (s.wordMeansI.get() !== -1) dicDetailsEl.class(HIDEMEANS);
                else dicDetailsEl.el.classList.remove(HIDEMEANS);
            } else {
                dicDetailsEl.el.innerText = "请添加义项";
            }

            reviewMeanEl.clear();
            if (s.wordMeansI.get() !== -1) {
                const cardId = s.wordMeans.get()[s.wordMeansI.get()]?.card_id;
                if (cardId) {
                    const card = await cardsStore.getItem(cardId);
                    if (!card) return;
                    const buttons = getReviewCardButtons(cardId, card, "", (_, first) => {
                        if (!first) {
                            reviewMeanEl.clear();
                        }
                    });
                    reviewMeanEl.add(buttons.buttons);
                }
            }
        },
        wordCardId: (v: string, oldV) => {},
        wordRecord: async (v: record | null, oldV) => {
            if (oldV && v) {
                await wordsStore.setItem(wordx.id, v);
            }
        },
        wordNote: async (v: string, oldV) => {
            const record = await wordsStore.getItem(wordx.id);
            if (record) {
                record.note = v;
                await wordsStore.setItem(wordx.id, record);
            }
        },
        wordTag: (v: bOp, oldV) => {},
    });

    const wordx = section.words[id];

    const ss = source2context(wordx, id);
    s.sourceIndex.set(wordx.index);
    s.contextIndex.set(wordx.cIndex);
    s.context.set(ss.text);
    s.bookSource.set(ss.source);

    s.type.set(wordx.type);

    async function changeDicMean(word: string, i: number, oldI: number) {
        console.log(i, oldI);

        const means = s.wordMeans.get();
        const m = means[oldI];
        let nowContext: record["means"][0]["contexts"][0] | undefined;
        if (m) {
            nowContext = m.contexts.find((i) => i.source.id === id);
            m.contexts = m.contexts.filter((i) => i.source.id !== id);
        } else {
            console.log(`没有找到${oldI}的义项`);
        }

        if (i !== -1) {
            const m = means[i];
            if (m) {
                if (!nowContext)
                    nowContext = {
                        index: wordIndex(),
                        text: s.context.get(),
                        source: s.bookSource.get(),
                    };
                m.contexts.push(nowContext);
            } else {
                console.log(`没有找到${i}的义项，先创建`);
            }
        }
        console.trace("x");
        await s.wordMeans.setAsync(means);
        if (i === -1) await clearWordMean(s.wordRecord.get());
    }

    async function changeWord(newWord: string, oldWord: string) {
        await s.wordMeansI.setAsync(-1);

        const record = s.wordRecord.get();
        const nr = rmWord(record, s.bookSource.get().id);
        await clearWordMean(nr);

        wordx.id = newWord;
        await saveWordX(wordx);

        showWord(newWord);
    }

    function wordIndex() {
        const sI = s.sourceIndex.get();
        const cI = s.contextIndex.get();
        return [sI[0] - cI[0], sI[1] - cI[0]] as [number, number] as ReSlice;
    }

    dicTransB.el.onclick = () => {
        trans();
    };

    async function trans() {
        const output = await translate(s.context.get(), Boolean(dicTransContent.gv));
        dicTransAi = output.stop;
        const text = await output.text;
        if (text) {
            dicTransContent.sv(text);
            if (s.type.get() === "sentence") {
                setSentenceTrans();
            }
        }
    }

    toSentenceEl.el.onclick = async () => {
        if (s.type.get() === "sentence") return;
        if (!(await confirm("这将删除此单词，并将语境转为句子"))) return;
        s.type.set("sentence");
    };

    let setSentenceTrans = () => {};

    async function change2Sentence() {
        if (!section) return;
        const sentenceCardId = uuid();
        const contextStart = s.contextIndex.get()[0];
        const contextEnd = s.contextIndex.get()[1];
        s.sourceIndex.setV([contextStart, contextEnd] as TxtSlice);
        wordx.index[0] = contextStart;
        wordx.index[1] = contextEnd;
        wordx.type = "sentence";
        wordx.id = sentenceCardId;
        if (dicTransContent.gv) {
            wordx.visit = true;
        } else {
            wordx.visit = false;
        }
        await saveWordX(wordx);

        updateMark((await getSection(sectionId))?.words);

        const r: record2 = {
            text: s.context.get(),
            // @ts-ignore
            source: null,
            trans: dicTransContent.gv,
        };

        let card: Card | null = null;

        mf: for (const i of s.wordRecord.get()?.means || []) {
            for (const j of i.contexts) {
                if (j.source.id === id) {
                    r.source = j.source;
                    card = await cardsStore.getItem(i.card_id);
                    break mf;
                }
            }
        }
        if (!r.source) r.source = source2context(wordx, id).source;
        if (!card) {
            card = createEmptyCard();
            newCardAction(sentenceCardId);
        }
        await cardsStore.setItem(sentenceCardId, card as Card);

        await card2sentence.setItem(sentenceCardId, r);

        const record = rmWord(s.wordRecord.get(), s.bookSource.get().id);
        clearWordMean(record);
    }

    ttsWordEl.el.onclick = () => {
        play(s.word.get());
    };
    ttsContextEl.el.onclick = () => {
        runTTS(s.context.get());
    };

    async function visit(t: boolean) {
        wordx.visit = t;
        await saveWordX(wordx);
        wordMarkChanged(section?.words);
    }

    function trackDic() {
        const contextEnd = s.contextIndex.get()[1];
        const el = bookContentEl.query(`span[data-e="${contextEnd}"]`)?.el;
        if (el) setDicPosi(el);
        changeContext();
    }

    async function showWord(word: string) {
        const record = await wordsStore.getItem(wordx.id);
        console.log(wordx.id, record);
        s.word.set(wordx.id);
        const fl = flatWordCard(record, id);
        s.wordRecord.set(record);
        s.wordMeansI.set(fl.index);
        s.wordCardId.set(fl.card_id);
        s.wordMeans.set(record?.means || []);
        const sourceWord = s.context.get().slice(...wordIndex());
        console.log(s.context.get(), wordIndex(), sourceWord);

        dicEl.el.classList.remove(DICSENTENCE);
        dicTransContent.sv("");

        dicWordEl.sv(word);
        dicWordEl.el.onchange = async () => {
            const newWord = dicWordEl.gv.trim();
            await visit(false);
            s.word.set(newWord);
        };

        lessWordEl.el.onclick = () => {
            adjustWord("-");
        };
        moreWordEl.el.onclick = () => {
            adjustWord("+");
        };

        async function adjustWord(type: "+" | "-") {
            const sEl = bookContentEl.query(`span[data-s="${wordx.index[0]}"]`);
            const eEl = bookContentEl.query(`span[data-e="${wordx.index[1]}"]`);
            if (!sEl || !eEl) return;
            let e = wordx.index[1];
            if (!(type === "-" && sEl === eEl)) {
                const minE = Number(sEl.el.getAttribute("data-s"));
                const maxE = wordx.cIndex[1];
                const nextEl = type === "-" ? eEl.el.previousElementSibling : eEl.el.nextElementSibling;
                if (nextEl) {
                    const nextE = Number(nextEl.getAttribute("data-e"));
                    e = Math.max(minE, Math.min(maxE, nextE));
                }
            }

            const word = editText.slice(wordx.index[0], e);
            wordx.id = word;
            wordx.index[1] = e;
            await saveWordX(wordx);
            showDic(id);
            updateMark((await getSection(sectionId))?.words);
        }

        play(s.word.get());

        ttsWordEl.el.innerText = await getIPA(word);

        const lword = lemmatizer(sourceWord.toLocaleLowerCase());
        moreWordsEl.clear();
        const l = Array.from(new Set([sourceWord, sourceWord.toLocaleLowerCase(), lword, word, ...mutiSpell(word)]));
        if (l.length !== 1)
            for (const w of l) {
                const div = txt(w).on("click", async () => {
                    dicWordEl.sv(w);
                    await visit(false);
                    s.word.set(w);
                });
                moreWordsEl.add(div);
            }

        addMeanEl.el.onclick = () => {
            addP(
                "",
                word,
                s.context.get(),
                wordIndex(),
                s.wordTag.get(),
                async (text, sentence, index) => {
                    const mean = text.trim();
                    const x = s.wordMeans.get();

                    if (mean) {
                        s.wordRecord.setV(await tryInitWord(word));
                        const cardId = await newWordCard_Mean(word);
                        x.push({
                            card_id: cardId,
                            text: mean,
                            contexts: [],
                        });
                        s.wordMeans.set(x);
                        s.wordMeansI.set(x.length - 1);
                        visit(true);
                    }
                    wordMarkChanged(section?.words);
                },
                addMeanEl,
            );
        };

        editMeanEl.el.onclick = () => {
            const m = s.wordMeans.get().at(s.wordMeansI.get());
            if (!m) return;
            addP(
                m.text,
                word,
                s.context.get(),
                wordIndex(),
                null,
                async (text, sentence, index) => {
                    const mean = text.trim();
                    if (mean) {
                        const means = s.wordMeans.get();
                        const m = means.at(s.wordMeansI.get());
                        if (!m) return;
                        m.text = mean;
                        const con = m.contexts.find((i) => i.source.id === id);
                        if (!con) return;
                        con.text = sentence ?? "";
                        con.index = index ?? ([0, 0] as ReSlice);
                        s.wordMeans.set(means);
                    } else {
                        await visit(false);
                        s.wordMeansI.set(-1);
                    }
                    wordMarkChanged(section?.words);
                },
                editMeanEl,
            );
        };

        noteEl.el.onclick = () => {
            addP(
                s.wordNote.get() || "",
                word,
                "",
                null,
                null,
                async (text) => {
                    const mean = text.trim();
                    if (mean) s.wordNote.set(mean);
                },
                noteEl,
            );
        };

        feedbackEl.el.onclick = () => {
            // todo 根据仓库自定义url
            const url = "https://github.com/xushengfeng/rmbw-book/issues/new?title=`${word}` in ${sid}&body=${context}";
            const index = wordIndex();
            const context = s.context.get();
            const sourceWord = context.slice(...index);
            const xurl = url
                .replaceAll("${word}", sourceWord)
                .replaceAll("${sid}", s.bookSource.get().sections)
                .replaceAll("${context}", `${context.slice(0, index[0])}**${sourceWord}**${context.slice(index[1])}`);
            window.open(xurl);
        };
    }
    async function showSentence() {
        s.sourceIndex.setV(wordx.index);
        s.contextIndex.setV(wordx.index);

        dicEl.class(DICSENTENCE);

        dicWordEl.sv("");
        moreWordsEl.clear();
        dicTransContent.sv((await card2sentence.getItem(wordx.id))?.trans);
        dicDetailsEl.clear();

        setSentenceTrans = async () => {
            const r = await card2sentence.getItem(wordx.id);
            if (!r) return;
            r.trans = dicTransContent.gv;
            await card2sentence.setItem(wordx.id, r);
            visit(true);
        };

        if (!dicTransContent.gv) {
            trans();
        }

        dicTransContent.el.onchange = () => {
            setSentenceTrans();
        };

        noteEl.el.onclick = async () => {
            const r = await card2sentence.getItem(wordx.id);
            if (!r) return;
            addP(
                r.note || "",
                "",
                r.text,
                null,
                null,
                async (text) => {
                    const mean = text.trim();
                    r.note = mean;
                    await card2sentence.setItem(wordx.id, r);
                },
                noteEl,
            );
        };
    }

    function changeContext() {
        let contextStart = 0;
        let contextEnd = 0;
        const isSentence = s.type.get() === "sentence";
        contextStart = s.contextIndex.get()[0];
        contextEnd = s.contextIndex.get()[1];
        const startClass = "context_start";
        const endClass = "context_end";
        const startEl = view().class(startClass);
        const endEl = view().class(endClass);
        bookContentEl.query(`.${startClass}`)?.remove();
        bookContentEl.query(`.${endClass}`)?.remove();
        bookContentEl.add([startEl, endEl]);
        function setElPosi(el: HTMLElement, left: boolean) {
            function getOffset(el: HTMLElement) {
                const pel = bookContentEl;
                const r = el.getBoundingClientRect();
                const r0 = pel.el.getBoundingClientRect();
                return { left: r.left - r0.left, top: r.top - (r0.top - pel.el.scrollTop) };
            }
            if (left) {
                let nel = el;
                if (!isSentence && Number(el.getAttribute("data-s")) > wordx.index[0]) {
                    const _nel = bookContentEl.query(`span[data-s="${wordx.index[0]}"]`)?.el;
                    if (_nel) nel = _nel;
                }
                nel = igBlankEl(nel, true);
                startEl.style({ left: `${getOffset(nel).left}px`, top: `${getOffset(nel).top}px` });
                return Number(nel.getAttribute("data-s"));
            }
            // right
            let nel = el;
            if (!isSentence && Number(el.getAttribute("data-s")) < wordx.index[0]) {
                const _nel = bookContentEl.query(`span[data-s="${wordx.index[0]}"]`)?.el;
                if (_nel) nel = _nel;
            }
            nel = igBlankEl(nel, false);
            endEl.style({
                left: `${getOffset(nel).left + nel.offsetWidth}px`,
                top: `${getOffset(nel).top}px`,
            });
            return Number(nel.getAttribute("data-e"));
        }
        function matchRangeEl(n: number, left: boolean) {
            for (let i = 0; i < editText.length - n + 1; i++) {
                for (const ii of [-1, 1]) {
                    const el = bookContentEl.query(`span[data-${left ? "s" : "e"}="${n + i * ii}"]`)?.el;
                    if (el) {
                        return el;
                    }
                }
            }
        }
        const contextStartEl = matchRangeEl(contextStart, true);
        const contextEndEl = matchRangeEl(contextEnd, false);
        if (!contextStartEl || !contextEndEl) return;
        contextStart = setElPosi(contextStartEl, true);
        contextEnd = setElPosi(contextEndEl, false);
        const down = { start: false, end: false };
        const index = { start: contextStart, end: contextEnd };
        startEl.el.onpointerdown = (e) => {
            down.start = true;
            dicEl.el.classList.remove(DICSHOW);
        };
        endEl.el.onpointerdown = (e) => {
            down.end = true;
            dicEl.el.classList.remove(DICSHOW);
        };
        document.onpointermove = (e) => {
            if (down.start) {
                const x = e.clientX;
                const y = e.clientY + 8;
                const list = document.elementsFromPoint(x, y);
                for (const i of list) {
                    if (i.getAttribute("data-t")) {
                        index.start = setElPosi(i as HTMLElement, true);
                    }
                }
            }
            if (down.end) {
                const x = e.clientX;
                const y = e.clientY - 8;
                const list = document.elementsFromPoint(x, y);
                for (const i of list) {
                    if (i.getAttribute("data-t")) {
                        index.end = setElPosi(i as HTMLElement, false);
                    }
                }
            }
        };
        document.onpointerup = (e) => {
            if (down.start || down.end) {
                console.log(editText.slice(index.start, index.end));
                saveChange();
                dicEl.class(DICSHOW);
            }
            down.start = false;
            down.end = false;
        };
        async function queryNearIndex() {
            const allMarks = await getAllMarks();
            const nowIndex = allMarks.findIndex((i) => i.id === id);
            if (nowIndex === -1) return;

            const c = allMarks
                .slice(0, nowIndex)
                .toReversed()
                .concat(allMarks.slice(nowIndex + 1))
                .find(({ s: { cIndex } }) => cIndex[0] <= wordx.index[0] && wordx.index[1] <= cIndex[1]);
            console.log(c);

            if (c) return c.s.cIndex;
        }
        startEl.el.oncontextmenu = async (e) => {
            e.preventDefault();
            const ni = await queryNearIndex();
            if (ni) {
                index.start = ni[0];
                saveChange();
                dicEl.class(DICSHOW);
            }
        };
        endEl.el.oncontextmenu = async (e) => {
            e.preventDefault();
            const ni = await queryNearIndex();
            if (ni) {
                index.end = ni[1];
                saveChange();
                dicEl.class(DICSHOW);
            }
        };
        async function saveChange() {
            s.contextIndex.set([index.start, index.end] as TxtSlice);
            if (isSentence) {
                wordx.index = [index.start, index.end] as TxtSlice;
                await saveWordX(wordx);
            }
        }
        hideDicEl.el.onclick = () => {
            startEl.remove();
            endEl.remove();

            dicEl.el.classList.remove(DICSHOW);

            dicFun = null;

            dicTransAi?.abort();
            dicTransAi = null;
        };
    }

    async function saveWordX(wordX: typeof wordx) {
        const section = await getSection(sectionId);
        if (!section) return;
        section.words[id] = wordX;
        await sectionsStore.setItem(sectionId, section);
    }

    dicFun = {
        changeContext,
        trackDic,
    };
}

async function showDicEl(mainTextEl: ReturnType<typeof textarea>, word: string, fromEl: ElType<HTMLElement>) {
    const { x, y } = fromEl.el.getBoundingClientRect();
    const lan = studyLan;
    const list = view().attr({ lang: lan });
    async function showDic(id: string) {
        list.clear();
        const tmpdiv = view();
        tmpdiv.el.innerHTML = await getWordFromDic(word, id);
        for (const i of tmpdiv.el.innerText.split("\n").filter((i) => i.trim() !== "")) {
            const pel = p();
            pel.el.innerHTML = i;
            list.add(label([input("checkbox").sv(pel.el.innerText), pel]));
        }
    }
    const localDic = view();
    for (const i of Object.values(dics)) {
        localDic.add(
            txt(i.name || i.id).on("click", () => {
                showDic(i.id);
            }),
        );
    }
    if (Object.keys(dics).length) {
        showDic(Object.keys(dics)[0]);
    } else {
        localDic.clear().add("无词典");
    }
    const onlineList = onlineDicL(word).on("click", () => div.el.close());
    const div = ele("dialog")
        .class(DICDIALOG)
        .add([
            onlineList,
            localDic,
            list,
            view("x")
                .style({ "justify-content": "flex-end" })
                .add(
                    iconEl("ok").on("click", () => {
                        // 获取所有checked的值
                        const checkedValues = Array.from(list.queryAll("input[type='checkbox']:checked")).map(
                            (el) => el.el.value,
                        );
                        mainTextEl.el.setRangeText(checkedValues.join("\n"));
                        div.el.close();
                    }),
                ),
        ])
        .style({ left: `min(100vw - 400px, ${x}px)`, top: `min(100dvh - 400px, ${y}px - 400px)` });
    dialogX(div, fromEl);
}

function onlineDicL(word: string) {
    const lan = studyLan;
    const onlineList = view().class("online_dic");
    let l: OnlineDicsType = getSetting(onlineDicsPath);
    l = l.filter((i) => !i.lan || i.lan === lan);
    onlineList.add(l.map((i) => a(i.url.replace("%s", word)).add(i.name)));
    return onlineList;
}

async function disCard2(m: record["means"][0], filterWords: string[] = []) {
    let t = m.text;
    for (const i of filterWords) {
        t = t.replaceAll(i, "**");
    }
    const sen = (await dicSentences(m.contexts.toReversed())).style({ "padding-left": "1em" });
    return [view().add(pText(t)), sen];
}

async function dicSentences(contexts: record["means"][0]["contexts"]) {
    const sen = view().class("dic_sen");
    for (const s of contexts) {
        const source = s.source;
        const t = await getTitleEl(source.book, source.sections, source.id);
        sen.add(
            view().add(
                p().add([
                    view()
                        .add([
                            s.text.slice(0, s.index[0]),
                            txt(s.text.slice(...s.index)).class(MARKWORD),
                            s.text.slice(s.index[1]),
                        ])
                        .on("click", () => {
                            runTTS(s.text);
                        }),
                    // @ts-ignore
                    t,
                ]),
            ),
        );
    }
    return sen;
}

async function tagsEl(b: bOp) {
    const t = tag(await tagsStore.getItem("0"));
    function item(id: string, c: string) {
        return view().data({ id: id }).add(c);
    }
    function oEl(b: bOp) {
        const l = view();
        const classMap = {};
        const type = b[0];
        const x = b.slice(1) as (string | bOp)[];
        for (const i of x) {
            if (typeof i === "string") {
                const r = t.get(i);
                const tel = item(i, r.c);
                l.add(tel);
            } else {
                l.add(oEl(i));
            }
        }
        const add = button("+").on("click", () => {
            const d = ele("dialog");
            const l = view();
            const list = t.getList();
            vlist(l, list, { iHeight: 24 }, (i, v) => {
                const e = txt().on("click", () => {
                    add.el.before(item(v[0], v[1].c).el);
                    d.el.close();
                });
                return e;
            });
            const si = input();
            const search = view().add([
                si,
                button("+").on("click", () => {
                    if (si.gv) t.new(si.gv);
                }),
            ]);
            d.add([l, search]);
            dialogX(d, add);
        });
        l.add(add);
        return l;
    }
    const l = oEl(b);
    return l;
}

function addP(
    text: string,
    word: string,
    sentence: string,
    index: record["means"][0]["contexts"][0]["index"] | null,
    tags: bOp | null,
    f: (text: string, sentence?: string, index?: ReSlice, tags?: bOp) => void,
    fromEl: ElType<HTMLElement>,
) {
    const pEl = p().attr({ lang: studyLan });
    const sInput1 = txt().attr({ contentEditable: "true" });
    const sInput2 = txt().attr({ contentEditable: "true" });
    let sourceWord = "";
    if (index) {
        sourceWord = sentence.slice(...index);
        const sourceWordEl = txt(sourceWord + (sourceWord !== word ? `(${word})` : "")).class(MARKWORD);
        sInput1.sv(sentence.slice(0, index[0]));
        sInput2.sv(sentence.slice(index[1]));
        pEl.add([sInput1, sourceWordEl, sInput2]);
        setTimeout(() => {
            pEl.el.scrollLeft = sourceWordEl.el.offsetLeft - pEl.el.offsetWidth / 2;
        }, 100);
    } else pEl.add(word || sentence);
    const textEl = textarea().sv(text).attr({ autofocus: true });
    const aiB = getAiButtons(textEl, word, sentence);
    const okEl = iconEl("ok").on("click", () => {
        const mean = textEl.gv.trim();
        div.el.close();
        if (index) {
            const newSentence = sInput1.el.innerText + sourceWord + sInput2.el.innerText;
            console.log(newSentence);
            const i = diffPosi(sentence, newSentence);
            const nindex = patchPosi(i.source, i.map, index);
            f(mean, newSentence, nindex);
        } else f(mean);
    });
    const div = ele("dialog")
        .class(NOTEDIALOG)
        .add([
            pEl,
            textEl,
            view()
                .style({ display: "flex" })
                .add([...aiB, spacer(), okEl]),
        ]);
    textEl.on("keydown", (e) => {
        if (e.key === "Enter" && e.shiftKey) {
            e.preventDefault();
            okEl.el.click();
        }
    });
    console.log(tags);

    if (tags) {
        tagsEl(tags).then((e) => textEl.el.after(e.el));
    }
    dialogX(div, fromEl);
}

function getAiButtons(textEl: ReturnType<typeof textarea>, word: string, sentence: string) {
    if (word && sentence) {
        return aiButtons(textEl, word, sentence);
    }
    if (word) {
        return aiButtons1(textEl, word);
    }
    return aiButtons2(textEl, sentence);
}

function aiButtons(textEl: ReturnType<typeof textarea>, word: string, context: string) {
    function setText(text: string) {
        textEl.el.setRangeText(text);
    }
    return [
        button("所有").on("click", async () => {
            const text = [];
            const r = (await autoFun.runList([
                { fun: wordAi.mean(studyLan, "zh"), input: { word, context } },
                { fun: wordAi.meanEmoji(), input: { word, context } },
                { fun: wordAi.synOpp(), input: { word, context } },
            ])) as any[];
            if (!r[2]) {
                setText(JSON.stringify(r, null, 2));
                return;
            }
            text.push(wordAiText.mean(r[0]));
            text.push(wordAiText.meanEmoji(r[1]));
            text.push(wordAiText.synOpp(r[2]));

            setText(text.join("\n"));
        }),
        button("基本意思").on("click", async () => {
            setText(wordAiText.mean((await wordAi.mean(studyLan, "zh").run({ word, context }).result) as any));
        }),
        button("音标").on("click", async () => {
            setText(await getIPA(word));
        }),
        button("emoji").on("click", async () => {
            setText(wordAiText.meanEmoji((await wordAi.meanEmoji().run({ word }).result) as any));
        }),
        button("近反义词").on("click", async () => {
            setText(wordAiText.synOpp((await wordAi.synOpp().run({ word, context }).result) as any));
        }),
        tmpAiB(textEl, `$这里有个单词${word}，它位于${context}`),
        dicB(textEl, word),
        view("x").add(onlineDicL(word)).style({ alignItems: "center" }),
    ];
}
function aiButtons1(textEl: ReturnType<typeof textarea>, word: string) {
    function setText(text: string) {
        textEl.el.setRangeText(text);
    }
    return [
        button("词根词缀").on("click", async () => {
            setText(wordAiText.fix((await wordAi.fix().run({ word }).result) as any));
        }),
        button("音节分词").on("click", async () => {
            setText(await hyphenate(word, { hyphenChar }));
        }),
        button("词源").on("click", async () => {
            setText(wordAiText.etymology((await wordAi.fix().run({ word }).result) as any));
        }),
        tmpAiB(textEl, `$这里有个单词${word}`),
        dicB(textEl, word),
    ];
}

function aiButtons2(textEl: ReturnType<typeof textarea>, sentence: string) {
    function setText(text: string) {
        textEl.el.setRangeText(text);
    }
    return [
        button("分析").on("click", async () => {
            const t = sentenceGm(await sentenceAi.gm(sentence));
            setText(t);
        }),
        button("拆分").on("click", async () => {
            setText((await sentenceAi.split(sentence)).shortSentences.join("\n"));
        }),
        tmpAiB(textEl, `$这里有个句子${sentence}`),
    ];
}

function tmpAiB(mainTextEl: ReturnType<typeof textarea>, info: string) {
    const aiB = button("AI").on("click", () => {
        tmpAi(mainTextEl, info, aiB);
    });
    return aiB;
}

function tmpAi(mainTextEl: ReturnType<typeof textarea>, info: string, fromEl: ElType<HTMLElement>) {
    const { x, y } = fromEl.el.getBoundingClientRect();
    const textEl = textarea().sv(">");
    aiText(textEl, info);
    const div = ele("dialog")
        .class(AIDIALOG)
        .add([
            textEl,
            view("x")
                .style({ "justify-content": "flex-end" })
                .add(
                    iconEl("ok").on("click", () => {
                        const mean = textEl.gv.trim();
                        div.el.close();
                        if (mean !== ">") mainTextEl.el.setRangeText(`\n${mean}`);
                    }),
                ),
        ])
        .style({
            left: `min(100vw - 400px, ${x}px)`,
            top: `min(100dvh - 400px, ${y}px - 400px)`,
        });
    dialogX(div, fromEl);
}

function aiText(textEl: ReturnType<typeof textarea>, info: string) {
    textEl.on("keyup", async (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            const text = textEl.gv.trim();
            const aiM = textAi(text);
            if (aiM.at(-1)?.role !== "user") {
                textEl.el.setRangeText("\n>");
                return;
            }
            if (info) aiM.unshift({ role: "system", content: info });
            console.log(aiM);
            const start = textEl.el.selectionStart;
            const end = textEl.el.selectionEnd;
            const aitext = await ai(aiM, "对话").text;
            const addText = `ai:\n${aitext}`;
            const changeText = textEl.gv.slice(0, start) + addText + textEl.gv.slice(end);
            textEl.sv(changeText);
            textEl.el.selectionStart = start;
            textEl.el.selectionEnd = start + addText.length;
        }
    });
}

function dicB(mainTextEl: ReturnType<typeof textarea>, word: string) {
    const dicB = button("词典").on("click", () => {
        showDicEl(mainTextEl, word, dicB);
    });
    return dicB;
}

async function showArticelAI() {
    if (!nowBook.book || !nowBook.sections) return;
    const s = await getSection(nowBook.sections);
    if (!s) return;
    const note = s.note;
    const text = textarea().sv(note || "> ");
    text.el.setSelectionRange(text.gv.length, text.gv.length);
    aiText(text, `这是一篇文章：${s.title}\n\n${s.text}`);
    const handle = spacer().style({ cursor: "grab" });
    const div = ele("dialog")
        .class(AIDIALOG)
        .add([
            text,
            view()
                .style({ display: "flex", "justify-content": "flex-end" })
                .add([
                    handle,
                    iconEl("close").on("click", async () => {
                        const t = text.gv.trim();
                        if (t !== ">") {
                            const s = await getSection(nowBook.sections);
                            if (s) {
                                s.note = t;
                                sectionsStore.setItem(nowBook.sections, s);
                            }
                        }
                        div.remove();
                    }),
                ]),
        ])
        .style({ position: "fixed", left: "auto", right: "0", top: "32px" })
        .addInto();
    trackPoint(handle, {
        start: () => {
            const x = div.el.getBoundingClientRect().x;
            const y = div.el.getBoundingClientRect().y;
            return { x, y };
        },
        ing: (p) => {
            div.style({ left: `${p.x}px`, top: `${p.y}px`, right: "" });
            handle.style({ cursor: "grabbing" });
        },
        end: () => {
            handle.style({ cursor: "grab" });
        },
    });
}

function ai(m: AIm, text?: string) {
    const config = {
        model: "gpt-4o-mini",
        temperature: 0.5,
        top_p: 1,
        frequency_penalty: 1,
        presence_penalty: 1,
        messages: m,
    };
    const userConfig = getSetting("ai.config");
    if (userConfig) {
        try {
            const c = JSON.parse(userConfig);
            for (const [k, v] of Object.entries(c)) {
                // @ts-ignore
                if (k !== "messages") config[k] = v;
            }
        } catch (error) {}
    }
    const abort = new AbortController();
    const stopEl = iconEl("close").on("click", () => {
        abort.abort();
        pel.remove();
    });
    const pel = view().add([txt(`AI正在思考${text || ""}`), stopEl]);
    putToast(pel, 0);
    const url = getSetting("ai.url");
    const key = getSetting("ai.key");
    return {
        stop: abort,
        text: fetch(url || "https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${key}`,
                "content-type": "application/json",
            },
            body: JSON.stringify(config),
            signal: abort.signal,
        })
            .then((v) => {
                pel.remove();
                return v.json();
            })
            .then((t) => {
                const answer = t.message?.content || t.choices[0].message.content;
                console.log(answer);
                return answer as string;
            })
            .catch((e) => {
                if (e.name === "AbortError") {
                    pel.remove();
                    return "";
                }
                pel.clear();
                pel.add([
                    `AI处理${text || ""}时出现错误`,
                    iconEl("close").on("click", () => {
                        pel.remove();
                    }),
                ]);
            }),
    };
}

function checkVisitAll(words: Section["words"]) {
    const l = Object.values(words);
    const visitAll = l.every((i) => i.visit);
    if (
        visitAll &&
        l.length > 1 &&
        (nowBook.sections !== checkVisit.section || time() - checkVisit.time > timeD.m(5))
    ) {
        alert("🎉恭喜学习完！\n可以在侧栏添加忽略词\n再读一遍文章，检查是否读懂\n最后进行词句复习");
        checkVisit.section = nowBook.sections;
        checkVisit.time = time();
    }
}

function updateMark(words: Section["words"] | undefined) {
    if (!words) return;
    // todo diff
    for (const el of bookContentEl.queryAll(`.${TMPMARKWORD}`)) {
        el.el.classList.remove(TMPMARKWORD);
    }
    for (const el of bookContentEl.queryAll(`.${MARKWORD}`)) {
        el.el.classList.remove(MARKWORD);
    }
    for (const el of bookContentEl.queryAll(`.${VISITMARKWORD}`)) {
        el.el.classList.remove(VISITMARKWORD);
    }

    for (const i of Object.values(words)) {
        if (i.type !== "word") continue;
        for (let x = i.index[0]; x < i.index[1]; x++) {
            const el = bookContentEl.query(`[data-s="${x}"]`);
            if (!el) continue;
            if (i.visit) {
                el.class(VISITMARKWORD);
            } else {
                el.class(MARKWORD);
            }
        }
    }
    for (const el of bookContentEl.queryAll("span[data-t]")) {
        if (t推荐mark.has(el.el.innerText.toLocaleLowerCase())) {
            el.class(TMPMARKWORD);
        }
    }
}

async function selectWord(words: string[]) {
    t推荐mark.clear();
    for (const w of words) {
        t推荐mark.add(w.toLocaleLowerCase());
    }
    const sectionId = nowBook.sections;
    updateMark((await getSection(sectionId))?.words);
}

async function getNewWords() {
    const words = Array.from(
        new Set(
            bookContentEl
                .queryAll(`:scope>*>*>span:not(.${MARKWORD})`)
                .map((el) => el.el.textContent?.trim().toLocaleLowerCase()),
        ),
    ).filter((s) => s !== undefined) as string[];
    const markedWords = Object.values((await getSection(nowBook.sections))?.words || {})
        .filter((i) => i.type === "word")
        .map((i) => lemmatizer(i.id.toLocaleLowerCase()));
    const studyWords = await getGoodLearntWords();
    const hasLentWords = Array.from((await getIgnoreWords()).union(studyWords))
        .map((w) => w.toLocaleLowerCase())
        .concat(markedWords);
    const newWords = words;
    const wordsWithRoot: { src: string; show: string }[] = [];
    const willShowWords: string[] = [];
    const properN1 = properN.map((i) => i.toLocaleLowerCase());
    for (const w of newWords) {
        if (w.match(/[0-9]/)) continue;
        if (w.trim() === "") continue;
        if (w === "") continue;
        if (w.match(/[`~!@#$%^&*()_\-+=<>?:"{}|,./;'\\[\]·！#￥（——）：；“”‘’、，|《。》？、【】[\]]/)) continue;
        if (properN1.includes(w)) continue;
        const r = lemmatizer(w);
        if (!hasLentWords.includes(r) && !willShowWords.includes(r)) {
            wordsWithRoot.push({ src: w, show: r });
            willShowWords.push(r);
        }
    }
    return wordsWithRoot;
}

async function autoIgnore(fromEl: ElType<HTMLElement>) {
    const dialog = ele("dialog").class("words_select").attr({ lang: studyLan });
    const f = view();
    const wordsWithRoot = await getNewWords();
    for (const w of wordsWithRoot) {
        const item = label([
            input("checkbox").class("ignore_word").sv(w.show),
            w.show,
            input("checkbox")
                .sv(w.src)
                .attr({ checked: t推荐mark.has(w.src.toLocaleLowerCase()) }),
        ]);
        f.add(item);
    }
    dialog.add([
        f,
        view("x").add([
            button("标记所有生词")
                .on("click", async () => {
                    const words = (await getNewWords()).map((i) => i.src);
                    selectWord(words);
                    dialog.el.close();
                })
                .style({ width: "auto" }),
            spacer(),
            iconEl("ok").on("click", async () => {
                const words = f.queryAll("input:checked.ignore_word").map((el) => el.el.value);
                addIgnore(words);
                const wordsX = f
                    .queryAll("input:checked:not(.ignore_word)")
                    .map((el) => el.el.value)
                    .filter((i) => !words.includes(i));
                selectWord(wordsX);
                dialog.el.close();
            }),
        ]),
    ]);
    dialogX(dialog, fromEl);
}

function trackKeyboard(el: ElType<HTMLElement>) {
    el.style({ "touch-action": "none" });
    trackPoint(el, {
        start() {
            if (keyboard.getLayout() !== "default") return;
            const h = keyboardEl.el.offsetHeight;
            return { x: 0, y: 0, data: { h } };
        },
        ing: (p, _, { startData: data }) => {
            const h = Math.round(data.h - p.y);
            keyboardEl.style({ height: `${h}px` });
            return h;
        },
        end: (_, { ingData: data }) => {
            setting.setItem(KEYBOARDHEIGHTPATH, data);
        },
    });
}

function keyB<t extends string>(c: { [k in t]: string[] }, display: Record<string, string>) {
    let text = "";
    const el = keyboardEl;
    el.style({ padding: "4px", gap: "4px" });

    function render(c: string[]) {
        el.clear();
        for (const r of c) {
            const rEl = view("x").style({ gap: "4px", "flex-grow": "1" });
            for (const k of r.split(" ")) {
                const kEl = view()
                    .style({ "flex-grow": 1, display: "flex", "align-items": "center", "justify-content": "center" })
                    .add(txt(display[k] ?? k))
                    .data({ key: k })
                    .on("pointerdown", () => {
                        if (k.startsWith("{")) {
                            spellF(k);
                            if (k === "{bksp}") {
                                text = text.slice(0, -1);
                                spellCheckF(text);
                            }
                            if (k === "{space}") {
                                text += " ";
                                spellCheckF(text);
                            }
                        } else {
                            text += k;
                            spellCheckF(text);
                        }
                        console.log(text);
                    });
                if (k === "{h}") {
                    trackKeyboard(kEl);
                }
                if (k === "{switch}") {
                    kEl.on("click", async () => {
                        if (keyboard.getLayout() === "default") {
                            keyboard.setLayout("handwrite");
                            keyboardEl.style({ height: "48px" });
                        } else {
                            keyboard.setLayout("default");
                            keyboardEl.style({ height: `${await setting.getItem(KEYBOARDHEIGHTPATH)}px` });
                        }
                        setting.setItem(KEYBOARDDISPLAYPATH, keyboard.getLayout());
                    });
                }
                rEl.add(kEl);
            }
            el.add(rEl);
        }
    }
    let layout = Object.keys(c)[0];
    // @ts-ignore
    render(c[layout] as string[]);
    return {
        getInput: () => text,
        setInput: (t: string) => {
            text = t;
            spellCheckF(text);
        },
        clearInput: () => {
            text = "";
        },
        setLayout: (l: t) => {
            layout = c[l] ? l : Object.keys(c)[0];
            el.data({ layout });
            // @ts-ignore
            render(c[layout]);
        },
        getLayout: () => layout as t,
    };
}

function ocrSpell() {
    // check
    // clean
    handwriterCanvas.width = 0;
    handwriterCheck.style({ display: "none" });
    spellWriteCtx = null;
}

let spellCheckF: (text: string) => void = (text) => console.log(text);
let spellF: (text: string) => void = (text) => console.log(text);
function clearKeyboard() {
    keyboard.clearInput();
}

async function getWordAiContext() {
    aiContexts = {};
    const l: { id: string; word: string; mean: string }[] = [];
    const newDue = due.word
        .toSorted((a, b) => a.card.due.getTime() - b.card.due.getTime())
        .filter((i) => i.card.state === State.Review);
    const needDue = newDue.slice(0, maxReviewCount);
    const willNeedDue = newDue.slice(maxReviewCount, maxReviewCount * 3);

    async function add(due: typeof newDue) {
        for (const x of due) {
            if (await lijuCache.getItem(x.id)) {
                // @ts-ignore
                aiContexts[x.id] = { text: (await lijuCache.getItem(x.id))[0] };
                continue;
            }
            const wordid = await card2word.getItem(x.id);
            if (!wordid) continue;
            const wordRecord = await wordsStore.getItem(wordid);
            if (!wordRecord) continue;
            for (const i of wordRecord.means) {
                if (i.card_id === x.id) {
                    l.push({ id: x.id, word: wordRecord.word, mean: i.text });
                    break;
                }
            }
        }
    }
    await add(needDue);
    if (l.length === 0) return;
    await add(willNeedDue);
    if (l.length === 0) return;

    let rr: { id: string; word: string; sentence: string }[] = [];

    try {
        const f = new autoFun.def({
            input: { list: "{id:string;word:string;mean:string}[] 单词及释义列表" },
            script: [
                "为$word及其$mean提供一个原语言的例句",
                "例句的单词应该实用且简单",
                "并用**加粗该单词$word",
                "无需翻译或做任何解释",
                "把例句放到$sentences",
            ],
            output: { sentences: "{id:string;sentence:string}[]" },
        });

        const x = f.run({ list: l as any });

        const tipEl = view().add([
            txt("正在生成AI例句……"),
            iconEl("close").on("click", () => {
                tipEl.remove();
                x.stop.abort();
            }),
        ]);

        putToast(tipEl, 0);

        const r = await x.result;
        tipEl.remove();
        if (Array.isArray(r)) {
            rr = r;
        } else {
            // @ts-ignore
            rr = r.sentences;
        }
    } catch (error) {
        putToast(txt("ai错误"));
    }

    for (const i of rr) {
        aiContexts[i.id] = { text: i.sentence };
        lijuCache.setItem(i.id, [i.sentence]);
    }
}

async function showReview(x: { id: string; card: Card }, type: Review) {
    if (!x) {
        reviewViewEl.attr({ innerText: "暂无复习🎉" });
        return;
    }
    if (maxReviewCount > 0 && reviewCount === maxReviewCount) {
        reviewViewEl.attr({ innerText: `连续复习了${maxReviewCount}个项目，休息一下😌\n刷新即可继续复习` });
        return;
    }
    const isAi = reviewAi.el.checked;
    console.log(x);
    if (type === "word") {
        showWordReview(x, isAi);
    }
    if (type === "spell") {
        showSpellReview(x);
    }
    if (type === "sentence") {
        showSentenceReview(x);
    }
}
async function crContext(word: record, id: string, isAi?: boolean) {
    const context = view();
    if (!word) return context;
    const ai = isAi && aiContexts[id]?.text;
    if (ai) context.add(await aiContext(id));
    const i = word.means.find((x) => x.card_id === id);
    if (!i) return context;
    context.add((await dicSentences(i.contexts.toReversed())).class(ai ? "sen_under_ai" : ""));
    return context;
}
async function aiContext(id: string) {
    const context = view();
    const text = aiContexts[id].text;
    const l = text.split(/\*\*(.+)\*\*/);
    context.add(p().add([l[0], txt(l[1]).class(MARKWORD), l[2]]));
    return context;
}
async function showWordReview(x: { id: string; card: Card }, isAi: boolean) {
    const wordid = await card2word.getItem(x.id);
    if (!wordid) {
        console.log(`wordid not found for ${x.id}`);
        return;
    }
    const wordRecord = await wordsStore.getItem(wordid);
    if (!wordRecord) {
        console.log(`wordRecord not found for ${wordid}`);
        return;
    }
    play(wordRecord.word);
    const div = view().style({ alignItems: "center" });
    const context = await crContext(wordRecord, x.id, isAi);
    async function showAnswer() {
        const word = await card2word.getItem(x.id);
        if (word) {
            const d = await wordsStore.getItem(word);
            for (const i of d?.means ?? []) {
                if (i.card_id === x.id) {
                    const div = view().attr({ innerText: i.text });
                    dic.clear();
                    dic.add(onlineDicL(word));
                    dic.add(div);
                    break;
                }
            }
        }
        spellAnimate(wordEl.el);
        context.query(".sen_under_ai")?.el.classList.remove("sen_under_ai");
    }
    reviewHotkey.show.f = () => {
        showAnswer();
        buttons.finish();
    };
    const dic = view().on("click", reviewHotkey.show.f);
    const buttons = getReviewCardButtons(
        x.id,
        x.card,
        context.el.children[0].textContent || context.el.children[1].textContent || "", // ai例句优先
        async (_, first) => {
            if (first) {
                showAnswer();
            } else {
                lijuCache.removeItem(x.id);
                const next = await nextDue(reviewType);
                showReview(next, reviewType);
            }
        },
    );

    const wordEl = view()
        .add(wordid.split("").map((i) => txt(i)))
        .class("main_word")
        .on("click", () => {
            play(wordRecord.word);
        });

    div.add([
        wordEl,
        context.style({ width: "var(--content-width)", maxHeight: "50%" }),
        dic.style({ width: "var(--content-width)" }),
        buttons.buttons.style({ width: "100%" }),
    ]).class("review_word");
    reviewViewEl.clear();
    reviewViewEl.add(div);
}

function getReviewCardButtons(id: string, card: Card, readText: string, f?: (rating: number, first: boolean) => void) {
    const showTime = new Date().getTime();
    let hasClick = false;
    let finishTime = showTime;
    let quickly = false;
    const b = (rating: Rating, icon: ElType<HTMLElement>) => {
        reviewHotkey[rating].f = async () => {
            if (hasClick) {
                let r = rating;
                if (rating === Rating.Good && quickly) r = Rating.Easy;
                await setReviewCard(id, card, r, finishTime - showTime);
                if (f) f(r, false);
                return;
            }
            await firstClick(icon);
            if (f) f(rating, true);
        };
        const b = icon.on("click", reviewHotkey[rating].f);
        return b;
    };
    async function firstClick(el?: ElType<HTMLElement>) {
        el?.class(BUTTONHIGHTLIGHT);
        hasClick = true;
        finishTime = time();
        quickly = finishTime - showTime < (await getReadTime(readText)) + 800;
        if (quickly) (goodB.el.querySelector("img") as HTMLImageElement).src = very_ok_svg;
    }
    const againB = b(Rating.Again, iconEl("close"));
    const hardB = b(Rating.Hard, iconEl("help"));
    const goodB = b(Rating.Good, iconEl("ok"));
    const buttons = view().add([againB, hardB, goodB]).class("review_b");
    return {
        buttons,
        finish: () => firstClick(),
    };
}

async function showSpellReview(x: { id: string; card: Card }) {
    const word = x.id;
    const wordSpells = mutiSpell(word);
    const maxWidth = Math.max(...wordSpells.map((w) => w.length));
    const input = view()
        .class("spell_input")
        .style({ width: "min-content", whiteSpace: "nowrap" })
        .attr({ innerText: word, tabIndex: 1 }); // 占位计算宽度
    input.el.focus();
    clearKeyboard();
    const SHOWSENWORD = "spell_sen_word_show";
    const BLURWORD = "blur_word";
    const wordEl = view();
    let isPerfect = false;
    let spellResult: "none" | "right" | "wrong" = "none";
    const showTime = time();
    play(word);
    function matchCapital(input: string, word: string) {
        const l: string[] = [];
        for (let i = 0; i < input.length; i++) {
            if (word[i]?.match(/[A-Z]/)) l.push(input[i].toLocaleUpperCase());
            else l.push(input[i]);
        }
        return l.join("");
    }
    function matchSpecial(input: string, word: string) {
        const l: string[] = [];
        for (let i = 0; i < input.length; i++) {
            if (word[i]?.match(/[-'’. ]/)) l.push(word[i]);
            else l.push(input[i]);
        }
        return l.join("");
    }
    function inputContent(inputWord: string) {
        input.clear();
        if (x.card.state === State.New) {
            input.add([inputWord, txt(word.slice(inputWord.length)).style({ opacity: "0.5" })]);
        } else if (x.card.state === State.Learning) {
            input.add([inputWord, txt(word.slice(inputWord.length)).class(BLURWORD)]);
        } else {
            input.attr({ innerText: inputWord || "|" });
        }
    }
    spellCheckF = async (rawInputWord: string) => {
        const inputWord = matchSpecial(matchCapital(rawInputWord, word), word);
        inputContent(inputWord);
        wordEl.clear();
        div.el.classList.remove(SHOWSENWORD);
        if (wordSpells.includes(inputWord)) {
            // 正确
            clearKeyboard();
            const rightL = (await hyphenate(word, { hyphenChar })).split(hyphenChar);
            const ele = view().add(rightL.map((i) => txt(i)));
            input.clear().add(ele);
            await spellAnimate(ele.el);

            if (spellResult === "none")
                setSpellCard(x.id, x.card, isPerfect ? Rating.Easy : Rating.Good, time() - showTime);
            spellResult = "right";
            const next = await nextDue(reviewType);
            showReview(next, reviewType);
        }
        //错误归位
        if (inputWord.length === maxWidth && !wordSpells.includes(inputWord)) {
            clearKeyboard();
            const diffEl = spellDiffWord(word, inputWord);
            input.clear().add([
                diffEl.el,
                button().on("click", () => {
                    diffEl.el.innerHTML = spellDiffWord(word, inputWord).el.innerHTML;
                    spellErrorAnimate(diffEl);
                }),
            ]);
            spellErrorAnimate(diffEl);
            wordEl.add(await hyphenate(word, { hyphenChar }));
            play(word);
            div.el.classList.add(SHOWSENWORD);
            if (spellResult === "none") {
                const oldCard = x.card;
                const actionId = setSpellCard(x.id, x.card, 1, time() - showTime);
                const diff = dmp.diff_main(inputWord, word);
                const f = diff.filter((i) => i[0] !== 0);
                if (f.length === 2) {
                    if (f[0][0] === -1 && f[0][1].length === 1 && f[1][0] === 1 && f[1][1].length === 1)
                        wordEl.add(
                            button("手误 撤回").on("click", () => {
                                spellStore.setItem(x.id, oldCard);
                                cardActionsStore.removeItem(actionId);
                                spellResult = "none";
                                wordEl.clear();
                                inputContent("");
                            }),
                        );
                }
            }
            spellResult = "wrong";
        }
    };
    spellF = async (button) => {
        console.log(button);
        if (button === "{tip}") {
            // 暂时展示
            input.clear().add(txt(word).class(BLURWORD));
            clearKeyboard();
            isPerfect = false;
            play(word);
            div.el.classList.add(SHOWSENWORD);
        }
        if (button === "{audio}") {
            // 发音
            play(word);
        }
    };
    const context = view().add(view().add(await getIPA(word)));
    const r = await wordsStore.getItem(word);
    if (r) {
        context
            .add([
                iconEl("pen").on("click", (_, el) => {
                    addP(
                        r.note || "",
                        word,
                        "",
                        null,
                        null,
                        async (text) => {
                            const mean = text.trim();
                            if (r) {
                                r.note = mean;
                                wordsStore.setItem(word, r);
                            }
                        },
                        el,
                    );
                }),
                onlineDicL(word),
            ])
            .add(
                await Promise.all(
                    r.means.map(async (i) =>
                        view().add(await disCard2(i, wordSpells.concat(wordSpells.map((i) => lemmatizer(i))))),
                    ),
                ),
            );
    } else {
        const text = await getWordFromDic(word, Object.keys(dics)[0]);
        context.add(view().add(view().add(p(text))));
    }
    const div = view()
        .add([input, wordEl, context.style({ width: "var(--content-width)", margin: "auto", maxHeight: "50%" })])
        .class("review_spell")
        .data({ state: String(x.card.state) });
    reviewViewEl.clear().add(div);

    input.style({ width: `${input.el.offsetWidth}px` });
    inputContent("");
}

function spellDiffWord(rightWord: string, wrongWord: string) {
    const div = view().class("diff");
    const diff = dmp.diff_main(wrongWord, rightWord);
    for (let n = 0; n < diff.length; n++) {
        const i = diff[n];
        if (i[0] === -1 && diff[n + 1]?.[0] === 0 && diff[n + 2]?.[0] === 1) {
            if (i[1] === diff[n + 2][1]) {
                div.add(
                    ele("span")
                        .class("diff_exchange")
                        .add([txt(i[1]), txt(diff[n + 1][1])]),
                );
                n += 2;
                continue;
            }
        }
        if (i[0] === 0) {
            div.add(i[1]);
        } else if (i[0] === 1) {
            div.add(txt(i[1]).class("diff_add"));
        } else {
            div.add(txt(i[1]).class("diff_remove"));
        }
    }
    return div;
}

async function spellAnimate(el: HTMLElement) {
    function sleep(ms: number) {
        return new Promise((re) => {
            setTimeout(() => {
                re(null);
            }, ms);
        });
    }
    for (const nel of Array.from(el.children) as HTMLElement[]) {
        nel.style.opacity = "0.6";
        nel.style.filter = "blur(2px)";
        nel.style.transition = "0.2s";
    }

    const t = 160;

    await sleep(t);
    for (let i = 0; i < el.children.length; i++) {
        const e = el.children.item(i) as HTMLElement;
        e.style.opacity = "1";
        e.style.filter = "none";
        await sleep((e.textContent?.length ?? 0) * t);
    }
}

function spellErrorAnimate(pel: ElType<HTMLElement>) {
    const childNodes = pel.el.childNodes;
    for (let i = 0; i < childNodes.length; i++) {
        if (childNodes[i].nodeName !== "SPAN") continue;
        const el = childNodes[i] as HTMLSpanElement;
        const w = `${el.getBoundingClientRect().width}px`;
        if (el.classList.contains("diff_add")) el.style.width = "0";
        if (el.classList.contains("diff_remove")) el.style.width = w;
        setTimeout(
            () => {
                el.style.transition = "0.2s";
                if (el.classList.contains("diff_add")) {
                    el.style.width = w;
                }
                if (el.classList.contains("diff_remove")) {
                    el.style.width = "0";
                }
                if (el.classList.contains("diff_exchange")) {
                    el.classList.replace("diff_exchange", "diff_exchange1");
                }
            },
            (i + 1) * 500,
        );
    }
}

async function showSentenceReview(x: { id: string; card: Card }) {
    const sentence = await card2sentence.getItem(x.id);
    if (!sentence) return;
    const div = view();
    const context = p(sentence.text).add(
        await getTitleEl(sentence.source.book, sentence.source.sections, sentence.source.id),
    );
    let hasShowAnswer = false;
    async function showAnswer() {
        hasShowAnswer = true;
        dic.clear();
        if (!sentence) return;
        dic.add(p(sentence.trans).class(TRANSLATE));
        if (sentence.note) {
            dic.add(p(sentence.note));
        }
    }
    reviewHotkey.show.f = () => {
        showAnswer();
        buttons.finish();
    };
    const dic = view().on("click", reviewHotkey.show.f);
    const buttons = getReviewCardButtons(x.id, x.card, context.el.innerText, async (_, first) => {
        if (!first) {
            const next = await nextDue(reviewType);
            showReview(next, reviewType);
        }
    });

    div.add([context, dic, buttons.buttons]);
    div.class("review_sentence");
    reviewViewEl.clear();
    reviewViewEl.add(div);
}

function play(word: string) {
    audioEl.el.src = `https://dict.youdao.com/dictvoice?le=eng&type=1&audio=${word}`;
    audioEl.el.play();
}

async function runTTS(text: string): Promise<{ cancel: () => void }> {
    if ((await getTtsConfig()).engine === "browser") {
        const x = await localTTS(text);
        return { cancel: () => x.synth.cancel() };
    }
    audioEl.el.src = (await getOnlineTTS(text)).url;
    audioEl.el.play();
    return {
        cancel: () => {
            audioEl.el.src = "";
        },
    };
}

async function localTTS(text: string) {
    const utterThis = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const sv = (await getTtsConfig()).voice;
    for (let i = 0; i < voices.length; i++) {
        if (voices[i].name === sv) {
            utterThis.voice = voices[i];
            break;
        }
    }
    synth.speak(utterThis);
    return { utterThis, synth };
}

async function pTTS(index: number) {
    const text = contentP.at(index);
    const nextplay = () => {
        if (autoPlay) {
            if (index + 1 < contentP.length) {
                pTTS(index + 1);
                return;
            }
        }
        pttsEl.el.classList.remove(SHOWPTTS);
    };
    if (!text) {
        nextplay();
        return;
    }
    pttsEl.el.classList.add(SHOWPTTS);

    if ((await getTtsConfig()).engine === "browser") {
        const utterThis = (await localTTS(text)).utterThis;
        utterThis.onend = nextplay;
    } else {
        const url = await getOnlineTTS(text);
        pTTSEl.el.src = url.url;
        pTTSEl.el.play();
        pTTSEl.el.onended = nextplay;
    }
}

async function renderCardDueAll() {
    const wordsScope = await getWordsScope();
    const wordDue = new Set<string>();
    const spellDue: number[] = [];
    const sentenceDue: string[] = [];
    const now = time();

    const wordP: CardPercent = { "0": 0, "1": 0, "2": 0, "3": 0 };
    const sentenceP: CardPercent = { "0": 0, "1": 0, "2": 0, "3": 0 };
    const spellP: CardPercent = { "0": 0, "1": 0, "2": 0, "3": 0 };

    await wordsStore.iterate((v, k: string) => {
        if (!filterWithScope(k, wordsScope.words)) return;
        if (
            wordsScope.books.length !== 0 &&
            !v.means.find((i) => i.contexts.find((x) => wordsScope.books.includes(x.source.book)))
        )
            return;
        for (const m of v.means) {
            wordDue.add(m.card_id);
        }
    });
    await spellStore.iterate((v, k: string) => {
        if (!filterWithScope(k, wordsScope.words)) return;
        if (v.due.getTime() >= now) return;
        spellDue.push(v.due.getTime());
        spellP[v.state]++;
    });
    await card2sentence.iterate((v, k: string) => {
        sentenceDue.push(k);
    });
    const wordDue1: number[] = [];
    const sentenceDue1: number[] = [];
    await cardsStore.iterate((v, k) => {
        const t = v.due.getTime();
        if (wordDue.has(k) && t < now) {
            wordDue1.push(t);
            wordP[v.state]++;
            return;
        }
        if (sentenceDue.includes(k) && t < now) {
            sentenceDue1.push(t);
            sentenceP[v.state]++;
        }
    });

    cardDue.clear();
    cardDue.add(renderCardDue("单词", wordDue1));
    cardDue.add(renderCardPercent(wordP));
    cardDue.add(renderCardDue("拼写", spellDue));
    cardDue.add(renderCardPercent(spellP));
    cardDue.add(renderCardDue("句子", sentenceDue1));
    cardDue.add(renderCardPercent(sentenceP));
}

async function renderCharts() {
    renderCardDueAll();
    cal1.els.title.svc = cal2.els.title.svc = "加载中……";

    const newCard: Date[] = [];
    const reviewCard: Date[] = [];
    await cardActionsStore.iterate((v, k) => {
        const date = new Date(Number(k));
        if (!v[1]) {
            newCard.push(date);
        } else {
            reviewCard.push(date);
        }
    });

    renderCal(newCard, cal1);
    renderCal(reviewCard, cal2);
}

function renderCardDue(text: string, data: number[]) {
    const c = data.length;
    const f = view().add([text, String(c)]);
    return f;
}

function renderCardPercent(p: CardPercent) {
    const sum = Object.values(p).reduce((a, b) => a + b, 0);
    const el = view("x").class("cardPercent");
    for (const [n, i] of Object.entries(p)) {
        el.add(
            view()
                .style({ width: `${(i / sum) * 100}%` })
                // @ts-ignore
                .attr({ title: `${cardState(n as State)} ${i}` }),
        );
    }
    return el;
}

function newCal(count: number) {
    const f = view()
        .class("cal_plot")
        .style({
            gridTemplateColumns: `repeat(${53 * count}, 16px)`,
        });
    const title = view().bindSet((v: string, el) => {
        el.innerText = v;
    });
    let lastClick: HTMLElement | null = null;
    const list: Array<ElType<HTMLDivElement>> = [];
    for (let x = 1; x <= 53 * count; x++) {
        for (let y = 1; y <= 7; y++) {
            const item = view();
            list.push(item);
        }
    }
    f.add(list, 14, 14);
    f.on("click", (e) => {
        if (e.target === f.el) return;
        const EL = e.target as HTMLElement;
        if (e.shiftKey) {
            let count = 0;
            let start = false;
            for (const el of list) {
                if (el.el === lastClick) start = true;
                if (start) count += Number(el.el.getAttribute("data-v")) ?? 0;
                if (el.el === EL) {
                    title.sv(`${lastClick?.getAttribute("data-date")}~${EL.getAttribute("data-date")} ${count}`);
                    break;
                }
            }
        } else {
            title.sv(EL.title);
        }
        lastClick = EL;
    });
    const div = frame("cal", {
        _: view(),
        title,
        plot: f,
    });
    return div;
}
function renderCal(data: Date[], el: typeof cal1) {
    const count = new Map<string, number>();
    for (const d of data) {
        const id = d.toDateString();
        count.set(id, (count.get(id) ?? 0) + 1);
    }
    const rl = Array.from(count.values()).toSorted((a, b) => a - b);
    const l: number[] = [];
    const c = 6;
    const width = Math.floor(rl.length / (c - 1)) || 1;
    for (let i = 0; i < rl.length; i += width) l.push(rl[i]);
    l.push((rl.at(-1) ?? 0) + 1);
    const firstDate = new Date(startYear, 0, 1);
    const zero2first = (firstDate.getDay() + 1) * timeD.d(1);
    const s_date = new Date(firstDate.getTime() - zero2first + timeD.d(1));

    const isToday = el.els.plot.el.getAttribute("data-d") === new Date().toDateString();
    el.els.plot.data({ d: new Date().toDateString() });

    const els = Array.from(el.els.plot.el.children) as HTMLElement[];

    function renderDay(offsetDay: number) {
        const date = new Date(s_date.getTime() + timeD.d(offsetDay));
        const v = count.get(date.toDateString()) ?? 0;
        const item = pack(els[offsetDay])
            .attr({
                title: `${date.toLocaleDateString()}  ${v}`,
            })
            .data({ v: String(v), date: date.toLocaleDateString() });
        if (v) {
            const nvi = l.findIndex((i) => i > v) - 1;
            const nv = (100 / c) * nvi + (100 / c) * ((v - l[nvi]) / (l[nvi + 1] - l[nvi])); // 赋分算法，但平均分割区间
            item.style({ "background-color": `color-mix(in oklch,rgb(172, 245, 185),rgb(5, 75, 27) ${nv}%)` });
        } else {
            item.style({ "background-color": "" });
        }

        if (date.toDateString() === new Date().toDateString()) {
            item.style({ "border-width": "2px" });
            el.els.title.sv(item.el.title);
            item.el.scrollIntoView();
        } else {
            item.style({ "border-width": "" });
        }
    }

    if (isToday) {
        renderDay(Math.floor((new Date().getTime() - s_date.getTime()) / timeD.d(1)));
    } else
        for (let x = 1; x <= 53 * (nowYear - startYear + 1); x++) {
            for (let y = 1; y <= 7; y++) {
                const offsetDay = 7 * (x - 1) + y - 1;
                renderDay(offsetDay);
            }
        }
}

//###### setting

function onlineDicItem(name: string, url: string, lan: string) {
    const li = ele("li").add([
        txt("::").class("sort_handle"),
        input().sv(name),
        input().sv(url),
        input().sv(lan),
        iconEl("close").on("click", () => {
            li.remove();
            saveSortOnlineDics();
        }),
    ]);
    return li;
}

async function showOnlineDics() {
    const l = ((await setting.getItem(onlineDicsPath)) || []) as OnlineDicsType;
    for (const i of l) {
        onlineDicsEl.add(onlineDicItem(i.name, i.url, i.lan));
    }
    onlineDicsEl.on("input", () => {
        saveSortOnlineDics();
    });
    new Sortable(onlineDicsEl.el, {
        handle: ".sort_handle",
        onEnd: saveSortOnlineDics,
    });
}

async function saveSortOnlineDics() {
    const l = Array.from(onlineDicsEl.queryAll("li"));
    const dl: OnlineDicsType = [];
    for (const i of l) {
        const l = i.queryAll("input");
        const name = l[0].el.value;
        const url = l[1].el.value;
        const lan = l[2].el.value;
        dl.push({ name, url, lan });
    }
    await setting.setItem(onlineDicsPath, dl);
}

async function setAllData(json: AllData | (AllData & CacheData), textId?: string) {
    if (isSetData) return;
    isSetData = true;
    const tip = txt("正在更新……");
    putToast(tip, 0);

    if ((Object.keys(json.actions).at(-1) ?? 0) < ((await cardActionsStore.keys()).at(-1) ?? 0)) {
        const r = await confirm("⚠️本地数据似乎更加新，是否继续更新？\n若更新，可能造成数据丢失");
        if (!r) {
            tip.remove();
            isSetData = false;
            return;
        }
    }

    for (const key of ["cards", "spell"] as const) {
        for (const i in json[key]) {
            // @ts-ignore
            const r = json[key][i] as Card;
            r.due = new Date(r.due);
            if (r.last_review) r.last_review = new Date(r.last_review);
        }
    }
    const wrongL: { [name: string]: { n: number; o: number } } = {};
    for (const [storeName, store] of Object.entries(allData2Store)) {
        const oldLength = await store.length();
        // @ts-ignore
        const newLength = Object.keys(json[storeName] ?? {}).length;
        if (oldLength > 10 && newLength < 0.5 * oldLength) {
            wrongL[storeName] = { n: newLength, o: oldLength };
        }
    }
    if (Object.keys(wrongL).length) {
        const l: string[] = [];
        for (const i in wrongL) {
            l.push(`${i}：${wrongL[i].o}->${wrongL[i].n}`);
        }
        const r = await confirm(
            `⚠️以下数据内容发生重大变更，是否继续更新？\n若更新，可能造成数据丢失\n\n${l.join("\n")}`,
        );
        if (!r) {
            tip.remove();
            isSetData = false;
            return;
        }
    }
    const stores = { ...allData2Store, ...allDataCache };
    for (const [storeName, store] of Object.entries(stores)) {
        // @ts-ignore
        if (!json[storeName]) continue;
        await store.clear();
        // @ts-ignore
        await store.setItems(json[storeName]);
    }
    await updataTextId(textId || "");
    requestIdleCallback(() => {
        location.reload();
    });
}

function download(text: string, name: string, type?: string) {
    const blob = new Blob([text], { type: type || "text/plain;charset=utf-8" });
    a(URL.createObjectURL(blob)).attr({ download: name }).el.click();
}

// run
// const data

const setting = localForage.createInstance({
    name: "setting",
    driver: localforage.LOCALSTORAGE,
});

const exTransLog = localForage.createInstance<{ count: number; section: string }>({
    name: "log",
    storeName: "exTrans",
});

const bookshelfStore = localForage.createInstance<Book>({ name: "bookshelf" });
const sectionsStore = localForage.createInstance<Section>({ name: "sections" });

const coverCache = localForage.createInstance<Blob>({ name: "cache", storeName: "cover" });

const ipaStore = localForage.createInstance<Map<string, string | string[]>>({ name: "langPack", storeName: "ipa" });
const variantStore = localForage.createInstance<Map<string, string>>({ name: "langPack", storeName: "variant" });
const wordMapStore = localForage.createInstance<string[][]>({ name: "langPack", storeName: "map" });
const etymologyStore = localForage.createInstance<{ words: Map<string, string>; roots: Map<string, string[]> }>({
    name: "langPack",
    storeName: "etymology",
});

const dicStore = localForage.createInstance<dicMap>({ name: "dic" });

const cardsStore = localForage.createInstance<Card>({ name: "word", storeName: "cards" });
const wordsStore = localForage.createInstance<record>({ name: "word", storeName: "words" });
const tagsStore = localForage.createInstance({ name: "word", storeName: "tags" });
const card2word = localForage.createInstance<string>({ name: "word", storeName: "card2word" });
const spellStore = localForage.createInstance<Card>({ name: "word", storeName: "spell" });
const card2sentence = localForage.createInstance<record2>({ name: "word", storeName: "card2sentence" });

const cardActionsStore = localForage.createInstance<[string] | [string, Rating, State, number]>({
    name: "word",
    storeName: "actions",
});

const transCache = localForage.createInstance<string>({ name: "aiCache", storeName: "trans" });
const ttsCache = localForage.createInstance<{ blob: Blob; data: D }>({ name: "aiCache", storeName: "tts" });
const lijuCache = localForage.createInstance<string[]>({ name: "aiCache", storeName: "liju" });

const allData2Store: { [key in keyof AllData]: LocalForage } = {
    bookshelf: bookshelfStore,
    sections: sectionsStore,
    cards: cardsStore,
    words: wordsStore,
    spell: spellStore,
    card2word: card2word,
    card2sentence: card2sentence,
    actions: cardActionsStore,
    logExTrans: exTransLog,
} as { [key in keyof AllData]: LocalForage };

const allDataCache: { [key in keyof CacheData]: LocalForage } = {
    transCache: transCache,
    lijuCache: lijuCache,
} as { [key in keyof CacheData]: LocalForage };

const studyLan = ((await setting.getItem("lan.learn")) as string) || "en";

const variant = await variantStore.getItem("en");

let usSpell = (await wordMapStore.getItem("en")) || [];

const etymology = (await etymologyStore.getItem("en")) || {
    words: new Map<string, string>(),
    roots: new Map<string, string[]>(),
};

const fsrsWordW = JSON.parse((await setting.getItem("fsrs.word.w")) || "[]") as number[];
const fsrsSpellW = JSON.parse((await setting.getItem("fsrs.spell.w")) || "[]") as number[];
const fsrsSenW = JSON.parse((await setting.getItem("fsrs.sen.w")) || "[]") as number[];
console.log(fsrsWordW, fsrsSpellW, fsrsSenW);

const fsrs = new FSRS(generatorParameters({ w: fsrsWordW }));
const fsrsSpell = new FSRS(generatorParameters({ w: fsrsSpellW }));
const fsrsSen = new FSRS(generatorParameters({ w: fsrsSenW }));

const maxReviewCount = Number((await setting.getItem("review.maxCount")) || "30");

// ui

if (import.meta.env.DEV) initDev();

const bookStyle = ((await setting.getItem("style.default")) as typeof defaultBookStyle) || defaultBookStyle;

document.body.translate = false;

const menuEl = view().attr({ id: "menu", popover: "auto" }).addInto();

const booksEl = ele("dialog").addInto().attr({ id: "books" });
const localBookEl = view();
const onlineBookEl = view().style({ display: "none" });

booksEl.add([
    view("x").add([
        view()
            .add("本地书籍")
            .on("click", () => {
                showLocalBooks();
                booksEl.el.classList.remove("show_online_book");
            }),
        view()
            .add("在线书籍")
            .on("click", () => {
                getOnlineBooks();
                booksEl.el.classList.add("show_online_book");
            }),
        view()
            .add("我的词典")
            .on("click", () => {
                showBook(coreWordBook);
                booksElclose();
            }),
        iconEl("close")
            .style({ "margin-left": "auto" })
            .on("click", () => {
                booksElclose();
            }),
    ]),
    localBookEl,
    onlineBookEl,
]);
const bookSectionsEl = view().style({
    overflow: "scroll",
    position: "relative",
    "flex-grow": "1",
});
const mainEl = view().style({ backgroundColor: "var(--bg)" }).addInto();
const addBookEl = iconEl("add");
const addSectionEL = iconEl("add");
const bookNameEl = view();
const bookNavEl = view().attr({ id: "book_nav" }).add([bookNameEl, addSectionEL, bookSectionsEl]).addInto(mainEl);
const xbookEl = view().attr({ id: "book" }).addInto(mainEl);
const bookButtons = view().attr({ id: "book_buttons" }).addInto(xbookEl);
const bookBEl = iconEl("books").attr({ id: "books_b" }).style({ "view-transition-name": "dialog" });
const bookSectionsB = iconEl("side_panel").attr({ id: "book_sections" });
const reviewBEl = iconEl("review").attr({ id: "reviewb" });
const settingBEl = iconEl("setting").attr({ id: "settingb" });
const articleAi = iconEl("ai").on("click", () => {
    showArticelAI();
});
const changeStyleEl = iconEl("style");
const changeEditEl = button();
const bookdicEl = iconEl("search").attr({ accessKey: "/" });

bookButtons.add([
    bookBEl,
    bookSectionsB,
    reviewBEl,
    settingBEl,
    spacer().attr({ id: "book_name" }),
    articleAi,
    changeStyleEl,
    changeEditEl,
    bookdicEl,
]);

let bookContentEl = view().attr({ id: "book_content" }) as ElType<HTMLElement>;
const bookContentContainerEl = view()
    .attr({ id: "book_content_container" })
    .style({ "--paper-bg": `url("${await nosieBg()}") repeat` })
    .addInto(bookContentEl)
    .addInto(xbookEl);

const contextChangeObserver = new ResizeObserver(() => {
    dicFun?.changeContext();
    dicFun?.trackDic();
});

const changeStyleBar = view().attr({ popover: "auto" }).class("change_style_bar").addInto();

const dicEl = view().attr({ id: "dic" }).addInto(mainEl);

const lastMarkEl = iconEl("left");
const nextMarkEl = iconEl("right");
const toSentenceEl = iconEl("sentence");
const feedbackEl = iconEl("help");
const hideDicEl = iconEl("close");
const dicWordEl = input();
const lessWordEl = txt("-");
const moreWordEl = txt("+");
const moreWordsEl = view().class("more_words");
const ttsWordEl = button().style({ width: "auto", height: "auto", "font-size": "inherit" });
const ttsContextEl = iconEl("recume");
const dicTransB = iconEl("translate");
const dicTransContent = input().class(TRANSLATE).style({ border: "none", width: "100%", "font-size": "1rem" });
const dicMinEl = iconEl("more").style({ "min-height": "24px" });
const addMeanEl = iconEl("add").style({ "min-height": "24px" });
const editMeanEl = iconEl("pen").style({ "min-height": "24px" });
const reviewMeanEl = view();
const noteEl = iconEl("pen").style({ "min-height": "24px" });
const dicDetailsEl = view().class("dic_details");

dicEl.add([
    view("x").add([lastMarkEl, nextMarkEl, toSentenceEl, ttsContextEl, noteEl, spacer(), feedbackEl, hideDicEl]),
    view("x")
        .style({ "flex-wrap": "wrap", "align-items": "center" })
        .add([dicWordEl, view().add([lessWordEl, moreWordEl]), ttsWordEl, moreWordsEl]),
    view("x").add([dicTransB, dicTransContent]),
    view("x").add([dicMinEl, addMeanEl, editMeanEl, spacer(), reviewMeanEl]),
    dicDetailsEl,
]);

const markListBarEl = view().attr({ id: "mark_word_list" }).addInto(mainEl);

const reviewButtonsEl = view().attr({ id: "review_buttons" });
const reviewViewEl = view().attr({ id: "review_view", lang: studyLan });

const reviewEl = view()
    .attr({ id: "review" })
    .addInto(mainEl)
    .add(view().attr({ id: "review_list" }).add([reviewButtonsEl, reviewViewEl]));

const reviewReflashEl = iconEl("reload").addInto(reviewButtonsEl);
const reviewModeEl = view().attr({ id: "review_mode" }).addInto(reviewButtonsEl);

const tmpDicEl = view().attr({ popover: "auto" }).class("tmp_dic").addInto();

let tmpDicLastF = () => {};
let tmpDicStopF = () => {};
let tmpDicNextF = () => {};

document.addEventListener("keydown", (e) => {
    if (tmpDicEl.el.offsetHeight) {
        if (e.key === "ArrowLeft") {
            e.preventDefault();
            tmpDicLastF();
        } else if (e.key === " ") {
            e.preventDefault();
            tmpDicStopF();
        } else if (e.key === "ArrowRight") {
            e.preventDefault();
            tmpDicNextF();
        }
    }
});

const fontListEl = view().attr({ popover: "auto" }).class("font_list").addInto();

const fontEl = view().add("serif");
fontEl.on("click", async () => {
    fontListEl.el.showPopover();
    let availableFonts: { postscriptName: string; family: string; fullName: string }[] = [];
    try {
        // @ts-ignore
        availableFonts = await window.queryLocalFonts();
    } catch (error) {}
    let fonts = availableFonts.map((i) => i.family);
    fonts = Array.from(new Set(fonts));
    fonts = fonts.filter((i) => i !== "sans" && i !== "serif").toSorted();
    fonts.unshift("serif", "sans");
    vlist(fontListEl, fonts, { iHeight: 24, paddingLeft: 4, paddingRight: 4 }, (i) => {
        const fontName = fonts[i];
        return view()
            .add(fontName)
            .style({ "font-family": fontName, "line-height": "24px" })
            .on("click", () => {
                setFontElF(fontName);
                bookStyle.fontFamily = fontName;
                setBookStyle();
            });
    });
});
const fontWeight = input("range")
    .attr({ min: "100", max: "900", step: "10" })
    .on("input", (e, el) => {
        bookStyle.fontWeight = Number(el.gv);
        console.log(bookStyle);

        setBookStyle();
    })
    .sv(String(bookStyle.fontWeight));
const fontSize = createRangeSetEl(
    bookStyle.fontSize,
    bookStyleList.fontSize.length - 1,
    (i) => {
        bookStyle.fontSize = i;
        setBookStyle();
    },
    "font_small",
    "font_large",
);
const lineHeight = createRangeSetEl(
    bookStyle.lineHeight,
    bookStyleList.lineHeight.length - 1,
    (i) => {
        bookStyle.lineHeight = i;
        setBookStyle();
    },
    "line_height_small",
    "line_height_large",
);
const contentWidth = createRangeSetEl(
    bookStyle.contentWidth,
    bookStyleList.contentWidth.length - 1,
    (i) => {
        bookStyle.contentWidth = i;
        setBookStyle();
    },
    "content_width_small",
    "content_width_large",
);
const themei = radioGroup("theme");
const themeSelect = view()
    .class("theme_select")
    .add([
        themeI("auto", "自动", "#fff", "#000"),
        themeI("light", "亮色", "#fff", "#000"),
        themeI("classical", "古典", "#eceae6", "#000"),
        themeI("dark", "暗色", "#000", "#cacaca"),
    ]);

themei.on(() => {
    bookStyle.theme = themei.get();
    setBookStyle();
});
const paperI = check("paper")
    .on("change", () => {
        bookStyle.paper = paperI.gv;
        setBookStyle();
    })
    .sv(bookStyle.paper);
const paperEl = label([paperI, "纸质背景"]);
changeStyleBar.add([fontEl, fontWeight, fontSize, lineHeight, contentWidth, themeSelect, paperEl]);

themei.set(bookStyle.theme);

const markListEl = view();
const autoNewWordEl = view().add([
    button("生词忽略与标记").on("click", (_, el) => {
        autoIgnore(el);
    }),
]);
markListBarEl.add([autoNewWordEl, markListEl]);

const reviewAi = input("checkbox");
reviewButtonsEl.add(label([reviewAi, "ai"]));

const reviewScope = view();
const spellIgnore = select([
    { name: "全部", value: "all" },
    { name: "排除忽略词", value: "exIgnore" },
    { name: "仅忽略词", value: "ignore" },
]).style({ display: "none" });

const reviewSortEl = select([
    { name: "正常", value: "正常" },
    { name: "学习 从旧开始", value: "学习" },
    { name: "学习 趁热打铁", value: "学习1" },
    { name: "紧急", value: "紧急" },
    { name: "随机", value: "随机" },
]).on("change", () => {
    reviewSortType = reviewSortEl.el.value as typeof reviewSortType;
});

const reviewMoreEl = view()
    .attr({ popover: "auto" })
    .add([
        txt("过滤与排序"),
        view("y").add([
            reviewScope.style({ "max-height": "400px", overflow: "auto" }),
            spellIgnore,
            reviewSortEl,
            button("🎲跳转到陌生文章").on("click", async () => {
                const data = await sectionWordsSort();
                const fData = data.filter((i) => i[1] < 0.8);
                if (fData.length === 0) {
                    putToast(txt("文章掌握得不错，请直接复习"));
                    return;
                }
                const section = fData[Math.floor(Math.random() * fData.length)];
                const sectionId = section[0];
                const { book } = await getSectionBook(sectionId);
                if (book) showBook(book, sectionId);
            }),
        ]),
    ])
    .style({ "max-width": "80dvw", overflow: "auto" });
reviewMoreEl.addInto();
reviewButtonsEl.add(
    iconEl("filter").on("click", (_, el) => {
        popoverX(reviewMoreEl, el);
    }),
);

reviewButtonsEl.add(
    iconEl("chart").on("click", (_, el) => {
        popoverX(plotEl, el);
    }),
);

const keyboardEl = view("y").class("simple-keyboard");
if (getSetting(KEYBOARDDISPLAYPATH) === "default")
    keyboardEl.style({ height: `${await setting.getItem(KEYBOARDHEIGHTPATH)}px` });

const keyboard = keyB(
    {
        default: [
            "q w e r t y u i o p",
            "a s d f g h j k l",
            "{shift} z x c v b n m {bksp}",
            "{h} {tip} {space} {audio} {switch}",
        ],
        handwrite: ["{h} {tip} {space} {audio} {switch}"],
    },
    {
        "{space}": "␣",
        "{shift}": "⇧",
        "{bksp}": "⌫",
        "{tip}": "🫣",
        "{audio}": "📣",
        "{switch}": "^",
        "{h}": "=",
    },
);

const handwriterCanvas = ele("canvas").el;
const handwriterCheck = iconEl("ok")
    .style({ display: "none" })
    .on("click", () => ocrSpell);
const handwriterEl = view().class("spell_write").add([handwriterCanvas, handwriterCheck]);
const spellInputEl = view().style({ display: "none" }).add([keyboardEl.el, handwriterEl]);
reviewEl.add(spellInputEl);

const reviewModeRadio = radioGroup<Review>("review_mode");
reviewModeEl.add([
    reviewModeRadio.new("word", "单词"),
    reviewModeRadio.new("spell", "拼写"),
    reviewModeRadio.new("sentence", "句子"),
]);

const audioEl = ele("audio").addInto();
const pTTSEl = ele("audio").attr({ controls: true });

const pttsEl = view().attr({ id: "pTTSp" }).addInto();

const autoPlayTTSEl = input("checkbox").on("change", () => {
    autoPlay = autoPlayTTSEl.el.checked;
});
pttsEl.add([autoPlayTTSEl, pTTSEl]);

const plotEl = view().attr({ popover: "auto" }).class("plot");
const cardDue = view();
const cal1 = newCal(nowYear - startYear + 1);
const cal2 = newCal(nowYear - startYear + 1);
plotEl
    .add([
        cardDue,
        view().add([
            ele("h2").attr({ innerText: "新卡片" }),
            cal1.el,
            ele("h2").attr({ innerText: "已复习" }),
            cal2.el,
        ]),
    ])
    .addInto();

const settingEl = view().attr({ id: "setting", popover: "manual" }).addInto();
settingBEl.on("click", () => {
    settingEl.el.togglePopover();
});

settingEl.add(label([input().data({ path: "lan.learn" }), "学习语言"], 1));

const setOnlineBookEl = input().data({ path: "onlineBooks.url" });

settingEl.add([
    ele("h2").add("书"),
    "远程地址：",
    setOnlineBookEl,
    view().add([
        button("github").on("click", () => {
            setOnlineBookEl.sv("https://raw.githubusercontent.com/xushengfeng/rmbw-book/master");
            setOnlineBookEl.el.dispatchEvent(new CustomEvent("input"));
        }),
        button("kkgithub").on("click", () => {
            setOnlineBookEl.sv("https://raw.kkgithub.com/xushengfeng/rmbw-book/master");
            setOnlineBookEl.el.dispatchEvent(new CustomEvent("input"));
        }),
    ]),
]);

const uploadDicEl = input("file").attr({ id: "upload_dic" });

settingEl.add([ele("h2").add("词典"), uploadDicEl]);

settingEl.add([
    ele("h2").add("AI"),
    input().attr({ placeholder: "ai url" }).data({ path: "ai.url" }),
    input().attr({ placeholder: "ai key" }).data({ path: "ai.key" }),
    textarea("ai config").data({ path: "ai.config" }).style({
        // @ts-ignore
        "field-sizing": "content",
        minHeight: "2lh",
    }),
]);

settingEl.add(
    view().add([
        ele("h2").add("阅读器"),
        label([input("checkbox").data({ path: readerSettingPath.apostrophe }), "把’转为'"]),
    ]),
);

const onlineDicsEl = ele("ul").style({ "list-style-type": "none" });

const addOnlineDic1El = input();
const addOnlineDic2El = input();
const addOnlineDic3El = input();

const moreOnlineDicEl = select(
    [{ name: "更多", value: "" }].concat(defaultOnlineDic.map((i) => ({ name: i.name, value: i.name }))),
).on("change", () => {
    const i = defaultOnlineDic.find((i) => i.name === moreOnlineDicEl.el.value);
    if (!i) return;
    onlineDicsEl.add(onlineDicItem(i.name, i.url, i.lan));
    saveSortOnlineDics();
});

settingEl.add(
    view()
        .class("setting_dic")
        .add([
            ele("h3").add("在线词典"),
            onlineDicsEl,
            view().add([
                addOnlineDic1El,
                addOnlineDic2El,
                addOnlineDic3El,
                iconEl("add").on("click", () => {
                    onlineDicsEl.add(onlineDicItem(addOnlineDic1El.gv, addOnlineDic2El.gv, addOnlineDic3El.gv));
                    addOnlineDic1El.sv("");
                    addOnlineDic2El.sv("");
                    addOnlineDic3El.sv("");
                    saveSortOnlineDics();
                }),
                moreOnlineDicEl,
            ]),
        ]),
);

const uploadDataEl = input("file")
    .add("上传数据")
    .attr({ accept: ".json" })
    .on("change", () => {
        const reader = new FileReader();
        const file = uploadDataEl.el.files?.[0];
        if (file) reader.readAsText(file);
        reader.onload = () => {
            setAllData(JSON.parse(reader.result as string));
        };
    });

const p2pIdShowEl = txt();
const p2pIdInputEl = input().style({ display: "none" });
const p2pLinkBtnEl = button("连接")
    .style({ display: "none" })
    .bindSet((v: string, el) => {
        el.innerText = v;
    });
const p2pUL = view().style({ display: "none" });
const p2pSend = button("发送数据").addInto(p2pUL);
const p2pSendTrans = button("发送翻译缓存").addInto(p2pUL);

const asyncEl = view().add([
    ele("h2").add("数据"),
    view().add([
        button("导出数据").on("click", async () => {
            const data = await getAllDataWithCache();
            download(data, rmbwJsonName);
        }),
        uploadDataEl,
    ]),
    view().add([
        ele("h3").add("webDAV"),
        button("↓").on("click", async () => {
            const data = await getDAV();
            const str = await xUnGzip(data);
            setAllData(JSON.parse(str));
        }),
        button("↑").on("click", async () => {
            const data = await getAllData();
            const file = await xGzip(data);
            setDAV(file);
        }),
        ele("form").add([
            label([input().data({ path: DAVConfigPath.url }), "url："], 1),
            label([input().data({ path: DAVConfigPath.user }), "用户名："], 1),
            label([input().data({ path: DAVConfigPath.passwd }), "密码："], 1),
        ]),
        ele("h3").add("GitHub"),
        button("↓").on("click", async () => {
            putToast(txt("下载开始"));
            try {
                const data = (await downloadGithub(rmbwGithub1)) as AllData;
                const oldId = await textCacheId();
                const nId = data.sections[0]?.text;
                if (nId) {
                    let textData: { [key: string]: string } = {};
                    if (oldId !== nId) {
                        textData = await downloadGithub(rmbwGithub2);
                    } else {
                        await sectionsStore.iterate((v, k) => {
                            if (k !== coreWordBook.id) textData[k] = v.text;
                        });
                    }
                    for (const i in textData) {
                        data.sections[i].text = textData[i];
                    }
                    // @ts-ignore
                    data.sections[0] = undefined;
                }
                setAllData(data, nId);
            } catch (error) {
                putToast(txt("下载失败"), 6000);
                throw error;
            }
        }),
        button("↑").on("click", async () => {
            putToast(txt("上传开始"));
            try {
                const x = await toAllData();
                const v = splitAllData(x);

                const oldId = await textCacheId();
                if (oldId !== v.hash) {
                    await uploadGithub(JSON.stringify(v.text, null, 2), rmbwGithub2, "更新文本");
                }
                await uploadGithub(formatAllData(v.data), rmbwGithub1, "更新数据");
                updataTextId(v.hash);
                putToast(txt("上传成功"));
            } catch (error) {
                putToast(txt("上传失败"), 6000);
                throw error;
            }
        }),
        ele("form").add([
            label([input().data({ path: GitHubConfigPath.user }), "用户："], 1),
            label([input().data({ path: GitHubConfigPath.repo }), "仓库（repo）："], 1),
            label(
                [
                    input().data({ path: GitHubConfigPath.token }),
                    "token：",
                    a("https://github.com/settings/tokens/new?description=rmbw2&scopes=repo").add("创建"),
                ],
                1,
            ),
            label([input().data({ path: GitHubConfigPath.path }), "path："], 1),
            label([input().data({ path: GitHubConfigPath.download }), "替换下载："], 1),
        ]),
        ele("h3").add("自建服务器"),
        button("↓").on("click", async () => {
            putToast(txt("下载开始"));
            try {
                const webdata = await downloadServer(rmbwGithub1);
                if (!webdata) {
                    putToast(txt("已是最新"));
                    return;
                }
                const data = JSON.parse(webdata) as AllData & CacheData;
                setAllData(data);
            } catch (error) {
                putToast(txt("下载失败"), 6000);
                throw error;
            }
        }),
        button("↑").on("click", async () => {
            putToast(txt("上传开始"));
            try {
                await uploadServer(await getAllDataWithCache(), rmbwGithub1);
                putToast(txt("上传成功"));
            } catch (error) {
                putToast(txt("上传失败"), 6000);
                throw error;
            }
        }),
        ele("form").add([
            label([input().data({ path: ServerConfigPath.url }), "url："], 1),
            label([input().data({ path: ServerConfigPath.path }), "path："], 1),
        ]),
        ele("h3").add("P2P"),
        p2pIdShowEl,
        p2pIdInputEl,
        button("启动").on("click", async () => {
            const randomNumber = crypto.getRandomValues(new Uint32Array(1))[0] % 1e6;
            const id = String(randomNumber).padStart(6, "0");

            function toId(id: string) {
                return `rmbw2-${id}`;
            }
            const peer = new Peer(toId(id));
            peer.on("open", () => {
                p2pIdShowEl.sv(id);
                p2pIdInputEl.el.style.display = "";
                p2pLinkBtnEl.el.style.display = "";
            });
            function handleConnection(conn: DataConnection) {
                type Data = { type: "all_data"; data: string } | { type: "trans"; data: Record<string, string> };
                conn.on("open", () => {
                    p2pLinkBtnEl.sv("断开").el.onclick = () => {
                        conn.close();
                    };
                    p2pUL.el.style.display = "";
                    p2pSend.el.onclick = async () => {
                        const data = await getAllData();
                        conn.send({ type: "all_data", data } as Data);
                    };
                    p2pSendTrans.el.onclick = async () => {
                        const t: Record<string, string> = {};
                        await transCache.iterate((v, k) => {
                            t[k] = v;
                        });
                        conn.send({ type: "trans", data: t } as Data);
                    };
                });
                // @ts-ignore
                conn.on("data", async (data: Data) => {
                    console.log(data);
                    if (data.type === "all_data") {
                        setAllData(JSON.parse(data.data));
                    }
                    if (data.type === "trans") {
                        for (const k in data.data) {
                            await transCache.setItem(k, data.data[k]);
                        }
                    }
                });
                p2pLinkBtnEl.sv("断开").sv("连接中");
                // todo 断开连接，恢复连接按钮状态
            }
            peer.on("connection", (c) => {
                handleConnection(c);
            });
            p2pLinkBtnEl.el.onclick = () => {
                const inputId = p2pIdInputEl.gv;
                if (!inputId) return;
                if (inputId === id) {
                    putToast(txt("不能与自己连接"));
                    return;
                }
                const conn = peer.connect(toId(inputId));
                handleConnection(conn);
            };
        }),
        p2pLinkBtnEl,
        p2pUL,
    ]),
]);

settingEl.add(asyncEl);

const testSpeedLanEl = input();
const testSpeedContentEl = p();
const readSpeedEl = input("number").data({ path: "user.readSpeed" });

settingEl.add(
    view().add([
        ele("h2").add("复习"),
        button("导出词句").on("click", async () => {
            const csv = await getCSV("word");
            download(csv, "review.csv", "text/csv");
        }),
        button("导出拼写").on("click", async () => {
            const csv = await getCSV("spell");
            download(csv, "review_spell.csv", "text/csv");
        }),
        ele("br"),
        a("https://huggingface.co/spaces/open-spaced-repetition/fsrs4anki_app").add("参数优化器"),
        ele("br"),
        label([input().data({ path: "fsrs.word.w" }), "单词参数："], 1),
        label([input().data({ path: "fsrs.spell.w" }), "拼写参数："], 1),
        label([input().data({ path: "fsrs.sen.w" }), "句子参数："], 1),

        ele("h3").add("阅读速度"),
        p("测试阅读速度"),
        testSpeedLanEl,
        button("load").on("click", async () => {
            const l: AIm = [{ content: `生成一段${testSpeedLanEl.gv || "en"}小短文，使用简单词`, role: "user" }];
            testSpeedContentEl.el.setAttribute("data-text", (await ai(l).text) ?? "hello world");
        }),
        button("start").on("click", () => {
            testSpeedContentEl.el.setAttribute("data-time", String(time()));
            testSpeedContentEl.sv(testSpeedContentEl.el.getAttribute("data-text") ?? "");
        }),
        testSpeedContentEl,
        button("finish").on("click", () => {
            const startTime = Number(testSpeedContentEl.el.getAttribute("data-time"));
            const text = testSpeedContentEl.gv;
            const endTime = time();

            const segmenter = new Segmenter(testSpeedLanEl.gv || "en", { granularity: "word" });
            const segments = segmenter.segment(text);
            const wordsCount = Array.from(segments).length;
            readSpeedEl.sv(String(Math.round((endTime - startTime) / wordsCount)));
            readSpeedEl.el.dispatchEvent(new Event("input"));
        }),
        label([readSpeedEl, "ms/word"]),
        ele("h3").add("复习休息"),
        input("number").data({ path: "review.maxCount" }).sv(String(maxReviewCount)),
        txt("0为不限制，刷新生效"),
    ]),
);

const ttsEngineEl = select<"browser" | "ms">([
    { value: "browser", name: "浏览器" },
    { value: "ms", name: "微软" },
]).data({ path: ttsConfig.engine });

const loadTTSVoicesEl = button("load");
const voicesListEl = select([]);
loadTTSVoicesEl.on("click", async () => {
    voicesListEl.clear();
    if ((await getTtsConfig()).engine === "browser") {
        const list = speechSynthesis.getVoices();
        for (const v of list) {
            const text = `${v.name.replace(/Microsoft (\w+) Online \(Natural\)/, "$1")}`;
            const op = ele("option").add(text).attr({ value: v.name });
            voicesListEl.add(op);
        }
    } else {
        const list = await tts.getVoices();
        for (const v of list) {
            const text = `${v.Gender === "Male" ? "♂️" : "♀️"} ${v.FriendlyName.replace(/Microsoft (\w+) Online \(Natural\)/, "$1")}`;
            const op = ele("option").add(text).attr({ value: v.ShortName });
            voicesListEl.add(op);
        }
    }
    voicesListEl.sv((await getTtsConfig()).voice).on("change", () => {
        const name = voicesListEl.gv;
        tts.setMetadata(name, OUTPUT_FORMAT.WEBM_24KHZ_16BIT_MONO_OPUS);
        setting.setItem(ttsConfig.voice, name);
        ttsCache.clear();
    });
});

settingEl.add(view().add([ele("h2").add("tts"), ttsEngineEl, loadTTSVoicesEl, voicesListEl]));

settingEl.add(
    view().add([
        ele("h2").add("清除缓存"),
        `≈${(((await navigator.storage.estimate()).usage ?? 0) / 1024 / 1024).toFixed(2)}MB`,
        button("语音").on("click", () => {
            ttsCache.clear();
        }),
        button("翻译").on("click", () => {
            transCache.clear();
        }),
    ]),
);

settingEl.add(
    view().add([
        ele("h2").add(txt("文档")),
        a("https://github.com/xushengfeng/rmbw2/blob/master/docs/tutorial.md").add("点击查看文档"),
    ]).el,
);

settingEl.add(
    view()
        .class("about")
        .add([
            ele("h2").add("关于"),
            view().add([image("./logo/logo.svg", "logo").attr({ width: 32 }), "rmbw2"]),
            a("https://www.netlify.com/").add(
                image("https://www.netlify.com/v3/img/components/netlify-light.svg", "Deploys by Netlify").attr({
                    loading: "lazy",
                }),
            ),
            view().add([
                button("更新").on("click", async () => {
                    const cacheKeepList = ["v2"];
                    const keyList = await caches.keys();
                    const cachesToDelete = keyList.filter((key) => !cacheKeepList.includes(key));
                    await Promise.all(
                        cachesToDelete.map(async (key) => {
                            await caches.delete(key);
                        }),
                    );
                }),
            ]),
            view().add([a("https://github.com/xushengfeng/rmbw2/").add(["项目开源地址", image(githubIcon, "")])]),
            view().add(a("https://github.com/xushengfeng/rmbw2/blob/master/LICENSE").add("GPL-3.0")),
            view().add([
                "Designed and programmed by xsf ",
                a("mailto:xushengfeng_zg@163.com").add("xushengfeng_zg@163.com"),
            ]),
        ]),
);

document.body.addEventListener("pointerup", (e) => {
    if (willShowMenu) {
        menuEl.el.showPopover();
        willShowMenu = false;
    }
});

if (!(await sectionsStore.getItem(ignoreWordSection))) {
    await sectionsStore.setItem(ignoreWordSection, {
        title: "ignore",
        lastPosi: 0,
        text: "",
        words: {},
    } as Section);
}

bookBEl.on("click", () => {
    booksEl.el.showModal();
});
addBookEl.on("click", async () => {
    const b = await newBook();
    nowBook = b;
    const book = (await getBooksById(nowBook.book)) as Book;
    showBook(book);
    changeEdit(true);
    booksElclose();
});

addSectionEL.on("click", async () => {
    if (nowBook.book === coreWordBook.id) return;
    if (!nowBook.book) nowBook = await newBook();
    const book = await getBooksById(nowBook.book);
    if (!book) {
        console.log(`找不到书籍${nowBook.book}`);
        return;
    }
    const sid = uuid();
    book.sections.push(sid);
    book.lastPosi = book.sections.length - 1;
    const s = newSection();
    await sectionsStore.setItem(sid, s);
    await bookshelfStore.setItem(nowBook.book, book);
    nowBook.sections = book.sections.at(-1) as string;
    showBook(book);
    changeEdit(true);
});

bookSectionsB.on("click", () => {
    bookNavEl.el.classList.toggle("book_nav_show");
});

showLocalBooks();
setBookS();

changeStyleEl.on("click", () => {
    popoverX(changeStyleBar, changeStyleEl);
});

setBookStyle();

changeEditEl.on("click", () => {
    isEdit = !isEdit;
    changeEdit(isEdit);
});

changeEdit(false);

bookContentContainerEl.on("scroll", async () => {
    if (!canRecordScroll) return;
    const n = getScrollPosi(bookContentContainerEl);
    contentScrollPosi = n;
    const sectionId = nowBook.sections;
    const section = await getSection(sectionId);
    if (!section) return;
    section.lastPosi = n;
    sectionsStore.setItem(sectionId, section);
});

bookdicEl.on("click", async () => {
    markListBarEl.el.classList.toggle(SHOWMARKLIST);
    if (markListBarEl.el.classList.contains(SHOWMARKLIST)) {
        showMarkList();
    }
});

setting.getItem("dics").then(async (l: string[]) => {
    for (const i of l || []) {
        const x = await dicStore.getItem(i);
        if (!x) continue;
        // @ts-ignore
        x.dic = undefined;
        dics[i] = x;
    }
});

dicStore.iterate((v, k) => {
    // @ts-ignore
    v.dic = undefined;
    dics[k] = v;
});

lastMarkEl.on("click", async () => {
    if (!nowDicId) return;
    const list = await getAllMarks();
    let index = list.findIndex((i) => i.id === nowDicId);
    index--;
    index = index < 0 ? 0 : index;
    const id = list[index].id;
    jumpToMark(list[index].s.cIndex);
    showDic(id);
});
nextMarkEl.on("click", async () => {
    if (!nowDicId) return;
    const list = await getAllMarks();
    let index = list.findIndex((i) => i.id === nowDicId);
    index++;
    index = index >= list.length ? list.length - 1 : index;
    const id = list[index].id;
    jumpToMark(list[index].s.cIndex);
    showDic(id);
});

dicMinEl.on("click", () => {
    dicDetailsEl.el.classList.toggle(HIDEMEANS);
});

autoFun.config({
    type: "chatgpt",
    url: getSetting("ai.url") as string,
    key: getSetting("ai.key"),
    option: {
        model: "gpt-4o-mini",
        ...JSON.parse(getSetting("ai.config") || "{}"),
    },
});

reviewBEl.on("click", () => {
    reviewEl.el.classList.toggle("review_show");
    reviewBEl.el.classList.remove(TODOMARK);
});

sectionSelect(reviewScope);

keyboard.setLayout(await setting.getItem(KEYBOARDDISPLAYPATH));

window.addEventListener("keydown", (e) => {
    if (!(reviewType === "spell" && reviewEl.el.classList.contains("review_show"))) return;
    if (!reviewEl.el.contains(document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2))) return; // 用于note
    const oldInput = keyboard.getInput();
    if (e.key !== "Backspace") {
        if (e.key === ">") {
            spellF("{audio}");
            return;
        }
        if (e.key === "?") {
            spellF("{tip}");
            return;
        }
        if (e.key.length === 1) keyboard.setInput(oldInput + e.key);
    } else {
        keyboard.setInput(oldInput.slice(0, -1));
    }
});

setTimeout(async () => {
    const d = await getFutureReviewDue(0.1, "word", "spell", "sentence");
    let c = 0;
    c += Object.keys(d.word).length + Object.keys(d.spell).length;
    if (c > 0) reviewBEl.class(TODOMARK);
}, 10);

reviewEl.on("pointerdown", (e) => {
    if (!(reviewType === "spell" && reviewEl.el.classList.contains("review_show"))) return;
    const sEl = document.querySelector(".spell_input");
    if (!sEl) return;
    if (e.clientY > sEl.getBoundingClientRect().bottom) return;
    if (e.clientY < sEl.getBoundingClientRect().top) return;
    console.log(e);
    e.preventDefault();
    spellWriteE = e;
    if (!spellWriteCtx) {
        spellWriteCtx = handwriterCanvas.getContext("2d") as CanvasRenderingContext2D;
        handwriterCanvas.width = window.innerWidth;
        handwriterCanvas.height = window.innerHeight - 32;
        handwriterCheck.style({ display: "" });
    }
    spellWriteCtx.moveTo(e.clientX, e.clientY - 32 * 2);
});

reviewEl.on("pointermove", (e) => {
    if (!spellWriteE || !spellWriteCtx) return;
    const ctx = spellWriteCtx;
    ctx.lineTo(e.clientX, e.clientY - 32 * 2);
    ctx.stroke();
});

window.addEventListener("pointerup", (e) => {
    spellWriteE = null;
});

reviewModeRadio.on(() => {
    reviewType = reviewModeRadio.get();
    if (reviewType === "spell") {
        spellInputEl.style({ display: "" });
        spellIgnore.style({ display: "" });
    } else {
        spellInputEl.style({ display: "none" });
        spellIgnore.style({ display: "none" });
    }
    reviewReflashEl.el.click();
});

reviewReflashEl.on("click", async () => {
    due = await getFutureReviewDue(0.1, reviewType);
    const l = await getReviewDue(reviewType);
    console.log(l);
    if (reviewAi.el.checked && reviewType === "word") await getWordAiContext();
    reviewCount = 0;
    showReview(l, reviewType);
});

document.addEventListener("keydown", (e) => {
    if (!reviewEl.el.classList.contains("review_show") && reviewType !== "spell") return;
    for (const i in reviewHotkey) {
        if (e.key === reviewHotkey[i].key) {
            reviewHotkey[i].f();
        }
    }
});

if (!(await setting.getItem(onlineDicsPath))) {
    await setting.setItem(onlineDicsPath, defaultOnlineDic);
}

showOnlineDics();

uploadDicEl.on("change", () => {
    const file = uploadDicEl.el.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.readAsText(file);
        reader.onload = () => {
            const dic = JSON.parse(reader.result as string);
            console.log(dic);
            saveDic(dic);
        };
    }
});

setFontElF(bookStyle.fontFamily);

for (const _el of settingEl.queryAll("[data-path]")) {
    const el = _el.el;
    const path = el.getAttribute("data-path");
    if (!path) continue;
    const value = await setting.getItem(path);
    if (el.tagName === "INPUT") {
        const iel = el as HTMLInputElement;
        if (iel.type === "checkbox") {
            iel.checked = value as boolean;
            iel.addEventListener("input", () => {
                setting.setItem(path, iel.checked);
            });
        } else if (iel.type === "range") {
            iel.value = value as string;
            iel.addEventListener("input", () => {
                setting.setItem(path, Number(iel.value));
            });
        } else {
            iel.value = value as string;
            iel.addEventListener("input", () => {
                setting.setItem(path, iel.value);
            });
        }
    } else if ("value" in el) {
        el.value = value as string;
        el.addEventListener("input", () => {
            setting.setItem(path, el.value);
        });
    }
}

if ("serviceWorker" in navigator) {
    if (import.meta.env.PROD) {
        navigator.serviceWorker.register("/sw.js");
    }
}

navigator?.storage?.persist(); // 下次再说，所以不用await

if (await setting.getItem(ServerConfigPath.url)) {
    putToast(txt("正在检查更新"));
    try {
        const webdata = await downloadServer(rmbwGithub1);
        if (webdata) {
            const data = JSON.parse(webdata) as AllData;
            setAllData(data);
        } else {
            putToast(txt("本地是最新的"));
        }
    } catch (error) {
        putToast(txt("无法检查"), 6000);
    }

    setInterval(
        () =>
            requestIdleCallback(async () => {
                putToast(txt("上传开始"));
                try {
                    await uploadServer(await getAllDataWithCache(), rmbwGithub1);
                    putToast(txt("上传成功"));
                } catch (error) {}
            }),
        timeD.m(10),
    );
}

booksEl.el.showModal();

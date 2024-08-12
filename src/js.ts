/// <reference types="vite/client" />

import { el, setStyle } from "redom";

import { ele, view, pack, frame, a, txt, p, trackPoint, textarea, button, type ElType } from "dkh-ui";

import localforage from "localforage";
import { extendPrototype } from "localforage-setitems";
extendPrototype(localforage);

import * as zip from "@zip.js/zip.js";

import { hyphenate } from "hyphen/en";
const hyphenChar = "·";

const Segmenter = Intl.Segmenter;

import "@oddbird/popover-polyfill";

import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts-browserify";

import { type Card, createEmptyCard, generatorParameters, FSRS, Rating, State } from "ts-fsrs";

import spark from "spark-md5";

import ai_svg from "../assets/icons/ai.svg";
import pen_svg from "../assets/icons/pen.svg";
import ok_svg from "../assets/icons/ok.svg";
import very_ok_svg from "../assets/icons/very_ok.svg";
import help_svg from "../assets/icons/help.svg";
import translate_svg from "../assets/icons/translate.svg";
import left_svg from "../assets/icons/left.svg";
import right_svg from "../assets/icons/right.svg";
import sentence_svg from "../assets/icons/sentence.svg";
import clear_svg from "../assets/icons/clear.svg";
import close_svg from "../assets/icons/close.svg";
import more_svg from "../assets/icons/more.svg";
import reload_svg from "../assets/icons/reload.svg";
import recume_svg from "../assets/icons/recume.svg";
import add_svg from "../assets/icons/add.svg";
import exTrans_svg from "../assets/icons/exTrans.svg";
import eye_svg from "../assets/icons/eye.svg";
import style_svg from "../assets/icons/style.svg";
import font_small_svg from "../assets/icons/font_small.svg";
import font_large_svg from "../assets/icons/font_large.svg";
import line_height_small_svg from "../assets/icons/line_height_small.svg";
import line_height_large_svg from "../assets/icons/line_height_large.svg";
import content_width_small_svg from "../assets/icons/content_width_small.svg";
import content_width_large_svg from "../assets/icons/content_width_large.svg";
import chart_svg from "../assets/icons/chart.svg";
import githubIcon from "../assets/other/Github.svg";

function icon(src: string) {
    return `<img src="${src}" class="icon">`;
}
function iconEl(src: string) {
    return el("img", { src, class: "icon", alt: "按钮图标" });
}

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

const timeD = {
    s: (n: number) => n * 1000,
    m: (n: number) => n * timeD.s(60),
    h: (n: number) => n * timeD.m(60),
    d: (n: number) => n * timeD.h(24),
};

if ("serviceWorker" in navigator) {
    if (import.meta.env.PROD) {
        navigator.serviceWorker.register("/sw.js");
    }
}

const setting = localforage.createInstance({
    name: "setting",
    driver: localforage.LOCALSTORAGE,
});

function getSetting(p: string) {
    return JSON.parse(localStorage.getItem(`setting/${p}`)) as string;
}

/************************************UI */

navigator?.storage?.persist();

document.body.translate = false;

const menuEl = document.getElementById("menu");
let willShowMenu = false;
function showMenu(x: number, y: number) {
    menuEl.style.left = `${x}px`;
    menuEl.style.top = `${y}px`;
    willShowMenu = true;
    menuEl.onclick = () => menuEl.hidePopover();
}

document.body.addEventListener("pointerup", (e) => {
    if (willShowMenu) {
        menuEl.showPopover();
        willShowMenu = false;
    }
});

function interModal(message?: string, iel?: HTMLElement, cancel?: boolean) {
    const dialog = document.createElement("dialog");
    dialog.className = "interModal";
    const me = document.createElement("span");
    const cancelEl = document.createElement("button");
    cancelEl.innerText = "取消";
    cancelEl.classList.add("cancel_b");
    const okEl = document.createElement("button");
    okEl.innerText = "确定";
    okEl.classList.add("ok_b");
    me.innerText = message ?? "";
    dialog.append(me);
    if (iel) {
        dialog.append(iel);
        iel.style.gridArea = "2 / 1 / 3 / 3";
    }
    if (cancel) dialog.append(cancelEl);
    dialog.append(okEl);
    document.body.append(dialog);
    dialog.showModal();
    return new Promise((re: (name: string | boolean) => void, rj) => {
        okEl.onclick = () => {
            re(
                (iel as HTMLInputElement)?.value ||
                    iel?.querySelector("input")?.value ||
                    iel?.querySelector("textarea")?.value ||
                    true,
            );
            dialog.close();
        };
        cancelEl.onclick = () => {
            re(null);
            dialog.close();
        };
        dialog.onclose = () => {
            dialog.remove();
        };
        dialog.oncancel = () => {
            re(null);
        };
    });
}

async function alert(message: string) {
    return await interModal(message, null);
}

async function confirm(message: string) {
    return Boolean(await interModal(message, null, true));
}

async function prompt(message?: string, defaultValue?: string) {
    return (await interModal(message, el("input", { value: defaultValue || "" }), true)) as string;
}

function dialogX(el: HTMLDialogElement) {
    document.body.append(el);
    el.showModal();
    el.addEventListener("close", () => {
        el.remove();
    });
}

function vlist<ItemType>(
    pel: HTMLElement,
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
    f: (index: number, item: ItemType, remove: () => void) => HTMLElement,
) {
    const iHeight = style.iHeight;
    const gap = style.gap ?? 0;
    // padding 还需要pel自己设定
    const paddingTop = style.paddingTop ?? 0;
    const paddingLeft = style.paddingLeft ?? 0;
    const paddingBotton = style.paddingBotton ?? 0;

    const blankEl = el("div", {
        style: { width: "1px", position: "absolute", top: "0" },
    });
    const setBlankHeight = (len: number) => {
        blankEl.style.height = `${iHeight * len + gap * len + paddingTop + paddingBotton}px`;
    };
    setBlankHeight(list.length);
    pel.append(blankEl);
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
        let startI = Math.ceil((pel.scrollTop - paddingTop) / (iHeight + gap));
        let endI = Math.floor((pel.scrollTop - paddingTop + pel.offsetHeight) / (iHeight + gap));
        const buffer = Math.min(Math.floor((endI - startI) / 3), 15);
        startI -= buffer;
        endI += buffer;
        startI = Math.max(0, startI);
        endI = Math.min(newList.length - 1, endI);
        const elList = Array.from(pel.querySelectorAll(`:scope > [${dataI}]`).values()) as HTMLElement[];
        if (newList.length < 100 && !newList) {
            startI = 0;
            endI = newList.length - 1;
            if (elList.length === newList.length) return;
        }
        const oldRangeList: number[] = [];
        for (const el of elList) oldRangeList.push(Number(el.getAttribute(dataI)));
        for (const i of oldRangeList) {
            if (i < startI || endI < i || newList) pel.querySelector(`:scope > [${dataI}="${i}"]`).remove();
        }
        for (let i = startI; i <= endI; i++) {
            const iel = await f(i, newList[i], () => {
                show(newList.toSpliced(i, 1));
            });
            setStyle(iel, {
                position: "absolute",
                top: `${paddingTop + i * (iHeight + gap)}px`,
                left: `${paddingLeft}px`,
                ...(style.width ? { width: style.width } : {}),
            });
            iel.setAttribute(dataI, String(i));
            if (!pel.querySelector(`:scope > [${dataI}="${i}"]`) || newList) pel.append(iel);
        }
    }
    show();
    function s() {
        requestAnimationFrame(() => show());
    }
    pel.addEventListener("scroll", s);

    const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            if (mutation.type === "childList" && Array.from(mutation.removedNodes).includes(blankEl)) {
                pel.removeEventListener("scroll", s);
            }
        }
    });
    observer.observe(pel, { childList: true });
    return { show };
}

/************************************main */
const DICSHOW = "dic_show";
const MARKWORD = "mark_word";
const TMPMARKWORD = "tmp_mark_word";
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

const booksEl = document.getElementById("books") as HTMLDialogElement;
const localBookEl = el("div");
const onlineBookEl = el("div", { style: { display: "none" } });
booksEl.append(
    el("div", { style: { display: "flex" } }, [
        el("div", "本地书籍", {
            onclick: () => {
                showLocalBooks();
                booksEl.classList.remove("show_online_book");
            },
        }),
        el("div", "在线书籍", {
            onclick: () => {
                getOnlineBooks();
                booksEl.classList.add("show_online_book");
            },
        }),
        el("div", "词典", {
            onclick: () => {
                showBook(coreWordBook);
                booksEl.close();
            },
        }),
        el("button", iconEl(close_svg), {
            style: { "margin-left": "auto" },
            onclick: () => {
                booksEl.close();
            },
        }),
    ]),
    localBookEl,
    onlineBookEl,
);
const bookSectionsEl = el("div", {
    style: {
        overflow: "scroll",
        position: "relative",
        "flex-grow": "1",
    },
});
const bookBEl = document.getElementById("books_b");
const addBookEl = el("div", iconEl(add_svg));
const addSectionEL = el("div", iconEl(add_svg));
const bookNameEl = el("div");
const bookNavEl = document.getElementById("book_nav");
bookNavEl.append(bookNameEl, addSectionEL, bookSectionsEl);
let bookContentEl = document.getElementById("book_content");
const bookContentContainerEl = bookContentEl.parentElement;
const paghMore = document.getElementById("pagh_more");
paghMore.onclick = () => {
    bookContentEl.classList.toggle("show_p_more");
};
const articleAi = document.getElementById("article_ai");
articleAi.onclick = () => {
    showArticelAI();
};
const changeStyleEl = document.getElementById("change_style");
const changeStyleBar = el("div", { popover: "auto", class: "change_style_bar" });
document.body.append(changeStyleBar);
const changeEditEl = document.getElementById("change_edit");
const dicEl = document.getElementById("dic");
const bookdicEl = document.getElementById("book_dic");
const lastMarkEl = el("button", iconEl(left_svg));
const nextMarkEl = el("button", iconEl(right_svg));
const toSentenceEl = el("button", iconEl(sentence_svg));
const hideDicEl = el("button", iconEl(close_svg));
const dicWordEl = el("input", { alt: "单词" });
const lessWordEl = el("span", "-");
const moreWordEl = el("span", "+");
const moreWordsEl = el("div", { class: "more_words" });
const ttsWordEl = el("button", { style: { width: "auto", height: "auto", "font-size": "inherit" } });
const ttsContextEl = el("button", iconEl(recume_svg));
const dicTransB = el("button", iconEl(translate_svg));
const dicTransContent = el("input", {
    alt: "语境翻译",
    class: TRANSLATE,
    style: { border: "none", width: "100%", fontSize: "1rem" },
});
const dicMinEl = el("button", { style: { minHeight: "24px" } }, iconEl(more_svg));
const addMeanEl = el("button", { style: { minHeight: "24px" } }, iconEl(add_svg));
const editMeanEl = el("button", { style: { minHeight: "24px" } }, iconEl(pen_svg));
const noteEl = el("button", { style: { minHeight: "24px" } }, iconEl(pen_svg));
const dicDetailsEl = el("div", { class: "dic_details" });

dicEl.append(
    el("div", { style: { display: "flex" } }, [lastMarkEl, nextMarkEl, toSentenceEl, ttsContextEl, noteEl, hideDicEl]),
    el("div", { style: { display: "flex", "flex-wrap": "wrap", "align-items": "center" } }, [
        dicWordEl,
        el("div", lessWordEl, moreWordEl),
        ttsWordEl,
        moreWordsEl,
    ]),
    el("div", { style: { display: "flex" } }, [dicTransB, dicTransContent]),
    el("div", { style: { display: "flex" } }, [dicMinEl, addMeanEl, editMeanEl]),
    dicDetailsEl,
);

function putToast(ele: HTMLElement, time = 2000) {
    let toastEl = document.body.querySelector(".toast") as HTMLElement;
    if (!toastEl) {
        toastEl = el("div", { class: "toast", popover: "auto" });
        document.body.append(toastEl);
    }
    toastEl.showPopover();
    toastEl.append(ele);

    if (time) {
        setTimeout(() => {
            ele.remove();
        }, time);
    }

    const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            if (mutation.type === "childList" && toastEl.childElementCount === 0) {
                toastEl.remove();
                observer.disconnect();
            }
        }
    });
    observer.observe(toastEl, { childList: true });
}

const tmpDicEl = el("div", { popover: "auto", class: "tmp_dic" });
document.body.append(tmpDicEl);

const bookshelfStore = localforage.createInstance({ name: "bookshelf" });
const sectionsStore = localforage.createInstance({ name: "sections" });

type book = {
    name: string;
    shortName?: string;
    id: string;
    visitTime: number;
    updateTime: number;
    type: "word" | "text";
    wordSplit?: "grapheme" | "word";
    cover?: string;
    author?: string;
    titleParse?: string;
    titleIndex?: number[];
    sections: string[];
    canEdit: boolean;
    lastPosi: number;
    language: string;
};
type section = {
    title: string;
    text: string;
    words: {
        [key: string]: {
            id: string;
            index: [number, number]; // 文章绝对定位
            cIndex: [number, number];
            visit: boolean;
            type: "word" | "sentence";
        };
    };
    lastPosi: number;
    note?: string;
};

async function getBooksById(id: string) {
    if (id === "0") return coreWordBook;
    return (await bookshelfStore.getItem(id)) as book;
}
async function getSection(id: string) {
    return (await sectionsStore.getItem(id)) as section;
}

async function checkEmptyBook(book: book) {
    const e = true;
    for (const sis of book.sections) {
        if (Object.keys((await getSection(sis)).words).length) {
            return false;
        }
    }
    return e;
}

async function getBookShortTitle(bookId: string) {
    return (await getBooksById(bookId)).shortName || (await getBooksById(bookId)).name;
}

function getSectionTitle(book: book, sectionId: string, sectionTitle: string) {
    let st = sectionTitle;
    if (book.titleParse) {
        const i = book.sections.indexOf(sectionId);
        st = book.titleParse.replaceAll("{i}", String(book.titleIndex?.[i] || i + 1)).replaceAll("{t}", sectionTitle);
    }
    return st;
}

async function getTitleEl(bookId: string, sectionN: string, markId: string, x?: string) {
    const book = await getBooksById(bookId);
    const section = await getSection(sectionN);
    const title = `${await getBookShortTitle(bookId)}${x || " - "}${getSectionTitle(book, sectionN, section.title)}`;
    const v = txt(title)
        .class("source_title")
        .on("click", async () => {
            await showBook(await getBooksById(bookId), sectionN);
            const index = (await getAllMarks()).find((i) => i.id === markId);
            const id = index.id;
            jumpToMark(index.s.cIndex);
            showDic(id);
        });
    return v;
}

async function newBook() {
    const id = uuid();
    const sid = uuid();
    const book: book = {
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
    const s: section = { title: "新章节", lastPosi: 0, text: "", words: {} };
    return s;
}

const ignoreWordSection = "ignore";
if (!(await sectionsStore.getItem(ignoreWordSection))) {
    await sectionsStore.setItem(ignoreWordSection, {
        title: "ignore",
        lastPosi: 0,
        text: "",
        words: {},
    } as section);
}

const wordSection = "words";
if (!(await sectionsStore.getItem(wordSection))) {
    await sectionsStore.setItem(wordSection, {
        title: "words",
        lastPosi: 0,
        text: "",
        words: {},
    } as section);
}

const coreWordBook: book = {
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

bookBEl.onclick = () => {
    booksEl.showModal();
};

const coverCache = localforage.createInstance({ name: "cache", storeName: "cover" });

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

async function getOnlineBooks() {
    fetch(`${await getOnlineBooksUrl()}/index.json`)
        .then((v) => v.json())
        .then((j) => {
            showOnlineBooks(j.books);
            console.log(j);
        });
}

async function showOnlineBooks(
    books: {
        name: string;
        id: string;
        type: "word" | "text" | "package";
        updateTime: number;
        sections: {
            id: string;
            title: string;
            path: string;
        }[];
        language: string;
        cover?: string;
    }[],
) {
    onlineBookEl.innerHTML = "";
    let grid: HTMLElement;

    const l = selectBook(books, async (list) => {
        grid?.remove();
        grid = await showOnlineBooksL(list);
        l.after(grid);
    });

    onlineBookEl.append(l);
}

async function showOnlineBooksL(
    books: {
        name: string;
        id: string;
        type: "word" | "text" | "package";
        updateTime: number;
        sections: {
            id: string;
            title: string;
            path: string;
        }[];
        language: string;
        cover?: string;
    }[],
) {
    const grid = el("div", { class: "books" });
    for (const book of books) {
        let url = "";
        if (book.cover) url = await getBookCover(book.cover);
        const div = bookEl(book.name, url);
        const bookCover = div.querySelector("div");
        bookshelfStore.iterate((v: book, k) => {
            if (book.id === k) {
                if (v.updateTime < book.updateTime) {
                    div.classList.add(TODOMARK1);
                }
            }
        });
        div.onclick = async () => {
            console.log(book);
            if (book.type === "package") {
                saveLanguagePackage(book.language, book.sections);
                return;
            }
            let xbook = (await bookshelfStore.getItem(book.id)) as book;
            if (xbook) {
                if (xbook.updateTime < book.updateTime) {
                    saveBook();
                    div.classList.remove(TODOMARK1);
                }
            } else {
                xbook = {
                    ...book,
                    visitTime: 0,
                    updateTime: 0,
                    sections: [],
                    canEdit: false,
                    lastPosi: 0,
                    language: "en",
                } as book;
                saveBook();
            }
            function saveBook() {
                const s = [];
                let count = 0;
                const fetchPromises = book.sections.map(async (item) => {
                    const { id, path, title } = item;
                    const response = await fetch(`${await getOnlineBooksUrl()}/source/${path}`);
                    const content = await response.text();
                    count++;
                    const p = (count / book.sections.length) * 100;
                    bookCover.style.clipPath = `xywh(0 ${100 - p}% 100% 100%)`;
                    return { id, content, title };
                });
                Promise.all(fetchPromises)
                    .then(async (results) => {
                        console.log(results);
                        for (const i of results) {
                            s.push(i.id);
                            const section = (await sectionsStore.getItem(i.id)) as section;
                            if (section) {
                                const s = changePosi(section, i.content);
                                s.text = i.content;
                                s.title = i.title;
                                sectionsStore.setItem(i.id, s);
                            } else {
                                sectionsStore.setItem(i.id, {
                                    title: i.title,
                                    lastPosi: 0,
                                    text: i.content,
                                    words: {},
                                } as section);
                            }
                        }
                        for (const i in book) {
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
        };
        grid.append(div);
    }
    return grid;
}

function selectBook<BOOK extends { type: "word" | "text" | "package"; language: string }>(
    books: BOOK[],
    f: (list: BOOK[]) => void,
) {
    const typeEl = el("div");
    const lanEl = el("div");

    const tl = Object.keys(Object.groupBy(books, ({ type }) => type));
    const ll = Object.keys(Object.groupBy(books, ({ language }) => language));

    const x: { type: number | string; lan: number | string } = { type: 0, lan: 0 };

    const map = { word: "词典", text: "文本", package: "包" };
    function crl(l: string[], text: (text: string) => string, pel: HTMLElement, key: keyof typeof x) {
        if (l.length > 1)
            for (const i of [0, ...l]) {
                pel.append(
                    el("span", typeof i === "number" ? "全部" : text(i), {
                        onclick: () => {
                            x[key] = i;
                            run();
                        },
                    }),
                );
            }
    }
    crl(tl, (t) => map[t], typeEl, "type");
    crl(ll, (t) => t, lanEl, "lan");

    function run() {
        let l = books.filter((b) => typeof x.type === "number" || b.type === x.type);
        l = l.filter((b) => typeof x.lan === "number" || b.language === x.lan);
        f(l);
    }
    run();

    return el("div", typeEl, lanEl);
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
            if (i.id === "dic") {
                i.content.lang = lan;
                saveDic(i.content);
            }
            if (i.id === "map") {
                wordMapStore.setItem(lan, i.content);
                usSpell = i.content;
            }
        }
    });
}

addBookEl.onclick = async () => {
    const b = await newBook();
    nowBook = b;
    const book = await getBooksById(nowBook.book);
    showBook(book);
    changeEdit(true);
    booksEl.close();
};

addSectionEL.onclick = async () => {
    if (nowBook.book === "0") return;
    if (!nowBook.book) nowBook = await newBook();
    const book = await getBooksById(nowBook.book);
    const sid = uuid();
    book.sections.push(sid);
    book.lastPosi = book.sections.length - 1;
    const s = newSection();
    await sectionsStore.setItem(sid, s);
    await bookshelfStore.setItem(nowBook.book, book);
    nowBook.sections = book.sections.at(-1);
    showBook(book);
    changeEdit(true);
};

document.getElementById("book_sections").onclick = () => {
    bookNavEl.classList.toggle("book_nav_show");
};

let nowBook = {
    book: "",
    sections: "",
};

let isWordBook = false;
const studyLan = ((await setting.getItem("lan.learn")) as string) || "en";

showLocalBooks();
setBookS();

async function setSectionTitle(sid: string) {
    const title = (await getSection(sid)).title;
    const titleEl = el("input", { style: { "font-size": "inherit" } });
    titleEl.value = title;
    titleEl.select();
    const iel = el("div");
    iel.append(
        titleEl,
        el("button", "ai", {
            onclick: async () => {
                const f = new autoFun.def({
                    input: { text: "string" },
                    script: ["为输入的文章起个标题"],
                    output: "title:string",
                });
                const ff = f.run(editText);
                const stopEl = el("button", iconEl(close_svg));
                stopEl.onclick = () => {
                    ff.stop.abort();
                    pel.remove();
                };
                const pel = el("div", [el("p", "AI正在思考标题"), stopEl]);
                putToast(pel, 0);
                ff.result.then((r) => {
                    pel.remove();
                    // @ts-ignore
                    titleEl.value = r.title;
                });
            },
        }),
    );
    titleEl.focus();
    const nTitle = (await interModal("重命名章节标题", iel, true)) as string;
    if (!nTitle) return;
    const sectionId = sid;
    const section = await getSection(sectionId);
    section.title = nTitle;
    await sectionsStore.setItem(sectionId, section);
    if (!isWordBook) bookContentEl.querySelector("h1").innerText = section.title;
    setBookS();
    return nTitle;
}

async function setBookS() {
    if (nowBook.book) {
        const bookName = (await getBooksById(nowBook.book)).name;
        bookNameEl.innerText = bookName;
        const sectionId = nowBook.sections;
        const section = await getSection(sectionId);
        if (!isWordBook) bookContentEl.querySelector("h1").innerText = section.title;
    }
}

function bookEl(name: string, coverUrl?: string, shortName?: string) {
    const bookIEl = el("div");
    const cover = el("div");
    const titleEl = el("span");
    const bookCover = el("div");
    bookCover.innerText = shortName || name;
    cover.append(bookCover);
    if (coverUrl) {
        const bookCover = el("img");
        bookCover.src = coverUrl;
        cover.append(bookCover);
        bookCover.onerror = () => {
            bookCover.style.opacity = "0";
        };
    } else {
    }
    titleEl.innerText = name;
    bookIEl.append(cover, titleEl);
    return bookIEl;
}

async function showLocalBooks() {
    let bookList: book[] = [];
    await bookshelfStore.iterate((book: book) => {
        bookList.push(book);
    });
    bookList = bookList.toSorted((a, b) => b.visitTime - a.visitTime);

    localBookEl.innerHTML = "";
    let grid: HTMLElement;

    const l = selectBook(bookList, async (list) => {
        grid?.remove();
        grid = await showLocalBooksL(list);
        grid.insertAdjacentElement("afterbegin", addBookEl);
        l.after(grid);
    });

    localBookEl.append(l);
}

async function showLocalBooksL(bookList: book[]) {
    const grid = el("div", { class: "books" });
    for (const book of bookList) {
        let bookIEl: HTMLDivElement;
        if (book.cover) {
            const c = (await coverCache.getItem(book.id)) as Blob;
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
            bookIEl = bookEl(book.name, null, book.shortName);
        }
        grid.append(bookIEl);
        const id = book.id;
        bookIEl.onclick = async () => {
            const book = await getBooksById(id);
            showBook(book);
            book.visitTime = new Date().getTime();
            bookshelfStore.setItem(book.id, book);
            booksEl.close();
        };
        bookIEl.oncontextmenu = async (e) => {
            e.preventDefault();
            const book = await getBooksById(id);
            const formEl = el("form", [
                el("input", { name: "name", value: book.name }),
                el("input", { name: "language", value: book.language }),
                el("label", [
                    "词书",
                    el("input", { type: "radio", name: "type", value: "word", checked: book.type === "word" }),
                ]),
                el("label", [
                    "书",
                    el("input", { type: "radio", name: "type", value: "text", checked: book.type === "text" }),
                ]),
            ]);
            const submitEl = el("button", "确定");
            const deleteEl = el("button", "删除");
            const metaEl = el("dialog", [el("div", `id: ${book.id}`), formEl, submitEl, deleteEl]) as HTMLDialogElement;
            submitEl.onclick = () => {
                const data = new FormData(formEl);
                data.forEach((v, k) => {
                    book[k] = v;
                });
                bookshelfStore.setItem(book.id, book);
                metaEl.close();
                setBookS();
            };
            deleteEl.onclick = async () => {
                if (await checkEmptyBook(book)) {
                    await bookshelfStore.removeItem(book.id);
                    for (const sid of book.sections) {
                        await sectionsStore.removeItem(sid);
                    }
                    putToast(el("span", `删除${book.name}成功`));
                } else {
                    putToast(el("span", `删除${book.name}失败，已经标记了单词`));
                }
                metaEl.close();
                showLocalBooks();
            };
            dialogX(metaEl);
        };
    }
    return grid;
}
async function showBook(book: book, sid?: string) {
    if (book.language !== studyLan) {
        if (!(await confirm(`书籍语言${book.language}与学习语言${studyLan}不符，是否继续显示书籍？`))) return;
    }
    nowBook.book = book.id;
    nowBook.sections = sid || book.sections[book.lastPosi];
    isWordBook = book.type === "word";
    // 这些await都是存储io，数量不大，可以不用promise.all
    await showBookSections(book);
    await showBookContent(book, sid || book.sections[book.lastPosi]);
    await setBookS();
}
async function showBookSections(book: book) {
    addSectionEL.style.display = book.canEdit ? "" : "none";

    const sections = structuredClone(book.sections);
    bookSectionsEl.innerHTML = "";
    bookSectionsEl.lang = studyLan;
    const sectionsX: section[] = [];
    for (const i of sections) {
        sectionsX.push(await getSection(i));
    }
    vlist(bookSectionsEl, sections, { iHeight: 24, paddingTop: 16, paddingLeft: 16 }, (i) => {
        const sEl = el("div");
        const s = sectionsX[i];
        sEl.innerText = sEl.title = getSectionTitle(book, sections[i], s.title) || `章节${Number(i) + 1}`;
        if (nowBook.sections === sections[i]) sEl.classList.add(SELECTEDITEM);
        if (Object.values(s.words).some((i) => !i.visit)) sEl.classList.add(TODOMARK);
        if (book.type === "text" && Object.values(s.words).length === 0) sEl.classList.add(UNREAD);
        sEl.onclick = async () => {
            sEl.classList.remove(TODOMARK);

            bookSectionsEl.querySelector(`.${SELECTEDITEM}`).classList.remove(SELECTEDITEM);
            sEl.classList.add(SELECTEDITEM);

            nowBook.sections = sections[i];
            showBookContent(book, sections[i]);
            setBookS();
            if (nowBook.book === "0") return;
            book.lastPosi = Number(i);
            bookshelfStore.setItem(nowBook.book, book);
        };
        sEl.oncontextmenu = async (e) => {
            e.preventDefault();
            e.stopPropagation();
            menuEl.innerHTML = "";
            if ((await getBooksById(nowBook.book)).canEdit) {
                menuEl.append(
                    el("div", "重命名", {
                        onclick: async () => {
                            const t = await setSectionTitle(sections[i]);
                            if (t) sEl.innerText = t;
                        },
                    }),
                );
            }
            menuEl.append(
                el("div", "复制id", {
                    onclick: async () => {
                        navigator.clipboard.writeText(sections[i]);
                    },
                }),
            );
            showMenu(e.clientX, e.clientY);
        };
        return sEl;
    });
}

let contentP: string[] = [];

import Fuse from "fuse.js";

async function showBookContent(book: book, id: string) {
    const s = await getSection(id);
    if (id === wordSection) {
        const l: string[] = [];
        await wordsStore.iterate((v: record) => {
            l.push(v.word);
        });
        const text = l.join("\n");
        s.text = text;
    }
    bookContentContainerEl.innerHTML = "";
    bookContentEl = el("div");
    bookContentContainerEl.append(bookContentEl);

    editText = s.text;

    contentScrollPosi = s.lastPosi;

    if (!isWordBook)
        bookContentEl.append(
            el("div", iconEl(recume_svg), {
                onclick: async () => {
                    autoPlay = true;
                    autoPlayTTSEl.checked = true;
                    await pTTS(0);
                    if ((await getTtsEngine()) === "ms")
                        for (let i = 1; i < contentP.length; i++) {
                            await getTTS(contentP[i]);
                        }
                },
            }),
        );

    contentP = [];

    if (isWordBook) await showWordBook(book, s);
    else await showNormalBook(book, s);

    setScrollPosi(bookContentContainerEl, contentScrollPosi);

    if (!isWordBook) bookContentEl.append(dicEl);
}

async function showWordBook(book: book, s: section) {
    const rawWordList: { text: string; c: record; id: string; type?: "ignore" | "learn"; means?: number }[] = [];
    let wordList: typeof rawWordList = [];
    const l = s.text.trim().split("\n");
    const cards: Map<string, Card> = new Map();
    await cardsStore.iterate((v: Card, k) => {
        cards.set(k, v);
    });
    const words: Map<string, record> = new Map();
    const mayMapWords: Map<string, record> = new Map();
    const usS = usSpell.flat();
    const wordMap: { [r: string]: string } = {};
    await wordsStore.iterate((v: record, k) => {
        if (l.includes(k)) words.set(k, v);
        if (usS.includes(k)) mayMapWords.set(k, v);
    });
    for (const i of usS) if (l.includes(i) && !words.has(i)) wordMap[i] = "";
    for (const i in wordMap) {
        const list = usSpell.find((w) => w.includes(i));
        wordMap[i] = list.find((w) => mayMapWords.has(w));
    }
    const ignoreWords = await getIgnoreWords();
    let matchWords = 0;
    let means1 = 0;
    const now = new Date();
    for (const i of l) {
        const t = i;
        let c: record;
        let type: "ignore" | "learn" = null;
        let means = 0;
        if (words.has(i) || mayMapWords.has(wordMap[i])) {
            c = words.get(i) || mayMapWords.get(wordMap[i]);
            type = "learn";
            matchWords++;
            let r = 0;
            for (const j of c.means) {
                const x = cards.get(j.card_id);
                r += fsrs.get_retrievability(x, now, false) || 0;
            }
            means = r / c.means.length;
        } else if (ignoreWords.includes(i)) {
            type = "ignore";
            matchWords++;
            means = 1;
        }
        means1 += means;
        if (type) rawWordList.push({ text: t, id: wordMap[i] || t, c: c, type, means });
        else rawWordList.push({ text: t, id: wordMap[i] || t, c: c });
    }
    wordList = sortWordList(rawWordList, (await setting.getItem(WordSortPath)) || "raw");
    const search = el("input", {
        oninput: () => {
            const fuse = new Fuse(wordList, {
                includeMatches: true,
                findAllMatches: true,
                useExtendedSearch: true,
                includeScore: true,
                keys: [
                    "text",
                    "c.note",
                    { name: "t", getFn: (x) => (x.c ? x.c.means.map((i) => i.text).join("\n") : "") },
                ],
            });
            const fr = fuse.search(search.value);
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
        },
    });
    const sortEl = el("div", { class: "sort_words" });
    const sortMap: { type: WordSortType; name: string }[] = [
        { type: "raw", name: "原始" },
        { type: "az", name: "字母正序" },
        { type: "za", name: "字母倒序" },
        { type: "10", name: "熟悉" },
        { type: "01", name: "陌生" },
        { type: "random", name: "随机" },
    ];
    for (const i of sortMap) {
        sortEl.append(
            el("span", i.name, {
                onclick: () => {
                    wordList = sortWordList(rawWordList, i.type);
                    show.show(wordList);
                    setting.setItem(WordSortPath, i.type);
                },
            }),
        );
    }
    const chartEl = el(
        "div",
        el(
            "div",
            `${String(l.length)} ${matchWords} ${means1.toFixed(1)}`,
            el(
                "div",
                { class: LITLEPROGRESS },
                el("div", { style: { width: `${(matchWords / l.length) * 100}%`, background: "#00f" } }),
                el("div", { style: { width: `${(means1 / l.length) * 100}%`, background: "#0f0" } }),
            ),
        ),
        el("div", "拼写 加载中", el("div", { class: LITLEPROGRESS })),
        {
            onclick: () => {
                showWordBookMore(wordList);
            },
        },
    );
    bookContentContainerEl.append(
        view().class("words_book_top").add([chartEl, search, sortEl]).attr({ lang: navigator.language }).el,
    );

    requestIdleCallback(async () => {
        let spell = 0;
        const nl = structuredClone(l);
        await spellStore.iterate((v: Card, k: string) => {
            if (nl.includes(k)) {
                spell += fsrsSpell.get_retrievability(v, now, false) || 0;
                nl[nl.indexOf(k)] = null;
            }
        });
        for (const i of nl) if (i && ignoreWords.includes(i)) spell += 1;
        chartEl.lastElementChild.remove();
        chartEl.append(
            el(
                "div",
                `拼写 ${spell.toFixed(1)}`,
                el(
                    "div",
                    { class: LITLEPROGRESS },
                    el("div", { style: { width: `${(spell / l.length) * 100}%`, background: "#00f" } }),
                ),
            ),
        );
    });

    const show = vlist(
        bookContentContainerEl,
        wordList,
        { iHeight: 24, gap: 8, paddingTop: 120, paddingBotton: 8 },
        (i, item) => {
            const p = el("p", item.text);
            if (item.type) {
                p.classList.add(item.type);
            }
            p.oncontextmenu = (e) => {
                e.preventDefault();
                menuEl.innerHTML = "";
                showMenu(e.clientX, e.clientY);
                if (item.type === "ignore")
                    menuEl.append(
                        el("div", "从忽略词表移除", {
                            onclick: async () => {
                                await removeIgnore(item.id);
                                p.classList.remove("ignore");
                                const item1 = rawWordList.find((i) => i.text === item.text);
                                const item2 = wordList.find((i) => i.text === item.text);
                                item.type = undefined;
                                item1.type = undefined;
                                item2.type = undefined;
                            },
                        }),
                    );
                else
                    menuEl.append(
                        el("div", "添加到忽略词表", {
                            onclick: async () => {
                                await addIgnore(item.text);
                                p.classList.add("ignore");
                                const item1 = rawWordList.find((i) => i.text === item.text);
                                const item2 = wordList.find((i) => i.text === item.text);
                                item.type = item1.type = item2.type = "ignore";
                                item.means = item1.means = item2.means = 1;
                            },
                        }),
                    );
            };
            p.onclick = () => {
                const p = tmpDicEl;
                p.showPopover();
                play(item.text);
                async function show() {
                    p.innerHTML = "";
                    p.append(el("div", item.text));
                    const books = await wordBooksByWord(item.text);
                    const booksEl = el("div");
                    for (const i of books) {
                        const bookN = (await getBooksById(i.book)).name;
                        const s = (await getSection(i.section)).title;
                        booksEl.append(el("span", s, { title: bookN }));
                    }
                    p.append(booksEl);
                    if (item.c?.note) {
                        const note = el("p");
                        note.innerText = item.c.note;
                        p.append(
                            el(
                                "div",
                                el("button", iconEl(pen_svg), {
                                    onclick: () => {
                                        addP(item.c.note, item.id, null, null, null, (text) => {
                                            item.c.note = text.trim();
                                            wordsStore.setItem(item.id, item.c);
                                            show();
                                        });
                                    },
                                }),
                                note,
                            ),
                        );
                    }
                    const onlineList = await onlineDicL(item.text);
                    p.append(onlineList);
                    if (item.c)
                        for (const i of item.c.means) {
                            const pel = el(
                                "div",
                                el("button", iconEl(pen_svg), {
                                    onclick: () => {
                                        addP(i.text, item.id, null, null, null, (text) => {
                                            i.text = text.trim();
                                            wordsStore.setItem(item.id, item.c);
                                            show();
                                        });
                                    },
                                }),
                                el("div", await disCard2(i)),
                            );
                            p.append(pel);
                            const reviewEl = el("div");
                            pel.append(reviewEl);
                            const card = (await cardsStore.getItem(i.card_id)) as Card;
                            const map: { [k in State]: string } = {
                                "0": "新",
                                "1": "学习中",
                                "2": "复习",
                                "3": "重新学习",
                            };
                            const stateEl = el("span", map[card.state]);
                            reviewEl.append(stateEl);
                            if (card.due.getTime() < time()) stateEl.classList.add(TODOMARK);
                            let hasClick = false;
                            const buttons = getReviewCardButtons(
                                i.card_id,
                                card,
                                i.text + i.contexts.map((x) => x.text).join(""),
                                () => {
                                    if (hasClick) {
                                        buttons.buttons.remove();
                                        stateEl.classList.remove(TODOMARK);
                                    } else {
                                        hasClick = true;
                                    }
                                },
                            );
                            reviewEl.append(buttons.buttons);
                        }
                }
                show();
            };
            return p;
        },
    );

    bookContentContainerEl.lang = book.language;
}

const WordSortPath = "words.sort";

type WordSortType = "raw" | "az" | "za" | "10" | "01" | "random";

function sortWordList(
    list: { text: string; id: string; c: record; type?: "ignore" | "learn"; means?: number }[],
    type: WordSortType,
) {
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
            l: learnt.toSorted((a, b) => a.means - b.means),
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
    return randomList(list);
}

function randomList<i>(list: i[]) {
    let rn = list.length;
    while (rn) {
        const r = Math.floor(Math.random() * rn--);
        const a = structuredClone(list[rn]);
        list[rn] = list[r];
        list[r] = a;
    }
    return list;
}

async function showWordBookMore(wordList: { text: string; c: record; type?: "ignore" | "learn"; means?: number }[]) {
    const d = el("dialog") as HTMLDialogElement;
    dialogX(d);
    const unlearnL = wordList.filter((w) => w.means === undefined);
    d.append(
        el(
            "div",
            { style: { display: "flex", "flex-direction": "row-reverse" } },
            el("button", iconEl(close_svg), { onclick: () => d.close() }),
        ),
        el(
            "div",
            el("p", "导出未学习的单词"),
            el("button", "导出", {
                onclick: () => {
                    download(unlearnL.map((i) => i.text).join("\n"), "words.txt");
                },
            }),
            el("button", "复制", {
                onclick: () => {
                    navigator.clipboard.writeText(unlearnL.map((i) => i.text).join("\n"));
                },
            }),
        ),
    );
    const bookIds: { [id: string]: number } = {};

    const wordFamilyMap: Map<string, boolean> = new Map();

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
        const rootWord = lemmatizer(w.text);
        if (wordFamilyMap.get(rootWord) !== true) wordFamilyMap.set(rootWord, Boolean(w.type));
    }
    const l = Object.entries(bookIds).sort((a, b) => b[1] - a[1]);
    const ignore = wordList.filter((w) => w.type === "ignore").length;
    const max = Math.max(l[0][1], ignore);
    const pEl = el("div", { class: "words_from" });
    for (const i of l) {
        pEl.append(
            el("span", (await getBooksById(i[0])).name),
            el("span", i[1]),
            el("div", { style: { width: `${(i[1] / max) * 100}%` } }),
        );
    }
    pEl.append(el("span", "忽略"), el("span", ignore), el("div", { style: { width: `${(ignore / max) * 100}%` } }));
    d.append(el("p", "单词来源"), pEl);
    const familyList = Array.from(wordFamilyMap.values());
    d.append(
        el("p", "部分词族"), // todo 需要真正的word family
        txt(`${familyList.length} ${familyList.filter((i) => i).length}`).el,
        view()
            .class(LITLEPROGRESS)
            .add([
                view().style({
                    width: `${(familyList.filter((i) => i).length / familyList.length) * 100}%`,
                    background: "#00f",
                }),
            ]).el,
    );
    d.append(
        el("p", "添加忽略词到拼写"),
        el("button", iconEl(add_svg), {
            onclick: () => {
                ignoredWordSpell(
                    wordList
                        .filter((w) => w.type === "ignore")
                        .map((w) => w.text)
                        .filter((w) => !w.includes(" ")),
                );
            },
        }),
    );
}

async function ignoredWordSpell(list: string[]) {
    const keys = await spellStore.keys();
    const flist = list.filter((w) => !keys.includes(w));
    if (flist.length === 0) {
        putToast(el("span", "无新添加词"));
        return;
    }
    const iel = el("textarea", { value: flist.sort().join("\n"), style: { height: "200px" } });
    const p = (await interModal("确定添加以下单词到拼写吗？", iel, true)) as string;
    if (!p) return;
    const rlist = randomList(p.split("\n"));
    const now = time() - timeD.d(5);
    for (const word of rlist) {
        const card = createEmptyCard(now);
        const sCards = fsrsSpell.repeat(card, now)[Rating.Easy].card;
        await spellStore.setItem(word, sCards);
    }
    putToast(el("span", "已添加"));
}

async function textTransformer(text: string) {
    if (await setting.getItem(readerSettingPath.apostrophe)) {
        return text.replace(/’(\w)/g, "'$1");
    }
    return text;
}

let wordFreq: { [word: string]: number } = {};
let properN: string[] = [];

async function showNormalBook(book: book, s: section) {
    const segmenter = new Segmenter(book.language, { granularity: book.wordSplit || "word" });
    const osL = Array.from(new Segmenter(book.language, { granularity: "sentence" }).segment(s.text));
    const sL: Intl.SegmentData[] = [];
    const sx = ["Mr.", "Mrs.", "Ms.", "Miss.", "Dr.", "Prof.", "Capt.", "Lt.", "Sgt.", "Rev.", "Sr.", "Jr.", "St."].map(
        (i) => `${i} `,
    );
    const sxS = sx.map((i) => ` ${i}`);
    for (let i = 0; i < osL.length; i++) {
        const seg = osL[i].segment;
        if (seg.endsWith(" ") && (sx.includes(seg) || sxS.some((i) => seg.endsWith(i)))) {
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
        plist.at(-1).push(sen); // last p add sen
        const wL = Array.from(segmenter.segment(sentence.segment));
        for (const word of wL) {
            if (word.segment === "#" && sen?.at(-1)?.text === "#") {
                sen.at(-1).text += "#";
                sen.at(-1).end += 1;
            } else {
                const s = sentence.index + word.index;
                if (!/\n+/.test(word.segment))
                    sen.push({
                        text: word.segment,
                        start: s,
                        end: s + word.segment.length,
                        isWord: word.isWordLike,
                    });
            }
        }
        if (sentence.segment.at(-1) === "\n") {
            plist.push([]);
        }
    }

    console.log(plist);

    bookContentEl.append(
        el("h1", s.title, {
            onclick: async () => {
                if ((await getBooksById(nowBook.book)).canEdit) setSectionTitle(nowBook.sections);
            },
        }),
    );

    wordFreq = {};
    const highFreq: string[] = [];
    properN = [];

    for (const paragraph of plist) {
        if (paragraph.length === 0) continue;
        let pel: HTMLElement = document.createElement("p");
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
        if (t) pel = document.createElement(`h${t}`);

        if (paragraph.length === 1 && paragraph[0].length >= 3 && paragraph[0].every((i) => i.text === "-")) {
            pel = el("hr");
            bookContentEl.append(pel);
            continue;
        }

        for (const si in paragraph) {
            const sen = paragraph[si];
            const senEl = el("span");
            for (const i in sen) {
                const word = sen[i];
                if (si === "0" && Number(i) < t) continue;
                const span = document.createElement("span");
                span.innerText = await textTransformer(word.text);
                for (const i in s.words) {
                    const index = s.words[i].index;
                    if (index[0] <= word.start && word.end <= index[1] && s.words[i].type === "word") {
                        span.classList.add(MARKWORD);
                    }
                }
                span.setAttribute("data-s", String(word.start));
                span.setAttribute("data-e", String(word.end));
                span.setAttribute("data-w", String(word.isWord));
                span.setAttribute("data-t", word.text);
                senEl.append(span);

                const src = lemmatizer(word.text.toLocaleLowerCase());
                if (wordFreq[src]) wordFreq[src]++;
                else wordFreq[src] = 1;

                if (!t && i !== "0" && word.text.match(/^[A-Z]/)) properN.push(word.text);
            }
            senEl.onclick = async (ev) => {
                const span = ev.target as HTMLSpanElement;
                if (span.tagName !== "SPAN") return;
                if (span.getAttribute("data-w") === "false") return;

                const s = sen[0].start;
                const e = sen.at(-1).end;

                const id = await saveCard({
                    key: span.getAttribute("data-t"),
                    index: { start: Number(span.getAttribute("data-s")), end: Number(span.getAttribute("data-e")) },
                    cindex: { start: s, end: e },
                });
                if (
                    span.classList.contains(MARKWORD) ||
                    highFreq.includes(lemmatizer(span.innerText.toLocaleLowerCase())) ||
                    dicEl.classList.contains(DICSHOW)
                ) {
                    showDic(id);
                }

                span.classList.add(MARKWORD);
            };

            senEl.oncontextmenu = async (ev) => {
                ev.preventDefault();
                const span = ev.target as HTMLSpanElement;
                if (span.tagName !== "SPAN") return;
                const start = Number(span.getAttribute("data-s"));
                const end = Number(span.getAttribute("data-e"));
                const text = await changeEdit(true);
                text.selectionStart = start;
                text.selectionEnd = end;
                text.focus();
            };
            pel.append(senEl);
        }

        const moreEl = el("div", { class: "p_more" });

        const pText = editText.slice(paragraph[0]?.[0]?.start ?? null, paragraph.at(-1)?.at(-1)?.end ?? null);
        if (pText) {
            const i = contentP.length;
            const playEl = el("div", iconEl(recume_svg), {
                "data-play": "",
                onclick: () => {
                    pTTS(i);
                },
            });
            moreEl.append(playEl);
            moreEl.append(
                el("div", iconEl(more_svg), {
                    "data-play-l": "",
                    onclick: () => {
                        showLisent(contentP.at(i));
                    },
                }),
            );
        }
        contentP.push(pText);

        moreEl.append(
            el("div", iconEl(translate_svg), {
                onclick: () => {
                    translateContext(pel);
                },
            }),
        );

        moreEl.append(
            view()
                .add(iconEl(exTrans_svg))
                .on("click", () => {
                    exTrans(pel, 0, book);
                }).el,
        );

        pel.append(moreEl);

        bookContentEl.append(pel);
    }

    for (const i in wordFreq) {
        if (wordFreq[i] >= 3) highFreq.push(i);
    }

    bookContentContainerEl.lang = book.language;
}

let contentScrollPosi = 0;
function setScrollPosi(el: HTMLElement, posi: number) {
    el.scrollTop = posi * (el.scrollHeight - el.offsetHeight);
}
function getScrollPosi(el: HTMLElement) {
    const n = el.scrollTop / (el.scrollHeight - el.offsetHeight);
    return n;
}

async function showLisent(text: string) {
    const al = /[.?!。？！]/g;
    const ali = /[.?!。？！,，]/g;
    let l = sp(ali);
    console.log(l);
    const d = el("dialog", { class: "play_list" }) as HTMLDialogElement;
    const playsEl = el("div");
    const textEl = el("textarea", { value: l.join("\n") });
    playEl();
    d.append(el("div", [playsEl, textEl]));
    textEl.oninput = playEl;
    function playEl() {
        const l = textEl.value.split("\n");
        playsEl.innerHTML = "";
        for (const s of l) {
            const pEl = el("button", iconEl(recume_svg));
            pEl.onclick = () => {
                runTTS(s);
            };
            playsEl.append(pEl);
        }
    }
    function sp(regxp: RegExp) {
        return text
            .split(regxp)
            .filter((i) => i)
            .map((i) => i.trim());
    }
    d.append(
        el("div", [
            el("button", "按句", {
                onclick: () => {
                    l = sp(al);
                    textEl.value = l.join("\n");
                    playEl();
                },
            }),
            el("button", "按小句", {
                onclick: () => {
                    l = sp(ali);
                    textEl.value = l.join("\n");
                    playEl();
                },
            }),
            el("button", iconEl(close_svg), {
                onclick: () => {
                    d.close();
                },
            }),
        ]),
    );
    dialogX(d);
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
    const stopEl = el("button", iconEl(close_svg));
    stopEl.onclick = () => {
        ff.stop.abort();
        pel.remove();
    };
    const pel = el("div", [el("p", "AI正在翻译段落"), stopEl]);
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

async function exTrans(pEl: HTMLElement, i: number, book: book) {
    const span = pEl.children[i] as HTMLSpanElement;

    const f = frame("exTrans", {
        _: view().style({
            position: "absolute",
            top: `${span.offsetTop - (pEl.children[0].getBoundingClientRect().y - pEl.getBoundingClientRect().y)}px`,
            width: "100%",
        }),
        text: textarea("i")
            .style({
                width: "100%",
                resize: "vertical",
                "font-size": "inherit",
                "line-height": "inherit",
                "font-family": "inherit",
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
            last: button().add(iconEl(left_svg)),
            next: button().add(iconEl(right_svg)),
            diff: button().add(iconEl(eye_svg)),
            ai: button().add(iconEl(ai_svg)),
            close: button().add(iconEl(close_svg)),
            sum: txt("")
                .bindSet((v: number, el) => {
                    el.innerText = `${(v * 100).toFixed(1)}%`;
                })
                .style({ padding: "4px" }),
            tips: view("x").style({ gap: "4px", "padding-right": "4px" }),
        },
    });

    pEl.append(f.el.el);

    span.classList.add("exTransHide");

    f.els.text.on("input", () => {
        let n = 0;
        const diff = dmp.diff_main(f.els.text.el.value, text);
        for (const i of diff) {
            if (i[0] === 0) {
                n += i[1].length;
            }
        }
        f.els.sum.sv(n / text.length);
    });

    function rm() {
        f.el.el.remove();
        span.className = "";
    }

    f.els.close.on("click", () => {
        rm();
    });

    f.els.last.on("click", () => {
        if (i === 0) {
        } else {
            rm();
            exTrans(pEl, i - 1, book);
        }
    });
    f.els.next.on("click", () => {
        if (i === pEl.querySelectorAll(":scope>span").length - 1) {
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

            const diff = dmp.diff_main(f.els.text.el.value, text);
            for (const i of diff) {
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
        const x = `这是我默写的一个句子：\n${f.els.text.el.value}\n这是句子的原文\n${text}\n告诉我的默写存在哪些语法错误，指出其类型，不需要指出其具体单词，不需要解释，没有则忽略。暗示我：我的默写表达的意思相对于原文是否完整，是否有歧义，哪些意思的表达和哪些词语、词组、结构需要增删改才变成原文（不需要指出原文，不需要给出修改），我将根据你的暗示，猜测需要具体的修改`;
        const t = await ai([{ role: "user", content: x }]).text;
        const el = view().add([
            p(t),
            button()
                .add(iconEl(close_svg))
                .on("click", () => el.remove()),
        ]).el;
        putToast(el, 0);
    });

    const text = span.innerText;
    const segmenter = Array.from(new Segmenter(book.language, { granularity: book.wordSplit || "word" }).segment(text));
    const spellWord = await getIgnoreWords();
    const now = time();
    await spellStore.iterate((v: Card, k: string) => {
        if (v.due.getTime() > now) {
            spellWord.push(k);
        }
    });
    const tipWord: string[] = [];
    for (const i of segmenter) {
        if (!i.isWordLike) continue;
        if (i.segment[0].match(/[A-Z]/)) {
            tipWord.push(i.segment);
        } else if (!spellWord.includes(lemmatizer(i.segment))) {
            tipWord.push(i.segment);
        }
    }
    const tipEl = tipWord.map((i) =>
        txt(i).on("click", () => {
            const t = f.els.text.el;
            t.setRangeText(i);
            t.selectionStart = t.selectionEnd = f.els.text.el.value.length;
            t.focus();
        }),
    );
    f.els.tips.add(tipEl);
}

const bookStyleList = {
    fontSize: [],
    lineHeight: [],
    contentWidth: [],
};

const defaultBookStyle = {
    fontSize: 2,
    lineHeight: 2,
    contentWidth: 2,
    fontFamily: "serif",
    theme: "auto",
    paper: true,
};

const bookStyle = ((await setting.getItem("style.default")) as typeof defaultBookStyle) || defaultBookStyle;

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

changeStyleEl.onclick = () => {
    changeStyleBar.togglePopover();
};

const fontListEl = el("div", {
    popover: "auto",
    class: "font_list",
});
document.body.appendChild(fontListEl);

{
    const fontEl = el("div", "serif");
    setFontElF(bookStyle.fontFamily);
    fontEl.onclick = async () => {
        fontListEl.showPopover();
        let availableFonts = [];
        try {
            // @ts-ignore
            availableFonts = await window.queryLocalFonts();
        } catch (error) {}
        let fonts = availableFonts.map((i) => i.fullName) as string[];
        fonts = fonts.concat(availableFonts.map((i) => i.family));
        fonts = Array.from(new Set(fonts));
        fonts = fonts.filter((i) => i !== "sans" && i !== "serif").toSorted();
        fonts.unshift("serif", "sans");
        vlist(fontListEl, fonts, { iHeight: 24, paddingLeft: 4, paddingRight: 4 }, (i) => {
            const fontName = fonts[i];
            return el("div", fontName, {
                style: { "font-family": fontName, "line-height": "24px" },
                onclick: () => {
                    setFontElF(fontName);
                    bookStyle.fontFamily = fontName;
                    setBookStyle();
                },
            });
        });
    };
    function setFontElF(name: string) {
        fontEl.innerText = name;
        fontEl.style.fontFamily = name;
    }
    const fontSize = createRangeSetEl(
        bookStyle.fontSize,
        bookStyleList.fontSize.length - 1,
        (i) => {
            bookStyle.fontSize = i;
            setBookStyle();
        },
        font_small_svg,
        font_large_svg,
    );
    const lineHeight = createRangeSetEl(
        bookStyle.lineHeight,
        bookStyleList.lineHeight.length - 1,
        (i) => {
            bookStyle.lineHeight = i;
            setBookStyle();
        },
        line_height_small_svg,
        line_height_large_svg,
    );
    const contentWidth = createRangeSetEl(
        bookStyle.contentWidth,
        bookStyleList.contentWidth.length - 1,
        (i) => {
            bookStyle.contentWidth = i;
            setBookStyle();
        },
        content_width_small_svg,
        content_width_large_svg,
    );
    const themeSelect = el("div", { class: "theme_select" }, [
        themeI("auto", "自动", "#fff", "#000"),
        themeI("light", "亮色", "#fff", "#000"),
        themeI("classical", "古典", "#eceae6", "#000"),
        themeI("dark", "暗色", "#000", "#cacaca"),
    ]);
    function themeI(value: string, name: string, bg: string, color: string) {
        return el(
            "label",
            {
                style: {
                    background: bg,
                    color,
                },
            },
            [
                el("input", {
                    type: "radio",
                    name: "theme",
                    value: value,
                }),
                name,
            ],
        );
    }
    (themeSelect.querySelector(`input[value='${bookStyle.theme}']`) as HTMLInputElement).checked = true;
    for (const el of themeSelect.querySelectorAll("input")) {
        el.addEventListener("change", (e) => {
            bookStyle.theme = (e.target as HTMLInputElement).value;
            setBookStyle();
        });
    }
    const paperI = el("input", {
        type: "checkbox",
        onchange: () => {
            bookStyle.paper = paperI.checked;
            setBookStyle();
        },
    });
    paperI.checked = bookStyle.paper as boolean;
    const paperEl = el("label", [paperI, "纸质背景"]);
    changeStyleBar.append(fontEl, fontSize, lineHeight, contentWidth, themeSelect, paperEl);
}

setBookStyle();

function setBookStyle() {
    document.documentElement.setAttribute("data-theme", bookStyle.theme);
    document.documentElement.style.setProperty("--font-family", `${bookStyle.fontFamily}`);
    document.documentElement.style.setProperty("--font-size", `${bookStyleList.fontSize[bookStyle.fontSize]}px`);
    bookContentContainerEl.style.setProperty("--line-height", `${bookStyleList.lineHeight[bookStyle.lineHeight]}em`);
    bookContentContainerEl.style.setProperty(
        "--content-width",
        `${bookStyleList.contentWidth[bookStyle.contentWidth]}em`,
    );
    bookContentContainerEl.style.background = bookStyle.paper ? "" : "none";
    setting.setItem("style.default", bookStyle);
}

function createRangeSetEl(value: number, maxV: number, f: (i: number) => void, minIcon?: string, maxIcon?: string) {
    const div = el("div");
    const min = el("button");
    if (minIcon) min.append(iconEl(minIcon));
    const max = el("button");
    if (maxIcon) max.append(iconEl(maxIcon));
    const p = el("span");
    let v = value;
    setV();
    min.onclick = () => {
        v--;
        v = Math.max(v, 0);
        setV();
        f(v);
    };
    max.onclick = () => {
        v++;
        v = Math.min(v, maxV);
        setV();
        f(v);
    };
    function setV() {
        p.innerText = String(v + 1);
    }
    div.append(min, p, max);
    return div;
}

let isEdit = false;
let editText = "";

async function changeEdit(b: boolean) {
    isEdit = b;
    if (isEdit) {
        changeEditEl.innerHTML = icon(ok_svg);
        return setEdit();
    }
    const newC = el("div");
    bookContentContainerEl.innerHTML = "";
    bookContentContainerEl.append(newC);
    bookContentEl = newC;
    if (nowBook.book) {
        const book = await getBooksById(nowBook.book);
        const sectionId = nowBook.sections;
        let section = await getSection(sectionId);
        book.updateTime = new Date().getTime();
        section.lastPosi = contentScrollPosi;
        if (editText && sectionId !== wordSection) {
            if (book.type === "word") editText = cleanWordBook(editText);
            section = changePosi(section, editText);
            section.text = editText;
            await sectionsStore.setItem(sectionId, section);
            if (nowBook.book !== "0") await bookshelfStore.setItem(nowBook.book, book);
        }
        showBookContent(book, sectionId);
    }
    changeEditEl.innerHTML = icon(pen_svg);
}
changeEditEl.onclick = () => {
    isEdit = !isEdit;
    changeEdit(isEdit);
};

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
    if (diff.at(-1)[0] === 1) diff.push([0, ""]);
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

function changePosi(section: section, text: string) {
    const { source, map } = diffPosi(section.text, text);
    for (const w in section.words) {
        section.words[w].index = patchPosi(source, map, section.words[w].index);
        section.words[w].cIndex = patchPosi(source, map, section.words[w].cIndex);
    }
    return section;
}

function patchPosi(source: number[], map: number[], index: [number, number]) {
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
    return [Start, End] as [number, number];
}

import diff_match_patch, { type Diff } from "diff-match-patch";
const dmp = new diff_match_patch();

changeEdit(false);

async function setEdit() {
    const book = await getBooksById(nowBook.book);
    const sectionId = nowBook.sections;
    const section = await getSection(sectionId);
    bookContentContainerEl.innerHTML = "";
    const text = el("textarea");
    text.disabled = !book.canEdit;
    bookContentContainerEl.append(text);
    bookContentEl = text;
    text.value = section.text;
    setScrollPosi(text, contentScrollPosi);
    setScrollPosi(bookContentContainerEl, 0);
    // biome-ignore lint:add getText
    window["getText"] = () => text.value;
    // biome-ignore lint:^
    window["setText"] = (str: string) => (text.value = editText = str);
    text.oninput = () => {
        editText = text.value;
    };
    text.onkeyup = async (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            const l = text.value.split("\n");
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
                    aiRange.at(-1).e = index;
                }
                index += i.length + 1;
            }
            const range = aiRange.find((r) => r.s <= text.selectionStart && text.selectionEnd <= r.e);
            if (!range) return;
            const aiM = textAi(text.value.slice(range.s, range.e));
            aiM.unshift({ role: "system", content: `This is a passage: ${text.value.slice(0, aiRange[0].s)}` });
            console.log(aiM);
            const start = text.selectionStart;
            const end = text.selectionEnd;
            const aitext = await ai(aiM, "对话").text;
            const addText = `ai:\n${aitext}`;
            const changeText = text.value.slice(0, start) + addText + text.value.slice(end);
            text.value = changeText;
            editText = changeText;
            text.selectionStart = start;
            text.selectionEnd = start + addText.length;
        }
    };
    const upel = document.createElement("input");
    upel.type = "file";
    upel.onchange = () => {
        const file = upel.files[0];
        if (file) {
            let fileType: "text" | "docx";
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
                text.value = t;
                editText = t;
            };
        }
    };
    bookContentContainerEl.append(upel);

    text.onscroll = () => {
        contentScrollPosi = getScrollPosi(text);
    };

    return text;
}

function textAi(text: string) {
    const l = text.split("\n");
    let index = 0;
    const ignoreMark = "//";
    const userMark = ">";
    const aiMark = "ai:";
    const aiM: aim = [];
    for (const i of l) {
        if (i.startsWith(aiMark)) {
            aiM.push({ role: "assistant", content: i.replace(aiMark, "").trim() });
        } else if (i.startsWith(userMark)) {
            aiM.push({ role: "user", content: i.replace(userMark, "").trim() });
        } else if (i.startsWith(ignoreMark)) {
            index += i.length + 1;
            continue;
        } else {
            if (aiM.length) aiM.at(-1).content += `\n${i}`;
        }
        index += i.length + 1;
    }
    if (aiM.length === 0) return [];
    if (aiM.at(-1).role !== "user") return [];
    return aiM;
}

let canRecordScroll = true;

bookContentContainerEl.onscroll = async () => {
    if (!canRecordScroll) return;
    const n = getScrollPosi(bookContentContainerEl);
    contentScrollPosi = n;
    const sectionId = nowBook.sections;
    const section = await getSection(sectionId);
    section.lastPosi = n;
    sectionsStore.setItem(sectionId, section);
};

const SHOWMARKLIST = "show_mark_word_list";
bookdicEl.onclick = async () => {
    markListBarEl.classList.toggle(SHOWMARKLIST);
    if (markListBarEl.classList.contains(SHOWMARKLIST)) {
        showMarkList();
    }
};

async function sectionSelectEl(radio?: boolean) {
    const bookSectionsSelectEl = el("div", { popover: "auto" });
    document.body.append(bookSectionsSelectEl);
    sectionSelect(bookSectionsSelectEl, radio);
    return {
        el: el("button", "选择词书", {
            onclick: () => {
                bookSectionsSelectEl.showPopover();
            },
        }),
        values: () => getSelectBooks(bookSectionsSelectEl),
    };
}

async function sectionSelect(menuEl: HTMLElement, radio?: boolean) {
    let bookList: book[] = [];
    await bookshelfStore.iterate((book: book) => {
        bookList.push(book);
    });
    bookList = bookList.filter((b) => b.type === "word");
    menuEl.innerHTML = "";
    for (const i of bookList) {
        const book = el("div", i.name);
        if (!radio) {
            book.append(
                el("input", {
                    type: "checkbox",
                    value: "",
                    onclick: (e) => {
                        const i = e.target as HTMLInputElement;
                        for (const x of book.querySelectorAll("input").values()) x.checked = i.checked;
                    },
                }),
            );
        }
        for (const s of i.sections) {
            const section = await getSection(s);
            book.append(
                el("label", [
                    el("input", { type: radio ? "radio" : "checkbox", value: s, name: "books" }),
                    section.title,
                ]),
            );
        }
        menuEl.append(book);
    }
    return menuEl;
}

function getSelectBooks(el: HTMLElement) {
    return Array.from(el.querySelectorAll("input:checked"))
        .map((i: HTMLInputElement) => i.value)
        .filter((v) => v);
}

async function wordBooksByWord(word: string) {
    const l: { book: string; section: string }[] = [];
    let bookList: book[] = [];
    await bookshelfStore.iterate((book: book) => {
        bookList.push(book);
    });
    bookList = bookList.filter((b) => b.type === "word");
    for (const i of bookList) {
        for (const s of i.sections) {
            const section = await getSection(s);
            const wl = section.text.split("\n");
            if (wl.includes(word)) {
                l.push({ book: i.id, section: s });
            }
        }
    }
    return l;
}

const ipaStore = localforage.createInstance({ name: "langPack", storeName: "ipa" });
const variantStore = localforage.createInstance({ name: "langPack", storeName: "variant" });
const wordMapStore = localforage.createInstance({ name: "langPack", storeName: "map" });

const dics: {
    [key: string]: {
        id: string;
        lang: string;
    };
} = {};
const dicStore = localforage.createInstance({ name: "dic" });
setting.getItem("dics").then(async (l: string[]) => {
    for (const i of l || []) {
        dics[i] = (await dicStore.getItem(i)) as dic2;
    }
});
dicStore.iterate((v: dic2, k) => {
    v.dic = undefined;
    dics[k] = v;
});

type bdic = {
    id: string;
    lang: string;
};
type dic = bdic & {
    dic: {
        [word: string]: {
            text: string;
            isAlias?: boolean;
        };
    };
};
type dic2 = bdic & {
    dic: Map<string, dic["dic"][0]>;
};

let ipa: Map<string, string | string[]>;

const variant: Map<string, string> = await variantStore.getItem("en");

function lemmatizer(word: string) {
    return variant?.get(word) || word;
}

let usSpell: string[][] = (await wordMapStore.getItem("en")) || [];

type record = {
    word: string;
    means: {
        text: string;
        contexts: {
            text: string;
            index: [number, number]; // 语境定位
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

const markListBarEl = document.getElementById("mark_word_list");
const markListEl = el("div");
const autoNewWordEl = el("div", [
    el("button", "自动标记生词", {
        onclick: async () => {
            const words = await getNewWords(editText);
            selectWord(words);
        },
    }),
    el("button", iconEl(clear_svg), {
        onclick: () => {
            selectWord([]);
        },
    }),
    el("button", "自动添加到忽略词表", {
        onclick: () => {
            autoIgnore();
        },
    }),
]);
markListBarEl.append(autoNewWordEl, markListEl);

async function showMarkList() {
    markListEl.innerHTML = "";
    markListEl.lang = studyLan;
    const list = await getAllMarks();
    vlist(markListEl, list, { iHeight: 24, gap: 4, paddingTop: 16 }, (index, i, remove) => {
        const content = i.s.type === "word" ? i.s.id : editText.slice(i.s.index[0], i.s.index[1]);

        const item = el("div", content, { class: i.s.visit ? "" : TODOMARK });
        item.onclick = () => {
            jumpToMark(i.s.cIndex);
            showDic(i.id);
        };
        item.oncontextmenu = (e) => {
            e.preventDefault();
            e.stopPropagation();
            menuEl.innerHTML = "";
            menuEl.append(
                el("div", "删除", {
                    style: { color: "red" },
                    onclick: async () => {
                        const sectionId = nowBook.sections;
                        const section = await getSection(sectionId);
                        if (i.s.type === "sentence") {
                            card2sentence.removeItem(i.s.id);
                        } else {
                            let record = (await wordsStore.getItem(i.s.id)) as record;
                            record = rmWord(record, i.id);
                            await clearWordMean(record);
                            rmStyle(i.s.index);
                        }
                        delete section.words[i.id];
                        sectionsStore.setItem(sectionId, section);
                        remove();

                        if (i.id === nowDicId && dicEl.classList.contains(DICSHOW)) hideDicEl.click();
                    },
                }),
            );
            showMenu(e.clientX, e.clientY);
        };
        return item;
    });
}

async function getAllMarks() {
    const sectionId = nowBook.sections;
    const section = await getSection(sectionId);
    let list: { id: string; s: section["words"][0] }[] = [];
    for (const i in section.words) {
        list.push({ id: i, s: section.words[i] });
    }
    list = list.toSorted((a, b) => a.s.index[0] - b.s.index[0]);
    return list;
}

lastMarkEl.onclick = async () => {
    if (!nowDicId) return;
    const list = await getAllMarks();
    let index = list.findIndex((i) => i.id === nowDicId);
    index--;
    index = index < 0 ? 0 : index;
    const id = list[index].id;
    jumpToMark(list[index].s.cIndex);
    showDic(id);
};
nextMarkEl.onclick = async () => {
    if (!nowDicId) return;
    const list = await getAllMarks();
    let index = list.findIndex((i) => i.id === nowDicId);
    index++;
    index = index >= list.length ? list.length - 1 : index;
    const id = list[index].id;
    jumpToMark(list[index].s.cIndex);
    showDic(id);
};
function jumpToMark([start, end]) {
    bookContentContainerEl.style.scrollBehavior = "smooth";
    const span = bookContentEl.querySelector(`span[data-s="${start}"]`);
    const spanE = bookContentEl.querySelector(`span[data-e="${end}"]`);
    const e = getDicPosi();
    // 60是粗略计算dic高度
    const dicInView = e + 60 < window.innerHeight && e > 0;
    if (e && dicInView) {
        bookContentContainerEl.scrollTop += spanE.getBoundingClientRect().bottom - e;
    } else {
        bookContentContainerEl.scrollTop =
            span.getBoundingClientRect().top - bookContentEl.getBoundingClientRect().top + bookContentEl.offsetTop;
    }

    bookContentContainerEl.onscrollend = () => {
        bookContentContainerEl.style.scrollBehavior = "";
    };
    setTimeout(() => {
        span.classList.remove("flash_word");
    }, 1200);
}

dicMinEl.onclick = () => {
    dicDetailsEl.classList.toggle(HIDEMEANS);
};

function setDicPosi(el: HTMLElement) {
    dicEl.style.top = `${el.getBoundingClientRect().bottom - (bookContentEl.getBoundingClientRect().top - bookContentEl.scrollTop) + 24}px`;
}
function getDicPosi() {
    const top = Number.parseFloat(dicEl.style.top);
    return top + (bookContentEl.getBoundingClientRect().top - bookContentEl.scrollTop) - 24;
}

let dicTransAi: AbortController;

let nowDicId = "";

async function showDic(id: string) {
    dicTransAi?.abort();
    dicTransAi = null;

    dicEl.classList.add(DICSHOW);

    nowDicId = id;

    const sectionId = nowBook.sections;
    const section = await getSection(sectionId);

    const wordx = section.words[id];

    let Word: { word: string; record: record } & flatWord;

    const Share = {
        context: "",
        sourceIndex: [0, 0],
    };
    let isSentence = wordx.type === "sentence";
    let sourceWord = "";
    if (!isSentence) {
        const record = (await wordsStore.getItem(wordx.id)) as record;
        Word = { word: wordx.id, record, ...flatWordCard(record, id) };
        const s = source2context(wordx, id);
        if (Word.index === -1) {
            Word.context = s;
        }
        Share.context = s.text;
        Share.sourceIndex = s.index;
        sourceWord = Word.context.text.slice(...Word.context.index);
    } else {
        Share.context = ((await card2sentence.getItem(wordx.id)) as record2).text;
    }

    {
        let contextEnd = 0;
        if (isSentence) {
            contextEnd = wordx.index[1];
        } else {
            contextEnd = wordx.index[1] + (Share.context.length - Share.sourceIndex[1]);
        }
        setDicPosi(bookContentEl.querySelector(`span[data-e="${contextEnd}"]`));
        changeContext();
    }

    async function changeDicMean(word: string, i: number) {
        if (word !== Word.word || i !== Word.index) {
            Word.record = rmWord(Word.record, Word.context.source.id);

            if (i !== -1) {
                Word.record = setWordC(Word.record, i, Word.context);
                await wordsStore.setItem(Word.word, Word.record);
            } else await clearWordMean(Word.record);

            Word.word = word;
            Word.index = i;
            wordx.id = word;
            await saveWordX(wordx);
            Word.record = (await wordsStore.getItem(wordx.id)) as record;
        }
    }

    dicTransB.onclick = async () => {
        let text = "";
        if (dicTransContent.value) {
            text = await runAi();
        } else {
            text = (await transCache.getItem(Share.context.trim())) as string;
            if (!text) {
                text = await runAi();
            }
        }
        function runAi() {
            const output = ai(
                [
                    {
                        role: "system",
                        content:
                            "You are a professional, authentic translation engine. You only return the translated text, without any explanations.",
                    },
                    {
                        role: "user",
                        content: `Please translate into ${navigator.language} (avoid explaining the original text):\n\n${Share.context}`,
                    },
                ],
                "翻译",
            );
            dicTransAi = output.stop;
            return output.text;
        }
        dicTransContent.value = text;
        if (isSentence) {
            const r = (await card2sentence.getItem(wordx.id)) as record2;
            r.trans = text;
            await card2sentence.setItem(wordx.id, r);
            visit(true);
            checkVisitAll(section);
        }

        transCache.setItem(Share.context.trim(), text);
    };

    toSentenceEl.onclick = async () => {
        if (isSentence) return;
        if (!(await confirm("这将删除此单词，并将语境转为句子"))) return;
        isSentence = true;
        rmStyle(wordx.index);
        const sentenceCardId = uuid();
        const contextStart = wordx.index[0] - Share.sourceIndex[0];
        const contextEnd = wordx.index[1] + (Share.context.length - Share.sourceIndex[1]);
        wordx.index[0] = contextStart;
        wordx.index[1] = contextEnd;
        wordx.type = "sentence";
        wordx.id = sentenceCardId;
        if (dicTransContent.value) {
            wordx.visit = true;
            checkVisitAll(section);
        }
        await saveWordX(wordx);

        const r: record2 = {
            text: Share.context,
            source: null,
            trans: dicTransContent.value,
        };

        let card: Card;

        mf: for (const i of Word.record?.means || []) {
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
        await cardsStore.setItem(sentenceCardId, card);

        await card2sentence.setItem(sentenceCardId, r);

        Word.record = rmWord(Word.record, Word.context.source.id);
        clearWordMean(Word.record);

        showSentence();
    };

    if (!isSentence) play(Word.word);

    ttsWordEl.onclick = () => {
        play(Word.word);
    };
    ttsContextEl.onclick = () => {
        runTTS(Share.context);
    };

    async function visit(t: boolean) {
        wordx.visit = t;
        await saveWordX(wordx);
    }

    async function showWord() {
        dicEl.classList.remove(DICSENTENCE);
        dicTransContent.value = "";

        search(Word.word);
        dicWordEl.value = Word.word;
        dicWordEl.onchange = async () => {
            const newWord = dicWordEl.value.trim();
            await visit(false);
            await changeDicMean(newWord, -1);
            search(newWord);
        };

        lessWordEl.onclick = () => {
            adjustWord("-");
        };
        moreWordEl.onclick = () => {
            adjustWord("+");
        };

        async function adjustWord(type: "+" | "-") {
            const sEl = document.querySelector(`span[data-s="${wordx.index[0]}"]`);
            const eEl = document.querySelector(`span[data-e="${wordx.index[1]}"]`);
            let e = wordx.index[1];
            if (!(type === "-" && sEl === eEl)) {
                const minE = Number(sEl.getAttribute("data-s"));
                const maxE = wordx.cIndex[1];
                const nextEl = type === "-" ? eEl.previousElementSibling : eEl.nextElementSibling;
                const nextE = Number(nextEl.getAttribute("data-e"));
                e = Math.max(minE, Math.min(maxE, nextE));
            }

            rmStyle(wordx.index);
            addStyle([wordx.index[0], e]);

            const word = editText.slice(wordx.index[0], e);
            wordx.id = word;
            wordx.index[1] = e;
            await saveWordX(wordx);
            showDic(id);
        }

        ttsWordEl.innerText = await getIPA(Word.word);

        const lword = lemmatizer(sourceWord.toLocaleLowerCase());
        moreWordsEl.innerHTML = "";
        const l = Array.from(new Set([sourceWord, sourceWord.toLocaleLowerCase(), lword]));
        if (l.length !== 1)
            for (const w of l) {
                const div = document.createElement("span");
                div.innerText = w;
                div.onclick = async () => {
                    dicWordEl.value = w;
                    await visit(false);
                    await changeDicMean(w, -1);
                    search(w);
                };
                moreWordsEl.append(div);
            }

        addMeanEl.onclick = () => {
            addP("", Word.word, Word.context.text, Word.context.index, Word.tag, async (text, sentence, index) => {
                const mean = text.trim();
                Word.text = mean;
                if (mean) {
                    const x = await addReviewCardMean(Word.word, mean);
                    Word.record = x.record;
                    await changeDicMean(Word.word, x.index);
                    let record = (await wordsStore.getItem(wordx.id)) as record;
                    record = setRecordContext(record, id, (c) => {
                        c.text = sentence;
                        c.index = index;
                    });
                    await wordsStore.setItem(wordx.id, record);
                    Word = { word: wordx.id, record, ...flatWordCard(record, id) };
                    visit(true);
                }
                search(Word.word);
                checkVisitAll(section);
            });
        };

        editMeanEl.onclick = () => {
            addP(Word.text, Word.word, Word.context.text, Word.context.index, null, async (text, sentence, index) => {
                const mean = text.trim();
                Word.text = mean;
                if (mean) {
                    if (Word.record) {
                        Word.record = setRecordMean(Word.record, Word.card_id, (i) => {
                            i.text = mean;
                        });
                        Word.record = setRecordContext(Word.record, id, (x) => {
                            x.text = sentence;
                            x.index = index;
                        });
                        wordsStore.setItem(Word.word, Word.record);
                    }
                } else {
                    await visit(false);
                    await changeDicMean(Word.word, -1);
                }
                search(Word.word);
                checkVisitAll(section);
            });
        };

        noteEl.onclick = () => {
            addP(Word.record?.note || "", Word.word, null, null, null, async (text) => {
                const mean = text.trim();
                if (Word.record) {
                    Word.record.note = mean;
                    wordsStore.setItem(Word.word, Word.record);
                }
            });
        };

        async function search(word: string) {
            console.log(Word.record);

            editMeanEl.style.display = flatWordCard(Word.record, id).index === -1 ? "none" : "";
            if (Word.record) dicDetailsEl.innerHTML = "";
            else {
                dicDetailsEl.innerText = "请添加义项";
                return;
            }
            const means = Word.record.means;
            for (const i in means) {
                const m = means[i];
                const div = document.createElement("div");
                const radio = document.createElement("input");
                radio.type = "radio";
                radio.name = "dic_means";
                radio.onclick = async () => {
                    if (radio.checked) {
                        await changeDicMean(word, Number(i));

                        visit(true);
                    }
                    editMeanEl.style.display = "";
                    showWord();
                };
                if (Number(i) === Word.index) radio.checked = true;
                div.onclick = () => radio.click();
                div.append(radio, await disCard2(m));
                dicDetailsEl.append(div);
            }
            if (Word.index !== -1) dicDetailsEl.classList.add(HIDEMEANS);
            else dicDetailsEl.classList.remove(HIDEMEANS);
        }
    }
    async function showSentence() {
        dicEl.classList.add(DICSENTENCE);

        dicWordEl.value = "";
        moreWordsEl.innerHTML = "";
        dicTransContent.value = ((await card2sentence.getItem(wordx.id)) as record2).trans;
        dicDetailsEl.innerHTML = "";

        if (!dicTransContent.value) {
            dicTransB.click();
        }

        dicTransContent.onchange = async () => {
            const r = (await card2sentence.getItem(wordx.id)) as record2;
            r.trans = dicTransContent.value;
            await card2sentence.setItem(wordx.id, r);
            visit(true);
            checkVisitAll(section);
        };

        noteEl.onclick = async () => {
            const r = (await card2sentence.getItem(wordx.id)) as record2;
            addP(r.note || "", null, r.text, null, null, async (text) => {
                const mean = text.trim();
                r.note = mean;
                await card2sentence.setItem(wordx.id, r);
            });
        };
    }

    if (!isSentence) {
        showWord();
    } else {
        showSentence();
    }

    function changeContext() {
        let contextStart = 0;
        let contextEnd = 0;
        if (isSentence) {
            contextStart = wordx.index[0];
            contextEnd = wordx.index[1];
        } else {
            contextStart = wordx.index[0] - Share.sourceIndex[0];
            contextEnd = wordx.index[1] + (Share.context.length - Share.sourceIndex[1]);
        }
        const startEl = document.createElement("div");
        const endEl = document.createElement("div");
        const startClass = "context_start";
        const endClass = "context_end";
        startEl.classList.add(startClass);
        endEl.classList.add(endClass);
        bookContentEl.querySelector(`.${startClass}`)?.remove();
        bookContentEl.querySelector(`.${endClass}`)?.remove();
        bookContentEl.append(startEl, endEl);
        function setElPosi(el: HTMLElement, left: boolean) {
            function getOffset(el: HTMLElement) {
                const pel = bookContentEl;
                const r = el.getBoundingClientRect();
                const r0 = pel.getBoundingClientRect();
                return { left: r.left - r0.left, top: r.top - (r0.top - pel.scrollTop) };
            }
            if (left) {
                let nel = el;
                if (!isSentence && Number(el.getAttribute("data-s")) > wordx.index[0]) {
                    nel = bookContentEl.querySelector(`span[data-s="${wordx.index[0]}"]`);
                }
                startEl.style.left = `${getOffset(nel).left}px`;
                startEl.style.top = `${getOffset(nel).top}px`;
            } else {
                let nel = el;
                if (!isSentence && Number(el.getAttribute("data-s")) < wordx.index[0]) {
                    nel = bookContentEl.querySelector(`span[data-s="${wordx.index[0]}"]`);
                }
                endEl.style.left = `${getOffset(nel).left + nel.offsetWidth}px`;
                endEl.style.top = `${getOffset(nel).top + nel.offsetHeight}px`;
            }
        }
        function matchRangeEl(n: number, left: boolean) {
            for (let i = 0; i < editText.length - n + 1; i++) {
                for (const ii of [-1, 1]) {
                    const el = bookContentEl.querySelector(
                        `span[data-${left ? "s" : "e"}="${n + i * ii}"]`,
                    ) as HTMLElement;
                    if (el) {
                        return el;
                    }
                }
            }
        }
        const contextStartEl = matchRangeEl(contextStart, true);
        const contextEndEl = matchRangeEl(contextEnd, false);
        setElPosi(contextStartEl, true);
        setElPosi(contextEndEl, false);
        const down = { start: false, end: false };
        const index = { start: contextStart, end: contextEnd };
        startEl.onpointerdown = (e) => {
            down.start = true;
        };
        endEl.onpointerdown = (e) => {
            down.end = true;
        };
        document.onpointermove = (e) => {
            if (down.start) {
                const x = e.clientX;
                const y = e.clientY + 8;
                const list = document.elementsFromPoint(x, y);
                for (const i of list) {
                    if (i.getAttribute("data-t")) {
                        setElPosi(i as HTMLElement, true);
                        index.start = Number(i.getAttribute("data-s"));
                    }
                }
            }
            if (down.end) {
                const x = e.clientX;
                const y = e.clientY - 8;
                const list = document.elementsFromPoint(x, y);
                for (const i of list) {
                    if (i.getAttribute("data-t")) {
                        setElPosi(i as HTMLElement, false);
                        index.end = Number(i.getAttribute("data-e"));
                    }
                }
            }
        };
        document.onpointerup = (e) => {
            if (down.start || down.end) {
                console.log(editText.slice(index.start, index.end));
                saveChange();
            }
            down.start = false;
            down.end = false;
        };
        async function saveChange() {
            const text = editText.slice(index.start, index.end);
            Share.context = text;
            if (isSentence) {
                wordx.index = [index.start, index.end];
                await saveWordX(wordx);
                const r = (await card2sentence.getItem(wordx.id)) as record2;
                r.text = text;
                card2sentence.setItem(wordx.id, r);
            } else {
                const cIndex = [wordx.index[0] - index.start, wordx.index[1] - index.start] as [number, number];
                if (Word.record) {
                    Word.record = setRecordContext(Word.record, id, (j) => {
                        j.index = cIndex;
                        j.text = text;
                    });
                    await wordsStore.setItem(Word.word, Word.record);
                }
                Word.context.text = text;
                Word.context.index = cIndex;
                Share.sourceIndex = cIndex;
                Share.context = text;
            }
            wordx.cIndex = [index.start, index.end];
            await saveWordX(wordx);
            if (!isSentence) {
                showWord();
            }
        }
        hideDicEl.onclick = () => {
            startEl.remove();
            endEl.remove();

            dicEl.classList.remove(DICSHOW);

            dicTransAi?.abort();
            dicTransAi = null;
        };
    }

    async function saveWordX(wordX: typeof wordx) {
        const section = await getSection(sectionId);
        section.words[id] = wordX;
        await sectionsStore.setItem(sectionId, section);
    }
}

async function getWordFromDic(word: string, id: string) {
    const d = (await dicStore.getItem(id)) as dic2;
    let dic = d.dic.get(word);
    if (dic?.isAlias) dic = d.dic.get(dic.text);
    return dic?.text || "";
}

async function showDicEl(mainTextEl: HTMLTextAreaElement, word: string, x: number, y: number) {
    const lan = studyLan;
    const list = el("div");
    list.lang = lan;
    async function showDic(id: string) {
        list.innerHTML = "";
        const tmpdiv = el("div");
        tmpdiv.innerHTML = await getWordFromDic(word, id);
        for (const i of tmpdiv.innerText.split("\n").filter((i) => i.trim() !== "")) {
            const p = el("p");
            p.innerHTML = i;
            list.appendChild(el("label", [el("input", { type: "checkbox", value: p.innerText }), p]));
        }
    }
    const localDic = el("div");
    for (const i in dics) {
        localDic.append(
            el("span", i, {
                onclick: () => {
                    showDic(i);
                },
            }),
        );
    }
    if (Object.keys(dics).length) {
        showDic(Object.keys(dics)[0]);
    } else {
        localDic.innerText = "无词典";
    }
    const onlineList = await onlineDicL(word);
    onlineList.onclick = () => {
        div.close();
    };
    const div = el("dialog", { class: DICDIALOG }, [
        onlineList,
        localDic,
        list,
        el("div", { style: { display: "flex", "justify-content": "flex-end" } }, [
            el("button", iconEl(ok_svg), {
                onclick: () => {
                    // 获取所有checked的值
                    const checkedValues = Array.from(list.querySelectorAll("input[type='checkbox']:checked")).map(
                        (el: HTMLInputElement) => el.value,
                    );
                    mainTextEl.setRangeText(checkedValues.join("\n"));
                    div.close();
                },
            }),
        ]),
    ]) as HTMLDialogElement;
    div.style.left = `min(100vw - 400px, ${x}px)`;
    div.style.top = `min(100dvh - 400px, ${y}px - 400px)`;
    dialogX(div);
}

async function onlineDicL(word: string) {
    const lan = studyLan;
    const onlineList = el("div", { class: "online_dic" });
    let l: onlineDicsType = await setting.getItem(onlineDicsPath);
    l = l.filter((i) => !i.lan || i.lan === lan);
    for (const i of l) {
        onlineList.append(el("a", i.name, { href: i.url.replace("%s", word), target: "_blank" }));
    }
    return onlineList;
}

async function disCard2(m: record["means"][0]) {
    const div = document.createDocumentFragment();
    const disEl = el("p");
    disEl.innerText = m.text;
    const sen = await dicSentences(m.contexts);
    sen.style.paddingLeft = "1em";
    div.append(el("div", disEl), sen);
    return div;
}

async function dicSentences(contexts: record["means"][0]["contexts"]) {
    const sen = el("div", { class: "dic_sen" });
    for (const s of contexts) {
        const source = s.source;
        const t = await getTitleEl(source.book, source.sections, source.id);
        sen.append(
            el("div", [
                el("p", [
                    s.text.slice(0, s.index[0]),
                    el("span", { class: MARKWORD }, s.text.slice(...s.index)),
                    s.text.slice(s.index[1]),
                    t,
                ]),
            ]),
        );
    }
    return sen;
}

async function saveCard(v: {
    key: string;
    index: { start: number; end: number };
    cindex: { start: number; end: number };
}) {
    const sectionId = nowBook.sections;
    const section = await getSection(sectionId);
    for (const i in section.words) {
        const index = section.words[i].index;
        if (index[0] <= v.index.start && v.index.end <= index[1] && section.words[i].type === "word") {
            return i;
        }
    }
    const id = uuid();
    section.words[id] = {
        id: v.key,
        index: [v.index.start, v.index.end],
        cIndex: [v.cindex.start, v.cindex.end],
        visit: false,
        type: "word",
    };

    sectionsStore.setItem(sectionId, section);
    return id;
}

function source2context(source: section["words"][0], sourceId: string) {
    return {
        text: editText.slice(...source.cIndex),
        index: [source.index[0] - source.cIndex[0], source.index[1] - source.cIndex[0]] as [number, number],
        source: { ...nowBook, id: sourceId },
    };
}

function rmWord(record: record, sourceId: string) {
    const Word = flatWordCard(record, sourceId);
    const i = Word.index;
    if (i === -1) return record;
    for (const index in record.means) {
        const m = record.means[index];
        if (Number(index) === i) {
            m.contexts = m.contexts.filter((c) => c.source.id !== sourceId);
            break;
        }
    }
    return record;
}
async function clearWordMean(record: record) {
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

function addStyle(x: [number, number]) {
    for (let i = x[0]; i < x[1]; i++) {
        bookContentEl.querySelector(`span[data-s="${i}"]`)?.classList?.add(MARKWORD);
    }
}
function rmStyle(x: [number, number]) {
    for (let i = x[0]; i < x[1]; i++) {
        bookContentEl.querySelector(`span[data-s="${i}"]`)?.classList?.remove(MARKWORD);
    }
}

function setRecordMean(orecord: record, id: string, f: (c: record["means"][0]) => void) {
    const record = structuredClone(orecord);
    for (const n of record.means) {
        if (n.card_id === id) {
            f(n);
            return record;
        }
    }
    return record;
}
function setRecordContext(orecord: record, id: string, f: (c: record["means"][0]["contexts"][0]) => void) {
    const record = structuredClone(orecord);
    for (const n of record.means) {
        for (const j of n.contexts) {
            if (j.source.id === id) {
                f(j);
                return record;
            }
        }
    }
    return record;
}

async function tagsEl(b: bOp) {
    const t = tag(await tagsStore.getItem("0"));
    function item(id: string, c: string) {
        return el("div", { "data-id": id }, c);
    }
    function oEl(b: bOp) {
        const l = el("div");
        const classMap = {};
        const type = b[0];
        const x = b.slice(1) as (string | bOp)[];
        for (const i of x) {
            if (typeof i === "string") {
                const r = t.get(i);
                const tel = item(i, r.c);
                l.append(tel);
            } else {
                l.append(oEl(i));
            }
        }
        const add = el("button", "+");
        add.onclick = () => {
            const d = el("dialog") as HTMLDialogElement;
            const l = el("div");
            const list = t.getList();
            vlist(l, list, { iHeight: 24 }, (i, v) => {
                const e = el("span");
                e.onclick = () => {
                    add.before(item(v[0], v[1].c));
                    d.close();
                };
                return e;
            });
            const si = el("input");
            const search = el(
                "div",
                si,
                el("button", "+", {
                    onclick: () => {
                        if (si.value) t.new(si.value);
                    },
                }),
            );
            d.append(l, search);
            dialogX(d);
        };
        l.append(add);
        return l;
    }
    const l = oEl(b);
    return l;
}

function addP(
    text: string,
    word: string,
    sentence: string,
    index: record["means"][0]["contexts"][0]["index"],
    tags: bOp,
    f: (text: string, sentence?: string, index?: [number, number], tags?: bOp) => void,
) {
    const p = el("p");
    p.lang = studyLan;
    const sInput1 = el("span", { contentEditable: "true" });
    const sInput2 = el("span", { contentEditable: "true" });
    let sourceWord = "";
    if (index) {
        sourceWord = sentence.slice(...index);
        const sourceWordEl = el("span", { class: MARKWORD }, sourceWord, sourceWord !== word ? `(${word})` : "");
        sInput1.innerText = sentence.slice(0, index[0]);
        sInput2.innerText = sentence.slice(index[1]);
        p.append(sInput1, sourceWordEl, sInput2);
        setTimeout(() => {
            p.scrollLeft = sourceWordEl.offsetLeft - p.offsetWidth / 2;
        }, 100);
    } else p.append(word || sentence);
    const textEl = el("textarea", { value: text, autofocus: "true" });
    const aiB = getAiButtons(textEl, word, sentence);
    const okEl = el("button", iconEl(ok_svg), {
        onclick: () => {
            const mean = textEl.value.trim();
            div.close();
            if (index) {
                const newSentence = sInput1.innerText + sourceWord + sInput2.innerText;
                console.log(newSentence);
                const i = diffPosi(sentence, newSentence);
                const nindex = patchPosi(i.source, i.map, index);
                f(mean, newSentence, nindex);
            } else f(mean);
        },
    });
    const div = el("dialog", { class: NOTEDIALOG }, [
        p,
        textEl,
        el("div", { style: { display: "flex" } }, [aiB, okEl]),
    ]) as HTMLDialogElement;
    textEl.onkeydown = (e) => {
        if (e.key === "Enter" && e.shiftKey) {
            e.preventDefault();
            okEl.click();
        }
    };
    console.log(tags);

    if (tags) {
        tagsEl(tags).then((e) => textEl.after(e));
    }
    dialogX(div);
}

function getAiButtons(textEl: HTMLTextAreaElement, word: string, sentence: string) {
    if (word && sentence) {
        return aiButtons(textEl, word, sentence);
    }
    if (word) {
        return aiButtons1(textEl, word);
    }
    return aiButtons2(textEl, sentence);
}

function aiButtons(textEl: HTMLTextAreaElement, word: string, context: string) {
    function setText(text: string) {
        textEl.setRangeText(text);
    }
    const buttons = document.createDocumentFragment();
    buttons.append(
        el("button", "所有", {
            onclick: async () => {
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
            },
        }),
        el("button", "基本意思", {
            onclick: async () => {
                setText(wordAiText.mean((await wordAi.mean(studyLan, "zh").run({ word, context }).result) as any));
            },
        }),
        el("button", "音标", {
            onclick: async () => {
                setText(await getIPA(word));
            },
        }),
        el("button", "emoji", {
            onclick: async () => {
                setText(wordAiText.meanEmoji((await wordAi.meanEmoji().run({ word }).result) as any));
            },
        }),
        el("button", "近反义词", {
            onclick: async () => {
                setText(wordAiText.synOpp((await wordAi.synOpp().run({ word, context }).result) as any));
            },
        }),
        tmpAiB(textEl, `$这里有个单词${word}，它位于${context}`),
        dicB(textEl, word),
    );
    return buttons;
}
function aiButtons1(textEl: HTMLTextAreaElement, word: string) {
    function setText(text: string) {
        textEl.setRangeText(text);
    }
    const buttons = document.createDocumentFragment();
    buttons.append(
        el("button", "词根词缀", {
            onclick: async () => {
                setText(wordAiText.fix((await wordAi.fix().run({ word }).result) as any));
            },
        }),
        el("button", "音节分词", {
            onclick: async () => {
                setText(await hyphenate(word, { hyphenChar }));
            },
        }),
        el("button", "词源", {
            onclick: async () => {
                setText(wordAiText.etymology((await wordAi.fix().run({ word }).result) as any));
            },
        }),
        tmpAiB(textEl, `$这里有个单词${word}`),
        dicB(textEl, word),
    );
    return buttons;
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

function aiButtons2(textEl: HTMLTextAreaElement, sentence: string) {
    function setText(text: string) {
        textEl.setRangeText(text);
    }
    const buttons = document.createDocumentFragment();
    buttons.append(
        el("button", "分析", {
            onclick: async () => {
                const t = sentenceGm(await sentenceAi.gm(sentence));
                setText(t);
            },
        }),
        el("button", "拆分", {
            onclick: async () => {
                setText((await sentenceAi.split(sentence)).shortSentences.join("\n"));
            },
        }),
        tmpAiB(textEl, `$这里有个句子${sentence}`),
    );
    return buttons;
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

import autoFun from "auto-fun";

autoFun.config({
    type: "chatgpt",
    url: (await setting.getItem("ai.url")) as string,
    key: await setting.getItem("ai.key"),
    option: {
        model: "gpt-4o-mini",
        ...JSON.parse(await setting.getItem("ai.config")),
    },
});

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

type senNode = ({ text: senNode; isPost: boolean } | string)[];

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

function tmpAiB(mainTextEl: HTMLTextAreaElement, info: string) {
    const aiB = el("button", "AI", {
        onclick: () => {
            tmpAi(mainTextEl, info, aiB.getBoundingClientRect().x, aiB.getBoundingClientRect().y);
        },
    });
    return aiB;
}

function tmpAi(mainTextEl: HTMLTextAreaElement, info: string, x: number, y: number) {
    const textEl = el("textarea", { value: ">" });
    aiText(textEl, info);
    const div = el("dialog", { class: AIDIALOG }, [
        textEl,
        el("div", { style: { display: "flex", "justify-content": "flex-end" } }, [
            el("button", iconEl(ok_svg), {
                onclick: () => {
                    const mean = textEl.value.trim();
                    div.close();
                    if (mean !== ">") mainTextEl.setRangeText(`\n${mean}`);
                },
            }),
        ]),
    ]) as HTMLDialogElement;
    div.style.left = `min(100vw - 400px, ${x}px)`;
    div.style.top = `min(100dvh - 400px, ${y}px - 400px)`;
    dialogX(div);
}

function aiText(textEl: HTMLTextAreaElement, info: string) {
    textEl.addEventListener("keyup", async (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            const text = textEl.value.trim();
            const aiM = textAi(text);
            if (aiM.at(-1).role !== "user") return;
            if (info) aiM.unshift({ role: "system", content: info });
            console.log(aiM);
            const start = textEl.selectionStart;
            const end = textEl.selectionEnd;
            const aitext = await ai(aiM, "对话").text;
            const addText = `ai:\n${aitext}`;
            const changeText = textEl.value.slice(0, start) + addText + textEl.value.slice(end);
            textEl.value = changeText;
            textEl.selectionStart = start;
            textEl.selectionEnd = start + addText.length;
        }
    });
}

function dicB(mainTextEl: HTMLTextAreaElement, word: string) {
    const dicB = el("button", "词典", {
        onclick: () => {
            showDicEl(mainTextEl, word, dicB.getBoundingClientRect().x, dicB.getBoundingClientRect().y);
        },
    });
    return dicB;
}

async function showArticelAI() {
    if (!nowBook.book || !nowBook.sections) return;
    const s = await getSection(nowBook.sections);
    const note = s.note;
    const text = el("textarea");
    text.value = note || "> ";
    text.setSelectionRange(text.value.length, text.value.length);
    aiText(text, `这是一篇文章：${s.title}\n\n${s.text}`);
    const div = el("dialog", { class: AIDIALOG }, [
        text,
        el("div", { style: { display: "flex", "justify-content": "flex-end" } }, [
            el("button", iconEl(ok_svg), {
                onclick: async () => {
                    const t = text.value.trim();
                    div.close();
                    if (t !== ">") {
                        const s = await getSection(nowBook.sections);
                        s.note = t;
                        sectionsStore.setItem(nowBook.sections, s);
                    }
                },
            }),
        ]),
    ]) as HTMLDialogElement;
    div.style.left = "auto";
    div.style.right = "0";
    div.style.top = "32px";
    dialogX(div);
}

type aim = { role: "system" | "user" | "assistant"; content: string }[];

function ai(m: aim, text?: string) {
    const config = {
        model: "gpt-4o-mini",
        temperature: 0.5,
        top_p: 1,
        frequency_penalty: 1,
        presence_penalty: 1,
        messages: m,
    };
    let userConfig = localStorage.getItem("setting/ai.config");
    if (userConfig) {
        const c = JSON.parse(userConfig);
        c.messages = m;
        userConfig = JSON.stringify(c);
    } else {
        userConfig = JSON.stringify(config);
    }
    const abort = new AbortController();
    const stopEl = el("button", iconEl(close_svg));
    stopEl.onclick = () => {
        abort.abort();
        pel.remove();
    };
    const pel = el("div", [el("p", `AI正在思考${text || ""}`), stopEl]);
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
            body: userConfig,
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
                pel.innerHTML = "";
                const escEl = el("button", iconEl(close_svg));
                escEl.onclick = () => {
                    pel.remove();
                };
                pel.append(el("p", `AI处理${text || ""}时出现错误`), el("div", [escEl]));
            }),
    };
}

const checkVisit = {
    section: "",
    time: 0,
};

function checkVisitAll(section: section) {
    const l = Object.values(section.words);
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

const fsrsWordW = JSON.parse(await setting.getItem("fsrs.word.w")) as number[];
const fsrsSpellW = JSON.parse(await setting.getItem("fsrs.spell.w")) as number[];
const fsrsSenW = JSON.parse(await setting.getItem("fsrs.sen.w")) as number[];

const fsrs = new FSRS(generatorParameters(fsrsWordW?.length === 17 ? { w: fsrsWordW } : {}));
const fsrsSpell = new FSRS(generatorParameters(fsrsSpellW?.length === 17 ? { w: fsrsSpellW } : {}));
const fsrsSen = new FSRS(generatorParameters(fsrsSenW?.length === 17 ? { w: fsrsSenW } : {}));

const cardsStore = localforage.createInstance({ name: "word", storeName: "cards" });
const wordsStore = localforage.createInstance({ name: "word", storeName: "words" });
const tagsStore = localforage.createInstance({ name: "word", storeName: "tags" });
const card2word = localforage.createInstance({ name: "word", storeName: "card2word" });
const spellStore = localforage.createInstance({ name: "word", storeName: "spell" });
const card2sentence = localforage.createInstance({ name: "word", storeName: "card2sentence" });

const cardActionsStore = localforage.createInstance({ name: "word", storeName: "actions" });
function setCardAction(cardId: string, time: Date, rating: Rating, state: State, duration: number) {
    const o = rating ? [cardId, rating, state, duration] : [cardId];
    cardActionsStore.setItem(String(time.getTime()), o);
}
function newCardAction(id: string) {
    setCardAction(id, new Date(), null, null, null);
}

const transCache = localforage.createInstance({ name: "aiCache", storeName: "trans" });
const ttsCache = localforage.createInstance({ name: "aiCache", storeName: "tts" });

function setWordC(w: record, meanIndex: number, context: record["means"][0]["contexts"][0]) {
    if (meanIndex < 0) return w;
    for (const index in w.means) {
        const i = w.means[index];
        if (Number(index) === meanIndex) {
            if (!i.contexts.includes(context)) i.contexts.push(context);
            return w;
        }
    }
}

async function addReviewCardMean(word: string, text: string) {
    let w = (await wordsStore.getItem(word)) as record;
    if (!w) {
        w = {
            word: word,
            means: [],
        };
        const card2 = createEmptyCard();
        newCardAction(word);
        await spellStore.setItem(word, card2);
    }
    const cardId = uuid();
    const m = { text, contexts: [], card_id: cardId };
    w.means.push(m);
    const card = createEmptyCard();
    newCardAction(cardId);
    await cardsStore.setItem(cardId, card);
    await card2word.setItem(cardId, word);
    await wordsStore.setItem(word, w);
    return { index: w.means.length - 1, record: w };
}

type flatWord = {
    index: number;
    text: string;
    card_id: record["means"][0]["card_id"];
    context: record["means"][0]["contexts"][0];
    tag: bOp;
};

function flatWordCard(record: record, id: string) {
    const Word: flatWord = {
        index: -1,
        card_id: "",
        text: "",
        context: { index: [Number.NaN, Number.NaN], source: { book: "", sections: "", id: "" }, text: "" },
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

function selectWord(words: string[]) {
    for (const el of bookContentEl.querySelectorAll(`.${TMPMARKWORD}`)) {
        el.classList.remove(TMPMARKWORD);
    }
    for (const el of Array.from(bookContentEl.querySelectorAll("span[data-t]")) as HTMLSpanElement[]) {
        if (words.includes(el.innerText.toLocaleLowerCase())) {
            el.classList.add(TMPMARKWORD);
        }
    }
}

async function getNewWords(text: string) {
    const newWords = await getNewWordsFromBook(text);
    const ignoreWords = await getIgnoreWords();
    return newWords.filter((w) => !ignoreWords.includes(lemmatizer(w)));
}

function fillMutiSpell(rl: string[]) {
    const l: string[] = [];
    const m: { [key: string]: string[] } = {};
    for (const i of usSpell) {
        for (const j of i) {
            m[j] = i;
        }
    }
    for (const w of rl) {
        if (m[w]) {
            l.push(...m[w]);
        } else {
            l.push(w);
        }
    }
    return l;
}

async function getLearntWords() {
    const learnt = await wordsStore.keys();
    return fillMutiSpell(learnt);
}

async function getNewWordsFromBook(text: string) {
    const learnt = await getLearntWords();
    const segmenter = new Segmenter(studyLan, { granularity: "word" });
    const segments = segmenter.segment(text);
    const list = Array.from(segments)
        .filter((i) => i.isWordLike)
        .map((i) => i.segment)
        .filter((w) => !learnt.includes(lemmatizer(w)));
    return list;
}

async function getIgnoreWords() {
    const section = await getSection(ignoreWordSection);
    if (!section) return [];
    const rl = section.text.trim().split("\n");
    return fillMutiSpell(rl);
}

async function autoIgnore() {
    const dialog = el("dialog", { class: "words_select", lang: studyLan }) as HTMLDialogElement;
    const f = el("div");
    const words = Array.from(
        new Set(
            Array.from(bookContentEl.querySelectorAll(`:scope>*>*>span:not(.${MARKWORD})`)).map((el) =>
                el.textContent.trim().toLocaleLowerCase(),
            ),
        ),
    );
    const section = await getSection(ignoreWordSection);
    const markedWords = Object.values((await getSection(nowBook.sections)).words)
        .filter((i) => i.type === "word")
        .map((i) => lemmatizer(i.id.toLocaleLowerCase()));
    const oldWords = section.text.trim().split("\n");
    const studyWords = await getLearntWords();
    const hasLentWords = oldWords
        .concat(studyWords)
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
        if (w.match(/[`~!@#$%^&*()_\-+=<>?:"{}|,.\/;'\\[\]·！#￥（——）：；“”‘’、，|《。》？、【】[\]]/)) continue;
        if (properN1.includes(w)) continue;
        const r = lemmatizer(w);
        if (!hasLentWords.includes(r) && !willShowWords.includes(r)) {
            wordsWithRoot.push({ src: w, show: r });
            willShowWords.push(r);
        }
    }
    for (const w of wordsWithRoot) {
        const item = el("label", [
            el("input", { type: "checkbox", value: w.show, class: "ignore_word" }),
            w.show,
            el("input", { type: "checkbox", value: w.src }),
        ]);
        f.append(item);
    }
    dialog.append(
        f,
        el("button", iconEl(ok_svg), {
            onclick: async () => {
                const words = Array.from(f.querySelectorAll("input:checked.ignore_word")).map(
                    (el: HTMLInputElement) => el.value,
                );
                section.text = oldWords.concat(words).join("\n");
                await sectionsStore.setItem(ignoreWordSection, section);
                const wordsX = Array.from(f.querySelectorAll("input:checked:not(.ignore_word)")).map(
                    (el: HTMLInputElement) => el.value,
                );
                selectWord(wordsX);
                dialog.close();
            },
        }),
    );
    dialogX(dialog);
}

async function addIgnore(word: string) {
    const section = await getSection(ignoreWordSection);
    const oldWords = section.text.trim().split("\n");
    if (!oldWords.includes(word)) {
        oldWords.push(word);
        section.text = oldWords.join("\n");
        await sectionsStore.setItem(ignoreWordSection, section);
    } else {
        return;
    }
}
async function removeIgnore(word: string) {
    const section = await getSection(ignoreWordSection);
    const oldWords = section.text.trim().split("\n");
    if (!oldWords.includes(word)) return;
    section.text = oldWords.filter((w) => w !== word).join("\n");
    await sectionsStore.setItem(ignoreWordSection, section);
    if (!(await wordsStore.getItem(word))) {
        // 移除添加的拼写
        spellStore.removeItem(word);
    }
}

setTimeout(async () => {
    const d = await getFutureReviewDue(0.1, "word", "spell", "sentence");
    let c = 0;
    c += Object.keys(d.word).length + Object.keys(d.spell).length;
    if (c > 0) reviewBEl.classList.add(TODOMARK);
}, 10);

const reviewBEl = document.getElementById("reviewb");
const reviewEl = document.getElementById("review");
reviewBEl.onclick = () => {
    reviewEl.classList.toggle("review_show");
    reviewBEl.classList.remove(TODOMARK);

    reviewCount = 0;
};

const reviewReflashEl = document.getElementById("review_reflash");
const reviewAi = el("input", { type: "checkbox" });
reviewReflashEl.parentElement.append(el("label", [reviewAi, "ai"]));
const reviewScope = await sectionSelectEl();
reviewReflashEl.parentElement.append(reviewScope.el);
const spellIgnore = el(
    "select",
    el("option", "全部", { value: "all" }),
    el("option", "排除忽略词", { value: "exIgnore" }),
    el("option", "仅忽略词", { value: "ignore" }),
);
reviewReflashEl.parentElement.append(spellIgnore);
const reviewViewEl = document.getElementById("review_view");
reviewViewEl.lang = studyLan;

let reviewSortType: "正常" | "学习" | "紧急" | "随机" = "正常";
const reviewSortEl = el(
    "select",
    [
        el("option", "正常", { value: "正常" }),
        el("option", "学习", { value: "学习" }),
        el("option", "紧急", { value: "紧急" }),
        el("option", "随机", { value: "随机" }),
    ],
    {
        onchange: () => {
            reviewSortType = reviewSortEl.value as typeof reviewSortType;
        },
    },
);
reviewReflashEl.parentElement.append(reviewSortEl);

reviewReflashEl.parentElement.append(
    el("button", iconEl(chart_svg), {
        onclick: () => {
            plotEl.el.showPopover();
            renderCharts();
        },
    }),
);

const KEYBOARDDISPLAYPATH = "spell.keyboard.display";
const KEYBOARDHEIGHTPATH = "spell.keyboard.height";

const keyboardEl = view("y")
    .class("simple-keyboard")
    .style({ height: `${await setting.getItem(KEYBOARDHEIGHTPATH)}px` });
const handwriterCanvas = el("canvas");
const handwriterCheck = el("button", iconEl(ok_svg), {
    style: { display: "none" },
    onclick: () => {
        ocrSpell();
    },
});
const handwriterEl = el("div", { class: "spell_write" }, [handwriterCanvas, handwriterCheck]);
const spellInputEl = el("div", { style: { display: "none" } }, [keyboardEl.el, handwriterEl]);
reviewEl.append(spellInputEl);

function trackKeyboard(el: ElType<HTMLElement>) {
    trackPoint(el, {
        start() {
            if (keyboard.getLayout() !== "default") return;
            const h = keyboardEl.el.offsetHeight;
            return { x: 0, y: window.innerHeight - h };
        },
        ing: (p) => {
            const h = window.innerHeight - p.y;
            keyboardEl.style({ height: `${h}px` });
        },
        end: () => {
            setting.setItem(KEYBOARDHEIGHTPATH, keyboardEl.el.offsetHeight);
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
            render(c[layout]);
        },
        getLayout: () => layout as t,
    };
}

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

keyboard.setLayout(await setting.getItem(KEYBOARDDISPLAYPATH));

window.addEventListener("keydown", (e) => {
    if (!(reviewType === "spell" && reviewEl.classList.contains("review_show"))) return;
    if (!reviewEl.contains(document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2))) return; // 用于note
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

let spellWriteE: PointerEvent;
let spellWriteCtx: CanvasRenderingContext2D;
reviewEl.onpointerdown = (e) => {
    if (!(reviewType === "spell" && reviewEl.classList.contains("review_show"))) return;
    const sEl = document.querySelector(".spell_input");
    if (!sEl) return;
    if (e.clientY > sEl.getBoundingClientRect().bottom) return;
    if (e.clientY < sEl.getBoundingClientRect().top) return;
    console.log(e);
    e.preventDefault();
    spellWriteE = e;
    if (!spellWriteCtx) {
        spellWriteCtx = handwriterCanvas.getContext("2d");
        handwriterCanvas.width = window.innerWidth;
        handwriterCanvas.height = window.innerHeight - 32;
        handwriterCheck.style.display = "";
    }
    spellWriteCtx.moveTo(e.clientX, e.clientY - 32 * 2);
};

reviewEl.onpointermove = (e) => {
    if (!spellWriteE) return;
    const ctx = spellWriteCtx;
    ctx.lineTo(e.clientX, e.clientY - 32 * 2);
    ctx.stroke();
};

window.addEventListener("pointerup", (e) => {
    spellWriteE = null;
});

function ocrSpell() {
    // check
    // clean
    handwriterCanvas.width = 0;
    handwriterCheck.style.display = "none";
    spellWriteCtx = null;
}

async function getWordsScope() {
    const books = reviewScope.values();
    const ignore = await getIgnoreWords();
    if (books.length === 0) return { words: null, ignore };
    const words: string[] = [];
    for (const book of books) {
        const w = (await getSection(book)).text.trim().split("\n");
        words.push(...w);
    }
    return { words, ignore: words.filter((i) => ignore.includes(i)) };
}

function filterWithScope(word: string, scope: string[], exScope?: string[]) {
    if (exScope?.includes(word)) return false;
    return !scope || scope.includes(word);
}

async function getFutureReviewDue(days: number, ...types: review[]) {
    let now = new Date().getTime();
    now += timeD.d(days);
    now = Math.round(now);
    const ws = await getWordsScope();
    const wordsScope = ws.words;
    const wordList: { id: string; card: Card }[] = [];
    const spellList: { id: string; card: Card }[] = [];
    const sentenceList: { id: string; card: Card }[] = [];

    const dueL: Map<string, Card> = new Map();
    await cardsStore.iterate((card: Card, k) => {
        if (card.due.getTime() < now) {
            dueL.set(k, card);
        }
    });

    if (types.includes("word"))
        await wordsStore.iterate((v: record, k) => {
            if (filterWithScope(k, wordsScope)) {
                for (const m of v.means) {
                    if (dueL.has(m.card_id)) wordList.push({ id: m.card_id, card: dueL.get(m.card_id) });
                }
            }
        });
    if (types.includes("spell")) {
        await spellStore.iterate((value: Card, key) => {
            if (value.due.getTime() < now) {
                if (spellIgnore.value === "all")
                    if (filterWithScope(key, wordsScope)) spellList.push({ id: key, card: value });
                if (spellIgnore.value === "exIgnore")
                    if (filterWithScope(key, wordsScope, ws.ignore)) spellList.push({ id: key, card: value });
                if (spellIgnore.value === "ignore")
                    if (filterWithScope(key, ws.ignore)) spellList.push({ id: key, card: value });
            }
        });
    }

    if (types.includes("sentence"))
        for (const key of await card2sentence.keys()) {
            if (dueL.has(key)) {
                sentenceList.push({ id: key, card: dueL.get(key) });
            }
        }
    return { word: wordList, spell: spellList, sentence: sentenceList };
}
async function getReviewDue(type: review) {
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
        for (const x of [wordList, spellList, sentenceList]) x.sort((a, b) => (a.card.state === State.New ? -1 : 1));
    if (reviewSortType === "紧急") {
        wordList.sort(
            (a, b) => fsrs.get_retrievability(a.card, now, false) - fsrs.get_retrievability(b.card, now, false),
        );
        spellList.sort(
            (a, b) =>
                fsrsSpell.get_retrievability(a.card, now, false) - fsrsSpell.get_retrievability(b.card, now, false),
        );
        sentenceList.sort(
            (a, b) => fsrsSen.get_retrievability(a.card, now, false) - fsrsSen.get_retrievability(b.card, now, false),
        );
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

type review = "word" | "spell" | "sentence";
let reviewType: review = "word";
const reviewModeEl = document.getElementById("review_mode");
const reviewWordEl = document.getElementById("review_word") as HTMLInputElement;
const reviewSpellEl = document.getElementById("review_spell") as HTMLInputElement;
const reviewSentenceEl = document.getElementById("review_sentence") as HTMLInputElement;

reviewWordEl.checked = true;
spellIgnore.style.display = "none";
reviewModeEl.onclick = (e) => {
    if ((e.target as HTMLElement).tagName !== "INPUT") return;
    if (reviewWordEl.checked) {
        reviewType = "word";

        spellInputEl.style.display = "none";
    }
    if (reviewSentenceEl.checked) {
        reviewType = "sentence";

        spellInputEl.style.display = "none";
    }
    if (reviewSpellEl.checked) {
        reviewType = "spell";

        spellInputEl.style.display = "";
    }
    if (reviewType === "spell") {
        spellIgnore.style.display = "";
    } else {
        spellIgnore.style.display = "none";
    }

    reviewReflashEl.click();
};

let reviewCount = 0;
const maxReviewCount = Number((await setting.getItem("review.maxCount")) || "30");

async function nextDue(type: review) {
    const x = await getReviewDue(type);
    reviewCount++;
    return x;
}

reviewReflashEl.onclick = async () => {
    due = await getFutureReviewDue(0.1, reviewType);
    const l = await getReviewDue(reviewType);
    console.log(l);
    if (reviewAi.checked && reviewType === "word") await getWordAiContext();
    showReview(l, reviewType);
    reviewCount = 0;
};

let spellCheckF: (text: string) => void = (text) => console.log(text);
let spellF: (text: string) => void = (text) => console.log(text);
function clearKeyboard() {
    keyboard.clearInput();
}

let aiContexts: { [id: string]: { text: string } } = {};
async function getWordAiContext() {
    const l: { id: string; word: string; mean: string }[] = [];
    const newDue = due.word
        .toSorted((a, b) => a.card.due.getTime() - b.card.due.getTime())
        .filter((i) => i.card.state === State.Review)
        .slice(0, maxReviewCount);
    for (const x of newDue) {
        const wordid = (await card2word.getItem(x.id)) as string;
        const wordRecord = (await wordsStore.getItem(wordid)) as record;
        for (const i of wordRecord.means) {
            if (i.card_id === x.id) {
                l.push({ id: x.id, word: wordRecord.word, mean: i.text });
                break;
            }
        }
    }

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

        const tipEl = el(
            "div",
            el("p", "正在生成AI例句……"),
            el("button", iconEl(close_svg), {
                onclick: () => {
                    tipEl.remove();
                    x.stop.abort();
                },
            }),
        );

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
        putToast(el("p", "ai错误"));
    }

    aiContexts = {};

    for (const i of rr) aiContexts[i.id] = { text: i.sentence };
}

async function showReview(x: { id: string; card: Card }, type: review) {
    if (!x) {
        reviewViewEl.innerText = "暂无复习🎉";
        return;
    }
    if (maxReviewCount > 0 && reviewCount === maxReviewCount) {
        reviewViewEl.innerText = `连续复习了${maxReviewCount}个项目，休息一下😌\n刷新即可继续复习`;
        return;
    }
    const isAi = reviewAi.checked;
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
async function crContext(word: record, id: string) {
    let context = document.createElement("div");
    if (!word) return context;
    for (const i of word.means) {
        if (i.card_id === id) {
            context = await dicSentences(i.contexts.toReversed());
        }
    }
    return context;
}
async function aiContext(id: string) {
    const context = document.createElement("div");
    const text = aiContexts[id].text;
    const l = text.split(/\*\*(.+)\*\*/);
    context.append(el("p", [l[0], el("span", l[1], { class: MARKWORD }), l[2]]));
    return context;
}
async function showWordReview(x: { id: string; card: Card }, isAi: boolean) {
    const wordid = (await card2word.getItem(x.id)) as string;
    const wordRecord = (await wordsStore.getItem(wordid)) as record;
    play(wordRecord.word);
    const div = document.createElement("div");
    let context: HTMLDivElement;
    if (isAi && aiContexts[x.id]?.text) context = await aiContext(x.id);
    else context = await crContext(wordRecord, x.id);
    let hasShowAnswer = false;
    async function showAnswer() {
        hasShowAnswer = true;
        const word = (await card2word.getItem(x.id)) as string;
        const d = (await wordsStore.getItem(word)) as record;
        for (const i of d.means) {
            if (i.card_id === x.id) {
                const div = el("div");
                div.innerText = i.text;
                dic.innerHTML = "";
                dic.append(div);
            }
        }
    }
    const dic = el("div");
    dic.onclick = reviewHotkey.show.f = () => {
        showAnswer();
        buttons.finish();
    };
    const buttons = getReviewCardButtons(x.id, x.card, context.innerText, async (rating) => {
        if (hasShowAnswer) {
            const next = await nextDue(reviewType);
            showReview(next, reviewType);
        } else {
            showAnswer();
        }
    });

    const wordEl = el("div", wordid, { class: "main_word" });

    div.append(wordEl, context, dic, buttons.buttons);
    div.classList.add("review_word");
    reviewViewEl.innerHTML = "";
    reviewViewEl.append(div);
}

const reviewHotkey: { [key: string]: { f: () => void; key: string } } = {
    1: { key: "1", f: () => {} },
    2: { key: "2", f: () => {} },
    3: { key: "3", f: () => {} },
    show: { key: " ", f: () => {} },
};

document.addEventListener("keydown", (e) => {
    if (!reviewEl.classList.contains("review_show") && reviewType !== "spell") return;
    for (const i in reviewHotkey) {
        if (e.key === reviewHotkey[i].key) {
            reviewHotkey[i].f();
        }
    }
});

function getReviewCardButtons(id: string, card: Card, readText: string, f?: (rating: number) => void) {
    const showTime = new Date().getTime();
    let hasClick = false;
    let finishTime = showTime;
    let quickly = false;
    const b = (rating: Rating, icon: HTMLElement) => {
        const button = el("button");
        button.append(icon);
        button.onclick = reviewHotkey[rating].f = async () => {
            if (hasClick) {
                let r = rating;
                if (rating === Rating.Good && quickly) r = Rating.Easy;
                await setReviewCard(id, card, r, finishTime - showTime);
                if (f) f(r);
                return;
            }
            await firstClick();
            if (f) f(rating);
        };
        return button;
    };
    async function firstClick() {
        hasClick = true;
        finishTime = time();
        quickly = finishTime - showTime < (await getReadTime(readText)) + 400;
        if (quickly) goodB.querySelector("img").src = very_ok_svg;
    }
    const againB = b(Rating.Again, iconEl(close_svg));
    const hardB = b(Rating.Hard, iconEl(help_svg));
    const goodB = b(Rating.Good, iconEl(ok_svg));
    const buttons = document.createElement("div");
    buttons.append(againB, hardB, goodB);
    return {
        buttons,
        finish: () => firstClick(),
    };
}

async function getReadTime(text: string) {
    const segmenter = new Segmenter(studyLan, { granularity: "word" });
    const segments = segmenter.segment(text);
    const wordsCount = Array.from(segments).length;
    return wordsCount * (Number(await setting.getItem("user.readSpeed")) || 100);
}

async function showSpellReview(x: { id: string; card: Card }) {
    const word = x.id;
    const wordSpells = usSpell.find((m) => m.includes(word)) || [word];
    const maxWidth = Math.max(...wordSpells.map((w) => w.length));
    const input = el("div", { class: "spell_input", style: { width: "min-content" } });
    input.innerText = word; // 占位计算宽度
    clearKeyboard();
    const SHOWSENWORD = "spell_sen_word_show";
    const BLURWORD = "blur_word";
    const wordEl = document.createElement("div");
    let isPerfect = false;
    let spellResult: "none" | "right" | "wrong" = "none";
    const showTime = time();
    play(word);
    function matchCapital(input: string, word: string) {
        const l: string[] = [];
        for (let i = 0; i < input.length; i++) {
            if (word[i].match(/[A-Z]/)) l.push(input[i].toLocaleUpperCase());
            else l.push(input[i]);
        }
        return l.join("");
    }
    function matchSpecial(input: string, word: string) {
        const l: string[] = [];
        for (let i = 0; i < input.length; i++) {
            if (word[i].match(/[-'’ ]/)) l.push(word[i]);
            else l.push(input[i]);
        }
        return l.join("");
    }
    function inputContent(inputWord: string) {
        input.innerHTML = "";
        if (x.card.state === State.New) {
            input.append(inputWord, el("span", word.slice(inputWord.length), { style: { opacity: "0.5" } }));
        } else if (x.card.state === State.Learning) {
            input.append(inputWord, el("span", word.slice(inputWord.length), { class: BLURWORD }));
        } else {
            input.innerText = inputWord || "|";
        }
    }
    spellCheckF = async (rawInputWord: string) => {
        const inputWord = matchSpecial(matchCapital(rawInputWord, word), word);
        inputContent(inputWord);
        wordEl.innerHTML = "";
        div.classList.remove(SHOWSENWORD);
        if (wordSpells.includes(inputWord)) {
            // 正确
            const rightL = (await hyphenate(word, { hyphenChar })).split(hyphenChar);
            const ele = el("div");
            for (const i of rightL) {
                ele.append(el("span", i));
            }
            input.innerHTML = "";
            input.append(ele);
            await spellAnimate(ele);

            if (spellResult === "none")
                setSpellCard(x.id, x.card, isPerfect ? Rating.Easy : Rating.Good, time() - showTime);
            spellResult = "right";
            const next = await nextDue(reviewType);
            showReview(next, reviewType);
            clearKeyboard();
        }
        //错误归位
        if (inputWord.length === maxWidth && !wordSpells.includes(inputWord)) {
            input.innerHTML = "";
            const diffEl = await spellDiffWord(word, inputWord);
            input.append(diffEl);
            input.append(
                el("button", {
                    onclick: async () => {
                        diffEl.innerHTML = (await spellDiffWord(word, inputWord)).innerHTML;
                        spellErrorAnimate(diffEl);
                    },
                }),
            );
            spellErrorAnimate(diffEl);
            wordEl.append(await hyphenate(word, { hyphenChar }));
            play(word);
            div.classList.add(SHOWSENWORD);
            if (spellResult === "none") {
                const oldCard = x.card;
                const actionId = setSpellCard(x.id, x.card, 1, time() - showTime);
                const diff = dmp.diff_main(inputWord, word);
                const f = diff.filter((i) => i[0] !== 0);
                if (f.length === 2) {
                    if (f[0][0] === -1 && f[0][1].length === 1 && f[1][0] === 1 && f[1][1].length === 1)
                        wordEl.append(
                            el("button", "手误 撤回", {
                                onclick: () => {
                                    spellStore.setItem(x.id, oldCard);
                                    cardActionsStore.removeItem(actionId);
                                    spellResult = "none";
                                    wordEl.innerHTML = "";
                                    inputContent("");
                                },
                            }),
                        );
                }
            }
            clearKeyboard();
            spellResult = "wrong";
        }
    };
    spellF = async (button) => {
        console.log(button);
        if (button === "{tip}") {
            // 暂时展示
            input.innerHTML = "";
            input.append(el("span", { class: BLURWORD }, word));
            clearKeyboard();
            isPerfect = false;
            play(word);
            div.classList.add(SHOWSENWORD);
        }
        if (button === "{audio}") {
            // 发音
            play(word);
        }
    };
    const context = el("div");
    context.append(el("div", await getIPA(word)));
    const r = (await wordsStore.getItem(word)) as record;
    if (r) {
        context.append(
            el("button", iconEl(pen_svg), {
                onclick: () => {
                    addP(r.note || "", word, null, null, null, async (text) => {
                        const mean = text.trim();
                        if (r) {
                            r.note = mean;
                            wordsStore.setItem(word, r);
                        }
                    });
                },
            }),
        );
        for (const i of r.means) {
            context.append(el("div", await disCard2(i)));
        }
    } else {
        const text = await getWordFromDic(word, Object.keys(dics)[0]);
        context.append(el("div", el("div", el("p", text))));
    }
    const div = document.createElement("div");
    div.append(input, wordEl, context);
    div.classList.add("review_spell");
    div.setAttribute("data-state", String(x.card.state));
    reviewViewEl.innerHTML = "";
    reviewViewEl.append(div);

    input.style.width = `${input.offsetWidth}px`;
    inputContent("");
}

async function spellDiffWord(rightWord: string, wrongWord: string) {
    const div = el("div");
    const diff = dmp.diff_main(wrongWord, rightWord);
    div.append(getDiffWord(diff));
    return div;
}

function getDiffWord(diff: Diff[]) {
    const div = document.createDocumentFragment();
    for (let n = 0; n < diff.length; n++) {
        const i = diff[n];
        if (i[0] === -1 && diff[n + 1]?.[0] === 0 && diff[n + 2]?.[0] === 1) {
            if (i[1] === diff[n + 2][1]) {
                div.append(el("span", { class: "diff_exchange" }, [el("span", i[1]), el("span", diff[n + 1][1])]));
                n += 2;
                continue;
            }
        }
        if (i[0] === 0) {
            div.append(i[1]);
        } else if (i[0] === 1) {
            div.append(el("span", { class: "diff_add" }, i[1]));
        } else {
            div.append(el("span", { class: "diff_remove" }, i[1]));
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
        nel.style.opacity = "0.2";
        nel.style.transition = "0.2s";
    }

    const t = 160;

    await sleep(t);
    for (let i = 0; i < el.children.length; i++) {
        const e = el.children.item(i) as HTMLElement;
        e.style.opacity = "1";
        await sleep(el.children.item(i).textContent.length * t);
    }
}

function spellErrorAnimate(pel: HTMLElement) {
    for (let i = 0; i < pel.childNodes.length; i++) {
        if (pel.childNodes[i].nodeName !== "SPAN") continue;
        const el = pel.childNodes[i] as HTMLSpanElement;
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
    const sentence = (await card2sentence.getItem(x.id)) as record2;
    const div = el("div");
    const context = el(
        "p",
        sentence.text,
        await getTitleEl(sentence.source.book, sentence.source.sections, sentence.source.id),
    );
    let hasShowAnswer = false;
    async function showAnswer() {
        hasShowAnswer = true;
        dic.innerHTML = "";
        dic.append(el("p", { class: TRANSLATE }, sentence.trans));
        if (sentence.note) {
            const p = el("p");
            p.innerText = sentence.note;
            dic.append(p);
        }
    }
    const dic = el("div");
    dic.onclick = reviewHotkey.show.f = () => {
        showAnswer();
        buttons.finish();
    };
    const buttons = getReviewCardButtons(x.id, x.card, context.innerText, async (rating) => {
        if (hasShowAnswer) {
            const next = await nextDue(reviewType);
            showReview(next, reviewType);
        } else {
            showAnswer();
        }
    });

    div.append(context, dic, buttons.buttons);
    div.classList.add("review_sentence");
    reviewViewEl.innerHTML = "";
    reviewViewEl.append(div);
}

const audioEl = <HTMLAudioElement>document.getElementById("audio");
const pTTSEl = <HTMLAudioElement>document.getElementById("pTTS");

function play(word: string) {
    audioEl.src = `https://dict.youdao.com/dictvoice?le=eng&type=1&audio=${word}`;
    audioEl.play();
}

const tts = new MsEdgeTTS();
const ttsVoiceConfig = "tts.voice";
const ttsEngineConfig = "tts.engine";

import fixWebmDuration from "webm-duration-fix";

const synth = window.speechSynthesis;

async function getTtsEngine() {
    return ((await setting.getItem(ttsEngineConfig)) || "browser") as "browser" | "ms";
}

async function ttsNormalize(text: string) {
    const posi = (((await setting.getItem(ttsVoiceConfig)) as string) || "en-GB-LibbyNeural").slice(0, 2);
    if (posi === "zh" || posi === "ja" || posi === "ko") return;
    return text.normalize("NFKC");
}

async function getTTS(text: string) {
    await tts.setMetadata(
        (await setting.getItem(ttsVoiceConfig)) || "en-GB-LibbyNeural",
        OUTPUT_FORMAT.WEBM_24KHZ_16BIT_MONO_OPUS,
    );
    const nText = await ttsNormalize(text);
    const b = (await ttsCache.getItem(nText)) as Blob;
    if (b) {
        return URL.createObjectURL(b);
    }

    const readable = tts.toStream(nText);
    let base = new Uint8Array();
    readable.on("data", (data: Uint8Array) => {
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

    readable.on("closed", () => {
        console.log("STREAM CLOSED");
    });

    return new Promise((re: (url: string) => void, rj) => {
        readable.on("end", async () => {
            console.log("STREAM end");
            let blob = new Blob([base], { type: "audio/webm" });
            blob = await fixWebmDuration(blob);
            if (blob.size > 0) ttsCache.setItem(text, blob);
            re(URL.createObjectURL(blob));
        });
    });
}

async function runTTS(text: string) {
    if ((await getTtsEngine()) === "browser") {
        localTTS(text);
    } else {
        audioEl.src = await getTTS(text);
        audioEl.play();
    }
}

async function localTTS(text: string) {
    const nText = await ttsNormalize(text);
    const utterThis = new SpeechSynthesisUtterance(nText);
    const voices = window.speechSynthesis.getVoices();
    const sv = ((await setting.getItem(ttsVoiceConfig)) as string) || "en-GB-LibbyNeural";
    for (let i = 0; i < voices.length; i++) {
        if (voices[i].name === sv) {
            utterThis.voice = voices[i];
            break;
        }
    }
    synth.speak(utterThis);
    return utterThis;
}

const pttsEl = document.getElementById("pTTSp");
const SHOWPTTS = "pTTS_show";
const autoPlayTTSEl = el("input", {
    type: "checkbox",
    onchange: () => {
        autoPlay = autoPlayTTSEl.checked;
    },
});
pttsEl.append(autoPlayTTSEl);

let autoPlay = false;

async function pTTS(index: number) {
    const text = contentP.at(index);
    const nextplay = () => {
        if (autoPlay) {
            if (index + 1 < contentP.length) {
                pTTS(index + 1);
                return;
            }
        }
        pttsEl.classList.remove(SHOWPTTS);
    };
    if (!text) {
        nextplay();
        return;
    }
    pttsEl.classList.add(SHOWPTTS);

    if ((await getTtsEngine()) === "browser") {
        const utterThis = await localTTS(text);
        utterThis.onend = nextplay;
    } else {
        const url = await getTTS(text);
        pTTSEl.src = url;
        pTTSEl.play();
        pTTSEl.onended = nextplay;
    }
}

async function setReviewCard(id: string, card: Card, rating: Rating, duration: number) {
    const now = new Date();
    setCardAction(id, now, rating, card.state, duration);
    const sCards = fsrs.repeat(card, now);
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
    const nCard = sCards[rating].card;
    spellStore.setItem(id, nCard);

    for (const i of due.spell)
        if (i.id === id) {
            i.card = structuredClone(nCard);
            break;
        }

    return String(now.getTime());
}

const plotEl = view().attr({ popover: "auto" }).class("plot");
const cardDue = view();
const cal1 = newCal();
const cal2 = newCal();
plotEl.add([
    cardDue,
    view().add([ele("h2").attr({ innerText: "新卡片" }), cal1.el, ele("h2").attr({ innerText: "已复习" }), cal2.el]),
]);
document.body.append(plotEl.el);

async function renderCardDueAll() {
    const wordsScope = (await getWordsScope()).words;
    const wordDue: string[] = [];
    const spellDue: number[] = [];
    const sentenceDue: string[] = [];
    await wordsStore.iterate((v: record, k: string) => {
        if (!filterWithScope(k, wordsScope)) return;
        for (const m of v.means) {
            wordDue.push(m.card_id);
        }
    });
    await spellStore.iterate((v: Card, k: string) => {
        if (!filterWithScope(k, wordsScope)) return;
        spellDue.push(v.due.getTime());
    });
    await card2sentence.iterate((v: record2, k: string) => {
        sentenceDue.push(k);
    });
    const wordDue1: number[] = [];
    const sentenceDue1: number[] = [];
    await cardsStore.iterate((v: Card, k) => {
        if (wordDue.includes(k)) {
            wordDue1.push(v.due.getTime());
            return;
        }
        if (sentenceDue.includes(k)) {
            sentenceDue1.push(v.due.getTime());
        }
    });

    cardDue.el.innerHTML = "";
    cardDue.add({ el: renderCardDue("单词", wordDue1) });
    cardDue.add({ el: renderCardDue("拼写", spellDue) });
    cardDue.add({ el: renderCardDue("句子", sentenceDue1) });
}

async function renderCharts() {
    renderCardDueAll();
    cal1.els.title.el.innerText = cal2.els.title.el.innerText = "加载中……";

    const newCard: Date[] = [];
    const reviewCard: Date[] = [];
    await cardActionsStore.iterate((v: [string] | [string, Rating, State, number], k) => {
        const date = new Date(Number(k));
        if (!v[1]) {
            newCard.push(date);
        } else {
            reviewCard.push(date);
        }
    });
    renderCal(2024, newCard, cal1);
    renderCal(2024, reviewCard, cal2);
}

function renderCardDue(text: string, data: number[]) {
    const pc = view().class("oneD_plot");
    const now = time();
    const zoom = 1 / (timeD.h(1) / 10);
    const _max = now + timeD.d(7);
    let _min = Number.POSITIVE_INFINITY;
    for (const d of data.concat([now])) if (d < _min) _min = d;
    let count = 0;
    const list: Array<ReturnType<typeof pack<HTMLElement>>> = [];
    for (let min = _min; min < _max; min += 2048 / zoom) {
        const max = Math.min(min + 2048 / zoom, _max);
        const canvas = ele("canvas");
        canvas.el.width = (max - min) * zoom;
        if (max === _max) canvas.el.width++;
        canvas.el.height = 16;
        const ctx = canvas.el.getContext("2d");
        function l(x: number, color: string) {
            ctx.strokeStyle = color;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, 16);
            ctx.stroke();
        }
        const nowx = (now - min) * zoom;
        for (const d of data) {
            if (d < min || max < d) continue;
            const x = (d - min) * zoom;
            l(x, "#000");
            if (x < nowx) count++;
        }
        l(nowx, "#f00");
        l((now + timeD.h(1) - min) * zoom, "#00f");
        l((now + timeD.d(1) - min) * zoom, "#00f");
        list.push(canvas);
    }
    pc.add(list, 3);
    const f = el("div");
    f.append(text, String(count), pc.el);
    return f;
}

function newCal() {
    const f = view().class("cal_plot");
    const title = view();
    const list: Array<ReturnType<typeof view>> = [];
    for (let x = 1; x <= 53; x++) {
        for (let y = 1; y <= 7; y++) {
            const item = view();
            list.push(item);
        }
    }
    f.add(list, 14, 14);
    f.on("click", (e) => {
        if (e.target === f.el) return;
        const EL = e.target as HTMLElement;
        title.el.innerText = EL.title;
    });
    const div = frame("cal", {
        _: view(),
        title,
        plot: f,
    });
    return div;
}
function renderCal(year: number, data: Date[], el: typeof cal1) {
    const count: { [key: string]: number } = {};
    for (const d of data) {
        const id = d.toDateString();
        if (count[id]) count[id]++;
        else count[id] = 1;
    }
    const rl = Object.values(count).toSorted((a, b) => a - b);
    const l: number[] = [];
    const c = 6;
    const width = Math.floor(rl.length / (c - 1)) || 1;
    for (let i = 0; i < rl.length; i += width) l.push(rl[i]);
    l.push(rl.at(-1) + 1);
    const firstDate = new Date(year, 0, 1);
    const zero2first = (firstDate.getDay() + 1) * timeD.d(1);
    let s_date = new Date(firstDate.getTime() - zero2first);

    const els = Array.from(el.els.plot.el.children) as HTMLElement[];
    for (let x = 1; x <= 53; x++) {
        for (let y = 1; y <= 7; y++) {
            s_date = new Date(s_date.getTime() + timeD.d(1));
            const v = count[s_date.toDateString()] ?? 0;
            const item = pack(els[7 * (x - 1) + y - 1]).attr({
                title: `${s_date.toLocaleDateString()}  ${v}`,
            });
            if (v) {
                const nvi = l.findIndex((i) => i > v) - 1;
                const nv = (100 / c) * nvi + (100 / c) * ((v - l[nvi]) / (l[nvi + 1] - l[nvi])); // 赋分算法，但平均分割区间
                item.style({ "background-color": `color-mix(in srgb-linear, #9be9a8, #216e39 ${nv}%)` });
            } else {
                item.style({ "background-color": "none" });
            }
            if (s_date.toDateString() === new Date().toDateString()) {
                item.style({ "border-width": "2px" });
                el.els.title.el.innerText = item.el.title;
            } else {
                item.style({ "border-width": "" });
            }
        }
    }
}

//###### setting
const settingEl = document.getElementById("setting");
document.getElementById("settingb").onclick = () => {
    settingEl.togglePopover();
};

const readerSettingPath = { apostrophe: "reader.apostrophe" };

settingEl.append(
    el(
        "div",
        el("h2", "阅读器"),
        el("label", el("input", { type: "checkbox", "data-path": readerSettingPath.apostrophe }), "把’转为'"),
    ),
);

import Sortable from "sortablejs";

const onlineDicsEl = el("ul", { style: { "list-style-type": "none" } });
const onlineDicsPath = "dics.online";
type onlineDicsType = { name: string; url: string; lan: string }[];

function onlineDicItem(name: string, url: string, lan: string) {
    const li = el(
        "li",
        el("span", { class: "sort_handle" }, "::"),
        el("input", { value: name }),
        el("input", { value: url }),
        el("input", { value: lan }),
        el("button", iconEl(close_svg), {
            onclick: () => {
                li.remove();
            },
        }),
    );
    return li;
}

async function showOnlineDics() {
    const l = ((await setting.getItem(onlineDicsPath)) || []) as onlineDicsType;
    for (const i of l) {
        onlineDicsEl.append(onlineDicItem(i.name, i.url, i.lan));
    }
    onlineDicsEl.oninput = () => {
        saveSortOnlineDics();
    };
    new Sortable(onlineDicsEl, {
        handle: ".sort_handle",
        onEnd: saveSortOnlineDics,
    });
}

const addOnlineDic1El = el("input");
const addOnlineDic2El = el("input");
const addOnlineDic3El = el("input");

const defaultOnlineDic: onlineDicsType = [
    { name: "汉典", url: "https://www.zdic.net/hans/%s", lan: "cn" },
    {
        name: "剑桥",
        url: "https://dictionary.cambridge.org/zhs/%E8%AF%8D%E5%85%B8/%E8%8B%B1%E8%AF%AD-%E6%B1%89%E8%AF%AD-%E7%AE%80%E4%BD%93/%s",
        lan: "en",
    },
    { name: "柯林斯", url: "https://www.collinsdictionary.com/zh/dictionary/english-chinese/%s", lan: "en" },
    { name: "韦氏", url: "https://www.merriam-webster.com/dictionary/%s", lan: "en" },
    { name: "词源在线", url: "https://www.etymonline.com/cn/word/%s", lan: "en" },
];

if (!(await setting.getItem(onlineDicsPath))) {
    await setting.setItem(onlineDicsPath, defaultOnlineDic);
}

const moreOnlineDicEl = el("select", el("option", "添加更多"));
for (const i of defaultOnlineDic) {
    moreOnlineDicEl.append(el("option", i.name, { value: i.name }));
}
moreOnlineDicEl.onchange = () => {
    const i = defaultOnlineDic.find((i) => i.name === moreOnlineDicEl.value);
    if (!i) return;
    onlineDicsEl.append(onlineDicItem(i.name, i.url, i.lan));
    saveSortOnlineDics();
};

settingEl.append(
    el(
        "div",
        { class: "setting_dic" },
        el("h3", "在线词典"),
        onlineDicsEl,
        el(
            "div",
            addOnlineDic1El,
            addOnlineDic2El,
            addOnlineDic3El,
            el("button", iconEl(add_svg), {
                onclick: () => {
                    onlineDicsEl.append(
                        onlineDicItem(addOnlineDic1El.value, addOnlineDic2El.value, addOnlineDic3El.value),
                    );
                    addOnlineDic1El.value = "";
                    addOnlineDic2El.value = "";
                    addOnlineDic3El.value = "";
                    saveSortOnlineDics();
                },
            }),
            moreOnlineDicEl,
        ),
    ),
);

showOnlineDics();

async function saveSortOnlineDics() {
    const l = Array.from(onlineDicsEl.querySelectorAll("li"));
    const dl: onlineDicsType = [];
    for (const i of l) {
        const name = i.querySelectorAll("input")[0].value;
        const url = i.querySelectorAll("input")[1].value;
        const lan = i.querySelectorAll("input")[2].value;
        dl.push({ name, url, lan });
    }
    await setting.setItem(onlineDicsPath, dl);
}

const uploadDicEl = document.getElementById("upload_dic") as HTMLInputElement;
uploadDicEl.onchange = () => {
    const file = uploadDicEl.files[0];
    if (file) {
        const reader = new FileReader();
        reader.readAsText(file);
        reader.onload = () => {
            const dic = JSON.parse(reader.result as string);
            console.log(dic);
            saveDic(dic);
        };
    }
};

async function saveDic(dic: dic) {
    const ndic = {};
    const id = dic.id;
    const l = new Map();
    for (const i in dic.dic) {
        l.set(i, dic.dic[i]);
    }
    for (const x in dic) {
        if (x === "dic") ndic[x] = l;
        else ndic[x] = dic[x];
    }
    await dicStore.setItem(id, ndic);
    dic.dic = undefined;
    dics[id] = dic;
}

async function getIPA(word: string) {
    if (!ipa) {
        const lan = studyLan || "en";
        const i = await ipaStore.getItem(lan);
        if (!i) return "";
        ipa = (await i) as Map<string, string | string[]>;
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

settingEl.append(el("label", ["学习语言", el("input", { "data-path": "lan.learn" })]));

const textCacheIdPath = "file.text.id";
const textCacheId = () => setting.getItem(textCacheIdPath);
const updataTextId = (id: string) => setting.setItem(textCacheIdPath, id);

const rmbwJsonName = "rmbw.json";
const rmbwZipName = "rmbw.zip";

const rmbwGithub1 = "data.json";
const rmbwGithub2 = "text.json";

type allData = {
    bookshelf: { [key: string]: book };
    sections: { [key: string]: section };
    cards: object;
    words: object;
    spell: object;
    card2word: object;
    card2sentence: object;
    actions: object;
};

const allData2Store: { [key: string]: LocalForage } = {
    bookshelf: bookshelfStore,
    sections: sectionsStore,
    cards: cardsStore,
    words: wordsStore,
    spell: spellStore,
    card2word: card2word,
    card2sentence: card2sentence,
    actions: cardActionsStore,
} as { [key in keyof allData]: LocalForage };

async function toAllData() {
    const l: allData = {
        bookshelf: {},
        sections: {},
        cards: {},
        words: {},
        spell: {},
        card2word: {},
        card2sentence: {},
        actions: {},
    };
    for (const storeName in allData2Store) {
        await allData2Store[storeName].iterate((v, k) => {
            l[storeName][k] = v;
        });
    }

    for (const key of ["cards", "spell"]) {
        for (const i in l[key]) {
            const r = l[key][i] as Card;
            const nr = structuredClone(r) as any;
            nr.due = r.due?.getTime() || 0;
            nr.last_review = r.last_review?.getTime() || 0;
            l[key][i] = nr;
        }
    }
    return l;
}
function formatAllData(l: allData) {
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
    });
}
async function getAllData() {
    const l = await toAllData();
    return formatAllData(l);
}

function splitAllData(dl: allData) {
    const l = structuredClone(dl);
    const text: { [id: string]: string } = {};
    for (const i in l.sections) {
        if (i === ignoreWordSection) continue;
        if (!l.sections[i]) continue;
        const t = l.sections[i].text;
        l.sections[i].text = undefined;
        text[i] = t;
    }
    const hash = spark.hash(JSON.stringify(text));
    l.sections[0] = { lastPosi: 0, text: hash, title: "", words: {} };
    return { data: l, text, hash: hash };
}

function jsonStringify(value: unknown, unBr: (path: string[]) => boolean) {
    const l = [];

    function w(value: object, l: string[]) {
        const str: string[] = [];
        for (const i in value) {
            const path = l.concat(i);
            const v = value[i];
            if (typeof v === "object" && v?.constructor === Object) {
                const isBr = !unBr(path);
                if (isBr) {
                    str.push(`"${i}":${w(value[i], path)}`);
                } else {
                    str.push(`"${i}":${JSON.stringify(value[i])}`);
                }
            } else {
                let v = value[i];
                if (typeof v === "undefined") v = null;
                str.push(`"${i}":${JSON.stringify(v)}`);
            }
        }
        if (str.length === 0) return "{}";
        return `{\n${str.join(",\n")}\n}`;
    }
    return w(value as object, l);
}

let isSetData = false;

async function setAllData(json: allData, textId?: string) {
    if (isSetData) return;
    isSetData = true;
    const tip = el("span", "正在更新……");
    putToast(tip, 0);

    if (Object.keys(json.actions).at(-1) < (await cardActionsStore.keys()).at(-1)) {
        const r = await confirm("⚠️本地数据似乎更加新，是否继续更新？\n若更新，可能造成数据丢失");
        if (!r) {
            tip.remove();
            isSetData = false;
            return;
        }
    }

    for (const key of ["cards", "spell"]) {
        for (const i in json[key]) {
            const r = json[key][i] as Card;
            r.due = new Date(r.due);
            r.last_review = new Date(r.last_review);
        }
    }
    const wrongL: { [name: string]: { n: number; o: number } } = {};
    for (const storeName in allData2Store) {
        const oldLength = await allData2Store[storeName].length();
        const newLength = Object.keys(json[storeName]).length;
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
    for (const storeName in allData2Store) {
        await allData2Store[storeName].clear();
        await allData2Store[storeName].setItems(json[storeName]);
    }
    await updataTextId(textId || "");
    requestIdleCallback(() => {
        location.reload();
    });
}

async function xunzip(file: Blob) {
    const zipFileReader = new zip.BlobReader(file);
    const strWriter = new zip.TextWriter();
    const zipReader = new zip.ZipReader(zipFileReader);
    const firstEntry = (await zipReader.getEntries()).shift();
    const str = await firstEntry.getData(strWriter);
    await zipReader.close();
    return str;
}

function xzip(data: string) {
    const fs = new zip.fs.FS();
    fs.addText(rmbwJsonName, data);
    return fs.exportBlob();
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

const DAVConfigPath = { url: "webStore.dav.url", user: "webStore.dav.user", passwd: "webStore.dav.passwd" };

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
            const p = el("span", "上传成功");
            putToast(p);
        })
        .catch(() => {
            putToast(el("span", "上传失败"), 6000);
        });
}

const GitHubConfigPath = {
    user: "webStore.github.user",
    repo: "webStore.github.repo",
    token: "webStore.github.token",
    path: "webStore.github.path",
    download: "webStore.github.download",
};

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

const uploadDataEl = el("input", "上传数据", {
    type: "file",
    onchange: () => {
        const reader = new FileReader();
        reader.readAsText(uploadDataEl.files[0]);
        reader.onload = () => {
            setAllData(JSON.parse(reader.result as string));
        };
    },
});

import { encode } from "js-base64";

function download(text: string, name: string, type?: string) {
    const blob = new Blob([text], { type: type || "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
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

const asyncEl = el("div", [
    el("h2", "数据"),
    el("div", [
        el("button", "导出数据", {
            onclick: async () => {
                const data = await getAllData();
                download(data, rmbwJsonName);
            },
        }),
        uploadDataEl,
    ]),
    el("div", [
        el("h3", "webDAV"),
        el("button", "↓", {
            onclick: async () => {
                const data = await getDAV();
                const str = await xunzip(data);
                setAllData(JSON.parse(str));
            },
        }),
        el("button", "↑", {
            onclick: async () => {
                const data = await getAllData();
                const file = await xzip(data);
                setDAV(file);
            },
        }),
        el("form", [
            el("label", ["url：", el("input", { "data-path": DAVConfigPath.url })]),
            el("label", ["用户名：", el("input", { "data-path": DAVConfigPath.user })]),
            el("label", ["密码：", el("input", { "data-path": DAVConfigPath.passwd })]),
        ]),
        el("h3", "GitHub"),
        el("button", "↓", {
            onclick: async () => {
                putToast(el("span", "下载开始"));
                try {
                    const data = (await downloadGithub(rmbwGithub1)) as allData;
                    const oldId = await textCacheId();
                    const nId = data.sections[0]?.text;
                    if (nId) {
                        let textData: { [key: string]: string } = {};
                        if (oldId !== nId) {
                            textData = await downloadGithub(rmbwGithub2);
                        } else {
                            await sectionsStore.iterate((v: section, k) => {
                                textData[k] = v.text;
                            });
                        }
                        for (const i in textData) {
                            data.sections[i].text = textData[i];
                        }
                        data.sections[0] = undefined;
                    }
                    setAllData(data, nId);
                } catch (error) {
                    putToast(el("span", "下载失败"), 6000);
                    throw error;
                }
            },
        }),
        el("button", "↑", {
            onclick: async () => {
                putToast(el("span", "上传开始"));
                try {
                    const x = await toAllData();
                    const v = splitAllData(x);

                    const oldId = await textCacheId();
                    if (oldId !== v.hash) {
                        await uploadGithub(JSON.stringify(v.text, null, 2), rmbwGithub2, "更新文本");
                    }
                    await uploadGithub(formatAllData(v.data), rmbwGithub1, "更新数据");
                    updataTextId(v.hash);
                    putToast(el("span", "上传成功"));
                } catch (error) {
                    putToast(el("span", "上传失败"), 6000);
                    throw error;
                }
            },
        }),
        el("form", [
            el("label", ["用户：", el("input", { "data-path": GitHubConfigPath.user })]),
            el("label", ["仓库（repo）：", el("input", { "data-path": GitHubConfigPath.repo })]),
            el("label", [
                "token：",
                el("input", { "data-path": GitHubConfigPath.token }),
                el("a", { href: "https://github.com/settings/tokens/new?description=rmbw2&scopes=repo" }, "创建"),
            ]),
            el("label", ["path：", el("input", { "data-path": GitHubConfigPath.path })]),
            el("label", ["替换下载：", el("input", { "data-path": GitHubConfigPath.download })]),
        ]),
    ]),
]);

settingEl.append(asyncEl);

async function getCSV(type: "word" | "spell" | "sen") {
    const l = [];
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

const testSpeedLanEl = el("input");
const testSpeedContentEl = el("p");
const readSpeedEl = el("input", { type: "number", "data-path": "user.readSpeed" });

settingEl.append(
    el("div", [
        el("h2", "复习"),
        el("button", "导出词句", {
            onclick: async () => {
                const csv = await getCSV("word");
                download(csv, "review.csv", "text/csv");
            },
        }),
        el("button", "导出拼写", {
            onclick: async () => {
                const csv = await getCSV("spell");
                download(csv, "review_spell.csv", "text/csv");
            },
        }),
        el("br"),
        a("https://huggingface.co/spaces/open-spaced-repetition/fsrs4anki_app").add("参数优化器").el,
        el("br"),
        el("label", ["单词参数：", el("input", { "data-path": "fsrs.word.w" })]),
        el("label", ["拼写参数：", el("input", { "data-path": "fsrs.spell.w" })]),
        el("label", ["句子参数：", el("input", { "data-path": "fsrs.sen.w" })]),

        el("h3", "阅读速度"),
        el("p", "测试阅读速度"),
        testSpeedLanEl,
        el("button", "load", {
            onclick: async () => {
                const l: aim = [{ content: `生成一段${testSpeedLanEl.value || "en"}小短文，使用简单词`, role: "user" }];
                testSpeedContentEl.setAttribute("data-text", await ai(l).text);
            },
        }),
        el("button", "start", {
            onclick: () => {
                testSpeedContentEl.setAttribute("data-time", String(time()));
                testSpeedContentEl.innerText = testSpeedContentEl.getAttribute("data-text");
            },
        }),
        testSpeedContentEl,
        el("button", "finish", {
            onclick: () => {
                const startTime = Number(testSpeedContentEl.getAttribute("data-time"));
                const text = testSpeedContentEl.innerText;
                const endTime = time();

                const segmenter = new Segmenter(testSpeedLanEl.value || "en", { granularity: "word" });
                const segments = segmenter.segment(text);
                const wordsCount = Array.from(segments).length;
                readSpeedEl.value = String(Math.round((endTime - startTime) / wordsCount));
                readSpeedEl.dispatchEvent(new Event("input"));
            },
        }),
        el("label", [readSpeedEl, "ms/word"]),
        el("h3", "复习休息"),
        el("input", { type: "number", "data-path": "review.maxCount", value: String(maxReviewCount) }),
        el("span", "0为不限制，刷新生效"),
    ]),
);

const ttsEngineEl = el("select", { "data-path": ttsEngineConfig }, [
    el("option", "浏览器", { value: "browser" }),
    el("option", "微软", { value: "ms" }),
]);

const loadTTSVoicesEl = el("button", "load");
const voicesListEl = el("select");
loadTTSVoicesEl.onclick = async () => {
    voicesListEl.innerHTML = "";
    if ((await getTtsEngine()) === "browser") {
        const list = speechSynthesis.getVoices();
        for (const v of list) {
            const text = `${v.name.replace(/Microsoft (\w+) Online \(Natural\)/, "$1")}`;
            const op = el("option", text, { value: v.name });
            voicesListEl.append(op);
        }
    } else {
        const list = await tts.getVoices();
        for (const v of list) {
            const text = `${v.Gender === "Male" ? "♂️" : "♀️"} ${v.FriendlyName.replace(/Microsoft (\w+) Online \(Natural\)/, "$1")}`;
            const op = el("option", text, { value: v.ShortName });
            voicesListEl.append(op);
        }
    }
    voicesListEl.value = await setting.getItem(ttsVoiceConfig);
    voicesListEl.onchange = () => {
        const name = voicesListEl.value;
        tts.setMetadata(name, OUTPUT_FORMAT.WEBM_24KHZ_16BIT_MONO_OPUS);
        setting.setItem(ttsVoiceConfig, name);
        ttsCache.clear();
    };
};

settingEl.append(el("div", [el("h2", "tts"), ttsEngineEl, loadTTSVoicesEl, voicesListEl]));

settingEl.append(
    el("div", [
        el("h2", "缓存"),
        el("button", "tts", {
            onclick: () => {
                ttsCache.clear();
            },
        }),
        el("button", "trans", {
            onclick: () => {
                transCache.clear();
            },
        }),
    ]),
);

settingEl.append(view().add([ele("h2").add(txt("文档")), a("./docs/docs.html").add("点击查看文档")]).el);

settingEl.append(
    el("div", { class: "about" }, [
        el("h2", "关于"),
        el("div", [
            el("div", [el("img", { width: "32", src: "./logo/logo.svg" }), "rmbw2"]),
            el(
                "a",
                el("img", {
                    src: "https://www.netlify.com/v3/img/components/netlify-light.svg",
                    alt: "Deploys by Netlify",
                    loading: "lazy",
                }),
            ),
            el("div", [
                el("button", "更新", {
                    onclick: async () => {
                        const cacheKeepList = ["v2"];
                        const keyList = await caches.keys();
                        const cachesToDelete = keyList.filter((key) => !cacheKeepList.includes(key));
                        await Promise.all(
                            cachesToDelete.map(async (key) => {
                                await caches.delete(key);
                            }),
                        );
                    },
                }),
            ]),
            el("div", [
                el(
                    "a",
                    { href: "https://github.com/xushengfeng/xlinkote/", target: "_blank" },
                    "项目开源地址",
                    el("img", { src: githubIcon }),
                ),
            ]),
            el("div", el("a", { href: "https://github.com/xushengfeng/xlinkote/blob/master/LICENSE" }, "GPL-3.0")),
            el("div", [
                "Designed and programmed by xsf ",
                el("a", { href: "mailto:xushengfeng_zg@163.com" }, "xushengfeng_zg@163.com"),
            ]),
        ]),
    ]),
);

for (const el of Array.from(settingEl.querySelectorAll("[data-path]")) as HTMLElement[]) {
    const path = el.getAttribute("data-path");
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
        el.onchange = () => {
            setting.setItem(path, el.value);
        };
    }
}

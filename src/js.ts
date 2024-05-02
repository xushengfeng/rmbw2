/// <reference types="vite/client" />

import { el, text, setStyle } from "redom";

import localforage from "localforage";
import { extendPrototype } from "localforage-setitems";
extendPrototype(localforage);

import * as zip from "@zip.js/zip.js";

import mammoth from "mammoth";

import { hyphenate } from "hyphen/en";
const hyphenChar = "·";

var Segmenter = Intl.Segmenter;
if (!Segmenter) {
    console.warn("no support Intl.Segmenter");
    import("intl-segmenter-polyfill/dist/bundled").then(async (v) => {
        // @ts-ignore
        Segmenter = await v.createIntlSegmenterPolyfill();
    });
}

import "@oddbird/popover-polyfill";

import Keyboard from "simple-keyboard";

import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts-browserify";

import { Card, createEmptyCard, generatorParameters, FSRS, Rating, State } from "ts-fsrs";

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
    } else {
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0,
                v = c === "x" ? r : (r & 0x3) | 0x8;
            return v.toString(16).slice(0, 8);
        });
    }
}

function time() {
    return new Date().getTime();
}

if ("serviceWorker" in navigator) {
    if (import.meta.env.PROD) {
        navigator.serviceWorker.register("/sw.js");
    }
}

var setting = localforage.createInstance({
    name: "setting",
    driver: localforage.LOCALSTORAGE,
});

/************************************UI */

navigator?.storage?.persist();

document.body.translate = false;

let learnLang = "en";

document.getElementById("main").lang = learnLang;

const menuEl = document.getElementById("menu");
let willShowMenu = false;
function showMenu(x: number, y: number) {
    menuEl.style.left = x + "px";
    menuEl.style.top = y + "px";
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
    let dialog = document.createElement("dialog");
    dialog.className = "interModal";
    let me = document.createElement("span");
    let cancelEl = document.createElement("button");
    cancelEl.innerText = "取消";
    cancelEl.classList.add("cancel_b");
    let okEl = document.createElement("button");
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
            re(iel ? iel.querySelector("input").value : true);
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
    f: (index: number, item: ItemType, remove: () => void) => HTMLElement | Promise<HTMLElement>
) {
    let iHeight = style.iHeight;
    let gap = style.gap ?? 0;
    // padding 还需要pel自己设定
    let paddingTop = style.paddingTop ?? 0;
    let paddingLeft = style.paddingLeft ?? 0;
    let paddingBotton = style.paddingBotton ?? 0;

    let blankEl = el("div", {
        style: { width: "1px", position: "absolute", top: "0" },
    });
    const setBlankHeight = (len: number) =>
        (blankEl.style.height = iHeight * len + gap * len + paddingTop + paddingBotton + "px");
    setBlankHeight(list.length);
    pel.append(blankEl);
    const dataI = "data-v-i";
    async function show(newList?: any[]) {
        if (newList) {
            list = newList;
            setBlankHeight(list.length);
        }
        let startI = Math.ceil((pel.scrollTop - paddingTop) / (iHeight + gap));
        let endI = Math.floor((pel.scrollTop - paddingTop + pel.offsetHeight) / (iHeight + gap));
        let buffer = Math.min(Math.floor((endI - startI) / 3), 15);
        startI -= buffer;
        endI += buffer;
        startI = Math.max(0, startI);
        endI = Math.min(list.length - 1, endI);
        if (list.length < 100 && !newList) {
            startI = 0;
            endI = list.length - 1;
            if (pel.querySelectorAll(`:scope > [${dataI}]`).length === list.length) return;
        }
        let oldRangeList: number[] = [];
        pel.querySelectorAll(`:scope > [${dataI}]`).forEach((el: HTMLElement) => {
            oldRangeList.push(Number(el.getAttribute(dataI)));
        });
        for (let i of oldRangeList) {
            if (i < startI || endI < i || newList) pel.querySelector(`:scope > [${dataI}="${i}"]`).remove();
        }
        for (let i = startI; i <= endI; i++) {
            let iel = await f(i, list[i], () => {
                list = list.toSpliced(i, 1);
                show(list);
            });
            setStyle(iel, {
                position: "absolute",
                top: paddingTop + i * (iHeight + gap) + "px",
                left: paddingLeft + "px",
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
        for (let mutation of mutationsList) {
            if (mutation.type === "childList" && Array.from(mutation.removedNodes).includes(blankEl)) {
                pel.removeEventListener("scroll", s);
            }
        }
    });
    observer.observe(pel, { childList: true });
    return { show };
}

/************************************main */
const MARKWORD = "mark_word";
const TMPMARKWORD = "tmp_mark_word";
const TRANSLATE = "translate";
const DICSENTENCE = "dic_sentence";
const HIDEMEANS = "hide_means";
const TODOMARK = "to_visit";
const TODOMARK1 = "to_visit1";
const NOTEDIALOG = "note_dialog";
const AIDIALOG = "ai_dialog";
const DICDIALOG = "dic_dialog";
const SELECTEDITEM = "selected_item";

const booksEl = document.getElementById("books") as HTMLDialogElement;
const localBookEl = el("div", { class: "books" });
const onlineBookEl = el("div", { class: "books", style: { display: "none" } });
booksEl.append(
    el("div", { style: { display: "flex" } }, [
        el("div", "本地书籍", {
            onclick: () => {
                showBooks();
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
    onlineBookEl
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
const translateAll = document.getElementById("translate_all");
translateAll.onclick = translateContext;
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
        ttsWordEl,
        moreWordsEl,
    ]),
    el("div", { style: { display: "flex" } }, [dicTransB, dicTransContent]),
    el("div", { style: { display: "flex" } }, [dicMinEl, addMeanEl, editMeanEl]),
    dicDetailsEl
);

function putToast(ele: HTMLElement, time?: number) {
    let toastEl = document.body.querySelector(".toast") as HTMLElement;
    if (!toastEl) {
        toastEl = el("div", { class: "toast", popover: "auto" });
        document.body.append(toastEl);
    }
    toastEl.showPopover();
    toastEl.append(ele);

    if (time === undefined) time = 2000;
    if (time) {
        setTimeout(() => {
            ele.remove();
        }, time);
    }

    const observer = new MutationObserver((mutationsList) => {
        for (let mutation of mutationsList) {
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

var bookshelfStore = localforage.createInstance({ name: "bookshelf" });
var sectionsStore = localforage.createInstance({ name: "sections" });

type book = {
    name: string;
    shortName?: string;
    id: string;
    visitTime: number;
    updateTime: number;
    type: "word" | "text";
    cover?: string;
    author?: string;
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
};

async function getBooksById(id: string) {
    if (id === "0") return coreWordBook;
    return (await bookshelfStore.getItem(id)) as book;
}
async function getSection(id: string) {
    return (await sectionsStore.getItem(id)) as section;
}

async function getBookShortTitle(bookId: string) {
    return (await getBooksById(bookId)).shortName || (await getBooksById(bookId)).name;
}

async function getTitle(bookId: string, sectionN: string, x?: string) {
    let section = await getSection(sectionN);
    const t = `${await getBookShortTitle(bookId)}${x || " - "}${section.title}`;
    return t;
}

async function getTitleEl(bookId: string, sectionN: string, x?: string) {
    const title = await getTitle(bookId, sectionN, x);
    return el("span", { class: "source_title" }, title);
}

async function newBook() {
    let id = uuid();
    let sid = uuid();
    let book: book = {
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
    let s = newSection();
    bookshelfStore.setItem(id, book);
    await sectionsStore.setItem(sid, s);
    return { book: id, sections: sid };
}

function newSection() {
    let s: section = { title: "新章节", lastPosi: 0, text: "", words: {} };
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

var coverCache = localforage.createInstance({ name: "cache", storeName: "cover" });

async function getBookCover(url: string) {
    let src = (await getOnlineBooksUrl()) + "/source/" + url;
    return src;
}

async function getOnlineBooksUrl() {
    return (
        ((await setting.getItem("onlineBooks.url")) as string) ||
        "https://raw.githubusercontent.com/xushengfeng/rmbw-book/master"
    ).replace(/\/$/, "");
}

async function getOnlineBooks() {
    fetch((await getOnlineBooksUrl()) + "/index.json")
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
    }[]
) {
    onlineBookEl.innerHTML = "";
    for (let book of books) {
        let url = "";
        if (book.cover) url = await getBookCover(book.cover);
        let div = bookEl(book.name, url);
        let bookCover = div.querySelector("div");
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
                let s = [];
                let count = 0;
                const fetchPromises = book.sections.map(async (item) => {
                    const { id, path, title } = item;
                    const response = await fetch((await getOnlineBooksUrl()) + "/source/" + path);
                    const content = await response.text();
                    count++;
                    const p = (count / book.sections.length) * 100;
                    bookCover.style.clipPath = `xywh(0 ${100 - p}% 100% 100%)`;
                    return { id, content, title };
                });
                Promise.all(fetchPromises)
                    .then(async (results) => {
                        console.log(results);
                        for (let i of results) {
                            s.push(i.id);
                            let section = (await sectionsStore.getItem(i.id)) as section;
                            if (section) {
                                let s = changePosi(section, i.content);
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
                        for (let i in book) {
                            xbook[i] = book[i];
                        }
                        xbook.sections = s;
                        xbook.updateTime = book.updateTime;
                        await bookshelfStore.setItem(book.id, xbook);
                        if (book.cover) {
                            let src = await getBookCover(book.cover);
                            const b = await (await fetch(src)).blob();
                            coverCache.setItem(book.id, b);
                        }
                        showBooks();
                    })
                    .catch((error) => {
                        console.error(error);
                    });
            }
        };
        onlineBookEl.append(div);
    }
}

async function saveLanguagePackage(lan: string, section: { id: string; path: string }[]) {
    const fetchPromises = section.map(async (item) => {
        const { id, path } = item;
        const response = await fetch((await getOnlineBooksUrl()) + "/source/" + path);
        const content = await response.json();
        return { id, content };
    });
    Promise.all(fetchPromises).then(async (results) => {
        console.log(results);
        for (let i of results) {
            const map = new Map();
            for (let x in i.content) {
                map.set(x, i.content[x]);
            }
            if (i.id === "ipa") {
                ipaStore.setItem(lan, map);
            }
            if (i.id === "variant") {
                variantStore.setItem(lan, map);
            }
        }
    });
}

addBookEl.onclick = async () => {
    let b = await newBook();
    nowBook = b;
    let book = await getBooksById(nowBook.book);
    showBook(book);
    changeEdit(true);
    booksEl.close();
};

addSectionEL.onclick = async () => {
    if (nowBook.book === "0") return;
    if (!nowBook.book) nowBook = await newBook();
    let book = await getBooksById(nowBook.book);
    let sid = uuid();
    book.sections.push(sid);
    book.lastPosi = book.sections.length - 1;
    let s = newSection();
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
let bookLan = ((await setting.getItem("lan.learn")) as string) || "en";

showBooks();
setBookS();

async function setSectionTitle() {
    const title = (await getSection(nowBook.sections)).title;
    let titleEl = el("input", { style: { "font-size": "inherit" } });
    titleEl.value = title;
    titleEl.select();
    const iel = el("div");
    iel.append(
        titleEl,
        el("button", "ai", {
            onclick: async () => {
                let f = new autoFun.def({
                    input: { text: "string" },
                    script: [`为输入的文章起个标题`],
                    output: "title:string",
                });
                const ff = f.run(editText);
                let stopEl = el("button", iconEl(close_svg));
                stopEl.onclick = () => {
                    ff.stop.abort();
                    pel.remove();
                };
                let pel = el("div", [el("p", `AI正在思考标题`), stopEl]);
                putToast(pel, 0);
                ff.result.then((r) => {
                    pel.remove();
                    titleEl.value = r["title"];
                });
            },
        })
    );
    titleEl.focus();
    const nTitle = (await interModal("重命名章节标题", iel, true)) as string;
    if (!nTitle) return;
    let sectionId = nowBook.sections;
    let section = await getSection(sectionId);
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
        let sectionId = nowBook.sections;
        let section = await getSection(sectionId);
        if (!isWordBook) bookContentEl.querySelector("h1").innerText = section.title;
    }
}

function bookEl(name: string, coverUrl?: string) {
    let bookIEl = el("div");
    const cover = el("div");
    let titleEl = el("span");
    let bookCover = el("div");
    bookCover.innerText = name;
    cover.append(bookCover);
    if (coverUrl) {
        let bookCover = el("img");
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

async function showBooks() {
    localBookEl.innerHTML = "";
    localBookEl.append(addBookEl);
    let bookList: book[] = [];
    await bookshelfStore.iterate((book: book) => {
        bookList.push(book);
    });
    bookList = bookList.toSorted((a, b) => b.visitTime - a.visitTime);
    for (let book of bookList) {
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
            bookIEl = bookEl(book.name, url);
        } else {
            bookIEl = bookEl(book.name);
        }
        localBookEl.append(bookIEl);
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
            e.stopPropagation();
            const book = await getBooksById(id);
            menuEl.innerHTML = "";
            let renameEl = document.createElement("div");
            renameEl.innerText = "重命名";
            renameEl.onclick = async () => {
                let name = await prompt("更改书名", book.name);
                if (name) {
                    bookIEl.querySelector("span").innerText = name;
                    if (bookIEl.innerText) bookIEl.querySelector("div").innerText = name;
                    book.name = name;
                    bookshelfStore.setItem(book.id, book);
                    setBookS();
                }
            };
            let editMetaEl = el("div", "元数据", {
                onclick: () => {
                    let formEl = el("form", [
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
                    let submitEl = el("button", "确定");
                    let metaEl = el("dialog", [el("div", `id: ${book.id}`), formEl, submitEl]) as HTMLDialogElement;
                    submitEl.onclick = () => {
                        let data = new FormData(formEl);
                        data.forEach((v, k) => {
                            book[k] = v;
                        });
                        bookshelfStore.setItem(book.id, book);
                        metaEl.close();
                        setBookS();
                    };
                    dialogX(metaEl);
                },
            });
            menuEl.append(renameEl, editMetaEl);
            showMenu(e.clientX, e.clientY);
        };
    }
}
function showBook(book: book) {
    nowBook.book = book.id;
    nowBook.sections = book.sections[book.lastPosi];
    showBookSections(book.sections);
    showBookContent(book.sections[book.lastPosi]);
    setBookS();
    isWordBook = book.type === "word";
    bookLan = book.language;
}
async function showBookSections(sections: book["sections"]) {
    sections = structuredClone(sections);
    bookSectionsEl.innerHTML = "";
    vlist(bookSectionsEl, sections, { iHeight: 24, paddingTop: 16, paddingLeft: 16 }, async (i) => {
        let sEl = el("div");
        let s = await getSection(sections[i]);
        sEl.innerText = sEl.title = s.title || `章节${Number(i) + 1}`;
        if (nowBook.sections === sections[i]) sEl.classList.add(SELECTEDITEM);
        for (let i in s.words) {
            if (!s.words[i].visit) {
                sEl.classList.add(TODOMARK);
                break;
            }
        }
        sEl.onclick = async () => {
            sEl.classList.remove(TODOMARK);

            bookSectionsEl.querySelector(`.${SELECTEDITEM}`).classList.remove(SELECTEDITEM);
            sEl.classList.add(SELECTEDITEM);

            nowBook.sections = sections[i];
            showBookContent(sections[i]);
            setBookS();
            if (nowBook.book === "0") return;
            let book = await getBooksById(nowBook.book);
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
                            const t = await setSectionTitle();
                            if (t) sEl.innerText = t;
                        },
                    })
                );
            }
            menuEl.append(
                el("div", "复制id", {
                    onclick: async () => {
                        navigator.clipboard.writeText(sections[i]);
                    },
                })
            );
            showMenu(e.clientX, e.clientY);
        };
        return sEl;
    });
}

let contentP: string[] = [];

import Fuse from "fuse.js";

async function showBookContent(id: string) {
    let s = await getSection(id);
    if (id === wordSection) {
        let l: string[] = [];
        await wordsStore.iterate((v: record) => {
            l.push(v.word);
        });
        let text = l.join("\n");
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
            })
        );

    contentP = [];

    if (isWordBook) await showWordBook(s);
    else await showNormalBook(s);

    setScrollPosi(bookContentContainerEl, contentScrollPosi);

    if (!isWordBook) bookContentEl.append(dicEl);
}

async function showWordBook(s: section) {
    const rawWordList: { text: string; c: record; type?: "ignore" | "learn"; means?: number }[] = [];
    let wordList: typeof rawWordList = [];
    let l = s.text.trim().split("\n");
    const cards: Map<string, Card> = new Map();
    await cardsStore.iterate((v: Card, k) => {
        cards.set(k, v);
    });
    const words: Map<string, record> = new Map();
    await wordsStore.iterate((v: record, k) => {
        if (l.includes(k)) words.set(k, v);
    });
    const ignoreWords = await getIgnoreWords();
    let matchWords = 0;
    let means1 = 0;
    const now = new Date();
    for (let i of l) {
        let t = i;
        let c: record;
        let type: "ignore" | "learn" = null;
        let means = 0;
        if (words.has(i)) {
            c = words.get(i);
            type = "learn";
            matchWords++;
            let r = 0;
            for (let j of c.means) {
                let x = cards.get(j.card_id);
                r += fsrs.get_retrievability(x, now, false) || 0;
            }
            means = r / c.means.length;
        } else if (ignoreWords.includes(i)) {
            type = "ignore";
            matchWords++;
            means = 1;
        }
        means1 += means;
        if (type) rawWordList.push({ text: t, c: c, type, means });
        else rawWordList.push({ text: t, c: c });
    }
    wordList = sortWordList(rawWordList, (await setting.getItem(WordSortPath)) || "raw");
    const search = el("input", {
        oninput: () => {
            const fuse = new Fuse(wordList, {
                includeMatches: true,
                findAllMatches: true,
                useExtendedSearch: true,
                includeScore: true,
                keys: ["text"],
            });
            let fr = fuse.search(search.value);
            let list = fr.map((i) => i.item);
            show.show(list.length ? list : wordList);
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
    for (let i of sortMap) {
        sortEl.append(
            el("span", i.name, {
                onclick: () => {
                    wordList = sortWordList(rawWordList, i.type);
                    show.show(wordList);
                    setting.setItem(WordSortPath, i.type);
                },
            })
        );
    }
    const chartEl = el(
        "div",
        el(
            "div",
            `${String(l.length)} ${matchWords} ${means1.toFixed(1)}`,
            el(
                "div",
                { class: "litle_progress" },
                el("div", { style: { width: (matchWords / l.length) * 100 + "%", background: "#00f" } }),
                el("div", { style: { width: (means1 / l.length) * 100 + "%", background: "#0f0" } })
            )
        ),
        el("div", `拼写 加载中`, el("div", { class: "litle_progress" })),
        {
            onclick: () => {
                showWordBookMore(wordList);
            },
        }
    );
    bookContentContainerEl.append(el("div", { class: "words_book_top" }, chartEl, search, sortEl));

    requestIdleCallback(async () => {
        let spell = 0;
        await spellStore.iterate((v: Card, k: string) => {
            if (l.includes(k)) {
                spell += fsrs.get_retrievability(v, now, false) || 0;
            }
        });
        for (let i of l) if (ignoreWords.includes(i)) spell += 1;
        chartEl.lastElementChild.remove();
        chartEl.append(
            el(
                "div",
                `拼写 ${spell.toFixed(1)}`,
                el(
                    "div",
                    { class: "litle_progress" },
                    el("div", { style: { width: (spell / l.length) * 100 + "%", background: "#00f" } })
                )
            )
        );
    });

    const show = vlist(
        bookContentContainerEl,
        wordList,
        { iHeight: 24, gap: 8, paddingTop: 120, paddingBotton: 8 },
        (i, item) => {
            let p = el("p", item.text);
            if (item.type) {
                p.classList.add(item.type);
            }
            p.oncontextmenu = (e) => {
                e.preventDefault();
                menuEl.innerHTML = "";
                showMenu(e.clientX, e.clientY);
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
                    })
                );
            };
            if (item.type === "learn") {
                p.onclick = () => {
                    const p = tmpDicEl;
                    p.showPopover();
                    async function show() {
                        p.innerHTML = "";
                        const books = await wordBooksByWord(item.text);
                        const booksEl = el("div");
                        for (let i of books) {
                            const bookN = (await getBooksById(i.book)).name;
                            const s = (await getSection(i.section)).title;
                            booksEl.append(el("span", s, { title: bookN }));
                        }
                        p.append(booksEl);
                        if (item.c.note) {
                            const note = el("p");
                            note.innerText = item.c.note;
                            p.append(
                                el(
                                    "div",
                                    el("button", iconEl(pen_svg), {
                                        onclick: () => {
                                            addP(item.c.note, item.text, null, null, (text) => {
                                                item.c.note = text.trim();
                                                wordsStore.setItem(item.text, item.c);
                                                show();
                                            });
                                        },
                                    }),
                                    note
                                )
                            );
                        }
                        for (let i of item.c.means) {
                            p.append(
                                el(
                                    "div",
                                    el("button", iconEl(pen_svg), {
                                        onclick: () => {
                                            addP(i.text, item.text, null, null, (text) => {
                                                i.text = text.trim();
                                                wordsStore.setItem(item.text, item.c);
                                                show();
                                            });
                                        },
                                    }),
                                    el("div", await disCard2(i))
                                )
                            );
                        }
                    }
                    show();
                };
            }
            return p;
        }
    );
}

const WordSortPath = "words.sort";

type WordSortType = "raw" | "az" | "za" | "10" | "01" | "random";

function sortWordList(
    list: { text: string; c: record; type?: "ignore" | "learn"; means?: number }[],
    type: WordSortType
) {
    if (type === "raw") return list;
    if (type === "az")
        return list.toSorted((a, b) => {
            return a.text.localeCompare(b.text, bookLan);
        });
    if (type === "za")
        return list.toSorted((a, b) => {
            return b.text.localeCompare(a.text, bookLan);
        });
    if (type === "01") {
        return list.toSorted((a, b) => (a.means || 0) - (b.means || 0));
    }
    if (type === "10") {
        return list.toSorted((a, b) => (b.means || 0) - (a.means || 0));
    }
    const rList: typeof list = [];
    while (rList.length < list.length) {
        const i = Math.floor(Math.random() * list.length);
        const x = list.at(i);
        if (x) {
            rList.push(x);
            list.with(i, null);
        }
    }
    return rList;
}

async function showWordBookMore(wordList: { text: string; c: record; type?: "ignore" | "learn"; means?: number }[]) {
    const d = el("dialog") as HTMLDialogElement;
    dialogX(d);
    const unlearnL = wordList.filter((w) => w.means === undefined);
    d.append(
        el(
            "div",
            { style: { display: "flex", "flex-direction": "row-reverse" } },
            el("button", iconEl(close_svg), { onclick: () => d.close() })
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
            })
        )
    );
    let bookIds: { [id: string]: number } = {};
    wordList.forEach((w) => {
        if (w.type === "learn") {
            w.c.means.forEach((m) => {
                m.contexts.forEach((c) => {
                    const id = c.source.book;
                    if (bookIds[id]) bookIds[id]++;
                    else bookIds[id] = 1;
                });
            });
        }
    });
    const l = Object.entries(bookIds).sort((a, b) => b[1] - a[1]);
    const ignore = wordList.filter((w) => w.type === "ignore").length;
    const max = Math.max(l[0][1], ignore);
    const pEl = el("div", { class: "words_from" });
    for (let i of l) {
        pEl.append(
            el("span", (await getBooksById(i[0])).name),
            el("span", i[1]),
            el("div", { style: { width: (i[1] / max) * 100 + "%" } })
        );
    }
    pEl.append(el("span", "忽略"), el("span", ignore), el("div", { style: { width: (ignore / max) * 100 + "%" } }));
    d.append(el("p", "单词来源"), pEl);
}

async function textTransformer(text: string) {
    if (await setting.getItem(readerSettingPath.apostrophe)) {
        text = text.replace(/’(\w)/g, "'$1");
    }
    return text;
}

let wordFreq: { [word: string]: number } = {};
let properN: string[] = [];

async function showNormalBook(s: section) {
    const segmenter = new Segmenter(bookLan, { granularity: "word" });
    const osL = Array.from(new Segmenter(bookLan, { granularity: "sentence" }).segment(s.text));
    const sL: Intl.SegmentData[] = [];
    const sx = ["Mr.", "Mrs.", "Ms.", "Miss.", "Dr.", "Prof.", "Capt.", "Lt.", "Sgt.", "Rev.", "Sr.", "Jr.", "St."].map(
        (i) => i + " "
    );
    let sxS = sx.map((i) => ` ${i}`);
    for (let i = 0; i < osL.length; i++) {
        const seg = osL[i].segment;
        if (seg.endsWith(" ") && (sx.includes(seg) || sxS.some((i) => seg.endsWith(i)))) {
            let x = osL[i];
            const next = osL[i + 1];
            if (next) x.segment += next.segment;
            sL.push(x);
            i++;
        } else {
            sL.push(osL[i]);
        }
    }
    let plist: { text: string; start: number; end: number; isWord: boolean }[][][] = [[]];
    for (const sentence of sL) {
        if (/^\n+/.test(sentence.segment)) {
            plist.push([]);
            continue;
        }
        let sen: (typeof plist)[0][0] = [];
        plist.at(-1).push(sen); // last p add sen
        const wL = Array.from(segmenter.segment(sentence.segment));
        for (let word of wL) {
            if (word.segment === "#" && sen?.at(-1)?.text === "#") {
                sen.at(-1).text += "#";
                sen.at(-1).end += 1;
            } else {
                let s = sentence.index + word.index;
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
                if ((await getBooksById(nowBook.book)).canEdit) setSectionTitle();
            },
        })
    );

    wordFreq = {};
    let highFreq: string[] = [];
    properN = [];

    for (let paragraph of plist) {
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
        if (t) pel = document.createElement("h" + t);

        if (paragraph.length === 1 && paragraph[0].length >= 3 && paragraph[0].every((i) => i.text === "-")) {
            pel = el("hr");
            bookContentEl.append(pel);
            continue;
        }

        let pText = editText.slice(paragraph[0]?.[0]?.start ?? null, paragraph.at(-1)?.at(-1)?.end ?? null);

        if (pText) {
            let playEl = el("div", iconEl(recume_svg), { "data-play": String(contentP.length) });
            pel.append(playEl);
            pel.append(
                el("div", iconEl(more_svg), {
                    "data-play-l": String(contentP.length),
                })
            );
        }

        contentP.push(pText);

        for (const si in paragraph) {
            const sen = paragraph[si];
            const senEl = el("span");
            for (const i in sen) {
                const word = sen[i];
                if (si === "0" && Number(i) < t) continue;
                let span = document.createElement("span");
                span.innerText = await textTransformer(word.text);
                for (let i in s.words) {
                    let index = s.words[i].index;
                    if (index[0] === word.start && index[1] === word.end) {
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

                if (!t && i != "0" && word.text.match(/^[A-Z]/)) properN.push(word.text);
            }
            senEl.onclick = async (ev) => {
                let playEl = ev.target as HTMLElement;
                if (playEl.getAttribute("data-play")) {
                    pTTS(Number(playEl.getAttribute("data-play")));
                    return;
                }
                if (playEl.getAttribute("data-play-l")) {
                    showLisent(contentP[Number(playEl.getAttribute("data-play-l"))]);
                    return;
                }
                const span = ev.target as HTMLSpanElement;
                if (span.tagName != "SPAN") return;
                if (span.getAttribute("data-w") === "false") return;

                let s = sen[0].start,
                    e = sen.at(-1).end;

                let id = await saveCard({
                    key: span.getAttribute("data-t"),
                    index: { start: Number(span.getAttribute("data-s")), end: Number(span.getAttribute("data-e")) },
                    cindex: { start: s, end: e },
                });
                if (
                    span.classList.contains(MARKWORD) ||
                    highFreq.includes(lemmatizer(span.innerText.toLocaleLowerCase()))
                ) {
                    showDic(id);
                }

                span.classList.add(MARKWORD);
            };

            senEl.oncontextmenu = async (ev) => {
                ev.preventDefault();
                const span = ev.target as HTMLSpanElement;
                if (span.tagName != "SPAN") return;
                let start = Number(span.getAttribute("data-s"));
                let end = Number(span.getAttribute("data-e"));
                let text = await changeEdit(true);
                text.selectionStart = start;
                text.selectionEnd = end;
                text.focus();
            };
            pel.append(senEl);
        }

        bookContentEl.append(pel);
    }

    for (let i in wordFreq) {
        if (wordFreq[i] >= 3) highFreq.push(i);
    }
}

let contentScrollPosi = 0;
function setScrollPosi(el: HTMLElement, posi: number) {
    el.scrollTop = posi * (el.scrollHeight - el.offsetHeight);
}
function getScrollPosi(el: HTMLElement) {
    let n = el.scrollTop / (el.scrollHeight - el.offsetHeight);
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
        for (let s of l) {
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
        ])
    );
    dialogX(d);
}

async function translateContext() {
    let filter = bookContentEl.querySelector("p > span[data-trans]") ? [] : await transCache.keys();
    let l = Array.from(bookContentEl.querySelectorAll("p > span")) as HTMLSpanElement[];
    for (let i in l) {
        const r = (await transCache.getItem(l[i].innerText.trim())) as string;
        if (r) l[i].setAttribute("data-trans", r);
    }

    l = l.filter((i) => !filter.includes(i.innerText.trim()));
    const text = l.map((i) => i.innerText);

    if (text.length === 0) return;

    let f = new autoFun.def({ script: [`把输入的语言翻译成中文`], output: "list:[]" });
    const ff = f.run(text as any);
    let stopEl = el("button", iconEl(close_svg));
    stopEl.onclick = () => {
        ff.stop.abort();
        pel.remove();
    };
    let pel = el("div", [el("p", `AI正在翻译全文`), stopEl]);
    putToast(pel, 0);
    ff.result.then((r) => {
        pel.remove();
        if (r["list"].length != text.length) return;
        for (let i in l) {
            l[i].setAttribute("data-trans", r["list"][i]);
            transCache.setItem(text[i].trim(), r["list"][i]);
        }
    });
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

{
    for (let i = 12; i <= 28; i += 2) {
        bookStyleList.fontSize.push(i);
    }
    bookStyleList.fontSize.push(32, 40, 56, 72, 96, 128);
    for (let i = 20; i <= 60; i += 5) {
        bookStyleList.contentWidth.push(i);
    }
    for (let i = 1; i <= 2.6; i += 0.2) {
        bookStyleList.lineHeight.push(i);
    }
}

changeStyleEl.onclick = () => {
    changeStyleBar.togglePopover();
};

let fontListEl = el("div", {
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
        fonts.filter((i) => i != "sans" && i != "serif");
        fonts.unshift("serif", "sans");
        vlist(fontListEl, fonts, { iHeight: 24, paddingLeft: 4, paddingRight: 4 }, (i) => {
            let fontName = fonts[i];
            return el("div", fontName, {
                style: { "font-family": fontName },
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
    let fontSize = createRangeSetEl(
        bookStyle.fontSize,
        bookStyleList.fontSize.length - 1,
        (i) => {
            bookStyle.fontSize = i;
            setBookStyle();
        },
        font_small_svg,
        font_large_svg
    );
    let lineHeight = createRangeSetEl(
        bookStyle.lineHeight,
        bookStyleList.lineHeight.length - 1,
        (i) => {
            bookStyle.lineHeight = i;
            setBookStyle();
        },
        line_height_small_svg,
        line_height_large_svg
    );
    let contentWidth = createRangeSetEl(
        bookStyle.contentWidth,
        bookStyleList.contentWidth.length - 1,
        (i) => {
            bookStyle.contentWidth = i;
            setBookStyle();
        },
        content_width_small_svg,
        content_width_large_svg
    );
    let themeSelect = el("div", { class: "theme_select" }, [
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
            ]
        );
    }
    (themeSelect.querySelector("input[value='" + bookStyle.theme + "']") as HTMLInputElement).checked = true;
    themeSelect.querySelectorAll("input").forEach((el) => {
        el.addEventListener("change", (e) => {
            bookStyle.theme = (e.target as HTMLInputElement).value;
            setBookStyle();
        });
    });
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
        `${bookStyleList.contentWidth[bookStyle.contentWidth]}em`
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
    setV();
    min.onclick = () => {
        value--;
        value = Math.max(value, 0);
        setV();
        f(value);
    };
    max.onclick = () => {
        value++;
        value = Math.min(value, maxV);
        setV();
        f(value);
    };
    function setV() {
        p.innerText = String(value + 1);
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
    } else {
        let newC = el("div");
        bookContentContainerEl.innerHTML = "";
        bookContentContainerEl.append(newC);
        bookContentEl = newC;
        if (nowBook.book) {
            let book = await getBooksById(nowBook.book);
            let sectionId = nowBook.sections;
            let section = await getSection(sectionId);
            book.updateTime = new Date().getTime();
            section.lastPosi = contentScrollPosi;
            if (editText && sectionId != wordSection) {
                if (book.type === "word") editText = cleanWordBook(editText);
                section = changePosi(section, editText);
                section.text = editText;
                await sectionsStore.setItem(sectionId, section);
                if (nowBook.book != "0") await bookshelfStore.setItem(nowBook.book, book);
            }
            showBookContent(sectionId);
        }
        changeEditEl.innerHTML = icon(pen_svg);
    }
}
changeEditEl.onclick = () => {
    isEdit = !isEdit;
    changeEdit(isEdit);
};

function cleanWordBook(text: string) {
    return Array.from(new Set(text.split("\n"))).join("\n");
}

function diffPosi(oldText: string, text: string) {
    let diff = dmp.diff_main(oldText, text);
    console.log(diff);
    let source: number[] = [0];
    let map: number[] = [0];
    if (diff.at(-1)[0] === 1) diff.push([0, ""]);
    let p0 = 0,
        p1 = 0;
    for (let i = 0; i < diff.length; i++) {
        let d = diff[i];
        let dn = diff[i + 1];
        if (d[0] === -1 && dn && dn[0] === 1) {
            p0 += d[1].length;
            p1 += dn[1].length;
            source.push(p0);
            map.push(p1);
            i++;
            continue;
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
    for (let w in section.words) {
        section.words[w]["index"] = patchPosi(source, map, section.words[w]["index"]);
        section.words[w]["cIndex"] = patchPosi(source, map, section.words[w]["cIndex"]);
    }
    return section;
}

function patchPosi(source: number[], map: number[], index: [number, number]) {
    let start = index[0];
    let end = index[1];
    let Start = 0,
        End = 0;
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

import diff_match_patch, { Diff } from "diff-match-patch";
var dmp = new diff_match_patch();

changeEdit(false);

async function setEdit() {
    let book = await getBooksById(nowBook.book);
    let sectionId = nowBook.sections;
    let section = await getSection(sectionId);
    bookContentContainerEl.innerHTML = "";
    let text = el("textarea");
    text.disabled = !book.canEdit;
    bookContentContainerEl.append(text);
    bookContentEl = text;
    text.value = section.text;
    setScrollPosi(text, contentScrollPosi);
    setScrollPosi(bookContentContainerEl, 0);
    window["getText"] = () => text.value;
    window["setText"] = (str: string) => (text.value = editText = str);
    text.oninput = () => {
        editText = text.value;
    };
    text.onkeyup = async (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            let l = text.value.split("\n");
            let index = 0;
            let aiRange: { s: number; e: number }[] = [];
            const startMark = "=ai=";
            const endMark = "====";
            let hasAi = false;
            for (let i of l) {
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
            let range = aiRange.find((r) => r.s <= text.selectionStart && text.selectionEnd <= r.e);
            if (!range) return;
            let aiM = textAi(text.value.slice(range.s, range.e));
            aiM.unshift({ role: "system", content: `This is a passage: ${text.value.slice(0, aiRange[0].s)}` });
            console.log(aiM);
            let start = text.selectionStart;
            let end = text.selectionEnd;
            let aitext = await ai(aiM, "对话").text;
            let addText = `ai:\n${aitext}`;
            let changeText = text.value.slice(0, start) + addText + text.value.slice(end);
            text.value = changeText;
            editText = changeText;
            text.selectionStart = start;
            text.selectionEnd = start + addText.length;
        }
    };
    let upel = document.createElement("input");
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
                } else if (fileType === "docx") {
                    let result = await mammoth.extractRawText({ arrayBuffer: reader.result as ArrayBuffer });
                    t = result.value;
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
    let l = text.split("\n");
    let index = 0;
    const ignoreMark = "//";
    const userMark = ">";
    const aiMark = "ai:";
    let aiM: aim = [];
    for (let i of l) {
        if (i.startsWith(aiMark)) {
            aiM.push({ role: "assistant", content: i.replace(aiMark, "").trim() });
        } else if (i.startsWith(userMark)) {
            aiM.push({ role: "user", content: i.replace(userMark, "").trim() });
        } else if (i.startsWith(ignoreMark)) {
            index += i.length + 1;
            continue;
        } else {
            if (aiM.length) aiM.at(-1).content += "\n" + i;
        }
        index += i.length + 1;
    }
    if (aiM.length === 0) return [];
    if (aiM.at(-1).role !== "user") return [];
    return aiM;
}

bookContentContainerEl.onscroll = async () => {
    let n = getScrollPosi(bookContentContainerEl);
    contentScrollPosi = n;
    let sectionId = nowBook.sections;
    let section = await getSection(sectionId);
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
    for (let i of bookList) {
        let book = el("div", i.name);
        if (!radio) {
            book.append(
                el("input", {
                    type: "checkbox",
                    value: "",
                    onclick: (e) => {
                        const i = e.target as HTMLInputElement;
                        book.querySelectorAll("input").forEach((x) => (x.checked = i.checked));
                    },
                })
            );
        }
        for (let s of i.sections) {
            let section = await getSection(s);
            book.append(
                el("label", [
                    el("input", { type: radio ? "radio" : "checkbox", value: s, name: "books" }),
                    section.title,
                ])
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
    for (let i of bookList) {
        for (let s of i.sections) {
            let section = await getSection(s);
            const wl = section.text.split("\n");
            if (wl.includes(word)) {
                l.push({ book: i.id, section: s });
            }
        }
    }
    return l;
}

var ipaStore = localforage.createInstance({ name: "langPack", storeName: "ipa" });
var variantStore = localforage.createInstance({ name: "langPack", storeName: "variant" });

let dics: { [key: string]: Map<string, dic[0]> } = {};
var dicStore = localforage.createInstance({ name: "dic" });
setting.getItem("dics").then(async (l: string[]) => {
    for (let i of l || []) {
        dics[i] = (await dicStore.getItem(i)) as Map<string, dic[0]>;
    }
});

type dic = {
    [word: string]: {
        text: string;
        isAlias?: boolean;
    };
};

let ipa: Map<string, string | string[]>;

let variant: Map<string, string> = await variantStore.getItem("en");

function lemmatizer(word: string) {
    return variant?.get(word) || word;
}

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
    }[];
    note?: string;
};
type record2 = {
    text: string;
    trans: string;
    source: { book: string; sections: string; id: string }; // 原句通过对比计算
    note?: string;
};

const markListBarEl = document.getElementById("mark_word_list");
const markListEl = el("div");
const bookListEl = await sectionSelectEl();
const autoNewWordEl = el("div", [
    el("button", "自动", {
        onclick: async () => {
            const words = await getNewWords(editText, bookListEl.values());
            selectWord(words);
        },
    }),
    bookListEl.el,
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
    let list = await getAllMarks();
    vlist(markListEl, list, { iHeight: 24, gap: 4, paddingTop: 16 }, (index, i, remove) => {
        const content = i.s.type === "word" ? i.s.id : editText.slice(i.s.index[0], i.s.index[1]);

        let item = el("div", content, { class: i.s.visit ? "" : TODOMARK });
        item.onclick = () => {
            jumpToMark(i.s.cIndex[0]);
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
                        let sectionId = nowBook.sections;
                        let section = await getSection(sectionId);
                        if (i.s.type === "sentence") {
                            card2sentence.removeItem(i.s.id);
                        } else {
                            let record = (await wordsStore.getItem(i.s.id)) as record;
                            record = rmWord(record, i.id);
                            await clearWordMean(record);
                            rmStyle(i.s.index[0]);
                        }
                        delete section.words[i.id];
                        sectionsStore.setItem(sectionId, section);
                        remove();

                        if (i.id === nowDicId && dicEl.classList.contains("dic_show")) hideDicEl.click();
                    },
                })
            );
            showMenu(e.clientX, e.clientY);
        };
        return item;
    });
}

async function getAllMarks() {
    let sectionId = nowBook.sections;
    let section = await getSection(sectionId);
    let list: { id: string; s: section["words"][0] }[] = [];
    for (let i in section.words) {
        list.push({ id: i, s: section.words[i] });
    }
    list = list.toSorted((a, b) => a.s.index[0] - b.s.index[0]);
    return list;
}

lastMarkEl.onclick = async () => {
    if (!nowDicId) return;
    let list = await getAllMarks();
    let index = list.findIndex((i) => i.id === nowDicId);
    index--;
    index = index < 0 ? 0 : index;
    let id = list[index].id;
    jumpToMark(list[index].s.cIndex[0]);
    showDic(id);
};
nextMarkEl.onclick = async () => {
    if (!nowDicId) return;
    let list = await getAllMarks();
    let index = list.findIndex((i) => i.id === nowDicId);
    index++;
    index = index >= list.length ? list.length - 1 : index;
    let id = list[index].id;
    jumpToMark(list[index].s.cIndex[0]);
    showDic(id);
};
function jumpToMark(start: number) {
    bookContentContainerEl.style.scrollBehavior = "smooth";
    let span = bookContentEl.querySelector(`span[data-s="${start}"]`);
    bookContentContainerEl.scrollTop = span.getBoundingClientRect().top - bookContentEl.getBoundingClientRect().top;
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
    dicEl.style.top = `${
        el.getBoundingClientRect().bottom - (bookContentEl.getBoundingClientRect().top - bookContentEl.scrollTop) + 24
    }px`;
}

let dicTransAi: AbortController;

let nowDicId = "";

async function showDic(id: string) {
    dicTransAi?.abort();
    dicTransAi = null;

    const showClass = "dic_show";
    dicEl.classList.add(showClass);

    nowDicId = id;

    let sectionId = nowBook.sections;
    let section = await getSection(sectionId);

    let wordx = section.words[id];

    let Word: { word: string; record: record } & flatWord;

    let Share = {
        context: "",
        sourceIndex: [0, 0],
    };
    let isSentence = wordx.type === "sentence";
    let sourceWord = "";
    if (!isSentence) {
        let record = (await wordsStore.getItem(wordx.id)) as record;
        Word = { word: wordx.id, record, ...flatWordCard(record, id) };
        let s = source2context(wordx, id);
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
        if (word != Word.word || i != Word.index) {
            Word.record = rmWord(Word.record, Word.context.source.id);

            if (i != -1) {
                Word.record = setWordC(Word.record, i, Word.context);
                await wordsStore.setItem(Word.word, Word.record);
            } else await clearWordMean(Word.record);

            Word.word = word;
            Word.index = i;
            section.words[id].id = word;
            await sectionsStore.setItem(sectionId, section);
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
            let output = ai(
                [
                    {
                        role: "system",
                        content: `You are a professional, authentic translation engine. You only return the translated text, without any explanations.`,
                    },
                    {
                        role: "user",
                        content: `Please translate into ${navigator.language} (avoid explaining the original text):\n\n${Share.context}`,
                    },
                ],
                "翻译"
            );
            dicTransAi = output.stop;
            return output.text;
        }
        dicTransContent.value = text;
        if (isSentence) {
            let r = (await card2sentence.getItem(wordx.id)) as record2;
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
        rmStyle(wordx.index[0]);
        const sentenceCardId = uuid();
        let contextStart = wordx.index[0] - Share.sourceIndex[0];
        let contextEnd = wordx.index[1] + (Share.context.length - Share.sourceIndex[1]);
        wordx.index[0] = contextStart;
        wordx.index[1] = contextEnd;
        wordx.type = "sentence";
        wordx.id = sentenceCardId;
        if (dicTransContent.value) {
            wordx.visit = true;
            checkVisitAll(section);
        }
        section.words[id] = wordx;
        sectionsStore.setItem(sectionId, section);

        let r: record2 = {
            text: Share.context,
            source: null,
            trans: dicTransContent.value,
        };

        let card: Card;

        mf: for (let i of Word.record?.means || []) {
            for (let j of i.contexts) {
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
        section.words[id] = wordx;
        await sectionsStore.setItem(sectionId, section);
    }

    async function showWord() {
        dicEl.classList.remove(DICSENTENCE);
        dicTransContent.value = "";

        search(Word.word);
        dicWordEl.value = Word.word;
        dicWordEl.onchange = async () => {
            let newWord = dicWordEl.value.trim();
            await visit(false);
            await changeDicMean(newWord, -1);
            search(newWord);
        };

        ttsWordEl.innerText = await getIPA(Word.word);

        let lword = lemmatizer(sourceWord.toLocaleLowerCase());
        moreWordsEl.innerHTML = "";
        const l = Array.from(new Set([sourceWord, sourceWord.toLocaleLowerCase(), lword]));
        if (l.length != 1)
            for (let w of l) {
                let div = document.createElement("span");
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
            addP("", Word.word, Word.context.text, Word.context.index, async (text, sentence, index) => {
                let mean = text.trim();
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
            addP(Word.text, Word.word, Word.context.text, Word.context.index, async (text, sentence, index) => {
                let mean = text.trim();
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
            addP(Word.record?.note || "", Word.word, null, null, async (text) => {
                let mean = text.trim();
                if (Word.record) {
                    Word.record["note"] = mean;
                    wordsStore.setItem(Word.word, Word.record);
                }
            });
        };

        async function search(word: string) {
            editMeanEl.style.display = flatWordCard(Word.record, id).index === -1 ? "none" : "";
            if (Word.record) dicDetailsEl.innerHTML = "";
            else {
                dicDetailsEl.innerText = "请添加义项";
                return;
            }
            let means = Word.record.means;
            for (let i in means) {
                const m = means[i];
                let div = document.createElement("div");
                let radio = document.createElement("input");
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
            if (Word.index != -1) dicDetailsEl.classList.add(HIDEMEANS);
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
            let r = (await card2sentence.getItem(wordx.id)) as record2;
            r.trans = dicTransContent.value;
            await card2sentence.setItem(wordx.id, r);
            visit(true);
            checkVisitAll(section);
        };

        noteEl.onclick = async () => {
            let r = (await card2sentence.getItem(wordx.id)) as record2;
            addP(r.note || "", null, r.text, null, async (text) => {
                let mean = text.trim();
                r["note"] = mean;
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
        let startEl = document.createElement("div");
        let endEl = document.createElement("div");
        const startClass = "context_start";
        const endClass = "context_end";
        startEl.classList.add(startClass);
        endEl.classList.add(endClass);
        bookContentEl.querySelector("." + startClass)?.remove();
        bookContentEl.querySelector("." + endClass)?.remove();
        bookContentEl.append(startEl, endEl);
        function setElPosi(el: HTMLElement, left: boolean) {
            function getOffset(el: HTMLElement) {
                let pel = bookContentEl;
                let r = el.getBoundingClientRect();
                let r0 = pel.getBoundingClientRect();
                return { left: r.left - r0.left, top: r.top - (r0.top - pel.scrollTop) };
            }
            if (left) {
                if (!isSentence && Number(el.getAttribute("data-s")) > wordx.index[0]) {
                    el = bookContentEl.querySelector(`span[data-s="${wordx.index[0]}"]`);
                }
                startEl.style.left = getOffset(el).left + "px";
                startEl.style.top = getOffset(el).top + "px";
            } else {
                if (!isSentence && Number(el.getAttribute("data-s")) < wordx.index[0]) {
                    el = bookContentEl.querySelector(`span[data-s="${wordx.index[0]}"]`);
                }
                endEl.style.left = getOffset(el).left + el.offsetWidth + "px";
                endEl.style.top = getOffset(el).top + el.offsetHeight + "px";
            }
        }
        function matchRangeEl(n: number, left: boolean) {
            for (let i = 0; i < editText.length - n + 1; i++) {
                for (let ii of [-1, 1]) {
                    let el = bookContentEl.querySelector(
                        `span[data-${left ? "s" : "e"}="${n + i * ii}"]`
                    ) as HTMLElement;
                    if (el) {
                        return el;
                    }
                }
            }
        }
        let contextStartEl = matchRangeEl(contextStart, true);
        let contextEndEl = matchRangeEl(contextEnd, false);
        setElPosi(contextStartEl, true);
        setElPosi(contextEndEl, false);
        let down = { start: false, end: false };
        let index = { start: contextStart, end: contextEnd };
        startEl.onpointerdown = (e) => {
            down.start = true;
        };
        endEl.onpointerdown = (e) => {
            down.end = true;
        };
        document.onpointermove = (e) => {
            if (down.start) {
                let x = e.clientX,
                    y = e.clientY + 8;
                let list = document.elementsFromPoint(x, y);
                for (let i of list) {
                    if (i.getAttribute("data-t")) {
                        setElPosi(i as HTMLElement, true);
                        index.start = Number(i.getAttribute("data-s"));
                    }
                }
            }
            if (down.end) {
                let x = e.clientX,
                    y = e.clientY - 8;
                let list = document.elementsFromPoint(x, y);
                for (let i of list) {
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
            let text = editText.slice(index.start, index.end);
            Share.context = text;
            if (isSentence) {
                section.words[id].index = [index.start, index.end];
                sectionsStore.setItem(sectionId, section);
                let r = (await card2sentence.getItem(wordx.id)) as record2;
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
            section.words[id].cIndex = [index.start, index.end];
            sectionsStore.setItem(sectionId, section);
            if (!isSentence) {
                showWord();
            }
        }
        hideDicEl.onclick = () => {
            startEl.remove();
            endEl.remove();

            dicEl.classList.remove(showClass);

            dicTransAi?.abort();
            dicTransAi = null;
        };
    }
}

async function showDicEl(mainTextEl: HTMLTextAreaElement, word: string, x: number, y: number) {
    let list = el("div");
    list.lang = bookLan;
    function showDic(id: string) {
        list.innerHTML = "";
        let dic = dics[id].get(word);
        if (dic.isAlias) dic = dics[id].get(dic.text);
        let tmpdiv = el("div");
        tmpdiv.innerHTML = dic.text;
        for (let i of tmpdiv.innerText.split("\n").filter((i) => i.trim() != "")) {
            let p = el("p");
            p.innerHTML = i;
            list.appendChild(el("label", [el("input", { type: "checkbox", value: p.innerText }), p]));
        }
    }
    const localDic = el("div");
    for (let i in dics) {
        localDic.append(
            el("span", i, {
                onclick: () => {
                    showDic(i);
                },
            })
        );
    }
    if (Object.keys(dics).length) {
        showDic(Object.keys(dics)[0]);
    } else {
        localDic.innerText = "无词典";
    }
    const onlineList = el("div");
    let l: onlineDicsType = await setting.getItem(onlineDicsPath);
    for (let i of l) {
        onlineList.append(el("a", i.name, { href: i.url.replace("%s", word), target: "_blank" }));
    }
    onlineList.onclick = () => {
        div.close();
    };
    let div = el("dialog", { class: DICDIALOG }, [
        onlineList,
        localDic,
        list,
        el("div", { style: { display: "flex", "justify-content": "flex-end" } }, [
            el("button", iconEl(ok_svg), {
                onclick: () => {
                    // 获取所有checked的值
                    let checkedValues = Array.from(list.querySelectorAll("input[type='checkbox']:checked")).map(
                        (el: HTMLInputElement) => el.value
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
async function disCard2(m: record["means"][0]) {
    let div = document.createDocumentFragment();
    let disEl = el("p");
    disEl.innerText = m.text;
    let sen = await dicSentences(m.contexts);
    sen.style.paddingLeft = "1em";
    div.append(el("div", disEl), sen);
    return div;
}

async function dicSentences(contexts: record["means"][0]["contexts"]) {
    const sen = el("div", { class: "dic_sen" });
    for (let s of contexts) {
        let source = s.source;
        const t = await getTitleEl(source.book, source.sections);
        sen.append(
            el("div", [
                el("p", [
                    s.text.slice(0, s.index[0]),
                    el("span", { class: MARKWORD }, s.text.slice(...s.index)),
                    s.text.slice(s.index[1]),
                    t,
                ]),
            ])
        );
    }
    return sen;
}

async function saveCard(v: {
    key: string;
    index: { start: number; end: number };
    cindex: { start: number; end: number };
}) {
    let sectionId = nowBook.sections;
    let section = await getSection(sectionId);
    for (let i in section.words) {
        let index = section.words[i].index;
        if (v.index.start === index[0] && v.index.end === index[1]) {
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
    let Word = flatWordCard(record, sourceId);
    let i = Word.index;
    if (i === -1) return record;
    for (let index in record.means) {
        const m = record.means[index];
        if (Number(index) === i) {
            m.contexts = m.contexts.filter((c) => c.source.id != sourceId);
            break;
        }
    }
    return record;
}
async function clearWordMean(record: record) {
    if (!record) return;
    let means: record["means"] = [];
    for (let m of record.means) {
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

function rmStyle(start: number) {
    bookContentEl.querySelector(`span[data-s="${start}"]`)?.classList?.remove(MARKWORD);
}

function setRecordMean(record: record, id: string, f: (c: record["means"][0]) => void) {
    record = structuredClone(record);
    for (let n of record.means) {
        if (n.card_id === id) {
            f(n);
            return record;
        }
    }
    return record;
}
function setRecordContext(record: record, id: string, f: (c: record["means"][0]["contexts"][0]) => void) {
    record = structuredClone(record);
    for (let n of record.means) {
        for (let j of n.contexts) {
            if (j.source.id === id) {
                f(j);
                return record;
            }
        }
    }
    return record;
}

function addP(
    text: string,
    word: string,
    sentence: string,
    index: record["means"][0]["contexts"][0]["index"],
    f: (text: string, sentence?: string, index?: [number, number]) => void
) {
    let p = el("p");
    p.lang = bookLan;
    let sInput1 = el("span", { contentEditable: "true" });
    let sInput2 = el("span", { contentEditable: "true" });
    let sourceWord = "";
    if (index) {
        sourceWord = sentence.slice(...index);
        const sourceWordEl = el("span", { class: MARKWORD }, sourceWord, sourceWord != word ? `(${word})` : "");
        sInput1.innerText = sentence.slice(0, index[0]);
        sInput2.innerText = sentence.slice(index[1]);
        p.append(sInput1, sourceWordEl, sInput2);
        setTimeout(() => {
            p.scrollLeft = sourceWordEl.offsetLeft - p.offsetWidth / 2;
        }, 100);
    } else p.append(word || sentence);
    let textEl = el("textarea", { value: text, autofocus: "true" });
    let aiB = getAiButtons(textEl, word, sentence);
    const okEl = el("button", iconEl(ok_svg), {
        onclick: () => {
            let mean = textEl.value.trim();
            div.close();
            if (index) {
                const newSentence = sInput1.innerText + sourceWord + sInput2.innerText;
                console.log(newSentence);
                let i = diffPosi(sentence, newSentence);
                let nindex = patchPosi(i.source, i.map, index);
                f(mean, newSentence, nindex);
            } else f(mean);
        },
    });
    let div = el("dialog", { class: NOTEDIALOG }, [
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
    dialogX(div);
}

function getAiButtons(textEl: HTMLTextAreaElement, word: string, sentence: string) {
    if (word && sentence) {
        return aiButtons(textEl, word, sentence);
    } else {
        if (word) {
            return aiButtons1(textEl, word);
        } else {
            return aiButtons2(textEl, sentence);
        }
    }
}

function aiButtons(textEl: HTMLTextAreaElement, word: string, context: string) {
    function setText(text: string) {
        textEl.setRangeText(text);
    }
    const buttons = document.createDocumentFragment();
    buttons.append(
        el("button", "所有", {
            onclick: async () => {
                let text = [];
                const r = (await autoFun.runList([
                    { fun: wordAi.mean(bookLan, "zh"), input: { word, context } },
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
                setText(wordAiText.mean((await wordAi.mean(bookLan, "zh").run({ word, context }).result) as any));
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
        dicB(textEl, word)
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
        dicB(textEl, word)
    );
    return buttons;
}

function wordFix2str(f: { type: "prefix" | "root" | "suffix"; t: string; dis: string }[]) {
    let text = [];
    for (let ff of f) {
        let t = ff.t;
        if (ff.type === "prefix") t = t + "-";
        if (ff.type === "suffix") t = "-" + t;
        if (ff.dis) t += " (" + ff.dis + ")";
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
                let t = sentenceGm(await sentenceAi.gm(sentence));
                setText(t);
            },
        }),
        el("button", "拆分", {
            onclick: async () => {
                setText((await sentenceAi.split(sentence)).shortSentences.join("\n"));
            },
        }),
        tmpAiB(textEl, `$这里有个句子${sentence}`)
    );
    return buttons;
}

function sentenceGm(t: senNode) {
    function get(T: senNode) {
        let text = "";
        for (let t of T) {
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
});

let wordAi = {
    mean: (sourceLan: string, userLan: string) => {
        let f = new autoFun.def({
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
        let f = new autoFun.def({
            input: { word: "string 单词" },
            output: { mean: `string 用emoji表示的意思` },
            script: [`根据context中word的意思，返回emoji`],
        });
        return f;
    },
    synOpp: () => {
        let f = new autoFun.def({
            input: { word: "string 单词", context: "string 单词所在的语境" },
            output: { list0: `string[] 同义词`, list1: `string[] 近义词`, list2: `string[] 近义词` },
            script: [
                `判断context中word的意思`,
                "若存在该语境下能进行同义替换的词，添加到list0同义词表，同义词应比word更简单",
                "克制地添加若干近义词到list1",
                "克制地添加若干反义词到list2",
            ],
        });
        return f;
    },
    fix: () => {
        let f = new autoFun.def({
            input: { word: "string 单词" },
            output: { list: `{ type: "prefix" | "root" | "suffix"; t: string; dis: string }[]词根词缀列表` },
            script: [`分析word词根词缀`, "根据测试例,依次将词根词缀添加到list"],
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
        let f = new autoFun.def({
            input: { word: "string 单词" },
            output: { list: `string[]词源` },
            script: [`分析word词源并返回他们`],
        });
        return f;
    },
};

let wordAiText = {
    mean: (x: { mean1: string; mean2: string }) => {
        return x.mean1 + "\n" + x.mean2;
    },
    meanEmoji: (x: { mean: string }) => {
        return x.mean;
    },
    synOpp: (x: { list0: string[]; list1: string[]; list2: string[] }) => {
        let text = [];
        if (x.list0?.length) text.push(`= ${x.list0.join(", ")}`);
        if (x.list1?.length) text.push(`≈ ${x.list1.join(", ")}`);
        if (x.list2?.length) text.push(`- ${x.list2.join(", ")}`);
        return text.join("\n");
    },
    fix: (f: { list: { type: "prefix" | "root" | "suffix"; t: string; dis: string }[] }) => {
        let text = wordFix2str(f.list);
        return text.join(" + ");
    },
    etymology: (x: { list: string[] }) => {
        return x.list.join(", ");
    },
};

type senNode = ({ text: senNode; isPost: boolean } | string)[];

let sentenceAi = {
    gm: async (sentence: string) => {
        type splitS = ({ text: string; isPost: boolean } | string)[];
        let f = new autoFun.def({
            input: { sentence: "string 句子" },
            output: { split: `({ text: string; isPost: boolean } | string)[]` },
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
            let t: senNode = [];
            let l = (await f.run(`sentence:${sentence}`).result)["split"] as splitS;
            for (let i of l) {
                if (typeof i === "string") {
                    t.push(i);
                } else {
                    let x: senNode[0] = { text: [i.text], isPost: i.isPost };
                    x.text = await splitSen(i.text);
                }
            }
            return t;
        }
        let x = await splitSen(sentence);
        console.log(x);
        return x;
    },
    split: (sentence: string) => {
        let f = new autoFun.def({
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
    let textEl = el("textarea", { value: ">" });
    textEl.onkeyup = async (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            let text = textEl.value.trim();
            let aiM = textAi(text);
            if (aiM.at(-1).role != "user") return;
            if (info) aiM.unshift({ role: "system", content: info });
            console.log(aiM);
            let start = textEl.selectionStart;
            let end = textEl.selectionEnd;
            let aitext = await ai(aiM, "对话").text;
            let addText = `ai:\n${aitext}`;
            let changeText = textEl.value.slice(0, start) + addText + textEl.value.slice(end);
            textEl.value = changeText;
            textEl.selectionStart = start;
            textEl.selectionEnd = start + addText.length;
        }
    };
    let div = el("dialog", { class: AIDIALOG }, [
        textEl,
        el("div", { style: { display: "flex", "justify-content": "flex-end" } }, [
            el("button", iconEl(ok_svg), {
                onclick: () => {
                    let mean = textEl.value.trim();
                    div.close();
                    if (mean != ">") mainTextEl.setRangeText("\n" + mean);
                },
            }),
        ]),
    ]) as HTMLDialogElement;
    div.style.left = `min(100vw - 400px, ${x}px)`;
    div.style.top = `min(100dvh - 400px, ${y}px - 400px)`;
    dialogX(div);
}

function dicB(mainTextEl: HTMLTextAreaElement, word: string) {
    const dicB = el("button", "词典", {
        onclick: () => {
            showDicEl(mainTextEl, word, dicB.getBoundingClientRect().x, dicB.getBoundingClientRect().y);
        },
    });
    return dicB;
}

type aim = { role: "system" | "user" | "assistant"; content: string }[];

function ai(m: aim, text?: string) {
    let config = {
        model: "gpt-3.5-turbo",
        temperature: 0.5,
        top_p: 1,
        frequency_penalty: 1,
        presence_penalty: 1,
        messages: m,
    };
    let userConfig = localStorage.getItem("setting/ai.config");
    if (userConfig) {
        let c = (JSON.parse(userConfig).messages = m);
        userConfig = JSON.stringify(c);
    } else {
        userConfig = JSON.stringify(config);
    }
    let abort = new AbortController();
    let stopEl = el("button", iconEl(close_svg));
    stopEl.onclick = () => {
        abort.abort();
        pel.remove();
    };
    let pel = el("div", [el("p", `AI正在思考${text || ""}`), stopEl]);
    putToast(pel, 0);
    return {
        stop: abort,
        text: new Promise(async (re: (text: string) => void, rj: (err: Error) => void) => {
            fetch(((await setting.getItem("ai.url")) as string) || `https://api.openai.com/v1/chat/completions`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${(await setting.getItem("ai.key")) as string}`,
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
                    let answer = t.choices[0].message.content;
                    console.log(answer);
                    re(answer);
                })
                .catch((e) => {
                    if (e.name === "AbortError") {
                        pel.remove();
                        return;
                    }
                    pel.innerHTML = "";
                    let escEl = el("button", iconEl(close_svg));
                    escEl.onclick = () => {
                        pel.remove();
                    };
                    pel.append(el("p", `AI处理${text || ""}时出现错误`), el("div", [escEl]));
                    rj;
                });
        }),
    };
}

let checkVisit = {
    section: "",
    time: 0,
};

function checkVisitAll(section: section) {
    const visitAll = Object.values(section.words).every((i) => i.visit);
    if (visitAll && (nowBook.sections != checkVisit.section || time() - checkVisit.time > 1000 * 60 * 5)) {
        alert("🎉恭喜学习完！\n可以在侧栏添加忽略词\n再读一遍文章，检查是否读懂\n最后进行词句复习");
        checkVisit.section = nowBook.sections;
        checkVisit.time = time();
    }
}

const fsrsW = JSON.parse(await setting.getItem("fsrs.w")) as number[];
let fsrs = new FSRS(generatorParameters(fsrsW?.length === 17 ? { w: fsrsW } : {}));

var cardsStore = localforage.createInstance({ name: "word", storeName: "cards" });
var wordsStore = localforage.createInstance({ name: "word", storeName: "words" });
var card2word = localforage.createInstance({ name: "word", storeName: "card2word" });
var spellStore = localforage.createInstance({ name: "word", storeName: "spell" });
var card2sentence = localforage.createInstance({ name: "word", storeName: "card2sentence" });

var cardActionsStore = localforage.createInstance({ name: "word", storeName: "actions" });
function setCardAction(cardId: string, time: Date, rating: Rating, state: State, duration: number) {
    cardActionsStore.setItem(String(time.getTime()), {
        cardId,
        rating,
        state,
        duration,
    });
}
function newCardAction(id: string) {
    setCardAction(id, new Date(), null, null, null);
}

var transCache = localforage.createInstance({ name: "aiCache", storeName: "trans" });
var ttsCache = localforage.createInstance({ name: "aiCache", storeName: "tts" });

function setWordC(w: record, meanIndex: number, context: record["means"][0]["contexts"][0]) {
    if (meanIndex < 0) return w;
    for (let index in w.means) {
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
        let card2 = createEmptyCard();
        newCardAction(word);
        await spellStore.setItem(word, card2);
    }
    let cardId = uuid();
    let m = { text, contexts: [], card_id: cardId };
    w.means.push(m);
    let card = createEmptyCard();
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
};

function flatWordCard(record: record, id: string) {
    let Word: flatWord = {
        index: -1,
        card_id: "",
        text: "",
        context: { index: [NaN, NaN], source: { book: "", sections: "", id: "" }, text: "" },
    };
    if (!record) return Word;
    for (let n in record.means) {
        const i = record.means[n];
        for (let j of i.contexts) {
            if (j.source.id === id) {
                Word.index = Number(n);
                Word.card_id = i.card_id;
                Word.text = i.text;
                Word.context = j;
                return Word;
            }
        }
    }
    return Word;
}

function selectWord(words: string[]) {
    bookContentEl.querySelectorAll(`.${TMPMARKWORD}`).forEach((el) => el.classList.remove(TMPMARKWORD));
    bookContentEl.querySelectorAll("span[data-t]").forEach((el: HTMLSpanElement) => {
        if (words.includes(el.innerText.toLocaleLowerCase())) {
            el.classList.add(TMPMARKWORD);
        }
    });
}

async function getNewWords(text: string, wordBooks: string[]) {
    let newWords: string[] = [];
    if (!wordBooks || !wordBooks.join("")) {
        newWords = await getNewWordsFromAi(text);
    } else {
        newWords = await getNewWordsFromBook(text, wordBooks);
    }
    const ignoreWords = await getIgnoreWords();
    return newWords.filter((w) => !ignoreWords.includes(w));
}

async function getNewWordsFromAi(text: string) {
    const f = new autoFun.def({
        input: { des: "描述", text: "string" },
        script: ["根据des，判读text中的生词", "专有名词、词组不属于生词", "返回生词"],
        output: { words: "string[]" },
    });
    return (await f.run({ des: `我的词汇量是牛津3000 A2`, text: `${text}` }).result)["words"];
}

async function getNewWordsFromBook(text: string, books: string[]) {
    let words: string[] = [];
    for (let book of books) {
        const w = (await getSection(book)).text.trim().split("\n");
        const keys = await wordsStore.keys();
        for (let word of w) {
            if (!keys.includes(word)) {
                words.push(word);
            }
        }
    }
    const segmenter = new Segmenter(bookLan, { granularity: "word" });
    let segments = segmenter.segment(text);
    let list = Array.from(segments).map((i) => i.segment);
    words = words.filter((w) => list.includes(w));
    return words;
}

async function getIgnoreWords() {
    const section = await getSection(ignoreWordSection);
    if (!section) return [];
    return section.text.trim().split("\n");
}

async function autoIgnore() {
    const dialog = el("dialog", { class: "words_select", lang: bookLan }) as HTMLDialogElement;
    const f = el("div");
    const words = Array.from(
        new Set(
            Array.from(bookContentEl.querySelectorAll(`:scope>*>*>span:not(.${MARKWORD})`)).map((el) =>
                el.textContent.trim().toLocaleLowerCase()
            )
        )
    );
    const section = await getSection(ignoreWordSection);
    const markedWords = Object.values((await getSection(nowBook.sections)).words)
        .filter((i) => i.type === "word")
        .map((i) => lemmatizer(i.id.toLocaleLowerCase()));
    const oldWords = section.text.trim().split("\n");
    const studyWords = await wordsStore.keys();
    const hasLentWords = oldWords
        .concat(studyWords)
        .map((w) => w.toLocaleLowerCase())
        .concat(markedWords);
    const newWords = words;
    const wordsWithRoot: { src: string; show: string }[] = [];
    const willShowWords: string[] = [];
    const properN1 = properN.map((i) => i.toLocaleLowerCase());
    for (const w of newWords) {
        if (w.length <= 1) continue;
        if (w.match(/[0-9]/)) continue;
        if (properN1.includes(w)) continue;
        if (w.includes("’") || w.includes("'")) continue;
        const r = lemmatizer(w);
        if (!hasLentWords.includes(r) && !willShowWords.includes(r) && r.length > 1) {
            wordsWithRoot.push({ src: w, show: r });
            willShowWords.push(r);
        }
    }
    wordsWithRoot.forEach((w) => {
        let item = el("label", [
            el("input", { type: "checkbox", value: w.show, class: "ignore_word" }),
            w.show,
            el("input", { type: "checkbox", value: w.src }),
        ]);
        f.append(item);
    });
    dialog.append(
        f,
        el("button", iconEl(ok_svg), {
            onclick: async () => {
                let words = Array.from(f.querySelectorAll("input:checked.ignore_word")).map(
                    (el: HTMLInputElement) => el.value
                );
                section.text = oldWords.concat(words).join("\n");
                await sectionsStore.setItem(ignoreWordSection, section);
                const wordsX = Array.from(f.querySelectorAll("input:checked:not(.ignore_word)")).map(
                    (el: HTMLInputElement) => el.value
                );
                selectWord(wordsX);
                dialog.close();
            },
        })
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

setTimeout(async () => {
    let d = await getFutureReviewDue(0.1, "word", "spell", "sentence");
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
const reviewViewEl = document.getElementById("review_view");
reviewReflashEl.parentElement.append(
    el("button", iconEl(chart_svg), {
        onclick: () => {
            plotEl.showPopover();
            renderCharts();
        },
    })
);

const KEYBOARDDISPLAYPATH = "spell.keyboard.display";
const keyboardEl = el("div", {
    class: "simple-keyboard",
    style: { display: await setting.getItem(KEYBOARDDISPLAYPATH) },
});
const handwriterCanvas = el("canvas");
const handwriterCheck = el("button", iconEl(ok_svg), {
    style: { display: "none" },
    onclick: () => {
        ocrSpell();
    },
});
const handwriterEl = el("div", { class: "spell_write" }, [
    handwriterCanvas,
    el("button", {
        onclick: () => {
            if (keyboardEl.style.display === "none") {
                keyboardEl.style.display = "";
            } else {
                keyboardEl.style.display = "none";
            }
            setting.setItem(KEYBOARDDISPLAYPATH, keyboardEl.style.display);
        },
    }),
    handwriterCheck,
]);
const spellInputEl = el("div", { style: { display: "none" } }, [keyboardEl, handwriterEl]);
reviewEl.append(spellInputEl);

let keyboard = new Keyboard(keyboardEl, {
    onChange: (text) => spellCheckF(text),
    onKeyPress: (button) => {
        if (button === "{shift}") {
            let currentLayout = keyboard.options.layoutName;
            let shiftToggle = currentLayout === "default" ? "shift" : "default";

            keyboard.setOptions({
                layoutName: shiftToggle,
            });
        }

        spellF(button);
    },
    layout: {
        default: ["q w e r t y u i o p", "a s d f g h j k l", "{shift} z x c v b n m {bksp}", "{tip} {space} {audio}"],
        shift: ["Q W E R T Y U I O P", "A S D F G H J K L", "{shift} Z X C V B N M {bksp}", "{tip} {space} {audio}"],
        handwrite: ["{tip} {space} {audio}"],
    },
    display: { "{space}": "␣", "{shift}": "⇧", "{bksp}": "⌫", "{tip}": "🫣", "{audio}": "📣" },
});

window.addEventListener("keydown", (e) => {
    if (!(reviewType === "spell" && reviewEl.classList.contains("review_show"))) return;
    if (!reviewEl.contains(document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2))) return; // 用于note
    let oldInput = keyboard.getInput();
    if (e.key != "Backspace") {
        if (e.key === ">") {
            spellF("{audio}");
            return;
        } else if (e.key === "?") {
            spellF("{tip}");
            return;
        } else if (e.key.length === 1) keyboard.setInput(oldInput + e.key);
    } else {
        keyboard.setInput(oldInput.slice(0, -1));
    }
    keyboard.options.onChange(keyboard.getInput());
});

let spellWriteE: PointerEvent;
let spellWriteCtx: CanvasRenderingContext2D;
reviewEl.onpointerdown = (e) => {
    if (!(reviewType === "spell" && reviewEl.classList.contains("review_show"))) return;
    if (e.clientY > document.querySelector(".spell_input").getBoundingClientRect().bottom) return;
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
    if (books.length === 0) return;
    let words: string[] = [];
    for (let book of books) {
        const w = (await getSection(book)).text.trim().split("\n");
        words.push(...w);
    }
    return words;
}

function filterWithScope(word: string, scope: string[]) {
    return !scope || scope.includes(word);
}

async function getFutureReviewDue(days: number, ...types: review[]) {
    let now = new Date().getTime();
    now += days * 24 * 60 * 60 * 1000;
    now = Math.round(now);
    const wordsScope = await getWordsScope();
    let wordList: { id: string; card: Card }[] = [];
    let spellList: { id: string; card: Card }[] = [];
    let sentenceList: { id: string; card: Card }[] = [];

    const dueL: Map<string, Card> = new Map();
    await cardsStore.iterate((card: Card, k) => {
        if (card.due.getTime() < now) {
            dueL.set(k, card);
        }
    });

    if (types.includes("word"))
        await wordsStore.iterate((v: record, k) => {
            if (filterWithScope(k, wordsScope)) {
                for (let m of v.means) {
                    if (dueL.has(m.card_id)) wordList.push({ id: m.card_id, card: dueL.get(m.card_id) });
                }
            }
        });
    if (types.includes("spell"))
        await spellStore.iterate((value: Card, key) => {
            if (value.due.getTime() < now) {
                if (filterWithScope(key, wordsScope)) spellList.push({ id: key, card: value });
            }
        });

    if (types.includes("sentence"))
        (await card2sentence.keys()).forEach((key) => {
            if (dueL.has(key)) {
                sentenceList.push({ id: key, card: dueL.get(key) });
            }
        });
    return { word: wordList, spell: spellList, sentence: sentenceList };
}
async function getReviewDue(type: review) {
    let now = new Date().getTime();
    let wordList: { id: string; card: Card }[] = [];
    let spellList: { id: string; card: Card }[] = [];
    let sentenceList: { id: string; card: Card }[] = [];
    for (let i of due.word) {
        if (i.card.due.getTime() < now) {
            wordList.push(i);
        }
    }
    for (let i of due.spell) {
        if (i.card.due.getTime() < now) {
            spellList.push(i);
        }
    }
    for (let i of due.sentence) {
        if (i.card.due.getTime() < now) {
            sentenceList.push(i);
        }
    }
    wordList.sort((a, b) => a.card.due.getTime() - b.card.due.getTime());
    spellList.sort((a, b) => a.card.due.getTime() - b.card.due.getTime());
    sentenceList.sort((a, b) => a.card.due.getTime() - b.card.due.getTime());
    if (type === "word") {
        return wordList[0];
    } else if (type === "spell") {
        return spellList[0];
    } else {
        return sentenceList[0];
    }
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
var reviewType: review = "word";
const reviewModeEl = document.getElementById("review_mode");
const reviewWordEl = document.getElementById("review_word") as HTMLInputElement;
const reviewSpellEl = document.getElementById("review_spell") as HTMLInputElement;
const reviewSentenceEl = document.getElementById("review_sentence") as HTMLInputElement;

reviewWordEl.checked = true;
reviewModeEl.onclick = (e) => {
    if ((e.target as HTMLElement).tagName != "INPUT") return;
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

    reviewReflashEl.click();
};

let reviewCount = 0;
const maxReviewCount = Number((await setting.getItem("review.maxCount")) || "30");

async function nextDue(type: review) {
    let x = await getReviewDue(type);
    reviewCount++;
    return x;
}

reviewReflashEl.onclick = async () => {
    due = await getFutureReviewDue(0.1, reviewType);
    let l = await getReviewDue(reviewType);
    console.log(l);
    if (reviewAi.checked && reviewType === "word") await getWordAiContext();
    showReview(l, reviewType);
    reviewCount = 0;
};

var spellCheckF: (text: string) => void = (text) => console.log(text);
var spellF: (text: string) => void = (text) => console.log(text);
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
    for (let x of newDue) {
        let wordid = (await card2word.getItem(x.id)) as string;
        let wordRecord = (await wordsStore.getItem(wordid)) as record;
        for (let i of wordRecord.means) {
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
                `为$word及其$mean提供一个${learnLang}例句`,
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
            })
        );

        putToast(tipEl, 0);

        const r = await x.result;
        tipEl.remove();
        if (Array.isArray(r)) {
            rr = r;
        } else {
            rr = r["sentences"];
        }
    } catch (error) {
        putToast(el("p", "ai错误"));
    }

    aiContexts = {};

    rr.forEach((i) => (aiContexts[i.id] = { text: i.sentence }));
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
    for (let i of word.means) {
        if (i.card_id === id) {
            context = await dicSentences(i.contexts.toReversed());
        }
    }
    return context;
}
async function aiContext(id: string) {
    let context = document.createElement("div");
    const text = aiContexts[id].text;
    const l = text.split(/\*\*(.+)\*\*/);
    context.append(el("p", [l[0], el("span", l[1], { class: MARKWORD }), l[2]]));
    return context;
}
async function showWordReview(x: { id: string; card: Card }, isAi: boolean) {
    let wordid = (await card2word.getItem(x.id)) as string;
    let wordRecord = (await wordsStore.getItem(wordid)) as record;
    play(wordRecord.word);
    let div = document.createElement("div");
    let context: HTMLDivElement;
    if (isAi && aiContexts[x.id]?.text) context = await aiContext(x.id);
    else context = await crContext(wordRecord, x.id);
    let hasShowAnswer = false;
    async function showAnswer() {
        hasShowAnswer = true;
        let word = (await card2word.getItem(x.id)) as string;
        let d = (await wordsStore.getItem(word)) as record;
        for (let i of d.means) {
            if (i.card_id === x.id) {
                let div = el("div");
                div.innerText = i.text;
                dic.innerHTML = "";
                dic.append(div);
            }
        }
    }
    const dic = el("div");
    dic.onclick = reviewHotkey["show"].f = () => {
        showAnswer();
        buttons.finish();
    };
    let buttons = getReviewCardButtons(x.id, x.card, context.innerText, async (rating) => {
        if (hasShowAnswer) {
            let next = await nextDue(reviewType);
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

var reviewHotkey: { [key: string]: { f: () => void; key: string } } = {
    1: { key: "1", f: () => {} },
    2: { key: "2", f: () => {} },
    3: { key: "3", f: () => {} },
    show: { key: " ", f: () => {} },
};

document.addEventListener("keydown", (e) => {
    if (!reviewEl.classList.contains("review_show") && reviewType != "spell") return;
    for (let i in reviewHotkey) {
        if (e.key === reviewHotkey[i].key) {
            reviewHotkey[i].f();
        }
    }
});

function getReviewCardButtons(id: string, card: Card, readText: string, f: (rating: number) => void) {
    const showTime = new Date().getTime();
    let hasClick = false;
    let finishTime = showTime;
    let quickly = false;
    let b = (rating: Rating, icon: HTMLElement) => {
        let button = document.createElement("button");
        button.append(icon);
        button.onclick = reviewHotkey[rating].f = async () => {
            if (hasClick) {
                if (rating === Rating.Good && quickly) rating = Rating.Easy;
                await setReviewCard(id, card, rating, finishTime - showTime);
                f(rating);
                return;
            }
            await firstClick();
            f(rating);
        };
        return button;
    };
    async function firstClick() {
        hasClick = true;
        finishTime = time();
        quickly = finishTime - showTime < (await getReadTime(readText)) + 400;
        if (quickly) goodB.querySelector("img").src = very_ok_svg;
    }
    let againB = b(Rating.Again, iconEl(close_svg));
    let hardB = b(Rating.Hard, iconEl(help_svg));
    let goodB = b(Rating.Good, iconEl(ok_svg));
    let buttons = document.createElement("div");
    buttons.append(againB, hardB, goodB);
    return {
        buttons,
        finish: () => firstClick(),
    };
}

async function getReadTime(text: string) {
    const segmenter = new Segmenter(bookLan, { granularity: "word" });
    let segments = segmenter.segment(text);
    const wordsCount = Array.from(segments).length;
    return wordsCount * (Number(await setting.getItem("user.readSpeed")) || 100);
}

async function showSpellReview(x: { id: string; card: Card }) {
    const word = x.id;
    let input = el("div", { class: "spell_input", style: { width: "min-content" } });
    input.innerText = word; // 占位计算宽度
    clearKeyboard();
    const SHOWSENWORD = "spell_sen_word_show";
    const BLURWORD = "blur_word";
    let wordEl = document.createElement("div");
    let isPerfect = false;
    let spellResult: "none" | "right" | "wrong" = "none";
    let showTime = time();
    play(word);
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
    spellCheckF = async (inputWord: string) => {
        inputContent(inputWord);
        wordEl.innerHTML = "";
        div.classList.remove(SHOWSENWORD);
        if (inputWord === word) {
            // 正确
            const rightL = (await hyphenate(word, { hyphenChar })).split(hyphenChar);
            const ele = el("div");
            for (let i of rightL) {
                ele.append(el("span", i));
            }
            input.innerHTML = "";
            input.append(ele);
            await spellAnimate(ele);

            if (spellResult === "none")
                setSpellCard(x.id, x.card, isPerfect ? Rating.Easy : Rating.Good, time() - showTime);
            spellResult = "right";
            let next = await nextDue(reviewType);
            showReview(next, reviewType);
            clearKeyboard();
        }
        //错误归位
        if (inputWord.length === word.length && inputWord != word) {
            input.innerHTML = "";
            const diffEl = await spellDiffWord(word, inputWord);
            input.append(diffEl);
            input.append(
                el("button", {
                    onclick: async () => {
                        diffEl.innerHTML = (await spellDiffWord(word, inputWord)).innerHTML;
                        spellErrorAnimate(diffEl);
                    },
                })
            );
            spellErrorAnimate(diffEl);
            wordEl.append(await hyphenate(word, { hyphenChar }));
            play(word);
            div.classList.add(SHOWSENWORD);
            if (spellResult === "none") {
                const oldCard = x.card;
                const actionId = setSpellCard(x.id, x.card, 1, time() - showTime);
                let diff = dmp.diff_main(inputWord, word);
                const f = diff.filter((i) => i[0] != 0);
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
                            })
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
    let context = el("div");
    let r = (await wordsStore.getItem(word)) as record;
    context.append(el("div", await getIPA(word)));
    context.append(
        el("button", iconEl(pen_svg), {
            onclick: () => {
                addP(r.note || "", word, null, null, async (text) => {
                    let mean = text.trim();
                    if (r) {
                        r["note"] = mean;
                        wordsStore.setItem(word, r);
                    }
                });
            },
        })
    );
    for (let i of r.means) {
        context.append(el("div", await disCard2(i)));
    }
    const div = document.createElement("div");
    div.append(input, wordEl, context);
    div.classList.add("review_spell");
    div.setAttribute("data-state", String(x.card.state));
    reviewViewEl.innerHTML = "";
    reviewViewEl.append(div);

    input.style.width = input.offsetWidth + "px";
    inputContent("");
}

async function spellDiffWord(rightWord: string, wrongWord: string) {
    let div = el("div");
    let diff = dmp.diff_main(wrongWord, rightWord);
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
    Array.from(el.children).forEach((el: HTMLElement) => {
        el.style.opacity = "0.2";
        el.style.transition = "0.2s";
    });

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
        if (pel.childNodes[i].nodeName != "SPAN") continue;
        const el = pel.childNodes[i] as HTMLSpanElement;
        const w = el.getBoundingClientRect().width + "px";
        if (el.classList.contains("diff_add")) el.style.width = "0";
        if (el.classList.contains("diff_remove")) el.style.width = w;
        setTimeout(() => {
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
        }, (i + 1) * 500);
    }
}

async function showSentenceReview(x: { id: string; card: Card }) {
    const sentence = (await card2sentence.getItem(x.id)) as record2;
    const div = el("div");
    const context = el("p", sentence.text, await getTitleEl(sentence.source.book, sentence.source.sections));
    let hasShowAnswer = false;
    async function showAnswer() {
        hasShowAnswer = true;
        dic.innerHTML = "";
        dic.append(el("p", { class: TRANSLATE }, sentence.trans));
        if (sentence.note) {
            let p = el("p");
            p.innerText = sentence.note;
            dic.append(p);
        }
    }
    const dic = el("div");
    dic.onclick = reviewHotkey["show"].f = () => {
        showAnswer();
        buttons.finish();
    };
    let buttons = getReviewCardButtons(x.id, x.card, context.innerText, async (rating) => {
        if (hasShowAnswer) {
            let next = await nextDue(reviewType);
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

let audioEl = <HTMLAudioElement>document.getElementById("audio");
let pTTSEl = <HTMLAudioElement>document.getElementById("pTTS");

function play(word: string) {
    audioEl.src = "https://dict.youdao.com/dictvoice?le=eng&type=1&audio=" + word;
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
        OUTPUT_FORMAT.WEBM_24KHZ_16BIT_MONO_OPUS
    );
    text = await ttsNormalize(text);
    let b = (await ttsCache.getItem(text)) as Blob;
    if (b) {
        return URL.createObjectURL(b);
    }

    const readable = tts.toStream(text);
    let base = new Uint8Array();
    readable.on("data", (data: Uint8Array) => {
        console.log("DATA RECEIVED");
        // raw audio file data
        base = concat(base, data);
    });
    function concat(array1: Uint8Array, array2: Uint8Array) {
        let mergedArray = new Uint8Array(array1.length + array2.length);
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
    text = await ttsNormalize(text);
    const utterThis = new SpeechSynthesisUtterance(text);
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
    let text = contentP.at(index);
    let nextplay = () => {
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
        let url = await getTTS(text);
        pTTSEl.src = url;
        pTTSEl.play();
        pTTSEl.onended = nextplay;
    }
}

async function setReviewCard(id: string, card: Card, rating: Rating, duration: number) {
    let now = new Date();
    setCardAction(id, now, rating, card.state, duration);
    let sCards = fsrs.repeat(card, now);
    const nCard = sCards[rating].card;
    await cardsStore.setItem(id, nCard);

    for (let i of due.word)
        if (i.id === id) {
            i.card = structuredClone(nCard);
            return;
        }
    for (let i of due.sentence)
        if (i.id === id) {
            i.card = structuredClone(nCard);
            break;
        }
}
function setSpellCard(id: string, card: Card, rating: Rating, duration: number) {
    let now = new Date();
    setCardAction(id, now, rating, card.state, duration);
    let sCards = fsrs.repeat(card, now);
    const nCard = sCards[rating].card;
    spellStore.setItem(id, nCard);

    for (let i of due.spell)
        if (i.id === id) {
            i.card = structuredClone(nCard);
            break;
        }

    return String(now.getTime());
}

const plotEl = el("div", { popover: "auto", class: "plot" });
document.body.append(plotEl);

async function renderCharts() {
    plotEl.innerHTML = "";
    const cardDue = el("div");
    const wordsScope = await getWordsScope();
    const wordDue: string[] = [];
    const spellDue: number[] = [];
    const sentenceDue: string[] = [];
    await wordsStore.iterate((v: record, k: string) => {
        if (!filterWithScope(k, wordsScope)) return;
        for (let m of v.means) {
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

    cardDue.append(renderCardDue("单词", wordDue1));
    cardDue.append(renderCardDue("拼写", spellDue));
    cardDue.append(renderCardDue("句子", sentenceDue1));
    plotEl.append(cardDue);

    const newCard: Date[] = [];
    const reviewCard: Date[] = [];
    await cardActionsStore.iterate(
        (
            v: {
                cardId: string;
                rating: Rating;
                state: State;
                duration: number;
            },
            k
        ) => {
            const date = new Date(Number(k));
            if (!v.rating) {
                newCard.push(date);
            } else {
                reviewCard.push(date);
            }
        }
    );
    const cal = renderCal(2024, newCard);
    const cal1 = renderCal(2024, reviewCard);
    plotEl.append(el("div", [el("h2", "新卡片"), cal, el("h2", "已复习"), cal1]));
}

function renderCardDue(text: string, data: number[]) {
    const pc = el("div", { class: "oneD_plot" });
    const now = time();
    const zoom = 1 / ((1000 * 60 * 60) / 10);
    let _max = -Infinity,
        _min = Infinity;
    data.concat([now]).forEach((d) => {
        if (d > _max) _max = d;
        if (d < _min) _min = d;
    });
    let count = 0;
    for (let min = _min; min < _max; min += 2048 / zoom) {
        const max = Math.min(min + 2048 / zoom, _max);
        const canvas = el("canvas");
        canvas.width = (max - min) * zoom;
        if (max === _max) canvas.width++;
        canvas.height = 16;
        const ctx = canvas.getContext("2d");
        function l(x: number, color: string) {
            ctx.strokeStyle = color;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, 16);
            ctx.stroke();
        }
        const nowx = (now - min) * zoom;
        data.forEach((d) => {
            if (d < min || max < d) return;
            const x = (d - min) * zoom;
            l(x, "#000");
            if (x < nowx) count++;
        });
        l(nowx, "#f00");
        l((now + 1000 * 60 * 60 - min) * zoom, "#00f");
        l((now + 1000 * 60 * 60 * 24 - min) * zoom, "#00f");
        pc.append(canvas);
    }
    const f = el("div");
    f.append(text, String(count), pc);
    return f;
}

function renderCal(year: number, data: Date[]) {
    const count: { [key: string]: number } = {};
    for (let d of data) {
        const id = d.toDateString();
        if (count[id]) count[id]++;
        else count[id] = 1;
    }
    const max = Math.max(...Object.values(count));
    const div = el("div");
    const firstDate = new Date(year, 0, 1);
    const zero2first = (firstDate.getDay() + 1) * 24 * 60 * 60 * 1000;
    let s_date = new Date(firstDate.getTime() - zero2first);
    const f = el("div", { class: "cal_plot" });
    const title = el("div");
    for (let x = 1; x <= 53; x++) {
        for (let y = 1; y <= 7; y++) {
            s_date = new Date(s_date.getTime() + 24 * 60 * 60 * 1000);
            const v = (count[s_date.toDateString()] ?? 0) / max;
            const item = el("div");
            item.title = `${s_date.toLocaleDateString()}  ${count[s_date.toDateString()] ?? 0}`;
            if (v) item.style.backgroundColor = `color-mix(in srgb-linear, #9be9a8, #216e39 ${v * 100}%)`;
            if (s_date.toDateString() === new Date().toDateString()) {
                item.style.borderWidth = "2px";
                title.innerText = item.title;
            }
            f.append(item);
        }
    }
    f.onclick = (e) => {
        if (e.target === f) return;
        const EL = e.target as HTMLElement;
        title.innerText = EL.title;
    };
    div.append(title, f);
    return div;
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
        el("label", el("input", { type: "checkbox", "data-path": readerSettingPath.apostrophe }), "把’转为'")
    )
);

import Sortable from "sortablejs";

const onlineDicsEl = el("ul", { style: { "list-style-type": "none" } });
const onlineDicsPath = "dics.online";
type onlineDicsType = { name: string; url: string }[];

function onlineDicItem(name: string, url: string) {
    const li = el(
        "li",
        el("span", { class: "sort_handle" }, "::"),
        el("input", { value: name }),
        el("input", { value: url }),
        el("button", iconEl(close_svg), {
            onclick: () => {
                li.remove();
            },
        })
    );
    return li;
}

async function showOnlineDics() {
    const l = ((await setting.getItem(onlineDicsPath)) || []) as onlineDicsType;
    for (let i of l) {
        onlineDicsEl.append(onlineDicItem(i.name, i.url));
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

if (!(await setting.getItem(onlineDicsPath))) {
    await setting.setItem(onlineDicsPath, [
        {
            name: "剑桥",
            url: "https://dictionary.cambridge.org/zhs/%E8%AF%8D%E5%85%B8/%E8%8B%B1%E8%AF%AD-%E6%B1%89%E8%AF%AD-%E7%AE%80%E4%BD%93/%s",
        },
        { name: "柯林斯", url: "https://www.collinsdictionary.com/zh/dictionary/english-chinese/%s" },
        { name: "韦氏", url: "https://www.merriam-webster.com/dictionary/%s" },
        { name: "词源在线", url: "https://www.etymonline.com/cn/word/%s" },
    ]);
}

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
            el("button", iconEl(add_svg), {
                onclick: () => {
                    onlineDicsEl.append(onlineDicItem(addOnlineDic1El.value, addOnlineDic2El.value));
                    addOnlineDic1El.value = "";
                    addOnlineDic2El.value = "";
                },
            })
        )
    )
);

showOnlineDics();

async function saveSortOnlineDics() {
    const l = Array.from(onlineDicsEl.querySelectorAll("li"));
    const dl: onlineDicsType = [];
    for (let i of l) {
        const name = i.querySelectorAll("input")[0].value;
        const url = i.querySelectorAll("input")[1].value;
        dl.push({ name, url });
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
            let dic = JSON.parse(reader.result as string);
            console.log(dic);
            const id = dic.id;
            let l = (dics[id] = new Map());
            for (let i in dic.dic) {
                l.set(i, dic.dic[i]);
            }
            dicStore.setItem(id, l);
            setting.setItem("dics", Object.keys(dics));
        };
    }
};

async function getIPA(word: string) {
    if (!ipa) {
        let lan = bookLan || "en";
        let i = await ipaStore.getItem(lan);
        if (!i) return "";
        ipa = (await i) as Map<string, string | string[]>;
    }

    let r = ipa.get(word);
    if (!r) return "";
    if (Array.isArray(r)) {
        let l: string[] = [];
        for (let i of r) {
            l = l.concat(i.split(",").map((w) => w.trim()));
        }
        return l.join(",");
    } else {
        return r
            .split(",")
            .map((w) => w.trim())
            .join(",");
    }
}

settingEl.append(el("label", ["学习语言", el("input", { "data-path": "lan.learn" })]));

const rmbwJsonName = "rmbw.json";
const rmbwZipName = "rmbw.zip";

type allData = {
    bookshelf: Object;
    sections: Object;
    cards: Object;
    words: Object;
    spell: Object;
    card2word: Object;
    card2sentence: Object;
    actions: Object;
};

let allData2Store: { [key: string]: LocalForage } = {
    bookshelf: bookshelfStore,
    sections: sectionsStore,
    cards: cardsStore,
    words: wordsStore,
    spell: spellStore,
    card2word: card2word,
    card2sentence: card2sentence,
    actions: cardActionsStore,
} as { [key in keyof allData]: LocalForage };
async function getAllData() {
    let l: allData = {
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
    return JSON.stringify(l, null, 2);
}

let isSetData = false;

async function setAllData(data: string) {
    if (isSetData) return;
    isSetData = true;
    const tip = el("span", "正在更新……");
    putToast(tip, 0);
    let json = JSON.parse(data) as allData;

    if (Object.keys(json.actions).at(-1) < (await cardActionsStore.keys()).at(-1)) {
        const r = await confirm(`⚠️本地数据似乎更加新，是否继续更新？\n若更新，可能造成数据丢失`);
        if (!r) {
            tip.remove();
            isSetData = false;
            return;
        }
    }

    for (let key of ["cards", "spell"]) {
        for (let i in json[key]) {
            let r = json[key][i] as Card;
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
        let l: string[] = [];
        for (let i in wrongL) {
            l.push(`${i}：${wrongL[i].o}->${wrongL[i].n}`);
        }
        const r = await confirm(
            `⚠️以下数据内容发生重大变更，是否继续更新？\n若更新，可能造成数据丢失\n\n${l.join("\n")}`
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
    let fs = new zip.fs.FS();
    fs.addText(rmbwJsonName, data);
    return fs.exportBlob();
}

function basicAuth(username: string, passwd: string) {
    return `Basic ${username}:${passwd}`;
}

function joinFilePath(baseurl: string, name: string) {
    let url = baseurl;
    if (url.at(-1) != "/") url += "/";
    url += rmbwZipName;
    return url;
}

const DAVConfigPath = { url: "webStore.dav.url", user: "webStore.dav.user", passwd: "webStore.dav.passwd" };

async function getDAV() {
    const baseurl = (await setting.getItem(DAVConfigPath.url)) as string;
    const username = (await setting.getItem(DAVConfigPath.user)) as string;
    const passwd = (await setting.getItem(DAVConfigPath.passwd)) as string;
    let url = joinFilePath(baseurl, rmbwZipName);
    let data = (
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
    let url = joinFilePath(baseurl, rmbwZipName);
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

async function getGitHub() {
    const user = (await setting.getItem(GitHubConfigPath.user)) as string;
    const repo = (await setting.getItem(GitHubConfigPath.repo)) as string;
    const token = (await setting.getItem(GitHubConfigPath.token)) as string;
    const path = ((await setting.getItem(GitHubConfigPath.path)) as string) || "data.json";
    return {
        url: `https://api.github.com/repos/${user}/${repo}/contents/${path}`,
        auth: {
            Authorization: `Bearer ${token}`,
        },
        user,
        repo,
        path,
    };
}

let uploadDataEl = el("input", "上传数据", {
    type: "file",
    onchange: () => {
        let reader = new FileReader();
        reader.readAsText(uploadDataEl.files[0]);
        reader.onload = () => {
            setAllData(reader.result as string);
        };
    },
});

import { encode } from "js-base64";

function download(text: string, name: string) {
    let blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    let a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
}

let asyncEl = el("div", [
    el("h2", "数据"),
    el("div", [
        el("button", "导出数据", {
            onclick: async () => {
                let data = await getAllData();
                download(data, rmbwJsonName);
            },
        }),
        uploadDataEl,
    ]),
    el("div", [
        el("h3", "webDAV"),
        el("button", "↓", {
            onclick: async () => {
                let data = await getDAV();
                let str = await xunzip(data);
                setAllData(JSON.parse(str));
            },
        }),
        el("button", "↑", {
            onclick: async () => {
                let data = await getAllData();
                let file = await xzip(data);
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
                let config = await getGitHub();
                let data = await fetch(
                    (await setting.getItem(GitHubConfigPath.download)) ||
                        `https://raw.githubusercontent.com/${config.user}/${config.repo}/main/${config.path}`
                );
                let str = await data.text();
                setAllData(str);
            },
        }),
        el("button", "↑", {
            onclick: async () => {
                let data = await getAllData();
                let base64 = encode(data);
                let config = await getGitHub();
                let sha = "";
                try {
                    sha = (await (await fetch(config.url, { headers: { ...config.auth } })).json()).sha;
                } catch (error) {}
                fetch(config.url, {
                    method: "PUT",
                    headers: {
                        ...config.auth,
                    },
                    body: JSON.stringify({
                        message: "更新数据",
                        content: base64,
                        sha,
                    }),
                })
                    .then(() => {
                        const p = el("span", "上传成功");
                        putToast(p);
                    })
                    .catch(() => {
                        putToast(el("span", "上传失败"), 6000);
                    });
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

async function getCSV() {
    const spChar = ",";
    let text: string[] = [["card_id", "review_time", "review_rating", "review_state", "review_duration"].join(spChar)];
    await cardActionsStore.iterate((v, k) => {
        if (!v["rating"]) return;
        const card_id = v["cardId"];
        const review_time = Number(k);
        const review_rating = v["rating"];
        const review_state = v["state"];
        const review_duration = v["duration"];
        let row = [card_id, review_time, review_rating, review_state, review_duration].join(spChar);
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
        el("button", "导出", {
            onclick: async () => {
                const csv = await getCSV();
                const blob = new Blob([csv], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "review.csv";
                a.click();
            },
        }),
        el("br"),
        el("label", ["参数：", el("input", { "data-path": "fsrs.w" })]),

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
                let segments = segmenter.segment(text);
                const wordsCount = Array.from(segments).length;
                readSpeedEl.value = String(Math.round((endTime - startTime) / wordsCount));
                readSpeedEl.dispatchEvent(new Event("input"));
            },
        }),
        el("label", [readSpeedEl, "ms/word"]),
        el("h3", "复习休息"),
        el("input", { type: "number", path: "review.maxCount", value: String(maxReviewCount) }),
        el("span", "0为不限制，刷新生效"),
    ])
);

const ttsEngineEl = el("select", { "data-path": ttsEngineConfig }, [
    el("option", "浏览器", { value: "browser" }),
    el("option", "微软", { value: "ms" }),
]);

let loadTTSVoicesEl = el("button", "load");
let voicesListEl = el("select");
loadTTSVoicesEl.onclick = async () => {
    voicesListEl.innerHTML = "";
    if ((await getTtsEngine()) === "browser") {
        const list = speechSynthesis.getVoices();
        for (let v of list) {
            let text = `${v.name.replace(/Microsoft (\w+) Online \(Natural\)/, "$1")}`;
            let op = el("option", text, { value: v.name });
            voicesListEl.append(op);
        }
    } else {
        let list = await tts.getVoices();
        for (let v of list) {
            let text = `${v.Gender === "Male" ? "♂️" : "♀️"} ${v.FriendlyName.replace(
                /Microsoft (\w+) Online \(Natural\)/,
                "$1"
            )}`;
            let op = el("option", text, { value: v.ShortName });
            voicesListEl.append(op);
        }
    }
    voicesListEl.value = await setting.getItem(ttsVoiceConfig);
    voicesListEl.onchange = () => {
        let name = voicesListEl.value;
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
    ])
);

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
                })
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
                            })
                        );
                    },
                }),
            ]),
            el("div", [
                el(
                    "a",
                    { href: "https://github.com/xushengfeng/xlinkote/", target: "_blank" },
                    "项目开源地址",
                    el("img", { src: githubIcon })
                ),
            ]),
            el("div", el("a", { href: "https://github.com/xushengfeng/xlinkote/blob/master/LICENSE" }, "GPL-3.0")),
            el("div", [
                "Designed and programmed by xsf ",
                el("a", { href: "mailto:xushengfeng_zg@163.com" }, "xushengfeng_zg@163.com"),
            ]),
        ]),
    ])
);

settingEl.querySelectorAll("[data-path]").forEach(async (el: HTMLElement) => {
    const path = el.getAttribute("data-path");
    let value = await setting.getItem(path);
    if (el.tagName === "INPUT") {
        let iel = el as HTMLInputElement;
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
    } else if (el.tagName === "SELECT") {
        (el as HTMLSelectElement).value = value as string;
        el.onchange = () => {
            setting.setItem(path, (el as HTMLSelectElement).value);
        };
    }
});

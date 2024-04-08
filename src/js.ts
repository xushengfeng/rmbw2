/// <reference types="vite/client" />

import { el, text, setStyle } from "redom";

import localforage from "localforage";
import { extendPrototype } from "localforage-setitems";
extendPrototype(localforage);

import * as zip from "@zip.js/zip.js";

import mammoth from "mammoth";

import lemmatizer from "lemmatizer";

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

import pen_svg from "../assets/icons/pen.svg";
import ok_svg from "../assets/icons/ok.svg";
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

function prompt(message?: string, defaultValue?: string) {
    let dialog = document.createElement("dialog");
    dialog.id = "prompt";
    let me = document.createElement("span");
    let input = document.createElement("input");
    let cancelEl = document.createElement("button");
    cancelEl.innerText = "取消";
    cancelEl.classList.add("cancel_b");
    let okEl = document.createElement("button");
    okEl.innerText = "确定";
    okEl.classList.add("ok_b");
    me.innerText = message ?? "";
    input.value = defaultValue ?? "";
    dialog.append(me, input, cancelEl, okEl);
    document.body.append(dialog);
    dialog.showModal();
    return new Promise((re: (name: string) => void, rj) => {
        okEl.onclick = () => {
            re(input.value);
            dialog.close();
        };
        cancelEl.onclick = () => {
            rj();
            dialog.close();
        };
        dialog.onclose = () => {
            rj();
            dialog.remove();
        };
    });
}

function dialogX(el: HTMLDialogElement) {
    document.body.append(el);
    el.showModal();
    el.addEventListener("close", () => {
        el.remove();
    });
}

function vlist(
    pel: HTMLElement,
    list: any[],
    style: {
        iHeight: number;
        gap?: number;
        paddingTop?: number;
        paddingLeft?: number;
        paddingBotton?: number;
        paddingRight?: number;
        width?: string;
    },
    f: (index: number, item: any, remove: () => void) => HTMLElement | Promise<HTMLElement>
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
    blankEl.style.height = iHeight * list.length + gap * list.length + paddingTop + paddingBotton + "px";
    pel.append(blankEl);
    const dataI = "data-v-i";
    async function show() {
        let startI = Math.ceil((pel.scrollTop - paddingTop) / (iHeight + gap));
        let endI = Math.floor((pel.scrollTop - paddingTop + pel.offsetHeight) / (iHeight + gap));
        let buffer = Math.min(Math.floor((endI - startI) / 3), 15);
        startI -= buffer;
        endI += buffer;
        startI = Math.max(0, startI);
        endI = Math.min(list.length - 1, endI);
        let oldRangeList: number[] = [];
        pel.querySelectorAll(`:scope > [${dataI}]`).forEach((el: HTMLElement) => {
            oldRangeList.push(Number(el.getAttribute(dataI)));
        });
        for (let i of oldRangeList) {
            if (i < startI || endI < i) pel.querySelector(`:scope > [${dataI}="${i}"]`).remove();
        }
        for (let i = startI; i <= endI; i++) {
            if (oldRangeList.includes(i)) continue;
            let iel = await f(i, list[i], () => {
                iel.remove();
                for (let ii = i + 1; ii <= endI; ii++) {
                    let afterEl = pel.querySelector(`:scope > [${dataI}="${ii}"]`) as HTMLElement;
                    if (!afterEl) continue;
                    afterEl.setAttribute(dataI, String(ii - 1));
                    afterEl.style.top = Number(afterEl.style.top.slice(0, -2)) - iHeight - gap + "px";
                }
                list = list.toSpliced(i, 1); // 这里list和索引都更新，f内部原始索引和list都不变，数据是一致的

                show(); // 补全最后一个元素
            });
            setStyle(iel, {
                position: "absolute",
                top: paddingTop + i * (iHeight + gap) + "px",
                left: paddingLeft + "px",
                ...(style.width ? { width: style.width } : {}),
            });
            iel.setAttribute(dataI, String(i));
            pel.append(iel);
        }
    }
    show();
    function s() {
        requestAnimationFrame(show);
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
const NOTEDIALOG = "note_dialog";
const AIDIALOG = "ai_dialog";
const DICDIALOG = "dic_dialog";

const booksEl = document.getElementById("books");
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
const bookNavEl = document.getElementById("book_nav");
bookNavEl.append(addSectionEL, bookSectionsEl);
let bookContentEl = document.getElementById("book_content");
const bookContentContainerEl = bookContentEl.parentElement;
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
const dicDetailsEl = el("div", {
    style: {
        overflow: "scroll",
        gap: "1rem",
        display: "flex",
        flexDirection: "column",
    },
    class: "dic_details",
});

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

const toastEl = document.getElementById("toast");

var bookshelfStore = localforage.createInstance({ name: "bookshelf" });
var sectionsStore = localforage.createInstance({ name: "sections" });

type book = {
    name: string;
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

function getBooksById(id: string) {
    return new Promise((re: (a: book) => void) => {
        bookshelfStore.iterate((b: book, k) => {
            if (b.id === id) {
                return re(b);
            }
        });
        return null;
    });
}
async function getSection(id: string) {
    return (await sectionsStore.getItem(id)) as section;
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
    return { book: id, sections: 0 };
}

function newSection() {
    let s: section = { title: "新章节", lastPosi: 0, text: "", words: {} };
    return s;
}

bookBEl.onclick = () => {
    booksEl.showPopover();
};

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

function showOnlineBooks(
    books: {
        name: string;
        id: string;
        type: "word" | "text";
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
        let div = document.createElement("div");
        let title = document.createElement("span");
        if (book.cover) {
            let bookCover = document.createElement("img");
            bookCover.src = book.cover;
            div.append(bookCover);
        } else {
            let bookCover = document.createElement("div");
            bookCover.innerText = book.name;
            div.append(bookCover);
        }
        title.innerText = book.name;
        div.append(title);
        div.onclick = async () => {
            console.log(book);
            let xbook = (await bookshelfStore.getItem(book.id)) as book;
            if (xbook) {
                if (xbook.updateTime < book.updateTime) {
                    saveBook();
                }
            } else {
                xbook = {
                    name: book.name,
                    id: book.id,
                    visitTime: 0,
                    updateTime: 0,
                    type: book.type,
                    sections: [],
                    canEdit: false,
                    lastPosi: 0,
                    language: "en",
                };
                saveBook();
            }
            function saveBook() {
                let s = [];
                const fetchPromises = book.sections.map(async (item) => {
                    const { id, path, title } = item;
                    const response = await fetch((await getOnlineBooksUrl()) + "/source/" + path);
                    const content = await response.text();
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
                        xbook.sections = s;
                        xbook.updateTime = book.updateTime;
                        await bookshelfStore.setItem(book.id, xbook);
                        showBooks();
                    })
                    .catch((error) => {
                        console.error(error);
                    });
            }
        };
        onlineBookEl.append(div);
        console.log(onlineBookEl);
    }
}

addBookEl.onclick = async () => {
    let b = await newBook();
    nowBook = b;
    let book = await getBooksById(nowBook.book);
    showBook(book);
    changeEdit(true);
    booksEl.hidePopover();
};

addSectionEL.onclick = async () => {
    if (!nowBook.book) nowBook = await newBook();
    let book = await getBooksById(nowBook.book);
    let sid = uuid();
    book.sections.push(sid);
    book.lastPosi = book.sections.length - 1;
    let s = newSection();
    await sectionsStore.setItem(sid, s);
    await bookshelfStore.setItem(nowBook.book, book);
    nowBook.sections = book.lastPosi;
    showBook(book);
    changeEdit(true);
};

document.getElementById("book_sections").onclick = () => {
    bookNavEl.classList.toggle("book_nav_show");
};

let nowBook = {
    book: "",
    sections: NaN,
};

let isWordBook = false;
let bookLan = ((await setting.getItem("lan.learn")) as string) || "en";

showBooks();
setBookS();

const bookNameEl = document.getElementById("book_name");
async function setBookS() {
    if (nowBook.book) {
        let sectionId = (await getBooksById(nowBook.book)).sections[nowBook.sections];
        let section = await getSection(sectionId);
        document.getElementById("book_name").innerText = `${(await getBooksById(nowBook.book)).name} - ${
            section.title
        }`;
        bookNameEl.onclick = () => {
            let titleEl = el("input", { style: { "font-size": "inherit" } });
            titleEl.value = section.title;
            titleEl.select();
            bookNameEl.innerHTML = "";
            bookNameEl.append(
                titleEl,
                el("button", iconEl(ok_svg), {
                    onclick: async () => {
                        let sectionId = (await getBooksById(nowBook.book)).sections[nowBook.sections];
                        let section = await getSection(sectionId);
                        section.title = titleEl.value;
                        await sectionsStore.setItem(sectionId, section);
                        setBookS();
                    },
                })
            );
            titleEl.focus();
        };
    }
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
        let bookIEl = document.createElement("div");
        let titleEl = document.createElement("span");
        if (book.cover) {
            let bookCover = document.createElement("img");
            bookCover.src = book.cover;
            bookIEl.append(bookCover);
        } else {
            let bookCover = document.createElement("div");
            bookCover.innerText = book.name;
            bookIEl.append(bookCover);
        }
        titleEl.innerText = book.name;
        bookIEl.append(titleEl);
        localBookEl.append(bookIEl);
        bookIEl.onclick = () => {
            showBook(book);
            book.visitTime = new Date().getTime();
            bookshelfStore.setItem(book.id, book);
            booksEl.hidePopover();
        };
        bookIEl.oncontextmenu = (e) => {
            e.preventDefault();
            e.stopPropagation();
            menuEl.innerHTML = "";
            let renameEl = document.createElement("div");
            renameEl.innerText = "重命名";
            renameEl.onclick = async () => {
                let name = await prompt("更改书名", book.name);
                if (name) {
                    titleEl.innerText = name;
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
    nowBook.sections = book.lastPosi;
    showBookSections(book.sections);
    showBookContent(book.sections[book.lastPosi]);
    setBookS();
    isWordBook = book.type === "word";
    bookLan = book.language;
}
async function showBookSections(sections: book["sections"]) {
    sections = structuredClone(sections);
    bookSectionsEl.innerHTML = "";
    vlist(
        bookSectionsEl,
        sections,
        { iHeight: 24, paddingTop: 16, paddingLeft: 16, width: "calc(20vw - 1rem * 2)" },
        async (i) => {
            let sEl = document.createElement("div");
            let s = await getSection(sections[i]);
            sEl.innerText = s.title || `章节${Number(i) + 1}`;
            for (let i in s.words) {
                if (!s.words[i].visit) {
                    sEl.classList.add(TODOMARK);
                    break;
                }
            }
            sEl.onclick = async () => {
                sEl.classList.remove(TODOMARK);

                nowBook.sections = Number(i);
                showBookContent(sections[i]);
                setBookS();
                let book = await getBooksById(nowBook.book);
                book.lastPosi = nowBook.sections;
                bookshelfStore.setItem(nowBook.book, book);
            };
            sEl.oncontextmenu = (e) => {
                e.preventDefault();
                e.stopPropagation();
                menuEl.innerHTML = "";
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
        }
    );
}

let wordList: { text: string; c: record; type?: "ignore" | "learn" }[] = [];

let contentP: string[] = [];

async function showBookContent(id: string) {
    let s = (await sectionsStore.getItem(id)) as section;
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

    wordList = [];
    if (isWordBook) {
        let l = s.text.trim().split("\n");
        let keys = await wordsStore.keys();
        const ignoreWords = await getIgnoreWords();
        let matchWords = 0;
        let means1 = 0;
        for (let i of l) {
            let t = i;
            let c: record;
            let type: "ignore" | "learn" = null;
            if (keys.includes(i)) {
                c = (await wordsStore.getItem(i)) as record;
                type = "learn";
                matchWords++;
                let r = 0;
                for (let j of c.means) {
                    let x = (await cardsStore.getItem(j.card_id)) as fsrsjs.Card;
                    let retrievability = Math.pow(1 + x.elapsed_days / (9 * x.stability), -1) || 0;
                    r += retrievability;
                }
                means1 += r / c.means.length;
            } else if (ignoreWords.includes(i)) {
                type = "ignore";
                matchWords++;
                means1 += 1;
            }
            if (type) wordList.push({ text: t, c: c, type });
            else wordList.push({ text: t, c: c });
        }
        let spell = 0;
        for (let i of l) {
            let c = (await spellStore.getItem(i)) as fsrsjs.Card;
            if (c) {
                let retrievability = Math.pow(1 + c.elapsed_days / (9 * c.stability), -1) || 0;
                spell += retrievability;
            } else if (ignoreWords.includes(i)) {
                spell += 1;
            }
        }
        function p(number: number) {
            return el("td", [number.toFixed(1), el("progress", { value: number / l.length })]);
        }
        bookContentContainerEl.append(
            el(
                "div",
                { class: "words_book_top" },
                el("table", { class: "words_sum" }, [
                    el("tr", [el("th", "词"), el("th", "了解"), el("th", "记忆"), el("th", "拼写")]),
                    el("tr", [el("td", String(l.length)), p(matchWords), p(means1), p(spell)]),
                ])
            )
        );

        vlist(bookContentContainerEl, wordList, { iHeight: 24, gap: 8, paddingTop: 120, paddingBotton: 8 }, (i) => {
            let p = el("p", wordList[i].text);
            if (wordList[i].type) {
                p.classList.add(wordList[i].type);
            }
            p.oncontextmenu = (e) => {
                e.preventDefault();
                menuEl.innerHTML = "";
                showMenu(e.clientX, e.clientY);
                menuEl.append(
                    el("div", "添加到忽略词表", {
                        onclick: async () => {
                            await addIgnore(wordList[i].text);
                        },
                    })
                );
            };
            return p;
        });

        setScrollPosi(bookContentContainerEl, contentScrollPosi);
        return;
    }

    const segmenter = new Segmenter(bookLan, { granularity: "word" });
    let segments = segmenter.segment(s.text);
    let list = Array.from(segments);
    let plist: { text: string; start: number; end: number; isWord: boolean }[][] = [[]];
    for (let word of list) {
        if (/\n+/.test(word.segment)) {
            plist.push([]);
        } else {
            if (word.segment === "#" && plist.at(-1)?.at(-1)?.text === "#") {
                plist.at(-1).at(-1).text += "#";
                plist.at(-1).at(-1).end += 1;
            } else {
                plist.at(-1).push({
                    text: word.segment,
                    start: word.index,
                    end: word.index + word.segment.length,
                    isWord: word.isWordLike,
                });
            }
        }
    }
    console.log(plist);

    for (let paragraph of plist) {
        let pel: HTMLElement = document.createElement("p");
        let t = paragraph[0]?.text.match(/#+$/) && paragraph[1]?.text === " ";
        if (t) pel = document.createElement("h" + paragraph[0].text.trim().length);

        let pText = editText.slice(paragraph[0]?.start ?? null, paragraph.at(-1)?.end ?? null);

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

        for (let i in paragraph) {
            if (t && i === "0") continue;
            const word = paragraph[i];

            let span = document.createElement("span");
            span.innerText = word.text;
            for (let i in s.words) {
                let index = s.words[i].index;
                if (index[0] === word.start && index[1] === word.end) {
                    span.classList.add(MARKWORD);
                }
            }
            span.setAttribute("data-s", String(word.start));
            span.setAttribute("data-e", String(word.end));
            span.setAttribute("data-i", i);
            pel.append(span);
        }
        pel.onclick = async (ev) => {
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
            const i = span.getAttribute("data-i");
            let s = paragraph[0].start,
                e = paragraph.at(-1).end;
            let j = Number(i);
            while (j >= 0 && !paragraph[j].text.match(/[.?!\n]/)) {
                s = paragraph[j].start;
                j--;
            }
            j = Number(i);
            while (j < paragraph.length && !paragraph[j].text.match(/[.?!\n]/)) {
                e = paragraph[j].end;
                j++;
            }
            console.log(s);

            let id = await saveCard({
                dic: "lw",
                key: span.innerText,
                dindex: -1,
                index: { start: Number(span.getAttribute("data-s")), end: Number(span.getAttribute("data-e")) },
                pindex: { start: paragraph[0].start, end: paragraph.at(-1).end },
                cindex: { start: s, end: e },
            });
            if (span.classList.contains(MARKWORD)) {
                showDic(id);
            }

            span.classList.add(MARKWORD);
        };
        pel.oncontextmenu = async (ev) => {
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

        bookContentEl.append(pel);
    }

    setScrollPosi(bookContentContainerEl, contentScrollPosi);

    bookContentEl.append(dicEl);
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

const bookStyleList = {
    fontSize: [],
    lineHeight: [],
    contentWidth: [],
};
const bookStyle = JSON.parse(
    ((await setting.getItem("setyle.default")) as string) ||
        JSON.stringify({
            fontSize: 2,
            lineHeight: 2,
            contentWidth: 2,
            fontFamily: "serif",
            theme: "auto",
            paper: true,
        })
);
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
        // @ts-ignore
        const availableFonts = await window.queryLocalFonts();
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
    setting.setItem("setyle.default", JSON.stringify(bookStyle));
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
            let sectionId = book.sections[nowBook.sections];
            let section = await getSection(sectionId);
            book.updateTime = new Date().getTime();
            section.lastPosi = contentScrollPosi;
            if (editText) {
                section = changePosi(section, editText);
                section.text = editText;
                await sectionsStore.setItem(sectionId, section);
                await bookshelfStore.setItem(nowBook.book, book);
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
    let sectionId = book.sections[nowBook.sections];
    let section = await getSection(sectionId);
    bookContentContainerEl.innerHTML = "";
    let text = el("textarea");
    text.disabled = !book.canEdit;
    bookContentContainerEl.append(text);
    bookContentEl = text;
    text.value = section.text;
    setScrollPosi(text, contentScrollPosi);
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
    let book = await getBooksById(nowBook.book);
    let sectionId = book.sections[nowBook.sections];
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
    return Array.from(el.querySelectorAll("input:checked")).map((i: HTMLInputElement) => i.value);
}

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

let ipaDics: { [key: string]: Map<string, string> } = {};
var ipaDicStore = localforage.createInstance({ name: "ipa_dic" });
setting.getItem("ipa_dics").then(async (l: string[]) => {
    for (let i of l || []) {
        ipaDics[i] = (await ipaDicStore.getItem(i)) as Map<string, string>;
    }
});

type record = {
    word: string;
    means: {
        text: string;
        contexts: {
            text: string;
            index: [number, number]; // 语境定位
            source: { book: string; sections: number; id: string }; // 原句通过对比计算
        }[];
        card_id: string;
    }[];
    note?: string;
};
type record2 = {
    text: string;
    trans: string;
    source: { book: string; sections: number; id: string }; // 原句通过对比计算
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
    vlist(
        markListEl,
        list,
        { iHeight: 24, gap: 4, paddingTop: 16, paddingLeft: 16 },
        (index, i: (typeof list)[0], remove) => {
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
                            let book = await getBooksById(nowBook.book);
                            let sectionId = book.sections[nowBook.sections];
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
                        },
                    })
                );
                showMenu(e.clientX, e.clientY);
            };
            return item;
        }
    );
}

async function getAllMarks() {
    let book = await getBooksById(nowBook.book);
    let sectionId = book.sections[nowBook.sections];
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
    let span = bookContentEl.querySelector(`span[data-s="${start}"]`);
    bookContentContainerEl.scrollTop = span.getBoundingClientRect().top - bookContentEl.getBoundingClientRect().top;
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

let dicMeansAi: AbortController;
let dicTransAi: AbortController;

let nowDicId = "";

async function showDic(id: string) {
    dicMeansAi?.abort();
    dicTransAi?.abort();
    dicMeansAi = null;
    dicTransAi = null;

    const showClass = "dic_show";
    dicEl.classList.add(showClass);

    nowDicId = id;

    let book = await getBooksById(nowBook.book);
    let sectionId = book.sections[nowBook.sections];
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
        if (!isSentence && !dicTransContent.value) {
            // 单词模式且无翻译（意味着无需重新翻译，只需读取缓存）
            let text = (await transCache.getItem(Share.context)) as string;
            if (text) {
                dicTransContent.value = text;
                return;
            }
        }
        let output = ai(
            [
                {
                    role: "system",
                    content: `您是一个翻译引擎，只能将用户的输入文本翻译为${navigator.language}，无法解释。`,
                },
                { role: "user", content: Share.context },
            ],
            "翻译"
        );
        dicTransAi = output.stop;
        let text = await output.text;
        dicTransContent.value = text;
        if (isSentence) {
            let r = (await card2sentence.getItem(wordx.id)) as record2;
            r.trans = text;
            await card2sentence.setItem(wordx.id, r);
            visit(true);
        }

        transCache.setItem(Share.context, text);
    };

    toSentenceEl.onclick = async () => {
        if (isSentence) return;
        isSentence = true;
        const sentenceCardId = uuid();
        let contextStart = wordx.index[0] - Share.sourceIndex[0];
        let contextEnd = wordx.index[1] + (Share.context.length - Share.sourceIndex[1]);
        wordx.index[0] = contextStart;
        wordx.index[1] = contextEnd;
        wordx.type = "sentence";
        wordx.id = sentenceCardId;
        if (dicTransContent.value) wordx.visit = true;
        section.words[id] = wordx;
        sectionsStore.setItem(sectionId, section);

        let r: record2 = {
            text: Share.context,
            source: null,
            trans: dicTransContent.value,
        };

        let card: fsrsjs.Card;

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
            card = new fsrsjs.Card();
            newCardAction(sentenceCardId);
        }
        await cardsStore.setItem(sentenceCardId, card);

        await card2sentence.setItem(sentenceCardId, r);

        Word.record = rmWord(Word.record, Word.context.source.id);
        clearWordMean(Word.record);

        showSentence();

        rmStyle(wordx.index[0]);
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

        let lword = lemmatizer(sourceWord);
        moreWordsEl.innerHTML = "";
        for (let w of Array.from(new Set([sourceWord, lword]))) {
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
                radio.onclick = () => {
                    if (radio.checked) {
                        dicMeansAi?.abort();
                        changeDicMean(word, Number(i));

                        visit(true);
                    }
                    editMeanEl.style.display = "";
                };
                if (Number(i) === Word.index) radio.checked = true;
                div.onclick = () => radio.click();
                div.append(radio, disCard2(m));
                dicDetailsEl.append(div);
            }
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
                    if (i.getAttribute("data-i")) {
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
                    if (i.getAttribute("data-i")) {
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

            dicMeansAi?.abort();
            dicTransAi?.abort();
            dicMeansAi = null;
            dicTransAi = null;
        };
    }
}

function shwoDicEl(mainTextEl: HTMLTextAreaElement, word: string, x: number, y: number) {
    let list = el("div");
    let dic = dics["lw"].get(word);
    if (dic.isAlias) dic = dics["lw"].get(dic.text);
    let tmpdiv = el("div");
    tmpdiv.innerHTML = dic.text;
    for (let i of tmpdiv.innerText.split("\n").filter((i) => i.trim() != "")) {
        let p = el("p");
        p.innerHTML = i;
        list.appendChild(el("label", [el("input", { type: "checkbox", value: p.innerText }), p]));
    }
    let div = el("dialog", { class: DICDIALOG }, [
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
function disCard2(m: record["means"][0]) {
    let div = document.createDocumentFragment();
    let disEl = el("p");
    disEl.innerText = m.text;
    let sen = document.createElement("div");
    sen.classList.add("dic_sen");
    for (let s of m.contexts) {
        sen.append(
            el("div", [
                el("p", [
                    s.text.slice(0, s.index[0]),
                    el("span", { class: MARKWORD }, s.text.slice(...s.index)),
                    s.text.slice(s.index[1]),
                ]),
            ])
        );
    }
    div.append(el("div", disEl), sen);
    return div;
}

async function saveCard(v: {
    dic: string;
    key: string;
    dindex: number;
    index: { start: number; end: number };
    pindex: { start: number; end: number };
    cindex: { start: number; end: number };
}) {
    let book = await getBooksById(nowBook.book);
    let sectionId = book.sections[nowBook.sections];
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
    let textEl = el("textarea", { value: text });
    let aiB = getAiButtons(textEl, word, sentence);
    let div = el("dialog", { class: NOTEDIALOG }, [
        p,
        textEl,
        el("div", { style: { display: "flex" } }, [
            aiB,
            el("button", iconEl(ok_svg), {
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
            }),
        ]),
    ]) as HTMLDialogElement;
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
        tmpAiB(textEl, `$这里有个单词${word}`)
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
            shwoDicEl(mainTextEl, word, dicB.getBoundingClientRect().x, dicB.getBoundingClientRect().y);
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
    toastEl.append(pel);
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

import * as fsrsjs from "fsrs.js";
let fsrs = new fsrsjs.FSRS();
const fsrsW = JSON.parse(await setting.getItem("fsrs.w")) as number[];
if (fsrsW?.length === 17) {
    fsrs.p.w = fsrsW;
}

var cardsStore = localforage.createInstance({ name: "word", storeName: "cards" });
var wordsStore = localforage.createInstance({ name: "word", storeName: "words" });
var card2word = localforage.createInstance({ name: "word", storeName: "card2word" });
var spellStore = localforage.createInstance({ name: "word", storeName: "spell" });
var card2sentence = localforage.createInstance({ name: "word", storeName: "card2sentence" });

var cardActionsStore = localforage.createInstance({ name: "word", storeName: "actions" });
function setCardAction(cardId: string, time: Date, rating: fsrsjs.Rating, state: fsrsjs.State, duration: number) {
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
        let card2 = new fsrsjs.Card();
        newCardAction(word);
        await spellStore.setItem(word, card2);
    }
    let cardId = uuid();
    let m = { text, contexts: [], card_id: cardId };
    w.means.push(m);
    let card = new fsrsjs.Card();
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
        context: { index: [NaN, NaN], source: { book: "", sections: 0, id: "" }, text: "" },
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
    bookContentEl.querySelectorAll("span[data-i]").forEach((el: HTMLSpanElement) => {
        if (words.includes(el.innerText)) {
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
    const sectionId = (await setting.getItem("wordBook.ignore")) as string;
    if (!sectionId) return [];
    const section = await getSection(sectionId);
    if (!section) return [];
    return section.text.trim().split("\n");
}

async function autoIgnore() {
    const sectionId = (await setting.getItem("wordBook.ignore")) as string;
    if (!sectionId) return;
    const dialog = el("dialog", { class: "words_select" }) as HTMLDialogElement;
    const f = el("div");
    const words = Array.from(
        new Set(
            Array.from(bookContentEl.querySelectorAll(`:scope>*>span:not(.${MARKWORD})`)).map((el) =>
                el.textContent.trim().toLocaleLowerCase()
            )
        )
    );
    const section = await getSection(sectionId);
    const oldWords = section.text.trim().split("\n");
    const studyWords = await wordsStore.keys();
    const hasLentWords = oldWords.concat(studyWords);
    const newWords = words;
    const wordsWithRoot: { src: string; show: string }[] = [];
    for (const w of newWords) {
        const r = lemmatizer(w);
        if (hasLentWords.includes(w) && !hasLentWords.includes(r) && r.length > 1) {
            wordsWithRoot.push({ src: w, show: r });
        }
        if (!hasLentWords.includes(w) && hasLentWords.includes(r)) {
            wordsWithRoot.push({ src: w, show: w });
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
                await sectionsStore.setItem(sectionId, section);
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
    const sectionId = (await setting.getItem("wordBook.ignore")) as string;
    if (!sectionId) return;
    const section = await getSection(sectionId);
    const oldWords = section.text.trim().split("\n");
    if (!oldWords.includes(word)) {
        oldWords.push(word);
        section.text = oldWords.join("\n");
        await sectionsStore.setItem(sectionId, section);
    } else {
        return;
    }
}

setTimeout(async () => {
    let d = await getFutureReviewDue(0.1);
    let c = 0;
    c += Object.keys(d.word).length + Object.keys(d.spell).length;
    if (c > 0) reviewBEl.classList.add(TODOMARK);
}, 10);

const reviewBEl = document.getElementById("reviewb");
const reviewEl = document.getElementById("review");
reviewBEl.onclick = () => {
    reviewEl.classList.toggle("review_show");
    reviewBEl.classList.remove(TODOMARK);
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
        } else if (e.key === "?") {
            spellF("{tip}");
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
    console.log(e);
    if ((e.target as HTMLElement).tagName === "BUTTON") return;
    if (keyboardEl.contains(e.target as HTMLElement)) return;
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

async function getFutureReviewDue(days: number) {
    let now = new Date().getTime();
    now += days * 24 * 60 * 60 * 1000;
    now = Math.round(now);
    const wordsScope = await getWordsScope();
    let wordList: { id: string; card: fsrsjs.Card }[] = [];
    const wordListTemp: string[] = [];
    let spellList: { id: string; card: fsrsjs.Card }[] = [];
    let sentenceList: { id: string; card: fsrsjs.Card }[] = [];
    const sentenceListTemp: string[] = [];
    await card2word.iterate((value: string, key) => {
        if (filterWithScope(value, wordsScope)) wordListTemp.push(key);
    });
    for (let key of wordListTemp) {
        const card = (await cardsStore.getItem(key)) as fsrsjs.Card;
        if (card.due.getTime() < now) {
            wordList.push({ id: key, card: card });
        }
    }
    let l: typeof wordList = [];
    for (let x of wordList) {
        let wordid = (await card2word.getItem(x.id)) as string;
        let wordRecord = (await wordsStore.getItem(wordid)) as record;
        for (let i of wordRecord.means) {
            if (i.card_id === x.id) {
                l.push(x);
            }
        }
    }
    wordList = l;
    await spellStore.iterate((value: fsrsjs.Card, key) => {
        if (value.due.getTime() < now) {
            if (filterWithScope(key, wordsScope)) spellList.push({ id: key, card: value });
        }
    });

    await card2sentence.iterate((value, key) => {
        sentenceListTemp.push(key);
    });
    for (let key of sentenceListTemp) {
        const card = (await cardsStore.getItem(key)) as fsrsjs.Card;
        if (card.due.getTime() < now) {
            sentenceList.push({ id: key, card: card });
        }
    }
    return { word: wordList, spell: spellList, sentence: sentenceList };
}
async function getReviewDue(type: review) {
    for (let i of due.word) {
        let card = (await cardsStore.getItem(i.id)) as fsrsjs.Card;
        i.card = card;
    }
    for (let i of due.spell) {
        let card = (await spellStore.getItem(i.id)) as fsrsjs.Card;
        i.card = card;
    }
    for (let i of due.sentence) {
        let card = (await cardsStore.getItem(i.id)) as fsrsjs.Card;
        i.card = card;
    }
    let now = new Date().getTime();
    let wordList: { id: string; card: fsrsjs.Card }[] = [];
    let spellList: { id: string; card: fsrsjs.Card }[] = [];
    let sentenceList: { id: string; card: fsrsjs.Card }[] = [];
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
        card: fsrsjs.Card;
    }[];
    spell: {
        id: string;
        card: fsrsjs.Card;
    }[];
    sentence: {
        id: string;
        card: fsrsjs.Card;
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
reviewModeEl.onclick = () => {
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

async function nextDue(type: review) {
    let x = await getReviewDue(type);
    return x;
}

reviewReflashEl.onclick = async () => {
    due = await getFutureReviewDue(0.1);
    let l = await getReviewDue(reviewType);
    console.log(l);
    if (reviewAi.checked && reviewType === "word") await getWordAiContext();
    showReview(l, reviewType);
};

var spellCheckF: (text: string) => void = (text) => console.log(text);
var spellF: (text: string) => void = (text) => console.log(text);
function clearKeyboard() {
    keyboard.clearInput();
}

let aiContexts: { [id: string]: { text: string } } = {};
async function getWordAiContext() {
    const l: { word: string; mean: string }[] = [];
    const newDue = due.word.filter((i) => i.card.state === fsrsjs.State.Review);
    for (let x of newDue) {
        let wordid = (await card2word.getItem(x.id)) as string;
        let wordRecord = (await wordsStore.getItem(wordid)) as record;
        for (let i of wordRecord.means) {
            if (i.card_id === x.id) {
                l.push({ word: wordRecord.word, mean: i.text });
                break;
            }
        }
    }

    if (l.length === 0) return;

    const f = new autoFun.def({
        input: { list: "{word:string,mean:string}[] 单词及释义列表" },
        script: ["为$word及其$expalin提供一个例句，并用**加粗该单词，无需翻译，放到$sentences"],
        output: { sentences: "{word:string,sentence:string}[]" },
    });

    const r = await f.run({ list: l as any }).result;
    let rr: { word: string; sentence: string }[];
    if (Array.isArray(r)) {
        rr = r;
    } else {
        rr = r["sentences"];
    }

    aiContexts = {};
    for (let i in newDue) {
        aiContexts[newDue[i].id] = { text: rr[i]?.sentence || "" };
    }
}

async function showReview(x: { id: string; card: fsrsjs.Card }, type: review) {
    if (!x) {
        reviewViewEl.innerText = "暂无复习🎉";
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
function crContext(word: record, id: string) {
    let context = document.createElement("div");
    if (!word) return context;
    for (let i of word.means) {
        if (i.card_id === id) {
            for (let c of i.contexts.toReversed()) {
                let p = document.createElement("p");
                let span = document.createElement("span");
                span.classList.add(MARKWORD);
                span.innerText = c.text.slice(c.index[0], c.index[1]);
                p.append(c.text.slice(0, c.index[0]), span, c.text.slice(c.index[1]));
                context.append(p);
            }
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
async function showWordReview(x: { id: string; card: fsrsjs.Card }, isAi: boolean) {
    let wordid = (await card2word.getItem(x.id)) as string;
    let wordRecord = (await wordsStore.getItem(wordid)) as record;
    play(wordRecord.word);
    let div = document.createElement("div");
    let context: HTMLDivElement;
    if (isAi && aiContexts[x.id]?.text) context = await aiContext(x.id);
    else context = crContext(wordRecord, x.id);
    let hasShowAnswer = false;
    async function showAnswer() {
        hasShowAnswer = true;
        let word = (await card2word.getItem(x.id)) as string;
        let d = (await wordsStore.getItem(word)) as record;
        for (let i of d.means) {
            if (i.card_id === x.id) {
                let div = document.createElement("div");
                div.append(disCard2(i));
                dic.innerHTML = "";
                dic.append(div);
            }
        }
    }
    context.onclick = reviewHotkey["show"].f = showAnswer;
    let dic = document.createElement("div");
    let buttons = getReviewCardButtons(x.id, x.card, context.innerText, async (rating) => {
        if (hasShowAnswer) {
            let next = await nextDue(reviewType);
            showReview(next, reviewType);
        } else {
            showAnswer();
        }
    });

    div.append(context, dic, buttons);
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

function getReviewCardButtons(id: string, card: fsrsjs.Card, readText: string, f: (rating: number) => void) {
    const showTime = new Date().getTime();
    let hasClick = false;
    let b = (rating: fsrsjs.Rating, icon: HTMLElement) => {
        let button = document.createElement("button");
        button.append(icon);
        button.onclick = reviewHotkey[rating].f = async () => {
            if (hasClick) {
                f(rating);
                return;
            }
            hasClick = true;
            if (rating === fsrsjs.Rating.Good && new Date().getTime() - showTime < (await getReadTime(readText)) + 400)
                rating = fsrsjs.Rating.Easy; // todo 自定义
            setReviewCard(id, card, rating, time() - showTime);
            f(rating);
        };
        return button;
    };
    let againB = b(fsrsjs.Rating.Again, iconEl(close_svg));
    let hardB = b(fsrsjs.Rating.Hard, iconEl(help_svg));
    let goodB = b(fsrsjs.Rating.Good, iconEl(ok_svg));
    let buttons = document.createElement("div");
    buttons.append(againB, hardB, goodB);
    return buttons;
}

async function getReadTime(text: string) {
    const segmenter = new Segmenter(bookLan, { granularity: "word" });
    let segments = segmenter.segment(text);
    const wordsCount = Array.from(segments).length;
    return wordsCount * (Number(await setting.getItem("user.readSpeed")) || 100);
}

async function showSpellReview(x: { id: string; card: fsrsjs.Card }) {
    const word = x.id;
    const spaceHoder = "|";
    let input = el("div", { class: "spell_input", style: { width: "min-content" } }, spaceHoder);
    input.innerText = word; // 占位计算宽度
    clearKeyboard();
    const SHOWSENWORD = "spell_sen_word_show";
    let wordEl = document.createElement("div");
    let isPerfect = false;
    let spellResult: "none" | "right" | "wrong" = "none";
    let showTime = time();
    play(word);
    spellCheckF = async (inputWord: string) => {
        input.innerText = inputWord || "|";
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
                setSpellCard(x.id, x.card, isPerfect ? fsrsjs.Rating.Easy : fsrsjs.Rating.Good, time() - showTime);
            spellResult = "right";
            let next = await nextDue(reviewType);
            showReview(next, reviewType);
            clearKeyboard();
        }
        //错误归位
        if (inputWord.length === word.length && inputWord != word) {
            input.innerText = spaceHoder;
            wordEl.append(await spellDiffWord(word, inputWord));
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
            input.innerText = "";
            clearKeyboard();
            isPerfect = false;
            play(word);
            wordEl.innerText = await hyphenate(word, { hyphenChar });
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
        context.append(el("div", disCard2(i)));
    }
    const div = document.createElement("div");
    div.append(input, wordEl, context);
    div.classList.add("review_spell");
    reviewViewEl.innerHTML = "";
    reviewViewEl.append(div);

    input.style.width = input.offsetWidth + "px";
    input.innerText = spaceHoder;
}

async function spellDiffWord(rightWord: string, wrongWord: string) {
    let div = el("div");
    const rightL = (await hyphenate(rightWord, { hyphenChar })).split(hyphenChar);

    let diff = dmp.diff_main(wrongWord, rightWord);

    const smallestDiff: typeof diff = [];
    const diffL: (typeof diff)[] = [];
    for (let i of rightL) {
        diffL.push([]);
    }
    let rightIndex = 0;
    let diffLength = 0;
    // 拆分
    for (let i of diff) {
        for (let t of i[1]) {
            smallestDiff.push([i[0], t]);
        }
    }
    for (let i of smallestDiff) {
        diffL[rightIndex].push(i);
        if (i[0] != -1) {
            diffLength++;
        }
        if (diffLength >= rightL[rightIndex].length) {
            rightIndex++;
            rightIndex = Math.min(rightIndex, rightL.length - 1);
            diffLength = 0;
        }
    }

    // 合并
    const newDiffL: Diff[][] = [];
    for (let i of diffL) {
        newDiffL.push([]);
        for (let n = 0; n < i.length; n++) {
            if (i[n][0] === newDiffL.at(-1)?.at(-1)?.[0]) {
                newDiffL.at(-1).at(-1)[1] += i[n][1];
            } else {
                newDiffL.at(-1).push(i[n]);
            }
        }
    }

    for (let i in newDiffL) {
        div.append(getDiffWord(newDiffL[i]));
        if (Number(i) < rightL.length - 1) div.append(hyphenChar);
    }
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

async function showSentenceReview(x: { id: string; card: fsrsjs.Card }) {
    let sentence = (await card2sentence.getItem(x.id)) as record2;
    let div = document.createElement("div");
    let context = el("p", sentence.text);
    let hasShowAnswer = false;
    context.onclick = reviewHotkey["show"].f = showAnswer;
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
    let dic = document.createElement("div");
    let buttons = getReviewCardButtons(x.id, x.card, context.innerText, async (rating) => {
        if (hasShowAnswer) {
            let next = await nextDue(reviewType);
            showReview(next, reviewType);
        } else {
            showAnswer();
        }
    });

    div.append(context, dic, buttons);
    div.classList.add("review_word");
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

function setReviewCard(id: string, card: fsrsjs.Card, rating: fsrsjs.Rating, duration: number) {
    let now = new Date();
    setCardAction(id, now, rating, card.state, duration);
    let sCards = fsrs.repeat(card, now);
    cardsStore.setItem(id, sCards[rating].card);
}
function setSpellCard(id: string, card: fsrsjs.Card, rating: fsrsjs.Rating, duration: number) {
    let now = new Date();
    setCardAction(id, now, rating, card.state, duration);
    let sCards = fsrs.repeat(card, now);
    spellStore.setItem(id, sCards[rating].card);
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
    await spellStore.iterate((v: fsrsjs.Card, k: string) => {
        if (!filterWithScope(k, wordsScope)) return;
        spellDue.push(v.due.getTime());
    });
    await card2sentence.iterate((v: record2, k: string) => {
        sentenceDue.push(k);
    });
    const wordDue1: number[] = [];
    for (let k of wordDue) wordDue1.push(((await cardsStore.getItem(k)) as fsrsjs.Card).due.getTime());
    const sentenceDue1: number[] = [];
    for (let k of sentenceDue) sentenceDue1.push(((await cardsStore.getItem(k)) as fsrsjs.Card).due.getTime());

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
                rating: fsrsjs.Rating;
                state: fsrsjs.State;
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
    const canvas = el("canvas", { class: "oneD_plot" });
    const now = time();
    const zoom = 1 / ((1000 * 60 * 60) / 10);
    let max = -Infinity,
        min = Infinity;
    data.forEach((d) => {
        if (d > max) max = d;
        if (d < min) min = d;
    });
    max = Math.max(max, now);
    canvas.width = (max - min) * zoom + 1;
    canvas.height = 16;
    const ctx = canvas.getContext("2d");
    function l(x: number, color: string) {
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 16);
        ctx.stroke();
    }
    let count = 0;
    const nowx = (now - min) * zoom;
    data.forEach((d) => {
        const x = (d - min) * zoom;
        l(x, "#000");
        if (x < nowx) count++;
    });
    l(nowx, "#f00");
    l((now + 1000 * 60 * 60 - min) * zoom, "#00f");
    l((now + 1000 * 60 * 60 * 24 - min) * zoom, "#00f");
    const f = el("div");
    f.append(text, String(count), canvas);
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
    const div = el("div", { class: "cal_plot" });
    const firstDate = new Date(year, 0, 1);
    const zero2first = (firstDate.getDay() + 1) * 24 * 60 * 60 * 1000;
    let s_date = new Date(firstDate.getTime() - zero2first);
    const f = document.createDocumentFragment();
    for (let x = 1; x <= 53; x++) {
        for (let y = 1; y <= 7; y++) {
            s_date = new Date(s_date.getTime() + 24 * 60 * 60 * 1000);
            const v = (count[s_date.toDateString()] ?? 0) / max;
            const item = el("div");
            item.title = `${s_date.toLocaleDateString()}  ${count[s_date.toDateString()] ?? 0}`;
            if (v) item.style.backgroundColor = `color-mix(in srgb-linear, #9be9a8, #216e39 ${v * 100}%)`;
            if (s_date.toDateString() === new Date().toDateString()) item.style.borderWidth = "2px";
            f.append(item);
        }
    }
    div.append(f);
    return div;
}

//###### setting
const settingEl = document.getElementById("setting");
document.getElementById("settingb").onclick = () => {
    settingEl.showPopover();
};

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

const uploadIpaDicEl = el("input", { type: "file" });
uploadIpaDicEl.onchange = () => {
    const file = uploadIpaDicEl.files[0];
    if (file) {
        const reader = new FileReader();
        reader.readAsText(file);
        reader.onload = () => {
            let dic = JSON.parse(reader.result as string);
            console.log(dic);
            const data = Object.values(dic)[0][0];
            let l = new Map();
            for (let i in data) {
                l.set(i, data[i]);
            }
            const id = Object.keys(dic)[0];
            ipaDics[id] = l;
            ipaDicStore.setItem(id, l);
            setting.setItem("ipa_dics", Object.keys(ipaDics));
        };
    }
};

async function getIPA(word: string) {
    const ipaDicsPath = (await setting.getItem("ipa_dics.default")) as string;
    if (!ipaDicsPath) return "";
    let l: string[] = [];
    if (ipaDicsPath.includes(",")) l = ipaDicsPath.split(",").map((i) => i.trim());
    else l = [ipaDicsPath.trim()];
    for (let p of l) {
        const ipa = ipaDics[p]?.get(word);
        if (ipa) return ipa;
    }
    return "";
}

settingEl.append(uploadIpaDicEl, el("input", { "data-path": "ipa_dics.default" }));

settingEl.append(el("label", ["学习语言", el("input", { "data-path": "lan.learn" })]));

settingEl.append(
    el("div", [
        el("h2", "词书"),
        el("div", [el("label", ["忽略词表", el("input", { "data-path": "wordBook.ignore" })])]),
    ])
);

const testSpeedLanEl = el("input");
const testSpeedContentEl = el("p");
const readSpeedEl = el("input", { type: "number", "data-path": "user.readSpeed" });

settingEl.append(
    el("div", [
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
    ])
);

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
    return JSON.stringify(l);
}

async function setAllData(data: string) {
    let json = JSON.parse(data) as allData;
    for (let key of ["cards", "spell"]) {
        for (let i in json[key]) {
            let r = json[key][i] as fsrsjs.Card;
            r.due = new Date(r.due);
            r.last_review = new Date(r.last_review);
        }
    }
    for (const storeName in allData2Store) {
        await allData2Store[storeName].clear();
        await allData2Store[storeName].setItems(json[storeName]);
    }
    location.reload();
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
    }).then();
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

let asyncEl = el("div", [
    el("h2", "数据"),
    el("div", [
        el("button", "导出数据", {
            onclick: async () => {
                let data = await getAllData();
                let blob = new Blob([data], { type: "text/plain;charset=utf-8" });
                let a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = rmbwJsonName;
                a.click();
            },
        }),
        uploadDataEl,
    ]),
    el("div", [
        el("h3", "webDAV"),
        el("button", "get", {
            onclick: async () => {
                let data = await getDAV();
                let str = await xunzip(data);
                setAllData(JSON.parse(str));
            },
        }),
        el("button", "set", {
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

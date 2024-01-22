/// <reference types="vite/client" />

import { el, text } from "redom";

import localforage from "localforage";

import mammoth from "mammoth";

import lemmatizer from "lemmatizer";

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
import "simple-keyboard/build/css/index.css";

import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts-browserify";

import pen_svg from "../assets/icons/pen.svg";
import ok_svg from "../assets/icons/ok.svg";
import translate_svg from "../assets/icons/translate.svg";
import left_svg from "../assets/icons/left.svg";
import right_svg from "../assets/icons/right.svg";
import sentence_svg from "../assets/icons/sentence.svg";
import clear_svg from "../assets/icons/clear.svg";
import close_svg from "../assets/icons/close.svg";
import more_svg from "../assets/icons/more.svg";
import reload_svg from "../assets/icons/reload.svg";

function icon(src: string) {
    return `<img src="${src}" class="icon">`;
}
function iconEl(src: string) {
    return el("img", { src, class: "icon", alt: "按钮图标" });
}

function uuid() {
    return crypto.randomUUID().slice(0, 8);
}

var setting = localforage.createInstance({
    name: "setting",
    driver: localforage.LOCALSTORAGE,
});

/************************************UI */

function showMenu(x: number, y: number) {
    menuEl.style.left = x + "px";
    menuEl.style.top = y + "px";
    menuEl.showPopover();
}

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

/************************************main */
const MARKWORD = "mark_word";
const TRANSLATE = "translate";
const HIDEMEANS = "hide_means";
const DISABLECHANGE = "disable_change";
const TODOMARK = "to_visit";

const booksEl = document.getElementById("books");
const bookEl = document.getElementById("book");
const bookSectionsEl = document.getElementById("sections");
const addOnlineBookEl = document.getElementById("add_online_book");
const onlineBooksEl = document.getElementById("online_books");
const onlineBooksListEl = document.getElementById("online_books_list");
const addBookEl = document.getElementById("add_book");
const addSectionEL = document.getElementById("add_section");
const bookNavEl = document.getElementById("book_nav");
const bookContentEl = document.getElementById("book_content");
const changeEditEl = document.getElementById("change_edit");
const dicEl = document.getElementById("dic");
const bookdicEl = document.getElementById("book_dic");
const lastMarkEl = el("button", iconEl(left_svg));
const nextMarkEl = el("button", iconEl(right_svg));
const toSentenceEl = el("button", iconEl(sentence_svg));
const rmCardEl = el("button", iconEl(clear_svg));
const hideDicEl = el("button", iconEl(close_svg));
const dicWordEl = el("input", { alt: "单词" });
const moreWordsEl = el("div", { class: "more_words" });
const ttsWordEl = el("button", "play w");
const ttsContextEl = el("button", "play c");
const dicTransB = el("button", iconEl(translate_svg));
const dicTransContent = el("input", {
    alt: "语境翻译",
    class: TRANSLATE,
    style: { border: "none", width: "100%", fontSize: "1rem" },
});
const dicMinEl = el("button", { style: { minHeight: "24px" } }, iconEl(more_svg));
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
    el("div", { style: { display: "flex" } }, [
        lastMarkEl,
        nextMarkEl,
        toSentenceEl,
        rmCardEl,
        ttsContextEl,
        hideDicEl,
    ]),
    el("div", { style: { display: "flex" } }, [dicWordEl, ttsWordEl, moreWordsEl]),
    el("div", { style: { display: "flex" } }, [dicTransB, dicTransContent]),
    dicMinEl,
    dicDetailsEl
);

const toastEl = document.getElementById("toast");
const menuEl = document.getElementById("menu");

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

addOnlineBookEl.onclick = () => {
    getOnlineBooks();
    onlineBooksEl.showPopover();
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
    }[]
) {
    onlineBooksListEl.innerHTML = "";
    for (let book of books) {
        let div = document.createElement("div");
        let title = document.createElement("span");
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
        onlineBooksListEl.append(div);
        console.log(onlineBooksListEl);
    }
}

addBookEl.onclick = async () => {
    let b = await newBook();
    nowBook = b;
    setBookS();
    changeEdit(true);
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
let bookLan = "";

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
            let titleEl = document.createElement("input");
            titleEl.value = section.title;
            bookNameEl.innerHTML = "";
            bookNameEl.append(titleEl);
            titleEl.focus();
            titleEl.onchange = async () => {
                let sectionId = (await getBooksById(nowBook.book)).sections[nowBook.sections];
                let section = await getSection(sectionId);
                section.title = titleEl.value;
                sectionsStore.setItem(sectionId, section);
                setBookS();
            };
        };
    }
}

async function showBooks() {
    booksEl.innerHTML = "";
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
        booksEl.append(bookIEl);
        bookIEl.onclick = () => {
            showBook(book);
            book.visitTime = new Date().getTime();
            bookshelfStore.setItem(book.id, book);
            if (book.canEdit) {
                changeEditEl.classList.remove(DISABLECHANGE);
            } else {
                changeEditEl.classList.add(DISABLECHANGE);
            }
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
                }
            };
            menuEl.append(renameEl);
            setTimeout(() => {
                showMenu(e.clientX, e.clientY);
            }, 100);
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
    bookSectionsEl.innerHTML = "";
    for (let i in sections) {
        let sEl = document.createElement("div"); // TODO 虚拟列表
        let s = await getSection(sections[i]);
        sEl.innerText = s.title || `章节${Number(i) + 1}`;
        bookSectionsEl.append(sEl);
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
    }
}

let wordList: { text: string; c: record }[] = [];

let contentP: string[] = [];

async function showBookContent(id: string) {
    let s = (await sectionsStore.getItem(id)) as section;
    bookContentEl.innerHTML = "";

    bookContentEl.append(
        el("div", "play", {
            onclick: () => {
                autoPlay = true;
                pTTS(0);
            },
        })
    );

    contentP = [];

    wordList = [];
    if (isWordBook) {
        let l = s.text.trim().split("\n");
        let keys = await wordsStore.keys();
        let matchWords = 0;
        let means = 0;
        let means1 = 0;
        const maxMeans = 3;
        for (let i of l) {
            let t = i;
            let c: record;
            if (keys.includes(i)) {
                c = (await wordsStore.getItem(i)) as record;
                t = `${t} *`;
                matchWords++;
                means += Math.min(c.means.length / maxMeans, 1);
                let r = 0;
                for (let j of c.means) {
                    let x = (await cardsStore.getItem(j.card_id)) as fsrsjs.Card;
                    let retrievability = Math.pow(1 + x.elapsed_days / (9 * x.stability), -1) || 0;
                    r += retrievability;
                }
                means1 += r / c.means.length;
            }
            wordList.push({ text: t, c: c });
        }
        let sum = document.createElement("table");
        function p(name: string, number: number) {
            let t = document.createElement("tr");
            let nEl = document.createElement("td");
            let numEl = document.createElement("td");
            let pEl = document.createElement("td");
            nEl.innerText = name;
            numEl.innerText = number.toFixed(1);
            pEl.innerText = ((number / l.length) * 100).toFixed(2) + "%";
            t.append(nEl, numEl, pEl);
            return t;
        }
        let t = document.createElement("tr");
        let nEl = document.createElement("th");
        let numEl = document.createElement("th");
        let pEl = document.createElement("th");
        nEl.innerText = "词";
        numEl.innerText = String(l.length);
        pEl.innerText = "100%";
        t.append(nEl, numEl, pEl);

        sum.append(t);
        sum.append(p("了解", matchWords));
        sum.append(p("有效", means));
        sum.append(p("记忆", means1));

        sum.classList.add("words_sum");

        bookContentEl.append(sum);

        reflashContentScroll();

        let h = document.createElement("div");
        h.style.height = 120 + wordList.length * (24 + 8) + 8 + "px";
        h.style.width = "1px";
        h.style.position = "absolute";
        h.style.top = "0px";
        bookContentEl.append(h);

        return;
    }

    editText = s.text;
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
            let playEl = el("div", "play", { "data-play": String(contentP.length) });
            pel.append(playEl);
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
                    span.classList.add(MARKWORD); // TODO CSS.highlights
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
            const span = ev.target as HTMLSpanElement;
            if (span.tagName != "SPAN") return;
            const i = span.getAttribute("data-i");
            let s = paragraph[0].start,
                e = paragraph.at(-1).end;
            let j = Number(i) - 1;
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

    contentScrollPosi = s.lastPosi;
    setScrollPosi(bookContentEl, contentScrollPosi);

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

function reflashContentScroll() {
    for (let i = 0; i < wordList.length; i++) {
        const h = 24;
        const gap = 8;
        const buffer = 64;
        let t = 120 + i * (h + gap);
        let b = 120 + (i + 1) * (gap + h);
        if (
            b >= bookContentEl.scrollTop - buffer &&
            t <= bookContentEl.scrollTop + bookContentEl.offsetHeight + buffer
        ) {
            if (bookContentEl.querySelector(`p[data-i='${i}']`)) continue;
            let p = document.createElement("p");
            p.setAttribute("data-i", String(i));
            p.innerText = wordList[i].text;
            p.style.top = t + "px";
            p.style.position = "absolute";
            bookContentEl.append(p);
        } else {
            bookContentEl.querySelector(`p[data-i='${i}']`)?.remove();
        }
    }
}

let isEdit = false;
let editText = "";

async function changeEdit(b: boolean) {
    if (changeEditEl.classList.contains(DISABLECHANGE)) return;
    isEdit = b;
    if (isEdit) {
        changeEditEl.innerHTML = icon(ok_svg);
        return setEdit();
    } else {
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

function changePosi(section: section, text: string) {
    let diff = dmp.diff_main(section.text, text);
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
    source.push(section.text.length);
    map.push(text.length);
    console.log(source, map);
    for (let w in section.words) {
        let start = section.words[w].index[0];
        let end = section.words[w].index[1];
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
        section.words[w].index = [Start, End];
    }
    return section;
}

import diff_match_patch from "diff-match-patch";
var dmp = new diff_match_patch();

changeEdit(false);

async function setEdit() {
    let book = await getBooksById(nowBook.book);
    let sectionId = book.sections[nowBook.sections];
    let section = await getSection(sectionId);
    bookContentEl.innerHTML = "";
    let text = document.createElement("textarea");
    text.value = section.text;
    setScrollPosi(text, contentScrollPosi);
    text.onchange = () => {
        editText = text.value;
    };
    text.onkeyup = async (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            let l = text.value.split("\n");
            let index = 0;
            let aiRange: { s: number; e: number }[] = [];
            const startMark = "=ai=";
            const endMark = "====";
            const ignoreMark = "//";
            const userMark = ">";
            const aiMark = "ai:";
            let hasAi = false;
            let aiM: aim = [];
            let sourceText = "";
            for (let i of l) {
                if (i === startMark) {
                    hasAi = true;
                    aiRange.push({ s: index + startMark.length, e: index + startMark.length });
                    index += i.length + 1;
                    continue;
                }
                if (hasAi) {
                    if (i.startsWith(aiMark)) {
                        aiM.push({ role: "assistant", content: i.replace(aiMark, "").trim() });
                    } else if (i.startsWith(userMark)) {
                        aiM.push({ role: "user", content: i.replace(userMark, "").trim() });
                    } else if (i === endMark) {
                        hasAi = false;
                        aiRange.at(-1).e = index;
                    } else if (i.startsWith(ignoreMark)) {
                        index += i.length + 1;
                        continue;
                    } else {
                        if (aiM.length) aiM.at(-1).content += "\n" + i;
                    }
                } else {
                    sourceText += i + "\n";
                }
                index += i.length + 1;
            }
            if (aiM.length === 0) return;
            if (aiM.at(-1).role !== "user") return;
            for (let r of aiRange) {
                if (!(r.s <= text.selectionStart && text.selectionEnd <= r.e)) return;
            }
            aiM.unshift({ role: "system", content: `This is a passage: ${sourceText}` });
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
    bookContentEl.append(text);
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
    bookContentEl.append(upel);

    text.onscroll = () => {
        contentScrollPosi = getScrollPosi(text);
    };

    return text;
}

bookContentEl.onscroll = async () => {
    let n = getScrollPosi(bookContentEl);
    contentScrollPosi = n;
    let book = await getBooksById(nowBook.book);
    let sectionId = book.sections[nowBook.sections];
    let section = await getSection(sectionId);
    section.lastPosi = n;
    sectionsStore.setItem(sectionId, section);

    if (wordList.length) reflashContentScroll();
};

const SHOWMARKLIST = "show_mark_word_list";
bookdicEl.onclick = async () => {
    markListEl.classList.toggle(SHOWMARKLIST);
    if (markListEl.classList.contains(SHOWMARKLIST)) {
        showMarkList();
    }
};

let dics: { [key: string]: Map<string, dic[0]> } = {};
var dicStore = localforage.createInstance({ name: "dic" });
setting.getItem("dics").then(async (l: string[]) => {
    for (let i of l || []) {
        dics[i] = (await dicStore.getItem(i)) as Map<string, dic[0]>;
    }
    console.log(dics);
});

type dic = {
    [word: string]: {
        meta: string;
        means: { dis: { text: string; tran: string }; sen: { text: string; tran: string }[]; pos: string }[];
    };
};

type record = {
    word: string;
    means: {
        dic: string;
        index: number;
        contexts: {
            text: string;
            index: [number, number]; // 语境定位
            source: { book: string; sections: number; id: string }; // 原句通过对比计算
        }[];
        card_id: string;
    }[];
};
type record2 = {
    text: string;
    trans: string;
    source: { book: string; sections: number; id: string }; // 原句通过对比计算
    card_id: string;
};

const markListEl = document.getElementById("mark_word_list");

async function showMarkList() {
    // todo vlist
    markListEl.innerHTML = "";
    let list = await getAllMarks();
    list = list.filter((i) => i.s.type === "word");
    for (let i of list) {
        let item = el("div", i.s.id, { class: i.s.visit ? "" : TODOMARK });
        item.onclick = () => {
            showDic(i.id);
            jumpToMark(i.s.index[0]);
        };
        markListEl.append(item);
    }
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
    showDic(id);
    jumpToMark(list[index].s.index[0]);
};
nextMarkEl.onclick = async () => {
    if (!nowDicId) return;
    let list = await getAllMarks();
    let index = list.findIndex((i) => i.id === nowDicId);
    index++;
    index = index >= list.length ? list.length - 1 : index;
    let id = list[index].id;
    showDic(id);
    jumpToMark(list[index].s.index[0]);
};
function jumpToMark(start: number) {
    let span = bookContentEl.querySelector(`span[data-s="${start}"]`);
    span.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    span.classList.add("flash_word");
    setTimeout(() => {
        span.classList.remove("flash_word");
    }, 1200);
}

dicMinEl.onclick = () => {
    dicDetailsEl.classList.toggle(HIDEMEANS);
};

function setDicPosi(el: HTMLElement) {
    dicEl.style.top = `${el.getBoundingClientRect().top}px`;
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

    let Word = {
        word: wordx.id,
        record: null as record,
        dic: "",
        mean: NaN,
        contextx: null as record["means"][0]["contexts"][0],
    };

    let Share = {
        context: "",
        sourceIndex: [0, 0],
    };
    let isSentence = wordx.type === "sentence";
    let sourceWord = "";
    if (!isSentence) {
        Word.record = (await wordsStore.getItem(wordx.id)) as record;
        if (!Word.record) {
            delete section.words[id];
            sectionsStore.setItem(sectionId, section);
            nextMarkEl.click();
        }
        for (let i of Word.record.means) {
            Word.dic = i.dic;
            Word.mean = i.index;
            for (let j of i.contexts) {
                if (j.source.id === id) {
                    Share.context = j.text;
                    Share.sourceIndex = j.index;
                    sourceWord = j.text.slice(...j.index);
                    Word.contextx = j;
                }
            }
        }
    } else {
        Share.context = ((await card2sentence.getItem(id)) as record2).text;
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

    rmCardEl.onclick = () => {
        if (isSentence) {
            card2sentence.removeItem(id);
        } else {
            rm(Word.word, Word.dic, Word.mean);
            rmStyle();
        }
        delete section.words[id];
        sectionsStore.setItem(sectionId, section);
        nextMarkEl.click();
    };

    function rmStyle() {
        bookContentEl.querySelector(`span[data-s="${wordx.index[0]}"]`)?.classList?.remove(MARKWORD);
    }

    async function rm(word: string, dic: string, i: number) {
        for (let m of Word.record.means) {
            if (m.dic === dic && m.index === i) {
                m.contexts = m.contexts.filter((c) => c.source.id != Word.contextx.source.id);
                if (m.contexts.length === 0) {
                    await card2word.removeItem(m.card_id);
                    await cardsStore.removeItem(m.card_id);
                    Word.record.means = Word.record.means.filter((i) => i.index != m.index);
                    await wordsStore.setItem(word, Word.record);
                }
                if (Word.record.means.length === 0) {
                    await wordsStore.removeItem(word);
                    await spellStore.removeItem(word);
                } else {
                    await wordsStore.setItem(word, Word.record);
                }
                break;
            }
        }
    }

    async function changeDicMean(word: string, dic: string, i: number) {
        if (word != Word.word || dic != Word.dic || i != Word.mean) {
            await rm(Word.word, Word.dic, Word.mean);

            await addReviewCard(word, { dic, index: i }, Word.contextx);

            Word.word = word;
            Word.dic = dic;
            Word.mean = i;
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
            let r = (await card2sentence.getItem(id)) as record2;
            r.trans = text;
            await card2sentence.setItem(id, r);
        }

        transCache.setItem(Share.context, text);
    };

    toSentenceEl.onclick = async () => {
        if (isSentence) return;
        isSentence = true;
        let contextStart = wordx.index[0] - Share.sourceIndex[0];
        let contextEnd = wordx.index[1] + (Share.context.length - Share.sourceIndex[1]);
        wordx.index[0] = contextStart;
        wordx.index[1] = contextEnd;
        wordx.type = "sentence";
        wordx.id = id;
        section.words[id] = wordx;
        sectionsStore.setItem(sectionId, section);

        let r: record2 = {
            text: Share.context,
            card_id: uuid(), // 句子卡片id用uuid而不是单词
            source: null,
            trans: dicTransContent.value,
        };

        for (let i of Word.record.means) {
            for (let j of i.contexts) {
                if (j.source.id === id) {
                    r.source = j.source;
                    sentenceStore.setItem(r.card_id, await cardsStore.getItem(i.card_id));
                    await cardsStore.removeItem(i.card_id);
                    break;
                }
            }
        }
        card2sentence.setItem(id, r);

        rm(Word.word, Word.dic, Word.mean);

        showSentence();

        rmStyle();
    };

    ttsWordEl.onclick = () => {
        play(Word.word);
    };
    ttsContextEl.onclick = () => {
        runTTS(Share.context);
    };

    function showWord() {
        dicTransContent.value = "";

        search(Word.word);
        dicWordEl.value = Word.word;
        dicWordEl.onchange = async () => {
            let newWord = dicWordEl.value.trim();
            await visit(false);
            await changeDicMean(newWord, Word.dic, -1);
            search(newWord);
        };

        let lword = lemmatizer(sourceWord);
        moreWordsEl.innerHTML = "";
        for (let w of Array.from(new Set([sourceWord, lword]))) {
            let div = document.createElement("span");
            div.innerText = w;
            div.onclick = async () => {
                dicWordEl.value = w;
                await visit(false);
                await changeDicMean(w, Word.dic, -1);
                search(w);
            };
            moreWordsEl.append(div);
        }

        async function visit(t: boolean) {
            wordx.visit = t;
            section.words[id] = wordx;
            await sectionsStore.setItem(sectionId, section);
        }

        async function search(word: string) {
            let x = dics[Word.dic].get(word) as dic[0];
            if (!x) {
                dicDetailsEl.innerText = "none";
                return;
            }
            dicDetailsEl.innerHTML = "";
            for (let i in x.means) {
                const m = x.means[i];
                let div = document.createElement("div");
                let radio = document.createElement("input");
                radio.type = "radio";
                radio.name = "dic_means";
                radio.onclick = () => {
                    if (radio.checked) {
                        dicMeansAi?.abort();
                        changeDicMean(word, Word.dic, Number(i));

                        visit(true);
                    }
                };
                div.onclick = () => radio.click();
                div.append(radio, disCard(m));
                dicDetailsEl.append(div);
            }
            function set() {
                let means = "";
                for (let i in x.means) {
                    means += `${i}.${x.means[i].dis.text};\n`;
                }
                let c = `${Share.context.slice(0, Share.sourceIndex[0])}**${sourceWord}**${Share.context.slice(
                    Share.sourceIndex[1]
                )}`;
                console.log(c);

                let AI = ai(
                    [
                        {
                            role: "user",
                            content: `I have a bolded word '${sourceWord}' wrapped in double asterisks in the sentence:'${c}'.This is a dictionary's explanation of several interpretations:${means}.Please think carefully and select the most appropriate label for explanation, without providing any explanation.`,
                        },
                    ],
                    "选择义项"
                );
                dicMeansAi = AI.stop;
                AI.text.then((a) => {
                    console.log(a);
                    let n = Number(a.match(/[0-9]+/)[0]);
                    if (isNaN(n)) return;
                    setcheck(n);
                    changeDicMean(word, Word.dic, n);

                    visit(true);
                });
            }
            function setcheck(i: number) {
                let el = dicDetailsEl.querySelectorAll("input[name=dic_means]")[i] as HTMLInputElement;
                el.checked = true;
                dicDetailsEl.classList.add(HIDEMEANS);
            }
            if (Word.mean === -1) {
                if (x.means.length > 1) {
                    set();
                    dicDetailsEl.classList.remove(HIDEMEANS);
                } else {
                    setcheck(0);
                    visit(true);
                    changeDicMean(word, Word.dic, 0);
                }
            } else {
                setcheck(Word.mean);
            }
        }
    }
    async function showSentence() {
        dicWordEl.value = "";
        moreWordsEl.innerHTML = "";
        dicTransContent.value = ((await card2sentence.getItem(id)) as record2).trans;
        dicDetailsEl.innerHTML = "";

        if (!dicTransContent.value) {
            dicTransB.click();
        }

        dicTransContent.onchange = async () => {
            let r = (await card2sentence.getItem(id)) as record2;
            r.trans = dicTransContent.value;
            await card2sentence.setItem(id, r);
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
                return { left: r.left - r0.left, top: r.top - r0.top };
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
            down.start = false;
            down.end = false;
            console.log(editText.slice(index.start, index.end));
            saveChange();
        };
        async function saveChange() {
            let text = editText.slice(index.start, index.end);
            Share.context = text;
            if (isSentence) {
                section.words[id].index = [index.start, index.end];
                sectionsStore.setItem(sectionId, section);
                let r = (await card2sentence.getItem(id)) as record2;
                r.text = text;
                card2sentence.setItem(id, r);
            } else {
                for (let i of Word.record.means) {
                    for (let j of i.contexts) {
                        if (j.source.id === id) {
                            j.index = [wordx.index[0] - index.start, wordx.index[1] - index.start];
                            j.text = text;
                            Word.contextx = j;
                            Share.sourceIndex = j.index;
                            await wordsStore.setItem(Word.word, Word.record);
                            break;
                        }
                    }
                }
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

function disCard(m: dic[0]["means"][0]) {
    let div = document.createDocumentFragment();
    let disEl = document.createElement("div");
    let p = document.createElement("p");
    p.innerText = m.dis.text;
    let span = document.createElement("p");
    span.innerText = m.dis.tran;
    span.classList.add(TRANSLATE);
    disEl.append(p, span);
    let sen = document.createElement("div");
    sen.classList.add("dic_sen");
    for (let s of m.sen) {
        let div = document.createElement("div");
        let p = document.createElement("p");
        p.innerText = s.text;
        let span = document.createElement("p");
        span.innerText = s.tran;
        span.classList.add(TRANSLATE);
        div.append(p, span);
        sen.append(div);
    }
    div.append(disEl, sen);
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
    section.words[id] = { id: v.key, index: [v.index.start, v.index.end], visit: false, type: "word" };

    sectionsStore.setItem(sectionId, section);
    addReviewCard(
        v.key,
        { dic: "lw", index: v.dindex },
        {
            text: editText.slice(v.cindex.start, v.cindex.end),
            index: [v.index.start - v.cindex.start, v.index.end - v.cindex.start],
            source: { ...nowBook, id: id },
        }
    );
    return id;
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

var cardsStore = localforage.createInstance({ name: "word", storeName: "cards" });
var wordsStore = localforage.createInstance({ name: "word", storeName: "words" });
var card2word = localforage.createInstance({ name: "word", storeName: "card2word" });
var spellStore = localforage.createInstance({ name: "word", storeName: "spell" });
var sentenceStore = localforage.createInstance({ name: "word", storeName: "sentence" });
var card2sentence = localforage.createInstance({ name: "word", storeName: "card2sentence" });

var transCache = localforage.createInstance({ name: "aiCache", storeName: "trans" });
var ttsCache = localforage.createInstance({ name: "aiCache", storeName: "tts" });

async function addReviewCard(
    word: string,
    means: {
        dic: string;
        index: number;
    },
    context: {
        text: string;
        index: [number, number];
        source: { book: string; sections: number; id: string }; // 原句通过对比计算
    }
) {
    let w = (await wordsStore.getItem(word)) as record;
    if (w) {
        for (let i of w.means) {
            if (i.dic === means.dic && i.index === means.index) {
                if (!i.contexts.includes(context)) i.contexts.push(context);
                let card = (await cardsStore.getItem(i.card_id)) as fsrsjs.Card;
                let now = new Date();
                let sCards = fsrs.repeat(card, now);
                // 记过还查，那是忘了
                await cardsStore.setItem(i.card_id, sCards[fsrsjs.Rating.Hard].card);
                await wordsStore.setItem(word, w);
                return;
            }
        }
        let cardId = uuid();
        let m = { ...means, contexts: [context], card_id: cardId };
        w.means.push(m);
        let card = new fsrsjs.Card();
        await cardsStore.setItem(cardId, card);
        await card2word.setItem(cardId, word);
        await wordsStore.setItem(word, w);
    } else {
        let cardId = uuid();
        let r: record = {
            word: word,
            means: [
                {
                    dic: means.dic,
                    index: means.index,
                    contexts: [context],
                    card_id: cardId,
                },
            ],
        };
        let card = new fsrsjs.Card();
        await wordsStore.setItem(word, r);
        await cardsStore.setItem(cardId, card);
        await card2word.setItem(cardId, word);
        let card2 = new fsrsjs.Card();
        await spellStore.setItem(word, card2);
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
const reviewViewEl = document.getElementById("review_view");

const keyboardEl = el("div", { class: "simple-keyboard" });
const handwriterEl = el("div");
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
        default: ["q w e r t y u i o p", "a s d f g h j k l", "{shift} z x c v b n m {bksp}", "tip {space} audio"],
        shift: ["Q W E R T Y U I O P", "A S D F G H J K L", "{shift} Z X C V B N M {bksp}", "tip {space} audio"],
        handwrite: ["tip {space} audio"],
    },
    display: { "{space}": "__", "{shift}": "Shift", "{bksp}": "<-", tip: "🫣", audio: "📣" },
});

async function getFutureReviewDue(days: number) {
    let now = new Date().getTime();
    now += days * 24 * 60 * 60 * 1000;
    now = Math.round(now);
    let wordList: { id: string; card: fsrsjs.Card }[] = [];
    let spellList: { id: string; card: fsrsjs.Card }[] = [];
    // todo sentence
    await cardsStore.iterate((value: fsrsjs.Card, key) => {
        if (value.due.getTime() < now) {
            wordList.push({ id: key, card: value });
        }
    });
    let l: typeof wordList = [];
    for (let x of wordList) {
        let wordid = (await card2word.getItem(x.id)) as string;
        let wordRecord = (await wordsStore.getItem(wordid)) as record;
        for (let i of wordRecord.means) {
            if (i.card_id === x.id && i.index != -1) {
                l.push(x);
            }
        }
    }
    wordList = l;
    await spellStore.iterate((value: fsrsjs.Card, key) => {
        if (value.due.getTime() < now) {
            spellList.push({ id: key, card: value });
        }
    });
    return { word: wordList, spell: spellList };
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
    let now = new Date().getTime();
    let wordList: { id: string; card: fsrsjs.Card }[] = [];
    let spellList: { id: string; card: fsrsjs.Card }[] = [];
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
    wordList.sort((a, b) => a.card.due.getTime() - b.card.due.getTime());
    spellList.sort((a, b) => a.card.due.getTime() - b.card.due.getTime());
    if (type === "word") {
        return wordList[0];
    } else {
        return spellList[0];
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
} = {
    word: [],
    spell: [],
};

type review = "word" | "spell";
var reviewType: review = "word";
const reviewModeEl = document.getElementById("review_mode");
const reviewWordEl = document.getElementById("review_word") as HTMLInputElement;
const reviewSpellEl = document.getElementById("review_spell") as HTMLInputElement;
reviewWordEl.checked = true;
reviewModeEl.onclick = () => {
    if (reviewWordEl.checked) {
        reviewType = "word";

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
    showReview(l, reviewType);
};

var spellCheckF: (text: string) => void = (text) => console.log(text);
var spellF: (text: string) => void = (text) => console.log(text);
function clearKeyboard() {
    keyboard.clearInput();
}

async function showReview(x: { id: string; card: fsrsjs.Card }, type: review) {
    function crContext(word: record) {
        let context = document.createElement("div");
        if (!word) return context;
        for (let i of word.means) {
            if (i.card_id === x.id) {
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
    if (!x) {
        reviewViewEl.innerText = "暂无复习🎉";
        return;
    }
    if (type === "word") {
        let wordid = (await card2word.getItem(x.id)) as string;
        let wordRecord = (await wordsStore.getItem(wordid)) as record;
        let div = document.createElement("div");
        let context = crContext(wordRecord);
        context.onclick = async () => {
            let word = (await card2word.getItem(x.id)) as string;
            let d = (await wordsStore.getItem(word)) as record;
            for (let i of d.means) {
                if (i.card_id === x.id) {
                    let x = dics[i.dic].get(word) as dic[0];
                    let m = x.means[i.index];

                    let div = document.createElement("div");
                    div.append(disCard(m));
                    dic.innerHTML = "";
                    dic.append(div);
                }
            }
        };
        let dic = document.createElement("div");
        let b = (rating: fsrsjs.Rating, text: string) => {
            let button = document.createElement("button");
            button.innerText = text;
            button.onclick = async () => {
                setReviewCard(x.id, x.card, rating);
                let next = await nextDue(reviewType);
                showReview(next, reviewType);
            };
            return button;
        };
        let againB = b(1, "x");
        let hardB = b(2, "o");
        let goodB = b(3, "v");
        let esayB = b(4, "vv");
        let buttons = document.createElement("div");
        buttons.append(againB, hardB, goodB, esayB);

        div.append(context, dic, buttons);
        div.classList.add("review_word");
        reviewViewEl.innerHTML = "";
        reviewViewEl.append(div);
    }
    if (type === "spell") {
        let input = el("div", { class: "spell_input" }, "|");
        clearKeyboard();
        let wordEl = document.createElement("div");
        let spellNum = 3;
        const word = x.id;
        spellCheckF = async (inputValue: string) => {
            input.innerText = inputValue;
            let inputWord = inputValue;
            wordEl.innerHTML = "";
            if (inputWord === word) {
                // 正确
                if (spellNum === 1) {
                    setSpellCard(x.id, x.card, 4);
                    let next = await nextDue(reviewType);
                    showReview(next, reviewType);
                } else {
                    spellNum--;
                    inputValue = "";
                    input.innerText = `Good! ${spellNum} time(s) left`;
                }
                clearKeyboard();
            }
            //错误归位
            if (inputWord.length === word.length && inputWord != word) {
                inputValue = "";
                input.innerText = `"${inputWord}" is wrong! ${spellNum} time(s) left`;
                play(word);
                setSpellCard(x.id, x.card, 1);
                clearKeyboard();
            }
        };
        spellF = (button) => {
            console.log(button);
            if (button === "tip") {
                // 暂时展示
                input.innerText = "";
                clearKeyboard();
                play(word);
                wordEl.innerText = word;
                setSpellCard(x.id, x.card, 2);
            }
            if (button === "audio") {
                // 发音
                play(word);
                input.innerText = "";
                clearKeyboard();
            }
        };
        let context = el("div");
        let r = (await wordsStore.getItem(word)) as record;
        for (let i of r.means) {
            if (i.index === -1) continue;
            let x = dics[i.dic].get(word) as dic[0];
            let m = x.means[i.index];

            context.append(el("div", [el("p", m.dis.text), el("p", { class: TRANSLATE }, m.dis.tran)]));
        }
        const div = document.createElement("div");
        div.append(input, context, wordEl);
        div.classList.add("review_spell");
        reviewViewEl.innerHTML = "";
        reviewViewEl.append(div);
    }
}

let audioEl = <HTMLAudioElement>document.getElementById("audio");
let pTTSEl = <HTMLAudioElement>document.getElementById("pTTS");

function play(word: string) {
    audioEl.src = "https://dict.youdao.com/dictvoice?le=eng&type=1&audio=" + word;
    audioEl.play();
}

const tts = new MsEdgeTTS();
const ttsVoiceConfig = "tts.voice";
tts.setMetadata(
    (await setting.getItem(ttsVoiceConfig)) || "en-GB-LibbyNeural",
    OUTPUT_FORMAT.WEBM_24KHZ_16BIT_MONO_OPUS
);

async function getTTS(text: string) {
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
        readable.on("end", () => {
            console.log("STREAM end");
            let blob = new Blob([base], { type: "audio/webm" });
            ttsCache.setItem(text, blob);
            re(URL.createObjectURL(blob));
        });
    });
}

async function runTTS(text: string) {
    audioEl.src = await getTTS(text);
    audioEl.play();
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

    let url = await getTTS(text);
    pTTSEl.src = url;
    pTTSEl.play();
    pTTSEl.onended = nextplay;
}

function setReviewCard(id: string, card: fsrsjs.Card, rating: fsrsjs.Rating) {
    let now = new Date();
    let sCards = fsrs.repeat(card, now);
    cardsStore.setItem(id, sCards[rating].card);
}
function setSpellCard(id: string, card: fsrsjs.Card, rating: fsrsjs.Rating) {
    let now = new Date();
    let sCards = fsrs.repeat(card, now);
    spellStore.setItem(id, sCards[rating].card);
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
            for (let i in dic.dics) {
                l.set(i, dic.dics[i]);
            }
            dicStore.setItem(id, l);
            setting.setItem("dics", Object.keys(dics));
        };
    }
};

settingEl.querySelectorAll("[data-path]").forEach(async (el: HTMLElement) => {
    const path = el.getAttribute("data-path");
    let value = await setting.getItem(path);
    if (el.tagName === "INPUT") {
        let iel = el as HTMLInputElement;
        if (iel.type === "checkbox") {
            iel.checked = value as boolean;
            iel.addEventListener("input", () => {
                setting.setItem(path, iel.checked);
                setUi();
            });
        } else if (iel.type === "range") {
            iel.value = value as string;
            iel.addEventListener("input", () => {
                setting.setItem(path, Number(iel.value));
                setUi();
            });
        } else {
            iel.value = value as string;
            iel.addEventListener("input", () => {
                setting.setItem(path, iel.value);
                setUi();
            });
        }
    } else if (el.tagName === "SELECT") {
        (el as HTMLSelectElement).value = value as string;
        el.onchange = () => {
            setting.setItem(path, (el as HTMLSelectElement).value);
            setUi();
        };
    }
});
function setUi() {}

const rmbwJsonName = "rmbw.json";
const rmbwZipName = "rmbw.zip";

type allData = {
    bookshelf: { [key: string]: any };
    sections: { [key: string]: any };
    cards: Object;
    words: Object;
    spell: Object;
    card2word: Object;
    card2sentence: Object;
    sentence: Object;
};
async function getAllData() {
    let l: allData = {
        bookshelf: {},
        sections: {},
        cards: {},
        words: {},
        spell: {},
        card2word: {},
        card2sentence: {},
        sentence: {},
    };
    await bookshelfStore.iterate((v, k) => {
        l.bookshelf[k] = v;
    });
    await sectionsStore.iterate((v, k) => {
        l.sections[k] = v;
    });
    await cardsStore.iterate((v, k) => {
        l.cards[k] = v;
    });
    await wordsStore.iterate((v, k) => {
        l.words[k] = v;
    });
    await spellStore.iterate((v, k) => {
        l.spell[k] = v;
    });
    await card2word.iterate((v, k) => {
        l.card2word[k] = v;
    });
    await card2sentence.iterate((v, k) => {
        l.card2sentence[k] = v;
    });
    await sectionsStore.iterate((v, k) => {
        l.sentence[k] = v;
    });
    let blob = new Blob([JSON.stringify(l)], { type: "text/plain;charset=utf-8" });
    return blob;
}

function setAllData(data: string) {
    let json = JSON.parse(data) as allData;
}

async function getDAV(name: string) {
    const baseurl = (await setting.getItem("webStore.dav.url")) as string;
    const username = (await setting.getItem("webStore.dav.user")) as string;
    const passwd = (await setting.getItem("webStore.dav.passwd")) as string;
    let url = new URL(baseurl);
    url.username = username;
    url.password = passwd;
    let data = (
        await fetch(url, {
            method: "get",
        })
    ).arrayBuffer();
    return data;
}

async function setDAV(data: Blob, name: string) {
    const baseurl = (await setting.getItem("webStore.dav.url")) as string;
    const username = (await setting.getItem("webStore.dav.user")) as string;
    const passwd = (await setting.getItem("webStore.dav.passwd")) as string;
    let url = new URL(baseurl);
    url.username = username;
    url.password = passwd;
    fetch(url, {
        method: "post",
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

let asyncEl = el("h2", "数据", [
    el("div", [
        el("button", "导出数据", {
            onclick: async () => {
                let blob = await getAllData();
                let a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = rmbwJsonName;
                a.click();
            },
        }),
        uploadDataEl,
    ]),
    el("div", [
        el("button", "get", {
            onclick: async () => {
                let data = await getDAV(rmbwZipName);
            },
        }),
        el("button", "set", {
            onclick: async () => {
                let data = await getAllData();
            },
        }),
    ]),
]);

settingEl.append(asyncEl);

let loadTTSVoicesEl = el("button", "load");
let voicesListEl = el("select");
loadTTSVoicesEl.onclick = async () => {
    voicesListEl.innerHTML = "";
    let list = await tts.getVoices();
    for (let v of list) {
        let text = `${v.Gender === "Male" ? "♂️" : "♀️"} ${v.FriendlyName.replace(
            /Microsoft (\w+) Online \(Natural\)/,
            "$1"
        )}`;
        let op = el("option", text, { value: v.ShortName });
        voicesListEl.append(op);
    }
    voicesListEl.value = await setting.getItem(ttsVoiceConfig);
    voicesListEl.onchange = () => {
        let name = voicesListEl.value;
        tts.setMetadata(name, OUTPUT_FORMAT.WEBM_24KHZ_16BIT_MONO_OPUS);
        setting.setItem(ttsVoiceConfig, name);
        ttsCache.clear();
    };
};

settingEl.append(el("div", [el("h2", "tts"), loadTTSVoicesEl, voicesListEl]));

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

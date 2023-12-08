/// <reference types="vite/client" />

import localforage from "localforage";
import { pipeline, env } from "@xenova/transformers";

env.allowLocalModels = true;
env.allowRemoteModels = false;

import lemmatizer from "lemmatizer";
console.log(lemmatizer("recruited"));

var Segmenter = Intl.Segmenter;
if (!Segmenter) {
    console.warn("no support Intl.Segmenter");
    import("intl-segmenter-polyfill/dist/bundled").then(async (v) => {
        // @ts-ignore
        Segmenter = await v.createIntlSegmenterPolyfill();
    });
}

import "@oddbird/popover-polyfill";

import pen_svg from "../assets/icons/pen.svg";
import ok_svg from "../assets/icons/ok.svg";

function icon(src: string) {
    return `<img src="${src}" class="icon">`;
}

function uuid() {
    return crypto.randomUUID().slice(0, 8);
}

var setting = localforage.createInstance({
    name: "setting",
    driver: localforage.LOCALSTORAGE,
});

/************************************UI */

/************************************main */
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
const dicContextEl = document.getElementById("dic_context");
const dicWordEl = document.getElementById("dic_word") as HTMLInputElement;
const moreWordsEl = document.getElementById("more_words");
const dicMinEl = document.getElementById("dic_min");
const dicDetailsEl = document.getElementById("dic_details");

const MARKWORD = "mark_word";
const TRANSLATE = "translate";
const HIDEMEANS = "hide_means";

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
};
type section = {
    title: string;
    text: string;
    words: { [key: string]: { id: string; index: [number, number]; visit: boolean } };
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

function getOnlineBooks() {
    fetch("https://raw.githubusercontent.com/xushengfeng/rmbw-book/master/index.json")
        .then((v) => v.json())
        .then((j) => {
            showOnlineBooks(j);
            console.log(j);
        });
}

function showOnlineBooks(books: {
    [key: string]: {
        name: string;
        id: string;
        type: "word" | "text";
        updateTime: number;
        sections: {
            id: string;
            title: string;
            path: string;
        }[];
    };
}) {
    onlineBooksListEl.innerHTML = "";
    for (let i in books) {
        const book = books[i];
        let div = document.createElement("div");
        let title = document.createElement("span");
        title.innerText = book.name;
        div.append(title);
        div.onclick = async () => {
            console.log(i);
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
                };
                saveBook();
            }
            function saveBook() {
                let s = [];
                const fetchPromises = book.sections.map(async (item) => {
                    const { id, path, title } = item;
                    const response = await fetch(
                        "https://raw.githubusercontent.com/xushengfeng/rmbw-book/master/source/" + path
                    );
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
};

document.getElementById("book_sections").onclick = () => {
    bookNavEl.classList.toggle("book_nav_show");
};

let nowBook = {
    book: "",
    sections: NaN,
};

let isWordBook = false;

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

function showBooks() {
    booksEl.innerHTML = "";
    bookshelfStore.iterate((book: book) => {
        let bookIEl = document.createElement("div");
        let titleEl = document.createElement("h2");
        titleEl.innerText = book.name;
        bookIEl.append(titleEl);
        booksEl.append(bookIEl);
        bookIEl.onclick = () => {
            showBook(book);
        };
    });
}
function showBook(book: book) {
    nowBook.book = book.id;
    nowBook.sections = book.lastPosi;
    showBookSections(book.sections);
    showBookContent(book.sections[book.lastPosi]);
    setBookS();
    isWordBook = book.type === "word";
}
async function showBookSections(sections: book["sections"]) {
    bookSectionsEl.innerHTML = "";
    for (let i in sections) {
        let sEl = document.createElement("div"); // TODO 虚拟列表
        let s = await getSection(sections[i]);
        sEl.innerText = s.title || `章节${Number(i) + 1}`;
        bookSectionsEl.append(sEl);
        sEl.onclick = async () => {
            nowBook.sections = Number(i);
            showBookContent(sections[i]);
            setBookS();
            let book = await getBooksById(nowBook.book);
            book.lastPosi = nowBook.sections;
            bookshelfStore.setItem(nowBook.book, book);
        };
    }
}
async function showBookContent(id: string) {
    let s = (await sectionsStore.getItem(id)) as section;
    bookContentEl.innerHTML = "";

    if (isWordBook) {
        let l = s.text.trim().split("\n");
        let keys = await wordsStore.keys();
        let ll = document.createDocumentFragment();
        let matchWords = 0;
        for (let i of l) {
            let p = document.createElement("p");
            let t = i;
            if (keys.includes(i)) {
                t = `${t} *`;
                matchWords++;
            }
            p.innerText = t;
            ll.append(p);
        }
        let sum = document.createElement("p");
        sum.innerText = `本章共有 ${l.length}个单词，已了解 ${matchWords}个，占 ${(
            (matchWords / l.length) *
            100
        ).toFixed(2)}%`;

        bookContentEl.append(sum, ll);

        return;
    }

    editText = s.text;
    const segmenter = new Segmenter("en", { granularity: "word" });
    let segments = segmenter.segment(s.text);
    let list = Array.from(segments);
    let plist: { text: string; start: number; end: number; isWord: boolean }[][] = [[]];
    for (let word of list) {
        if (/\n+/.test(word.segment)) {
            plist.push([]);
        } else {
            plist.at(-1).push({
                text: word.segment,
                start: word.index,
                end: word.index + word.segment.length,
                isWord: word.isWordLike,
            });
        }
    }
    console.log(plist);

    for (let paragraph of plist) {
        let el: HTMLElement = document.createElement("p");
        let t = paragraph[0]?.text.match(/#+$/) && paragraph[1]?.text === " ";
        if (t) el = document.createElement("h" + paragraph[0].text.trim().length);
        for (let i in paragraph) {
            if (t && i === "0") continue;
            const word = paragraph[i];
            if (word.isWord) {
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
                el.append(span);
            } else {
                el.append(word.text);
            }
        }
        el.onclick = async (ev) => {
            const span = ev.target as HTMLSpanElement;
            if (span.tagName != "SPAN") return;
            const i = span.getAttribute("data-i");
            let s = paragraph[0].start,
                e = paragraph.at(-1).end;
            let j = Number(i) - 1;
            while (j >= 0 && !paragraph[j].text.match(/[.?!]/)) {
                s = paragraph[j].start;
                j--;
            }
            j = Number(i);
            while (j < paragraph.length && !paragraph[j].text.match(/[.?!]/)) {
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
        el.oncontextmenu = async (ev) => {
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

        bookContentEl.append(el);
    }

    bookContentEl.scrollTop = s.lastPosi * (bookContentEl.scrollHeight - bookContentEl.offsetHeight);
}
let isEdit = false;
let editText = "";

async function changeEdit(b: boolean) {
    isEdit = b;
    if (isEdit) {
        changeEditEl.innerHTML = icon(ok_svg);
        return setEdit();
    } else {
        if (nowBook.book) {
            let book = await getBooksById(nowBook.book);
            let sectionId = book.sections[nowBook.sections];
            let section = await getSection(sectionId);
            if (editText) {
                section = changePosi(section, editText);
                section.text = editText;
                await sectionsStore.setItem(sectionId, section);
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
    text.onchange = () => {
        editText = text.value;
    };
    text.onkeyup = async (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            let l = text.value.split("\n");
            let hasAi = false;
            let aiM: aim = [];
            let sourceText = "";
            for (let i of l) {
                if (i === "=ai=") {
                    hasAi = true;
                    continue;
                }
                if (hasAi) {
                    if (i.startsWith("ai:")) {
                        aiM.push({ role: "assistant", content: i.replace("ai:", "").trim() });
                    } else if (i.startsWith(">>>")) {
                        aiM.push({ role: "user", content: i.replace(">>>", "").trim() });
                    } else if (i === "====") {
                        hasAi = false;
                    } else if (i.startsWith("//")) {
                        continue;
                    } else {
                        if (aiM.length) aiM.at(-1).content += "\n" + i;
                    }
                } else {
                    sourceText += i + "\n";
                }
            }
            if (aiM.length === 0) return;
            aiM.unshift({ role: "system", content: `This is a passage: ${sourceText}` });
            console.log(aiM);
            let start = text.selectionStart;
            let end = text.selectionEnd;
            let aitext = await ai(aiM);
            let addText = `ai:${aitext}`;
            let changeText = text.value.slice(0, start) + addText + text.value.slice(end);
            text.value = changeText;
            editText = changeText;
            end += addText.length;
        }
    };
    bookContentEl.append(text);
    let upel = document.createElement("input");
    upel.type = "file";
    upel.onchange = () => {
        const file = upel.files[0];
        if (file) {
            const reader = new FileReader();
            reader.readAsText(file);
            reader.onload = () => {
                let t = reader.result as string;
                text.value = t;
                editText = t;
            };
        }
    };
    bookContentEl.append(upel);
    return text;
}

bookContentEl.onscroll = async () => {
    let n = bookContentEl.scrollTop / (bookContentEl.scrollHeight - bookContentEl.offsetHeight);
    let book = await getBooksById(nowBook.book);
    let sectionId = book.sections[nowBook.sections];
    let section = await getSection(sectionId);
    section.lastPosi = n;
    sectionsStore.setItem(sectionId, section);
};

bookdicEl.onclick = () => {
    dicEl.classList.toggle("dic_show");
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

dicMinEl.onclick = () => {
    dicDetailsEl.classList.toggle(HIDEMEANS);
};

async function showDic(id: string) {
    dicEl.classList.add("dic_show");

    let book = await getBooksById(nowBook.book);
    let sectionId = book.sections[nowBook.sections];
    let section = await getSection(sectionId);

    let wordx = section.words[id];
    wordx.visit = true;
    section.words[id] = wordx;
    sectionsStore.setItem(sectionId, section);

    let oldWord = wordx.id;
    let wordv = (await wordsStore.getItem(wordx.id)) as record;
    let context = "";
    let sourceIndex = [0, 0];
    const sourceWord = oldWord;
    let oldDic = "";
    let oldMean = NaN;
    let contextx: record["means"][0]["contexts"][0] = null;
    for (let i of wordv.means) {
        oldDic = i.dic;
        oldMean = i.index;
        for (let j of i.contexts) {
            if (j.source.id === id) {
                context = j.text;
                sourceIndex = j.index;
                contextx = j;
            }
        }
    }

    async function changeDicMean(word: string, dic: string, i: number) {
        if (word != oldWord || dic != oldDic || i != oldMean) {
            for (let m of wordv.means) {
                if (m.dic === oldDic && m.index === oldMean) {
                    m.contexts = m.contexts.filter((c) => c.source.id != contextx.source.id);
                    if (m.contexts.length === 0) {
                        await card2word.removeItem(m.card_id);
                        await cardsStore.removeItem(m.card_id);
                        wordv.means = wordv.means.filter((i) => i != m);
                    }
                    if (wordv.means.length === 0) {
                        await wordsStore.removeItem(oldWord);
                        await spellStore.removeItem(oldWord);
                    } else {
                        await wordsStore.setItem(oldWord, wordv);
                    }
                    break;
                }
            }

            addReviewCard(word, { dic, index: i }, contextx);

            oldWord = word;
            oldDic = dic;
            oldMean = i;
            section.words[id].id = word;
            await sectionsStore.setItem(sectionId, section);
        }
    }

    let dicC = document.createElement("p");
    let dicCTr = document.createElement("p");
    dicContextEl.innerHTML = "";
    dicContextEl.append(dicC, dicCTr);

    let mainWord = document.createElement("span");
    mainWord.classList.add(MARKWORD);
    mainWord.innerText = context.slice(sourceIndex[0], sourceIndex[1]);
    dicC.append(context.slice(0, sourceIndex[0]), mainWord, context.slice(sourceIndex[1]));

    dicCTr.innerText = "点击翻译";
    dicCTr.classList.add(TRANSLATE);
    dicCTr.onclick = async () => {
        let translator = await pipeline("translation", "Xenova/nllb-200-distilled-600M");
        let output = await translator(context, {
            src_lang: "eng_Latn",
            tgt_lang: "zho_Hans",
        });
        console.log(output);
        dicCTr.innerText = output[0].translation_text;
    };

    search(oldWord);
    dicWordEl.value = oldWord;
    dicWordEl.onchange = () => {
        let newWord = dicWordEl.value.trim();
        search(newWord);
        changeDicMean(newWord, oldDic, oldMean);
    };

    let lword = lemmatizer(sourceWord);
    moreWordsEl.innerHTML = "";
    for (let w of Array.from(new Set([sourceWord, lword]))) {
        let div = document.createElement("span");
        div.innerText = w;
        div.onclick = () => {
            dicWordEl.value = w;
            search(w);
        };
        moreWordsEl.append(div);
    }

    async function search(word: string) {
        let x = dics[oldDic].get(word) as dic[0];
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
                    changeDicMean(word, oldDic, Number(i));
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
            let c = `${context.slice(0, sourceIndex[0])}**${sourceWord}**${context.slice(sourceIndex[1])}`;
            console.log(c);

            ai([
                {
                    role: "user",
                    content: `I have a bolded word '${sourceWord}' wrapped in double asterisks in the sentence:'${c}'.This is a dictionary's explanation of several interpretations:${means}.Please think carefully and select the most appropriate label for explanation, without providing any explanation.`,
                },
            ]).then((a) => {
                console.log(a);
                let n = Number(a.match(/[0-9]+/)[0]);
                setcheck(n);
                changeDicMean(word, oldDic, n);
            });
        }
        function setcheck(i: number) {
            let el = dicDetailsEl.querySelectorAll("input[name=dic_means]")[i] as HTMLInputElement;
            el.checked = true;
            dicDetailsEl.classList.add(HIDEMEANS);
        }
        if (oldMean === -1) {
            if (x.means.length > 1) {
                set();
            } else {
                setcheck(0);
            }
        } else {
            setcheck(oldMean);
        }
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
    section.words[id] = { id: v.key, index: [v.index.start, v.index.end], visit: false };

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

function ai(m: aim) {
    return new Promise((re: (text: string) => void) => {
        fetch(`https://ai.fakeopen.com/v1/chat/completions`, {
            method: "POST",
            headers: {
                Authorization: `Bearer pk-this-is-a-real-free-pool-token-for-everyone`,
                "content-type": "application/json",
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                temperature: 0.5,
                top_p: 1,
                frequency_penalty: 1,
                presence_penalty: 1,
                messages: m,
            }),
        })
            .then((v) => v.json())
            .then((t) => {
                let answer = t.choices[0].message.content;
                console.log(answer);
                re(answer);
            });
    });
}

import * as fsrsjs from "fsrs.js";
let fsrs = new fsrsjs.FSRS();

var cardsStore = localforage.createInstance({ name: "word", storeName: "cards" });
var wordsStore = localforage.createInstance({ name: "word", storeName: "words" });
var card2word = localforage.createInstance({ name: "word", storeName: "card2word" });
var spellStore = localforage.createInstance({ name: "word", storeName: "spell" });

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
                cardsStore.setItem(i.card_id, sCards[fsrsjs.Rating.Hard].card);
                wordsStore.setItem(word, w);
                return;
            }
        }
        let cardId = uuid();
        let m = { ...means, contexts: [context], card_id: cardId };
        w.means.push(m);
        let card = new fsrsjs.Card();
        cardsStore.setItem(cardId, card);
        card2word.setItem(cardId, word);
        wordsStore.setItem(word, w);
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
        wordsStore.setItem(word, r);
        cardsStore.setItem(cardId, card);
        card2word.setItem(cardId, word);
        let card2 = new fsrsjs.Card();
        spellStore.setItem(word, card2);
    }
}

const reviewBEl = document.getElementById("reviewb");
const reviewEl = document.getElementById("review");
reviewBEl.onclick = () => {
    reviewEl.classList.toggle("review_show");
};

const reviewReflashEl = document.getElementById("review_reflash");
const reviewViewEl = document.getElementById("review_view");

async function getReviewDue() {
    let now = new Date().getTime();
    let wordList: { id: string; card: fsrsjs.Card }[] = [];
    let spellList: { id: string; card: fsrsjs.Card }[] = [];
    await cardsStore.iterate((value: fsrsjs.Card, key) => {
        if (value.due.getTime() < now) {
            wordList.push({ id: key, card: value });
        }
    });
    await spellStore.iterate((value: fsrsjs.Card, key) => {
        if (value.due.getTime() < now) {
            spellList.push({ id: key, card: value });
        }
    });
    wordList.sort((a, b) => a.card.due.getTime() - b.card.due.getTime());
    spellList.sort((a, b) => a.card.due.getTime() - b.card.due.getTime());
    return { word: wordList, spell: spellList };
}

let due: {
    word: {
        list: {
            id: string;
            card: fsrsjs.Card;
        }[];
        i: number;
    };
    spell: {
        list: {
            id: string;
            card: fsrsjs.Card;
        }[];
        i: number;
    };
} = {
    word: {
        list: [],
        i: 0,
    },
    spell: {
        list: [],
        i: 0,
    },
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
    }
    if (reviewSpellEl.checked) {
        reviewType = "spell";
    }

    reviewReflashEl.click();
};

async function nextDue(type: review) {
    let x = due[type];
    x.i += 1;
    if (x.i >= x.list.length) {
        x.list = (await getReviewDue())[type];
        x.i = 0;
    }
    if (x.list[x.i]) {
        return x.list[x.i];
    }
    return null;
}

reviewReflashEl.onclick = async () => {
    let l = await getReviewDue();
    due.word.list = l.word;
    due.word.i = 0;
    due.spell.list = l.spell;
    due.spell.i = 0;
    console.log(l);
    if (due[reviewType].list[0]) showReview(due[reviewType].list[0], reviewType);
};

async function showReview(x: { id: string; card: fsrsjs.Card }, type: review) {
    function crContext(word: record) {
        let context = document.createElement("div");
        for (let i of word.means) {
            if (i.card_id === x.id) {
                for (let c of i.contexts) {
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
                console.log(next);

                if (next) showReview(next, reviewType);
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
        reviewViewEl.innerHTML = "";
        reviewViewEl.append(div);
    }
    if (type === "spell") {
        let input = document.createElement("input");
        let wordEl = document.createElement("div");
        let spellNum = 3;
        const word = x.id;
        input.oninput = async () => {
            let inputWord = input.value;
            wordEl.innerHTML = "";
            switch (inputWord) {
                case "~": // 暂时展示
                    input.value = "";
                    play(word);
                    wordEl.innerText = word;
                    setSpellCard(x.id, x.card, 2);
                    break;
                case "!": // 发音
                    play(word);
                    input.value = "";
                    break;
                case word: // 正确
                    if (spellNum === 1) {
                        setSpellCard(x.id, x.card, 4);
                        let next = await nextDue(reviewType);
                        if (next) showReview(next, reviewType);
                    } else {
                        spellNum--;
                        input.value = "";
                        input.placeholder = `Good! ${spellNum} time(s) left`;
                    }
                    break;
            }
            //错误归位
            if (inputWord.length === word.length && inputWord != word) {
                input.value = "";
                input.placeholder = `"${inputWord}" is wrong! ${spellNum} time(s) left`;
                play(word);
                setSpellCard(x.id, x.card, 1);
            }
        };
        let context = crContext((await wordsStore.getItem(word)) as record);
        const div = document.createElement("div");
        div.append(input, context, wordEl);
        reviewViewEl.innerHTML = "";
        reviewViewEl.append(div);
    }
}

function play(word: string) {
    let audio = <HTMLAudioElement>document.getElementById("audio");
    audio.src = "https://dict.youdao.com/dictvoice?le=eng&type=1&audio=" + word;
    audio.play();
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

/// <reference types="vite/client" />

import localforage from "localforage";

import pen_svg from "../assets/icons/pen.svg";
import ok_svg from "../assets/icons/ok.svg";

function icon(src: string) {
    return `<img src="${src}" class="icon">`;
}

class Store {
    constructor(name?: string) {
        this.storeName = name;
        this.xstore = JSON.parse(localStorage.getItem(name) ?? "{}");
    }
    xstore = {};
    storeName = "";
    setStore(obj: Object) {
        this.xstore = obj;
    }
    get store() {
        return this.xstore;
    }
    set(path: string, value: any) {
        let pathx = path.split(".");
        const lastp = pathx.pop();
        const lastobj = pathx.reduce((p, c) => (p[c] = p[c] || {}), this.xstore);
        lastobj[lastp] = value;
        if (this.storeName) {
            localStorage.setItem(this.storeName, JSON.stringify(this.xstore));
        }
    }
    get(path: string) {
        let pathx = path.split(".");
        const lastp = pathx.pop();
        const lastobj = pathx.reduce((p, c) => (p[c] = p[c] || {}), this.xstore);
        return lastobj[lastp];
    }
}
var store = new Store("rpi-config");
var historyStore = new Store();

var setting = localforage.createInstance({
    name: "setting",
    driver: localforage.LOCALSTORAGE,
});

/************************************UI */

/************************************main */
// import MarkdownIt from "markdown-it";
// var md = MarkdownIt({
//     html: true,
// })
const booksEl = document.getElementById("books");
const bookEl = document.getElementById("book");
const bookSectionsEl = document.getElementById("sections");
const addBookEl = document.getElementById("add_book");
const addSectionEL = document.getElementById("add_section");
const bookNavEl = document.getElementById("book_nav");
const bookContentEl = document.getElementById("book_content");
const changeEditEl = document.getElementById("change_edit");
const dicEl = document.getElementById("dic");
const bookdicEl = document.getElementById("book_dic");
const dicContextSaveEl = document.getElementById("dic_save");
const dicContextEl = document.getElementById("dic_context");
const dicDetailsEl = document.getElementById("dic_details");

var bookshelfStore = localforage.createInstance({ name: "bookshelf" });
var sectionsStore = localforage.createInstance({ name: "sections" });

type book = { name: string; id: string; visitTime: number; sections: string[]; canEdit: boolean; lastPosi: number };
type section = { title: string; text: string; words: string[]; lastPosi: number };

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
    let id = crypto.randomUUID();
    let sid = crypto.randomUUID();
    let book: book = { name: "新书", id: id, visitTime: 0, sections: [sid], canEdit: true, lastPosi: 0 };
    let s = newSection();
    bookshelfStore.setItem(id, book);
    await sectionsStore.setItem(sid, s);
    return { book: id, sections: 0 };
}

function newSection() {
    let s: section = { title: "新章节", lastPosi: 0, text: "", words: [] };
    return s;
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
    let sid = crypto.randomUUID();
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

showBooks();
setBookS();

async function setBookS() {
    if (nowBook.book) {
        let sectionId = (await getBooksById(nowBook.book)).sections[nowBook.sections];
        let section = await getSection(sectionId);
        document.getElementById("book_name").innerText = `${(await getBooksById(nowBook.book)).name} - ${
            section.title
        }`;
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
}
async function showBookSections(sections: book["sections"]) {
    bookSectionsEl.innerHTML = "";
    for (let i in sections) {
        let sEl = document.createElement("div"); // TODO 虚拟列表
        let s = await getSection(sections[i]);
        sEl.innerText = s.title || `章节${Number(i) + 1}`;
        bookSectionsEl.append(sEl);
        sEl.onclick = () => {
            nowBook.sections = Number(i);
            showBookContent(sections[i]);
            setBookS();
        };
    }
}
async function showBookContent(id: string) {
    let s = (await sectionsStore.getItem(id)) as section;
    bookContentEl.innerHTML = "";
    editText = s.text;
    let list = s.text.split(/\b/);
    let i = 0;
    let plist: { text: string; start: number; end: number }[][] = [[]];
    for (let word of list) {
        if (/\n+/.test(word)) {
            plist.push([]);
        } else {
            plist.at(-1).push({ text: word, start: i, end: i + word.length });
        }
        i += word.length;
    }
    console.log(plist);

    for (let paragraph of plist) {
        let p = document.createElement("p");
        for (let i in paragraph) {
            const word = paragraph[i];
            if (/^[a-zA-Z]+$/.test(word.text)) {
                let span = document.createElement("span");
                span.innerText = word.text;
                span.onclick = () => {
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

                    tmpRecord.push({
                        dic: "l",
                        key: word.text,
                        dindex: 0,
                        index: { start: word.start, end: word.end },
                        pindex: { start: paragraph[0].start, end: paragraph.at(-1).end },
                        cindex: { start: s, end: e },
                    });
                    showDic(tmpRecord.length - 1, true);
                };
                p.append(span);
            } else {
                p.append(word.text);
            }
        }
        bookContentEl.append(p);
    }
}
let isEdit = false;
let editText = "";

async function changeEdit(b: boolean) {
    isEdit = b;
    if (isEdit) {
        setEdit();
        changeEditEl.innerHTML = icon(ok_svg);
    } else {
        if (nowBook.book) {
            let book = await getBooksById(nowBook.book);
            let sectionId = book.sections[nowBook.sections];
            let section = await getSection(sectionId);
            if (editText) {
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
    bookContentEl.append(text);
}

bookdicEl.onclick = () => {
    dicEl.classList.toggle("dic_show");
};

let dics: { [key: string]: LocalForage } = {};
setting.getItem("dics").then((l: string[]) => {
    for (let i of l || []) {
        dics[i] = localforage.createInstance({
            name: `dic`,
            storeName: i,
        });
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
            index: [number, number]; // 文章定位
            index2: number; // 语境定位
            source: { book: string; sections: number }; // 原句通过对比计算
        }[];
        card_id: string;
    }[];
};

let tmpRecord: {
    dic: string;
    key: string;
    dindex: number;
    index: { start: number; end: number };
    pindex: { start: number; end: number };
    cindex: { start: number; end: number };
}[] = [];

async function showDic(i: number, isnew: boolean) {
    dicEl.classList.add("dic_show");
    let v = tmpRecord[i];
    let word = editText.slice(v.index.start, v.index.end);
    let p = editText.slice(v.pindex.start, v.pindex.end);
    let context = editText.slice(v.cindex.start, v.cindex.end);
    dicContextEl.innerText = context;
    console.log(tmpRecord);

    let x = (await dics["xout.json"].getItem(word)) as dic[0];
    if (!x) return;
    dicDetailsEl.innerHTML = "";
    for (let i in x.means) {
        const m = x.means[i];
        let div = document.createElement("div");
        let radio = document.createElement("input");
        radio.type = "radio";
        radio.name = "dic_means";
        radio.onclick = () => {
            if (radio.checked) {
                v.dindex = Number(i);
            }
        };
        let num = document.createElement("span");
        num.innerText = String(Number(i) + 1);
        let p = document.createElement("p");
        p.innerText = m.dis.text;
        let span = document.createElement("span");
        span.innerText = m.dis.tran;
        let sen = document.createElement("div");
        for (let s of m.sen) {
            let p = document.createElement("p");
            p.innerText = s.text;
            let span = document.createElement("span");
            span.innerText = s.tran;
            sen.append(p);
            sen.append(span);
        }
        div.append(radio, num, p, span, sen);
        dicDetailsEl.append(div);
    }

    function set() {
        let means = "";
        for (let i in x.means) {
            means += `${i}.${x.means[i].dis.text};\n`;
        }
        let c = `${context.slice(0, v.index.start - v.cindex.start)}**${word}**${context.slice(
            v.index.end - v.cindex.start
        )}`;
        console.log(c);

        ai([
            {
                role: "user",
                content: `I have a bolded word '${word}' wrapped in double asterisks in the sentence:'${c}'.This is a dictionary's explanation of several interpretations:${means}.Please think carefully and select the most appropriate label for explanation, without providing any explanation.`,
            },
        ]).then((a) => {
            console.log(a);
            let n = Number(a.match(/^[0-9]+$/)[0]);
            setcheck(n);
            v.dindex = n;
        });
    }
    function setcheck(i: number) {
        (dicDetailsEl.querySelectorAll("input[name=dic_means]")[i] as HTMLInputElement).checked = true;
    }
    if (isnew) {
        if (x.means.length > 1) {
            set();
        } else {
            setcheck(0);
        }
    } else {
        setcheck(v.dindex);
    }

    dicContextSaveEl.onclick = () => {
        saveCard(v);
    };
}

function saveCard(v: (typeof tmpRecord)[0]) {
    addReviewCard(
        v.key,
        { dic: "xout.json", index: v.dindex },
        {
            text: editText.slice(v.cindex.start, v.cindex.end),
            index: [v.index.start, v.index.end],
            index2: v.index.start - v.cindex.start,
            source: nowBook,
        }
    );
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
        index2: number;
        source: { book: string; sections: number }; // 原句通过对比计算
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
        let cardId = crypto.randomUUID();
        let m = { ...means, contexts: [context], card_id: cardId };
        w.means.push(m);
        let card = new fsrsjs.Card();
        cardsStore.setItem(cardId, card);
        card2word.setItem(cardId, word);
        wordsStore.setItem(word, w);
    } else {
        let cardId = crypto.randomUUID();
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

const reviewReflashEl = document.getElementById("review_reflash");
const reviewViewEl = document.getElementById("review_view");

async function getReviewDue() {
    let now = new Date().getTime();
    let list: { id: string; card: fsrsjs.Card; type: "mean" | "spell" }[] = [];
    await cardsStore.iterate((value: fsrsjs.Card, key) => {
        if (value.due.getTime() < now) {
            list.push({ id: key, card: value, type: "mean" });
        }
    });
    await spellStore.iterate((value: fsrsjs.Card, key) => {
        if (value.due.getTime() < now) {
            list.push({ id: key, card: value, type: "spell" });
        }
    });
    list.sort((a, b) => a.card.due.getTime() - b.card.due.getTime());
    return list;
}

let dueList: {
    id: string;
    card: fsrsjs.Card;
    type: "mean" | "spell";
}[] = [];
let dueI = 0;

async function nextDue(type: "mean" | "spell") {
    dueI += 1;
    if (dueI >= dueList.length) {
        dueList = await getReviewDue();
        dueI = 0;
    }
    if (dueList[dueI]) {
        for (let i = dueI; i < dueList.length; i++) {
            if (dueList[i].type === type) {
                return dueList[i];
            }
        }
    }
    return null;
}

reviewReflashEl.onclick = async () => {
    let l = await getReviewDue();
    dueList = l;
    dueI = 0;
    console.log(l);
    if (l[0]) showReview(l[0]);
};

async function showReview(x: { id: string; card: fsrsjs.Card; type: "mean" | "spell" }) {
    if (x.type === "mean") {
        let wordid = (await card2word.getItem(x.id)) as string;
        let word = (await wordsStore.getItem(wordid)) as record;
        let div = document.createElement("div");
        let context = document.createElement("div");
        for (let i of word.means) {
            if (i.card_id === x.id) {
                for (let c of i.contexts) {
                    let p = document.createElement("p");
                    p.innerText = c.text;
                    context.append(p);
                }
            }
        }
        let b = (rating: fsrsjs.Rating, text: string) => {
            let button = document.createElement("button");
            button.innerText = text;
            button.onclick = async () => {
                setReviewCard(x.id, x.card, rating);
                let next = await nextDue(x.type);
                console.log(next);

                if (next) showReview(next);
            };
            return button;
        };
        let againB = b(1, "x");
        let hardB = b(2, "o");
        let goodB = b(3, "v");
        let esayB = b(4, "vv");
        let buttons = document.createElement("div");
        buttons.append(againB, hardB, goodB, esayB);

        div.append(context, buttons);
        reviewViewEl.innerHTML = "";
        reviewViewEl.append(div);
    }
}

function setReviewCard(id: string, card: fsrsjs.Card, rating: fsrsjs.Rating) {
    let now = new Date();
    let sCards = fsrs.repeat(card, now);
    cardsStore.setItem(id, sCards[rating].card);
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
            let l = (dics[file.name] = localforage.createInstance({
                name: `dic`,
                storeName: file.name,
            }));
            setting.setItem("dics", Object.keys(dics));
            for (let i in dic) {
                l.setItem(i, dic[i]);
            }
        };
    }
};

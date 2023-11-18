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
const bookNavEl = document.getElementById("book_nav");
const bookContentEl = document.getElementById("book_content");
const changeEditEl = document.getElementById("change_edit");
const dicEl = document.getElementById("dic");
const bookdicEl = document.getElementById("book_dic");
const dicContextEl = document.getElementById("dic_context");
const dicDetailsEl = document.getElementById("dic_details");
type book = { name: string; sections: { title: string; text: string }[] };
let books: book[] = [
    {
        name: "test",
        sections: [
            {
                title: "section 1",
                text: "hi\nthis is a paragraph. this is x",
            },
            {
                title: "section 2",
                text: "hi\nthis is another paragraph. this is x",
            },
        ],
    },
];

document.getElementById("book_sections").onclick = () => {
    bookNavEl.classList.toggle("book_nav_show");
};

let nowBook = {
    book: "test",
    sections: 0,
};

showBooks(books);
setBookS();

function setBookS() {
    document.getElementById("book_name").innerText = `${nowBook.book} - ${
        books.find((b) => b.name === nowBook.book).sections[nowBook.sections].title
    }`;
}

function showBooks(books: book[]) {
    booksEl.innerHTML = "";
    for (let book of books) {
        let bookIEl = document.createElement("div");
        let titleEl = document.createElement("h2");
        titleEl.innerText = book.name;
        bookIEl.append(titleEl);
        booksEl.append(bookIEl);
        bookIEl.onclick = () => {
            showBook(book);
        };
    }
}
function showBook(book: book) {
    nowBook.book = book.name;
    showBookSections(book.sections);
    showBookContent(book.sections[0]);
    setBookS();
}
function showBookSections(sections: book["sections"]) {
    bookSectionsEl.innerHTML = "";
    for (let i in sections) {
        let sEl = document.createElement("div"); // TODO 虚拟列表
        sEl.innerText = sections[i].title || `章节${Number(i) + 1}`;
        bookSectionsEl.append(sEl);
        sEl.onclick = () => {
            nowBook.sections = Number(i);
            showBookContent(sections[i]);
            setBookS();
        };
    }
}
function showBookContent(s: book["sections"][0]) {
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

function changeEdit(b: boolean) {
    isEdit = b;
    if (isEdit) {
        setEdit();
        changeEditEl.innerHTML = icon(ok_svg);
    } else {
        let book = books.find((b) => b.name === nowBook.book);
        let section = book.sections[nowBook.sections];
        if (editText) section.text = editText;
        showBookContent(section);
        changeEditEl.innerHTML = icon(pen_svg);
    }
}
changeEditEl.onclick = () => {
    isEdit = !isEdit;
    changeEdit(isEdit);
};

changeEdit(false);

function setEdit() {
    let book = books.find((b) => b.name === nowBook.book);
    let section = book.sections[nowBook.sections];
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
    for (let i of l) {
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

let record: {
    word: string;
    means: {
        dic: string;
        key: string;
        index: number;
        contexts: {
            text: string;
            index: [number, number];
            source: { book: string; sections: number }; // 原句通过对比计算
        }[];
    }[];
}[] = [];

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

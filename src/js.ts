/// <reference types="vite/client" />

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
    for (let p of s.text.split("\n")) {
        let pEl = document.createElement("p");
        for (let sentence of p.split(".")) {
            let sentenceEl = document.createElement("span");
            for (let word of sentence.split(" ")) {
                let wordEl = document.createElement("span");
                wordEl.innerText = word;
                sentenceEl.append(wordEl, " ");
                wordEl.onclick = () => {
                    showDic(word);
                };
            }
            pEl.append(sentenceEl, ".");
        }
        bookContentEl.append(pEl);
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
       if(editText) section.text = editText;
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

bookdicEl.onclick=()=>{
    dicEl.classList.toggle("dic_show");

}

function showDic(word) {
    dicEl.classList.add("dic_show");
}

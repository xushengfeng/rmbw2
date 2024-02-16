import MarkdownIt from "markdown-it";
const md = new MarkdownIt();

import tutorial from "../../docs/tutorial.md?raw";

renderMd(tutorial);

function renderMd(text: string) {
    const html = md.render(text);
    document.body.innerHTML = html;
}

const xss = require("xss");

function normalizeHrefs(html) {
    if (!html) return html;
    return html.replace(
        /href=(["'])([^"']+)\1/gi,
        (match, quote, url) => {
            const trimmed = url.trim();
            if (!trimmed) return match;
            if (/^(https?:|mailto:|tel:|#)/i.test(trimmed)) return match;
            if (trimmed.startsWith("//")) {
                return `href=${quote}https:${trimmed}${quote}`;
            }
            return `href=${quote}https://${trimmed.replace(/^\/+/, "")}${quote}`;
        }
    );
}

function sanitizeDescription(html) {
    if (!html) return "";

    const normalized = normalizeHrefs(String(html));

    const myXss = new xss.FilterXSS({
        whiteList: {
            p: [], br: [], strong: [], b: [], em: [], i: [], u: [], s: [],
            h1: [], h2: [], h3: [],
            ul: [], ol: [], li: [],
            a: ["href", "target", "rel"],
            blockquote: [],
            img: ["src", "alt", "width", "height", "loading"],
            video: ["src", "controls", "width", "height", "poster", "preload"],
            figure: [], figcaption: [],
            span: ["style"],
        },
        stripIgnoreTag: true,
        stripIgnoreTagBody: ["script", "style"],
        onTagAttr: (tag, name, value) => {
            if (tag === "a" && name === "href") {
                const safe = /^(https?:|mailto:|tel:|#)/i.test(value)
                    ? value
                    : `https://${value}`;
                return `${name}="${safe}" target="_blank" rel="noopener noreferrer"`;
            }
            if (tag === "img" && name === "src") {
                if (!/^(https?:|data:image\/)/i.test(value)) return "";
            }
            if (tag === "video" && name === "src") {
                if (!/^https?:/i.test(value)) return "";
            }
        },
    });

    return myXss.process(normalized);
}

module.exports = { sanitizeDescription };
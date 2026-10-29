const sanitizeHtml = require("sanitize-html");

function normalizeHrefs(html) {
    if (!html) return html;
    return html.replace(
        /href=(["'])([^"']+)\1/gi,
        (match, quote, url) => {
            const trimmed = url.trim();
            if (!trimmed) return match;

            // Already has a scheme or is a fragment → leave alone
            if (/^(https?:|mailto:|tel:|#)/i.test(trimmed)) return match;

            // Protocol-relative (//example.com) → force https
            if (trimmed.startsWith("//")) {
                return `href=${quote}https:${trimmed}${quote}`;
            }

            // No scheme → prepend https://
            return `href=${quote}https://${trimmed.replace(/^\/+/, "")}${quote}`;
        }
    );
}

function sanitizeDescription(html) {
    if (!html) return "";

    const normalized = normalizeHrefs(String(html));

    return sanitizeHtml(normalized, {
        allowedTags: [
            "p", "br", "strong", "em", "u", "s",
            "h1", "h2", "h3",
            "ul", "ol", "li",
            "a", "blockquote",
            "img", "video", "figure", "figcaption",
            "span",
        ],
        allowedAttributes: {
            a: ["href", "target", "rel"],
            img: ["src", "alt", "width", "height"],
            video: ["src", "controls", "width", "height", "poster", "preload"],
            "*": ["style"],
        },
        allowedSchemes: ["http", "https"],
        allowedSchemesByTag: { img: ["http", "https", "data"], video: ["http", "https"] },
        transformTags: {
            a: sanitizeHtml.simpleTransform("a", {
                target: "_blank",
                rel: "noopener noreferrer",
            }),
            img: sanitizeHtml.simpleTransform("img", { loading: "lazy" }),
            video: sanitizeHtml.simpleTransform("video", {
                controls: "controls",
                preload: "metadata",
            }),
        },
    });
}

module.exports = { sanitizeDescription };
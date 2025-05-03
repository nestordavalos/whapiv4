import React from "react";
import Markdown from "markdown-to-jsx";

const elements = [
  "a", "abbr", "address", "area", "article", "aside", "audio", "b", "base", "bdi", "bdo", "big",
  "blockquote", "body", "br", "button", "canvas", "caption", "cite", "code", "col", "colgroup",
  "data", "datalist", "dd", "del", "details", "dfn", "dialog", "div", "dl", "dt", "em", "embed",
  "fieldset", "figcaption", "figure", "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6", "head",
  "header", "hgroup", "hr", "html", "i", "iframe", "img", "input", "ins", "kbd", "keygen", "label",
  "legend", "li", "link", "main", "map", "mark", "marquee", "menu", "menuitem", "meta", "meter",
  "nav", "noscript", "object", "ol", "optgroup", "option", "output", "p", "param", "picture", "pre",
  "progress", "q", "rp", "rt", "ruby", "s", "samp", "script", "section", "select", "small", "source",
  "span", "strong", "style", "sub", "summary", "sup", "table", "tbody", "td", "textarea", "tfoot",
  "th", "thead", "time", "title", "tr", "track", "u", "ul", "var", "video", "wbr",
  // SVG
  "circle", "clipPath", "defs", "ellipse", "foreignObject", "g", "image", "line", "linearGradient",
  "marker", "mask", "path", "pattern", "polygon", "polyline", "radialGradient", "rect", "stop",
  "svg", "text", "tspan"
];

const allowedElements = ["a", "b", "strong", "em", "u", "code", "del"];

const CustomLink = ({ children, ...props }) => (
  <a {...props} target="_blank" rel="noopener noreferrer">
    {children}
  </a>
);

const MarkdownWrapper = ({ children }) => {
  const boldRegex = /\*(.*?)\*/g;
  const tildaRegex = /~(.*?)~/g;
  const urlRegex = /(https?:\/\/[^\s]+)/g;

  if (!children || typeof children !== "string") return null;

  // Validaciones de contenido, pero sin cortar el renderizado por completo
  if (children.includes("BEGIN:VCARD") || children.includes("data:image/")) {
    return <span style={{ fontStyle: "italic", color: "#999" }}>[Contenido omitido]</span>;
  }

  // Procesar markdown personalizado
  let content = children;
  content = content.replace(boldRegex, "**$1**");
  content = content.replace(tildaRegex, "~~$1~~");
  content = content.replace(urlRegex, (url) => `[${url}](${url})`);

  const markdownOptions = {
    disableParsingRawHTML: true,
    forceInline: true,
    overrides: {
      a: { component: CustomLink },
    },
  };

  return <Markdown options={markdownOptions}>{content}</Markdown>;
};

export default MarkdownWrapper;

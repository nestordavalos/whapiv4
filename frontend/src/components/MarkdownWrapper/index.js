import React from "react";
import Markdown from "markdown-to-jsx";
import linkifyHtml from "linkify-html";

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

  const options = React.useMemo(() => {
    const markdownOptions = {
      disableParsingRawHTML: false,
      forceInline: true,
      overrides: {
        a: { component: CustomLink },
      },
    };

    elements.forEach((el) => {
      if (!allowedElements.includes(el)) {
        markdownOptions.overrides[el] = () => null;
      }
    });

    return markdownOptions;
  }, []);

  if (!children) return null;

  if (children.includes("BEGIN:VCARD") || children.includes("data:image/")) {
    return null;
  }

  let processed = children;
  processed = processed.replace(boldRegex, "**$1**");
  processed = processed.replace(tildaRegex, "~~$1~~");

  const linkified = linkifyHtml(processed, {
    defaultProtocol: "https",
    target: "_blank",
    rel: "noopener noreferrer",
  });

  return <Markdown options={options}>{linkified}</Markdown>;
};

export default MarkdownWrapper;

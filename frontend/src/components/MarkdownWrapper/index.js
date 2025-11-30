import React from "react";
import Markdown from "markdown-to-jsx";

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

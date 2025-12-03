import React from "react";
import Markdown from "markdown-to-jsx";

const CustomLink = ({ children, ...props }) => (
  <a 
    {...props} 
    target="_blank" 
    rel="noopener noreferrer"
    style={{ 
      color: "#1976d2", 
      textDecoration: "underline",
      cursor: "pointer",
      wordBreak: "break-all"
    }}
    onClick={(e) => e.stopPropagation()}
  >
    {children}
  </a>
);

const MarkdownWrapper = ({ children }) => {
  const boldRegex = /\*(.*?)\*/g;
  const tildaRegex = /~(.*?)~/g;
  // Improved URL regex that also matches URLs without protocol
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/g;

  if (!children || typeof children !== "string") return null;

  // Validaciones de contenido, pero sin cortar el renderizado por completo
  if (children.includes("BEGIN:VCARD") || children.includes("data:image/")) {
    return <span style={{ fontStyle: "italic", color: "#999" }}></span>;
  }

  // Procesar markdown personalizado
  let content = children;
  content = content.replace(boldRegex, "**$1**");
  content = content.replace(tildaRegex, "~~$1~~");
  
  // Convert URLs to markdown links, adding https:// if missing
  content = content.replace(urlRegex, (url) => {
    // Skip if already in markdown link format
    if (url.startsWith('[') || url.includes('](')) return url;
    
    // Add protocol if missing
    let fullUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      fullUrl = 'https://' + url;
    }
    return `[${url}](${fullUrl})`;
  });

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

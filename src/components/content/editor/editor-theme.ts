import type { EditorThemeClasses } from "lexical";

export const editorTheme: EditorThemeClasses = {
  hr: "my-4 border-none h-0.5 bg-border cursor-pointer",
  hrSelected: "outline outline-2 outline-primary",
  paragraph: "mb-2",
  heading: {
    h1: "text-3xl font-bold mb-4 mt-6 first:mt-0",
    h2: "text-2xl font-semibold mb-3 mt-5 first:mt-0",
    h3: "text-xl font-medium mb-2 mt-4 first:mt-0",
    h4: "text-lg font-medium mb-2 mt-3 first:mt-0",
    h5: "text-base font-medium mb-1 mt-2 first:mt-0",
  },
  text: {
    bold: "font-bold",
    italic: "italic",
    underline: "underline",
    strikethrough: "line-through",
    code: "font-mono bg-muted px-1.5 py-0.5 rounded text-sm",
  },
  list: {
    ul: "list-disc ml-6 mb-2",
    ol: "list-decimal ml-6 mb-2",
    listitem: "mb-1",
    nested: {
      listitem: "list-none",
    },
  },
  quote: "border-l-4 border-border pl-4 italic my-4 text-muted-foreground",
  code: "font-mono bg-muted p-4 rounded-lg block overflow-x-auto text-sm my-4",
  link: "text-primary underline hover:no-underline",
};

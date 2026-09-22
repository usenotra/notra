import type { EditorThemeClasses } from "lexical";

export const editorTheme: EditorThemeClasses = {
  hr: "my-4 border-none h-0.5 bg-border cursor-pointer",
  hrSelected: "outline outline-2 outline-primary",
  paragraph: "mb-2 text-sm leading-relaxed",
  heading: {
    h1: "mt-6 mb-3 font-semibold text-lg tracking-tight first:mt-0",
    h2: "mt-5 mb-2 font-semibold text-base tracking-tight first:mt-0",
    h3: "mt-4 mb-2 font-semibold text-sm tracking-tight first:mt-0",
    h4: "mt-3 mb-2 font-medium text-sm tracking-tight first:mt-0",
    h5: "mt-2 mb-1 font-medium text-sm tracking-tight first:mt-0",
  },
  text: {
    bold: "font-bold",
    italic: "italic",
    underline: "underline",
    strikethrough:
      "rounded-sm bg-red-500/12 text-inherit line-through decoration-red-600/55 dark:bg-red-400/20 dark:decoration-red-400/65",
    highlight: "text-inherit",
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
  quote:
    "border-l-4 border-border pl-4 italic my-4 text-muted-foreground text-sm",
  link: "text-primary underline hover:no-underline cursor-pointer",
  table: "w-full my-4 border-collapse",
  tableCell:
    "border border-border px-3 py-2 text-sm min-w-[75px] align-top relative",
  tableCellHeader: "bg-muted font-semibold text-left",
  tableRow: "",
  tableCellSelected: "bg-primary/10",
  tableSelected: "outline outline-2 outline-primary",
};

import type { EditorThemeClasses } from "lexical";

import { editorTheme } from "./editor-theme";

export const longFormEditorTheme: EditorThemeClasses = {
  ...editorTheme,
  paragraph: "mb-4 text-sm leading-relaxed",
  heading: {
    h1: "mt-8 mb-3 font-semibold text-lg tracking-tight first:mt-0",
    h2: "mt-8 mb-3 font-semibold text-base tracking-tight first:mt-0",
    h3: "mt-6 mb-2 font-semibold text-sm tracking-tight first:mt-0",
    h4: "mt-6 mb-2 font-medium text-sm tracking-tight first:mt-0",
    h5: "mt-6 mb-2 font-medium text-sm tracking-tight first:mt-0",
  },
  list: {
    ul: "my-4 ml-0 list-disc space-y-1.5 pl-5",
    ol: "my-4 ml-0 list-decimal space-y-1.5 pl-5",
    listitem: "text-sm leading-relaxed",
    nested: {
      listitem: "list-none",
    },
  },
  quote:
    "my-4 border-border border-l-2 pl-4 text-muted-foreground text-sm italic leading-relaxed",
};

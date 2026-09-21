import type { EditorThemeClasses } from "lexical";

import { editorTheme } from "./editor-theme";

export const longFormEditorTheme: EditorThemeClasses = {
  ...editorTheme,
  paragraph: "mb-6 text-[1.0625rem] leading-7",
  heading: {
    h1: "mt-10 mb-4 font-semibold text-3xl tracking-tight first:mt-0",
    h2: "mt-10 mb-4 font-semibold text-2xl tracking-tight first:mt-0",
    h3: "mt-8 mb-3 font-semibold text-xl tracking-tight first:mt-0",
    h4: "mt-6 mb-2 font-medium text-lg tracking-tight first:mt-0",
    h5: "mt-6 mb-2 font-medium text-base tracking-tight first:mt-0",
  },
  list: {
    ul: "my-6 ml-0 list-disc space-y-2 pl-5",
    ol: "my-6 ml-0 list-decimal space-y-2 pl-5",
    listitem: "leading-7",
    nested: {
      listitem: "list-none",
    },
  },
  quote:
    "my-6 border-border border-l-2 pl-4 text-muted-foreground italic leading-7",
};

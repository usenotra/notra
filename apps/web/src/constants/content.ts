import type { BundledTheme } from "shiki";

export const ARTICLE_CLASS_NAME =
  "prose prose-neutral dark:prose-invert prose-figcaption:text-center prose-img:rounded-xl prose-headings:font-sans prose-headings:font-semibold prose-p:font-sans prose-a:text-primary prose-li:text-foreground/80 prose-p:text-foreground/80 prose-strong:text-foreground prose-p:leading-7 prose-headings:tracking-tight prose-a:no-underline prose-code:before:content-none prose-code:after:content-none prose-a:hover:underline mt-8 max-w-none";

export const CODE_THEMES = {
  light: "github-light",
  dark: "github-dark",
} satisfies Record<"light" | "dark", BundledTheme>;

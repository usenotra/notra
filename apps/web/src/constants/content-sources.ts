export const CONTENT_SOURCES = import.meta.glob<string>(
  [
    "/src/content/pages/*.md",
    "/src/content/pages/features/*.md",
    "/src/content/legal/*.mdx",
    "/src/content/changelog/**/*.mdx",
  ],
  { query: "?raw", import: "default", eager: true }
);

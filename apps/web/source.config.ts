import { defineCollections, defineConfig } from "fumadocs-mdx/config";
// biome-ignore lint/performance/noNamespaceImport: Zod recommended way of importing
import * as z from "zod";

import { CODE_THEMES } from "./src/constants/content";
import { postSchema } from "./src/schemas/content";

export const changelog = defineCollections({
  type: "doc",
  dir: "./src/content/changelog",
  schema: z.object({
    title: z.string(),
    date: z.string(),
    description: z.string(),
  }),
});

export const blog = defineCollections({
  type: "doc",
  dir: "./src/content/blog",
  postprocess: { includeProcessedMarkdown: { headingIds: false } },
  schema: postSchema,
});

export const notraChangelog = defineCollections({
  type: "doc",
  dir: "./src/content/notra-changelog",
  postprocess: { includeProcessedMarkdown: { headingIds: false } },
  schema: postSchema,
});

export default defineConfig({
  mdxOptions: {
    rehypeCodeOptions: {
      themes: CODE_THEMES,
    },
  },
});

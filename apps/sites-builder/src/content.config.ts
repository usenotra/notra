import { glob } from "astro/loaders";
import { defineCollection } from "astro:content";

import { params } from "./lib/params";
import { blogEntrySchema, changelogEntrySchema } from "./schemas/entries";
import { entryId } from "./utils/paths";

const blog = defineCollection({
  loader: glob({
    pattern: "**/*.{md,mdx}",
    base: `${params.workDir}/entries/blog`,
    generateId: entryId,
  }),
  schema: blogEntrySchema,
});

const changelog = defineCollection({
  loader: glob({
    pattern: "**/*.{md,mdx}",
    base: `${params.workDir}/entries/changelog`,
    generateId: entryId,
  }),
  schema: changelogEntrySchema,
});

export const collections = { blog, changelog };

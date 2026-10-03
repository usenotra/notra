import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { defineCollection } from "astro:content";

import { params } from "./lib/params";

// Frontmatter was validated strictly by the notra-sites CLI; these schemas only coerce types.
const entryId = ({ entry }: { entry: string }) =>
  entry.replace(/\.(?:mdx|md)$/, "");

const blog = defineCollection({
  loader: glob({
    pattern: "**/*.{md,mdx}",
    base: `${params.workDir}/entries/blog`,
    generateId: entryId,
  }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    author: z.union([z.string(), z.array(z.string())]).optional(),
    image: z.string().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    noindex: z.boolean().default(false),
  }),
});

const changelog = defineCollection({
  loader: glob({
    pattern: "**/*.{md,mdx}",
    base: `${params.workDir}/entries/changelog`,
    generateId: entryId,
  }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    date: z.coerce.date(),
    version: z.string().optional(),
    tags: z.array(z.string()).default([]),
    image: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog, changelog };

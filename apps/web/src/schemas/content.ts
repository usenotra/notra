import { z } from "zod";

import { BLOG_AUTHORS } from "../constants/blog-authors";

export const postSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  date: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  author: z
    .string()
    .refine(
      (slug) => BLOG_AUTHORS.some((author) => author.slug === slug),
      "Unknown author slug"
    ),
});

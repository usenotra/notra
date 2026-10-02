import { marked } from "marked";
import type { ContentEntry } from "~types/content";

export async function normalizeContentEntry(entry: ContentEntry) {
  const markdown = await entry.getText("processed");
  const slug = entry.info.path.replace(/\.mdx$/, "");

  return {
    id: slug,
    slug,
    title: entry.title,
    excerpt: entry.description,
    createdAt: entry.date,
    updatedAt: entry.updatedAt,
    markdown,
    content: await marked(markdown),
    recommendations: null,
    sourceMetadata: null,
    status: "published",
  };
}

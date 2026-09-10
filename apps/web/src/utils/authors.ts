import type { NotraAuthor, NotraBlogPost } from "~types/blog";

import { blog } from "@/../.source/server";
import { BLOG_AUTHORS } from "@/constants/blog-authors";
import { BLOG_AUTHOR_PATH } from "@/utils/constants";

export function getAuthorHref(slug: string) {
  return `${BLOG_AUTHOR_PATH}/${slug}`;
}

export async function listNotraAuthors(): Promise<NotraAuthor[]> {
  return BLOG_AUTHORS.map((author) => ({
    ...author,
    postCount: blog.filter((entry) => entry.author === author.slug).length,
  }));
}

export async function getNotraAuthorBySlug(slug: string) {
  const authors = await listNotraAuthors();
  return authors.find((author) => author.slug === slug) ?? null;
}

export function filterPostsByAuthorSlug(
  posts: NotraBlogPost[],
  slug: string
): NotraBlogPost[] {
  return posts.filter((post) =>
    post.authors.some((author) => author.slug === slug)
  );
}

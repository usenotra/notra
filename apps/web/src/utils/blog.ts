import { cache } from "react";
import type {
  BlogCardAuthor,
  BlogCardItem,
  BlogPaginationLink,
  NotraBlogPost,
  NotraBlogAuthor,
} from "~types/blog";

import { blog } from "@/../.source/server";
import { BLOG_AUTHORS } from "@/constants/blog-authors";
import { getAuthorHref } from "@/utils/authors";
import { BLOG_INDEX_PATH } from "@/utils/constants";
import { normalizeContentEntry } from "@/utils/content";

export const listNotraBlogPosts = cache(async (): Promise<NotraBlogPost[]> => {
  const posts = await Promise.all(
    blog.map(async (entry) => ({
      ...(await normalizeContentEntry(entry)),
      contentType: "blog_post",
      authors: BLOG_AUTHORS.filter((author) => author.slug === entry.author),
    }))
  );
  return posts.sort(
    (first, second) =>
      Date.parse(second.createdAt) - Date.parse(first.createdAt)
  );
});

export async function getNotraBlogPostBySlug(slug: string) {
  return (
    (await listNotraBlogPosts()).find((post) => post.slug === slug) ?? null
  );
}

function getBlogPostHref(slug: string) {
  return `${BLOG_INDEX_PATH}/${slug}`;
}

export function formatBlogDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function toBlogCardAuthor(
  author: NotraBlogAuthor | undefined
): BlogCardAuthor | null {
  if (!author) {
    return null;
  }

  return {
    name: author.name,
    image: author.image,
    slug: author.slug,
    href: getAuthorHref(author.slug),
  };
}

export function buildBlogCardItems(posts: NotraBlogPost[]): BlogCardItem[] {
  return posts.map((post) => ({
    id: post.id,
    slug: post.slug,
    title: post.title,
    description: post.excerpt,
    href: getBlogPostHref(post.slug),
    date: post.createdAt,
    author: toBlogCardAuthor(post.authors[0]),
  }));
}

function buildBlogPaginationLink(post: NotraBlogPost): BlogPaginationLink {
  return {
    slug: post.slug,
    href: getBlogPostHref(post.slug),
    title: post.title,
    author: toBlogCardAuthor(post.authors[0]),
  };
}

export async function getNotraBlogPostPagination(slug: string) {
  const posts = await listNotraBlogPosts();
  const index = posts.findIndex((post) => post.slug === slug);

  if (index === -1) {
    return { previous: null, next: null };
  }

  const olderPost = posts[index + 1] ?? null;
  const newerPost = posts[index - 1] ?? null;

  return {
    previous: olderPost ? buildBlogPaginationLink(olderPost) : null,
    next: newerPost ? buildBlogPaginationLink(newerPost) : null,
  };
}

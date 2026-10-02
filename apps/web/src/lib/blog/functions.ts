import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { filterPostsByAuthorSlug, getNotraAuthorBySlug } from "@/utils/authors";
import {
  buildBlogCardItems,
  getNotraBlogPostBySlug,
  getNotraBlogPostPagination,
  listNotraBlogPosts,
} from "@/utils/blog";
import { getReadingTimeMinutes } from "@/utils/reading-time";

export const getBlogPost = createServerFn({ method: "GET" })
  .validator(z.object({ slug: z.string() }))
  .handler(async ({ data: { slug } }) => {
    const post = await getNotraBlogPostBySlug(slug);
    if (!post) {
      throw notFound();
    }

    const pagination = await getNotraBlogPostPagination(slug);

    return {
      post,
      pagination,
      readingMinutes: getReadingTimeMinutes(post.markdown),
      path: `${slug}.mdx`,
    };
  });

export const getBlogCardItems = createServerFn({ method: "GET" }).handler(
  async () => buildBlogCardItems(await listNotraBlogPosts())
);

export const getBlogAuthorPage = createServerFn({ method: "GET" })
  .validator(z.object({ slug: z.string() }))
  .handler(async ({ data: { slug } }) => {
    const author = await getNotraAuthorBySlug(slug);
    if (!author) {
      throw notFound();
    }

    const posts = await listNotraBlogPosts();
    const authorPosts = filterPostsByAuthorSlug(posts, slug);

    return {
      author,
      postCount: authorPosts.length,
      cardItems: buildBlogCardItems(authorPosts),
    };
  });

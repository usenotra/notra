import { sanitizeMarkdownHtml } from "@notra/ai/utils/sanitize";
import { db } from "@notra/db/drizzle";
import { posts } from "@notra/db/schema";
import { and, eq } from "drizzle-orm";
import { cache } from "react";

import type { SharedContentViewModel } from "@/types/content-share";
import { isShareToken } from "@/utils/content-share";
import { isHttpImageContent } from "@/utils/image-content";

export const getUnlistedSharedContent = cache(
  async (token: string): Promise<SharedContentViewModel | null> => {
    if (!isShareToken(token)) {
      return null;
    }

    const post = await db.query.posts.findFirst({
      where: and(eq(posts.shareToken, token), eq(posts.visibility, "unlisted")),
      columns: {
        title: true,
        slug: true,
        content: true,
        markdown: true,
        contentType: true,
        createdAt: true,
        updatedAt: true,
      },
      with: {
        createdByUser: {
          columns: {
            name: true,
          },
        },
      },
    });

    if (!post) {
      return null;
    }

    const authorName = post.createdByUser?.name.trim() || null;

    const meta = {
      title: post.title,
      slug: post.slug,
      date: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
      authorName,
      contentType: post.contentType,
    };

    if (post.contentType === "image") {
      return {
        ...meta,
        bodyHtml: null,
        imageSrc: isHttpImageContent(post.content) ? post.content : null,
        text: null,
      };
    }

    if (
      post.contentType === "linkedin_post" ||
      post.contentType === "twitter_post"
    ) {
      return {
        ...meta,
        bodyHtml: null,
        imageSrc: null,
        text: (post.markdown ?? post.content).trim() || null,
      };
    }

    const bodyHtml = post.content.trim()
      ? sanitizeMarkdownHtml(post.content)
      : null;

    return {
      ...meta,
      bodyHtml,
      imageSrc: null,
      text: bodyHtml ? null : post.markdown?.trim() || null,
    };
  }
);

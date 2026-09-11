import { cache } from "react";
import type {
  ChangelogTimelineItem,
  NotraChangelogPost,
} from "~types/changelog";

import { notraChangelog } from "@/../.source/server";
import { NOTRA_CHANGELOG_INDEX_PATH } from "@/utils/constants";
import { normalizeContentEntry } from "@/utils/content";

export const listNotraChangelogPosts = cache(
  async (): Promise<NotraChangelogPost[]> => {
    const posts = await Promise.all(
      notraChangelog.map(async (entry) => ({
        ...(await normalizeContentEntry(entry)),
        contentType: "changelog",
      }))
    );
    return posts.sort(
      (first, second) =>
        Date.parse(second.createdAt) - Date.parse(first.createdAt)
    );
  }
);

export async function getNotraChangelogPostBySlug(slug: string) {
  return (
    (await listNotraChangelogPosts()).find((post) => post.slug === slug) ?? null
  );
}

export function getChangelogPostHref(slug: string) {
  return `${NOTRA_CHANGELOG_INDEX_PATH}/${slug}`;
}

export function formatChangelogDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function buildChangelogTimelineItems(
  posts: NotraChangelogPost[]
): ChangelogTimelineItem[] {
  return posts.map((post) => ({
    id: post.id,
    title: post.title,
    description: post.excerpt,
    href: getChangelogPostHref(post.slug),
    date: post.createdAt,
  }));
}

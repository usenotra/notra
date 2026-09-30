import { sanitizeMarkdownHtml } from "@notra/ai/utils/sanitize";
import { db } from "@notra/db/drizzle";
import { postCollections, posts } from "@notra/db/schema";
import { createDemoClock } from "@notra/utils/demo-clock";
import { marked } from "marked";

import { DEMO_SEED_COLLECTIONS } from "@/constants/demo-seed-content";
import type { DemoSeedContext } from "@/types/demo";
import { personalizeDemoText } from "@/utils/demo-personalize";

const POST_HOUR = 10;

export async function seedDemoContent(
  context: DemoSeedContext & { projectId: string | null }
) {
  const clock = createDemoClock(context.now, context.timeZone);
  const text = (value: string) =>
    personalizeDemoText(value, context.companyName);
  const collectionRows: (typeof postCollections.$inferInsert)[] = [];
  const postRows: (typeof posts.$inferInsert)[] = [];

  for (const collection of DEMO_SEED_COLLECTIONS) {
    const collectionId = crypto.randomUUID();
    const createdAt = clock.local({
      daysAgo: collection.daysAgo,
      hour: POST_HOUR - 1,
    });
    const contentTypes = [
      ...new Set(collection.posts.map((post) => post.contentType)),
    ];
    collectionRows.push({
      id: collectionId,
      organizationId: context.organizationId,
      projectId: context.projectId,
      source: collection.source,
      name: collection.name,
      nameSource: "user",
      contentTypes,
      expectedPostCount: collection.posts.length,
      completedPostCount: collection.posts.length,
      createdAt,
      updatedAt: createdAt,
    });

    for (const [index, post] of collection.posts.entries()) {
      const postCreatedAt = clock.local({
        daysAgo: post.daysAgo,
        hour: POST_HOUR,
        minute: index * 7,
      });
      postRows.push({
        id: crypto.randomUUID().replaceAll("-", "").slice(0, 16),
        organizationId: context.organizationId,
        collectionId,
        title: text(post.title),
        slug: post.slug ?? null,
        content: sanitizeMarkdownHtml(await marked.parse(text(post.markdown))),
        markdown: text(post.markdown),
        contentType: post.contentType,
        contentSubtype: post.contentSubtype ?? null,
        status: post.status,
        sourceMetadata: { seed: "demo" },
        createdAt: postCreatedAt,
        updatedAt: postCreatedAt,
      });
    }
  }

  await db.insert(postCollections).values(collectionRows);
  await db.insert(posts).values(postRows);
}

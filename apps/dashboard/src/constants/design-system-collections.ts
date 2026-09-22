import type { PostCollectionSummary } from "@notra/schemas/dashboard/content";

const COLLECTION_NAMES = [
  "Weekly product changelog",
  "AI traffic digest",
  "Launch announcement",
  "Customer stories",
  "Docs refresh",
  "Pricing update",
] as const;

export const DESIGN_SYSTEM_COLLECTIONS: PostCollectionSummary[] = Array.from(
  { length: 24 },
  (_, index) => {
    const published = (index % 5) + 1;
    return {
      id: `demo-collection-${index + 1}`,
      name: `${COLLECTION_NAMES[index % COLLECTION_NAMES.length] ?? "Collection"} ${index + 1}`,
      source: index % 2 === 0 ? "schedule" : "chat",
      nameSource: "generated",
      contentTypes:
        index % 4 === 0 ? ["blog_post", "changelog"] : ["blog_post"],
      postCount: published,
      singlePost: null,
      expectedPostCount: null,
      isGenerating: false,
      statusSummary: {
        total: published,
        draft: 0,
        published,
      },
      createdAt: new Date(Date.UTC(2026, 8, 1 + index)).toISOString(),
    };
  }
);

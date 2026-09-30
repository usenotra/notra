import type { PostCollectionSummary } from "@notra/schemas/dashboard/content";

export const SINGLE_POST_COLLECTION: PostCollectionSummary = {
  id: "collection-42",
  name: "Blog post - September 20th 2026",
  source: "manual",
  nameSource: "generated",
  contentTypes: ["blog_post"],
  postCount: 1,
  singlePost: { id: "post-17", title: "A quieter way to work" },
  expectedPostCount: 1,
  isGenerating: false,
  statusSummary: { total: 1, draft: 1, published: 0 },
  createdAt: "2026-09-20T10:00:00.000Z",
};

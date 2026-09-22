import { describe, expect, test } from "bun:test";

import { postCollectionSummarySchema } from "@notra/schemas/dashboard/content";

import {
  collectionHref,
  collectionMeta,
  collectionStatus,
  collectionTitle,
} from "@/utils/content-collections";

import { SINGLE_POST_COLLECTION } from "./constants/content-collections";

describe("content overview destinations", () => {
  test("a finished single post uses its post ID and title, not the collection's", () => {
    const collection = postCollectionSummarySchema.parse(
      SINGLE_POST_COLLECTION
    );
    expect(collectionHref("acme", collection)).toBe("/acme/content/post-17");
    expect(collectionTitle(collection)).toBe("A quieter way to work");
    expect(collectionMeta(collection)).toBe("Manual · Single post");
  });

  test("a partially generated batch stays a collection even when one post is ready", () => {
    const collection = {
      ...SINGLE_POST_COLLECTION,
      isGenerating: true,
      expectedPostCount: 3,
    };
    expect(collectionHref("acme", collection)).toBe(
      "/acme/collection/collection-42"
    );
    expect(collectionTitle(collection)).toBe("Blog post - September 20th 2026");
    expect(collectionStatus(collection)).toBe("generating");
    expect(collectionMeta(collection)).toBe("Manual · 1 of 3 posts ready");
  });

  test.each([0, 2])("%i posts open the collection", (postCount) => {
    const collection = {
      ...SINGLE_POST_COLLECTION,
      postCount,
      singlePost: null,
    };
    expect(collectionHref("another-org", collection)).toBe(
      "/another-org/collection/collection-42"
    );
    expect(collectionTitle(collection)).toBe("Blog post - September 20th 2026");
  });

  test("missing single-post metadata falls back to a usable collection link", () => {
    const collection = { ...SINGLE_POST_COLLECTION, singlePost: null };
    expect(collectionHref("acme", collection)).toBe(
      "/acme/collection/collection-42"
    );
    expect(collectionTitle(collection)).toBe("Blog post - September 20th 2026");
  });
});

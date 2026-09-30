import type { PostPublishedInput } from "../types/posts";

export const postPublishedInput = (input: PostPublishedInput) =>
  ({
    organizationId: input.organizationId,
    sourceKey: `post:${input.postId}:published`,
    event: {
      type: "post.published",
      data: { postId: input.postId },
    },
  }) as const;

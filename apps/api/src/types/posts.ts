import type { ContentGenerationJob } from "@notra/content-generation/schemas";
import type { posts } from "@notra/db/schema";
import type {
  createPostGenerationRequestSchema,
  getPostsOpenApiQuerySchema,
  patchPostRequestSchema,
} from "@notra/schemas/api/content";
import type { Redis } from "@upstash/redis";
import type { z } from "zod";

import type {
  PostGenerationJobNotFoundError,
  PostGenerationQueueFailedError,
  PostInvalidMarkdownError,
  PostNotFoundError,
  PostSlugDuplicateError,
  PostSlugNotSupportedError,
} from "../errors/posts";
import type { DbClient } from "./db";

export type PostRow = Pick<
  typeof posts.$inferSelect,
  | "id"
  | "title"
  | "slug"
  | "content"
  | "htmlUrl"
  | "markdown"
  | "recommendations"
  | "contentType"
  | "sourceMetadata"
  | "status"
  | "createdAt"
  | "updatedAt"
>;

export type PostDomainError =
  | PostNotFoundError
  | PostSlugNotSupportedError
  | PostInvalidMarkdownError
  | PostSlugDuplicateError
  | PostGenerationJobNotFoundError
  | PostGenerationQueueFailedError;

interface PostProgramInput {
  db: DbClient;
  organizationId: string;
}

export interface ListPostsProgramInput extends PostProgramInput {
  query: z.infer<typeof getPostsOpenApiQuerySchema>;
}

export interface ListPostsProgramSuccess {
  posts: PostRow[];
  pagination: {
    limit: number;
    currentPage: number;
    nextPage: number | null;
    previousPage: number | null;
    totalPages: number;
    totalItems: number;
  };
}

export interface GetPostProgramInput extends PostProgramInput {
  postId: string;
}

export interface GetPostProgramSuccess {
  post: PostRow | null;
}

export interface DeletePostProgramInput extends PostProgramInput {
  postId: string;
}

export interface DeletePostProgramSuccess {
  id: string;
}

export interface PatchPostProgramInput extends PostProgramInput {
  postId: string;
  body: z.infer<typeof patchPostRequestSchema>;
}

export interface PatchPostProgramSuccess {
  post: PostRow;
  previousStatus: "draft" | "published";
}

export interface CreatePostGenerationProgramInput extends PostProgramInput {
  body: z.infer<typeof createPostGenerationRequestSchema>;
  redis: Redis;
  runtimeEnv: {
    WORKFLOW_BASE_URL?: string;
  };
  repositoryIds: string[] | undefined;
  linearIntegrationIds: string[] | undefined;
  resolvedBrandVoiceId: string | null;
}

export interface CreatePostGenerationProgramSuccess {
  job: ContentGenerationJob;
}

export interface GetPostGenerationProgramInput {
  organizationId: string;
  jobId: string;
  redis: Redis;
}

export interface GetPostGenerationProgramSuccess {
  job: ContentGenerationJob;
  events: Awaited<
    ReturnType<
      typeof import("@notra/content-generation/jobs").listContentGenerationJobEvents
    >
  >;
}

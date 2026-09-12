import { Schema } from "effect";

export class PostNotFoundError extends Schema.TaggedError<PostNotFoundError>()(
  "PostNotFoundError",
  {}
) {}

export class PostSlugNotSupportedError extends Schema.TaggedError<PostSlugNotSupportedError>()(
  "PostSlugNotSupportedError",
  {}
) {}

export class PostInvalidMarkdownError extends Schema.TaggedError<PostInvalidMarkdownError>()(
  "PostInvalidMarkdownError",
  {}
) {}

export class PostSlugDuplicateError extends Schema.TaggedError<PostSlugDuplicateError>()(
  "PostSlugDuplicateError",
  {}
) {}

export class PostGenerationJobNotFoundError extends Schema.TaggedError<PostGenerationJobNotFoundError>()(
  "PostGenerationJobNotFoundError",
  {}
) {}

export class PostGenerationQueueFailedError extends Schema.TaggedError<PostGenerationQueueFailedError>()(
  "PostGenerationQueueFailedError",
  { jobId: Schema.optional(Schema.String) }
) {}

export class PostDatabaseError extends Schema.TaggedError<PostDatabaseError>()(
  "PostDatabaseError",
  { cause: Schema.Defect() }
) {}

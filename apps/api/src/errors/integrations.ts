import { Schema } from "effect";

export class IntegrationNotFoundError extends Schema.TaggedError<IntegrationNotFoundError>()(
  "IntegrationNotFoundError",
  {}
) {}

export class IntegrationDuplicateError extends Schema.TaggedError<IntegrationDuplicateError>()(
  "IntegrationDuplicateError",
  {}
) {}

export class GitHubAccessError extends Schema.TaggedError<GitHubAccessError>()(
  "GitHubAccessError",
  { message: Schema.String }
) {}

export class IntegrationUnavailableError extends Schema.TaggedError<IntegrationUnavailableError>()(
  "IntegrationUnavailableError",
  {}
) {}

export class IntegrationCreateFailedError extends Schema.TaggedError<IntegrationCreateFailedError>()(
  "IntegrationCreateFailedError",
  {}
) {}

export class IntegrationCreateError extends Schema.TaggedError<IntegrationCreateError>()(
  "IntegrationCreateError",
  { cause: Schema.Defect() }
) {}

export class IntegrationDatabaseError extends Schema.TaggedError<IntegrationDatabaseError>()(
  "IntegrationDatabaseError",
  { cause: Schema.Defect() }
) {}

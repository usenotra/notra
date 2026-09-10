import { Schema } from "effect";

export class GitHubAppRequiredForPublishError extends Schema.TaggedError<GitHubAppRequiredForPublishError>()(
  "GitHubAppRequiredForPublishError",
  { organizationId: Schema.String }
) {
  readonly status = 401;

  override get message() {
    return "Connect the GitHub App so Notra can open pull requests as a bot";
  }
}

export class GitHubPersistenceError extends Schema.TaggedError<GitHubPersistenceError>()(
  "GitHubPersistenceError",
  { operation: Schema.String, cause: Schema.Defect() }
) {}

export class GitHubRequestError extends Schema.TaggedError<GitHubRequestError>()(
  "GitHubRequestError",
  {
    operation: Schema.String,
    status: Schema.optional(Schema.Number),
    cause: Schema.Defect(),
  }
) {}

export class GitHubAppConfigurationError extends Schema.TaggedError<GitHubAppConfigurationError>()(
  "GitHubAppConfigurationError",
  { cause: Schema.Defect() }
) {
  override get message() {
    return "The server could not authenticate the GitHub App";
  }
}

export class GitHubInstallationMissingError extends Schema.TaggedError<GitHubInstallationMissingError>()(
  "GitHubInstallationMissingError",
  { organizationId: Schema.String }
) {
  readonly status = 404;

  override get message() {
    return "GitHub App installation not found";
  }
}

export class GitHubRepositoryUnavailableError extends Schema.TaggedError<GitHubRepositoryUnavailableError>()(
  "GitHubRepositoryUnavailableError",
  { repositoryId: Schema.String }
) {
  override get message() {
    return "Selected repository is not available to this installation";
  }
}

export class GitHubRepositoryConflictError extends Schema.TaggedError<GitHubRepositoryConflictError>()(
  "GitHubRepositoryConflictError",
  { repository: Schema.String }
) {
  override get message() {
    return `Repository ${this.repository} is already connected to a different GitHub repository`;
  }
}

export class GitHubCredentialsMissingError extends Schema.TaggedError<GitHubCredentialsMissingError>()(
  "GitHubCredentialsMissingError",
  { integrationId: Schema.String }
) {
  override get message() {
    return "GitHub repository credentials are missing";
  }
}

export class GitHubCredentialDecryptionError extends Schema.TaggedError<GitHubCredentialDecryptionError>()(
  "GitHubCredentialDecryptionError",
  { integrationId: Schema.String, cause: Schema.Defect() }
) {
  override get message() {
    return "The server could not decrypt the saved GitHub credential";
  }
}

export class GitHubRepositoryCacheError extends Schema.TaggedError<GitHubRepositoryCacheError>()(
  "GitHubRepositoryCacheError",
  { operation: Schema.String, cause: Schema.Defect() }
) {}

export class GitHubResponseError extends Schema.TaggedError<GitHubResponseError>()(
  "GitHubResponseError",
  { operation: Schema.String, cause: Schema.Defect() }
) {}

import type { SiteInputField } from "./types/sites";

export class SitesNotConfiguredError extends Error {
  readonly name = "SitesNotConfiguredError";
}

export class SiteInputError extends Error {
  readonly name = "SiteInputError";
  readonly field: SiteInputField | null;

  constructor(message: string, options?: { field?: SiteInputField }) {
    super(message);
    this.field = options?.field ?? null;
  }
}

export class SiteNotBuildableError extends Error {
  readonly name = "SiteNotBuildableError";
}

export class SitePublishConflictError extends Error {
  readonly name = "SitePublishConflictError";
  readonly paths: string[];

  constructor(paths: string[], message: string) {
    super(message);
    this.paths = paths;
  }
}

export class SiteHostConflictError extends Error {
  readonly name = "SiteHostConflictError";
}

export class R2PreconditionFailedError extends Error {
  readonly name = "R2PreconditionFailedError";
}

export class SitePermanentBuildError extends Error {
  readonly name = "SitePermanentBuildError";
}

export class UnsafeArchiveError extends SitePermanentBuildError {}

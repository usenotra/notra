import {
  SiteHostConflictError,
  SiteInputError,
  SiteNotBuildableError,
  SitePermanentBuildError,
  SitePublishConflictError,
  SitesNotConfiguredError,
} from "@notra/sites-server/errors";

import {
  badRequest,
  conflict,
  serviceUnavailable,
} from "@/lib/orpc/utils/errors";

export function toSitesOrpcError(error: unknown): unknown {
  if (error instanceof SiteInputError) {
    return badRequest(
      error.message,
      error.field ? { field: error.field } : undefined
    );
  }
  if (
    error instanceof SitePermanentBuildError ||
    error instanceof SiteNotBuildableError
  ) {
    return badRequest(error.message);
  }
  if (error instanceof SitePublishConflictError) {
    return conflict(error.message, { paths: error.paths });
  }
  if (error instanceof SiteHostConflictError) {
    return conflict(error.message);
  }
  if (error instanceof SitesNotConfiguredError) {
    return serviceUnavailable(
      `Notra Sites is not configured on this environment: ${error.message}`
    );
  }
  return error;
}

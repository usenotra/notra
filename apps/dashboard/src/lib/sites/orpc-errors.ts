import { SiteNotBuildableError } from "@notra/sites-server/deployments";
import { SitePublishConflictError } from "@notra/sites-server/editor";
import { SitesNotConfiguredError } from "@notra/sites-server/env";
import { SitePermanentBuildError } from "@notra/sites-server/errors";
import { SiteInputError } from "@notra/sites-server/sites";
import { SiteHostConflictError } from "@notra/sites-server/state";

import {
  badRequest,
  conflict,
  serviceUnavailable,
} from "@/lib/orpc/utils/errors";

/** Maps Notra Sites domain errors to what the dashboard shows; anything else stays a 500. */
export function toSitesOrpcError(error: unknown): unknown {
  if (
    error instanceof SiteInputError ||
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

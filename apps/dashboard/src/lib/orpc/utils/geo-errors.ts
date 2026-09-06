import type { GeoRouterError } from "@notra/geo-core/geo/errors";

import { toUnexpectedError } from "@/lib/orpc/effect";
import {
  badRequest,
  conflict,
  notFound,
  paymentRequired,
} from "@/lib/orpc/utils/errors";

export function toGeoOrpcError(failure: GeoRouterError): Error {
  switch (failure._tag) {
    case "GeoPromptDuplicateError":
      return badRequest("This prompt is already tracked");
    case "GeoPromptNotFoundError":
      return notFound("Prompt not found");
    case "GeoProjectNotFoundError":
      return notFound("Project not found");
    case "GeoProjectCreateFailedError":
      return badRequest("Failed to create project");
    case "GeoProjectDeleteBlockedError":
      return badRequest(
        "You cannot delete your last project. Create another one first."
      );
    case "GeoBrandIdentityNotFoundError":
      return notFound("Brand identity not found");
    case "GeoBrandIdentityMissingError":
      return badRequest("Create a brand identity first");
    case "GeoSequenceNotFoundError":
      return notFound("Conversation not found");
    case "GeoSequenceRunUnavailableError":
      return badRequest(
        "No search-grounded engines are available under your privacy settings"
      );
    case "GeoSequenceRunError":
      console.error("[GEO] conversation run failed:", failure);
      return badRequest(failure.message);
    case "GeoSequenceCreateFailedError":
      return badRequest("Failed to create conversation");
    case "GeoCompetitorLimitError":
      return badRequest(
        `You can track up to ${failure.limit} competitors. Remove some before importing more.`
      );
    case "GeoSettingsMissingError":
      return badRequest("Configure your brand tracking settings first");
    case "GeoSettingsDisabledError":
      return badRequest("Enable brand tracking before starting a scan");
    case "GeoSettingsTrackingError":
      return badRequest(failure.message);
    case "GeoSampleDataDisabledError":
      return notFound();
    case "GeoDiscoveryError":
      console.error("[GEO] website discovery failed:", failure);
      return badRequest(failure.message);
    case "GeoScanStartError":
      return toUnexpectedError(failure.cause, "Failed to start the scan");
    case "GeoScanAlreadyRunningError":
      return badRequest("A scan is already running for this project");
    case "GeoScanEnginesEmptyError":
      return badRequest("Select at least one tracked engine to scan");
    case "GeoWriterCreditsExhaustedError":
      return paymentRequired(failure.message);
    case "GeoContentBriefNotFoundError":
      return notFound("Brief not found");
    case "GeoContentBriefStateError":
      return badRequest(
        `This brief is already ${failure.status}. Start a new one.`
      );
    case "GeoContentBriefConflictError":
      return conflict(
        "This plan changed while it was being saved. Try again.",
        {
          updatedAt: failure.updatedAt,
        }
      );
    case "GeoWriterPlanError":
      console.error("[GEO] writer planning failed:", failure);
      return badRequest(failure.message);
    case "GeoWriterStartError":
      return toUnexpectedError(failure.cause, "Failed to start the writer");
    default:
      return toUnexpectedError(failure.cause, `[GEO] ${failure.label}`);
  }
}

import type { GeoRouterError } from "@notra/geo-core/geo/errors";

import { getTranslations } from "@/lib/i18n/server";
import { toUnexpectedError } from "@/lib/orpc/effect";
import {
  badRequest,
  conflict,
  notFound,
  paymentRequired,
} from "@/lib/orpc/utils/errors";

export async function toGeoOrpcError(failure: GeoRouterError): Promise<Error> {
  const tErrors = await getTranslations("errors.geo");
  const tCommon = await getTranslations("common");
  switch (failure._tag) {
    case "GeoSuggestionNotFoundError":
      return notFound("Suggestion not found");
    case "GeoPromptDuplicateError":
      return badRequest(tErrors("promptAlreadyTracked"));
    case "GeoPromptNotFoundError":
      return notFound("Prompt not found");
    case "GeoProjectNotFoundError":
      return notFound("Project not found");
    case "GeoProjectCreateFailedError":
      return badRequest(tCommon("labels.failedToCreateProject"));
    case "GeoProjectDeleteBlockedError":
      return badRequest(tErrors("lastProjectDelete"));
    case "GeoBrandIdentityNotFoundError":
      return notFound("Brand identity not found");
    case "GeoBrandIdentityMissingError":
      return badRequest(tErrors("createBrandIdentityFirst"));
    case "GeoSequenceNotFoundError":
      return notFound("Conversation not found");
    case "GeoSequenceRunUnavailableError":
      return badRequest(tErrors("noGroundedEngines"));
    case "GeoSequenceRunError":
      console.error("[GEO] conversation run failed:", failure);
      return badRequest(tErrors("conversationRunFailed"));
    case "GeoSequenceCreateFailedError":
      return badRequest(tErrors("createConversationFailed"));
    case "GeoSequenceLimitError":
      return badRequest(tErrors("conversationLimit", { limit: failure.limit }));
    case "GeoPersonaNotFoundError":
      return notFound("Persona not found");
    case "GeoPersonaLimitError":
      return badRequest(tErrors("personaLimit", { limit: failure.limit }));
    case "GeoPersonaGenerateError":
      console.error("[GEO] persona generation failed:", failure);
      return badRequest(
        (await getTranslations("geo.toasts"))("personaGenerationFailed")
      );
    case "GeoPersonaRunUnavailableError":
      return badRequest(tErrors("noGroundedEngines"));
    case "GeoPersonaRunError":
      console.error("[GEO] persona run failed:", failure);
      return badRequest(tErrors("personaRunFailed"));
    case "GeoCompetitorLimitError":
      return badRequest(tErrors("competitorLimit", { limit: failure.limit }));
    case "GeoSettingsMissingError":
      return badRequest(tErrors("configureTrackingFirst"));
    case "GeoSettingsDisabledError":
      return badRequest(tErrors("enableTrackingFirst"));
    case "GeoSettingsTrackingError":
      return badRequest(tErrors("trackingSettingsRejected"));
    case "GeoPromptTranslationError":
      switch (failure.reason) {
        case "limit":
          return badRequest(
            tErrors("translationLimit", { limit: failure.limit ?? 0 })
          );
        case "last":
          return badRequest(tErrors("translationLast"));
        case "unavailable":
          return badRequest(tErrors("translationDeferred"));
        default:
          return badRequest(tErrors("translationUnavailable"));
      }
    case "GeoSampleDataDisabledError":
      return notFound();
    case "GeoDiscoveryError":
      console.error("[GEO] website discovery failed:", failure);
      return badRequest(tErrors("websiteDiscoveryFailed"));
    case "GeoScanStartError":
      return toUnexpectedError(failure.cause, "Failed to start the scan");
    case "GeoScanAlreadyRunningError":
      return badRequest(tErrors("scanAlreadyRunning"));
    case "GeoScanEnginesEmptyError":
      return badRequest(tErrors("selectModel"));
    case "GeoWriterCreditsExhaustedError":
      return paymentRequired(
        (await getTranslations("errors.billing"))("contentLimitReached")
      );
    case "GeoContentBriefNotFoundError":
      return notFound("Brief not found");
    case "GeoContentBriefStateError":
      return badRequest(
        tErrors("briefStateLocked", { status: failure.status })
      );
    case "GeoContentBriefConflictError":
      return conflict(tErrors("planChanged"), {
        updatedAt: failure.updatedAt,
      });
    case "GeoWriterPlanError":
      console.error("[GEO] writer planning failed:", failure);
      return badRequest(tErrors("writerPlanFailed"));
    case "GeoWriterStartError":
      return toUnexpectedError(failure.cause, "Failed to start the writer");
    default:
      return toUnexpectedError(failure.cause, `[GEO] ${failure.label}`);
  }
}

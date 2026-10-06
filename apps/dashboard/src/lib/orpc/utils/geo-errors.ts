import { logError } from "@notra/ai/utils/server-log";
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
  const t = await getTranslations();
  switch (failure._tag) {
    case "GeoSuggestionNotFoundError":
      return notFound("Suggestion not found");
    case "GeoPromptDuplicateError":
      return badRequest(t("errors.geo.promptAlreadyTracked"));
    case "GeoPromptNotFoundError":
      return notFound("Prompt not found");
    case "GeoProjectNotFoundError":
      return notFound("Project not found");
    case "GeoProjectCreateFailedError":
      return badRequest(t("common.labels.failedToCreateProject"));
    case "GeoProjectDeleteBlockedError":
      return badRequest(t("errors.geo.lastProjectDelete"));
    case "GeoBrandIdentityNotFoundError":
      return notFound("Brand identity not found");
    case "GeoBrandIdentityMissingError":
      return badRequest(t("errors.geo.createBrandIdentityFirst"));
    case "GeoSequenceNotFoundError":
      return notFound("Conversation not found");
    case "GeoSequenceRunUnavailableError":
      return badRequest(t("errors.geo.noGroundedEngines"));
    case "GeoSequenceRunError":
      logError("[GEO] conversation run failed", failure);
      return badRequest(t("errors.geo.conversationRunFailed"));
    case "GeoSequenceCreateFailedError":
      return badRequest(t("errors.geo.createConversationFailed"));
    case "GeoSequenceLimitError":
      return badRequest(
        t("errors.geo.conversationLimit", { limit: failure.limit })
      );
    case "GeoPersonaNotFoundError":
      return notFound("Persona not found");
    case "GeoPersonaLimitError":
      return badRequest(t("errors.geo.personaLimit", { limit: failure.limit }));
    case "GeoPersonaGenerateError":
      logError("[GEO] persona generation failed", failure);
      return badRequest(t("geo.toasts.personaGenerationFailed"));
    case "GeoPersonaRunUnavailableError":
      return badRequest(t("errors.geo.noGroundedEngines"));
    case "GeoPersonaRunError":
      logError("[GEO] persona run failed", failure);
      return badRequest(t("errors.geo.personaRunFailed"));
    case "GeoCompetitorLimitError":
      return badRequest(
        t("errors.geo.competitorLimit", { limit: failure.limit })
      );
    case "GeoSettingsMissingError":
      return badRequest(t("errors.geo.configureTrackingFirst"));
    case "GeoSettingsDisabledError":
      return badRequest(t("errors.geo.enableTrackingFirst"));
    case "GeoSettingsTrackingError":
      return badRequest(t("errors.geo.trackingSettingsRejected"));
    case "GeoPromptTranslationError":
      switch (failure.reason) {
        case "limit":
          return badRequest(
            t("errors.geo.translationLimit", { limit: failure.limit ?? 0 })
          );
        case "last":
          return badRequest(t("errors.geo.translationLast"));
        case "unavailable":
          return badRequest(t("errors.geo.translationDeferred"));
        default:
          return badRequest(t("errors.geo.translationUnavailable"));
      }
    case "GeoSampleDataDisabledError":
      return notFound();
    case "GeoDiscoveryError":
      logError("[GEO] website discovery failed", failure);
      return badRequest(t("errors.geo.websiteDiscoveryFailed"));
    case "GeoScanStartError":
      return toUnexpectedError(failure.cause, "Failed to start the scan");
    case "GeoScanAlreadyRunningError":
      return badRequest(t("errors.geo.scanAlreadyRunning"));
    case "GeoScanEnginesEmptyError":
      return badRequest(t("errors.geo.selectModel"));
    case "GeoWriterCreditsExhaustedError":
      return paymentRequired(t("errors.billing.contentLimitReached"));
    case "GeoContentBriefNotFoundError":
      return notFound("Brief not found");
    case "GeoContentBriefStateError":
      return badRequest(
        t("errors.geo.briefStateLocked", { status: failure.status })
      );
    case "GeoContentBriefConflictError":
      return conflict(t("errors.geo.planChanged"), {
        updatedAt: failure.updatedAt,
      });
    case "GeoWriterPlanError":
      logError("[GEO] writer planning failed", failure);
      return badRequest(t("errors.geo.writerPlanFailed"));
    case "GeoWriterStartError":
      return toUnexpectedError(failure.cause, "Failed to start the writer");
    default:
      return toUnexpectedError(failure.cause, `[GEO] ${failure.label}`);
  }
}

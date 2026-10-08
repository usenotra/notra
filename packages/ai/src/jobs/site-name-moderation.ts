import {
  SITE_NAME_IMPERSONATION_THRESHOLD,
  SITE_NAME_MODERATION_FEATURE,
  SITE_NAME_MODERATION_TIMEOUT_MS,
  SITE_NAME_OFFENSIVE_THRESHOLD,
  SITE_NAME_MODERATION_QUESTIONS,
} from "@notra/ai/constants/site-name-moderation";
import { getEvaluationClient } from "@notra/ai/evaluation/client";
import { log } from "@notra/ai/evlog";
import type {
  ModerateSiteNameParams,
  SiteNameModerationVerdict,
} from "@notra/ai/types/site-name-moderation";

export async function moderateSiteName(
  params: ModerateSiteNameParams
): Promise<SiteNameModerationVerdict> {
  const result = await getEvaluationClient().tryEvaluate({
    feature: SITE_NAME_MODERATION_FEATURE,
    organizationId: params.organizationId,
    state: {
      organizationName: params.organizationName,
      siteName: params.name,
      siteAddress: params.address,
    },
    questions: SITE_NAME_MODERATION_QUESTIONS,
    timeoutMs: SITE_NAME_MODERATION_TIMEOUT_MS,
  });
  if (!result) {
    log.warn({
      event: "sites.name_moderation_skipped",
      organizationId: params.organizationId,
    });
    return null;
  }
  const { offensive, impersonation } = result.answers;
  if (offensive.probability >= SITE_NAME_OFFENSIVE_THRESHOLD) {
    return "offensive";
  }
  if (impersonation.probability >= SITE_NAME_IMPERSONATION_THRESHOLD) {
    return "impersonation";
  }
  return null;
}

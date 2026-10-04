import { publicWebsiteUrlSchema } from "@notra/geo-core/schemas/url";
import { PublicUrlValidationError } from "@notra/utils/url";
import { assertPublicWebsiteUrlResolution } from "@notra/utils/website-url";
import { ORPCError } from "@orpc/server";

import { getTranslations } from "@/lib/i18n/server";

import { ratelimit } from "./ratelimit";

export async function validateOnboardingWebsite(
  url: string,
  userId: string
): Promise<string> {
  const { success } = await ratelimit.onboardingWebsiteCheck.limit(userId);
  if (!success) {
    const t = await getTranslations("errors.integrations");
    throw new ORPCError("TOO_MANY_REQUESTS", {
      message: t("tooManyConnectionAttempts"),
    });
  }
  return validateWebsiteUrl(url);
}

export async function validateWebsiteUrl(rawUrl: string): Promise<string> {
  const parsed = publicWebsiteUrlSchema.safeParse(rawUrl);
  if (!parsed.success) {
    const t = await getTranslations("errors.integrations");
    throw new ORPCError("BAD_REQUEST", { message: t("publicUrlInvalid") });
  }
  try {
    await assertPublicWebsiteUrlResolution(parsed.data);
  } catch (error) {
    if (!(error instanceof PublicUrlValidationError)) {
      throw error;
    }
    const t = await getTranslations("errors.integrations");
    let message = t("publicUrlInvalid");
    if (error.reason === "temporary") {
      message = t("websiteDnsUnavailable");
    } else if (error.reason === "not_found") {
      message = t("websiteDomainNotFound");
    }
    throw new ORPCError(
      error.reason === "temporary" ? "SERVICE_UNAVAILABLE" : "BAD_REQUEST",
      {
        message,
      }
    );
  }
  return new URL(parsed.data).href;
}

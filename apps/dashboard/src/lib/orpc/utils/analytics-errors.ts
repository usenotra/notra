import { getTranslations } from "next-intl/server";

import type { AnalyticsRouterError } from "@/lib/analytics/errors";
import { toUnexpectedError } from "@/lib/orpc/effect";
import { badRequest, notFound } from "@/lib/orpc/utils/errors";

export async function toAnalyticsOrpcError(
  failure: AnalyticsRouterError
): Promise<Error> {
  const tErrors = await getTranslations("errors.analytics");
  switch (failure._tag) {
    case "AnalyticsAccountNotFoundError":
      return badRequest(
        tErrors("xAccountNotFound", { username: failure.username })
      );
    case "TrackedAccountNotFoundError":
      return notFound("Tracked account not found");
    default:
      return toUnexpectedError(failure.cause, `[Analytics] ${failure.label}`);
  }
}

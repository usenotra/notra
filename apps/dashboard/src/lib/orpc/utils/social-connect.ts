import { Effect } from "effect";
import { getTranslations } from "next-intl/server";

import {
  SOCIAL_DUPLICATE_CONTENT_CODE,
  SOCIAL_DUPLICATE_CONTENT_REGEX,
} from "@/constants/social-connect";
import {
  badRequest,
  paymentRequired,
  serviceUnavailable,
} from "@/lib/orpc/utils/errors";
import {
  getSocialConnectStatusCode,
  type SocialConnectConfigError,
  type SocialConnectRequestError,
} from "@/lib/social-connect/errors";

type SocialConnectFailure =
  | SocialConnectConfigError
  | SocialConnectRequestError;

interface RunSocialConnectOptions {
  logLabel: string;
  reconnectHint?: boolean;
}

export async function runSocialConnect<A>(
  effect: Effect.Effect<A, SocialConnectFailure>,
  options: RunSocialConnectOptions
): Promise<A> {
  const result = await Effect.runPromise(
    effect.pipe(
      Effect.map((value) => ({ ok: true as const, value })),
      Effect.catch((error) => Effect.succeed({ ok: false as const, error }))
    )
  );

  if (result.ok) {
    return result.value;
  }

  const { error } = result;
  if (error._tag === "SocialConnectConfigError") {
    const tCommonErrors = await getTranslations("common.errors");
    throw serviceUnavailable(tCommonErrors("generic"));
  }

  console.error(`${options.logLabel}:`, error);
  const statusCode = getSocialConnectStatusCode(error.cause);

  if (options.reconnectHint && (statusCode === 401 || statusCode === 403)) {
    const tErrors = await getTranslations("errors.socialAccounts");
    throw badRequest(tErrors("notAuthorizedToPost"), {
      code: "reconnect_required",
    });
  }
  const tErrors = await getTranslations("errors.socialAccounts");
  const providerMessage =
    error.cause instanceof Error ? error.cause.message : error.message;
  if (SOCIAL_DUPLICATE_CONTENT_REGEX.test(providerMessage)) {
    throw badRequest(tErrors("duplicateContent"), {
      code: SOCIAL_DUPLICATE_CONTENT_CODE,
    });
  }
  if (statusCode === 402) {
    throw paymentRequired(tErrors("requestRejected"));
  }
  if (statusCode !== null && statusCode >= 400 && statusCode < 500) {
    throw badRequest(tErrors("requestRejected"));
  }
  throw serviceUnavailable(tErrors("serviceUnavailable"));
}

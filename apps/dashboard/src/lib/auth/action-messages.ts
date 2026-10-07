import { getTranslations } from "@/lib/i18n/server";
import type { AuthActionMessageKey } from "@/types/auth/action-messages";
import type { WorkOSErrorInfo } from "@/types/auth/workos-error";

export async function authActionMessage(
  key: AuthActionMessageKey
): Promise<string> {
  if (key === "rateLimited") {
    const tShared = await getTranslations("errors.shared");
    return tShared("tooManyAttemptsPleaseTry");
  }
  if (key === "invalidInput") {
    const tActions = await getTranslations("errors.actions");
    return tActions("invalidInput");
  }
  const t = await getTranslations("errors.actions.auth");
  return t(key);
}

export async function emailUnverifiedMessage(): Promise<string> {
  const t = await getTranslations("errors.actions.auth");
  return t("emailUnverified");
}

export async function workOSFailureMessage(
  info: WorkOSErrorInfo
): Promise<string> {
  const t = await getTranslations("errors.actions.auth");
  switch (info.code) {
    case "invalid_credentials":
      return t("invalidCredentials");
    case "invalid_one_time_code":
    case "authentication_challenge_invalid":
      return t("invalidCode");
    case "invalid_grant":
      return t("attemptExpired");
    case "password_strength_error":
      return t("weakPassword");
    case "email_not_available":
    case "user_exists":
      return t("emailTaken");
    case "sso_required":
    case "organization_authentication_methods_required":
      return t("differentMethodRequired");
    default: {
      const tCommon = await getTranslations("common.errors");
      return tCommon("generic");
    }
  }
}

import { getRequestHeader } from "@tanstack/react-start/server";
import type { Messages, NamespaceKeys, NestedKeyOf } from "use-intl";
import { createTranslator } from "use-intl/core";

import { getAuthIdentity } from "@/lib/auth/server";
import { readLocaleCookie } from "@/lib/i18n/locale-cookie";
import { isDashboardLocale, negotiateDashboardLocale } from "@/utils/i18n";

export async function getLocale() {
  const preference = await readLocaleCookie();
  if (preference) {
    return preference;
  }
  if (preference === undefined) {
    const identity = await getAuthIdentity();
    if (isDashboardLocale(identity?.user.locale)) {
      return identity.user.locale;
    }
  }
  return negotiateDashboardLocale(getRequestHeader("accept-language") ?? null);
}

export async function getMessages() {
  const locale = await getLocale();
  return locale === "de"
    ? (await import("../../../messages/de.json")).default
    : (await import("../../../messages/en.json")).default;
}

export async function getTranslations<
  Namespace extends NamespaceKeys<Messages, NestedKeyOf<Messages>> = never,
>(namespace?: Namespace) {
  const locale = await getLocale();
  const messages: Messages = await getMessages();
  return createTranslator<Messages, Namespace>({ locale, messages, namespace });
}

import {
  deleteCookie,
  getCookie,
  setCookie,
} from "@tanstack/react-start/server";

import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE } from "@/constants/cookies";
import { LOCALE_AUTO_VALUE } from "@/constants/locales";
import type { LocalePreference } from "@/types/i18n";
import { isDashboardLocale } from "@/utils/i18n";

export async function readLocaleCookie(): Promise<
  LocalePreference | undefined
> {
  const value = getCookie(LOCALE_COOKIE);
  if (value === LOCALE_AUTO_VALUE) {
    return null;
  }
  return isDashboardLocale(value) ? value : undefined;
}

export async function writeLocaleCookie(preference: LocalePreference) {
  setCookie(LOCALE_COOKIE, preference ?? LOCALE_AUTO_VALUE, {
    httpOnly: true,
    maxAge: LOCALE_COOKIE_MAX_AGE,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearLocaleCookie() {
  deleteCookie(LOCALE_COOKIE, { path: "/" });
}

import { cookies } from "next/headers";

import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE } from "@/constants/cookies";
import type { DashboardLocale } from "@/types/i18n";
import { isDashboardLocale } from "@/utils/i18n";

export async function readLocaleCookie(): Promise<DashboardLocale | null> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isDashboardLocale(value) ? value : null;
}

export async function writeLocaleCookie(locale: DashboardLocale) {
  (await cookies()).set(LOCALE_COOKIE, locale, {
    httpOnly: true,
    maxAge: LOCALE_COOKIE_MAX_AGE,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearLocaleCookie() {
  (await cookies()).delete(LOCALE_COOKIE);
}

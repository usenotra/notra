import {
  deleteCookie,
  getCookie,
  getCookies,
  setCookie,
} from "@tanstack/react-start/server";

import { cookieAttributes } from "@/utils/cookie-attributes";

export async function readShortLivedCookie(
  name: string
): Promise<string | null> {
  return getCookie(name) || null;
}

export async function storeShortLivedCookie(
  name: string,
  value: string,
  maxAgeSeconds: number
) {
  setCookie(name, value, {
    httpOnly: true,
    ...cookieAttributes(),
    path: "/",
    maxAge: maxAgeSeconds,
  });
}

export async function clearShortLivedCookie(name: string) {
  deleteCookie(name, { path: "/", ...cookieAttributes() });
}

export async function clearShortLivedCookiesWithPrefix(prefix: string) {
  for (const name of Object.keys(getCookies())) {
    if (name.startsWith(prefix)) {
      deleteCookie(name, {
        path: "/",
        ...cookieAttributes(),
      });
    }
  }
}

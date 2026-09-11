import { cookies } from "next/headers";

import {
  ELEVATED_ACCESS_COOKIE,
  ELEVATED_ACCESS_FALLBACK_MAX_AGE_SECONDS,
} from "@/constants/security";

const MS_PER_SECOND = 1000;

function resolveMaxAgeSeconds(expiresAt: string | null | undefined) {
  if (!expiresAt) {
    return ELEVATED_ACCESS_FALLBACK_MAX_AGE_SECONDS;
  }
  const expiresMs = Date.parse(expiresAt);
  if (!Number.isFinite(expiresMs)) {
    return ELEVATED_ACCESS_FALLBACK_MAX_AGE_SECONDS;
  }
  const remaining = Math.floor((expiresMs - Date.now()) / MS_PER_SECOND);
  return remaining > 0 ? remaining : ELEVATED_ACCESS_FALLBACK_MAX_AGE_SECONDS;
}

export async function readElevatedAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(ELEVATED_ACCESS_COOKIE)?.value || null;
}

export async function storeElevatedAccessToken(
  token: string,
  expiresAt: string | null | undefined
) {
  const cookieStore = await cookies();
  cookieStore.set({
    name: ELEVATED_ACCESS_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: resolveMaxAgeSeconds(expiresAt),
  });
}

export async function clearElevatedAccessToken() {
  const cookieStore = await cookies();
  cookieStore.delete({ name: ELEVATED_ACCESS_COOKIE, path: "/" });
}

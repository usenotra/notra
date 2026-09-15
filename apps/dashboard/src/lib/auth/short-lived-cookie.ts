import { cookies } from "next/headers";

/** httpOnly cookies that carry a single short-lived auth credential. */
export async function readShortLivedCookie(
  name: string
): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(name)?.value || null;
}

export async function storeShortLivedCookie(
  name: string,
  value: string,
  maxAgeSeconds: number
) {
  const cookieStore = await cookies();
  cookieStore.set({
    name,
    value,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  });
}

export async function clearShortLivedCookie(name: string) {
  const cookieStore = await cookies();
  cookieStore.delete({ name, path: "/" });
}

import { getAuthIdentity, getAuthSession } from "@/lib/auth/server";
import { buildSessionCorsHeaders } from "@/lib/auth/session-cors";
import { readLocaleCookie, writeLocaleCookie } from "@/lib/i18n/locale-cookie";
import type { ClientSessionData } from "@/types/auth/session";
import { isDashboardLocale } from "@/utils/i18n";

export function OPTIONS(request: Request) {
  return new Response(null, {
    status: 204,
    headers: {
      ...buildSessionCorsHeaders(request.headers.get("origin")),
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function GET(request: Request) {
  const headers = buildSessionCorsHeaders(request.headers.get("origin"));
  if (new URL(request.url).searchParams.get("view") === "navbar") {
    const identity = await getAuthIdentity();
    return Response.json({ isAuthenticated: Boolean(identity) }, { headers });
  }

  const data = await getAuthSession();

  if (!data) {
    return Response.json(null, { headers });
  }

  const preference = isDashboardLocale(data.user.locale)
    ? data.user.locale
    : null;
  if ((await readLocaleCookie()) !== preference) {
    await writeLocaleCookie(preference);
  }

  const payload: ClientSessionData = {
    session: data.session,
    user: {
      id: data.user.id,
      name: data.user.name,
      email: data.user.email,
      emailVerified: data.user.emailVerified,
      image: data.user.image,
      role: data.user.role,
      hidePersonalData: data.user.hidePersonalData,
      showAgentStats: data.user.showAgentStats,
      locale: data.user.locale,
      createdAt: data.user.createdAt,
    },
  };

  return Response.json(payload, { headers });
}

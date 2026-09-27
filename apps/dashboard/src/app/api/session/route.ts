import type { NextRequest } from "next/server";

import { getAuthSession } from "@/lib/auth/server";
import { buildSessionCorsHeaders } from "@/lib/auth/session-cors";
import { readLocaleCookie, writeLocaleCookie } from "@/lib/i18n/locale-cookie";
import type { ClientSessionData } from "@/types/auth/session";
import { resolveDashboardLocale } from "@/utils/i18n";

export function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 204,
    headers: {
      ...buildSessionCorsHeaders(request.headers.get("origin")),
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function GET(request: NextRequest) {
  const headers = buildSessionCorsHeaders(request.headers.get("origin"));
  const data = await getAuthSession();

  if (!data) {
    return Response.json(null, { headers });
  }

  const locale = resolveDashboardLocale(data.user.locale);
  if ((await readLocaleCookie()) !== locale) {
    await writeLocaleCookie(locale);
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

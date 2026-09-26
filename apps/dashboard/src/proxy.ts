import { authkit, handleAuthkitProxy } from "@workos-inc/authkit-nextjs";
import { NextResponse, type NextRequest } from "next/server";

import { NON_DASHBOARD_PATH } from "@/constants/auth-routes";
import {
  evaluateLocalDevAuth,
  isLocalDevAuthEnabled,
  localDevAuthBlockedMessage,
} from "@/utils/local-dev-auth";

function localDevProxy(request: NextRequest) {
  // NextRequest has no trusted peer IP. Host and forwarding headers are
  // spoofable, so `next dev` binds to 127.0.0.1 and this gate only allows
  // loopback Host without public forwarding headers.
  const gate = evaluateLocalDevAuth(request.headers);
  if (gate.kind === "allowed") {
    return NextResponse.next();
  }
  if (gate.kind === "blocked") {
    return new NextResponse(localDevAuthBlockedMessage(gate.reason), {
      status: 403,
    });
  }
  return NextResponse.next();
}

export default async function proxy(request: NextRequest) {
  // Local impersonation has no WorkOS session and still requires loopback.
  if (isLocalDevAuthEnabled()) {
    return localDevProxy(request);
  }

  const { session, headers } = await authkit(request);
  const { pathname, search } = request.nextUrl;

  if (!session.user && !NON_DASHBOARD_PATH.test(pathname)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("returnTo", `${pathname}${search}`);
    return handleAuthkitProxy(request, headers, { redirect: loginUrl });
  }

  return handleAuthkitProxy(request, headers);
}

// Machine-to-machine routes authenticate themselves (signatures, CRON_SECRET,
// bearer tokens) and never read the AuthKit session, so running the proxy there
// only adds an invocation per webhook, ingest event, cron and workflow callback.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|badges(?:/|$)|favicon.ico|apple-icon.png|icon0.svg|icon1.png|robots.txt|api/webhooks/|api/geo/ingest(?:/|$)|api/cron/|api/healthcheck(?:/|$)|api/workflows/|api/internal/|\\.well-known/workflow/|ingest/).*)",
  ],
};

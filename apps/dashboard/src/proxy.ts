import { authkitProxy } from "@workos-inc/authkit-nextjs";
import { NextResponse, type NextRequest } from "next/server";

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

// AuthKit reads `process.env[name]` (dynamic), so Edge never sees WORKOS_*.
// Do not instantiate AuthKit when local-dev impersonation is opted in — it
// 500s without a live key. Per-request we still require loopback + email.
export default isLocalDevAuthEnabled() ? localDevProxy : authkitProxy();

// Machine-to-machine routes authenticate themselves (signatures, CRON_SECRET,
// bearer tokens) and never read the AuthKit session, so running the proxy there
// only adds an invocation per webhook, ingest event, cron and workflow callback.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|badges(?:/|$)|favicon.ico|apple-icon.png|icon0.svg|icon1.png|robots.txt|api/webhooks/|api/geo/ingest(?:/|$)|api/cron/|api/healthcheck(?:/|$)|api/workflows/|api/internal/|\\.well-known/workflow/|ingest/).*)",
  ],
};

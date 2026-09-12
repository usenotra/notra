import { authkitProxy } from "@workos-inc/authkit-nextjs";
import { NextResponse, type NextRequest } from "next/server";

import {
  evaluateLocalDevAuth,
  isLocalDevAuthEnabled,
  localDevAuthBlockedMessage,
} from "@/utils/local-dev-auth";

function localDevProxy(request: NextRequest) {
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

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|badges(?:/|$)|favicon.ico|apple-icon.png|icon0.svg|icon1.png|robots.txt).*)",
  ],
};

import { authkitProxy } from "@workos-inc/authkit-nextjs";
import { NextResponse, type NextRequest } from "next/server";

import { isLocalDevAuthEnabled } from "@/utils/local-dev-auth";

// AuthKit reads `process.env[name]` (dynamic), so Edge never sees WORKOS_*.
// Skip the proxy in local dev until a live API key is configured.
export default isLocalDevAuthEnabled()
  ? function proxy(_request: NextRequest) {
      return NextResponse.next();
    }
  : authkitProxy();

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|badges(?:/|$)|favicon.ico|apple-icon.png|icon0.svg|icon1.png|robots.txt).*)",
  ],
};

import { type NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth/auth-server";

export async function proxy(request: NextRequest) {
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard"],
};

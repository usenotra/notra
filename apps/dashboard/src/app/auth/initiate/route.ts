import { redirect } from "@tanstack/react-router";

import { createAuthSignInUrl } from "@/lib/auth/workos";

export async function GET() {
  const signInUrl = await createAuthSignInUrl();

  throw redirect({ href: signInUrl });
}

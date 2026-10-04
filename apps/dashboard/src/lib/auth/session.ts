import { isNotFound, isRedirect } from "@tanstack/react-router";

import { getAuthSession } from "@/lib/auth/server";
import type { GetServerSessionParams } from "@/types/auth/session";

export async function getServerSession(_params?: GetServerSessionParams) {
  const data = await getAuthSession().catch((error) => {
    if (isRedirect(error) || isNotFound(error)) {
      throw error;
    }
    console.error("Error getting server session", error);
    return null;
  });
  return { session: data?.session, user: data?.user };
}

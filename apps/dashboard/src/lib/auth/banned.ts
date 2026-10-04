import { db } from "@notra/db/drizzle";
import { users } from "@notra/db/schema";
import { isNotFound, isRedirect } from "@tanstack/react-router";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { getAuthKitContext } from "@workos/authkit-tanstack-react-start";
import { eq } from "drizzle-orm";

import type { BannedStatusUser } from "@/types/auth/banned";
import { evaluateLocalDevAuth } from "@/utils/local-dev-auth";

export function isUserBanned(user: BannedStatusUser) {
  if (!user.banned) {
    return false;
  }
  return !user.banExpires || user.banExpires > new Date();
}

export async function isSessionBanned(): Promise<boolean> {
  try {
    const headerList = getRequestHeaders();
    if (evaluateLocalDevAuth(headerList).kind === "allowed") {
      const email = process.env.DEV_AUTH_EMAIL?.trim();
      if (!email) {
        return false;
      }
      const localUser = await db.query.users.findFirst({
        where: eq(users.email, email),
        columns: { banned: true, banExpires: true },
      });
      return localUser ? isUserBanned(localUser) : false;
    }
  } catch {
    // Outside a request, fall through to AuthKit.
  }

  try {
    const { user } = getAuthKitContext().auth();

    if (!user) {
      return false;
    }

    const localUser = await db.query.users.findFirst({
      where: eq(users.workosUserId, user.id),
      columns: { banned: true, banExpires: true },
    });

    return localUser ? isUserBanned(localUser) : false;
  } catch (error) {
    if (isRedirect(error) || isNotFound(error)) {
      throw error;
    }
    return false;
  }
}

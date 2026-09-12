import { db } from "@notra/db/drizzle";
import { users } from "@notra/db/schema";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { eq } from "drizzle-orm";
import { unstable_rethrow } from "next/navigation";

import type { BannedStatusUser } from "@/types/auth/banned";
import { isLocalDevAuthEnabled } from "@/utils/local-dev-auth";

export function isUserBanned(user: BannedStatusUser) {
  if (!user.banned) {
    return false;
  }
  return !user.banExpires || user.banExpires > new Date();
}

export async function isSessionBanned(): Promise<boolean> {
  if (isLocalDevAuthEnabled()) {
    return false;
  }

  try {
    const { user } = await withAuth();

    if (!user) {
      return false;
    }

    const localUser = await db.query.users.findFirst({
      where: eq(users.workosUserId, user.id),
      columns: { banned: true, banExpires: true },
    });

    return localUser ? isUserBanned(localUser) : false;
  } catch (error) {
    unstable_rethrow(error);
    return false;
  }
}

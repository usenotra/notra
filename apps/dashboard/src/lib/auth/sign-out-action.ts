import { createServerFn } from "@tanstack/react-start";

import { followServerRedirect } from "@/lib/framework/follow-server-redirect";
import type { SignOutActionOptions } from "@/types/auth/user-actions";

import { signOut } from "./user-actions";

// Sign-out stays a server function: it clears cookies and may redirect.
const signOutServerFn = createServerFn({ method: "POST" })
  .validator((data: SignOutActionOptions | undefined) => data)
  .handler(({ data }) => signOut(data));

export const signOutAction = (options?: SignOutActionOptions) =>
  followServerRedirect(signOutServerFn({ data: options }));

import type { NativeChatWritePermissions } from "@notra/ai/types/standalone-chat";
import { LEGACY_API_WRITE_SCOPE } from "@notra/utils/api-scopes";

import { type AuthData, isOAuthAuth, isIngestAuth } from "../types/auth";

export function getChatWritePermissions(
  auth?: AuthData
): NativeChatWritePermissions {
  if (!auth || isIngestAuth(auth)) {
    return { skills: false, posts: false };
  }
  const scopes = isOAuthAuth(auth) ? auth.scopes : (auth.permissions ?? []);
  const allWrites =
    scopes.includes("*") || scopes.includes(LEGACY_API_WRITE_SCOPE);
  return {
    skills: allWrites || scopes.includes("skills.write"),
    posts: allWrites || scopes.includes("posts.write"),
  };
}

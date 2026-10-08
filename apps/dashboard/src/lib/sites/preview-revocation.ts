import { isSitesConfigured } from "@notra/sites-server/env";
import {
  revokeOrganizationMemberPreviewAccess,
  revokeUserPreviewSessions,
} from "@notra/sites-server/preview-revocation";

export async function revokeSitePreviewAccess(
  organizationId: string,
  userId: string
): Promise<void> {
  if (!isSitesConfigured()) {
    return;
  }
  try {
    await revokeOrganizationMemberPreviewAccess(organizationId, userId);
  } catch (error) {
    console.error("sites.preview_revoke_failed", {
      organizationId,
      userId,
      error: error instanceof Error ? error.message : error,
    });
  }
}

export async function revokeSitePreviewSessions(userId: string): Promise<void> {
  if (!isSitesConfigured()) {
    return;
  }
  try {
    await revokeUserPreviewSessions(userId);
  } catch (error) {
    console.error("sites.preview_sign_out_failed", {
      userId,
      error: error instanceof Error ? error.message : error,
    });
  }
}

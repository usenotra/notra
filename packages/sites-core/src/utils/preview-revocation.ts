import {
  SITE_PREVIEW_MEMBER_RENEW_SECONDS,
  SITE_PREVIEW_SHARE_LINK_SECONDS,
} from "@notra/sites-core/constants/sites";
import type {
  PreviewRevocationScope,
  RevokedPreviewSessions,
  SitePreviewTokenClaims,
} from "@notra/sites-core/types/preview-token";

export function revokePreviewSessionsInState(
  revoked: RevokedPreviewSessions,
  userId: string,
  scope: PreviewRevocationScope,
  nowMs: number
): RevokedPreviewSessions {
  const current = revoked[userId] ?? {};
  const next: RevokedPreviewSessions = {
    ...revoked,
    [userId]: {
      ...current,
      sessions: nowMs,
      ...(scope === "access_lost" ? { shareLinks: nowMs } : {}),
    },
  };
  return prunePreviewRevocations(next, nowMs);
}

function prunePreviewRevocations(
  revoked: RevokedPreviewSessions,
  nowMs: number
): RevokedPreviewSessions {
  const sessionsCutoff = nowMs - SITE_PREVIEW_MEMBER_RENEW_SECONDS * 1000;
  const shareCutoff = nowMs - SITE_PREVIEW_SHARE_LINK_SECONDS * 1000;
  const pruned: RevokedPreviewSessions = {};
  for (const [userId, entry] of Object.entries(revoked)) {
    const kept = {
      ...(entry.sessions !== undefined && entry.sessions > sessionsCutoff
        ? { sessions: entry.sessions }
        : {}),
      ...(entry.shareLinks !== undefined && entry.shareLinks > shareCutoff
        ? { shareLinks: entry.shareLinks }
        : {}),
    };
    if (Object.keys(kept).length > 0) {
      pruned[userId] = kept;
    }
  }
  return pruned;
}

export function isPreviewTokenRevoked(
  claims: SitePreviewTokenClaims,
  revoked: RevokedPreviewSessions
): boolean {
  if (claims.kind === "password") {
    return false;
  }
  if (claims.kind === "member") {
    if (!(claims.userId && typeof claims.issuedAt === "number")) {
      return true;
    }
    const revokedAt = revoked[claims.userId]?.sessions;
    return revokedAt !== undefined && claims.issuedAt <= revokedAt;
  }
  if (!(claims.userId && typeof claims.issuedAt === "number")) {
    return false;
  }
  const revokedAt = revoked[claims.userId]?.shareLinks;
  return revokedAt !== undefined && claims.issuedAt <= revokedAt;
}

import type { SessionContext } from "eve/context";

import type { OrganizationContext } from "../types/organization";

export function getOrganizationId(ctx: OrganizationContext): string | null {
  const organizationId =
    ctx.session.auth.current?.attributes.organizationId ??
    ctx.session.auth.initiator?.attributes.organizationId;
  if (typeof organizationId !== "string") {
    return null;
  }
  const trimmed = organizationId.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function requireOrganizationId(ctx: SessionContext): string {
  const organizationId = getOrganizationId(ctx);
  if (!organizationId) {
    throw new Error(
      "No organization is bound to this session. Organization-scoped tools are unavailable on research-only runs."
    );
  }
  return organizationId;
}

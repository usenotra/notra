import type { getServerSession } from "@/lib/auth/session";
import type { OrganizationMembership } from "@/types/auth/organization";
import type { GeoShelfMember } from "@/types/geo-shelf";

type SessionData = Awaited<ReturnType<typeof getServerSession>>;

export interface ORPCRequestMemo {
  readonly shelfMembersByOrganization: Map<string, Promise<GeoShelfMember[]>>;
  readonly analyticsEnabledByOrganization: Map<string, Promise<boolean>>;
  readonly sitesEnabledByOrganization: Map<string, Promise<boolean>>;
  readonly geoEntitlementByOrganization: Map<
    string,
    Promise<"entitled" | "denied" | "skipped">
  >;
  /** Keyed by `${userId}:${organizationId}`. */
  readonly membershipByUserOrganization: Map<
    string,
    Promise<OrganizationMembership | undefined>
  >;
  /**
   * React `cache()` does not memoize inside route handlers, so without this
   * every procedure in a batch re-ran the WorkOS session read, the `users`
   * lookup and the active-organization lookup.
   */
  sessionLookup?: Promise<SessionData>;
}

export interface ORPCContext {
  headers: Headers;
  requestMemo: ORPCRequestMemo;
  session: SessionData["session"] | null;
  user: SessionData["user"] | null;
}

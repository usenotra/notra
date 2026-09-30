import type { getServerSession } from "@/lib/auth/session";
import type { OrganizationMembership } from "@/types/auth/organization";
import type { GeoShelfMember } from "@/types/geo-shelf";

type SessionData = Awaited<ReturnType<typeof getServerSession>>;

export interface ORPCRequestMemo {
  readonly shelfMembersByOrganization: Map<string, Promise<GeoShelfMember[]>>;
  readonly analyticsEnabledByOrganization: Map<string, Promise<boolean>>;
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

const requestMemosByHeaders = new WeakMap<Headers, ORPCRequestMemo>();

function createRequestMemo(): ORPCRequestMemo {
  return {
    shelfMembersByOrganization: new Map(),
    analyticsEnabledByOrganization: new Map(),
    geoEntitlementByOrganization: new Map(),
    membershipByUserOrganization: new Map(),
  };
}

export function getORPCRequestMemo(
  headers: Headers
): ORPCRequestMemo | undefined {
  return requestMemosByHeaders.get(headers);
}

export interface ORPCContext {
  headers: Headers;
  requestMemo: ORPCRequestMemo;
  session: SessionData["session"] | null;
  user: SessionData["user"] | null;
}

export async function createORPCContext({
  headers,
}: {
  headers: Headers;
}): Promise<ORPCContext> {
  let requestMemo = requestMemosByHeaders.get(headers);
  if (!requestMemo) {
    requestMemo = createRequestMemo();
    requestMemosByHeaders.set(headers, requestMemo);
  }
  return {
    headers,
    requestMemo,
    session: null,
    user: null,
  };
}

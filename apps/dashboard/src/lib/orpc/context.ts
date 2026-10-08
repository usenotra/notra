import type { ORPCContext, ORPCRequestMemo } from "@/types/orpc/context";

const requestMemosByHeaders = new WeakMap<Headers, ORPCRequestMemo>();

function createRequestMemo(): ORPCRequestMemo {
  return {
    shelfMembersByOrganization: new Map(),
    analyticsEnabledByOrganization: new Map(),
    sitesEnabledByOrganization: new Map(),
    geoEntitlementByOrganization: new Map(),
    membershipByUserOrganization: new Map(),
  };
}

export function getORPCRequestMemo(
  headers: Headers
): ORPCRequestMemo | undefined {
  return requestMemosByHeaders.get(headers);
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

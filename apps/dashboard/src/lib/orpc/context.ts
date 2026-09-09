import type { getServerSession } from "@/lib/auth/session";

type SessionData = Awaited<ReturnType<typeof getServerSession>>;

export interface ORPCRequestMemo {
  readonly analyticsEnabledByOrganization: Map<string, Promise<boolean>>;
  readonly geoEntitlementByOrganization: Map<
    string,
    Promise<"entitled" | "denied" | "skipped">
  >;
}

const requestMemosByHeaders = new WeakMap<Headers, ORPCRequestMemo>();

function createRequestMemo(): ORPCRequestMemo {
  return {
    analyticsEnabledByOrganization: new Map(),
    geoEntitlementByOrganization: new Map(),
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

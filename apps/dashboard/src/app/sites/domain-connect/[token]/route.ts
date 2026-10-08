import { verifyDomainConnectCallback } from "@notra/sites-server/utils/domain-connect-callback";

import {
  finishDnsCallback,
  loadDnsCallbackSite,
} from "@/lib/sites/dns-callback";
import type {
  SiteDomainConnectOutcome,
  SiteDomainConnectRouteContext,
} from "@/types/sites";

export async function GET(
  request: Request,
  { params }: SiteDomainConnectRouteContext
) {
  const claims = verifyDomainConnectCallback((await params).token);
  if (!claims) {
    return new Response(
      "This DNS setup link expired. Start again from the Domains tab.",
      { status: 400 }
    );
  }
  const loaded = await loadDnsCallbackSite(request, claims.siteId);
  if (loaded instanceof Response) {
    return loaded;
  }

  const { searchParams } = new URL(request.url);
  const error = searchParams.get("error");
  const description = searchParams.get("error_description") ?? "";
  let outcome: SiteDomainConnectOutcome = "success";
  if (error) {
    outcome =
      error === "access_denied" && description.startsWith("user_cancel")
        ? "cancelled"
        : "error";
  }
  return finishDnsCallback({
    request,
    site: loaded.site,
    domainId: claims.domainId,
    userId: loaded.userId,
    outcome,
  });
}

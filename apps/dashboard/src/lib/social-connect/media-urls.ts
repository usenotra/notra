import { getOptionalR2PublicUrl } from "@/lib/upload/r2";

import { SocialConnectRequestError } from "./errors";

function allowedMediaHosts(): Set<string> {
  const hosts = new Set<string>();
  // ponytail: R2 public origin only. App-origin media (`/api/uploads/...`)
  // requires dashboard auth, which PostForMe does not have — allowing the
  // app host would pass validation and fail at provider delivery.
  const value = getOptionalR2PublicUrl();
  if (!value) {
    return hosts;
  }
  try {
    hosts.add(new URL(value).hostname.toLowerCase());
  } catch {
    // ignore malformed env — the host simply stays disallowed
  }
  return hosts;
}

// ponytail: UI only sends uploaded URLs, but the API takes any URL and hands
// it to PostForMe's fetcher. Confine that to our own storage origin — and,
// when the caller is known, to its own `organization/{orgId}/` prefix, so one
// org cannot publish another org's objects to a provider.
export function assertAllowedSocialMediaUrls(
  urls: string[] | undefined,
  organizationId?: string
) {
  if (!urls?.length) {
    return;
  }
  const hosts = allowedMediaHosts();
  for (const raw of urls) {
    // PostForMe fetches the URL server-side, so app-relative paths can never
    // resolve there. Reject early instead of failing at delivery.
    if (raw.startsWith("/") || !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw)) {
      throw new SocialConnectRequestError({
        message: "Media URL must be an absolute URL",
        cause: null,
      });
    }
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      throw new SocialConnectRequestError({
        message: "Invalid media URL",
        cause: null,
      });
    }
    const hostname = url.hostname.toLowerCase();
    if (!hosts.has(hostname)) {
      throw new SocialConnectRequestError({
        message: "Media URL host is not allowed",
        cause: null,
      });
    }
    if (
      organizationId &&
      !url.pathname.startsWith(`/organization/${organizationId}/`)
    ) {
      throw new SocialConnectRequestError({
        message: "Media URL host is not allowed",
        cause: null,
      });
    }
  }
}

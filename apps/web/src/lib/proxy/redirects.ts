import { SITE_REDIRECTS } from "@/constants/redirects";

const PERMANENT_REDIRECT_STATUS = 308;
const TEMPORARY_REDIRECT_STATUS = 307;
const TRAILING_SLASHES_REGEX = /\/+$/;
const PARAM_PLACEHOLDER_REGEX = /:(\w+)/g;

function matchSource(source: string, pathname: string) {
  const sourceSegments = source.split("/");
  const pathSegments = pathname.replace(TRAILING_SLASHES_REGEX, "").split("/");

  if (sourceSegments.length !== pathSegments.length) {
    return null;
  }

  const params: Record<string, string> = {};
  for (const [index, segment] of sourceSegments.entries()) {
    const value = pathSegments[index] ?? "";
    if (segment.startsWith(":")) {
      params[segment.slice(1)] = value;
    } else if (segment !== value) {
      return null;
    }
  }
  return params;
}

export function findRedirect(url: URL) {
  for (const redirect of SITE_REDIRECTS) {
    const params = matchSource(redirect.source, url.pathname);
    if (!params) {
      continue;
    }

    const destination = redirect.destination.replace(
      PARAM_PLACEHOLDER_REGEX,
      (_, name: string) => params[name] ?? ""
    );
    const target = new URL(destination, url);
    if (!target.search) {
      target.search = url.search;
    }

    return new Response(null, {
      status: redirect.permanent
        ? PERMANENT_REDIRECT_STATUS
        : TEMPORARY_REDIRECT_STATUS,
      headers: { Location: target.toString() },
    });
  }
  return null;
}

const AUTHKIT_METADATA_PATH = "/.well-known/oauth-authorization-server";
const METADATA_CACHE_CONTROL =
  "public, max-age=300, s-maxage=300, stale-while-revalidate=600";
const METADATA_ERROR_CACHE_CONTROL = "no-store";

export async function fetchAuthKitAuthorizationServerMetadata() {
  const domain = process.env.WORKOS_AUTHKIT_DOMAIN;

  if (!domain) {
    return Response.json(
      { error: "authorization_server_not_configured" },
      {
        status: 503,
        headers: { "Cache-Control": METADATA_ERROR_CACHE_CONTROL },
      }
    );
  }

  const response = await fetch(`https://${domain}${AUTHKIT_METADATA_PATH}`, {
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    return Response.json(
      { error: "authorization_server_unavailable" },
      {
        status: response.status,
        headers: { "Cache-Control": METADATA_ERROR_CACHE_CONTROL },
      }
    );
  }

  const metadata = await response.json();

  return Response.json(metadata, {
    headers: { "Cache-Control": METADATA_CACHE_CONTROL },
  });
}

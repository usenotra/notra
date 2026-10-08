export function getClientUpdateResponse(request: Request): Response {
  if (request.method !== "GET") {
    return new Response(null, {
      status: 405,
      headers: { Allow: "GET", "Cache-Control": "no-store" },
    });
  }
  const requestUrl = new URL(request.url);
  const returnTo = requestUrl.searchParams.get("returnTo") ?? "/";
  const destination = new URL(
    URL.canParse(returnTo, requestUrl.origin) ? returnTo : "/",
    requestUrl.origin
  );
  const location =
    destination.origin === requestUrl.origin &&
    destination.pathname !== "/api/client-update"
      ? destination.href
      : `${requestUrl.origin}/`;

  return new Response(null, {
    status: 303,
    headers: {
      Location: location,
      "Cache-Control": "no-store",
      "Set-Cookie":
        "__vdpl=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Lax",
    },
  });
}

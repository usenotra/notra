export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host =
    (process.env.VERCEL && request.headers.get("x-forwarded-host")) ||
    request.headers.get("host");
  const protocol =
    (process.env.VERCEL &&
      request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim()) ||
    new URL(request.url).protocol.replace(":", "");
  if (!(origin && host)) {
    return false;
  }
  const requestOrigin = URL.parse(`${protocol}://${host}`)?.origin;
  return Boolean(requestOrigin && URL.parse(origin)?.origin === requestOrigin);
}

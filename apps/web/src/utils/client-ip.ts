export function getClientIp(request: Request): string {
  // On Vercel only the platform-set x-vercel-forwarded-for is trustworthy.
  // Off-Vercel we assume a trusted reverse proxy overwrites x-forwarded-for;
  // if the app is exposed without one these headers are client-spoofable.
  if (process.env.VERCEL) {
    return (
      request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown"
    );
  }
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

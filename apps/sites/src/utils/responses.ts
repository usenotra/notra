export function html(
  body: string,
  status: number,
  extraHeaders: Record<string, string> = {}
): Response {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
      ...extraHeaders,
    },
  });
}

export function plainText(body: string, maxAgeSeconds: number): Response {
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": `public, max-age=${maxAgeSeconds}`,
    },
  });
}

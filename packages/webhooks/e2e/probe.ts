// Diagnostic probe worker for the e2e environment.
export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const target =
      url.searchParams.get("url") ??
      "https://cloudflare-dns.com/dns-query?name=example.com&type=A";
    try {
      const started = Date.now();
      const response = await fetch(target, {
        headers: { accept: "application/dns-json" },
        redirect: "manual",
      });
      const text = await response.text();
      return Response.json({
        ok: true,
        status: response.status,
        durationMs: Date.now() - started,
        body: text.slice(0, 500),
      });
    } catch (error) {
      return Response.json({
        ok: false,
        error: String(error),
        name: (error as Error)?.name,
        cause: String((error as Error)?.cause),
      });
    }
  },
} satisfies ExportedHandler;

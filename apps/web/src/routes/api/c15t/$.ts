import { createFileRoute } from "@tanstack/react-router";

import { C15T_BACKEND_URL } from "@/constants/c15t";

async function proxyToC15t({ request }: { request: Request }) {
  const url = new URL(request.url);
  const target = new URL(
    `${url.pathname.replace(/^\/api\/c15t/, "")}${url.search}`,
    C15T_BACKEND_URL
  );
  const headers = new Headers(request.headers);
  headers.delete("host");

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const response = await fetch(target, {
    method: request.method,
    headers,
    body: hasBody ? await request.arrayBuffer() : undefined,
    redirect: "manual",
  });

  const responseHeaders = new Headers(response.headers);
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("content-length");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}

export const Route = createFileRoute("/api/c15t/$")({
  server: {
    handlers: {
      GET: proxyToC15t,
      POST: proxyToC15t,
      PUT: proxyToC15t,
      PATCH: proxyToC15t,
      DELETE: proxyToC15t,
      OPTIONS: proxyToC15t,
    },
  },
});

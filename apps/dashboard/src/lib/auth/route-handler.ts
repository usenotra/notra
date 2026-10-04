export async function dispatchRouteHandler(
  handlers: object,
  request: Request,
  params: Record<string, string | string[] | undefined> = {}
): Promise<Response> {
  const method = request.method.toUpperCase();
  const supported = [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "HEAD",
    "OPTIONS",
  ].filter((name) => typeof Reflect.get(handlers, name) === "function");
  if (supported.includes("GET") && !supported.includes("HEAD")) {
    supported.push("HEAD");
  }
  if (!supported.includes("OPTIONS")) {
    supported.push("OPTIONS");
  }
  let handler = Reflect.get(handlers, method);
  if (method === "OPTIONS" && typeof handler !== "function") {
    return new Response(null, {
      status: 204,
      headers: { Allow: supported.sort().join(", ") },
    });
  }
  if (method === "HEAD" && typeof handler !== "function") {
    handler = Reflect.get(handlers, "GET");
  }
  if (typeof handler !== "function") {
    return new Response(null, { status: 405 });
  }
  const response: Response = await handler(request, {
    params: Promise.resolve(params),
  });
  return method === "HEAD"
    ? new Response(null, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      })
    : response;
}

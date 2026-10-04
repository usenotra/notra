import { describe, expect, test } from "bun:test";

import { dispatchRouteHandler } from "./route-handler";

describe("dispatchRouteHandler", () => {
  test("preserves the request body and resolves dynamic parameters", async () => {
    const request = new Request("https://dashboard.example/api/webhook", {
      method: "POST",
      body: '{ "signed": true }',
    });
    const response = await dispatchRouteHandler(
      {
        POST: async (
          received: Request,
          context: { params: Promise<Record<string, string | string[]>> }
        ) => {
          expect(received).toBe(request);
          expect(await received.text()).toBe('{ "signed": true }');
          expect(await context.params).toEqual({ id: "org", rest: ["a", "b"] });
          return new Response(null, { status: 202 });
        },
      },
      request,
      { id: "org", rest: ["a", "b"] }
    );
    expect(response.status).toBe(202);
  });

  test("returns streaming responses without consuming or replacing them", async () => {
    const response = new Response("data: ready\n\n", {
      headers: { "Content-Type": "text/event-stream" },
    });
    response.headers.append("Set-Cookie", "first=1; HttpOnly");
    response.headers.append("Set-Cookie", "second=2; HttpOnly");
    const result = await dispatchRouteHandler(
      { GET: () => response },
      new Request("https://dashboard.example/api/stream")
    );
    expect(result).toBe(response);
    expect(result.bodyUsed).toBe(false);
    expect(result.headers.getSetCookie()).toEqual([
      "first=1; HttpOnly",
      "second=2; HttpOnly",
    ]);
  });

  test("automatically handles HEAD without returning a body", async () => {
    const response = await dispatchRouteHandler(
      {
        GET: () =>
          new Response("body", { status: 201, headers: { "X-Test": "yes" } }),
      },
      new Request("https://dashboard.example/api/item", { method: "HEAD" })
    );
    expect(response.status).toBe(201);
    expect(response.headers.get("X-Test")).toBe("yes");
    expect(await response.text()).toBe("");
  });

  test("preserves explicit OPTIONS and reports automatic supported methods", async () => {
    const request = new Request("https://dashboard.example/api/item", {
      method: "OPTIONS",
    });
    const explicit = await dispatchRouteHandler(
      {
        OPTIONS: () =>
          new Response(null, {
            status: 204,
            headers: { "Access-Control-Allow-Origin": "https://app.example" },
          }),
      },
      request
    );
    expect(explicit.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://app.example"
    );
    const automatic = await dispatchRouteHandler(
      { GET: () => new Response(), POST: () => new Response() },
      request
    );
    expect(automatic.status).toBe(204);
    expect(automatic.headers.get("Allow")).toBe("GET, HEAD, OPTIONS, POST");
  });

  test("rejects unsupported methods without running another handler", async () => {
    const response = await dispatchRouteHandler(
      {
        GET: () => {
          throw new Error("must not run");
        },
      },
      new Request("https://dashboard.example/api/item", { method: "DELETE" })
    );
    expect(response.status).toBe(405);
  });
});

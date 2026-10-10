import { expect, test } from "bun:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";

import type { APIContext, MiddlewareHandler } from "astro";

async function middleware(dev: boolean, mount = "/articles") {
  const built = await Bun.build({
    entrypoints: [resolve(import.meta.dir, "../src/middleware.ts")],
    target: "bun",
    define: { "import.meta.env.DEV": JSON.stringify(dev) },
    plugins: [
      {
        name: "preview-params",
        setup(builder) {
          builder.onResolve({ filter: /^astro:middleware$/ }, () => ({
            path: "astro:middleware",
            namespace: "preview",
          }));
          builder.onLoad(
            { filter: /^astro:middleware$/, namespace: "preview" },
            () => ({
              contents: "export const defineMiddleware = callback => callback;",
              loader: "js",
            })
          );
          builder.onLoad({ filter: /\/lib\/params\.ts$/ }, () => ({
            contents: `export const params = ${JSON.stringify({ mount, publicFiles: ["/logo.svg"] })};`,
            loader: "js",
          }));
        },
      },
    ],
  });
  expect(built.success).toBe(true);
  const source = await built.outputs[0]?.text();
  const module = await import(
    `data:text/javascript;base64,${Buffer.from(source ?? "").toString("base64")}`
  );
  return module.onRequest as MiddlewareHandler;
}

test("dev middleware rewrites known assets and preserves response metadata except stale body headers", async () => {
  const onRequest = await middleware(true);
  const response = new Response(
    '<img src="/logo.svg?version=1"><a href="/other">Other</a>',
    {
      status: 201,
      statusText: "Created preview",
      headers: {
        "content-type": "text/html; charset=utf-8",
        "content-length": "60",
        etag: '"stale"',
        "x-preview": "kept",
      },
    }
  );
  const result = await onRequest({} as APIContext, () =>
    Promise.resolve(response)
  );
  assert.ok(result instanceof Response);
  expect(result).not.toBe(response);
  expect(result.status).toBe(201);
  expect(result.statusText).toBe("Created preview");
  expect(result.headers.get("content-type")).toBe("text/html; charset=utf-8");
  expect(result.headers.get("x-preview")).toBe("kept");
  expect(result.headers.has("content-length")).toBe(false);
  expect(result.headers.has("etag")).toBe(false);
  expect(await result.text()).toBe(
    '<img src="/articles/logo.svg?version=1"><a href="/other">Other</a>'
  );
});

test("dev middleware returns untouched HTML, non-HTML and bodyless responses unchanged", async () => {
  const onRequest = await middleware(true);
  for (const response of [
    new Response('<a href="/other">Other</a>', {
      headers: { "content-type": "text/html", etag: '"unchanged"' },
    }),
    new Response('<img src="/logo.svg">', {
      headers: { "content-type": "text/plain" },
    }),
    new Response(null, {
      status: 204,
      headers: { "content-type": "text/html" },
    }),
  ]) {
    const result = await onRequest({} as APIContext, () =>
      Promise.resolve(response)
    );
    assert.ok(result instanceof Response);
    expect(result).toBe(response);
    expect(result.bodyUsed).toBe(false);
  }
});

test("root-mount and production HTML bypass rewriting", async () => {
  for (const onRequest of [
    await middleware(true, "/"),
    await middleware(false),
  ]) {
    const response = new Response('<img src="/logo.svg">', {
      headers: { "content-type": "text/html", etag: '"unchanged"' },
    });
    const result = await onRequest({} as APIContext, () =>
      Promise.resolve(response)
    );
    assert.ok(result instanceof Response);
    expect(result).toBe(response);
    expect(result.headers.get("etag")).toBe('"unchanged"');
    expect(await result.text()).toBe('<img src="/logo.svg">');
  }
});

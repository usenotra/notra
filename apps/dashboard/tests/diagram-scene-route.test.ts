import { afterEach, beforeEach, expect, mock, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

if (process.env.NOTRA_DIAGRAM_SCENE_TEST_WORKER !== "1") {
  test("diagram scene route handles storage configuration and authorization", () => {
    const result = spawnSync(
      process.execPath,
      ["test", fileURLToPath(import.meta.url)],
      {
        env: { ...process.env, NOTRA_DIAGRAM_SCENE_TEST_WORKER: "1" },
        timeout: 30_000,
      }
    );
    expect(result.status, result.stderr?.toString()).toBe(0);
  }, 35_000);
} else {
  const findPost = mock(async () => ({
    sourceMetadata: {
      excalidrawUrl: "https://assets.example.test/diagram.excalidraw",
      diagramRevision: 2,
    },
  }));
  const authorize = mock(async () => ({
    success: true,
    response: new Response(null, { status: 401 }),
  }));
  const fetchScene = mock(async () =>
    Response.json({ elements: [], files: {} })
  );
  const originalFetch = globalThis.fetch;
  const originalPublicUrl = process.env.CLOUDFLARE_PUBLIC_URL;

  mock.module("@notra/db/drizzle", () => ({
    db: { query: { posts: { findFirst: findPost } } },
  }));
  mock.module("@/lib/auth/organization", () => ({
    withOrganizationAuth: authorize,
  }));
  mock.module("@notra/ai/utils/diagram-post", () => ({
    isDiagramConflictError: () => false,
    saveDiagramRevision: mock(),
  }));
  mock.module("@notra/ai/utils/diagram-scene-import", () => ({
    sceneToDiagramSpec: mock(),
  }));

  const { GET } =
    await import("../src/app/api/organizations/[organizationId]/content/[contentId]/excalidraw/route");
  const request = new Request("http://localhost/api/diagram");
  const context = {
    params: Promise.resolve({
      organizationId: "test-org",
      contentId: "test-post",
    }),
  };

  beforeEach(() => {
    findPost.mockClear();
    authorize.mockClear();
    fetchScene.mockClear();
    process.env.CLOUDFLARE_PUBLIC_URL = "https://assets.example.test/";
    globalThis.fetch = fetchScene as unknown as typeof fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalPublicUrl === undefined) {
      delete process.env.CLOUDFLARE_PUBLIC_URL;
    } else {
      process.env.CLOUDFLARE_PUBLIC_URL = originalPublicUrl;
    }
  });

  test.each([undefined, ""])(
    "missing storage URL %p is not a missing diagram",
    async (url) => {
      if (url === undefined) {
        delete process.env.CLOUDFLARE_PUBLIC_URL;
      } else {
        process.env.CLOUDFLARE_PUBLIC_URL = url;
      }
      const response = await GET(request, context);
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({
        error: "Diagram asset storage is not configured",
      });
      expect(fetchScene).not.toHaveBeenCalled();
    }
  );

  test("only loads scenes from the configured bucket and preserves revision", async () => {
    const response = await GET(request, context);
    expect(response.status).toBe(200);
    expect(response.headers.get("X-Diagram-Revision")).toBe("2");
    expect(await response.json()).toEqual({ elements: [], files: {} });
    expect(fetchScene).toHaveBeenCalledWith(
      "https://assets.example.test/diagram.excalidraw",
      { cache: "no-store" }
    );
  });

  test("rejects foreign URLs without fetching", async () => {
    findPost.mockResolvedValueOnce({
      sourceMetadata: {
        excalidrawUrl:
          "https://assets.example.test.attacker.test/diagram.excalidraw",
        diagramRevision: 2,
      },
    });
    expect((await GET(request, context)).status).toBe(404);
    expect(fetchScene).not.toHaveBeenCalled();
  });

  test("a missing scene is still 404 even without storage configuration", async () => {
    delete process.env.CLOUDFLARE_PUBLIC_URL;
    findPost.mockResolvedValueOnce({
      sourceMetadata: { excalidrawUrl: "", diagramRevision: 2 },
    });
    expect((await GET(request, context)).status).toBe(404);
    expect(fetchScene).not.toHaveBeenCalled();
  });

  test("reports an upstream scene failure separately", async () => {
    fetchScene.mockResolvedValueOnce(new Response(null, { status: 404 }));
    expect((await GET(request, context)).status).toBe(502);
  });

  test("authenticates before reading diagram metadata", async () => {
    authorize.mockResolvedValueOnce({
      success: false,
      response: new Response(null, { status: 401 }),
    });
    expect((await GET(request, context)).status).toBe(401);
    expect(findPost).not.toHaveBeenCalled();
    expect(fetchScene).not.toHaveBeenCalled();
  });
}

import { afterEach, expect, mock, spyOn, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";

import messages from "../messages/en.json";

if (process.env.NOTRA_COLLECTION_ACTIONS_TEST !== "1") {
  test("collection actions with isolated request mocks", () => {
    const result = spawnSync(
      process.execPath,
      ["test", fileURLToPath(import.meta.url)],
      {
        env: { ...process.env, NOTRA_COLLECTION_ACTIONS_TEST: "1" },
        timeout: 15_000,
      }
    );
    expect(result.status, result.stderr.toString()).toBe(0);
  }, 20_000);
} else {
  afterEach(() => mock.restore());

  test("deleting a collection scopes the request and refreshes all content lists", async () => {
    const client = new QueryClient();
    const invalidate = spyOn(client, "invalidateQueries").mockResolvedValue();
    const request = spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ json: { success: true } }), {
        headers: { "content-type": "application/json" },
      })
    );
    const { usePostActions } =
      await import("../src/lib/hooks/use-post-actions");
    const { dashboardOrpc } = await import("../src/lib/orpc/query");
    let actions: ReturnType<typeof usePostActions> | undefined;
    function Probe() {
      // oxlint-disable-next-line react/globals -- This isolated SSR probe captures the hook action for the test.
      actions = usePostActions("org-1");
      return null;
    }
    renderToStaticMarkup(
      <NextIntlClientProvider locale="en" messages={messages}>
        <QueryClientProvider client={client}>
          <Probe />
        </QueryClientProvider>
      </NextIntlClientProvider>
    );

    const deleted = await actions?.deleteCollection("collection-1");
    expect(deleted).toBe(true);
    const sentRequest = request.mock.calls[0]?.[0];
    expect(sentRequest).toBeInstanceOf(Request);
    const payload = await (sentRequest as Request).clone().json();
    expect(payload.json).toEqual({
      organizationId: "org-1",
      collectionId: "collection-1",
    });
    expect(invalidate).toHaveBeenCalledTimes(6);
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: dashboardOrpc.content.collections.list.key(),
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: dashboardOrpc.content.recents.key(),
    });

    request.mockRejectedValue(new Error("Delete failed"));
    invalidate.mockClear();
    expect(await actions?.deleteCollection("collection-1")).toBe(false);
    expect(invalidate).not.toHaveBeenCalled();
  });
}

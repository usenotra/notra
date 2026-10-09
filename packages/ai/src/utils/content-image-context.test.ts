import { describe, expect, test } from "bun:test";

import { getContentImageContext } from "./content-image-context";

describe("getContentImageContext", () => {
  test("provides the latest diagram without requiring sandbox metadata", () => {
    const diagramSpec = {
      elements: [
        {
          type: "rectangle",
          id: "queue",
          x: 30,
          y: 40,
          width: 200,
          height: 90,
          label: { text: "Updated queue" },
          backgroundColor: "#a5d8ff",
        },
      ],
    };
    const context = getContentImageContext({
      title: "Queue flow",
      sourceMetadata: { format: "diagram", diagramSpec, diagramRevision: 2 },
    });

    expect(context).toMatchObject({
      title: "Queue flow",
      format: "diagram",
      canRevise: true,
      diagramSpec,
    });
  });

  test("keeps marketing-image revision gated on a complete sandbox", () => {
    const sourceMetadata = {
      integrationId: "private-repository",
      branch: "private-branch",
      sandbox: { snapshotId: "private-snapshot", token: "private-token" },
      prompt: "private-generation-prompt",
    };
    const context = getContentImageContext({ title: "Banner", sourceMetadata });

    expect(context).toEqual({
      title: "Banner",
      format: "marketing",
      diagramSpec: null,
      canRevise: true,
    });
    expect(JSON.stringify(context)).not.toContain("private-");

    for (const metadata of [
      { ...sourceMetadata, integrationId: undefined },
      { ...sourceMetadata, branch: " " },
      { ...sourceMetadata, sandbox: {} },
    ]) {
      expect(
        getContentImageContext({ title: "Banner", sourceMetadata: metadata })
          .canRevise
      ).toBe(false);
    }
  });

  test("does not unlock revision for missing or invalid diagram metadata", () => {
    for (const sourceMetadata of [
      null,
      [],
      "diagram",
      { format: "diagram", excalidrawUrl: "https://example.com/scene" },
      { diagramSpec: { elements: [{ type: "unsupported" }] } },
    ]) {
      const context = getContentImageContext({
        title: "Image",
        sourceMetadata,
      });
      expect(context.diagramSpec).toBeNull();
      expect(context.canRevise).toBe(false);
    }
  });
});

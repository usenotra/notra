import { describe, expect, test } from "bun:test";

import { getContentImageContext } from "../utils/content-image-context";
import { buildToolSet } from "./tool-registry";

describe("content image revision tool availability", () => {
  test("enables the real revision tool for diagrams with no sandbox or repository", () => {
    const imageContext = getContentImageContext({
      title: "Queue flow",
      sourceMetadata: {
        diagramSpec: {
          elements: [{ type: "text", x: 20, y: 30, text: "Queue" }],
        },
      },
    });
    const { tools, descriptions } = buildToolSet({
      organizationId: "fixture-org",
      currentPostId: "fixture-diagram",
      userId: "fixture-user",
      currentMarkdown: "",
      contentType: "image",
      imageContext,
      validatedIntegrations: [],
    });

    expect(tools.reviseImage?.description).toContain(
      "Revises the current generated image"
    );
    expect(descriptions.join("\n")).not.toContain("revision is unavailable");
    expect(tools.getMarkdown).toBeUndefined();
    expect(tools.editMarkdown).toBeUndefined();
  });

  test("keeps unavailable images on the explanatory tool", async () => {
    const { tools } = buildToolSet({
      organizationId: "fixture-org",
      currentPostId: "fixture-image",
      userId: "fixture-user",
      currentMarkdown: "",
      contentType: "image",
      imageContext: getContentImageContext({
        title: "Banner",
        sourceMetadata: null,
      }),
      validatedIntegrations: [],
    });
    const result = await tools.reviseImage?.execute?.(
      {},
      { toolCallId: "fixture-call", messages: [], context: {} }
    );

    expect(result).toMatchObject({ status: "unavailable" });
  });
});

import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

test("post preview icon controls have accessible names", () => {
  const result = spawnSync(
    process.execPath,
    [
      "--eval",
      String.raw`
        import assert from "node:assert/strict";
        import { createElement } from "react";
        import { renderToStaticMarkup } from "react-dom/server";
        import { TwitterPostPreview } from "@notra/ui/components/ai-elements/twitter-post-preview";
        import { LinkedInPostPreview } from "@notra/ui/components/ai-elements/linkedin-post-preview";

        const props = { author: { name: "Fixture Author" }, content: "Synthetic preview" };
        const twitter = renderToStaticMarkup(createElement(TwitterPostPreview, props));
        const linkedin = renderToStaticMarkup(createElement(LinkedInPostPreview, props));
        const buttons = [...twitter.matchAll(/<button\b[^>]*>/g)];
        assert.deepEqual(buttons.map(([tag]) => tag.match(/aria-label="([^"]+)"/)?.[1]).sort(),
          ["More options", "Comment", "Repost", "Like", "Bookmark", "Share"].sort());
        assert.match(linkedin, /<button\b[^>]*aria-label="More options"/);
        console.log("Seven preview icon controls have explicit accessible names");
      `,
    ],
    { cwd: fileURLToPath(new URL("../", import.meta.url)), timeout: 15_000 }
  );
  expect(
    result.status,
    result.stdout.toString() + result.stderr.toString()
  ).toBe(0);
}, 20_000);

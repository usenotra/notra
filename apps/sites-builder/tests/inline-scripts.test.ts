import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";

import { inlineScriptHashes } from "../compiler/utils/inline-scripts";

const sha = (text: string) =>
  createHash("sha256").update(text, "utf8").digest("base64");

describe("inline script hashes", () => {
  test("hashes executable inline scripts exactly as the browser sees them", () => {
    const html = [
      "<script>a()</script>",
      '<script type="module">b()</script>',
      '<SCRIPT TYPE="text/javascript">c()</SCRIPT>',
      "<script>\r\nd()\r\n</script>",
      '<script src="/x.js"></script>',
      '<script data-src="/y" src="/x.js">ignored()</script>',
      '<script type="application/ld+json">{"@type":"Thing"}</script>',
      "<script></script>",
    ].join("");
    expect(inlineScriptHashes(html)).toEqual([
      sha("a()"),
      sha("b()"),
      sha("c()"),
      sha("\nd()\n"),
    ]);
  });
});

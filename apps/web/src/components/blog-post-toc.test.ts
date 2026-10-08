import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

test("TOC anchors preserve native clicks while ordinary activation scrolls", () => {
  const result = spawnSync(
    process.execPath,
    [
      "--eval",
      `
        import { mock } from "bun:test";
        import assert from "node:assert/strict";
        import * as React from "react";

        const updates = [];
        mock.module("react", () => ({
          ...React,
          useEffect: () => {},
          useLayoutEffect: () => {},
          useMemo: (compute) => compute(),
          useRef: (current) => ({ current }),
          useState: (initial) => [initial, (value) => updates.push(value)],
        }));

        const scrollTo = mock();
        const replaceState = mock();
        const getElementById = mock(() => ({
          getBoundingClientRect: () => ({ top: 200 }),
        }));
        globalThis.window = { scrollY: 300, scrollTo };
        globalThis.document = { getElementById };
        globalThis.history = { replaceState };

        const { BlogPostToc } = await import(${JSON.stringify(fileURLToPath(new URL("blog-post-toc.tsx", import.meta.url)))});
        const { TOC_SCROLL_OFFSET_PX } = await import(${JSON.stringify(fileURLToPath(new URL("../lib/blog/constants.ts", import.meta.url)))});

        function findLink(node) {
          if (Array.isArray(node)) {
            return node.map(findLink).find(Boolean);
          }
          if (!React.isValidElement(node)) {
            return;
          }
          if (node.type === "a") {
            return node;
          }
          return findLink(node.props.children);
        }

        for (const [name, overrides] of [
          ["ordinary", {}],
          ["keyboard activation", { detail: 0 }],
          ["Ctrl", { ctrlKey: true }],
          ["Meta", { metaKey: true }],
          ["Shift", { shiftKey: true }],
          ["Alt", { altKey: true }],
          ["middle button", { button: 1 }],
          ["right button", { button: 2 }],
          ["already prevented", { defaultPrevented: true }],
        ]) {
          updates.length = 0;
          scrollTo.mockClear();
          replaceState.mockClear();
          getElementById.mockClear();
          const link = findLink(BlogPostToc({
            toc: [{ title: "Heading", url: "#heading", depth: 2 }],
          }));
          assert.ok(link, name);
          assert.equal(link.props.href, "#heading", name);
          const preventDefault = mock();
          const timer = mock(() => 1);
          const originalSetTimeout = globalThis.setTimeout;
          globalThis.setTimeout = timer;
          try {
            link.props.onClick({
              button: 0,
              detail: 1,
              defaultPrevented: false,
              ctrlKey: false,
              metaKey: false,
              shiftKey: false,
              altKey: false,
              ...overrides,
              preventDefault,
            });
          } finally {
            globalThis.setTimeout = originalSetTimeout;
          }
          if (name === "ordinary" || name === "keyboard activation") {
            assert.equal(preventDefault.mock.calls.length, 1, name);
            assert.equal(timer.mock.calls.length, 1, name);
            assert.deepEqual(updates, ["heading"], name);
            assert.deepEqual(getElementById.mock.calls, [["heading"]], name);
            assert.deepEqual(scrollTo.mock.calls, [[{
              top: 500 - TOC_SCROLL_OFFSET_PX,
              behavior: "smooth",
            }]], name);
            assert.deepEqual(replaceState.mock.calls, [[null, "", "#heading"]], name);
          } else {
            assert.equal(preventDefault.mock.calls.length, 0, name);
            assert.equal(timer.mock.calls.length, 0, name);
            assert.deepEqual(updates, [], name);
            assert.equal(getElementById.mock.calls.length, 0, name);
            assert.equal(scrollTo.mock.calls.length, 0, name);
            assert.equal(replaceState.mock.calls.length, 0, name);
          }
          console.log(name + ": passed");
        }
      `,
    ],
    { cwd: fileURLToPath(new URL("../../", import.meta.url)), timeout: 15_000 }
  );

  expect(
    result.status,
    result.stdout.toString() + result.stderr.toString()
  ).toBe(0);
}, 20_000);

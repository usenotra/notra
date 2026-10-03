import { describe, expect, test } from "bun:test";

import { renderToStaticMarkup } from "react-dom/server";

import { LiveDemoEmbed } from "@/components/landing/live-demo-embed";
import {
  LIVE_DEMO_PREVIEW_DARK_SRC,
  LIVE_DEMO_PREVIEW_SRC,
} from "@/constants/landing/live-demo";

describe("live demo preview delivery", () => {
  test("lets the browser select a single high-priority image before hydration", () => {
    const html = renderToStaticMarkup(<LiveDemoEmbed />);

    expect(html.match(/<img\b/g)).toHaveLength(1);
    expect(html).toContain("<picture>");
    expect(html).toContain('media="(prefers-color-scheme: dark)"');
    expect(html).toContain(`srcSet="${LIVE_DEMO_PREVIEW_DARK_SRC}"`);
    expect(html).toContain(`src="${LIVE_DEMO_PREVIEW_SRC}"`);
    expect(html).toContain('fetchPriority="high"');
    expect(html).toContain('width="2000"');
    expect(html).toContain('height="1250"');
    expect(html).not.toContain('rel="preload"');
  });

  test("does not load the interactive demo until it is opened", () => {
    const html = renderToStaticMarkup(<LiveDemoEmbed />);
    expect(html).not.toContain("<iframe");
  });
});

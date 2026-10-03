import { describe, expect, test } from "bun:test";

import { renderToStaticMarkup } from "react-dom/server";

import Image from "../components/framework/image";

describe("native image component", () => {
  test("accepts static metadata and module defaults with proportional dimension overrides", () => {
    const image = {
      src: "/demo/fieldnote-homepage.png",
      width: 800,
      height: 600,
    };
    const native = renderToStaticMarkup(<Image src={image} alt="Static" />);
    expect(native).toContain('width="800"');
    expect(native).toContain('height="600"');
    const resized = renderToStaticMarkup(
      <Image src={{ default: image }} alt="Static" width={200} />
    );
    expect(resized).toContain('width="200"');
    expect(resized).toContain('height="150"');
    const tall = renderToStaticMarkup(
      <Image src={image} alt="Static" height="300" />
    );
    expect(tall).toContain('width="400"');
    expect(tall).toContain('height="300"');
  });

  test("static fill uses viewport descriptors without intrinsic dimensions", () => {
    const html = renderToStaticMarkup(
      <Image
        src={{ src: "/icon1.png", width: 32, height: 32 }}
        alt="Fill"
        fill
      />
    );
    expect(html).toContain('sizes="100vw"');
    expect(html).toContain("640w");
    expect(html).not.toContain('width="32"');
    expect(html).not.toContain('height="32"');
    expect(html).toContain('loading="lazy"');
  });

  test("preserves explicit loading and fetch priority props", () => {
    const html = renderToStaticMarkup(
      <Image
        src="/icon1.png"
        alt="Loading"
        width={32}
        height={32}
        loading="eager"
        fetchPriority="low"
      />
    );
    expect(html).toContain('loading="eager"');
    expect(html).toContain('fetchPriority="low"');
  });
  test("routes SVG sources through the protected optimizer", () => {
    const html = renderToStaticMarkup(
      <Image alt="Logo" src="/icon0.svg" width={40} height={40} />
    );
    expect(html).toContain("/api/image?url=%2Ficon0.svg");
    expect(html).not.toContain('src="/icon0.svg"');
  });

  test("renders responsive optimized sources and dimensions", () => {
    const html = renderToStaticMarkup(
      <Image
        alt="Demo"
        src="/demo/fieldnote-homepage.png"
        width={40}
        height={30}
      />
    );
    expect(html).toContain('width="40"');
    expect(html).toContain('height="30"');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain("w=48&amp;q=75 1x");
    expect(html).toContain("w=96&amp;q=75 2x");
  });

  test("preserves unoptimized attachment and blob URLs", () => {
    const html = renderToStaticMarkup(
      <Image
        alt="Attachment"
        src="blob:http://localhost/test"
        unoptimized
        width={640}
        height={480}
      />
    );
    expect(html).toContain('src="blob:http://localhost/test"');
    expect(html).not.toContain("srcSet");
    expect(html).not.toContain("/api/image");
  });

  test("supports fill and priority without framework DOM attributes", () => {
    const html = renderToStaticMarkup(
      <Image
        alt="Demo"
        src="/demo/fieldnote-homepage.png"
        fill
        priority
        sizes="100vw"
      />
    );
    expect(html).toContain("position:absolute");
    expect(html).toContain('loading="eager"');
    expect(html).toContain('fetchPriority="high"');
    expect(html).not.toContain('fill="');
    expect(html).not.toContain('priority="');
  });
});

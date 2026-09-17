import { describe, expect, test } from "bun:test";

import type { Transform } from "../src/types/scene";
import {
  computeViewBoxTransform,
  parsePreserveAspectRatio,
  parseSvgTransformAttr,
  parseSvgViewBox,
  parseUseHref,
  resolveUseShapes,
} from "../src/utils/svg-use";

function applyMatrix(t: Transform, x: number, y: number): [number, number] {
  return [t.m00 * x + t.m01 * y + t.m02, t.m10 * x + t.m11 * y + t.m12];
}

class FakeDocument {
  private ids = new Map<string, FakeElement>();

  index(root: FakeElement): void {
    const walk = (el: FakeElement): void => {
      const id = el.getAttribute("id");
      if (id) {
        this.ids.set(id, el);
      }
      for (const child of el.children) {
        walk(child);
      }
    };
    walk(root);
  }

  getElementById(id: string): FakeElement | null {
    return this.ids.get(id) ?? null;
  }
}

class FakeElement {
  tagName: string;
  attrs: Record<string, string>;
  children: FakeElement[] = [];
  parentElement: FakeElement | null = null;
  ctm: {
    a: number;
    b: number;
    c: number;
    d: number;
    e: number;
    f: number;
  } | null = null;
  doc: FakeDocument | null = null;

  constructor(
    tag: string,
    attrs: Record<string, string> = {},
    children: FakeElement[] = []
  ) {
    this.tagName = tag;
    this.attrs = attrs;
    for (const child of children) {
      this.append(child);
    }
  }

  append(child: FakeElement): this {
    child.parentElement = this;
    child.doc = this.doc;
    this.children.push(child);
    return this;
  }

  getAttribute(name: string): string | null {
    return this.attrs[name] ?? null;
  }

  /** Minimal inline-style support so paint-priority tests can use style="". */
  get style(): { getPropertyValue(prop: string): string } {
    return {
      getPropertyValue: (prop: string): string => {
        const raw = this.attrs["style"] ?? "";
        for (const declaration of raw.split(";")) {
          const separator = declaration.indexOf(":");
          if (separator < 0) {
            continue;
          }
          if (
            declaration.slice(0, separator).trim().toLowerCase() ===
            prop.toLowerCase()
          ) {
            return declaration.slice(separator + 1).trim();
          }
        }
        return "";
      },
    };
  }

  querySelectorAll(selector: string): FakeElement[] {
    const tags = selector
      .split(",")
      .map((part) => part.trim().toLowerCase())
      .filter(Boolean);
    const out: FakeElement[] = [];
    const walk = (el: FakeElement): void => {
      for (const child of el.children) {
        if (tags.includes(child.tagName.toLowerCase())) {
          out.push(child);
        }
        walk(child);
      }
    };
    walk(this);
    return out;
  }

  querySelector(selector: string): FakeElement | null {
    const trimmed = selector.trim();
    // Minimal `#id` support for scoped lookups in findElementById.
    if (trimmed.startsWith("#")) {
      const want = trimmed.slice(1);
      const walk = (el: FakeElement): FakeElement | null => {
        for (const child of el.children) {
          if (child.getAttribute("id") === want) {
            return child;
          }
          const found = walk(child);
          if (found) {
            return found;
          }
        }
        return null;
      };
      return walk(this);
    }
    return this.querySelectorAll(trimmed)[0] ?? null;
  }

  getScreenCTM(): FakeElement["ctm"] {
    return this.ctm;
  }

  get ownerDocument(): FakeDocument | null {
    return this.doc;
  }
}

function attachDoc(root: FakeElement, doc: FakeDocument): void {
  const walk = (el: FakeElement): void => {
    el.doc = doc;
    for (const child of el.children) {
      walk(child);
    }
  };
  walk(root);
  doc.index(root);
}

const IDENTITY_CTM = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

/** Fixture: icon sprite with a symbol, used at 2x scale. */
function symbolSpriteFixture(): { svg: FakeElement; use: FakeElement } {
  const path = new FakeElement("path", {
    id: "icon-path",
    d: "M0 0H10V10H0Z",
    fill: "red",
  });
  const symbol = new FakeElement(
    "symbol",
    { id: "icon", viewBox: "0 0 10 10" },
    [path]
  );
  const defs = new FakeElement("defs", {}, [symbol]);
  const use = new FakeElement("use", {
    href: "#icon",
    width: "20",
    height: "20",
  });
  use.ctm = { ...IDENTITY_CTM };
  const svg = new FakeElement("svg", {}, [defs, use]);
  return { svg, use };
}

/** Fixture: nested referenced groups with their own transforms. */
function nestedGroupsFixture(): { svg: FakeElement; use: FakeElement } {
  const rect = new FakeElement("rect", {
    x: "1",
    y: "2",
    width: "6",
    height: "8",
  });
  const inner = new FakeElement("g", {}, [rect]);
  const outer = new FakeElement("g", { transform: "translate(3, 4)" }, [inner]);
  const symbol = new FakeElement(
    "symbol",
    { id: "nested", viewBox: "0 0 20 20", fill: "blue" },
    [outer]
  );
  const defs = new FakeElement("defs", {}, [symbol]);
  const use = new FakeElement("use", {
    href: "#nested",
    width: "20",
    height: "20",
  });
  use.ctm = { ...IDENTITY_CTM };
  const svg = new FakeElement("svg", {}, [defs, use]);
  return { svg, use };
}

describe("parseUseHref", () => {
  test("resolves local fragments", () => {
    expect(parseUseHref("#icon")).toBe("icon");
    expect(parseUseHref("  #icon  ")).toBe("icon");
    expect(parseUseHref("url(#icon)")).toBe("icon");
  });

  test("rejects external and empty references", () => {
    expect(parseUseHref(null)).toBeNull();
    expect(parseUseHref("")).toBeNull();
    expect(parseUseHref("icon")).toBeNull();
    expect(parseUseHref("https://example.com/sprite.svg#icon")).toBeNull();
    expect(parseUseHref("#")).toBeNull();
  });
});

describe("parseSvgTransformAttr", () => {
  test("composes lists left to right", () => {
    const t = parseSvgTransformAttr("translate(10, 20) scale(2)");
    expect(applyMatrix(t, 1, 1)).toEqual([12, 22]);
  });

  test("rotates 90 degrees", () => {
    const t = parseSvgTransformAttr("rotate(90)");
    const [x, y] = applyMatrix(t, 1, 0);
    expect(x).toBeCloseTo(0, 10);
    expect(y).toBeCloseTo(1, 10);
  });

  test("ignores unknown functions", () => {
    const t = parseSvgTransformAttr("bogus(1, 2) translate(5, 0)");
    expect(applyMatrix(t, 0, 0)).toEqual([5, 0]);
  });
});

describe("viewBox mapping", () => {
  test("meet centers with uniform scale", () => {
    const viewBox = parseSvgViewBox("0 0 10 10");
    expect(viewBox).not.toBeNull();
    if (!viewBox) {
      return;
    }
    const t = computeViewBoxTransform(
      viewBox,
      { x: 0, y: 0, width: 20, height: 20 },
      parsePreserveAspectRatio(null)
    );
    expect(applyMatrix(t, 10, 10)).toEqual([20, 20]);
  });

  test("xMaxYMax meet aligns to the far corner", () => {
    const viewBox = parseSvgViewBox("0 0 10 5");
    expect(viewBox).not.toBeNull();
    if (!viewBox) {
      return;
    }
    const t = computeViewBoxTransform(
      viewBox,
      { x: 0, y: 0, width: 20, height: 20 },
      parsePreserveAspectRatio("xMaxYMax meet")
    );
    // Uniform scale 2 fills width; 10 units of vertical slack go to the top.
    expect(applyMatrix(t, 0, 0)).toEqual([0, 10]);
  });

  test("none scales non-uniformly", () => {
    const viewBox = parseSvgViewBox("0 0 10 5");
    expect(viewBox).not.toBeNull();
    if (!viewBox) {
      return;
    }
    const t = computeViewBoxTransform(
      viewBox,
      { x: 0, y: 0, width: 20, height: 20 },
      parsePreserveAspectRatio("none")
    );
    expect(applyMatrix(t, 10, 5)).toEqual([20, 20]);
  });
});

describe("resolveUseShapes", () => {
  test("resolves a symbol sprite at use scale", () => {
    const { svg, use } = symbolSpriteFixture();
    const doc = new FakeDocument();
    attachDoc(svg, doc);
    const shapes = resolveUseShapes(
      use as unknown as Element,
      svg as unknown as Element
    );
    expect(shapes).toHaveLength(1);
    const shape = shapes[0];
    expect(shape).toBeDefined();
    if (!shape) {
      return;
    }
    expect(shape.fill).toBe("red");
    const [x, y] = applyMatrix(shape.transform, 10, 10);
    expect(x).toBeCloseTo(20, 10);
    expect(y).toBeCloseTo(20, 10);
  });

  test("preserves nested group transforms and inherited paints", () => {
    const { svg, use } = nestedGroupsFixture();
    const doc = new FakeDocument();
    attachDoc(svg, doc);
    const shapes = resolveUseShapes(
      use as unknown as Element,
      svg as unknown as Element
    );
    expect(shapes).toHaveLength(1);
    const shape = shapes[0];
    expect(shape).toBeDefined();
    if (!shape) {
      return;
    }
    // Symbol fill inherits through the group chain.
    expect(shape.fill).toBe("blue");
    // rect origin (1, 2) shifted by the group's translate(3, 4).
    const [x, y] = applyMatrix(shape.transform, 1, 2);
    expect(x).toBeCloseTo(4, 10);
    expect(y).toBeCloseTo(6, 10);
  });

  test("use paints win over nothing, referenced paints win over use", () => {
    const path = new FakeElement("path", { d: "M0 0H4V4H0Z" });
    const symbol = new FakeElement("symbol", { id: "plain" }, [path]);
    const defs = new FakeElement("defs", {}, [symbol]);
    const use = new FakeElement("use", { href: "#plain", fill: "green" });
    use.ctm = { ...IDENTITY_CTM };
    const svg = new FakeElement("svg", {}, [defs, use]);
    const doc = new FakeDocument();
    attachDoc(svg, doc);
    const shapes = resolveUseShapes(
      use as unknown as Element,
      svg as unknown as Element
    );
    // Use fill inherits into the shadow content.
    expect(shapes[0]?.fill).toBe("green");

    path.attrs["fill"] = "yellow";
    const overridden = resolveUseShapes(
      use as unknown as Element,
      svg as unknown as Element
    );
    expect(overridden[0]?.fill).toBe("yellow");
  });

  test("applies use x/y offsets", () => {
    const path = new FakeElement("path", {
      id: "dot",
      d: "M0 0H2V2H0Z",
      fill: "black",
    });
    const svg = new FakeElement("svg", {}, [path]);
    const use = new FakeElement("use", { href: "#dot", x: "5", y: "7" });
    // Real browsers fold the supplemental x/y translation into getScreenCTM,
    // so the stub CTM already carries it (no double-apply in the resolver).
    use.ctm = { a: 1, b: 0, c: 0, d: 1, e: 5, f: 7 };
    svg.append(use);
    const doc = new FakeDocument();
    attachDoc(svg, doc);
    const shapes = resolveUseShapes(
      use as unknown as Element,
      svg as unknown as Element
    );
    expect(shapes).toHaveLength(1);
    const offsetShape = shapes[0];
    expect(offsetShape).toBeDefined();
    if (!offsetShape) {
      return;
    }
    const [x, y] = applyMatrix(offsetShape.transform, 0, 0);
    expect(x).toBeCloseTo(5, 10);
    expect(y).toBeCloseTo(7, 10);
  });

  test("resolves nested uses and stops cycles", () => {
    const innerPath = new FakeElement("path", {
      d: "M0 0H3V3H0Z",
      fill: "black",
    });
    const inner = new FakeElement("symbol", { id: "inner" }, [innerPath]);
    const midUse = new FakeElement("use", { href: "#inner" });
    const outer = new FakeElement("symbol", { id: "outer" }, [midUse]);
    const defs = new FakeElement("defs", {}, [inner, outer]);
    const use = new FakeElement("use", { href: "#outer" });
    use.ctm = { ...IDENTITY_CTM };
    const svg = new FakeElement("svg", {}, [defs, use]);
    const doc = new FakeDocument();
    attachDoc(svg, doc);
    const shapes = resolveUseShapes(
      use as unknown as Element,
      svg as unknown as Element
    );
    expect(shapes).toHaveLength(1);

    // Self-referencing use terminates instead of hanging.
    const loop = new FakeElement("use", { href: "#loop", id: "loop" });
    loop.ctm = { ...IDENTITY_CTM };
    svg.append(loop);
    attachDoc(svg, doc);
    const looped = resolveUseShapes(
      loop as unknown as Element,
      svg as unknown as Element
    );
    expect(looped).toHaveLength(0);
  });

  test("skips external references", () => {
    const use = new FakeElement("use", {
      href: "https://example.com/sprite.svg#icon",
    });
    use.ctm = { ...IDENTITY_CTM };
    const svg = new FakeElement("svg", {}, [use]);
    const doc = new FakeDocument();
    attachDoc(svg, doc);
    expect(
      resolveUseShapes(use as unknown as Element, svg as unknown as Element)
    ).toHaveLength(0);
  });

  test("resolves repeated references to the same id within one tree", () => {
    const innerPath = new FakeElement("path", {
      d: "M0 0H3V3H0Z",
      fill: "black",
    });
    const inner = new FakeElement("symbol", { id: "inner" }, [innerPath]);
    const first = new FakeElement("use", { href: "#inner", x: "0" });
    const second = new FakeElement("use", { href: "#inner", x: "10" });
    const outer = new FakeElement("symbol", { id: "outer" }, [first, second]);
    const defs = new FakeElement("defs", {}, [inner, outer]);
    const use = new FakeElement("use", { href: "#outer" });
    use.ctm = { ...IDENTITY_CTM };
    const svg = new FakeElement("svg", {}, [defs, use]);
    const doc = new FakeDocument();
    attachDoc(svg, doc);
    const shapes = resolveUseShapes(
      use as unknown as Element,
      svg as unknown as Element
    );
    // Both instances must materialize; a visited-set would drop the second.
    expect(shapes).toHaveLength(2);
  });

  test("prefers the in-root match when duplicate ids exist", () => {
    const localPath = new FakeElement("path", {
      d: "M0 0H4V4H0Z",
      fill: "red",
    });
    const localSymbol = new FakeElement("symbol", { id: "dup" }, [localPath]);
    const svg = new FakeElement("svg", {}, [localSymbol]);
    const use = new FakeElement("use", { href: "#dup" });
    use.ctm = { ...IDENTITY_CTM };
    svg.append(use);
    const doc = new FakeDocument();
    attachDoc(svg, doc);
    // A stale element with the same id elsewhere in the document must not
    // hijack the reference once the scoped match exists.
    doc.index(
      new FakeElement("symbol", { id: "dup" }, [
        new FakeElement("path", { d: "M0 0H9V9H0Z", fill: "blue" }),
      ])
    );
    const shapes = resolveUseShapes(
      use as unknown as Element,
      svg as unknown as Element
    );
    expect(shapes).toHaveLength(1);
    expect(shapes[0]?.fill).toBe("red");
  });

  test("falls back to document lookup for external sprite sheets", () => {
    const use = new FakeElement("use", { href: "#sprite-icon" });
    use.ctm = { ...IDENTITY_CTM };
    const svg = new FakeElement("svg", {}, [use]);
    const doc = new FakeDocument();
    attachDoc(svg, doc);
    doc.index(
      new FakeElement("symbol", { id: "sprite-icon" }, [
        new FakeElement("path", { d: "M0 0H5V5H0Z", fill: "green" }),
      ])
    );
    const shapes = resolveUseShapes(
      use as unknown as Element,
      svg as unknown as Element
    );
    expect(shapes).toHaveLength(1);
    expect(shapes[0]?.fill).toBe("green");
  });

  test("preserves transform on directly referenced use elements", () => {
    const target = new FakeElement("path", {
      id: "dot-target",
      d: "M0 0H2V2H0Z",
      fill: "black",
    });
    const inner = new FakeElement("use", {
      id: "inner-use",
      href: "#dot-target",
      transform: "translate(4, 6)",
    });
    const defs = new FakeElement("defs", {}, [target, inner]);
    const use = new FakeElement("use", { href: "#inner-use" });
    use.ctm = { ...IDENTITY_CTM };
    const svg = new FakeElement("svg", {}, [defs, use]);
    const doc = new FakeDocument();
    attachDoc(svg, doc);
    const shapes = resolveUseShapes(
      use as unknown as Element,
      svg as unknown as Element
    );
    expect(shapes).toHaveLength(1);
    const [x, y] = applyMatrix(shapes[0]?.transform as Transform, 0, 0);
    expect(x).toBeCloseTo(4, 10);
    expect(y).toBeCloseTo(6, 10);
  });

  test("resolves geometries under nested svg viewports", () => {
    const rect = new FakeElement("rect", {
      x: "0",
      y: "0",
      width: "10",
      height: "10",
      fill: "purple",
    });
    const nested = new FakeElement(
      "svg",
      { x: "5", y: "7", width: "10", height: "10" },
      [rect]
    );
    const symbol = new FakeElement("symbol", { id: "with-nested" }, [nested]);
    const defs = new FakeElement("defs", {}, [symbol]);
    const use = new FakeElement("use", { href: "#with-nested" });
    use.ctm = { ...IDENTITY_CTM };
    const svg = new FakeElement("svg", {}, [defs, use]);
    const doc = new FakeDocument();
    attachDoc(svg, doc);
    const shapes = resolveUseShapes(
      use as unknown as Element,
      svg as unknown as Element
    );
    expect(shapes).toHaveLength(1);
    const [x, y] = applyMatrix(shapes[0]?.transform as Transform, 0, 0);
    expect(x).toBeCloseTo(5, 10);
    expect(y).toBeCloseTo(7, 10);
  });

  test("emits interleaved content in document order", () => {
    const first = new FakeElement("rect", {
      x: "0",
      y: "0",
      width: "2",
      height: "2",
      fill: "red",
    });
    const innerPath = new FakeElement("path", {
      d: "M0 0H2V2H0Z",
      fill: "green",
    });
    const inner = new FakeElement("symbol", { id: "mid" }, [innerPath]);
    const middle = new FakeElement("use", { href: "#mid" });
    const last = new FakeElement("circle", {
      cx: "1",
      cy: "1",
      r: "1",
      fill: "blue",
    });
    const symbol = new FakeElement("symbol", { id: "ordered" }, [
      first,
      middle,
      last,
    ]);
    const defs = new FakeElement("defs", {}, [inner, symbol]);
    const use = new FakeElement("use", { href: "#ordered" });
    use.ctm = { ...IDENTITY_CTM };
    const svg = new FakeElement("svg", {}, [defs, use]);
    const doc = new FakeDocument();
    attachDoc(svg, doc);
    const shapes = resolveUseShapes(
      use as unknown as Element,
      svg as unknown as Element
    );
    // Stacking must follow document order, not geometry-first batching.
    expect(shapes.map((shape) => shape.fill)).toEqual(["red", "green", "blue"]);
  });

  test("falls back to viewBox when symbol dimensions are percentages", () => {
    const path = new FakeElement("path", {
      d: "M0 0H10V10H0Z",
      fill: "red",
    });
    const symbol = new FakeElement(
      "symbol",
      { id: "pct", viewBox: "0 0 10 10" },
      [path]
    );
    const defs = new FakeElement("defs", {}, [symbol]);
    // "50%" with no determinable host viewport must not be read as 50 units.
    const use = new FakeElement("use", {
      href: "#pct",
      width: "50%",
      height: "50%",
    });
    use.ctm = { ...IDENTITY_CTM };
    const svg = new FakeElement("svg", {}, [defs, use]);
    const doc = new FakeDocument();
    attachDoc(svg, doc);
    const shapes = resolveUseShapes(
      use as unknown as Element,
      svg as unknown as Element
    );
    expect(shapes).toHaveLength(1);
    const [x, y] = applyMatrix(shapes[0]?.transform as Transform, 10, 10);
    expect(x).toBeCloseTo(10, 10);
    expect(y).toBeCloseTo(10, 10);
  });

  test("resolves use percentage widths against the host viewport", () => {
    const path = new FakeElement("path", {
      d: "M0 0H10V10H0Z",
      fill: "red",
    });
    const symbol = new FakeElement(
      "symbol",
      { id: "pct-host", viewBox: "0 0 10 10" },
      [path]
    );
    const defs = new FakeElement("defs", {}, [symbol]);
    const use = new FakeElement("use", {
      href: "#pct-host",
      width: "50%",
      height: "50%",
    });
    use.ctm = { ...IDENTITY_CTM };
    const svg = new FakeElement(
      "svg",
      { width: "40", height: "20", viewBox: "0 0 40 20" },
      [defs, use]
    );
    const doc = new FakeDocument();
    attachDoc(svg, doc);
    const shapes = resolveUseShapes(
      use as unknown as Element,
      svg as unknown as Element
    );
    expect(shapes).toHaveLength(1);
    // 50% of the 40x20 host viewport => 20x10 viewport; meet-fit of the
    // 10x10 viewBox => scale 1 with 5 units of horizontal centering.
    const [x, y] = applyMatrix(shapes[0]?.transform as Transform, 10, 10);
    expect(x).toBeCloseTo(15, 10);
    expect(y).toBeCloseTo(10, 10);
  });

  test("inline styles on referenced content beat use paints", () => {
    const path = new FakeElement("path", {
      d: "M0 0H4V4H0Z",
      style: "fill: orange",
    });
    const symbol = new FakeElement("symbol", { id: "styled" }, [path]);
    const defs = new FakeElement("defs", {}, [symbol]);
    const use = new FakeElement("use", { href: "#styled", fill: "green" });
    use.ctm = { ...IDENTITY_CTM };
    const svg = new FakeElement("svg", {}, [defs, use]);
    const doc = new FakeDocument();
    attachDoc(svg, doc);
    const shapes = resolveUseShapes(
      use as unknown as Element,
      svg as unknown as Element
    );
    expect(shapes).toHaveLength(1);
    expect(shapes[0]?.fill).toBe("orange");
  });
});

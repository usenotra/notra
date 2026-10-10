import { describe, expect, test } from "bun:test";

import {
  substituteSettingText,
  substituteVariables,
} from "../src/utils/variables";

const VARIABLES = { product: "Acme Cloud", plan_name: "Pro" };
const substitute = (source: string) => substituteVariables(source, VARIABLES);

describe("substituteVariables", () => {
  test("leaves JavaScript strings, templates, comments and expressions unchanged", () => {
    const source = [
      'export const label = "{{ product }}";',
      "",
      'export const options = {\n  // {{ product }}\n  label: "{{ missing }}", text: `{{ product }}`\n};',
      "",
      'Use {{ product }}. {"{{ product }}"}',
      "",
      '<Card title={"{{ product }}"}>Try {{ product }}</Card>',
    ].join("\n");
    const result = substituteVariables(source, { product: 'Acme "Flow"' });
    expect(result.text).toBe(
      source
        .replace("Use {{ product }}.", 'Use Acme "Flow".')
        .replace("Try {{ product }}", 'Try Acme "Flow"')
    );
    expect(result.unknown).toEqual([]);
  });

  test("treats JavaScript-looking Markdown as content", () => {
    expect(
      substituteVariables(
        'export const label = "{{ product }}";',
        VARIABLES,
        false
      ).text
    ).toBe('export const label = "Acme Cloud";');
  });

  test.each(["", " ", "\t", "\n", "\r\n  "])(
    "preserves JSX object attributes after =%j while replacing prose",
    (whitespace) => {
      const source = `---\ntitle: "{{ product }}"\n---\n\n<Card style=${whitespace}{{ product }} data=${whitespace}{{ missing }}>Try {{ product }}</Card>\n\nUnknown {{ nope }}.`;
      const result = substitute(source);
      expect(result.text).toBe(
        source
          .replace('title: "{{ product }}"', 'title: "Acme Cloud"')
          .replace("Try {{ product }}", "Try Acme Cloud")
          .replace("{{ nope }}", "\\{\\{ nope \\}\\}")
      );
      expect(result.unknown).toEqual([
        { name: "nope", offset: source.indexOf("{{ nope }}") },
      ]);
    }
  );

  test("replaces names with or without spaces", () => {
    expect(substitute("{{ product }} and {{plan_name}}").text).toBe(
      "Acme Cloud and Pro"
    );
  });

  test("leaves fenced code blocks and inline code as written", () => {
    const source = [
      "Use {{ product }}.",
      "",
      "```mdx",
      "{{ product }}",
      "```",
      "",
      "~~~~",
      "{{ product }}",
      "```",
      "still code {{ product }}",
      "~~~~",
      "",
      "Inline `{{ product }}` and ``a ` {{ product }}`` stay; {{ product }} not.",
    ].join("\n");
    const { text, unknown } = substitute(source);
    expect(text).toBe(
      [
        "Use Acme Cloud.",
        "",
        "```mdx",
        "{{ product }}",
        "```",
        "",
        "~~~~",
        "{{ product }}",
        "```",
        "still code {{ product }}",
        "~~~~",
        "",
        "Inline `{{ product }}` and ``a ` {{ product }}`` stay; Acme Cloud not.",
      ].join("\n")
    );
    expect(unknown).toEqual([]);
  });

  test("an unclosed fence runs to the end", () => {
    expect(substitute("```\n{{ product }}").text).toBe("```\n{{ product }}");
  });

  test("fills the frontmatter, skips JSX object expressions and escaped braces", () => {
    const source =
      '---\ntitle: "{{ product }}"\n---\n\n<div style={{ product }} /> \\{{ product }} {{ product }}';
    expect(substitute(source).text).toBe(
      '---\ntitle: "Acme Cloud"\n---\n\n<div style={{ product }} /> \\{{ product }} Acme Cloud'
    );
  });

  test("reports unknown names with their offset and escapes them for MDX", () => {
    const source = "a {{ nope }} b {{ constructor }}";
    const { text, unknown } = substitute(source);
    expect(text).toBe("a \\{\\{ nope \\}\\} b \\{\\{ constructor \\}\\}");
    expect(unknown).toEqual([
      { name: "nope", offset: 2 },
      { name: "constructor", offset: 15 },
    ]);
  });
});

describe("variables in frontmatter and settings", () => {
  test("fills plain values into frontmatter and keeps YAML-unsafe ones", () => {
    const source =
      '---\ntitle: "Ship {{ product }}"\ndescription: {{ tagline }}\n---\n\nBody {{ product }}';
    const result = substituteVariables(source, {
      product: "Acme Flow",
      tagline: "a: b",
    });
    expect(result.text).toContain('title: "Ship Acme Flow"');
    expect(result.text).toContain("description: {{ tagline }}");
    expect(result.text).toContain("Body Acme Flow");
    expect(result.unknown.map((entry) => entry.name)).toEqual(["tagline"]);
  });

  test("fills settings and reports unknown names", () => {
    expect(
      substituteSettingText("**{{ a }}** and {{ b }}", { a: "X" })
    ).toEqual({ text: "**X** and {{ b }}", unknown: ["b"] });
  });
});

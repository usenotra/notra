import { expect, test } from "bun:test";

import {
  buildSiteEntryMarkdown,
  extractMarkdownExcerpt,
  parseSiteConfigAuthors,
  readSiteEntryAuthor,
  resolveSiteAuthor,
  resolveSiteImagePathTemplate,
} from "./site-github-publish";

const DATE = new Date("2026-10-05T21:30:00.000Z");

test("adds frontmatter and drops the duplicate title heading", () => {
  const markdown = buildSiteEntryMarkdown({
    author: "jan",
    contentType: "blog_post",
    date: DATE,
    markdown: [
      '# Shipping "Sites"',
      "",
      "![Cover](/images/blog/shipping-sites/image-abc.png)",
      "",
      "We **now** host your [blog](https://example.com) and `changelog`.",
      "",
      "## Details",
    ].join("\n"),
    title: 'Shipping "Sites"',
  });
  expect(markdown).toBe(
    [
      "---",
      'title: "Shipping \\"Sites\\""',
      'description: "We now host your blog and changelog."',
      "date: 2026-10-05",
      'author: "jan"',
      'image: "/images/blog/shipping-sites/image-abc.png"',
      "---",
      "",
      "![Cover](/images/blog/shipping-sites/image-abc.png)",
      "",
      "We **now** host your [blog](https://example.com) and `changelog`.",
      "",
      "## Details",
    ].join("\n")
  );
});

test("changelogs get no author and relative images are skipped", () => {
  const markdown = buildSiteEntryMarkdown({
    author: "jan",
    contentType: "changelog",
    date: DATE,
    markdown: "![Shot](./shot.png)\n\nFixed things.",
    title: "v1.2",
  });
  expect(markdown).toBe(
    '---\ntitle: "v1.2"\ndescription: "Fixed things."\ndate: 2026-10-05\n---\n\n![Shot](./shot.png)\n\nFixed things.'
  );
});

test("keeps existing frontmatter and only fills in title and date", () => {
  const complete = "---\ntitle: Hi\ndate: 2024-01-01\n---\n# Hi\n";
  expect(
    buildSiteEntryMarkdown({
      contentType: "blog_post",
      date: DATE,
      markdown: complete,
      title: "Hi",
    })
  ).toBe(complete);
  expect(
    buildSiteEntryMarkdown({
      contentType: "blog_post",
      date: DATE,
      markdown: "---\ntags: [a]\n---\nBody",
      title: "Hi",
    })
  ).toBe('---\ntitle: "Hi"\ndate: 2026-10-05\ntags: [a]\n---\nBody');
});

test("excerpts stay under the limit on a word boundary", () => {
  const excerpt = extractMarkdownExcerpt(
    `## Heading\n\n${"word ".repeat(60)}`,
    40
  );
  expect(excerpt.length).toBeLessThanOrEqual(40);
  expect(excerpt).toBe("word word word word word word word word…");
});

test("matches blog.json authors by name", () => {
  const authors = parseSiteConfigAuthors(
    JSON.stringify({ name: "Acme", authors: { jan: { name: "Jan B" } } })
  );
  expect(resolveSiteAuthor(authors, "jan b")).toBe("jan");
  expect(resolveSiteAuthor(authors, "Dominik")).toBe("Dominik");
  expect(resolveSiteAuthor(authors, " ")).toBeNull();
  expect(parseSiteConfigAuthors("{not json")).toEqual({});
});

test("reads a single author back from an entry", () => {
  expect(readSiteEntryAuthor('---\ntitle: "A"\nauthor: "jan"\n---\n')).toBe(
    "jan"
  );
  expect(readSiteEntryAuthor("---\nauthor: jan # me\n---\n")).toBe("jan");
  expect(readSiteEntryAuthor("---\nauthor: [a, b]\n---\n")).toBeNull();
  expect(readSiteEntryAuthor("author: jan")).toBeNull();
});

test("site images live under the root's public folder", () => {
  expect(resolveSiteImagePathTemplate("docs", "blog_post")).toBe(
    "docs/public/images/blog/:slug/image"
  );
  expect(resolveSiteImagePathTemplate("", "changelog")).toBe(
    "public/images/changelog/:slug/image"
  );
});

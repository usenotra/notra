import { describe, expect, test } from "bun:test";

import { validateSite } from "@notra/sites-compiler/validate";
import { siteConfigSchema } from "@notra/sites-core/schemas/site-config";

import type { StarterBrandInput } from "../src/types/starter";
import {
  extractLandingPage,
  googleFontFamilies,
} from "../src/utils/landing-page";
import { normalizeWebsiteUrl, resolveLinkUrl } from "../src/utils/links";
import { isAccentColor, normalizeHexColor } from "../src/utils/starter-color";
import {
  buildSiteStarterFiles,
  buildStarterConfig,
  escapeMdxText,
} from "../src/utils/starter-files";

const LANDING_HTML = `<!doctype html>
<html lang="en">
<head>
  <title>Acme &amp; Co — Ship faster</title>
  <meta name="description" content="Acme helps teams ship.">
  <meta property="og:site_name" content="Acme">
  <meta name="theme-color" content="#FAFAFA" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#0a0a0a" media="(prefers-color-scheme: dark)">
  <meta name="theme-color" content="#2563eb">
  <link rel="icon" href="/favicon.ico" sizes="32x32">
  <link rel="icon" href="/icon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/apple-icon.png">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=Space+Grotesk&display=swap" rel="stylesheet">
  <script>document.write("<a href='/from-script'>Nope</a>")</script>
  <style>header a { color: red }</style>
</head>
<body>
  <header>
    <a href="/" aria-label="Acme home"><img src="/logo.svg" alt="Acme"></a>
    <nav class="hidden md:flex">
      <a href="/pricing">Pricing</a>
      <a href="/docs">Docs</a>
      <button aria-haspopup="menu">Products</button>
      <div aria-hidden="true">
        <a role="menuitem" href="/features/a">Feature A</a>
      </div>
      <a href="#top">Top</a>
      <a href="javascript:void(0)">Script</a>
      <a href="https://github.com/acme/acme"><svg><title>GitHub</title></svg></a>
      <a href="/signup">Get started</a>
    </nav>
  </header>
  <main>
    <article><footer><a href="/post-footer">Not the page footer</a></footer></article>
  </main>
  <footer>
    <a href="/privacy">Privacy</a>
    <a href="/terms">Terms &amp; conditions</a>
    <a href="/privacy">Privacy again</a>
    <a href="https://x.com/acme"><svg><title>X</title></svg></a>
    <a href="https://www.linkedin.com/company/acme">LinkedIn</a>
  </footer>
</body>
</html>`;

const EMPTY_BRAND: Omit<StarterBrandInput, "landing"> = {
  name: "Acme",
  description: null,
  websiteUrl: "https://acme.com/",
  logo: null,
  colors: {
    primary: null,
    primaryDark: null,
  },
  fonts: { heading: null, body: null },
};

function validate(files: { path: string; content: string }[]) {
  return validateSite({
    files: new Map(files.map((file) => [file.path, file.content])),
  });
}

describe("extractLandingPage", () => {
  const facts = extractLandingPage(LANDING_HTML, "https://acme.com/");

  test("reads the head", () => {
    expect(facts.title).toBe("Acme & Co — Ship faster");
    expect(facts.siteName).toBe("Acme");
    expect(facts.description).toBe("Acme helps teams ship.");
    expect(facts.iconUrl).toBe("https://acme.com/icon.svg");
    expect(facts.themeColor).toBe("#2563eb");
    expect(facts.fontFamilies).toEqual(["Inter", "Space Grotesk"]);
  });

  test("takes the header logo and visible header links, not menus or scripts", () => {
    expect(facts.headerLogoUrl).toBe("https://acme.com/logo.svg");
    expect(facts.navLinks).toEqual([
      { label: "Pricing", href: "https://acme.com/pricing" },
      { label: "Docs", href: "https://acme.com/docs" },
      { label: "GitHub", href: "https://github.com/acme/acme" },
    ]);
    expect(facts.cta).toEqual({
      label: "Get started",
      href: "https://acme.com/signup",
    });
  });

  test("reads the page footer, splitting socials from links", () => {
    expect(facts.footerLinks).toEqual([
      { label: "Privacy", href: "https://acme.com/privacy" },
      { label: "Terms & conditions", href: "https://acme.com/terms" },
    ]);
    expect(facts.socials).toEqual({
      x: "https://x.com/acme",
      linkedin: "https://www.linkedin.com/company/acme",
    });
  });

  test("caps header links at six", () => {
    const links = Array.from(
      { length: 10 },
      (_, index) => `<a href="/l${index}">Link ${index}</a>`
    ).join("");
    const many = extractLandingPage(
      `<header>${links}</header>`,
      "https://acme.com/"
    );
    expect(many.navLinks).toHaveLength(6);
  });

  test("survives garbage", () => {
    const garbage = extractLandingPage(
      "<<<a href=<footer></a><meta",
      "https://acme.com/"
    );
    expect(garbage.navLinks).toEqual([]);
  });

  test("font stylesheets use the resolved hostname rather than a URL substring", () => {
    const html = [
      '<link href="https://fonts.googleapis.com.evil.example/css?family=Wrong">',
      '<link href="https://evil.example/fonts.googleapis.com?family=Wrong">',
      '<link href="/css?family=Wrong">',
      '<link href="//fonts.googleapis.com/css2?family=Inter">',
    ].join("");
    expect(extractLandingPage(html, "https://acme.com/").fontFamilies).toEqual([
      "Inter",
    ]);
  });

  test("multiple mixed-case script and style blocks do not become page links", () => {
    const html = `<header>
      <SCRIPT>const markup = '<a href="/hidden-one">Hidden</a>';</SCRIPT>
      <style>a::before { content: '<a href="/hidden-two">Hidden</a>'; }</style>
      <script>const markup = '<a href="/hidden-three">Hidden</a>';</script>
      <a href="/docs">Docs</a>
    </header>`;
    expect(extractLandingPage(html, "https://acme.com/").navLinks).toEqual([
      { label: "Docs", href: "https://acme.com/docs" },
    ]);
  });
});

describe("url helpers", () => {
  test("resolveLinkUrl keeps http(s) and mailto, drops the rest", () => {
    expect(resolveLinkUrl("/a#b", "https://acme.com/x/")).toBe(
      "https://acme.com/a"
    );
    expect(resolveLinkUrl("mailto:hi@acme.com", "https://acme.com")).toBe(
      "mailto:hi@acme.com"
    );
    const scriptUrl = ["javascript", "alert(1)"].join(":");
    expect(resolveLinkUrl(scriptUrl, "https://acme.com")).toBe(null);
    expect(
      resolveLinkUrl("http://acme.com/i.png", "https://acme.com", {
        httpsOnly: true,
      })
    ).toBe(null);
    expect(resolveLinkUrl('/a"onload="x', "https://acme.com")).toBe(
      "https://acme.com/a%22onload=%22x"
    );
  });

  test("normalizeWebsiteUrl adds or upgrades to https", () => {
    expect(normalizeWebsiteUrl("acme.com")).toBe("https://acme.com/");
    expect(normalizeWebsiteUrl("http://acme.com/a")).toBe("https://acme.com/a");
    expect(normalizeWebsiteUrl("ftp://acme.com")).toBe(null);
    expect(normalizeWebsiteUrl("  ")).toBe(null);
  });

  test("googleFontFamilies reads css and css2 URLs", () => {
    expect(
      googleFontFamilies(
        "https://fonts.googleapis.com/css?family=Roboto:400,700|Open+Sans"
      )
    ).toEqual(["Roboto", "Open Sans"]);
    expect(googleFontFamilies("https://evil.example/css?family=X")).toEqual([]);
  });
});

describe("colors", () => {
  test("normalizeHexColor", () => {
    expect(normalizeHexColor("#ABC")).toBe("#aabbcc");
    expect(normalizeHexColor("#11223344")).toBe("#112233");
    expect(normalizeHexColor("rgb(37, 99, 235)")).toBe("#2563eb");
    expect(normalizeHexColor("oklch(0.6 0.2 260)")).toBe(null);
  });

  test("isAccentColor rejects page backgrounds", () => {
    expect(isAccentColor("#2563eb")).toBe(true);
    expect(isAccentColor("#f7f5f3")).toBe(false);
    expect(isAccentColor("#1f1a17")).toBe(false);
    expect(isAccentColor("#808080")).toBe(false);
  });
});

describe("buildSiteStarterFiles", () => {
  const landing = extractLandingPage(LANDING_HTML, "https://acme.com/");

  test("uses the page when the brand has nothing", () => {
    const config = siteConfigSchema.parse(
      buildStarterConfig({ ...EMPTY_BRAND, landing })
    );
    expect(config.name).toBe("Acme");
    expect(config.colors.primary).toBe("#2563eb");
    expect(config.background.color).toBeUndefined();
    expect(config.fonts?.family).toBe("Inter");
    expect(config.favicon).toBe("https://acme.com/icon.svg");
    expect(config.footer.socials.x).toBe("https://x.com/acme");
  });

  test("brand identity wins over the page", () => {
    const config = siteConfigSchema.parse(
      buildStarterConfig({
        ...EMPTY_BRAND,
        description: "From the brand profile.",
        logo: {
          light: "https://cdn.acme.com/mark.svg",
          dark: "https://cdn.acme.com/mark-dark.svg",
          wordmark: false,
        },
        colors: {
          primary: "#FF5500",
          primaryDark: "#ff8844",
        },
        fonts: { heading: "Space Grotesk", body: "Helvetica" },
        landing,
      })
    );
    expect(config.description).toBe("From the brand profile.");
    expect(config.colors).toEqual({ primary: "#ff5500", light: "#ff8844" });
    expect(config.logo).toEqual({
      light: "https://cdn.acme.com/mark.svg",
      dark: "https://cdn.acme.com/mark-dark.svg",
      href: "https://acme.com/",
    });
    expect(config.fonts?.family).toBe("Space Grotesk");
  });

  test("all files pass the site validator", () => {
    const { files } = buildSiteStarterFiles(
      { ...EMPTY_BRAND, landing },
      new Date("2026-10-05T12:00:00Z")
    );
    expect(files.map((file) => file.path)).toEqual([
      "blog.json",
      "header.mdx",
      "footer.mdx",
      "blog/hello-world.md",
    ]);
    const result = validate(files);
    expect(result.diagnostics).toEqual([]);
    expect(result.ok).toBe(true);
    const header = files.find((file) => file.path === "header.mdx")?.content;
    expect(header).toContain('href="https://acme.com/pricing"');
    expect(header).toContain(">Get started</a>");
    expect(header).not.toContain("<script");
  });

  test("hostile labels and names stay valid MDX", () => {
    const hostile = {
      ...landing,
      siteName: null,
      navLinks: [
        { label: "{process.exit()}", href: "https://acme.com/a" },
        { label: "<script>x</script>", href: "https://acme.com/b" },
        { label: "*bold* [link](x) `code`", href: "https://acme.com/c" },
      ],
      footerLinks: [{ label: "import x from 'y'", href: "https://acme.com/d" }],
    };
    const { files } = buildSiteStarterFiles({
      ...EMPTY_BRAND,
      name: 'Acme {"} <b>',
      landing: hostile,
    });
    const result = validate(files);
    expect(result.diagnostics).toEqual([]);
    expect(files[1]?.content).not.toContain("{process");
  });

  test("works with no brand data and no landing page", () => {
    const { files } = buildSiteStarterFiles({
      ...EMPTY_BRAND,
      name: "",
      websiteUrl: null,
      landing: null,
    });
    expect(JSON.parse(files[0]?.content ?? "{}").name).toBe("My site");
    expect(validate(files).ok).toBe(true);
  });

  test("escapeMdxText keeps letters and escapes syntax", () => {
    expect(escapeMdxText("Über uns")).toBe("Über uns");
    expect(escapeMdxText("a{b}")).toBe("a&#123;b&#125;");
  });
});

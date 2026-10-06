import { SITE_DEFAULT_PRIMARY_COLOR } from "@notra/sites-core/constants/site-config";
import { SITE_CONFIG_FILENAME } from "@notra/sites-core/constants/sites";
import { siteConfigSchema } from "@notra/sites-core/schemas/site-config";

import {
  STARTER_DESCRIPTION_MAX_LENGTH,
  STARTER_FOOTER_DESCRIPTION_MAX_LENGTH,
  STARTER_LINK_CLASS,
  STARTER_MAX_URL_LENGTH,
  STARTER_MDX_SAFE_CHAR,
  STARTER_NAME_MAX_LENGTH,
  STARTER_SAMPLE_POST_PATH,
  STARTER_SYSTEM_FONTS,
} from "../constants/starter";
import type {
  SiteStarterFiles,
  StarterBrandInput,
  StarterLink,
} from "../types/starter";
import { resolveLinkUrl } from "./links";
import { isAccentColor, normalizeHexColor } from "./starter-color";

export function escapeMdxText(value: string): string {
  let result = "";
  for (const char of value) {
    result += STARTER_MDX_SAFE_CHAR.test(char)
      ? char
      : `&#${char.codePointAt(0) ?? 32};`;
  }
  return result;
}

function attributeText(value: string): string {
  return value.replace(/["{}<>\\`]/g, "").trim();
}

function truncate(value: string, max: number): string {
  if (value.length <= max) {
    return value;
  }
  const cut = value.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max / 2 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

function httpsAsset(url: string | null | undefined): string | null {
  if (!url) {
    return null;
  }
  return resolveLinkUrl(url, "https://invalid.example", { httpsOnly: true });
}

function webFont(family: string | null | undefined): string | null {
  const trimmed = family?.trim() ?? "";
  if (!trimmed || trimmed.length > STARTER_NAME_MAX_LENGTH) {
    return null;
  }
  return STARTER_SYSTEM_FONTS.has(trimmed.toLowerCase()) ? null : trimmed;
}

function resolveColors(input: StarterBrandInput) {
  const landing = input.landing;
  const landingAccent = normalizeHexColor(landing?.themeColor);
  const primary =
    normalizeHexColor(input.colors.primary) ??
    (landingAccent && isAccentColor(landingAccent) ? landingAccent : null) ??
    SITE_DEFAULT_PRIMARY_COLOR;
  const primaryDark = normalizeHexColor(input.colors.primaryDark);
  return { primary, primaryDark };
}

function resolveFonts(input: StarterBrandInput) {
  const pageFonts = (input.landing?.fontFamilies ?? [])
    .map(webFont)
    .filter((family): family is string => family !== null);
  const heading = webFont(input.fonts.heading);
  const body = webFont(input.fonts.body);
  if (heading || body) {
    return {
      heading: heading ?? body,
      body: body ?? heading,
    };
  }
  if (pageFonts.length === 0) {
    return null;
  }
  return { heading: pageFonts[0] ?? null, body: pageFonts[0] ?? null };
}

function resolveLogo(input: StarterBrandInput) {
  if (input.logo) {
    const light = httpsAsset(input.logo.light);
    if (light) {
      return {
        light,
        dark: httpsAsset(input.logo.dark) ?? light,
        wordmark: input.logo.wordmark,
      };
    }
  }
  const fromPage =
    httpsAsset(input.landing?.headerLogoUrl) ??
    httpsAsset(input.landing?.iconUrl);
  return fromPage ? { light: fromPage, dark: fromPage, wordmark: false } : null;
}

function homeUrl(input: StarterBrandInput): string | null {
  return input.websiteUrl
    ? resolveLinkUrl(input.websiteUrl, input.websiteUrl)
    : null;
}

function siteName(input: StarterBrandInput): string {
  const name =
    input.name.trim() ||
    input.landing?.siteName?.trim() ||
    input.landing?.title?.split(/[|–—-]/)[0]?.trim() ||
    "My site";
  return truncate(name, STARTER_NAME_MAX_LENGTH);
}

function siteDescription(input: StarterBrandInput): string | null {
  const description =
    input.description?.trim() || input.landing?.description?.trim() || "";
  return description
    ? truncate(description, STARTER_DESCRIPTION_MAX_LENGTH)
    : null;
}

export function buildStarterConfig(input: StarterBrandInput) {
  const name = siteName(input);
  const description = siteDescription(input);
  const home = homeUrl(input);
  const logo = resolveLogo(input);
  const favicon = httpsAsset(input.landing?.iconUrl);
  const colors = resolveColors(input);
  const fonts = resolveFonts(input);

  const config: Record<string, unknown> = { name };
  if (description) {
    config.description = description;
  }
  if (logo) {
    config.logo = {
      light: logo.light,
      dark: logo.dark,
      ...(home ? { href: home } : {}),
    };
  }
  if (favicon && favicon.length <= STARTER_MAX_URL_LENGTH) {
    config.favicon = favicon;
  }
  config.colors = {
    primary: colors.primary,
    ...(colors.primaryDark ? { light: colors.primaryDark } : {}),
  };
  if (fonts) {
    config.fonts =
      fonts.heading === fonts.body
        ? { family: fonts.body }
        : {
            heading: { family: fonts.heading },
            body: { family: fonts.body },
          };
  }
  const socials = input.landing?.socials ?? {};
  if (Object.keys(socials).length > 0) {
    config.footer = { socials };
  }
  config.blog = {
    title: `${truncate(name, STARTER_NAME_MAX_LENGTH - 5)} Blog`,
    ...(description ? { description } : {}),
  };

  const parsed = siteConfigSchema.safeParse(config);
  if (parsed.success) {
    return config;
  }
  return description ? { name, description } : { name };
}

function renderLink(link: StarterLink, indent: string): string {
  return `${indent}<a href="${link.href}" className="${STARTER_LINK_CLASS}">${escapeMdxText(link.label)}</a>`;
}

function renderLogo(input: StarterBrandInput, name: string): string[] {
  const logo = resolveLogo(input);
  const lines: string[] = [];
  const alt = logo?.wordmark ? attributeText(name) : "";
  const sizeClass = logo?.wordmark ? "h-6 w-auto" : "size-6 rounded-md";
  if (logo && logo.dark !== logo.light) {
    lines.push(
      `      <img src="${logo.light}" alt="${alt}" className="${sizeClass} object-contain dark:hidden" />`,
      `      <img src="${logo.dark}" alt="${alt}" className="${sizeClass} hidden object-contain dark:block" />`
    );
  } else if (logo) {
    lines.push(
      `      <img src="${logo.light}" alt="${alt}" className="${sizeClass} object-contain" />`
    );
  }
  if (!logo?.wordmark) {
    lines.push(`      <span>${escapeMdxText(name)}</span>`);
  }
  return lines;
}

function buildStarterHeader(input: StarterBrandInput): string {
  const name = siteName(input);
  const home = homeUrl(input) ?? "/";
  const links = input.landing?.navLinks ?? [];
  const cta = input.landing?.cta ?? null;
  const lines = [
    `<header className="border-b border-border">`,
    `  <div className="site-container flex h-14 items-center gap-6">`,
    `    <a href="${home}" className="flex items-center gap-2.5 text-[0.9375rem] font-semibold tracking-tight">`,
    ...renderLogo(input, name),
    "    </a>",
    "    <SiteAreas />",
  ];
  if (links.length > 0) {
    lines.push(
      `    <nav aria-label="Main" className="ml-auto hidden items-center gap-5 text-sm md:flex">`,
      ...links.map((link) => renderLink(link, "      ")),
      "    </nav>"
    );
  }
  if (cta) {
    lines.push(
      `    <a href="${cta.href}" className="${links.length > 0 ? "" : "ml-auto "}rounded-full bg-primary-button px-3.5 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90">${escapeMdxText(cta.label)}</a>`
    );
  }
  lines.push(
    links.length > 0 || cta
      ? "    <ThemeToggle />"
      : `    <div className="ml-auto"><ThemeToggle /></div>`,
    "  </div>",
    "</header>",
    ""
  );
  return lines.join("\n");
}

function buildStarterFooter(input: StarterBrandInput): string {
  const name = siteName(input);
  const description = siteDescription(input);
  const home = homeUrl(input) ?? "/";
  const links = input.landing?.footerLinks ?? [];
  const lines = [
    `<footer className="border-t border-border">`,
    `  <div className="site-container flex flex-col gap-8 py-10 text-sm sm:flex-row sm:justify-between">`,
    `    <div className="max-w-xs space-y-2">`,
    `      <a href="${home}" className="font-semibold text-foreground">${escapeMdxText(name)}</a>`,
  ];
  if (description) {
    lines.push(
      `      <p className="text-muted-foreground">${escapeMdxText(truncate(description, STARTER_FOOTER_DESCRIPTION_MAX_LENGTH))}</p>`
    );
  }
  lines.push("    </div>");
  if (links.length > 0) {
    lines.push(
      `    <nav aria-label="Footer" className="grid grid-cols-2 gap-x-10 gap-y-2 sm:grid-cols-3">`,
      ...links.map((link) => renderLink(link, "      ")),
      "    </nav>"
    );
  }
  lines.push(
    "  </div>",
    `  <p className="site-container pb-8 text-xs text-muted-foreground">${escapeMdxText(`© ${name}`)}</p>`,
    "</footer>",
    ""
  );
  return lines.join("\n");
}

function buildStarterPost(input: StarterBrandInput, now: Date): string {
  const name = siteName(input);
  const date = now.toISOString().slice(0, 10);
  return [
    "---",
    `title: ${JSON.stringify(`Welcome to the ${name} blog`)}`,
    `description: ${JSON.stringify(`The first post on the ${name} blog.`)}`,
    `date: ${date}`,
    "---",
    "",
    `Notra Sites builds this blog from this repository. Every Markdown file in \`blog/\` becomes a post.`,
    "",
    "## Where things live",
    "",
    "- `blog.json` sets the name, logo, colors and fonts.",
    "- `header.mdx` and `footer.mdx` are the header and footer, written in MDX with Tailwind classes.",
    "- `blog/` holds the posts. Each one starts with a title, a description and a date.",
    "",
    "Edit or delete this post once you have written your first real one.",
    "",
  ].join("\n");
}

export function buildSiteStarterFiles(
  input: StarterBrandInput,
  now: Date = new Date()
): SiteStarterFiles {
  return {
    files: [
      {
        path: SITE_CONFIG_FILENAME,
        content: `${JSON.stringify(buildStarterConfig(input), null, 2)}\n`,
      },
      { path: "header.mdx", content: buildStarterHeader(input) },
      { path: "footer.mdx", content: buildStarterFooter(input) },
      { path: STARTER_SAMPLE_POST_PATH, content: buildStarterPost(input, now) },
    ],
  };
}

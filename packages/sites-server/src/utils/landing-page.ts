import {
  GOOGLE_FONTS_STYLESHEET_HREF,
  STARTER_CTA_LABEL,
  STARTER_MAX_FOOTER_LINKS,
  STARTER_MAX_LABEL_LENGTH,
  STARTER_MAX_NAV_LINKS,
  STARTER_SOCIAL_HOSTS,
} from "../constants/starter";
import type {
  CapturedAnchor,
  IconCandidate,
  LandingPageFacts,
  LandingPageFrame,
  OpenAnchor,
  StarterLink,
  StarterSocialPlatform,
} from "../types/starter";
import { collapseHtmlText, tokenizeHtml } from "./html";
import { bareHostname, resolveLinkUrl } from "./links";
import { normalizeHexColor } from "./starter-color";

function socialPlatform(url: string): StarterSocialPlatform | null {
  const host = bareHostname(url);
  if (!host) {
    return null;
  }
  for (const [domain, platform] of STARTER_SOCIAL_HOSTS) {
    if (host === domain || host.endsWith(`.${domain}`)) {
      return platform;
    }
  }
  return null;
}

function isHomeLink(url: string, pageUrl: string): boolean {
  try {
    const target = new URL(url);
    return (
      bareHostname(url) === bareHostname(pageUrl) &&
      (target.pathname === "/" || target.pathname === "") &&
      !target.search
    );
  } catch {
    return false;
  }
}

function clampLabel(label: string): string | null {
  if (!label) {
    return null;
  }
  return label.length > STARTER_MAX_LABEL_LENGTH ? null : label;
}

export function googleFontFamilies(href: string): string[] {
  let url: URL;
  try {
    url = new URL(href, "https://fonts.googleapis.com");
  } catch {
    return [];
  }
  if (url.hostname !== "fonts.googleapis.com") {
    return [];
  }
  const families: string[] = [];
  for (const value of url.searchParams.getAll("family")) {
    for (const part of value.split("|")) {
      const family = part.split(":")[0]?.trim();
      if (family && !families.includes(family)) {
        families.push(family);
      }
    }
  }
  return families;
}

function iconSize(sizes: string): number {
  const match = /(\d+)x(\d+)/i.exec(sizes);
  return match ? Number(match[1]) : 0;
}

function pickIcon(icons: IconCandidate[]): string | null {
  const svg = icons.find(
    (icon) => icon.type === "image/svg+xml" || /\.svg(?:$|\?)/i.test(icon.href)
  );
  if (svg) {
    return svg.href;
  }
  const touch = icons.find((icon) => icon.rel.includes("apple-touch-icon"));
  if (touch) {
    return touch.href;
  }
  const [largest] = [...icons].sort((a, b) => b.size - a.size);
  return largest?.href ?? null;
}

function dedupeLinks(links: StarterLink[], limit: number): StarterLink[] {
  const seen = new Set<string>();
  const result: StarterLink[] = [];
  for (const link of links) {
    if (seen.has(link.href)) {
      continue;
    }
    seen.add(link.href);
    result.push(link);
    if (result.length >= limit) {
      break;
    }
  }
  return result;
}

function isHiddenElement(attrs: Map<string, string>): boolean {
  return (
    attrs.get("aria-hidden") === "true" ||
    attrs.has("hidden") ||
    attrs.has("inert")
  );
}

export function extractLandingPage(
  html: string,
  pageUrl: string
): LandingPageFacts {
  const facts: LandingPageFacts = {
    title: null,
    siteName: null,
    description: null,
    headerLogoUrl: null,
    iconUrl: null,
    themeColor: null,
    fontFamilies: [],
    navLinks: [],
    cta: null,
    footerLinks: [],
    socials: {},
  };
  let baseUrl = pageUrl;
  const stack: LandingPageFrame[] = [];
  const icons: IconCandidate[] = [];
  const anchors: CapturedAnchor[] = [];
  let anchor: OpenAnchor | null = null;
  let titleText: string[] | null = null;
  let headerDepth: number | null = -1;
  let navDepth: number | null = -1;
  let footerDepth: number | null = null;
  let footerCount = 0;
  let svgDepth: number | null = null;
  let svgTitleDepth: number | null = null;

  const inRegion = (depth: number | null) =>
    depth !== null && depth >= 0 && stack.length > depth;

  for (const token of tokenizeHtml(html)) {
    if (token.kind === "text") {
      if (titleText) {
        titleText.push(token.text);
      }
      if (anchor) {
        if (svgTitleDepth !== null) {
          anchor.svgTitle.push(token.text);
        } else if (svgDepth === null) {
          anchor.text.push(token.text);
        }
      }
      continue;
    }

    if (token.kind === "close") {
      const index = stack.findLastIndex((frame) => frame.name === token.name);
      if (index === -1) {
        continue;
      }
      stack.length = index;
      if (token.name === "title" && titleText) {
        facts.title ??= collapseHtmlText(titleText.join("")) || null;
        titleText = null;
      }
      if (svgTitleDepth !== null && stack.length <= svgTitleDepth) {
        svgTitleDepth = null;
      }
      if (svgDepth !== null && stack.length <= svgDepth) {
        svgDepth = null;
      }
      if (token.name === "a" && anchor) {
        const label = clampLabel(
          collapseHtmlText(anchor.text.join("")) ||
            anchor.ariaLabel ||
            collapseHtmlText(anchor.svgTitle.join(""))
        );
        const { ariaLabel, text, svgTitle, ...captured } = anchor;
        anchors.push({ ...captured, label: label ?? "" });
        anchor = null;
      }
      if (
        headerDepth !== null &&
        headerDepth >= 0 &&
        stack.length <= headerDepth
      ) {
        headerDepth = null;
      }
      if (navDepth !== null && navDepth >= 0 && stack.length <= navDepth) {
        navDepth = null;
      }
      if (footerDepth !== null && stack.length <= footerDepth) {
        footerDepth = null;
      }
      continue;
    }

    const { name, attrs } = token;
    const parentHidden = stack.at(-1)?.hidden ?? false;
    const hidden = parentHidden || isHiddenElement(attrs);

    if (name === "base" && attrs.get("href")) {
      baseUrl = resolveLinkUrl(attrs.get("href") ?? "", pageUrl) ?? baseUrl;
    } else if (name === "link") {
      const rel = (attrs.get("rel") ?? "").toLowerCase();
      const href = attrs.get("href") ?? "";
      if (
        rel
          .split(/\s+/)
          .some(
            (value) => value === "icon" || value.startsWith("apple-touch-icon")
          )
      ) {
        const resolved = resolveLinkUrl(href, baseUrl, { httpsOnly: true });
        if (resolved) {
          icons.push({
            href: resolved,
            rel,
            type: (attrs.get("type") ?? "").toLowerCase(),
            size: iconSize(attrs.get("sizes") ?? ""),
          });
        }
      } else {
        for (const family of googleFontFamilies(
          resolveLinkUrl(href, baseUrl) ?? ""
        )) {
          if (!facts.fontFamilies.includes(family)) {
            facts.fontFamilies.push(family);
          }
        }
      }
    } else if (name === "meta") {
      readMeta(attrs, facts);
    } else if (name === "img" && inRegion(headerDepth) && !hidden) {
      facts.headerLogoUrl ??= resolveLinkUrl(attrs.get("src") ?? "", baseUrl, {
        httpsOnly: true,
      });
    }

    if (token.void) {
      continue;
    }
    stack.push({ name, hidden });

    if (name === "title" && svgDepth !== null) {
      svgTitleDepth = stack.length - 1;
    } else if (name === "title" && !titleText && facts.title === null) {
      titleText = [];
    } else if (name === "header" && headerDepth === -1) {
      headerDepth = stack.length - 1;
    } else if (name === "nav" && navDepth === -1) {
      navDepth = stack.length - 1;
    } else if (name === "footer" && footerDepth === null) {
      footerDepth = stack.length - 1;
      footerCount += 1;
    } else if (name === "svg" && svgDepth === null) {
      svgDepth = stack.length - 1;
    } else if (name === "a" && !anchor) {
      const href = resolveLinkUrl(attrs.get("href") ?? "", baseUrl);
      if (href) {
        anchor = {
          href,
          ariaLabel: collapseHtmlText(attrs.get("aria-label") ?? ""),
          hidden,
          menuItem: (attrs.get("role") ?? "").startsWith("menuitem"),
          text: [],
          svgTitle: [],
          inHeader: inRegion(headerDepth),
          inNav: inRegion(navDepth),
          footerIndex: footerDepth === null ? null : footerCount,
        };
      }
    }
  }

  facts.iconUrl = pickIcon(icons);
  collectHeaderLinks(anchors, pageUrl, facts);
  collectFooterLinks(anchors, footerCount, facts);
  return facts;
}

function readMeta(attrs: Map<string, string>, facts: LandingPageFacts): void {
  const key = (attrs.get("name") ?? attrs.get("property") ?? "").toLowerCase();
  const content = collapseHtmlText(attrs.get("content") ?? "");
  if (!content) {
    return;
  }
  if (key === "theme-color") {
    if (!attrs.has("media")) {
      facts.themeColor ??= normalizeHexColor(content);
    }
  } else if (key === "og:site_name" || key === "application-name") {
    facts.siteName ??= content;
  } else if (key === "description" || key === "og:description") {
    facts.description ??= content;
  }
}

function collectHeaderLinks(
  anchors: CapturedAnchor[],
  pageUrl: string,
  facts: LandingPageFacts
): void {
  const usable = (candidate: CapturedAnchor) =>
    !(candidate.hidden || candidate.menuItem) &&
    candidate.label !== "" &&
    !isHomeLink(candidate.href, pageUrl);
  const inHeader = anchors.filter(
    (candidate) => candidate.inHeader && usable(candidate)
  );
  const candidates =
    inHeader.length > 0
      ? inHeader
      : anchors.filter((candidate) => candidate.inNav && usable(candidate));
  const links: StarterLink[] = [];
  for (const candidate of candidates) {
    const link = { label: candidate.label, href: candidate.href };
    if (STARTER_CTA_LABEL.test(candidate.label)) {
      facts.cta = link;
      continue;
    }
    links.push(link);
  }
  facts.navLinks = dedupeLinks(
    links.filter((link) => link.href !== facts.cta?.href),
    STARTER_MAX_NAV_LINKS
  );
}

function collectFooterLinks(
  anchors: CapturedAnchor[],
  footerCount: number,
  facts: LandingPageFacts
): void {
  const inFooter = anchors.filter(
    (candidate) => candidate.footerIndex === footerCount && !candidate.hidden
  );
  const links: StarterLink[] = [];
  for (const candidate of inFooter) {
    const platform = socialPlatform(candidate.href);
    if (platform) {
      facts.socials[platform] ??= candidate.href;
      continue;
    }
    if (candidate.label) {
      links.push({ label: candidate.label, href: candidate.href });
    }
  }
  facts.footerLinks = dedupeLinks(links, STARTER_MAX_FOOTER_LINKS);
}

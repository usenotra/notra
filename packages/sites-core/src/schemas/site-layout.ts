import {
  SITE_HEX_COLOR,
  SITE_ICON_NAME,
  SITE_LINK_HREF,
} from "@notra/sites-core/constants/site-config";
import {
  SITE_CONTEXTUAL_OPTIONS,
  SITE_NAVBAR_LINK_TYPES,
  SITE_SOCIAL_PLATFORMS,
} from "@notra/sites-core/constants/site-layout";
import { z } from "zod";

export const sitePathSchema = z.string().trim().min(1).max(300);

const href = z
  .string()
  .trim()
  .regex(SITE_LINK_HREF, "Use an absolute https:// URL or a path");
const icon = z
  .string()
  .trim()
  .regex(SITE_ICON_NAME, "Use a Lucide icon name like book-open");
const colorByMode = z.union([
  z.string().regex(SITE_HEX_COLOR),
  z.object({
    light: z.string().regex(SITE_HEX_COLOR),
    dark: z.string().regex(SITE_HEX_COLOR),
  }),
]);

const siteLinkSchema = z.object({
  label: z.string().trim().min(1).max(60),
  href,
  icon: icon.optional(),
});

const siteNavbarLinkSchema = z.union([
  siteLinkSchema,
  z.object({
    type: z.enum(SITE_NAVBAR_LINK_TYPES),
    href: z.url(),
    label: z.string().trim().min(1).max(60).optional(),
  }),
]);

export const siteNavbarSchema = z
  .object({
    links: z.array(siteNavbarLinkSchema).max(8).default([]),
    cta: siteLinkSchema.optional(),
    primary: z
      .object({ type: z.enum(SITE_NAVBAR_LINK_TYPES), href: z.url() })
      .optional(),
  })
  .default({ links: [] });

const footerColumnSchema = z.object({
  header: z.string().trim().min(1).max(60).optional(),
  items: z.array(siteLinkSchema).min(1).max(12),
});

export const siteFooterSchema = z
  .object({
    links: z
      .union([
        z.array(siteLinkSchema).max(16),
        z.array(footerColumnSchema).max(6),
      ])
      .default([]),
    socials: z
      .partialRecord(z.enum(SITE_SOCIAL_PLATFORMS), z.url())
      .default({}),
  })
  .default({ links: [], socials: {} });

export const siteBannerSchema = z.object({
  content: z.string().trim().min(1).max(300),
  dismissible: z.boolean().default(false),
  type: z.enum(["info", "warning", "critical"]).default("info"),
  color: colorByMode.optional(),
});

export const siteContextualSchema = z
  .object({
    options: z
      .array(
        z.union([
          z.enum(SITE_CONTEXTUAL_OPTIONS),
          z.object({
            title: z.string().trim().min(1).max(60),
            description: z.string().trim().max(120).optional(),
            icon: icon.optional(),
            href: z
              .string()
              .trim()
              .max(500)
              .regex(
                /^(?:https?:\/\/|\/(?!\/)|mailto:)/,
                "Use an https:// URL or a path. Notra fills in {url} and {markdownUrl}."
              ),
          }),
        ])
      )
      .max(12)
      .default(["copy", "view", "chatgpt", "claude", "perplexity", "grok"]),
    display: z.enum(["meta", "none"]).default("meta"),
  })
  .default({
    options: ["copy", "view", "chatgpt", "claude", "perplexity", "grok"],
    display: "meta",
  });

export const siteSeoSchema = z
  .object({
    metatags: z
      .record(z.string().regex(/^[a-z][a-z0-9:_.-]*$/i), z.string().max(500))
      .default({}),
    indexing: z.enum(["navigable", "all"]).default("navigable"),
    organization: z
      .object({
        name: z.string().trim().min(1).max(120),
        legalName: z.string().trim().max(160).optional(),
        url: z.url().optional(),
        logo: sitePathSchema.optional(),
        sameAs: z.array(z.url()).max(12).default([]),
      })
      .optional(),
  })
  .default({ metatags: {}, indexing: "navigable" });

export const siteErrorsSchema = z
  .object({
    404: z
      .object({
        title: z.string().trim().max(120).optional(),
        description: z.string().trim().max(300).optional(),
        redirect: z.boolean().default(false),
      })
      .default({ redirect: false }),
  })
  .default({ 404: { redirect: false } });

export const siteThumbnailsSchema = z
  .object({
    enabled: z.boolean().default(true),
    appearance: z.enum(["light", "dark"]).default("light"),
    background: sitePathSchema.optional(),
    font: z.string().trim().max(80).optional(),
  })
  .default({ enabled: true, appearance: "light" });

export const siteMarkdownSchema = z
  .object({
    instructions: z
      .union([
        z.string().trim().max(2000),
        z.array(z.string().trim().max(500)).max(20),
      ])
      .optional(),
  })
  .default({});

export const siteVariablesSchema = z
  .record(
    z.string().regex(/^[A-Za-z][A-Za-z0-9_-]{0,39}$/),
    z.string().max(500)
  )
  .default({});

export const siteLayoutSchema = z
  .object({
    width: z
      .union([z.number().min(40).max(120), z.literal("full")])
      .default(72),
  })
  .default({ width: 72 });

const blogHeroSchema = z
  .object({
    style: z.enum(["wash", "plain", "image", "none"]).default("plain"),
    eyebrow: z.string().trim().max(60).optional(),
    image: sitePathSchema.optional(),
  })
  .default({ style: "plain" });

export const siteBlogSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(400).optional(),
  layout: z.enum(["grid", "list", "magazine"]).default("grid"),
  hero: blogHeroSchema,
  featured: z
    .union([
      z.enum(["latest", "none"]),
      z.array(z.string().trim().min(1)).max(6),
    ])
    .default("none"),
  card: z
    .object({
      image: z.boolean().default(false),
      excerpt: z.boolean().default(true),
      author: z.boolean().default(true),
      date: z.boolean().default(true),
      readingTime: z.boolean().default(false),
    })
    .default({
      image: false,
      excerpt: true,
      author: true,
      date: true,
      readingTime: false,
    }),
  post: z
    .object({
      toc: z.boolean().default(true),
      authorCard: z.boolean().default(true),
      readingTime: z.boolean().default(true),
      pagination: z.boolean().default(true),
      width: z.enum(["narrow", "wide"]).default("wide"),
    })
    .default({
      toc: true,
      authorCard: true,
      readingTime: true,
      pagination: true,
      width: "wide",
    }),
});

export const siteChangelogSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(400).optional(),
  layout: z.enum(["timeline", "cards", "compact"]).default("timeline"),
  hero: blogHeroSchema,
});

export const siteMetadataSchema = z
  .object({
    timestamp: z.boolean().default(true),
  })
  .default({ timestamp: true });

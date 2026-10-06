import {
  SITE_AUTHOR_ID,
  SITE_DEFAULT_PRIMARY_COLOR,
  SITE_HEX_COLOR,
  SITE_LINK_HREF,
} from "@notra/sites-core/constants/site-config";
import {
  siteIntegrationsSchema,
  siteSecuritySchema,
} from "@notra/sites-core/schemas/site-integrations";
import {
  siteBannerSchema,
  siteBlogSchema,
  siteChangelogSchema,
  siteContextualSchema,
  siteErrorsSchema,
  siteFooterSchema,
  siteLayoutSchema,
  siteMarkdownSchema,
  siteMetadataSchema,
  siteNavbarSchema,
  sitePathSchema,
  siteSeoSchema,
  siteThumbnailsSchema,
  siteVariablesSchema,
} from "@notra/sites-core/schemas/site-layout";
import { z } from "zod";

const redirectSchema = z.object({
  source: z.string().trim().startsWith("/"),
  destination: z
    .string()
    .trim()
    .regex(SITE_LINK_HREF, "Use an absolute https:// URL or a path"),
  permanent: z.boolean().default(true),
});

const siteAuthorSchema = z.strictObject({
  name: z.string().trim().min(1).max(80),
  title: z.string().trim().max(80).optional(),
  avatar: z
    .string()
    .trim()
    .regex(
      /^(?:\/(?!\/)|https:\/\/)/,
      "Use a path like /images/jan.jpg or an https:// URL"
    )
    .optional(),
  bio: z.string().trim().max(300).optional(),
  url: z.url().optional(),
  x: z.url().optional(),
  linkedin: z.url().optional(),
  github: z.url().optional(),
});
const imageByModeSchema = z.object({
  light: sitePathSchema,
  dark: sitePathSchema,
});

const fontSpecSchema = z.object({
  family: z.string().trim().min(1).max(80),
  weight: z.number().int().min(100).max(900).optional(),
  source: z.string().trim().min(1).optional(),
  format: z.enum(["woff", "woff2"]).optional(),
});

const appearanceSchema = z
  .union([
    z.enum(["light", "dark", "system"]),
    z.object({
      default: z.enum(["light", "dark", "system"]).default("system"),
      strict: z.boolean().default(false),
    }),
  ])
  .default("system")
  .transform((value) =>
    typeof value === "string" ? { default: value, strict: false } : value
  );

const shikiThemeName = z
  .string()
  .trim()
  .regex(/^[a-z0-9-]+$/);

export const siteConfigSchema = z.object({
  $schema: z.string().optional(),
  theme: z.enum(["notra"]).default("notra"),
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(300).optional(),
  logo: z
    .union([
      sitePathSchema,
      imageByModeSchema.extend({
        href: z.string().trim().regex(SITE_LINK_HREF).optional(),
      }),
    ])
    .optional(),
  favicon: z.union([sitePathSchema, imageByModeSchema]).optional(),
  colors: z
    .object({
      primary: z
        .string()
        .regex(SITE_HEX_COLOR)
        .default(SITE_DEFAULT_PRIMARY_COLOR),
      light: z.string().regex(SITE_HEX_COLOR).optional(),
      dark: z.string().regex(SITE_HEX_COLOR).optional(),
    })
    .default({ primary: SITE_DEFAULT_PRIMARY_COLOR }),
  appearance: appearanceSchema,
  fonts: fontSpecSchema
    .partial({ family: true })
    .extend({
      heading: fontSpecSchema.optional(),
      body: fontSpecSchema.optional(),
    })
    .optional(),
  background: z
    .object({
      decoration: z.enum(["none", "grid", "dots", "gradient"]).default("none"),
      image: z.union([sitePathSchema, imageByModeSchema]).optional(),
      color: z
        .object({
          light: z.string().regex(SITE_HEX_COLOR).optional(),
          dark: z.string().regex(SITE_HEX_COLOR).optional(),
        })
        .optional(),
    })
    .default({ decoration: "none" }),
  styling: z
    .object({
      codeblocks: z
        .union([
          z.enum(["system", "dark"]),
          shikiThemeName,
          z.object({ light: shikiThemeName, dark: shikiThemeName }),
        ])
        .default("system"),
    })
    .default({ codeblocks: "system" }),
  layout: siteLayoutSchema,
  banner: siteBannerSchema.optional(),
  navbar: siteNavbarSchema,
  footer: siteFooterSchema,
  authors: z
    .record(
      z
        .string()
        .regex(
          SITE_AUTHOR_ID,
          "Use lowercase letters, digits and dashes for author ids"
        ),
      siteAuthorSchema
    )
    .default({}),
  blog: siteBlogSchema.optional(),
  changelog: siteChangelogSchema.optional(),
  contextual: siteContextualSchema,
  seo: siteSeoSchema,
  errors: siteErrorsSchema,
  thumbnails: siteThumbnailsSchema,
  metadata: siteMetadataSchema,
  markdown: siteMarkdownSchema,
  variables: siteVariablesSchema,
  redirects: z.array(redirectSchema).max(500).default([]),
  integrations: siteIntegrationsSchema,
  security: siteSecuritySchema,
});

export const blogFrontmatterSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().optional(),
  date: z.coerce.date(),
  updated: z.coerce.date().optional(),
  author: z.union([z.string(), z.array(z.string())]).optional(),
  image: z.string().optional(),
  tags: z.array(z.string()).default([]),
  draft: z.boolean().default(false),
  noindex: z.boolean().default(false),
});

export const changelogFrontmatterSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().optional(),
  date: z.coerce.date(),
  version: z.string().trim().optional(),
  tags: z.array(z.string()).default([]),
  image: z.string().optional(),
  draft: z.boolean().default(false),
});

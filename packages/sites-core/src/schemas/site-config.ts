import { z } from "zod";

const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}){1,2}$/;
const RELATIVE_OR_HTTP_URL = /^(?:\/(?!\/)|https?:\/\/|mailto:)/;

const linkSchema = z.object({
  label: z.string().trim().min(1).max(60),
  href: z
    .string()
    .trim()
    .regex(RELATIVE_OR_HTTP_URL, "Use an absolute https:// URL or a path"),
});

const areaSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(400).optional(),
});

const redirectSchema = z.object({
  source: z.string().trim().startsWith("/"),
  destination: z
    .string()
    .trim()
    .regex(RELATIVE_OR_HTTP_URL, "Use an absolute https:// URL or a path"),
  permanent: z.boolean().default(true),
});

const SITE_PATH = z.string().trim().min(1).max(300);
const imageByModeSchema = z.object({ light: SITE_PATH, dark: SITE_PATH });

const fontSpecSchema = z.object({
  /** A Google Fonts family name, or the name of the font in `source`. */
  family: z.string().trim().min(1).max(80),
  weight: z.number().int().min(100).max(900).optional(),
  /** Self-hosted font file in the repository (`/fonts/brand.woff2`) or an https URL. */
  source: z.string().trim().min(1).optional(),
  format: z.enum(["woff", "woff2"]).optional(),
});

const appearanceSchema = z
  .union([
    z.enum(["light", "dark", "system"]),
    z.object({
      default: z.enum(["light", "dark", "system"]).default("system"),
      /** Hide the light/dark toggle and always use `default`. */
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

/**
 * `notra.json` at the repository (or configured root directory) root.
 * Origin and mounts are not part of it: they are verified in the dashboard,
 * so a commit can never point a site at a domain nobody checked.
 *
 * Mirrors Mintlify's appearance settings: an opinionated `theme`, brand
 * `colors`, `fonts`, `background`, `appearance` and code block styling, plus
 * any `style.css` / `styles/*.css` in the repository for everything else.
 */
export const siteConfigSchema = z.object({
  $schema: z.string().optional(),
  theme: z.enum(["notra"]).default("notra"),
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(300).optional(),
  logo: z
    .union([
      SITE_PATH,
      imageByModeSchema.extend({
        href: z.string().trim().regex(RELATIVE_OR_HTTP_URL).optional(),
      }),
    ])
    .optional(),
  favicon: z.union([SITE_PATH, imageByModeSchema]).optional(),
  colors: z
    .object({
      /** Accent in light mode: links, active states, eyebrows. */
      primary: z.string().regex(HEX_COLOR).default("#8B5CF6"),
      /** Accent in dark mode; defaults to `primary`. */
      light: z.string().regex(HEX_COLOR).optional(),
      /** Buttons and hover states; defaults to `primary`. */
      dark: z.string().regex(HEX_COLOR).optional(),
    })
    .default({ primary: "#8B5CF6" }),
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
      color: z
        .object({
          light: z.string().regex(HEX_COLOR).optional(),
          dark: z.string().regex(HEX_COLOR).optional(),
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
  navbar: z
    .object({
      links: z.array(linkSchema).max(8).default([]),
      cta: linkSchema.optional(),
    })
    .default({ links: [] }),
  footer: z
    .object({
      links: z.array(linkSchema).max(16).default([]),
      socials: z.record(z.string(), z.url()).default({}),
    })
    .default({ links: [], socials: {} }),
  blog: areaSchema.optional(),
  changelog: areaSchema.optional(),
  redirects: z.array(redirectSchema).max(500).default([]),
});

export type SiteConfig = z.infer<typeof siteConfigSchema>;

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

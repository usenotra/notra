import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth";
import {
  haveIBeenPwned,
  lastLoginMethod,
  organization,
} from "better-auth/plugins";
import { customAlphabet } from "nanoid";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";
import authConfig from "./auth.config";

const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 6);

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const RESERVED_ORGANIZATION_SLUGS = [
  "api",
  "auth",
  "login",
  "signup",
  "onboarding",
  "dashboard",
  "settings",
  "admin",
  "help",
  "support",
  "docs",
  "blog",
  "about",
  "terms",
  "privacy",
  "contact",
] as const;

function generateOrganizationAvatar(slug: string): string {
  return `https://api.dicebear.com/9.x/glass/svg?seed=${slug}&backgroundType=gradientLinear,solid`;
}

function validateSlug(slug: string): { valid: boolean; error?: string } {
  if (slug.length < 3) {
    return {
      valid: false,
      error: "Organization slug must be at least 3 characters long",
    };
  }
  if (slug.length > 63) {
    return {
      valid: false,
      error: "Organization slug must be at most 63 characters long",
    };
  }
  if (
    RESERVED_ORGANIZATION_SLUGS.includes(
      slug as (typeof RESERVED_ORGANIZATION_SLUGS)[number]
    )
  ) {
    return {
      valid: false,
      error: "This slug is reserved and cannot be used for an organization",
    };
  }
  if (!SLUG_PATTERN.test(slug)) {
    return {
      valid: false,
      error:
        "Organization slug must contain only lowercase letters, numbers, and hyphens",
    };
  }
  return { valid: true };
}

export const authComponent = createClient<DataModel>(components.betterAuth);

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  const auth = betterAuth({
    baseURL: process.env.SITE_URL,
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
    },
    socialProviders: {
      github: {
        clientId: process.env.GITHUB_CLIENT_ID as string,
        clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
      },
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID as string,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      },
    },
    plugins: [
      convex({ authConfig }),
      organization({
        schema: {
          organization: {
            additionalFields: {
              websiteUrl: {
                type: "string",
                required: false,
                input: true,
                fieldName: "websiteUrl",
              },
            },
          },
        },
      }),
      lastLoginMethod(),
      haveIBeenPwned(),
    ],
    trustedOrigins: [
      "http://localhost:3000",
      "https://app.usenotra.com",
      "https://app.trynotra.com",
    ],
    session: {
      storeSessionInDatabase: true,
      preserveSessionInDatabase: true,
    },
    user: {
      deleteUser: {
        enabled: true,
      },
    },
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            const email = user.email || "";
            const raw = email.split("@")[0] || "";
            const base = raw
              .toLowerCase()
              .replace(/[^a-z0-9]/g, "")
              .slice(0, 20);

            const slug = `${base || "notra"}-${nanoid()}`;

            await auth.api.createOrganization({
              body: {
                name: "Personal",
                slug,
                userId: user.id,
                logo: generateOrganizationAvatar(slug),
              },
            });
          },
        },
      },
      organization: {
        create: {
          before: (org: { slug?: unknown; [key: string]: unknown }) => {
            if (!org.slug || typeof org.slug !== "string") {
              throw new Error("Organization slug is required");
            }

            const slug = org.slug.trim();
            const validation = validateSlug(slug);

            if (!validation.valid) {
              throw new Error(validation.error);
            }

            return {
              data: {
                ...org,
                slug,
              },
            };
          },
        },
      },
    },
  });

  return auth;
};

export type Auth = ReturnType<typeof createAuth>;

import { v } from "convex/values";

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return await authComponent.getAuthUser(ctx);
  },
});

export const getOrganizationBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
  },
});

export const getOrganizationById = query({
  args: { organizationId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("organizations")
      .filter((q) => q.eq(q.field("_id"), args.organizationId))
      .first();
  },
});

export const getMemberByUserAndOrg = query({
  args: { userId: v.string(), organizationId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("members")
      .withIndex("by_user_org", (q) =>
        q.eq("userId", args.userId).eq("organizationId", args.organizationId)
      )
      .first();
  },
});

export const getFirstMembershipForUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("members")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
  },
});

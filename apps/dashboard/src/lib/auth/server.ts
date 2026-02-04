import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import {
  haveIBeenPwned,
  lastLoginMethod,
  organization,
} from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { customAlphabet } from "nanoid";
import { cookies } from "next/headers";
import { db } from "@notra/db/drizzle";
import { members, organizations } from "@notra/db/schema";
import { autumn } from "@/lib/billing/autumn";
import {
	sendInviteEmailAction,
	sendResetPasswordAction,
} from "@/lib/email/actions";
import { redis } from "@/lib/redis";
import { generateOrganizationAvatar } from "@/lib/utils";
import { LAST_VISITED_ORGANIZATION_COOKIE } from "@/utils/constants";
import { organizationSlugSchema } from "@/utils/schemas/organization";

const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 6);

const authSecret = process.env.BETTER_AUTH_SECRET;
if (!authSecret) {
  console.warn("[ENV]: BETTER_AUTH_SECRET is not defined");
}

async function getActiveOrganizationId(
  userId: string,
  cookieHeader?: string | null,
): Promise<string | undefined> {
  try {
    let lastVisitedSlug: string | undefined;

    try {
      const cookieStore = await cookies();
      lastVisitedSlug = cookieStore.get(
        LAST_VISITED_ORGANIZATION_COOKIE,
      )?.value;
    } catch {
      if (cookieHeader) {
        const parsedCookies = Object.fromEntries(
          cookieHeader.split(";").map((c) => {
            const [key, ...v] = c.trim().split("=");
            return [key, v.join("=")];
          }),
        );
        lastVisitedSlug = parsedCookies[LAST_VISITED_ORGANIZATION_COOKIE];
      }
    }

    if (
      lastVisitedSlug &&
      typeof lastVisitedSlug === "string" &&
      lastVisitedSlug.trim()
    ) {
      const org = await db.query.organizations.findFirst({
        where: eq(organizations.slug, lastVisitedSlug.trim()),
        columns: { id: true },
        with: {
          members: {
            where: eq(members.userId, userId),
            columns: { id: true },
          },
        },
      });

      if (org && org.members.length > 0) {
        return org.id;
      }
    }

    const membership = await db.query.members.findFirst({
      where: eq(members.userId, userId),
      columns: { organizationId: true, role: true },
      orderBy: (m, { desc }) => [desc(m.createdAt)],
    });

    if (membership) {
      return membership.organizationId;
    }

    return;
  } catch (error) {
    console.error("Error getting active organization ID:", error);
    return;
  }
}

export const auth = betterAuth({
  secret: authSecret ?? "development-secret",
  database: drizzleAdapter(db, {
    provider: "pg",
    usePlural: true,
  }),
  experimental: {
    joins: true,
  },
  plugins: [
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
      sendInvitationEmail: async (data) => {
        const inviteLink = `${process.env.BETTER_AUTH_URL}/accept-invitation/${data.id}`;
        await sendInviteEmailAction({
          inviteeEmail: data.email,
          inviterName: data.inviter.user.name,
          inviterEmail: data.inviter.user.email,
          workspaceName: data.organization.name,
          inviteLink,
        });
      },
    }),
    lastLoginMethod(),
    haveIBeenPwned(),
    nextCookies(),
  ],
  secondaryStorage: redis
    ? {
        get: async (key) => await redis!.get(key),
        set: async (key, value, ttl) => {
          if (ttl) {
            await redis!.set(key, value, { ex: ttl });
          } else {
            await redis!.set(key, value);
          }
        },
        delete: async (key) => {
          await redis!.del(key);
        },
      }
    : undefined,
  trustedOrigins: [
    "http://localhost:3000",
    "https://app.usenotra.com",
    "https://app.trynotra.com",
  ],
  session: {
    storeSessionInDatabase: true,
    preserveSessionInDatabase: true,
  },
  baseURL: process.env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      await sendResetPasswordAction({
        userEmail: user.email,
        resetLink: url,
      });
    },
    resetPasswordTokenExpiresIn: 3600,
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google", "github"],
      allowDifferentEmails: true,
    },
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
          const validation = organizationSlugSchema.safeParse(slug);

          if (!validation.success) {
            throw new Error(
              validation.error.issues[0]?.message ??
                "Invalid organization slug",
            );
          }

          return {
            data: {
              ...org,
              slug,
            },
          };
        },
        after: async (org: { id: string; name: string }) => {
          if (!autumn) {
            console.warn(
              "[Autumn] Skipping customer creation - AUTUMN_SECRET_KEY not configured",
            );
            return;
          }
          const result = await autumn.customers.create({
            id: org.id,
            name: org.name,
            metadata: {
              orgId: org.id,
            },
          });

          if (result.error) {
            console.error("[Autumn] Failed to create org customer:", {
              orgId: org.id,
              orgName: org.name,
              error: result.error,
            });
            throw new Error(
              `Failed to set up billing for organization: ${result.error.message || "Unknown error"}`,
            );
          }

          console.log("[Autumn] Customer created successfully:", {
            orgId: org.id,
            orgName: org.name,
          });
        },
      },
    },
    session: {
      create: {
        before: async (session, ctx) => {
          const cookieHeader = ctx?.headers?.get("cookie");
          const activeOrgId = await getActiveOrganizationId(
            session.userId,
            cookieHeader,
          );

          if (activeOrgId) {
            return {
              data: {
                ...session,
                activeOrganizationId: activeOrgId,
              },
            };
          }
        },
      },
    },
  },
  user: {
    deleteUser: {
      enabled: true,
    },
  },
});

import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth/minimal";
import { nextCookies } from "better-auth/next-js";
import {
  haveIBeenPwned,
  lastLoginMethod,
  organization,
} from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { customAlphabet } from "nanoid";
import { db } from "@/lib/db/drizzle";
import { members, organizations } from "@/lib/db/schema";
import { redis } from "@/lib/redis";
import { LAST_VISITED_ORGANIZATION_COOKIE } from "@/utils/constants";

const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 6);

async function getActiveOrganizationId(
  userId: string,
  cookieHeader?: string | null
): Promise<string | undefined> {
  if (cookieHeader) {
    const parsedCookies = Object.fromEntries(
      cookieHeader.split(";").map((c) => {
        const [key, ...v] = c.trim().split("=");
        return [key, v.join("=")];
      })
    );
    const lastVisitedSlug = parsedCookies[LAST_VISITED_ORGANIZATION_COOKIE];

    if (lastVisitedSlug) {
      const org = await db.query.organizations.findFirst({
        where: eq(organizations.slug, lastVisitedSlug),
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
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    usePlural: true,
  }),
  experimental: {
    joins: true,
  },
  plugins: [organization(), lastLoginMethod(), haveIBeenPwned(), nextCookies()], // nextCookies() must be last
  secondaryStorage: {
    get: async (key) => await redis.get(key),
    set: async (key, value, ttl) => {
      if (ttl) {
        await redis.set(key, value, { ex: ttl });
      } else {
        await redis.set(key, value);
      }
    },
    delete: async (key) => {
      await redis.del(key);
    },
  },
  trustedOrigins: [
    "http://localhost:3000",
    "https://app.usenotra.com",
    "https://app.trynotra.com",
  ],
  session: {
    storeSessionInDatabase: true,
    preserveSessionInDatabase: true,
  },
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
              logo: `https://api.dicebear.com/9.x/glass/svg?seed=${slug}&backgroundType=gradientLinear,solid&backgroundColor=8E51FF`,
            },
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
            cookieHeader
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

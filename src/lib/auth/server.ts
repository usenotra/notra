import { nanoid } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth/minimal";
import { nextCookies } from "better-auth/next-js";
import {
  haveIBeenPwned,
  lastLoginMethod,
  organization,
} from "better-auth/plugins";
import { db } from "@/lib/db/drizzle";
import { redis } from "@/lib/redis";

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
  },
  user: {
    deleteUser: {
      enabled: true,
    },
  },
});

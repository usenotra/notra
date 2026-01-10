import { convexBetterAuthNextJs } from "@convex-dev/better-auth/nextjs";

const convexPublicURL = process.env.NEXT_PUBLIC_CONVEX_URL;
const convexPublicSiteURL = process.env.NEXT_PUBLIC_CONVEX_SITE_URL;

if (!convexPublicURL) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is missing!");
}

if (!convexPublicSiteURL) {
  throw new Error("NEXT_PUBLIC_CONVEX_SITE_URL is missing!");
}

export const {
  handler,
  preloadAuthQuery,
  isAuthenticated,
  getToken,
  fetchAuthQuery,
  fetchAuthMutation,
  fetchAuthAction,
} = convexBetterAuthNextJs({
  convexUrl: convexPublicURL,
  convexSiteUrl: convexPublicSiteURL,
});

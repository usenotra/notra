export const LAST_VISITED_ORGANIZATION_COOKIE = "notra_last_organization";

export const GITHUB_URL_PATTERNS = [
  /^https?:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/i,
  /^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/i,
  /^([^/]+)\/([^/]+)$/,
] as const;

export const RESERVED_ORGANIZATION_SLUGS = [
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

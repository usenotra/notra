import type { NavbarVariant } from "@/types/navbar";

const BLOG_POST_PATH_PATTERN = /^\/blog\/(?!author(?:\/|$))[^/]+$/;

export function getNavbarVariantForPath(pathname: string): NavbarVariant {
  if (BLOG_POST_PATH_PATTERN.test(pathname)) {
    return "static";
  }
  return "landing";
}

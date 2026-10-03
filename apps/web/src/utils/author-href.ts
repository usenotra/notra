import { BLOG_AUTHOR_PATH } from "@/utils/constants";

export function getAuthorHref(slug: string) {
  return `${BLOG_AUTHOR_PATH}/${slug}`;
}

import type { BlogPostPaginationProps } from "~types/blog";

import { BlogPaginationCard } from "@/components/blog-pagination-card";

export function BlogPostPagination({
  previous,
  next,
}: BlogPostPaginationProps) {
  if (!(previous || next)) {
    return null;
  }

  return (
    <nav
      aria-label="Blog post navigation"
      className="border-border mt-16 grid gap-4 border-t pt-8 sm:grid-cols-2"
    >
      {previous && !next ? (
        <div aria-hidden="true" className="hidden sm:block" />
      ) : null}
      {next ? (
        <BlogPaginationCard align="left" direction="next" link={next} />
      ) : null}
      {previous ? (
        <BlogPaginationCard
          align="right"
          direction="previous"
          link={previous}
        />
      ) : null}
      {next && !previous ? (
        <div aria-hidden="true" className="hidden sm:block" />
      ) : null}
    </nav>
  );
}

import type { BlogPostSidebarProps } from "~types/blog";

import { BlogPostAuthorCard } from "@/components/blog-post-author-card";
import { BlogPostToc } from "@/components/blog-post-toc";

export function BlogPostSidebar({ authors, toc }: BlogPostSidebarProps) {
  return (
    <aside className="min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1">
      <BlogPostAuthorCard authors={authors} />
      <div className="sticky top-8 mt-8 hidden lg:block">
        <BlogPostToc toc={toc} />
      </div>
    </aside>
  );
}
